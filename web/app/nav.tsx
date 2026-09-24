"use client";

import { usePathname } from "next/navigation";
import { useWallet } from "./wallet.ts";
import { short } from "../src/site.ts";

const LINKS: [string, string][] = [["/dashboard", "Dashboard"], ["/explore", "Explore"], ["/docs", "Docs"]];

export function Nav() {
  const path = usePathname();
  const w = useWallet();
  return (
    <nav className="nav">
      <a className="brand" href="/"><i>Z</i><span>Zookr</span></a>
      <div className="nav-links">{LINKS.map(([h, l]) => <a key={h} href={h} className={path?.startsWith(h) ? "on" : ""}>{l}</a>)}</div>
      <span className="sp" />
      {w.address
        ? <button className="btn sm" onClick={w.disconnect}>{short(w.address)}</button>
        : w.unavailable
          ? <a className="btn sm" href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get a wallet</a>
          : <button className="btn sm" onClick={() => void w.connect()} disabled={w.busy}>{w.busy ? "…" : "Connect wallet"}</button>}
    </nav>
  );
}

export function Foot() {
  return (
    <footer className="foot">
      <span>Zookr · native ZEC rewards on Robinhood Chain</span>
      <span className="sp" />
      <a href="/docs">Docs</a>
    </footer>
  );
}
