"use client";

import { usePathname } from "next/navigation";
import { useWallet } from "./wallet.ts";
import { short, TELEGRAM_URL, GITHUB_URL, REGISTRY, EXPLORER } from "../src/site.ts";

const LINKS: [string, string][] = [["/dashboard", "Dashboard"], ["/explore", "Explore"], ["/docs", "Docs"]];

export const Tg = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M21.9 4.6 18.7 19.3c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.5-.6-.2L6.2 13 1.4 11.5c-1-.3-1-1 .2-1.5L20.5 2.9c.9-.3 1.6.2 1.4 1.7z" /></svg>
);

export function Nav() {
  const path = usePathname();
  const w = useWallet();
  return (
    <nav className="nav">
      {/* eslint-disable-next-line @next/next/no-img-element -- static mark */}
      <a className="brand" href="/"><img src="/logo.png" alt="" width={34} height={34} /><span>Zookr</span></a>
      <div className="nav-links">{LINKS.map(([h, l]) => <a key={h} href={h} className={path?.startsWith(h) ? "on" : ""}>{l}</a>)}</div>
      <span className="sp" />
      <a className="nav-ico" href={TELEGRAM_URL} target="_blank" rel="noreferrer" aria-label="Telegram"><Tg /></a>
      {w.address
        ? <button className="btn sm" onClick={w.disconnect}>{short(w.address)}</button>
        : w.unavailable
          ? <a className="btn sm" href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get a wallet</a>
          : <button className="btn sm primary" onClick={() => void w.connect()} disabled={w.busy}>{w.busy ? "…" : "Connect wallet"}</button>}
    </nav>
  );
}

export function Foot() {
  return (
    <footer className="foot">
      <span>Zookr · native ZEC rewards on Robinhood Chain</span>
      <span className="sp" />
      <a href="/docs">Docs</a>
      <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">Telegram</a>
      <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
      {REGISTRY && <a href={`${EXPLORER}/address/${REGISTRY}`} target="_blank" rel="noreferrer">Registry</a>}
    </footer>
  );
}
