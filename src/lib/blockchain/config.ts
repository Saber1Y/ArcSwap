export const ARC_CONFIG = {
  chainId: 54286,
  chainName: "Arc Testnet",
  rpcUrl:
    process.env.NEXT_PUBLIC_ARC_RPC_URL ||
    "https://rpc.testnet.arc.network",
  blockExplorer: "https://testnet.arcscan.app",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
};

export const TOKEN_ADDRESSES = {
  USDC: "0x3600000000000000000000000000000000000000", // Native USDC
  EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  USYC: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
  ETH: "0x0000000000000000000000000000000000000000", // Placeholder for ETH
};
export type SupportedToken = keyof typeof TOKEN_ADDRESSES;

// Legacy export for backward compatibility
export const SOMNIA_CONFIG = ARC_CONFIG;
// ERC20 ABI for token transfers
export const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];
