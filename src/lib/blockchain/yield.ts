import { BlockchainClient } from "./client";
import { TOKEN_ADDRESSES } from "./config";
import { ethers } from "ethers";

export interface YieldInfo {
  currentAPY: number;
  totalDeposited: string;
  accruedYield: string;
  depositDate: string;
}

export interface DepositTransaction {
  hash: string;
  amount: string;
  status: "pending" | "completed" | "failed";
  timestamp: string;
  gasUsed: string;
}

export interface WithdrawTransaction {
  hash: string;
  amount: string;
  status: "pending" | "completed" | "failed";
  timestamp: string;
  gasUsed: string;
  yieldEarned: string;
}

// USYC Contract ABI (mock example)
const USYC_ABI = [
  "function deposit(uint256 amount) returns (bool)",
  "function redeem(uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function getAPY() view returns (uint256)",
  "function getYieldEarned(address account) view returns (uint256)"
];

export class YieldManager {
  private blockchain: BlockchainClient | null = null;
  private usycContract: ethers.Contract | null = null;

  constructor() {
    // Don't initialize in constructor to avoid circular dependency
    // Initialize lazily when needed
  }

  private getBlockchain(): BlockchainClient {
    if (!this.blockchain) {
      this.blockchain = new BlockchainClient();
    }
    return this.blockchain;
  }

  private initializeContract() {
    if (!this.usycContract && this.blockchain) {
      try {
        this.usycContract = new ethers.Contract(
          TOKEN_ADDRESSES.USYC,
          USYC_ABI,
          this.blockchain.getProvider()
        );
      } catch (error) {
        console.error("Failed to initialize USYC contract:", error);
      }
    }
  }

  /**
   * Deposit USDC into USYC (yield-bearing USDC)
   */
  async depositToUSYC(
    amount: string,
    userAddress: string
  ): Promise<DepositTransaction> {
    try {
      this.initializeContract();
      if (!this.usycContract) {
        throw new Error("USYC contract not initialized");
      }

      // Get gas estimate
      const gasEstimate = await this.estimateDepositGas();
      
      // In reality, this would approve USDC spending first, then call deposit
      // For Arc testnet, we'll simulate the transaction
      
      // Mock transaction hash
      const timestamp = Date.now();
      const txHash = `0x${timestamp.toString(16)}${Math.random().toString(16).substr(2, 8)}`;

      return {
        hash: txHash,
        amount,
        status: "completed",
        timestamp: new Date(timestamp).toISOString(),
        gasUsed: gasEstimate
      };
    } catch (error) {
      console.error("Error depositing to USYC:", error);
      throw new Error("Failed to deposit USDC to USYC");
    }
  }

  /**
   * Withdraw USDC from USYC
   */
  async withdrawFromUSYC(
    amount: string,
    userAddress: string
  ): Promise<WithdrawTransaction> {
    try {
      this.initializeContract();
      if (!this.usycContract) {
        throw new Error("USYC contract not initialized");
      }

      // Calculate yield earned (based on holding period and APY)
      const yieldEarned = await this.calculateYieldEarned(userAddress, amount);
      
      // Get gas estimate
      const gasEstimate = await this.estimateWithdrawGas();
      
      // Mock transaction
      const timestamp = Date.now();
      const txHash = `0x${timestamp.toString(16)}${Math.random().toString(16).substr(2, 8)}`;

      return {
        hash: txHash,
        amount,
        status: "completed",
        timestamp: new Date(timestamp).toISOString(),
        gasUsed: gasEstimate,
        yieldEarned
      };
    } catch (error) {
      console.error("Error withdrawing from USYC:", error);
      throw new Error("Failed to withdraw USDC from USYC");
    }
  }

  /**
   * Get yield information for a user
   */
  async getYieldInfo(userAddress: string): Promise<YieldInfo> {
    try {
      this.initializeContract();
      if (!this.usycContract) {
        // Return mock data if contract not available
        return {
          currentAPY: 5.0,
          totalDeposited: "0.000000",
          accruedYield: "0.000000",
          depositDate: new Date().toISOString()
        };
      }

      // In reality, would query USYC contract for:
      // - Total deposited amount
      // - Current balance
      // - Yield earned
      // - Deposit timestamp
      
      const currentBalance = await this.usycContract.balanceOf(userAddress);
      const formattedBalance = ethers.formatEther(currentBalance);
      
      const totalDeposited = formattedBalance; // Simplified for demo
      const accruedYield = (parseFloat(totalDeposited) * 0.05 * 0.1).toFixed(6); // Mock 10% of deposit as yield
      
      return {
        currentAPY: 5.0,
        totalDeposited,
        accruedYield,
        depositDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      };
    } catch (error) {
      console.error("Error getting yield info:", error);
      throw new Error("Failed to get yield information");
    }
  }

  /**
   * Get current USYC APY from contract
   */
  async getCurrentAPY(): Promise<number> {
    try {
      this.initializeContract();
      if (!this.usycContract) {
        return 5.0; // Fallback APY
      }

      // In reality, would call getAPY() on USYC contract
      const apy = await this.usycContract.getAPY();
      return parseFloat(ethers.formatEther(apy)) * 100; // Convert from wei to percentage
    } catch (error) {
      console.error("Error getting current APY:", error);
      return 5.0; // Fallback APY
    }
  }

  /**
   * Calculate yield earned for withdrawal
   */
  private async calculateYieldEarned(userAddress: string, amount: string): Promise<string> {
    try {
      // Mock calculation - in reality would query contract for actual yield
      const annualYield = parseFloat(amount) * 0.05; // 5% APY
      const dailyYield = annualYield / 365;
      const daysHeld = 30; // Mock average holding period
      return (dailyYield * daysHeld).toFixed(6);
    } catch (error) {
      console.error("Error calculating yield:", error);
      return "0.000000";
    }
  }

  /**
   * Estimate gas for deposit transaction
   */
  private async estimateDepositGas(): Promise<string> {
    try {
      // Arc has stable gas fees of $0.015 USDC
      return "0.015";
    } catch (error) {
      console.error("Error estimating deposit gas:", error);
      return "0.015";
    }
  }

  /**
   * Estimate gas for withdrawal transaction
   */
  private async estimateWithdrawGas(): Promise<string> {
    try {
      // Arc has stable gas fees of $0.015 USDC
      return "0.015";
    } catch (error) {
      console.error("Error estimating withdrawal gas:", error);
      return "0.015";
    }
  }

  /**
   * Check if user has sufficient USDC balance for deposit
   */
  async hasSufficientUSDC(userAddress: string, amount: string): Promise<boolean> {
    try {
      const blockchain = this.getBlockchain();
      const balance = await blockchain.getBalance(
        userAddress,
        undefined // USDC is native token
      );
      return parseFloat(balance) >= parseFloat(amount);
    } catch (error) {
      console.error("Error checking USDC balance:", error);
      return false;
    }
  }

  /**
   * Check if user has sufficient USYC balance for withdrawal
   */
  async hasSufficientUSYC(userAddress: string, amount: string): Promise<boolean> {
    try {
      const blockchain = this.getBlockchain();
      const balance = await blockchain.getBalance(
        userAddress,
        TOKEN_ADDRESSES.USYC
      );
      return parseFloat(balance) >= parseFloat(amount);
    } catch (error) {
      console.error("Error checking USYC balance:", error);
      return false;
    }
  }
}