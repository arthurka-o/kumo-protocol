// TODO: rewrite with hardhat helpers and multi-asset StabilityPool
// https://github.com/kumodao/kumo-protocol/issues/286
const deploymentHelpers = require("../utils/truffleDeploymentHelpers.js");
const deploymentHelper = require("../utils/deploymentHelpers");
const testHelpers = require("../utils/testHelpers.js");

const deployKumo = deploymentHelpers.deployKumo;
const getAddresses = deploymentHelpers.getAddresses;
const connectContracts = deploymentHelpers.connectContracts;

const th = testHelpers.TestHelper;
const dec = th.dec;

contract("Pool Manager: Sum-Product rounding errors", async accounts => {
  const whale = accounts[0];

  let contracts;

  let priceFeed;
  let kusdToken;
  let stabilityPool;
  let troveManager;
  let borrowerOperations;
  let assetAddress1;

  beforeEach(async () => {
    contracts = await deployKumo();

    priceFeed = contracts.priceFeedTestnet;
    kusdToken = contracts.kusdToken;
    stabilityPool = await deploymentHelper.getStabilityPoolByAsset(contracts, assetAddress1);
    troveManager = contracts.troveManager;
    borrowerOperations = contracts.borrowerOperations;
    assetAddress1 = (await deploymentHelper.deployERC20Asset("Carbon Token X", "CTX")).address;

    const contractAddresses = getAddresses(contracts);
    await connectContracts(contracts, contractAddresses);
  });

  // skipped to not slow down CI
  it.skip("Rounding errors: 100 deposits of 100KUSD into SP, then 200 liquidations of 49KUSD", async () => {
    const owner = accounts[0];
    const depositors = accounts.slice(1, 101);
    const defaulters = accounts.slice(101, 301);

    for (let account of depositors) {
      await openTrove({
        extraKUSDAmount: toBN(dec(10000, 18)),
        ICR: toBN(dec(2, 18)),
        extraParams: { from: account }
      });
      await stabilityPool.provideToSP(dec(100, 18), { from: account });
    }

    // Defaulter opens trove with 200% ICR
    for (let defaulter of defaulters) {
      await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: defaulter } });
    }
    const price = await priceFeed.getPrice(assetAddress1);

    // price drops by 50%: defaulter ICR falls to 100%
    await priceFeed.setPrice(assetAddress1, dec(105, 18));

    // Defaulters liquidated
    for (let defaulter of defaulters) {
      await troveManager.liquidate(defaulter, { from: owner });
    }

    const SP_TotalDeposits = await stabilityPool.getTotalKUSDDeposits();
    const SP_ETH = await stabilityPool.getETH();
    const compoundedDeposit = await stabilityPool.getCompoundedKUSDDeposit(depositors[0]);
    const ETH_Gain = await stabilityPool.getCurrentETHGain(depositors[0]);

    // Check depostiors receive their share without too much error
    assert.isAtMost(
      th.getDifference(SP_TotalDeposits.div(th.toBN(depositors.length)), compoundedDeposit),
      100000
    );
    assert.isAtMost(th.getDifference(SP_ETH.div(th.toBN(depositors.length)), ETH_Gain), 100000);
  });
});

contract("Reset chain state", async accounts => {});
