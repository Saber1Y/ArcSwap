import { ethers } from "ethers";
import { ARC_CONFIG, ERC20_ABI, TOKEN_ADDRESSES } from "./config";
import { FXEngine } from "./fx";
import { YieldManager } from "./yield";

export class BlockchainClient {
  private provider: ethers.JsonRpcProvider;
  private fxEngine: FXEngine;
  private yieldManager: YieldManager;

  private static providerInstance: ethers.JsonRpcProvider | null = null;
  private static fxEngineInstance: FXEngine | null = null;
  private static yieldManagerInstance: YieldManager | null = null;

  constructor() {
    // Use singleton pattern to avoid circular dependencies
    if (!BlockchainClient.providerInstance) {
      const rpcUrl = ARC_CONFIG.rpcUrl || "https://rpc.testnet.arc.network";
      
      try {
        BlockchainClient.providerInstance = new ethers.JsonRpcProvider(rpcUrl, {
          chainId: ARC_CONFIG.chainId,
          name: ARC_CONFIG.chainName,
        });
      } catch (error) {
        console.error("Failed to initialize provider:", error);
        BlockchainClient.providerInstance = new ethers.JsonRpcProvider(rpcUrl);
      }
    }
    
    this.provider = BlockchainClient.providerInstance;

    // Initialize engines without creating new BlockchainClient instances
    if (!BlockchainClient.fxEngineInstance) {
      BlockchainClient.fxEngineInstance = new FXEngine();
    }
    if (!BlockchainClient.yieldManagerInstance) {
      BlockchainClient.yieldManagerInstance = new YieldManager();
    }
    
    this.fxEngine = BlockchainClient.fxEngineInstance;
    this.yieldManager = BlockchainClient.yieldManagerInstance;
  }

  getProvider() {
    return this.provider;
  }

  async getTokenContract(tokenAddress: string) {
    return new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
  }

  async getBalance(address: string, tokenAddress?: string): Promise<string> {
    try {
      if (!tokenAddress || tokenAddress === TOKEN_ADDRESSES.USDC || tokenAddress === TOKEN_ADDRESSES.ETH) {
        // Get native balance (USDC on Arc)
        const balance = await Promise.race([
          this.provider.getBalance(address),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("RPC timeout")), 10000)
          )
        ]) as bigint;
        return ethers.formatEther(balance);
      }

      if (tokenAddress && (
        tokenAddress.toLowerCase() === TOKEN_ADDRESSES.EURC.toLowerCase() ||
        tokenAddress.toLowerCase() === TOKEN_ADDRESSES.USYC.toLowerCase()
      )) {
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
        const [balance, decimals] = await Promise.race([
          Promise.all([contract.balanceOf(address), contract.decimals()]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("RPC timeout")), 10000)
          )
        ]) as [bigint, number];
        return ethers.formatUnits(balance, decimals);
      }

      throw new Error("Unsupported token");
    } catch (error) {
      console.error("Error getting balance:", error);
      throw error;
    }
  }

  async estimateGas(
    from: string,
    to: string,
    amount: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      if (
        !tokenAddress ||
        tokenAddress === TOKEN_ADDRESSES.USDC ||
        tokenAddress === TOKEN_ADDRESSES.ETH
      ) {
        // Native token transfer (USDC on Arc)
        const amountWei = ethers.parseEther(amount);
        const gasEstimate = await Promise.race([
          this.provider.estimateGas({ from, to, value: amountWei }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("RPC timeout")), 10000)
          )
        ]) as bigint;

        const feeData = await Promise.race([
          this.provider.getFeeData(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("RPC timeout")), 10000)
          )
        ]) as ethers.FeeData;
        
        const pricePerGas = feeData.gasPrice ?? feeData.maxFeePerGas ?? BigInt(0);
        const totalCostWei = gasEstimate * pricePerGas;
        return ethers.formatEther(totalCostWei);
      } else if (
        tokenAddress &&
        (tokenAddress.toLowerCase() === TOKEN_ADDRESSES.EURC.toLowerCase() ||
          tokenAddress.toLowerCase() === TOKEN_ADDRESSES.USYC.toLowerCase())
      ) {
        // ERC20 token transfer
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
        const decimals = await contract.decimals();
        const amountWei = ethers.parseUnits(amount, decimals);

        const gasEstimate = await Promise.race([
          contract.transfer.estimateGas(to, amountWei),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("RPC timeout")), 10000)
          )
        ]) as bigint;

        const feeData = await Promise.race([
          this.provider.getFeeData(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("RPC timeout")), 10000)
          )
        ]) as ethers.FeeData;
        
        const pricePerGas = feeData.gasPrice ?? feeData.maxFeePerGas ?? BigInt(0);
        const totalCostWei = gasEstimate * pricePerGas;
        return ethers.formatEther(totalCostWei);
      }

      throw new Error("Unsupported token for gas estimation");
    } catch (error) {
      console.error("Error estimating gas:", error);
      return "0.015"; // Fallback estimate for Arc network
    }
  }

  async getTransactionStatus(txHash: string): Promise<{
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
  }> {
    try {
      const receipt = await Promise.race([
        this.provider.getTransactionReceipt(txHash),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("RPC timeout")), 10000)
        )
      ]);

      if (!receipt) {
        return { status: "pending", confirmations: 0 };
      }

      const currentBlock = await Promise.race([
        this.provider.getBlockNumber(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("RPC timeout")), 10000)
        )
      ]);
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        status: receipt.status === 1 ? "confirmed" : "failed",
        confirmations,
      };
    } catch (error) {
      console.error("Error getting transaction status:", error);
      return { status: "pending", confirmations: 0 };
    }
  }

  async resolveAddress(nameOrAddress: string): Promise<string | null> {
    try {
      // Check if it's already an address
      if (ethers.isAddress(nameOrAddress)) {
        return nameOrAddress;
      }

      // For ENS names or other resolvable domains
      try {
        const resolvedAddress = await Promise.race([
          this.provider.resolveName(nameOrAddress),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Resolution timeout")), 10000)
          )
        ]);
        if (resolvedAddress && ethers.isAddress(resolvedAddress)) {
          return resolvedAddress;
        }
      } catch (resolutionError) {
        console.log("Name resolution failed:", resolutionError);
      }

      // If not resolvable, return null
      return null;
    } catch (error) {
      console.error("Error resolving address:", error);
      return null;
    }
  }

  /**
   * Get FX engine for currency conversions
   */
  getFXEngine(): FXEngine {
    return this.fxEngine;
  }

  /**
   * Get yield manager for USYC operations
   */
  getYieldManager(): YieldManager {
    return this.yieldManager;
  }

  /**
   * Execute currency conversion
   */
  async executeConversion(
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress: string
  ) {
    return this.fxEngine.executeSwap(fromToken, toToken, amount, userAddress);
  }

  /**
   * Get FX quote
   */
  async getFXQuote(fromToken: string, toToken: string, amount: string) {
    if (fromToken === "EURC" && toToken === "USDC") {
      return this.fxEngine.quoteEURCtoUSDC(amount);
    } else if (fromToken === "USDC" && toToken === "EURC") {
      return this.fxEngine.quoteUSDCtoEURC(amount);
    } else {
      throw new Error(`Unsupported FX pair: ${fromToken} → ${toToken}`);
    }
  }

  /**
   * Deposit to yield (USDC → USYC)
   */
  async depositToYield(amount: string, userAddress: string) {
    return this.yieldManager.depositToUSYC(amount, userAddress);
  }

  /**
   * Withdraw from yield (USYC → USDC)
   */
  async withdrawFromYield(amount: string, userAddress: string) {
    return this.yieldManager.withdrawFromUSYC(amount, userAddress);
  }

  /**
   * Get yield information
   */
  async getYieldInfo(userAddress: string) {
    return this.yieldManager.getYieldInfo(userAddress);
  }

  /**
   * Get current APY
   */
  async getCurrentAPY(): Promise<number> {
    return this.yieldManager.getCurrentAPY();
  }

  /**
   * Get all token balances for a user
   */
  async getAllBalances(address: string): Promise<{ [key: string]: string }> {
    try {
      const balances: { [key: string]: string } = {};

      // Get USDC balance (native)
      balances.USDC = await this.getBalance(address);

      // Get EURC balance
      balances.EURC = await this.getBalance(address, TOKEN_ADDRESSES.EURC);

      // Get USYC balance
      balances.USYC = await this.getBalance(address, TOKEN_ADDRESSES.USYC);

      return balances;
    } catch (error) {
      console.error("Error getting all balances:", error);
      throw error;
    }
  }

  /**
   * Get gas estimate in USD (for better user understanding)
   */
  async estimateGasUSD(
    from: string,
    to: string,
    amount: string,
    tokenAddress?: string
  ): Promise<string> {
    const gasInUSDC = await this.estimateGas(from, to, amount, tokenAddress);
    // USDC is pegged 1:1 to USD, so the value is the same
    return gasInUSDC;
  }
}
