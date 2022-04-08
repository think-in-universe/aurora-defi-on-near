import React, { useEffect, useState } from "react";
import { NearConfig, TGas, useAurora, useNear } from "../../data/near";
import { useErc20Balances } from "../../data/aurora/token";
import { useErc20AllowanceForDex } from "../../data/aurora/dex";
import { OneNear, OneEth, OneUSDT, toAddress, buildInput, tokenStorageDeposit, Zero64 } from "../../data/utils";
import Big from "big.js";
import { useTokens } from "../../data/aurora/tokenList";
import "./Dashboard.scss";
import * as nearAPI from "near-api-js";
import { Erc20Abi } from "../../abi/erc20";
import { UniswapRouterAbi } from "../../abi/IUniswapV2Router02";
import { useAccount } from "../../data/account";
import { AccountID, Address } from "@aurora-is-near/engine";

const wNEAR = NearConfig.wrapNearAccountId;
const USDT = NearConfig.usdtAccountId;
const trisolaris = NearConfig.trisolarisAddress;

const fetchBalance = async (aurora, address) => {
  return Big((await aurora.getBalance(toAddress(address))).unwrap());
};

export default function Dashboard(props) {
  const aurora = useAurora();
  const near = useNear();
  const account = useAccount();
  const address = props.address;
  const [balance, setBalance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wNearAddr, setwNearAddr] = useState(null);
  const tokens = useTokens();

  const erc20Balances = useErc20Balances(address, tokens.tokenAddresses);
  const allowance = useErc20AllowanceForDex(address, wNearAddr, trisolaris);

  useEffect(() => {
    if (!aurora) {
      return;
    }
    setLoading(true);

    fetchBalance(aurora, address).then((b) => {
      setBalance(b);
      setLoading(false);
    });

    getErc20Addr(wNEAR).then(setwNearAddr);
  }, [address, aurora]);

  const sortedErc20Balances = erc20Balances
    ? Object.entries(erc20Balances).filter(([t, b]) => b && b.gt(0))
    : [];
  sortedErc20Balances.sort(([t1, a], [t2, b]) => b.cmp(a));


  const getErc20Addr = async (nep141) => {
    return (await aurora.getAuroraErc20Address(new AccountID(nep141))).unwrap().toString();
  }

  const getNep141 = async (erc20) => {
    return (await aurora.getNEP141Account(new Address(erc20))).unwrap().toString();
  }

  const depositToken = async (e, token, amount) => {
    e.preventDefault();
    setLoading(true);
    const actions = [
      [
        token,
        nearAPI.transactions.functionCall(
          "ft_transfer_call",
          {
            receiver_id: NearConfig.contractName,
            amount: Big(amount).mul(OneNear).toFixed(0),
            memo: "",
            msg: address.substring(2),
          },
          TGas.mul(70).toFixed(0),
          1
        ),
      ],
    ];

    await near.sendTransactions(actions);
  };

  const storageDeposit = async (token, account) => {
    const deposit = await tokenStorageDeposit(token);
    const actions = [
      [
        token,
        nearAPI.transactions.functionCall(
          "storage_deposit",
          {
            receiver_id: account
          },
          TGas.mul(30).toFixed(0),
          deposit.toFixed(0)
        ),
      ],
    ];
    await near.sendTransactions(actions);
  };

  const withdrawToken = async (e, token, amount) => {
    e.preventDefault();
    setLoading(true);
    const input = buildInput(Erc20Abi, "withdrawToNear", [
      `0x${Buffer.from(account.accountId, "utf-8").toString("hex")}`,
      OneUSDT.mul(amount).round(0, 0).toFixed(0),  // need to check decimals in real case
    ]);
    const erc20Addr = await getErc20Addr(token);
    if (erc20Addr) {
      const res = (await aurora.call(toAddress(erc20Addr), input)).unwrap();
      console.log(res);
      setLoading(false);
    }
  };

  const depositETH = async (e, amount) => {
    e.preventDefault();
    setLoading(true);
    const actions = [
      [
        token,
        nearAPI.transactions.functionCall(
          "ft_transfer_call",
          {
            receiver_id: NearConfig.contractName,
            amount: Big(amount).mul(OneEth).toFixed(0),
            memo: null,
            msg: account.accountId
              + ":"
              + Zero64 // fee
              + address.substring(2),
          },
          TGas.mul(70).toFixed(0),
          1
        ),
      ],
    ];

    await near.sendTransactions(actions);
  };

  const withdrawETH = async (e, amount) => {
    e.preventDefault();
    setLoading(true);
    const input = `0x00${Buffer.from(account.accountId, "utf-8").toString("hex")}`;
    // Warning: The function call here doesn't work, because the current API doesn't support the 2nd `value` parameter
    //
    // pub struct FunctionCallArgsV2 {
    //   pub contract: RawAddress,
    //   pub value: WeiU256,
    //   pub input: Vec<u8>,
    // }
    const res = (await aurora.call(
      toAddress(NearConfig.ethBridgeAddress),
      OneEth.mul(amount).round(0, 0).toFixed(0),
      input
    )).unwrap();
    console.log(res);
    setLoading(false);
  };

  const approve = async(e, token, amount) => {
    e.preventDefault();
    setLoading(true);
    const input = buildInput(Erc20Abi, "approve", [
      trisolaris,
      OneNear.mul(amount).round(0, 0).toFixed(0),
    ]);
    const erc20Addr = await getErc20Addr(token);
    if (erc20Addr) {
      const res = (await aurora.call(toAddress(erc20Addr), input)).unwrap();
      console.log(res);
      setLoading(false);
    }
  }

  const swap = async(e, from, to, amount_in, amount_out) => {
    e.preventDefault();
    setLoading(true);
    const fromErc20 = await getErc20Addr(from);
    const toErc20 = await getErc20Addr(to);
    if (fromErc20 && toErc20) {
      const input = buildInput(UniswapRouterAbi, "swapExactTokensForTokens", [
        OneNear.mul(amount_in).round(0, 0).toFixed(0),  // need to check decimals in real case
        OneUSDT.mul(amount_out).round(0, 0).toFixed(0),  // need to check decimals in real case
        [fromErc20, toErc20],
        address,
        (Math.floor(new Date().getTime() / 1000) + 60).toString() // 60s from now
      ]);
      const res = (await aurora.call(toAddress(trisolaris), input)).unwrap();
      console.log(res);
      setLoading(false);
    }
  }

  return (
    <div>
      <div>Account: {address.toString()}</div>
      <div>Allowance for {wNEAR}: {allowance && allowance.div(Big(OneNear)).toNumber()}</div>
      <div>
        <button
          className="btn btn-primary m-1"
          onClick={(e) => depositToken(e, wNEAR, 1)}
        >
          Deposit 1 wNEAR
        </button>
        {
          (!allowance || allowance.eq(Big(0))) && (
            <button
              className="btn btn-info m-1"
              onClick={(e) => approve(e, wNEAR, 10)}
            >
              Approve wNEAR on Trisolaris
            </button>
          )
        }
        <button
          className="btn btn-warning m-1"
          onClick={(e) => swap(e, wNEAR, USDT, 0.1, 1)}
        >
          Swap 0.1 wNEAR to 1+ USDT on Trisolaris
        </button>
        <button
          className="btn btn-success m-1"
          onClick={(e) => withdrawToken(e, USDT, 1)}
        >
          Withdraw 1 USDT
        </button>
      </div>
      <div>
        Balance: {loading ? "Loading" : `${balance.div(OneEth).toFixed(6)} ETH`}
      </div>
      <div>
        ERC20 balances:
        <ul>
          {sortedErc20Balances.map(([tokenAddress, balance]) => {
            const token = tokens.tokensByAddress[tokenAddress];
            return (
              <li key={`token-balance-${tokenAddress}`}>
                <img
                  className="token-icon me-1"
                  src={token.logoURI}
                  alt={token.symbol}
                />
                {token.symbol}:{" "}
                {balance
                  ? balance.div(Big(10).pow(token.decimals)).toFixed(6)
                  : balance}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
