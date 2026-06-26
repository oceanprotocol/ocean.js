import { assert, expect } from 'chai'
import { ethers, getAddress, parseEther, Signer } from 'ethers'
import { getTestConfig, getAddresses, provider } from '../config.js'
import {
  Config,
  ProviderInstance,
  EscrowContract,
  amountToUnits,
  sendTx
} from '../../src/index.js'
import {
  ServiceStatusNumber,
  ServiceJob,
  ServiceTemplatePublic,
  ComputeEnvironment,
  TemplateResourceRequirement
} from '../../src/@types/index.js'

/**
 * Full Service-on-Demand lifecycle: templates → start → status → extend → restart → stop.
 *
 * PREREQUISITES (the lifecycle tests skip cleanly when these are absent, so the suite
 * stays green against a plain barge node):
 *   - The node must run with `serviceOnDemand.enabled` on a Docker compute env, expose at
 *     least one template via SERVICE_TEMPLATES_PATH, and have a `features.services !== false`
 *     environment whose resources satisfy the template's requiredResources.
 *   - Docker available on the node host; escrow funded for the dev payment token (Ocean).
 *
 * Mirrors ocean-node `src/test/integration/services.test.ts`, but exercises the client
 * (ProviderInstance) end-to-end over HTTP/P2P instead of the node handlers directly.
 */
describe('Service on Demand flow tests', () => {
  let config: Config
  let providerUrl: string
  let publisherAccount: Signer
  let consumerAccount: Signer
  let addresses: any
  let paymentToken: string
  let chainId: number

  let template: ServiceTemplatePublic
  let servicesEnv: ComputeEnvironment
  let skipLifecycle = false

  // state threaded through the lifecycle tests
  let serviceId: string
  let hostPort: number
  let expiresAt: number

  const SERVICE_DURATION = 300
  // serviceStart now returns immediately (Starting); escrow + image pull run in a background
  // pipeline (Starting → Locking → PullImage → Claiming → Running). extend/restart/stop may
  // still do synchronous on-chain/Docker work, so give the calls headroom above the 10s P2P
  // default; the long wait is the background pull, handled by pollUntil's timeout.
  const OP_TIMEOUT_MS = 120000
  const opSignal = () => AbortSignal.timeout(OP_TIMEOUT_MS)
  // Background image pull (e.g. a multi-GB inference image) can take minutes on a cold node.
  const RUNNING_TIMEOUT_MS = 540000

  // Returns the available (total - inUse) amount of an env resource matching a requirement.
  function availableFor(
    env: ComputeEnvironment,
    req: TemplateResourceRequirement
  ): number {
    const resources = env.resources ?? []
    if (req.id) {
      const r = resources.find((x) => x.id === req.id)
      return r ? (r.total ?? 0) - (r.inUse ?? 0) : 0
    }
    return resources
      .filter((x) => x.kind === req.kind && (!req.type || x.type === req.type))
      .reduce((sum, x) => sum + ((x.total ?? 0) - (x.inUse ?? 0)), 0)
  }

  function envSatisfies(
    env: ComputeEnvironment,
    reqs?: TemplateResourceRequirement[]
  ): boolean {
    return (reqs ?? []).every((req) => availableFor(env, req) >= req.min)
  }

  async function pollUntil(
    target: ServiceStatusNumber,
    timeoutMs = 180000,
    notContainerId?: string
  ): Promise<ServiceJob> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const jobs = await ProviderInstance.getServiceStatus(
        providerUrl,
        consumerAccount,
        serviceId
      )
      const job = jobs.find((j) => j.serviceId === serviceId)
      // When notContainerId is set (restart), don't match until the new container appears,
      // otherwise we could return the still-Running pre-restart container.
      if (
        job &&
        job.status === target &&
        (!notContainerId || job.containerId !== notContainerId)
      )
        return job
      if (
        job &&
        (job.status === ServiceStatusNumber.Error ||
          job.status === ServiceStatusNumber.PullImageFailed ||
          job.status === ServiceStatusNumber.BuildImageFailed)
      ) {
        throw new Error(`service ${serviceId} failed: ${job.statusText}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
    throw new Error(`timed out waiting for status ${target}`)
  }

  before(async () => {
    publisherAccount = (await provider.getSigner(0)) as Signer
    consumerAccount = (await provider.getSigner(1)) as Signer
    config = await getTestConfig(publisherAccount)
    providerUrl = config?.oceanNodeUri
    addresses = getAddresses()
    paymentToken = addresses.Ocean
    chainId = Number((await consumerAccount.provider.getNetwork()).chainId)
  })

  it('lists service templates (public, no signature)', async () => {
    const templates = await ProviderInstance.getServiceTemplates(providerUrl)
    assert(Array.isArray(templates), 'templates should be an array')
    if (templates.length === 0) {
      // Node has no Service-on-Demand templates configured — skip the lifecycle.
      skipLifecycle = true
      return
    }
    template = templates[0]
    assert(template.id, 'template should have an id')
    // envVars values must never be exposed — only keys.
    expect((template as any).envVars).to.equal(undefined)
  })

  it('finds a services-enabled, resource-compatible environment', async function () {
    if (skipLifecycle) this.skip()
    const envs = await ProviderInstance.getComputeEnvironments(providerUrl)
    servicesEnv = (envs ?? []).find(
      (e) => e.features?.services !== false && envSatisfies(e, template.requiredResources)
    )
    if (!servicesEnv) {
      skipLifecycle = true
      this.skip()
    }
  })

  it('funds the escrow for the consumer', async function () {
    if (skipLifecycle) this.skip()
    this.timeout(120000)
    // Mint Ocean to the consumer so it can deposit into escrow.
    const minAbi = [
      {
        constant: false,
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' }
        ],
        name: 'mint',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ]
    const tokenContract = new ethers.Contract(addresses.Ocean, minAbi, publisherAccount)
    const est = await tokenContract.mint.estimateGas(
      await consumerAccount.getAddress(),
      amountToUnits(null, null, '100000', 18)
    )
    await sendTx(
      est,
      consumerAccount,
      1,
      tokenContract.mint,
      await consumerAccount.getAddress(),
      amountToUnits(null, null, '100000', 18)
    )
    // top up native token for gas
    const tx = await publisherAccount.sendTransaction({
      to: await consumerAccount.getAddress(),
      value: parseEther('1.5')
    })
    await tx.wait()

    const escrow = new EscrowContract(getAddress(addresses.Escrow), consumerAccount)
    const res = await escrow.verifyFundsForEscrowPayment(
      paymentToken,
      getAddress(servicesEnv.consumerAddress),
      '10000', // amountToDeposit
      '1000', // maxLockedAmount
      '86400', // maxLockSeconds
      '100' // maxLockCounts
    )
    assert(res.isValid, `escrow funding failed: ${res.message}`)
  })

  it('starts a service → Running with reachable endpoint, userData stripped', async function () {
    if (skipLifecycle) this.skip()
    this.timeout(RUNNING_TIMEOUT_MS + 60000)
    const userConfigurable = template.userConfigurableEnvVars ?? []
    const userData: Record<string, unknown> = {}
    // Supply a valid value for the first user-configurable var, if any.
    if (userConfigurable[0]) userData[userConfigurable[0].key] = 'hello123'

    // Request exactly what the chosen template requires (by resource id, at its min) — the
    // same requiredResources the env was selected against. Fall back to the env's cpu/ram
    // only when the template declares no id-based requirements.
    const requiredById = (template.requiredResources ?? []).filter(
      (r): r is TemplateResourceRequirement & { id: string } => typeof r.id === 'string'
    )
    const requestedResources = requiredById.length
      ? requiredById.map((r) => ({ id: r.id, amount: r.min }))
      : (servicesEnv.resources ?? [])
          .filter((r) => r.id === 'cpu' || r.id === 'ram')
          .map((r) => ({ id: r.id, amount: 1 }))

    const jobs = await ProviderInstance.serviceStart(
      providerUrl,
      consumerAccount,
      {
        environment: servicesEnv.id,
        image: template.image,
        tag: template.tag,
        checksum: template.checksum,
        dockerfile: template.dockerfile,
        exposedPorts: template.exposedPorts,
        duration: SERVICE_DURATION,
        resources: requestedResources,
        userData: Object.keys(userData).length ? userData : undefined,
        payment: { chainId, token: paymentToken }
      },
      opSignal()
    )
    assert(Array.isArray(jobs) && jobs.length === 1, 'expected a single service job')
    const [job] = jobs
    assert(job.serviceId, 'no serviceId returned')
    serviceId = job.serviceId
    expect((job as any).userData).to.equal(undefined)
    // start is non-blocking: the node returns Starting and advances in the background.
    const running = await pollUntil(ServiceStatusNumber.Running, RUNNING_TIMEOUT_MS)
    assert(running.endpoints.length >= 1, 'expected at least one endpoint')
    hostPort = running.endpoints[0].hostPort
    expiresAt = running.expiresAt
    assert(running.endpoints[0].url, 'endpoint url missing')
  })

  it('returns the service via getServiceStatus (userData stripped)', async function () {
    if (skipLifecycle || !serviceId) this.skip()
    const jobs = await ProviderInstance.getServiceStatus(
      providerUrl,
      consumerAccount,
      serviceId
    )
    const job = jobs.find((j) => j.serviceId === serviceId)
    assert(job, 'service not found by id')
    expect((job as any).userData).to.equal(undefined)
    assert(job.payment, 'payment should be present')

    // also: listing without a serviceId returns the owner's services
    const all = await ProviderInstance.getServiceStatus(providerUrl, consumerAccount)
    assert(
      all.some((j) => j.serviceId === serviceId),
      "owner's service list should include the running service"
    )
  })

  it('extends the service → expiresAt advances, extendPayments grows', async function () {
    if (skipLifecycle || !serviceId) this.skip()
    this.timeout(120000)
    const jobs = await ProviderInstance.serviceExtend(
      providerUrl,
      consumerAccount,
      serviceId,
      30,
      { chainId, token: paymentToken },
      opSignal()
    )
    const [job] = jobs
    expect(job.expiresAt).to.equal(expiresAt + 30 * 1000)
    expect(job.extendPayments?.length).to.equal(1)
    expiresAt = job.expiresAt
  })

  it('restarts the service → new container, same hostPort + expiresAt', async function () {
    if (skipLifecycle || !serviceId) this.skip()
    this.timeout(RUNNING_TIMEOUT_MS + 60000)
    const before = (
      await ProviderInstance.getServiceStatus(providerUrl, consumerAccount, serviceId)
    ).find((j) => j.serviceId === serviceId)
    const oldContainerId = before?.containerId

    await ProviderInstance.serviceRestart(
      providerUrl,
      consumerAccount,
      serviceId,
      undefined,
      opSignal()
    )
    const running = await pollUntil(
      ServiceStatusNumber.Running,
      RUNNING_TIMEOUT_MS,
      oldContainerId
    )
    expect(running.containerId).to.not.equal(oldContainerId)
    expect(running.endpoints[0].hostPort).to.equal(hostPort)
    expect(running.expiresAt).to.equal(expiresAt)
  })

  it('stops the service → Stopped', async function () {
    if (skipLifecycle || !serviceId) this.skip()
    this.timeout(120000)
    const jobs = await ProviderInstance.serviceStop(
      providerUrl,
      consumerAccount,
      serviceId,
      opSignal()
    )
    const [job] = jobs
    expect(job.status).to.equal(ServiceStatusNumber.Stopped)
  })

  after(async () => {
    // best-effort cleanup if a test bailed mid-flow
    if (serviceId && !skipLifecycle) {
      try {
        await ProviderInstance.serviceStop(
          providerUrl,
          consumerAccount,
          serviceId,
          opSignal()
        )
      } catch {
        /* ignore */
      }
    }
  })
})
