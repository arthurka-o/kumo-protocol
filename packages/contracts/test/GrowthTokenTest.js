const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")

const { keccak256 } = require('@ethersproject/keccak256');
const { defaultAbiCoder } = require('@ethersproject/abi');
const { toUtf8Bytes } = require('@ethersproject/strings');
const { pack } = require('@ethersproject/solidity');
const { hexlify } = require("@ethersproject/bytes");
const { ecsign } = require('ethereumjs-util');
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");


// the second account our hardhatenv creates (for EOA A)
// from https://github.com/liquity/dev/blob/main/packages/contracts/hardhatAccountsList2k.js#L3


const th = testHelpers.TestHelper
const toBN = th.toBN
const dec = th.dec
const getDifference = th.getDifference
const timeValues = testHelpers.TimeValues

const assertRevert = th.assertRevert

contract('KUMO Token', async accounts => {
  const [owner, A, B, C, D] = accounts

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)

  // Create the approval tx data, for use in permit()
  const approve = {
    owner: A,
    spender: B,
    value: 1,
  }

  const A_PrivateKey = '0xeaa445c85f7b438dEd6e831d06a4eD0CEBDc2f8527f84Fcda6EBB5fCfAd4C0e9'

  let contracts
  let kumoTokenTester
  let kumoStaking
  let communityIssuance

  let tokenName
  let tokenVersion
  let chainId

  const sign = (digest, privateKey) => {
    return ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(privateKey.slice(2), 'hex'))
  }

  const PERMIT_TYPEHASH = keccak256(
    toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
  )

  // Gets the EIP712 domain separator
  const getDomainSeparator = (name, contractAddress, chainId, version) => {
    return keccak256(defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes(version)),
        parseInt(chainId), contractAddress.toLowerCase()
      ]))
  }

  // Returns the EIP712 hash which should be signed by the user
  // in order to make a call to `permit`
  const getPermitDigest = (name, address, chainId, version,
    owner, spender, value,
    nonce, deadline) => {

    const DOMAIN_SEPARATOR = getDomainSeparator(name, address, chainId, version)
    return keccak256(pack(['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      ['0x19', '0x01', DOMAIN_SEPARATOR,
        keccak256(defaultAbiCoder.encode(
          ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
          [PERMIT_TYPEHASH, owner, spender, value, nonce, deadline])),
      ]))
  }

  const mintToABC = async () => {
    // mint some tokens
    await kumoTokenTester.unprotectedMint(A, dec(150, 18))
    await kumoTokenTester.unprotectedMint(B, dec(100, 18))
    await kumoTokenTester.unprotectedMint(C, dec(50, 18))
  }

  const buildPermitTx = async (deadline) => {
    const nonce = (await kumoTokenTester.nonces(approve.owner)).toString()

    // Get the EIP712 digest
    const digest = getPermitDigest(
      tokenName, kumoTokenTester.address,
      chainId, tokenVersion,
      approve.owner, approve.spender,
      approve.value, nonce, deadline
    )

    const { v, r, s } = sign(digest, A_PrivateKey)

    const tx = kumoTokenTester.permit(
      approve.owner, approve.spender, approve.value,
      deadline, v, hexlify(r), hexlify(s)
    )

    return { v, r, s, tx }
  }

  beforeEach(async () => {
    contracts = await deploymentHelper.deployKumoCore()
    const KUMOContracts = await deploymentHelper.deployKUMOTesterContractsHardhat(bountyAddress, lpRewardsAddress, multisig)

    kumoStaking = KUMOContracts.kumoStaking
    kumoTokenTester = KUMOContracts.kumoToken
    communityIssuance = KUMOContracts.communityIssuance

    tokenName = await kumoTokenTester.name()
    tokenVersion = await kumoTokenTester.version()
    chainId = await kumoTokenTester.getChainId()

    await deploymentHelper.connectKUMOContracts(KUMOContracts)
    await deploymentHelper.connectCoreContracts(contracts, KUMOContracts)
    await deploymentHelper.connectKUMOContractsToCore(KUMOContracts, contracts)
  })

  it('balanceOf(): gets the balance of the account', async () => {
    await mintToABC()

    const A_Balance = (await kumoTokenTester.balanceOf(A))
    const B_Balance = (await kumoTokenTester.balanceOf(B))
    const C_Balance = (await kumoTokenTester.balanceOf(C))

    assert.equal(A_Balance, dec(150, 18))
    assert.equal(B_Balance, dec(100, 18))
    assert.equal(C_Balance, dec(50, 18))
  })

  it('totalSupply(): gets the total supply', async () => {
    const total = (await kumoTokenTester.totalSupply()).toString()

    assert.equal(total, dec(100, 24))
  })

  it("name(): returns the token's name", async () => {
    const name = await kumoTokenTester.name()
    assert.equal(name, "KUMO")
  })

  it("symbol(): returns the token's symbol", async () => {
    const symbol = await kumoTokenTester.symbol()
    assert.equal(symbol, "KUMO")
  })

  it("version(): returns the token contract's version", async () => {
    const version = await kumoTokenTester.version()
    assert.equal(version, "1")
  })

  it("decimal(): returns the number of decimal digits used", async () => {
    const decimals = await kumoTokenTester.decimals()
    assert.equal(decimals, "18")
  })

  it("allowance(): returns an account's spending allowance for another account's balance", async () => {
    await mintToABC()

    await kumoTokenTester.approve(A, dec(100, 18), { from: B })

    const allowance_A = await kumoTokenTester.allowance(B, A)
    const allowance_D = await kumoTokenTester.allowance(B, D)

    assert.equal(allowance_A, dec(100, 18))
    assert.equal(allowance_D, '0')
  })

  it("approve(): approves an account to spend the specified ammount", async () => {
    await mintToABC()

    const allowance_A_before = await kumoTokenTester.allowance(B, A)
    assert.equal(allowance_A_before, '0')

    await kumoTokenTester.approve(A, dec(100, 18), { from: B })

    const allowance_A_after = await kumoTokenTester.allowance(B, A)
    assert.equal(allowance_A_after, dec(100, 18))
  })

  it("approve(): reverts when spender param is address(0)", async () => {
    await mintToABC()

    const txPromise = kumoTokenTester.approve(ZERO_ADDRESS, dec(100, 18), { from: B })
    await assertRevert(txPromise)
  })

  it("approve(): reverts when owner param is address(0)", async () => {
    await mintToABC()

    const txPromise = kumoTokenTester.callInternalApprove(ZERO_ADDRESS, A, dec(100, 18), { from: B })
    await assertRevert(txPromise)
  })

  it("transferFrom(): successfully transfers from an account which it is approved to transfer from", async () => {
    await mintToABC()

    const allowance_A_0 = await kumoTokenTester.allowance(B, A)
    assert.equal(allowance_A_0, '0')

    await kumoTokenTester.approve(A, dec(50, 18), { from: B })

    // Check A's allowance of B's funds has increased
    const allowance_A_1 = await kumoTokenTester.allowance(B, A)
    assert.equal(allowance_A_1, dec(50, 18))

    assert.equal(await kumoTokenTester.balanceOf(C), dec(50, 18))

    // A transfers from B to C, using up her allowance
    await kumoTokenTester.transferFrom(B, C, dec(50, 18), { from: A })
    assert.equal(await kumoTokenTester.balanceOf(C), dec(100, 18))

    // Check A's allowance of B's funds has decreased
    const allowance_A_2 = await kumoTokenTester.allowance(B, A)
    assert.equal(allowance_A_2, '0')

    // Check B's balance has decreased
    assert.equal(await kumoTokenTester.balanceOf(B), dec(50, 18))

    // A tries to transfer more tokens from B's account to C than she's allowed
    const txPromise = kumoTokenTester.transferFrom(B, C, dec(50, 18), { from: A })
    await assertRevert(txPromise)
  })

  it("transfer(): increases the recipient's balance by the correct amount", async () => {
    await mintToABC()

    assert.equal(await kumoTokenTester.balanceOf(A), dec(150, 18))

    await kumoTokenTester.transfer(A, dec(37, 18), { from: B })

    assert.equal(await kumoTokenTester.balanceOf(A), dec(187, 18))
  })

  it("transfer(): reverts when amount exceeds sender's balance", async () => {
    await mintToABC()

    assert.equal(await kumoTokenTester.balanceOf(B), dec(100, 18))

    const txPromise = kumoTokenTester.transfer(A, dec(101, 18), { from: B })
    await assertRevert(txPromise)
  })

  it('transfer(): transfer to a blacklisted address reverts', async () => {
    await mintToABC()

    await assertRevert(kumoTokenTester.transfer(kumoTokenTester.address, 1, { from: A }))
    await assertRevert(kumoTokenTester.transfer(ZERO_ADDRESS, 1, { from: A }))
    await assertRevert(kumoTokenTester.transfer(communityIssuance.address, 1, { from: A }))
    await assertRevert(kumoTokenTester.transfer(kumoStaking.address, 1, { from: A }))
  })

  it('transfer(): transfer to or from the zero-address reverts', async () => {
    await mintToABC()

    const txPromiseFromZero = kumoTokenTester.callInternalTransfer(ZERO_ADDRESS, A, dec(100, 18), { from: B })
    const txPromiseToZero = kumoTokenTester.callInternalTransfer(A, ZERO_ADDRESS, dec(100, 18), { from: B })
    await assertRevert(txPromiseFromZero)
    await assertRevert(txPromiseToZero)
  })

  it('mint(): issues correct amount of tokens to the given address', async () => {
    const A_balanceBefore = await kumoTokenTester.balanceOf(A)
    assert.equal(A_balanceBefore, '0')

    await kumoTokenTester.unprotectedMint(A, dec(100, 18))

    const A_BalanceAfter = await kumoTokenTester.balanceOf(A)
    assert.equal(A_BalanceAfter, dec(100, 18))
  })

  it('mint(): reverts when beneficiary is address(0)', async () => {
    const tx = kumoTokenTester.unprotectedMint(ZERO_ADDRESS, 100)
    await assertRevert(tx)
  })

  it("increaseAllowance(): increases an account's allowance by the correct amount", async () => {
    const allowance_A_Before = await kumoTokenTester.allowance(B, A)
    assert.equal(allowance_A_Before, '0')

    await kumoTokenTester.increaseAllowance(A, dec(100, 18), { from: B })

    const allowance_A_After = await kumoTokenTester.allowance(B, A)
    assert.equal(allowance_A_After, dec(100, 18))
  })

  it("decreaseAllowance(): decreases an account's allowance by the correct amount", async () => {
    await kumoTokenTester.increaseAllowance(A, dec(100, 18), { from: B })

    const A_allowance = await kumoTokenTester.allowance(B, A)
    assert.equal(A_allowance, dec(100, 18))

    await kumoTokenTester.decreaseAllowance(A, dec(100, 18), { from: B })

    const A_allowanceAfterDecrease = await kumoTokenTester.allowance(B, A)
    assert.equal(A_allowanceAfterDecrease, '0')
  })

  it('sendToKUMOStaking(): changes balances of KUMOStaking and calling account by the correct amounts', async () => {
    // mint some tokens to A
    await kumoTokenTester.unprotectedMint(A, dec(150, 18))

    // Check caller and KUMOStaking balance before
    const A_BalanceBefore = await kumoTokenTester.balanceOf(A)
    assert.equal(A_BalanceBefore, dec(150, 18))
    const kumoStakingBalanceBefore = await kumoTokenTester.balanceOf(kumoStaking.address)
    assert.equal(kumoStakingBalanceBefore, '0')

    await kumoTokenTester.unprotectedSendToKUMOStaking(A, dec(37, 18))

    // Check caller and KUMOStaking balance before
    const A_BalanceAfter = await kumoTokenTester.balanceOf(A)
    assert.equal(A_BalanceAfter, dec(113, 18))
    const kumoStakingBalanceAfter = await kumoTokenTester.balanceOf(kumoStaking.address)
    assert.equal(kumoStakingBalanceAfter, dec(37, 18))
  })

  // EIP2612 tests

  it('Initializes PERMIT_TYPEHASH correctly', async () => {
    assert.equal(await kumoTokenTester.permitTypeHash(), PERMIT_TYPEHASH)
  })

  it('Initializes DOMAIN_SEPARATOR correctly', async () => {
    assert.equal(await kumoTokenTester.domainSeparator(),
      getDomainSeparator(tokenName, kumoTokenTester.address, chainId, tokenVersion))
  })

  it('Initial nonce for a given address is 0', async function () {
    assert.equal(toBN(await kumoTokenTester.nonces(A)).toString(), '0');
  });

  it('permit(): permits and emits an Approval event (replay protected)', async () => {
    const deadline = 100000000000000

    // Approve it
    const { v, r, s, tx } = await buildPermitTx(deadline)
    const receipt = await tx
    const event = receipt.logs[0]

    // Check that approval was successful
    assert.equal(event.event, 'Approval')
    assert.equal(await kumoTokenTester.nonces(approve.owner), 1)
    assert.equal(await kumoTokenTester.allowance(approve.owner, approve.spender), approve.value)

    // Check that we can not use re-use the same signature, since the user's nonce has been incremented (replay protection)
    await assertRevert(kumoTokenTester.permit(
      approve.owner, approve.spender, approve.value,
      deadline, v, r, s), 'KUMO: invalid signature')

    // Check that the zero address fails
    await assertRevert(kumoTokenTester.permit('0x0000000000000000000000000000000000000000',
      approve.spender, approve.value, deadline, '0x99', r, s), 'KUMO: invalid signature')
  })

  it('permit(): fails with expired deadline', async () => {
    const deadline = 1

    const { v, r, s, tx } = await buildPermitTx(deadline)
    await assertRevert(tx, 'KUMO: expired deadline')
  })

  it('permit(): fails with the wrong signature', async () => {
    const deadline = 100000000000000

    const { v, r, s } = await buildPermitTx(deadline)

    const tx = kumoTokenTester.permit(
      C, approve.spender, approve.value,  // Carol is passed as spender param, rather than Bob
      deadline, v, hexlify(r), hexlify(s)
    )

    await assertRevert(tx, 'KUMO: invalid signature')
  })
})


