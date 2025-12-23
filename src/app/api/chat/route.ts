import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, context, senderAddress } = await req.json();

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

    // Simple intent parsing for multi-currency support
    const lowerMessage = message.toLowerCase();
    let response = "";
    let intent = null;
    let actionResult = null;

    // Parse send/pay/transfer commands
    if (lowerMessage.includes("send") || lowerMessage.includes("pay") || lowerMessage.includes("transfer")) {
      const amountMatch = message.match(/\$(\d+)|(\d+)\s*(?:dollars?|usdc?)/i);
      const recipientMatch = message.match(/to\s+(\w+)/i);
      
      if (amountMatch && recipientMatch) {
        const amount = amountMatch[1] || amountMatch[2];
        const recipient = recipientMatch[1];
        const token = message.includes("€") || message.includes("eur") ? "EURC" : "USDC";
        
        intent = {
          action: "send",
          amount,
          token,
          recipient,
          confidence: 0.9
        };

        // Mock recipient resolution for demo
        let resolvedRecipient = recipient;
        if (recipient.toLowerCase().includes("alice")) {
          resolvedRecipient = "0x742d35Cc6634C0532925a3b8D4c9db96C4b4Db6";
        }
        
        response = `You're sending ${amount} ${token} to ${resolvedRecipient}.
Estimated gas: $0.015 USDC.
Would you like me to prepare the transaction?`;
        
        actionResult = {
          recipient: resolvedRecipient,
          gasEstimate: "0.015",
          amount,
          token
        };
      } else {
        response = "I couldn't understand that. Try: 'Send $50 to Alice'";
      }
    }
    // Parse balance commands
    else if (lowerMessage.includes("balance") || lowerMessage.includes("check")) {
      const token = message.includes("eur") ? "EURC" : 
                    message.includes("u syc") ? "USYC" : "USDC";
      
      intent = {
        action: "balance",
        amount: "0",
        token,
        recipient: "",
        confidence: 0.9
      };

      // Mock realistic balances for demonstration
      const mockBalances = {
        USDC: "1000.50",
        EURC: "850.25", 
        USYC: "500.75"
      };

      response = `Your current ${token} balance is ${mockBalances[token]}${token === "USYC" ? " (earning 5% APY)" : ""}.`;
      
      actionResult = { balance: mockBalances[token], token };
    }
    // Parse convert/swap commands
    else if (lowerMessage.includes("convert") || lowerMessage.includes("swap")) {
      response = `Currency conversion is coming soon! 
Currently you can send USDC, EURC, or USYC directly.
FX rates will be available in the next version.`;
      
      actionResult = { error: "FX feature coming soon" };
    }
    // Parse deposit/withdraw commands  
    else if (lowerMessage.includes("deposit") || lowerMessage.includes("withdraw") || lowerMessage.includes("savings")) {
      response = `Yield operations are coming soon!
You'll be able to earn ~5% APY on USDC deposits.
For now, you can send USDC, EURC, or USYC directly.`;
      
      actionResult = { error: "Yield feature coming soon" };
    }
    // Fallback response
    else {
      response = `I can help you with IntentArc commands like:
• "Send $50 to Alice" 
• "Check USDC balance"
• "Convert euros to dollars" (coming soon)
• "Put money in savings" (coming soon)

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