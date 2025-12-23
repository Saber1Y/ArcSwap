import { type Chain } from "viem";

// Custom chains for Arc
export const arcTestnet: Chain = {
  id: 54286,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
};

// Legacy export for backward compatibility
export const somniaTestnet = arcTestnet;

export const anvil: Chain = {
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  blockExplorers: {
    default: { name: "Anvil Explorer", url: "" },
  },
  testnet: true,
};

export const supportedChains = [arcTestnet, anvil];

// Privy App ID
export const privyAppId = "cmgupofhs02iel10bh531fkvq";
