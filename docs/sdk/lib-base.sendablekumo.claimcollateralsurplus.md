<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@kumodao/lib-base](./lib-base.md) &gt; [SendableKumo](./lib-base.sendablekumo.md) &gt; [claimCollateralSurplus](./lib-base.sendablekumo.claimcollateralsurplus.md)

## SendableKumo.claimCollateralSurplus() method

Claim leftover collateral after a liquidation or redemption.

<b>Signature:</b>

```typescript
claimCollateralSurplus(asset: string): Promise<SentKumoTransaction<S, KumoReceipt<R, void>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  asset | string |  |

<b>Returns:</b>

Promise&lt;[SentKumoTransaction](./lib-base.sentkumotransaction.md)<!-- -->&lt;S, [KumoReceipt](./lib-base.kumoreceipt.md)<!-- -->&lt;R, void&gt;&gt;&gt;

## Remarks

Use [getCollateralSurplusBalance()](./lib-base.readablekumo.getcollateralsurplusbalance.md) to check the amount of collateral available for withdrawal.

