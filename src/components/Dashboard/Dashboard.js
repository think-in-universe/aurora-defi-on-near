import React, { useEffect, useState } from "react";
import { NearConfig, TGas, useAurora, useNear } from "../../data/near";
import { useErc20Balances } from "../../data/aurora/token";
import { OneNear, OneEth, toAddress, buildInput } from "../../data/utils";
import Big from "big.js";
import { useTokens } from "../../data/aurora/tokenList";
import "./Dashboard.scss";
import * as nearAPI from "near-api-js";
import { Erc20Abi } from "../../abi/erc20";
import { useAccount } from "../../data/account";
import { AccountID, Address } from "@aurora-is-near/engine";

const wNEAR = NearConfig.wrapNearAccountId;

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
  const tokens = useTokens();

  const erc20Balances = useErc20Balances(address, tokens.tokenAddresses);

  useEffect(() => {
    if (!aurora) {
      return;
    }
    setLoading(true);

    fetchBalance(aurora, address).then((b) => {
      setBalance(b);
      setLoading(false);
    });
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

  const withdrawToken = async (e, token, amount) => {
    e.preventDefault();
    setLoading(true);
    const input = buildInput(Erc20Abi, "withdrawToNear", [
      `0x${Buffer.from(account.accountId, "utf-8").toString("hex")}`,
      OneNear.mul(amount).round(0, 0).toFixed(0),
    ]);
    const erc20Addr = await getErc20Addr(token);
    if (erc20Addr) {
      const res = (await aurora.call(toAddress(erc20Addr), input)).unwrap();
      console.log(res);
      setLoading(false);
    }
  };

  return (
    <div>
      <div>Account: {address.toString()}</div>
      <div>
        <button
          className="btn btn-primary m-1"
          onClick={(e) => depositToken(e, wNEAR, 1)}
        >
          Deposit 1 wNEAR
        </button>
        <button
          className="btn btn-primary m-1"
          onClick={(e) => withdrawToken(e, wNEAR, 1)}
        >
          Withdraw 1 wNEAR
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
