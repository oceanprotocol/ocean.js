import { expect } from 'chai'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import type { PrivateKey } from '@libp2p/interface'
import { P2pProvider } from '../../src/services/providers/P2pProvider.js'

/**
 * The libp2p node and its configuration are process-wide, and `setupP2P` installs the
 * configuration *before* building the node because the build reads it synchronously.
 * A build that fails therefore has to undo that assignment, or a rejected `setupP2P`
 * leaves the failed caller's private key, gater and timeouts in force and the next
 * lazy node is built from them.
 *
 * What it rolls back to is the last configuration that actually produced a live node,
 * not whatever happened to be installed on entry — otherwise two callers racing each
 * other read each other's half-applied values and whichever catch block runs last wins.
 *
 * The observable is the identity of the node that gets built, which is derived from
 * `libp2p.privateKey` and therefore fixed at build time. (`additionalRoles` looks like
 * an easier probe and is not: it is read *after* `await node.start()`, so it reports
 * the configuration as of a later moment and passes even when the rollback is absent.)
 */
describe('P2P setup that fails leaves no configuration behind', () => {
  const provider = new P2pProvider()
  let keyApplied: PrivateKey
  let keyRejectedFirst: PrivateKey
  let keyRejectedSecond: PrivateKey
  let keyRejectedThird: PrivateKey
  let keySucceeding: PrivateKey

  function idOf(key: PrivateKey): string {
    return peerIdFromPrivateKey(key).toString()
  }

  /** An offline node: nothing listens, nothing is dialled, no bootstrap contact. */
  function workingConfig(key: PrivateKey) {
    return { bootstrapPeers: [], libp2p: { privateKey: key } }
  }
  /** Same shape, but the bootstrap list cannot be parsed, so the build rejects. */
  function failingConfig(key: PrivateKey) {
    return { bootstrapPeers: ['this is not a multiaddr'], libp2p: { privateKey: key } }
  }

  /** Identity of the node the next lazy build produces, then torn down again. */
  async function lazilyBuiltNodeId(): Promise<string> {
    const node = await (provider as any).getOrCreateLibp2pNode()
    const id = node.peerId.toString()
    await provider.stopP2P()
    return id
  }

  before(async () => {
    ;[keyApplied, keyRejectedFirst, keyRejectedSecond, keyRejectedThird, keySucceeding] =
      await Promise.all([
        generateKeyPair('Ed25519'),
        generateKeyPair('Ed25519'),
        generateKeyPair('Ed25519'),
        generateKeyPair('Ed25519'),
        generateKeyPair('Ed25519')
      ])
  })

  beforeEach(async () => {
    await provider.setupP2P(workingConfig(keyApplied))
    expect(provider.getLibp2pNode()?.peerId.toString()).to.equal(idOf(keyApplied))
  })

  afterEach(async () => {
    await provider.stopP2P()
  })

  it('rolls back to the configuration that last produced a live node', async () => {
    let rejected: Error | null = null
    try {
      await provider.setupP2P(failingConfig(keyRejectedFirst))
    } catch (err) {
      rejected = err as Error
    }
    expect(rejected, 'the setup under test must reject').to.not.equal(null)

    const built = await lazilyBuiltNodeId()
    expect(built, 'the rejected configuration was left installed').to.not.equal(
      idOf(keyRejectedFirst)
    )
    expect(built).to.equal(idOf(keyApplied))
  }).timeout(120_000)

  it('lands on the same configuration however two failing setups interleave', async () => {
    // Restoring "whatever was installed on entry" is order-dependent: the second caller
    // reads the first caller's config as the thing to put back. Restoring the last
    // *applied* config means every loser lands on the same value.
    const results = await Promise.allSettled([
      provider.setupP2P(failingConfig(keyRejectedFirst)),
      provider.setupP2P(failingConfig(keyRejectedSecond))
    ])
    expect(results.map((r) => r.status)).to.deep.equal(['rejected', 'rejected'])

    const built = await lazilyBuiltNodeId()
    expect(built).to.equal(idOf(keyApplied))
    expect(built).to.not.equal(idOf(keyRejectedFirst))
    expect(built).to.not.equal(idOf(keyRejectedSecond))
  }).timeout(120_000)

  it('never leaves a rejected configuration in force when a setup and a dispose race it', async () => {
    // Three actors on one process-wide configuration. Which of the survivors wins is
    // genuinely timing-dependent — a dispose can supersede a setup that was already
    // building — but the loser must never be the one that failed.
    const results = await Promise.allSettled([
      provider.setupP2P(failingConfig(keyRejectedThird)),
      provider.setupP2P(workingConfig(keySucceeding)),
      provider.dispose()
    ])
    expect(results[0].status, 'the failing setup must reject').to.equal('rejected')

    const built = await lazilyBuiltNodeId()
    expect(built, 'the rejected configuration survived the race').to.not.equal(
      idOf(keyRejectedThird)
    )
    expect(
      [idOf(keyApplied), idOf(keySucceeding)],
      `built ${built}, which no successful setup ever configured`
    ).to.include(built)
  }).timeout(120_000)
})
