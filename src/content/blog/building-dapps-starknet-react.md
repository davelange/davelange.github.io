---
title: Building dapps with Starknet React
publishedAt: February 2023
description: Need some content to repeat across the screen and endlessly loop round and round? In this blog post, I take a look at how to create an infinite looper with React JS and CSS animations.
canonical: https://blog.finiam.com/blog/building-dapps-with-starknet-react
---

# Building dapps with Starknet React

_Parts of this article were originally written for [The Starknet Book](https://book.starknet.io/). Check it out for more content on Starknet development. Originally posted at [Finiam](https://blog.finiam.com/blog/building-dapps-with-starknet-react)._

## The good news

If you've been following Starknet's progress, you're probably aware that there has been _a lot_ of change recently. Cairo 1 was released, and that means frontend tools need updating to keep up.


If you have experience building dapps but are new to Starknet, the good news is that you can apply plenty of that knowledge here! If you're familiar with Starknet, the good news (in my opinion) is that the changes are moving in the right direction.

## Getting started
The basic tools you can use to get started are [Starknet.js](https://www.starknetjs.com/) and [get-starknet](https://github.com/starknet-io/get-starknet). Starknet.js is an essential low level lib, equivalent to ethers.js, whereas get-starknet handles connecting to wallets. You should definitely read Starknet.js' docs for a more in-depth understanding.

With these tools, there are basically 3 main concepts to know on the frontend:

![overview of the frontend](https://hackmd.io/_uploads/Byz0vx2E3.png)


### Account
We can generally think of the account as the "end user" of a dapp, and some user interaction will be involved to gain access to it. 

Think of a dapp where the user connects their browser extension wallet (such as [ArgentX](https://www.argent.xyz/argent-x/) or [Braavos](https://braavos.app/)) - if the user accepts the connection, that gives us access to the account and signer, which can sign transactions and messages.

Unlike Ethereum, where user accounts are Externally Owned Accounts, Starknet [**accounts are contracts**](https://docs.starknet.io/documentation/architecture_and_concepts/Account_Abstraction/introduction/). This might not impact your dapp's frontend, but you should definitely be aware of this difference.

```ts
async function connectWallet() {
    const starknet = await connect();
    console.log(starknet.account);
    starknet.account.signMessage(...)
}
```
The snippet above uses the `connect` function provided by `get-starknet` to establish a connection to the user wallet.

### Provider
This one is pretty simple. The provider allows you to interact with the Starknet network. You can think of it as a "read" connection to the blockchain, with methods such as `getBlock` or `getChainId`.

Just like in Ethereum, you can use a default provider, or use services like Infura or Alchemy, both of which support Starknet.

```ts
export const provider = new Provider({
  sequencer: {
    network: "goerli-alpha",
  },
  /* rpc: {
    nodeUrl: INFURA_ENDPOINT
  } */
});

const block = await provider.getBlock("latest"); // <- Get latest block    
console.log(block.block_number);
```

### Contracts
Of course, your frontend will likely be interacting with deployed contracts. For each contract, there should be a counterpart on the frontend. To create these instances, you will need the contract's address and ABI, and either a provider or signer. 

```ts
const contract = new Contract(
  abi_erc20,
  contractAddress,
  starknet.account
);

contract.balanceOf(starknet.account.address)
```

If you create a contract instance with a provider, you'll be limited to calling read functions on the contract - only with a signer can you change the state of the blockchain.

## Units
If you have previous experience with web3, you know dealing with units can be tricky, and Starknet is no exception. Once again, the docs are very useful here, especially [this section on data transformation](https://www.starknetjs.com/docs/guides/define_call_message/).

Very often you will need to convert Cairo structs (such as Uint256) that are returned from contracts into numbers:

```ts
// Uint256 shape:
// { 
//    type: 'struct', 
//    low: Uint256.low, 
//    high: Uint256.high 
// 
// }
const balance = await contract.balanceOf(address); // <- uint256
const asBN = uint256.uint256ToBN(uint256); // <- uint256 into BN
const asString = asBN.toString() //<- BN into string
```
And vice versa:

```ts
const amount = 1;

const amountFormatted = {
    type: "struct",
    ...uint256.bnToUint256(amount),
};
```

If we put it all together, calling a `transfer` function on a contract looks like this:

```ts

const tx = await contract.transfer(recipientAddress, amountFormatted);
//or: const tx = await contract.invoke("transfer", [recipientAddress, amountFormatted]); 

console.log(`Tx hash: ${tx.transaction_hash}`);
```

There are other helpful utils, besides `bnToUint256` and `uint256ToBN`, provided by Starknet.js.

We now have a solid foundation to build a Starknet dapp! If you have a background in regular Ethereum apps, you'll notice how similar the experience is, but you're probably also wondering if there are more high-level tools out there that we can use. Well, there are! 

## Starknet React

[Starknet React](https://github.com/apibara/starknet-react/) is an open-source  collection of React providers and hooks for Starknet, inspired by [wagmi](https://github.com/tmm/wagmi/). If you've used wagmi before, you  should have a pretty good idea of what it looks like, as it aims to have a very similar API.

To explore an example project showcasing a dapp built with Starknet React, check out the [starknet-demo-dapp](https://github.com/finiam/starknet-demo-dapp/) repo.

To use Starknet React, start by installing the necessary dependencies:

```
yarn add @starknet-react/core starknet get-starknet
```


[Starknet.js](https://www.starknetjs.com/) is an SDK for interacting with Starknet, whereas [get-starknet](https://github.com/starknet-io/get-starknet/) is a package for handling wallet connections.

Then, wrap your app in a `StarknetConfig` component. This allows for some configuration and provides a React Context for the underlying app to be able to use the shared data and hooks. `StarknetConfig` receives a `connectors` prop that defines which wallet connection options will be available to the user.

```ts
const connectors = [
  new InjectedConnector({ options: { id: "braavos" } }),
  new InjectedConnector({ options: { id: "argentX" } }),
];

return (
    <StarknetConfig
      connectors={connectors}
      autoConnect
    >
      <App />
    </StarknetConfig>
)
```

## Connection and account

You can now use a hook to access the connectors you defined in the config, allowing the user to connect their wallet:

```ts
export default function Connect() {
  const { connect, connectors, disconnect } = useConnectors();

  return (
    <div>
      {connectors.map((connector) => (
        <button
          key={connector.id()}
          onClick={() => connect(connector)}
          disabled={!connector.available()}
        >
          Connect with {connector.id()}
        </button>
      ))}
    </div>
  );
}
```

Note that there is also a `disconnect` function provided, in order to end the connection. Once the user has connected their wallet, you have access to the connected account through the `useAccount` hook. This also provides the current state of connection:

```ts
const { address, isConnected, isReconnecting, account } = useAccount();

return (
    <div>
      {isConnected ? (
          <p>Hello, {address}</p>          
      ) : (
        <Connect />
      )}
    </div>
);
```

Note that state values such as `isConnected` and `isReconnecting` are updated automatically, making it easier to update the UI conditionally. This is a very useful and common pattern when dealing with asynchronous processes, as it means you don't have to manually keep track of that state locally in your components.

Once the user is connected, signing messages may be done through the `account` value returned from the `useAccount` hook, or more simply through the `useSignTypedData` hook.

```ts
const { data, signTypedData } = useSignTypedData(typedMessage)  

return (
  <>
    <p>
      <button onClick={signTypedData}>Sign</button>
    </p>
    {data && <p>Signed: {JSON.stringify(data)}</p>}
  </>
)
```
You can sign an array of `BigNumberish`, or an object. In the event of signing an object, the data must be correctly typed, in accordance with EIP712. [You can find a more in depth explanation here](https://www.starknetjs.com/docs/guides/signature/).

## Network

Starknet React also provides hooks for interacting with the provider. For instance, `useBlock` fetches the latest block:

```ts
const { data, isError, isFetching } = useBlock({
    refetchInterval: 10_000,
    blockIdentifier: "latest",
});

if (isError) {
  return (
    <p>Something went wrong</p>
  )
}

return (
    <p>Current block: {isFetching ? "Loading..." : data?.block_number}<p>
)
```

The `refetchInterval` specifies how often the hook will attempt to refetch the data.  Under the hood, Starknet React uses [react-query](https://github.com/TanStack/query/) for state  and query management. Besides `useBlock`, there are other hooks that can be configured to periodically update, such as `useContractRead` and `useWaitForTransaction`.

With the `useStarknet` hook, it's also possible to directly access the `ProviderInterface`:

```ts
const { library } = useStarknet();

// library.getClassByHash(...)
// library.getTransaction(...)
```

## Interacting with contracts

### Read functions
Just like with wagmi, there is a `useContractRead` hook provided specifically for calling read functions on contracts. Note that this may be used even with without a connected user, as read functions don't require a signer.

```ts
const { data: balance, isLoading, isError, isSuccess } = useContractRead({
    abi: abi_erc20,
    address: CONTRACT_ADDRESS,
    functionName: "allowance",
    args: [owner, spender],
    // watch: true <- refresh at every block
});
```

For working with ERC20s, there is also a convenience hook - `useBalance`. This hook doesn't require passing in an ABI, and will return a correctly formatted balance value. 

```ts
  const { data, isLoading } = useBalance({
    address,
    token: CONTRACT_ADDRESS, // <- defaults to the ETH token
    // watch: true <- refresh at every block
  });

  return (
    <p>Balance: {data?.formatted} {data?.symbol}</p>
  )
```

### Write functions
For write functions, the `useContractWrite` hook is slightly different to wagmi. Due  to Starknet's architecture, accounts can natively support multicall transactions. In practice, this means an  improved user experience when executing multiple transactions, as you won't have to individually approve each transaction. Starknet React makes  the most of this feature through the `useContractWrite` hook. It can be used in the following manner:

```ts
const calls = useMemo(() => {
    // compile the calldata to send
    const calldata = stark.compileCalldata({
      argName: argValue,
    });

    // return a single object for single transaction, 
    // or an array of objects for multicall**
    return {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: functionName,
      calldata,
    };        
}, [argValue]);


// Returns a function to trigger the transaction
// and state of tx after being sent
const { write, isLoading, data } = useContractWrite({
    calls,
});

function execute() {
  // trigger the transaction
  write();
}

return (
  <button type="button" onClick={execute}>
    Make a transaction
  </button>
)
```

In the example above, we first compile the calldata to be executed using Starknet.js's `compileCalldata` util. We pass the contract address, entrypoint, and calldata to the `useContractWrite` hook, which returns a `write` function we can use to actually trigger the transaction. The hook also returns the hash and state of the contract call.

### Single instance of a contract

Using `useContractRead` and `useContractWrite` might not be a good fit for your use case - you might want to work with a single instance of the contract, instead of continually specifying its address and ABI in individual hooks. This is also possible throught the `useContract` hook:

```ts
const { contract } = useContract({
    address: CONTRACT_ADDRESS,
    abi: abi_erc20,
});

// Call functions directly on contract
// contract.transfer(...);
// contract.balanceOf(...);
```

## Transactions

Once you have a transaction hash, you may track it's state through the `useTransaction` hook. This keeps a cache of all transactions, reducing duplicated network requests.

```ts
const { data, isLoading, error } = useTransaction({ hash: txHash });

return (
  <pre>
    {JSON.stringify(data?.calldata)}
  </pre>
)
```

## Wrapping up

You can find a working example with any of these hooks implemented in [this repo](https://github.com/finiam/starknet-demo-dapp/).

Expect more changes in the next few months, as the Starknet ecosystem continues to evolve!

Happy hacking :wave: