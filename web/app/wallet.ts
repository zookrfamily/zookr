"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createWalletClient, createPublicClient, custom, http, type Address, type EIP1193Provider } from "viem";
import { robinhoodChain } from "../src/chain.ts";

export interface Wallet {
  address: Address | null; chainOk: boolean; busy: boolean; unavailable: boolean; error: string | null;
  connect: () => Promise<void>; disconnect: () => void;
  send: (tx: { to: Address; data: `0x${string}` }) => Promise<`0x${string}`>;
}

const CHAIN_HEX = `0x${robinhoodChain.id.toString(16)}`;
const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";
type Injected = EIP1193Provider & { on?: (e: string, h: (...a: never[]) => void) => void; removeListener?: (e: string, h: (...a: never[]) => void) => void };
const injected = (): Injected | null => (typeof window === "undefined" ? null : ((window as unknown as { ethereum?: Injected }).ethereum ?? null));

/** Browser reads through the same-origin proxy. */
export const reader = () => createPublicClient({ chain: robinhoodChain, transport: http("/api/rpc") });

/** MetaMask, Rabby, Frame - anything that speaks EIP-1193 in the page. */
export function useWallet(): Wallet {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const p = injected();
    if (!p) { setChecked(true); return; }
    void (async () => {
      try {
        const a = (await p.request({ method: "eth_accounts" })) as Address[];
        if (a?.[0]) setAddress(a[0]);
        setChainId((await p.request({ method: "eth_chainId" })) as string);
      } catch { /* locked wallet */ }
      setChecked(true);
    })();
    const onAccounts = (...a: never[]) => setAddress(((a[0] as unknown as Address[])?.[0]) ?? null);
    const onChain = (...a: never[]) => setChainId(a[0] as unknown as string);
    p.on?.("accountsChanged", onAccounts); p.on?.("chainChanged", onChain);
    return () => { p.removeListener?.("accountsChanged", onAccounts); p.removeListener?.("chainChanged", onChain); };
  }, []);

  const chainOk = chainId != null && Number.parseInt(chainId, 16) === robinhoodChain.id;

  const toChain = useCallback(async (p: Injected) => {
    try { await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] } as never); }
    catch (e) {
      if ((e as { code?: number })?.code !== 4902) throw e;
      await p.request({ method: "wallet_addEthereumChain", params: [{ chainId: CHAIN_HEX, chainName: robinhoodChain.name, nativeCurrency: robinhoodChain.nativeCurrency, rpcUrls: [PUBLIC_RPC], blockExplorerUrls: [robinhoodChain.blockExplorers?.default.url] }] } as never);
    }
  }, []);

  const connect = useCallback(async () => {
    const p = injected(); setError(null);
    if (!p) { setError("No browser wallet found. Install MetaMask or Rabby, then reload."); return; }
    setBusy(true);
    try { const a = (await p.request({ method: "eth_requestAccounts" })) as Address[]; setAddress(a?.[0] ?? null); await toChain(p); setChainId((await p.request({ method: "eth_chainId" })) as string); }
    catch (e) { setError(friendly(e)); } finally { setBusy(false); }
  }, [toChain]);

  const disconnect = useCallback(() => { setAddress(null); setError(null); }, []);

  const send = useCallback(async (tx: { to: Address; data: `0x${string}` }) => {
    const p = injected();
    if (!p || !address) throw new Error("Connect a wallet first");
    if (!chainOk) await toChain(p);
    const client = createWalletClient({ account: address, chain: robinhoodChain, transport: custom(p) });
    return client.sendTransaction({ to: tx.to, data: tx.data });
  }, [address, chainOk, toChain]);

  return useMemo(() => ({ address, chainOk, busy, error, unavailable: checked && !injected(), connect, disconnect, send }), [address, chainOk, busy, error, checked, connect, disconnect, send]);
}

export function friendly(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: number })?.code;
  if (code === 4001 || /user rejected|denied|cancell?ed/i.test(raw)) return "You cancelled the signature.";
  if (/insufficient funds/i.test(raw)) return "Not enough ETH to cover gas.";
  if (/AlreadyRegistered/i.test(raw)) return "This wallet already registered a destination.";
  if (/NotUnified/i.test(raw)) return "That is not a mainnet Unified Address (u1…).";
  return raw.split("\n")[0].slice(0, 160);
}
