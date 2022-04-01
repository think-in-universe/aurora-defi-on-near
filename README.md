# aurora-defi-on-near
Interact with Aurora DeFi protocols with your NEAR accounts


## NEAR <> Aurora Cross-Contract Call

### ⚔ Call Aurora contracts from NEAR

#### 1. Call `view` function

To call a view function in one contract in Aurora, we call the `view()` function on `aurora` contract, with the following args

[arguments definition:](https://github.com/aurora-is-near/aurora-engine/blob/c579fc8f724176d053670f78214717d6769d3524/engine/src/lib.rs?_pjax=%23js-repo-pjax-container%2C%20div%5Bitemtype%3D%22http%3A%2F%2Fschema.org%2FSoftwareSourceCode%22%5D%20main%2C%20%5Bdata-pjax-container%5D#L449)

```rs
pub struct ViewCallArgs {
    pub sender: RawAddress,     // sender address
    pub address: RawAddress,    // contract address
    pub amount: RawU256,        // not really needed?
    pub input: Vec<u8>,         // parameters in HEX
}
```

**Example**

Call view function in **TriSolaris** contract. 

```bash
export NEAR_ENV=mainnet
export AURORA_ENGINE=aurora
aurora view 0x49eb1f160e167aa7ba96bdd88b6c1f2ffda5212a 0x252dba4200000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000016000000000000000000000000020f8aefb5697b77e0bb835a8518be70775cda1b0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000040902f1ac0000000000000000000000000000000000000000000000000000000000000000000000000000000084b123875f0f36b966d0b6ca14b31121bd9676ad000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000040902f1ac00000000000000000000000000000000000000000000000000000000000000000000000000000000fa94348467f64d5a457f75f8bc40495d33c65abb0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000418160ddd00000000000000000000000000000000000000000000000000000000
```

P.S. Here we use `eth_call`'s method and input parameters in the above command.

The result is as follows, which could be decoded with contract ABI 

```
0x0000000000000000000000000000000000000000000000000000000003836b9400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000140eb539eced0000000000000000000000000000000000000014ae42faff9d8269fbf2ac5cab0000000000000000000000000000000000000000000000000000000061ffb7de0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000bea6b7285741effb5ae25c2680000000000000000000000000000000000000000000b15cc839de6696004d3a90000000000000000000000000000000000000000000000000000000061ffb7ea0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000a1d9cebebe8debb64c3408
```


#### 2. Call `change` function

To call contract functions that mutate states in contracts deployed on Aurora, there're two major methods that can be invoked in `aurora` contract:

1. [`submit()`](https://github.com/aurora-is-near/aurora-engine/blob/c579fc8f724176d053670f78214717d6769d3524/engine/src/lib.rs?_pjax=%23js-repo-pjax-container%2C%20div%5Bitemtype%3D%22http%3A%2F%2Fschema.org%2FSoftwareSourceCode%22%5D%20main%2C%20%5Bdata-pjax-container%5D#L244-L263) which is now ususally called by Aurora Relayer who sends the transactions that are signed by user via MetaMask to Aurora Engine. The signer of the transaction (e.g. sign via MetaMask) will be the origin of transaction. 
2. [`call()`](https://github.com/aurora-is-near/aurora-engine/blob/c579fc8f724176d053670f78214717d6769d3524/engine/src/lib.rs?_pjax=%23js-repo-pjax-container%2C%20div%5Bitemtype%3D%22http%3A%2F%2Fschema.org%2FSoftwareSourceCode%22%5D%20main%2C%20%5Bdata-pjax-container%5D#L223-L239) which can be called by any account. [The encoded EVM address from the NEAR account](https://github.com/aurora-is-near/aurora-engine/blob/c579fc8f724176d053670f78214717d6769d3524/engine-sdk/src/types.rs#L25-L27) will be the origin of the transaction. 


The [call arguments](https://github.com/aurora-is-near/aurora-engine/blob/c579fc8f724176d053670f78214717d6769d3524/engine/src/parameters.rs#L136-L141) of `aurora.call()`

```rs
pub struct FunctionCallArgsV2 {
    pub contract: RawAddress,
    pub value: WeiU256,
    pub input: Vec<u8>,
}
```


**Example**

Call mutable function that changes states in **TriSolaris** contract. (This [tx](https://explorer.near.org/transactions/B8KA2WZXwaF5Db6zhz3NefDGjuxDSXtGqX6fdQek8f6s) actually calls a view function via `aurora.call()`)

```bash
export NEAR_MASTER_ACCOUNT=alice.near
aurora call 0x49eb1f160e167aa7ba96bdd88b6c1f2ffda5212a 0x252dba4200000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000016000000000000000000000000020f8aefb5697b77e0bb835a8518be70775cda1b0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000040902f1ac0000000000000000000000000000000000000000000000000000000000000000000000000000000084b123875f0f36b966d0b6ca14b31121bd9676ad000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000040902f1ac00000000000000000000000000000000000000000000000000000000000000000000000000000000fa94348467f64d5a457f75f8bc40495d33c65abb0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000418160ddd00000000000000000000000000000000000000000000000000000000
```


#### 3. Account Mapping (NEAR -> Aurora)

To get the encoded EVM account of a NEAR account, we can use the `encode-address` command from Aurora CLI. The encoding methods are implemented in [aurora.js](https://github.com/aurora-is-near/aurora.js/blob/541fff9366e7b91a508c8a4f9b79efa460799d1a/src/account.ts?_pjax=%23js-repo-pjax-container%2C%20div%5Bitemtype%3D%22http%3A%2F%2Fschema.org%2FSoftwareSourceCode%22%5D%20main%2C%20%5Bdata-pjax-container%5D#L24-L28) and [aurora-engine-sdk](https://github.com/aurora-is-near/aurora-engine/blob/c579fc8f724176d053670f78214717d6769d3524/engine-sdk/src/types.rs#L25-L27). 

```
$ aurora encode-address test.near
0xCBdA96B3F2B8eb962f97AE50C3852CA976740e2B
```

![](https://i.imgur.com/LD8wani.png)


However, since the user usually doesn't own the private key of the encoded EVM address, one target Aurora address might need to be provided under some use cases such as swap (needs more research and testing). 


#### 4. Explorer Compatibility

In the current test, the Aurora function call via `aurora.call()` is not included in the transactions in the Aurora explorer: https://explorer.mainnet.aurora.dev/

Only transactions submitted by Aurora relayer is included in Aurora Explorer.

#### Reference

- Aurora CLI: https://github.com/aurora-is-near/aurora-cli
- Aurora Engine: https://github.com/aurora-is-near/aurora-engine
- Aurora JS (Engine part): https://github.com/aurora-is-near/aurora.js/blob/master/src/engine.ts



### 🛠 Call NEAR contracts from Aurora

Unfortunately this is not supported yet at the moment. 

1. https://github.com/aurora-is-near/aurora-engine/discussions/291
2. https://gov.near.org/t/aurora-to-near-coross-contract-call-possible/8254



## Integration Examples

Create an application where contracts in NEAR and contracts in Aurora communicate between each other. https://metabuild.devpost.com/details/sponsor-challenges#h_42475642918091639626542295

Examples: 

1. NEAR Native Token on Aurora: create native NEAR support inside Aurora. Description of the task is on the issue. https://github.com/aurora-is-near/rainbow-bridge/discussions/642
2. Oracle that allows fetching information from NEAR in Aurora (or vice versa).
3. Off-chain tools that allow integration, building and testing of this type of apps easier.


