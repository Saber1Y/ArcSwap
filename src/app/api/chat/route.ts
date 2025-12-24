import { NextRequest, NextResponse } from "next/server";
import { BlockchainClient } from "@/lib/blockchain/client";
import { TOKEN_ADDRESSES } from "@/lib/blockchain/config";

export async function POST(req: NextRequest) {
  try {
    const { message, senderAddress } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!senderAddress) {
      return NextResponse.json(
        { error: "Please provide a sender address" },
        { status: 400 }
      );
    }

    const blockchain = new BlockchainClient();
    const lowerMessage = message.toLowerCase();
    let response = "";
    let intent = null;
    let actionResult = null;

    // Parse send/pay/transfer commands
    if (
      lowerMessage.includes("send") ||
      lowerMessage.includes("pay") ||
      lowerMessage.includes("transfer")
    ) {
      const amountMatch = message.match(/\$(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:dollars?|usdc?)/i);
      const recipientMatch = message.match(/to\s+(0x[a-fA-F0-9]+|\w+)/i);

      if (amountMatch && recipientMatch) {
        const amount = amountMatch[1] || amountMatch[2];
        const recipient = recipientMatch[1];
        const token =
          message.includes("€") || message.includes("eur") ? "EURC" : "USDC";

        intent = {
          action: "send",
          amount,
          token,
          recipient,
          confidence: 0.9,
        };

        // Resolve recipient address
        const resolvedRecipient = await blockchain.resolveAddress(recipient);
        
        if (!resolvedRecipient) {
          response = `Could not resolve recipient "${recipient}". Please provide a valid address or name.`;
          actionResult = { error: "Invalid recipient" };
        } else {
          // Get gas estimate
          const tokenAddress = token === "USDC" ? undefined : TOKEN_ADDRESSES[token as keyof typeof TOKEN_ADDRESSES];
          const gasEstimate = await blockchain.estimateGas(senderAddress, resolvedRecipient, amount, tokenAddress);

          response = `You're sending ${amount} ${token} to ${resolvedRecipient}.
Estimated gas: ${gasEstimate} USDC.
Would you like me to prepare the transaction?`;

          actionResult = {
            recipient: resolvedRecipient,
            gasEstimate,
            amount,
            token,
          };
        }
      } else {
        response = "I couldn't understand that. Try: 'Send $50 to Alice'";
      }
    }
    // Parse balance commands
    else if (
      lowerMessage.includes("balance") ||
      lowerMessage.includes("check")
    ) {
      const token = message.includes("eur")
        ? "EURC"
        : message.includes("u syc")
        ? "USYC"
        : "USDC";

      intent = {
        action: "balance",
        amount: "0",
        token,
        recipient: "",
        confidence: 0.9,
      };

      try {
        const tokenAddress = token === "USDC" ? undefined : TOKEN_ADDRESSES[token as keyof typeof TOKEN_ADDRESSES];
        const balance = await blockchain.getBalance(senderAddress, tokenAddress);

        response = `Your current ${token} balance is ${balance}${
          token === "USYC" ? " (earning 5% APY)" : ""
        }.`;

        actionResult = { balance, token };
} catch (error) {
          console.error("Balance fetch error:", error);
          response = `Failed to fetch ${token} balance. Please try again.`;
          actionResult = { error: "Balance fetch failed" };
        }
    }
    // Parse convert/swap commands
    else if (
      lowerMessage.includes("convert") ||
      lowerMessage.includes("swap")
    ) {
      const fromTokenMatch = message.match(/(\d+)\s*(?:usdc?|eurc?)/i);
      const toTokenMatch = message.match(/to\s+(?:usdc?|eurc?)/i);

      if (fromTokenMatch && toTokenMatch) {
        const amount = fromTokenMatch[1];
        const fromToken = message.includes("eurc") ? "EURC" : "USDC";
        const toToken = message.includes("to eurc") ? "EURC" : "USDC";

        try {
          const fxQuote = await blockchain.getFXQuote(fromToken, toToken, amount);
          const rate = (parseFloat(fxQuote.expectedAmount) / parseFloat(amount)).toFixed(4);
          
          response = `Converting ${amount} ${fromToken} to ${fxQuote.expectedAmount} ${toToken}.
Rate: 1 ${fromToken} = ${rate} ${toToken}
Price impact: ${(fxQuote.priceImpact * 100).toFixed(2)}%
Would you like me to prepare this conversion?`;

          actionResult = {
            fromToken,
            toToken,
            inputAmount: amount,
            outputAmount: fxQuote.expectedAmount,
            rate,
            priceImpact: fxQuote.priceImpact,
            gasEstimate: fxQuote.gasEstimate,
          };
        } catch (error) {
          console.error("FX conversion error:", error);
          response = `Currency conversion failed. Please try again.`;
          actionResult = { error: "FX conversion failed" };
        }
      } else {
        response = `I can help you convert between USDC and EURC.
Try: "Convert 100 USDC to EURC"`;
      }
    }
    // Parse deposit/withdraw commands
    else if (
      lowerMessage.includes("deposit") ||
      lowerMessage.includes("withdraw") ||
      lowerMessage.includes("savings")
    ) {
      const amountMatch = message.match(/(\d+)\s*(?:usdc?)/i);
      const isDeposit = lowerMessage.includes("deposit") || lowerMessage.includes("savings");

      if (amountMatch) {
        const amount = amountMatch[1];
        
        try {
          if (isDeposit) {
            // Deposit USDC to USYC (yield)
            const result = await blockchain.depositToYield(amount, senderAddress);
            const currentAPY = await blockchain.getCurrentAPY();
            
response = `Depositing ${amount} USDC to yield.
Transaction hash: ${result.hash}
You'll earn ${currentAPY}% APY on your deposit.
Would you like me to prepare this deposit?`;

          actionResult = {
            action: "deposit",
            inputAmount: amount,
            outputAmount: amount,
            apy: currentAPY,
            txHash: result.hash,
            gasUsed: result.gasUsed,
          };
          } else {
            // Withdraw USYC to USDC
            const result = await blockchain.withdrawFromYield(amount, senderAddress);
            
response = `Withdrawing ${amount} USYC from yield.
Transaction hash: ${result.hash}
Yield earned: ${result.yieldEarned} USDC
Would you like me to prepare this withdrawal?`;

          actionResult = {
            action: "withdraw",
            inputAmount: amount,
            outputAmount: amount,
            yieldEarned: result.yieldEarned,
            txHash: result.hash,
            gasUsed: result.gasUsed,
          };
          }
        } catch (error) {
          console.error("Yield operation error:", error);
          response = `Yield operation failed. Please try again.`;
          actionResult = { error: "Yield operation failed" };
        }
      } else {
        response = `I can help you with yield operations.
Try: "Deposit 100 USDC to savings" or "Withdraw 50 USYC"`;
      }
    }
    // Fallback response
    else {
      response = `I can help you with IntentArc commands like:
• "Send $50 to Alice" 
• "Check USDC balance"
• "Convert 100 USDC to EURC"
• "Deposit 100 USDC to savings"

Try one of these commands!`;
    }

    return NextResponse.json({
      success: true,
      message: "AI Response",
      response,
      intent,
      actionResult,
    });
  } catch (error) {
    console.error("Error in chat:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
