import { assert } from 'chai'
import { provider, getAddresses } from '../config'
import { BigNumber, Signer } from 'ethers'

import { Datatoken, amountToUnits } from '../../src/'
import { EscrowContract } from '../../src/contracts/Escrow'

describe('Escrow payments flow', () => {
  let user2: Signer
  let Escrow: EscrowContract
  let datatoken: Datatoken
  let addresses
  let OCEAN

  before(async () => {
    user2 = (await provider.getSigner(4)) as Signer

    addresses = await getAddresses()
    OCEAN = addresses.Ocean
  })

  it('should initialize Escrow class', async () => {
    Escrow = new EscrowContract(addresses.Escrow, user2, await user2.getChainId())
    assert(Escrow !== null)
  })

  it('User2 makes a deposit in Escrow', async () => {
    datatoken = new Datatoken(user2, await user2.getChainId())
    const initialBalance = await datatoken.balance(OCEAN, await user2.getAddress())
    await datatoken.approve(OCEAN, await user2.getAddress(), '1000')
    await datatoken.transfer(OCEAN, await user2.getAddress(), '1000')
    assert(
      (await datatoken.balance(OCEAN, await user2.getAddress())) !==
        `${initialBalance + 1000}`
    )
    await datatoken.approve(OCEAN, addresses.Escrow, '1000')
    await Escrow.deposit(OCEAN, '100')
    const funds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const available = BigNumber.from(funds[0])
    assert(available.toString() === (await amountToUnits(null, null, '100', 18)))
  })

  it('Withdraws funds', async () => {
    const tx = await Escrow.withdraw(OCEAN, '50')
    assert(tx, 'failed to withdraw half of available tokens')
    const funds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const available = BigNumber.from(funds[0])
    assert(available.toString() === (await amountToUnits(null, null, '50', 18)))
  })
})
