import { assert } from 'chai'
import { provider, getAddresses, getTestConfig } from '../config'
import { Signer } from 'ethers'

import { Datatoken, unitsToAmount, approve, Config, amountToUnits } from '../../src/'
import { EscrowContract } from '../../src/contracts/Escrow'
import BigNumber from 'bignumber.js'

describe('Escrow payments flow', () => {
  let user0: Signer
  let user1: Signer
  let user2: Signer
  let Escrow: EscrowContract
  let datatoken: Datatoken
  let addresses
  let OCEAN
  let config: Config
  before(async () => {
    user0 = (await provider.getSigner(0)) as Signer
    user1 = (await provider.getSigner(3)) as Signer
    user2 = (await provider.getSigner(4)) as Signer

    config = await getTestConfig(user0)
    addresses = await getAddresses()
    OCEAN = addresses.Ocean
  })

  it('should initialize Escrow class', async () => {
    const { chainId } = await user2.provider.getNetwork()
    Escrow = new EscrowContract(addresses.Escrow, user2, Number(chainId))
    assert(Escrow !== null)
  })

  it('User2 makes a deposit in Escrow', async () => {
    const { chainId } = await user2.provider.getNetwork()
    datatoken = new Datatoken(user2, Number(chainId))
    const initialBalance = await datatoken.balance(OCEAN, await user2.getAddress())
    const initialDepositedEscrow = await Escrow.getUserFunds(
      await user2.getAddress(),
      OCEAN
    )
    const initialDepositedEscrowAmount = await unitsToAmount(
      null,
      null,
      initialDepositedEscrow[0].toString(),
      18
    )

    await datatoken.approve(OCEAN, await user2.getAddress(), '1000')

    await datatoken.transfer(OCEAN, await user2.getAddress(), '1000')

    assert(
      (await datatoken.balance(OCEAN, await user2.getAddress())) !==
        `${initialBalance + 1000}`
    )

    await datatoken.approve(OCEAN, addresses.Escrow, '1000')
    await Escrow.deposit(OCEAN, '100')

    const funds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const available = new BigNumber(funds[0])
    const expectedAmount = await amountToUnits(
      null,
      null,
      String(Number(initialDepositedEscrowAmount) + 100),
      18
    )
    assert(available.toString() === expectedAmount)
  })

  it('User0 makes an ERC20 deposit in Escrow (6 decimals)', async () => {
    const erc20 = addresses.MockUSDC
    const depositAmount = '100'
    const { chainId } = await user0.provider.getNetwork()
    const escrowUser0 = new EscrowContract(addresses.Escrow, user0, Number(chainId))

    const initialDepositedEscrow = await Escrow.getUserFunds(
      await user0.getAddress(),
      erc20
    )
    const initialDepositedEscrowAmount = await unitsToAmount(
      null,
      null,
      initialDepositedEscrow[0].toString(),
      6
    )

    await approve(
      user0,
      config,
      await user0.getAddress(),
      erc20,
      addresses.Escrow,
      depositAmount,
      false,
      6
    )
    await escrowUser0.deposit(erc20, depositAmount)

    const funds = await Escrow.getUserFunds(await user0.getAddress(), erc20)
    const availableAmount = await unitsToAmount(null, null, funds[0].toString(), 6)
    const expectedAmount = new BigNumber(initialDepositedEscrowAmount)
      .plus(depositAmount)
      .toString()
    assert(availableAmount === expectedAmount)
  })

  it('Withdraws funds', async () => {
    const availableUserFunds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const availableUserFundsAmount = await unitsToAmount(
      null,
      null,
      availableUserFunds[0].toString(),
      18
    )

    const tx = await Escrow.withdraw([OCEAN], ['50'])

    assert(tx, 'failed to withdraw half of available tokens')
    const funds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const available = new BigNumber(funds[0])
    const expectedAmount = await amountToUnits(
      null,
      null,
      String(Number(availableUserFundsAmount) - 50),
      18
    )
    assert(available.toString() === expectedAmount)
  })

  it('Withdraws ERC20 funds (6 decimals)', async () => {
    const erc20 = addresses.MockUSDC
    const { chainId } = await user0.provider.getNetwork()
    const escrowUser0 = new EscrowContract(addresses.Escrow, user0, Number(chainId))
    const availableUserFunds = await Escrow.getUserFunds(await user0.getAddress(), erc20)
    const availableUserFundsAmount = await unitsToAmount(
      null,
      null,
      availableUserFunds[0].toString(),
      6
    )

    const tx = await escrowUser0.withdraw([erc20], ['50'])

    assert(tx, 'failed to withdraw ERC20 tokens')
    const funds = await Escrow.getUserFunds(await user0.getAddress(), erc20)
    const availableAmount = await unitsToAmount(null, null, funds[0].toString(), 6)
    const expectedAmount = new BigNumber(availableUserFundsAmount).minus('50').toString()
    assert(availableAmount === expectedAmount)
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
