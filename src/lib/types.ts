export interface ArcIntent {
  action: "send" | "pay" | "transfer" | "convert" | "deposit" | "withdraw" | "swap" | "balance";
  amount: string;
  fromCurrency?: "USD" | "EUR" | "USDC" | "EURC" | "USYC";
  toCurrency?: "USD" | "EUR" | "USDC" | "EURC" | "USYC";
  recipient?: string;
  confidence: number;
}

export interface ParsedIntent {
  action: "transfer" | "send" | "pay" | "balance" | "check" | "balance_check" | "convert" | "deposit" | "withdraw" | "swap";
  amount: string;
  token: string;
  recipient: string;
  confidence: number;
  fromCurrency?: string;
  toCurrency?: string;
}
  
  export interface TransactionRequest {
    from: string;
    to: string;
    amount: string;
    tokenAddress: string;
  }
  
  export interface TransactionResult {
    success: boolean;
    txHash?: string;
    error?: string;
    gasUsed?: string;
  }
  
  export interface ENSResolution {
    address: string | null;
    name: string;
}
  