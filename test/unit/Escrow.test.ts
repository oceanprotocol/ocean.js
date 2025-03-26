import { assert } from 'chai'
import { provider, getAddresses } from '../config'
import { BigNumber, Signer } from 'ethers'

import { Datatoken, amountToUnits, unitsToAmount } from '../../src/'
import { EscrowContract } from '../../src/contracts/Escrow'

describe('Escrow payments flow', () => {
  let user1: Signer
  let user2: Signer
  let Escrow: EscrowContract
  let datatoken: Datatoken
  let addresses
  let OCEAN

  before(async () => {
    user1 = (await provider.getSigner(3)) as Signer
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
    const initialDepositedEscrow = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const initialDepositedEscrowAmount = await unitsToAmount(null, null, initialDepositedEscrow[0].toString(), 18)

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
    const expectedAmount = await amountToUnits(null, null, String(Number(initialDepositedEscrowAmount) + 100), 18)
    assert(available.toString() === expectedAmount)
  })

  it('Withdraws funds', async () => {
    const availableUserFunds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const availableUserFundsAmount = await unitsToAmount(null, null, availableUserFunds[0].toString(), 18)

    const tx = await Escrow.withdraw([OCEAN], ['50'])

    assert(tx, 'failed to withdraw half of available tokens')
    const funds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const available = BigNumber.from(funds[0])
    const expectedAmount = await amountToUnits(null, null, String(Number(availableUserFundsAmount) - 50), 18)
    assert(available.toString() === expectedAmount)
  })

  it('Authorize user1', async () => {
    const tx = await Escrow.authorize(OCEAN, await user1.getAddress(), '20', '100', '3')
    assert(tx, 'failed to authorize user1')
    const auths = await Escrow.getAuthorizations(
      OCEAN,
      await user2.getAddress(),
      await user1.getAddress()
    )
    assert(auths[0][0] === (await user1.getAddress()), 'payee address not present')
  })
})
