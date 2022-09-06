import { assert } from 'chai'
import { AbiItem } from 'web3-utils'
import { web3, getTestConfig, getAddresses } from '../config'
import {
  Config,
  approve,
  DfRewards,
  DfStrategyV1,
  sendTx,
  calculateEstimatedGas
} from '../../src'

describe('veOcean tests', async () => {
  let config: Config
  let addresses: any
  let nftFactory
  let dfRewards: DfRewards
  let dfStrategy: DfStrategyV1
  let ownerAccount: string
  let Alice: string
  let Bob: string
  let nft1, nft2, nft3
  let tokenContract
  let chainId

  before(async () => {
    config = await getTestConfig(web3)
  })

  it('initialize accounts', async () => {
    addresses = getAddresses()
    const accounts = await web3.eth.getAccounts()
    chainId = await web3.eth.getChainId()
    ownerAccount = accounts[0]
    Alice = accounts[1]
    Bob = accounts[2]
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
      },
      {
        constant: true,
        inputs: [{ name: 'owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ] as AbiItem[]
    tokenContract = new web3.eth.Contract(minAbi, addresses.Ocean)
    const estGas = await calculateEstimatedGas(
      ownerAccount,
      tokenContract.methods.mint,
      ownerAccount,
      web3.utils.toWei('10000')
    )
    // mint some Oceans
    await sendTx(
      ownerAccount,
      estGas,
      web3,
      1,
      tokenContract.methods.mint,
      ownerAccount,
      web3.utils.toWei('1000')
    )
    dfRewards = new DfRewards(addresses.DFRewards, web3)
    dfStrategy = new DfStrategyV1(addresses.DFStrategyV1, web3)
  })

  it('Generous owner should allocate some DF Rewards', async () => {
    const dfOceanBalance = web3.utils.fromWei(
      await tokenContract.methods.balanceOf(addresses.DFRewards).call()
    )
    // approve 500 tokens
    await approve(web3, config, ownerAccount, addresses.Ocean, addresses.DFRewards, '300')
    // fund DFRewards
    await dfRewards.allocateRewards(
      ownerAccount,
      [Alice, Bob],
      ['100', '200'],
      addresses.Ocean
    )
    const newDfOceanBalance = web3.utils.fromWei(
      await tokenContract.methods.balanceOf(addresses.DFRewards).call()
    )
    const expected = parseInt(dfOceanBalance) + 300
    assert(parseInt(newDfOceanBalance) === expected, 'DFRewards allocate failed')
  })

  it('Alice should check for rewards', async () => {
    const rewards = await dfRewards.getAvailableRewards(Alice, addresses.Ocean)
    assert(parseInt(rewards) >= 100, 'Alice reward missmatch, got only '+rewards)
    const multipleRewards = await dfStrategy.getMultipleAvailableRewards(Alice, [
      addresses.Ocean
    ])
    assert(parseInt(multipleRewards[0]) >= 100, 'Alice reward missmatch')
  })

  it('Alice should claim the rewards using DFRewards claim', async () => {
    const aliceOceanBalance = web3.utils.fromWei(
      await tokenContract.methods.balanceOf(Alice).call()
    )
    await dfRewards.claimRewards(Alice, Alice, addresses.Ocean)
    const newAliceOceanBalance = web3.utils.fromWei(
      await tokenContract.methods.balanceOf(Alice).call()
    )
    const expected = parseInt(aliceOceanBalance) + 100
    assert(parseInt(newAliceOceanBalance) >= expected, 'Alice failed to claim')
  })

  it('Bob should claim the rewards using DFStrategy claim', async () => {
    const bobOceanBalance = web3.utils.fromWei(
      await tokenContract.methods.balanceOf(Bob).call()
    )
    await dfStrategy.claimMultipleRewards(Bob, Bob, [addresses.Ocean])
    const newBobOceanBalance = web3.utils.fromWei(
      await tokenContract.methods.balanceOf(Bob).call()
    )
    const expected = parseInt(bobOceanBalance) + 200
    assert(parseInt(newBobOceanBalance) >= expected, 'Bob failed to claim')
  })
})
