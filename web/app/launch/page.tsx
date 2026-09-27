"use client";

import { useState } from "react";
import { encodeFunctionData, parseEther, decodeEventLog } from "viem";
import { Nav, Foot } from "../nav.tsx";
import { useWallet, reader, friendly } from "../wallet.ts";
import { Logo } from "../tokenrow.tsx";
import { LAUNCHPAD, launchpadAbi, LAUNCH_FEE_ETH, EXPLORER } from "../../src/site.ts";

const MAX_IMG = 2 * 1024 * 1024;
const field = { width: "100%", padding: "11px 14px", border: "1px solid var(--line-2)", borderRadius: 14, background: "#fff", font: "inherit", fontSize: 14 } as const;
const Label = ({ children, opt }: { children: React.ReactNode; opt?: boolean }) => <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0 6px", fontSize: 13.5, fontWeight: 600 }}>{children}{opt && <span className="k">Optional</span>}</div>;
const Step = ({ n, title, opt }: { n: string; title: string; opt?: boolean }) => <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><b className="mono" style={{ color: "var(--ok)", fontSize: 12 }}>{n}</b><h2 style={{ fontSize: 22 }}>{title}</h2>{opt && <span className="k" style={{ marginLeft: "auto" }}>Optional</span>}</div>;

export default function Launch() {
  const w = useWallet();
  const [name, setName] = useState(""); const [symbol, setSymbol] = useState(""); const [desc, setDesc] = useState("");
  const [logo, setLogo] = useState(""); const [useLink, setUseLink] = useState(false);
  const [x, setX] = useState(""); const [tg, setTg] = useState(""); const [site, setSite] = useState("");
  const [buy, setBuy] = useState("0");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; token?: string } | null>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_IMG) { setMsg({ ok: false, text: "Image is over 2 MB." }); return; }
    const r = new FileReader(); r.onload = () => setLogo(String(r.result)); r.readAsDataURL(f);
  };
  const total = (() => { try { return parseEther(LAUNCH_FEE_ETH) + parseEther(buy || "0"); } catch { return null; } })();
  const valid = name.trim().length > 0 && /^[A-Za-z0-9]{1,12}$/.test(symbol.trim()) && total !== null;

  const launch = async () => {
    if (!LAUNCHPAD || !w.address || !valid || total === null) return;
    setBusy(true); setMsg(null);
    try {
      const input = { name: name.trim(), symbol: symbol.trim().toUpperCase(), logo, description: desc.trim(), socials: { twitter: x.trim(), telegram: tg.trim(), discord: "", website: site.trim(), farcaster: "" }, minTokensOut: 0n };
      const hash = await w.send({ to: LAUNCHPAD, data: encodeFunctionData({ abi: launchpadAbi, functionName: "launch", args: [input] }), value: total });
      setMsg({ ok: true, text: "Launch sent. Waiting for the block…" });
      const rc = await reader().waitForTransactionReceipt({ hash });
      let token = "";
      for (const l of rc.logs) { try { const e = decodeEventLog({ abi: launchpadAbi, data: l.data, topics: l.topics }); if (e.eventName === "Launched") token = e.args.token.toLowerCase(); } catch { /* other log */ } }
      setMsg({ ok: true, text: `${input.symbol} is live on the curve. The rounds engine picks it up within ten minutes.`, token });
    } catch (e) { setMsg({ ok: false, text: friendly(e) }); } finally { setBusy(false); }
  };

  return (
    <>
      <Nav />
      <main className="wrap page">
        <div className="page-head"><div><span className="k">Launchpad</span><h1>Launch a token</h1></div></div>
        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text} {msg.token && <a href={`/tokens/${msg.token}`} style={{ textDecoration: "underline" }}>Open token page →</a>}</div>}

        <div className="g31" style={{ marginTop: 0 }}>
          <div className="card card-pad">
            <Step n="01" title="Token identity" />
            <label style={{ display: "flex", gap: 16, alignItems: "center", padding: 16, marginTop: 16, border: "1px dashed var(--line-2)", borderRadius: 16, cursor: "pointer", background: "rgba(255,255,255,.5)" }}>
              <Logo t={{ logo, symbol }} size={64} />
              <span style={{ flex: 1 }}><b>Upload an image</b><br /><span className="k">PNG, JPG or WebP · max 2 MB</span></span>
              <span style={{ fontSize: 20 }}>↥</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <div className="g2" style={{ gap: 14 }}>
              <div style={{ border: 0 }}><Label>Token name</Label><input style={field} placeholder="e.g. My Token" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></div>
              <div style={{ border: 0 }}><Label>Symbol</Label><input style={{ ...field, fontFamily: "var(--mono)" }} placeholder="e.g. TOKEN" value={symbol} onChange={(e) => setSymbol(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} maxLength={12} /></div>
            </div>
            <Label opt>Description</Label>
            <textarea style={{ ...field, minHeight: 90, resize: "vertical" }} placeholder="Tell people what your token is about" value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 300))} />
            <div className="k" style={{ textAlign: "right", marginTop: 4 }}>{desc.length}/300</div>
            <button className="k" style={{ border: 0, background: "none", padding: 0, marginTop: 10, textDecoration: "underline", cursor: "pointer" }} onClick={() => setUseLink(!useLink)}>{useLink ? "Upload a file instead" : "Use an image link"}</button>
            {useLink && <input style={{ ...field, marginTop: 8, fontFamily: "var(--mono)", fontSize: 12.5 }} placeholder="https://…/logo.png" value={logo.startsWith("data:") ? "" : logo} onChange={(e) => setLogo(e.target.value.trim())} />}

            <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "26px 0" }} />
            <Step n="02" title="Links" opt />
            <Label>X</Label><input style={field} placeholder="https://x.com/yourtoken" value={x} onChange={(e) => setX(e.target.value)} />
            <Label>Telegram</Label><input style={field} placeholder="https://t.me/yourtoken" value={tg} onChange={(e) => setTg(e.target.value)} />
            <Label>Website</Label><input style={field} placeholder="https://yourtoken.com" value={site} onChange={(e) => setSite(e.target.value)} />

            <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "26px 0" }} />
            <Step n="03" title="Initial buy" opt />
            <p style={{ color: "var(--dim)", fontSize: 14, margin: "10px 0 0" }}>Buy your own token in the launch transaction. Tokens go straight to your wallet, free of the launch-window snipe tax.</p>
            <Label>Initial buy amount</Label>
            <div style={{ position: "relative" }}><input style={{ ...field, fontFamily: "var(--mono)", paddingRight: 56 }} inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value.replace(/[^0-9.]/g, ""))} /><span className="mono" style={{ position: "absolute", right: 14, top: 12, color: "var(--dim)", fontSize: 13 }}>ETH</span></div>

            <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "26px 0" }} />
            <div className="kv"><span>Launch fee (Pons)</span><b>{LAUNCH_FEE_ETH} ETH</b></div>
            <div className="kv"><span>Total sent</span><b>{total !== null ? `${(Number(total) / 1e18).toFixed(5)} ETH` : "—"}</b></div>
            {!LAUNCHPAD ? <button className="btn primary" style={{ width: "100%", marginTop: 16 }} disabled>Launchpad not deployed</button>
              : !w.address ? <button className="btn primary" style={{ width: "100%", marginTop: 16 }} onClick={() => void w.connect()} disabled={w.busy}>Connect wallet to launch ↗</button>
              : <button className="btn primary" style={{ width: "100%", marginTop: 16 }} onClick={launch} disabled={busy || !valid}>{busy ? "Launching…" : valid ? `Launch ${symbol || "token"} ↗` : "Fill in name and symbol"}</button>}
          </div>

          <aside className="card card-pad" style={{ alignSelf: "start", position: "sticky", top: 90 }}>
            <span className="k">Live preview</span>
            <div style={{ display: "flex", gap: 14, alignItems: "center", margin: "12px 0" }}><Logo t={{ logo, symbol }} size={52} /><div><b>{name || "Your token"}</b><br /><span className="mono" style={{ fontSize: 12, color: "var(--dim)" }}>{symbol || "SYMBOL"}</span></div></div>
            <p style={{ color: "var(--dim)", fontSize: 14, margin: "0 0 14px", whiteSpace: "pre-wrap" }}>{desc || "Your token description will appear here."}</p>
            <div className="kv"><span>Venue</span><b><span className="pill" style={{ boxShadow: "none", padding: "3px 9px" }}><i style={{ background: "var(--ok)" }} />On the curve</span></b></div>
            <div className="kv"><span>Reward asset</span><b>ZEC</b></div>
            <div className="kv"><span>Market cap</span><b>Available after launch</b></div>
            <div className="kv"><span>Progress to Uniswap</span><b>—</b></div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--line)", margin: "6px 0 22px" }} />
            <h3 style={{ fontSize: 18 }}>Every trade keeps rewarding.</h3>
            <p style={{ color: "var(--dim)", fontSize: 14, margin: "8px 0 14px" }}>A fixed 2% creator fee on buys and sells funds automatic native-ZEC rewards.</p>
            <div className="kv"><b className="big" style={{ fontSize: 28, color: "var(--ok)" }}>90%</b><span style={{ flex: 1, color: "var(--ink)" }}>To your token&apos;s eligible holders</span></div>
            <div className="kv"><b className="big" style={{ fontSize: 28, color: "var(--ok)" }}>10%</b><span style={{ flex: 1, color: "var(--ink)" }}>To platform-token holders</span></div>
            <p className="k" style={{ marginTop: 14, letterSpacing: ".04em", textTransform: "none", fontSize: 11.5, lineHeight: 1.5 }}>Pons trading and transaction charges apply separately. Rewards follow scheduled rounds; delivery depends on funding and processing.{LAUNCHPAD && <> Launchpad <a href={`${EXPLORER}/address/${LAUNCHPAD}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{LAUNCHPAD.slice(0, 8)}… ↗</a></>}</p>
          </aside>
        </div>
      </main>
      <Foot />
    </>
  );
}
