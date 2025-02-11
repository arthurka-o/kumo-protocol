<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@kumodao/lib-ethers](./lib-ethers.md) &gt; [SendableEthersKumo](./lib-ethers.sendableetherskumo.md) &gt; [registerFrontend](./lib-ethers.sendableetherskumo.registerfrontend.md)

## SendableEthersKumo.registerFrontend() method

Register current wallet address as a Kumo frontend.

<b>Signature:</b>

```typescript
registerFrontend(assetName: string, kickbackRate: Decimalish, overrides?: EthersTransactionOverrides): Promise<SentEthersKumoTransaction<void>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  assetName | string | Symbol of the asset token as string |
|  kickbackRate | [Decimalish](./lib-base.decimalish.md) | The portion of KUMO rewards to pass onto users of the frontend (between 0 and 1). |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[SentEthersKumoTransaction](./lib-ethers.sentetherskumotransaction.md)<!-- -->&lt;void&gt;&gt;

