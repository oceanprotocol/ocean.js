import { assert } from 'chai'
import { getTestConfig, provider, getAddresses } from '../config'
import { ethers, Signer } from 'ethers'

import {
  Config,
  approve,
  DfRewards,
  DfStrategyV1,
  sendTx,
  amountToUnits,
  unitsToAmount
} from '../../src'

describe('veOcean tests', async () => {
  let config: Config
  let addresses: any
  let dfRewards: DfRewards
  let dfStrategy: DfStrategyV1
  let ownerAccount: Signer
  let Alice: Signer
  let Bob: Signer
  let tokenContract

  before(async () => {
    ownerAccount = (await provider.getSigner(0)) as Signer
    Alice = (await provider.getSigner(1)) as Signer
    Bob = (await provider.getSigner(2)) as Signer
    config = await getTestConfig(ownerAccount as Signer)
    addresses = await getAddresses()
  })

  it('initialize accounts', async () => {
    addresses = getAddresses()
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
    ]
    tokenContract = new ethers.Contract(addresses.Ocean, minAbi, ownerAccount)
    const estGas = await tokenContract.estimateGas.mint(
      await ownerAccount.getAddress(),
      amountToUnits(null, null, '10000', 18)
    )
    // mint some Oceans
    await sendTx(
      estGas,
      ownerAccount,
      1,
      tokenContract.mint,
      await ownerAccount.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
    dfRewards = new DfRewards(addresses.DFRewards, ownerAccount)
    dfStrategy = new DfStrategyV1(addresses.DFStrategyV1, ownerAccount)
  })

  it('Generous owner should allocate some DF Rewards', async () => {
    const dfOceanBalance = await unitsToAmount(
      ownerAccount,
      addresses.Ocean,
      await tokenContract.balanceOf(addresses.DFRewards)
    )
    // approve 500 tokens
    await approve(
      ownerAccount,
      config,
      await ownerAccount.getAddress(),
      addresses.Ocean,
      addresses.DFRewards,
      '300'
    )
    // fund DFRewards
    await dfRewards.allocateRewards(
      [await Alice.getAddress(), await Bob.getAddress()],
      ['100', '200'],
      addresses.Ocean
    )
    const newDfOceanBalance = await unitsToAmount(
      ownerAccount,
      addresses.Ocean,
      await tokenContract.balanceOf(addresses.DFRewards)
    )
    const expected = parseInt(dfOceanBalance) + 300
    assert(parseInt(newDfOceanBalance) === expected, 'DFRewards allocate failed')
  })

  it('Alice should check for rewards', async () => {
    const rewards = await dfRewards.getAvailableRewards(
      await Alice.getAddress(),
      addresses.Ocean
    )
    assert(parseInt(rewards) >= 100, 'Alice reward missmatch, got only ' + rewards)
    const multipleRewards = await dfStrategy.getMultipleAvailableRewards(
      await Alice.getAddress(),
      [addresses.Ocean]
    )
    assert(parseInt(multipleRewards[0]) >= 100, 'Alice reward missmatch')
  })

  it('Alice should claim the rewards using DFRewards claim', async () => {
    const aliceOceanBalance = await unitsToAmount(
      ownerAccount,
      addresses.Ocean,
      await tokenContract.balanceOf(await Alice.getAddress())
    )
    dfRewards = new DfRewards(addresses.DFRewards, Alice)
    await dfRewards.claimRewards(await Alice.getAddress(), addresses.Ocean)
    const newAliceOceanBalance = await unitsToAmount(
      ownerAccount,
      addresses.Ocean,
      await tokenContract.balanceOf(await Alice.getAddress())
    )
    const expected = parseInt(aliceOceanBalance) + 100
    assert(parseInt(newAliceOceanBalance) >= expected, 'Alice failed to claim')
  })

  it('Bob should claim the rewards using DFStrategy claim', async () => {
    dfRewards = new DfRewards(addresses.DFRewards, Bob)
    const bobOceanBalance = await unitsToAmount(
      ownerAccount,
      addresses.Ocean,
      await tokenContract.balanceOf(await Bob.getAddress())
    )
    await dfStrategy.claimMultipleRewards(await Bob.getAddress(), [addresses.Ocean])
    const newBobOceanBalance = await unitsToAmount(
      ownerAccount,
      addresses.Ocean,
      await tokenContract.balanceOf(await Bob.getAddress())
    )
    const expected = parseInt(bobOceanBalance) + 200
    assert(parseInt(newBobOceanBalance) >= expected, 'Bob failed to claim')
  })
})
