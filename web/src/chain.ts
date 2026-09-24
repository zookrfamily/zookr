import type { Chain } from "viem";

/** RH Chain mainnet (EVM 4663). Reads go through /api/rpc so browsers behind a
 *  blocking ISP still work; wallets get the public URL when adding the chain. */
export const robinhoodChain: Chain = {
  id: 4663,
  name: "RH Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["/api/rpc"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
};
