import { GoogleGenerativeAI } from "@google/generative-ai";
import { ParsedIntent } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";
const hasApiKey = !!apiKey;
const genAI = new GoogleGenerativeAI(apiKey || "dummy");

export class GeminiParser {
  private model: ReturnType<typeof genAI.getGenerativeModel> | null = null;

  constructor() {
    if (!hasApiKey) {
      console.warn('No Gemini API key found in environment variables');
      return;
    }
    try {
      this.model = genAI.getGenerativeModel({
        model: "gemini-robotics-er-1.5-preview",
      });
      console.info('Gemini AI model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini AI model:', error);
    }
  }

  private regexFallback(userMessage: string): ParsedIntent | null {
    const text = userMessage.trim();
    
    // Enhanced patterns for Arc multi-currency support
    const patterns: RegExp[] = [
      // Send/transfer patterns
      /\b(send|transfer)\s+\$?(\d+(?:\.\d+)?)\s*(?:USD|USDC|dollars)?\s*to\s+(.+)/i,
      /\b(send|transfer)\s+€?(\d+(?:\.\d+)?)\s*(?:EUR|EURC|euros)?\s*to\s+(.+)/i,
      /\b(send|transfer)\s+(\d+(?:\.\d+)?)\s*(USDC|EURC|USYC)?\s*to\s+(.+)/i,
      /\bpay\s+(.+?)\s+\$?(\d+(?:\.\d+)?)\s*(?:USD|USDC|dollars)?/i,
      /\bpay\s+(.+?)\s+€?(\d+(?:\.\d+)?)\s*(?:EUR|EURC|euros)?/i,
      /\bpay\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(USDC|EURC|USYC)?/i,
      
      // Convert/Swap patterns
      /\b(convert|exchange|swap)\s+(?:€?(\d+(?:\.\d+)?)\s*(?:EUR|EURC|euros)?)?\s*to\s+(?:USD|USDC|dollars)/i,
      /\b(convert|exchange|swap)\s+(?:\$?(\d+(?:\.\d+)?)\s*(?:USD|USDC|dollars)?)?\s*to\s+(?:EUR|EURC|euros)/i,
      /\b(convert|exchange|swap)\s+(\d+(?:\.\d+)?)\s*(USDC|EURC|USYC)\s+to\s+(USDC|EURC|USYC)/i,
      
      // Deposit/Withdraw patterns
      /\b(deposit|put)\s+\$?(\d+(?:\.\d+)?)\s*(?:USD|USDC|dollars)?\s+(?:into|to)\s+savings/i,
      /\b(withdraw|move)\s+(\d+(?:\.\d+)?)\s*(USYC)\s+(?:from|out of)\s+savings/i,
      /\b(withdraw|move)\s+(\d+(?:\.\d+)?)\s*USYC\s+to\s+checking/i,
      
      // Balance patterns
      /\b(?:check|show|what(?:'|)s|what is)\s+(?:my\s+)?balance\b(?:\s+in\s+?(USD|EUR|USDC|EURC|USYC|dollars|euros))?/i,
      /\b(?:check|show|what(?:'|)s|what is)\s+(?:my\s+)?(USD|EUR|USDC|EURC|USYC)\s+balance\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;

      // Payment patterns
      if (/pay/i.test(pattern.source)) {
        const recipient = match[1];
        const amount = match[2];
        let token = match[3]?.toUpperCase() || "USDC";
        
        // Map currency aliases to token symbols
        if (text.includes("$") || text.includes("USD") || text.includes("dollars")) token = "USDC";
        if (text.includes("€") || text.includes("EUR") || text.includes("euros")) token = "EURC";
        
        return { action: "pay", amount, token, recipient, confidence: 0.9 };
      }

      // Send/Transfer patterns
      if (/send|transfer/.test(pattern.source)) {
        const action = match[1].toLowerCase() as ParsedIntent["action"];
        const amount = match[2];
        let token = match[4]?.toUpperCase() || "USDC";
        
        // Map currency aliases to token symbols
        if (text.includes("$") || text.includes("USD") || text.includes("dollars")) token = "USDC";
        if (text.includes("€") || text.includes("EUR") || text.includes("euros")) token = "EURC";
        
        const recipient = match[3] || match[4];
        return { action, amount, token, recipient, confidence: 0.9 };
      }

      // Convert/Swap patterns
      if (/convert|exchange|swap/.test(pattern.source)) {
        const amount = match[1] || match[2] || match[3] || "0";
        let fromCurrency = "USDC";
        let toCurrency = "USDC";
        
        if (text.includes("EUR") || text.includes("€") || text.includes("euros")) {
          fromCurrency = text.includes("to USD") ? "EURC" : "USDC";
          toCurrency = text.includes("to USD") ? "USDC" : "EURC";
        }
        
        return { 
          action: "convert", 
          amount, 
          token: fromCurrency,
          fromCurrency,
          toCurrency,
          recipient: "",
          confidence: 0.9 
        };
      }

      // Deposit patterns
      if (/deposit|put/.test(pattern.source)) {
        const amount = match[2];
        return { 
          action: "deposit", 
          amount, 
          token: "USDC",
          fromCurrency: "USDC",
          toCurrency: "USYC",
          recipient: "",
          confidence: 0.9 
        };
      }

      // Withdraw patterns
      if (/withdraw|move/.test(pattern.source)) {
        const amount = match[2];
        return { 
          action: "withdraw", 
          amount, 
          token: "USYC",
          fromCurrency: "USYC",
          toCurrency: "USDC",
          recipient: "",
          confidence: 0.9 
        };
      }

      // Balance patterns
      if (/balance/.test(pattern.source)) {
        let token = "USDC";
        const currencyKeyword = match[1]?.toLowerCase();
        
        if (currencyKeyword?.includes("eur") || text.includes("€")) token = "EURC";
        if (currencyKeyword?.includes("usyc")) token = "USYC";
        
        return {
          action: "balance",
          amount: "0",
          token,
          recipient: "",
          confidence: 0.9,
        };
      }
    }
    return null;
  }

  async parseIntent(userMessage: string): Promise<ParsedIntent | null> {
    if (!hasApiKey || !this.model) {
      return this.regexFallback(userMessage);
    }
    try {
      const prompt = `
  You are an IntentArc transaction parser for multi-currency DeFi operations. Parse the following message and extract transaction details.
  
  User message: "${userMessage}"
  
  Extract the following information:
  1. Action type (send/pay/transfer/convert/deposit/withdraw/swap/balance)
  2. Amount (numeric value)
  3. Token symbol (default to USDC if not specified)
  4. Recipient (wallet address or name, optional for balance/convert/deposit/withdraw)
  5. fromCurrency (source currency: USD/EUR/USDC/EURC/USYC)
  6. toCurrency (target currency: USD/EUR/USDC/EURC/USYC, for convert/deposit/withdraw)
  
  Currency mappings:
  - $, USD, dollars → USDC
  - €, EUR, euros → EURC  
  - savings, yield, invest → USYC
  - checking, spend → USDC
  
  Return ONLY a JSON object in this exact format:
  {
    "action": "send",
    "amount": "50",
    "token": "USDC",
    "recipient": "Alice",
    "fromCurrency": "USDC",
    "toCurrency": null,
    "confidence": 0.95
  }
  
  Examples:
  - "Send $50 to Alice" → {"action": "send", "amount": "50", "token": "USDC", "recipient": "Alice", "fromCurrency": "USDC", "toCurrency": null}
  - "Pay Bob 100 euros" → {"action": "pay", "amount": "100", "token": "EURC", "recipient": "Bob", "fromCurrency": "EURC", "toCurrency": null}
  - "Convert euros to dollars" → {"action": "convert", "amount": "0", "token": "EURC", "recipient": "", "fromCurrency": "EURC", "toCurrency": "USDC"}
  - "Put 1000 USDC into savings" → {"action": "deposit", "amount": "1000", "token": "USDC", "recipient": "", "fromCurrency": "USDC", "toCurrency": "USYC"}
  - "Move 500 USYC to checking" → {"action": "withdraw", "amount": "500", "token": "USYC", "recipient": "", "fromCurrency": "USYC", "toCurrency": "USDC"}
  - "Show my balance in dollars" → {"action": "balance", "amount": "0", "token": "USDC", "recipient": "", "fromCurrency": "USDC", "toCurrency": null}
  
  If you cannot parse the intent with confidence above 0.7, return:
  {
    "action": null,
    "amount": null,
    "token": null,
    "recipient": null,
    "fromCurrency": null,
    "toCurrency": null,
    "confidence": 0.0
  }
  
  Rules:
  - Amount must be a positive number
  - Token must be one of: USDC, EURC, USYC (default to USDC)
  - fromCurrency/toCurrency must be one of: USD, EUR, USDC, EURC, USYC
  - Recipient can be a name or wallet address
  - Confidence should be 0.0 to 1.0
  - Return ONLY the JSON, no markdown formatting
  - Set confidence to 0.0 if requirements aren't met
  `;

      const result = await this.model.generateContent(prompt);
      const text = (await result.response).text();
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (
        parsed.confidence < 0.7 ||
        !parsed.action ||
        !parsed.amount ||
        !parsed.recipient
      ) {
        return null;
      }
      return parsed;
    } catch (error) {
      console.error("Error parsing intent with Gemini, using fallback:", error);
      return this.regexFallback(userMessage);
    }
  }

  async generateResponse(
    context: string,
    userMessage: string,
    senderAddress: string
  ): Promise<string> {
    if (!hasApiKey || !this.model) {
      console.warn('Gemini AI not initialized:', { hasApiKey, hasModel: !!this.model });
      // Simple fallback text
      return `You said: "${userMessage}". I can help send tokens, check balances, and perform FX and yield operations. (Note: AI features are currently limited)`;
    }
    try {
      const prompt = `You are IntentSwap AI agent, a friendly blockchain transaction assistant. 

Context: ${context}
User message: "${userMessage}"
The current user's wallet address is: ${senderAddress ?? "Unknown"}.

Generate a helpful, concise response. Do not lie. If you can't do it just be staright forward with your answers. Keep it conversational and friendly. 
If there's an error, explain it clearly and suggest how to fix it.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating response:", error);
      return "I'm having trouble processing that. Please try again.";
    }
  }
}
