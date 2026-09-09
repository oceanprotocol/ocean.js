import { assert, expect } from 'chai'
import { Signer } from 'ethers'
import { provider, getAddresses, getTestConfig } from '../config.js'
import { GrantsSwap, balance, approve, ZERO_ADDRESS } from '../../src/index.js'
import { Config } from '../../src/config/index.js'

// Input token is MockUSDC (6 decimals), COMPY is 18 decimals, initial rate 1:1.
// Nothing here hardcodes decimals — the wrapper and TokenUtils fetch each token's
// real decimals on chain. Barge prefunds test accounts with USDC and funds the
// GrantsSwap contract with COMPY (see oceanprotocol/contracts#1033).
//
// Until that contracts release is deployed to barge, `COMPYSwap` is absent from the
// `development` address block and this suite skips cleanly.
const SWAP_KEY = 'COMPYSwap'

describe('GrantsSwap flow', () => {
  let user: Signer
  let userAddress: string
  let config: Config
  let addresses
  let swapAddress: string
  let grantsSwap: GrantsSwap
  let inputToken: string
  let compyToken: string

  const swapAmount = '1'

  before(async function () {
    user = (await provider.getSigner(0)) as Signer
    userAddress = await user.getAddress()
    config = await getTestConfig(user)
    addresses = await getAddresses()
    swapAddress = addresses?.[SWAP_KEY]

    if (!swapAddress || swapAddress === ZERO_ADDRESS) {
      // GrantsSwap not deployed on this stack yet — skip the whole suite.
      this.skip()
    }
  })

  it('should initialize GrantsSwap class', async () => {
    const { chainId } = await user.provider.getNetwork()
    grantsSwap = new GrantsSwap(swapAddress, user, Number(chainId))
    assert(grantsSwap !== null)
  })

  it('should read the input and COMPY token addresses', async () => {
    inputToken = await grantsSwap.getInputToken()
    compyToken = await grantsSwap.getCompyToken()
    assert(inputToken && inputToken !== ZERO_ADDRESS, 'invalid input token')
    assert(compyToken && compyToken !== ZERO_ADDRESS, 'invalid COMPY token')
  })

  it('should read a positive rate', async () => {
    const rate = await grantsSwap.getRate()
    assert(Number(rate) > 0, `expected rate > 0, got ${rate}`)
  })

  it('getCompyAmount should be consistent with the rate', async () => {
    const rate = await grantsSwap.getRate()
    const quote = await grantsSwap.getCompyAmount(swapAmount)
    // COMPY out for 1 input token equals the (decimal-normalized) rate, whatever
    // the input/COMPY decimals are.
    expect(Number(quote)).to.be.closeTo(Number(rate), 1e-9)
  })

  it('swapToCOMPY should hand back the quoted COMPY amount', async () => {
    const compyBefore = await balance(user, compyToken, userAddress)
    const quote = await grantsSwap.getCompyAmount(swapAmount)

    await approve(user, config, userAddress, inputToken, swapAddress, swapAmount)
    const receipt = await grantsSwap.swapToCOMPY(swapAmount)
    assert(receipt, 'swap did not return a receipt')

    const compyAfter = await balance(user, compyToken, userAddress)
    expect(Number(compyAfter) - Number(compyBefore)).to.be.closeTo(Number(quote), 1e-9)
  })

  it('swapToCOMPY should support gas estimation', async () => {
    await approve(user, config, userAddress, inputToken, swapAddress, swapAmount)
    const estGas = await grantsSwap.swapToCOMPY(swapAmount, true)
    assert(Number(estGas) > 0, 'expected a positive gas estimate')
  })
})
