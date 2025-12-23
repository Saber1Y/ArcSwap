"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Menu,
  X,
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { TOKEN_ADDRESSES, ARC_CONFIG } from "@/lib/blockchain/config";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FaMicrophone } from "react-icons/fa6";
import { ethers } from "ethers";

declare global {
  interface Window {
    SpeechRecognition?: typeof Function;
    webkitSpeechRecognition?: typeof Function;
  }
  interface Navigator {
    onLine: boolean;
  }
}

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = Event & {
  readonly error: string;
  readonly message: string;
};

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: Date;
  type?: "normal" | "transaction" | "confirmation" | "error";
  transactionData?: {
    amount: string;
    token: string;
    recipient: string;
    txReciept?: string;
    status?: "pending" | "confirmed" | "failed";
  };
}

interface TransactionConfirmation {
  amount: string;
  token: string;
  recipient: string;
  gasEstimate: string;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
}

export default function ChatPage() {
  const Defaulttoken = "USDC";
  const { authenticated, user } = usePrivy();
  const address = user?.wallet?.address;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<TransactionConfirmation | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recognition, setRecognition] = useState<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [unsupportedBrowser, setUnsupportedBrowser] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize offline state only on client side
  useEffect(() => {
    if (typeof window !== "undefined" && window.navigator) {
      setIsOffline(!navigator.onLine);
    }
  }, []);

  // Generate chat title from first user message
  const generateChatTitle = (firstMessage: string): string => {
    const words = firstMessage.trim().split(" ").slice(0, 4);
    return words.join(" ") + (firstMessage.split(" ").length > 4 ? "..." : "");
  };

  // Save chat sessions to localStorage
  const saveChatSessions = (sessions: ChatSession[]) => {
    try {
      localStorage.setItem(
        "intentarc_chat_sessions",
        JSON.stringify(sessions)
      );
    } catch (error) {
      console.error("Failed to save chat sessions:", error);
    }
  };

  // Load chat sessions from localStorage
  const loadChatSessions = (): ChatSession[] => {
    try {
      const stored = localStorage.getItem("intentarc_chat_sessions");
      if (stored) {
        const sessions = JSON.parse(stored) as Array<{
          id: string;
          title: string;
          timestamp: string;
          messages: Array<{
            id: string;
            sender: "user" | "agent";
            text: string;
            timestamp: string;
            type?: "normal" | "transaction" | "confirmation" | "error";
            transactionData?: {
              amount: string;
              token: string;
              recipient: string;
              txReciept?: string;
              status?: "pending" | "confirmed" | "failed";
            };
          }>;
        }>;

        // Convert timestamp strings back to Date objects
        return sessions.map((session) => ({
          ...session,
          timestamp: new Date(session.timestamp),
          messages: session.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    }
    return [];
  };

  // Create new chat session
  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const welcomeMessage: Message = {
      id: "welcome",
      sender: "agent",
      text: ' Welcome to IntentArc! I can help you send, convert, and earn yield with multi-currency DeFi on Arc network using simple commands. Try saying something like:\n\n• "Send $50 to Alice"\n• "Convert 100 euros to dollars"\n• "Put 1000 USDC into savings"\n• "Show my balance in dollars"',
      timestamp: new Date(),
      type: "normal",
    };

    setMessages([welcomeMessage]);
    setCurrentChatId(newChatId);
    setPendingConfirmation(null);
  };

  // Switch to existing chat
  const switchToChat = (chatId: string) => {
    const session = chatHistory.find((chat) => chat.id === chatId);
    if (session) {
      setMessages(session.messages);
      setCurrentChatId(chatId);
      setPendingConfirmation(null);
    }
  };

  // Delete chat session
  const deleteChat = (chatId: string) => {
    const updatedHistory = chatHistory.filter((chat) => chat.id !== chatId);
    setChatHistory(updatedHistory);
    saveChatSessions(updatedHistory);

    // If we're deleting the current chat, create a new one
    if (chatId === currentChatId) {
      createNewChat();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set initial sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    // Set initial state
    handleResize();

    // Add resize listener
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const loadedSessions = loadChatSessions();
    setChatHistory(loadedSessions);

    // Create new chat if no current chat (only run once on mount)
    if (!currentChatId) {
      createNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Save current chat whenever messages change
  useEffect(() => {
    if (messages.length > 1 && currentChatId) {
      // Only save if there are messages beyond welcome
      const userMessages = messages.filter((msg) => msg.sender === "user");
      if (userMessages.length === 0) return; // Don't save if no user messages

      const title = generateChatTitle(userMessages[0].text);

      setChatHistory((prevHistory) => {
        const updatedHistory = [...prevHistory];
        const existingIndex = updatedHistory.findIndex(
          (chat) => chat.id === currentChatId
        );

        const chatSession: ChatSession = {
          id: currentChatId,
          title,
          timestamp: new Date(),
          messages: messages,
        };

        if (existingIndex >= 0) {
          updatedHistory[existingIndex] = chatSession;
        } else {
          updatedHistory.unshift(chatSession); // Add to beginning
        }

        saveChatSessions(updatedHistory);
        return updatedHistory;
      });
    }
  }, [messages, currentChatId]);

  // Listen for online/offline events
  useEffect(() => {
    // Offline/online event listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function fetchIntentResponse(message: string, context: Message[]) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context, senderAddress: address }),
    });
    const data = await res.json();
    return data;
  }

  async function fetchBalance(address: string, token: string) {
    const res = await fetch("/api/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, token }),
    });
    const data = await res.json();
    return data;
  }

  async function fetchTransaction(txHash: string) {
    const res = await fetch("/api/transaction-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });

    const data = await res.json();
    return data;
  }

  // Helper function to send a real transaction
  async function sendRealTransaction({
    recipient,
    amount,
    token,
  }: TransactionConfirmation) {
    if (!window.ethereum) {
      throw new Error(
        "Ethereum provider not found. Please connect your wallet."
      );
    }

    // Create provider and signer from the user's wallet
    const provider = new ethers.BrowserProvider(
      window.ethereum as unknown as ethers.Eip1193Provider
    );

    // Ensure correct network (Arc Testnet)
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== ARC_CONFIG.chainId) {
      const chainIdHex = "0x" + ARC_CONFIG.chainId.toString(16);
      try {
        const ethProvider = window.ethereum as unknown as {
          request: (args: {
            method: string;
            params?: unknown[];
          }) => Promise<unknown>;
        };
        await ethProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchErr: unknown) {
        if (
          typeof switchErr === "object" &&
          switchErr !== null &&
          (switchErr as { code?: number }).code === 4902
        ) {
          const ethProvider = window.ethereum as unknown as {
            request: (args: {
              method: string;
              params?: unknown[];
            }) => Promise<unknown>;
          };
          await ethProvider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainIdHex,
                chainName: ARC_CONFIG.chainName,
                nativeCurrency: ARC_CONFIG.nativeCurrency,
                rpcUrls: [ARC_CONFIG.rpcUrl],
                blockExplorerUrls: [ARC_CONFIG.blockExplorer],
              },
            ],
          });
        } else {
          throw switchErr;
        }
      }
    }

    const signer = await provider.getSigner();

    // Resolve and validate recipient first
    let to = recipient.trim();
    if (!ethers.isAddress(to)) {
      try {
        const res = await fetch("/api/resolve-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nameOrAddress: to }),
        });
        const data = await res.json();
        if (data?.success && data?.address && ethers.isAddress(data.address)) {
          to = data.address;
        } else {
          throw new Error("Invalid recipient address");
        }
      } catch {
        throw new Error("Could not resolve recipient address");
      }
    }

    // Handle native token (USDC) vs ERC20 token
    if (token === "USDC") {
      // Native token transfer
      const amountWei = ethers.parseEther(amount);
      const tx = await signer.sendTransaction({
        to,
        value: amountWei,
      });
      return tx.hash;
    }

    const tokenAddress = TOKEN_ADDRESSES[token as keyof typeof TOKEN_ADDRESSES];
    if (!tokenAddress) {
      throw new Error(`Token ${token} not supported`);
    }

    // ERC20 ABI for transfer
    const ERC20_ABI = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function decimals() view returns (uint8)",
    ];

    // Create contract instance
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

    // Convert amount to correct decimals
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    // Send transaction and get the hash
    const tx = await contract.transfer(to, amountWei);
    return tx.hash;
  }

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Ensure we have a current chat
    if (!currentChatId) {
      createNewChat();
    }

    addMessage({ sender: "user", text: input });
    const userInput = input;
    setInput("");
    simulateTyping();

    try {
      const response = await fetchIntentResponse(userInput, [...messages]);
      setIsTyping(false);
      // Interpret API response shape
      if (response?.success && response?.intent && response?.actionResult) {
        const data: TransactionConfirmation = {
          amount: response.intent.amount,
          token: response.intent.token || Defaulttoken,
          recipient:
            response.actionResult.recipient || response.intent.recipient,
          gasEstimate: response.actionResult.gasEstimate || "~",
        };

        const userAddress = address || "";
        const token = data.token || Defaulttoken;
        const balanceRes = await fetchBalance(userAddress, token);
        const balanceText =
          balanceRes?.success && balanceRes?.balance
            ? `Your balance: ${balanceRes.balance} ${token}`
            : "Unable to fetch balance.";

        addMessage({
          sender: "agent",
          text: `I understand you want to send ${data.amount} ${data.token} to ${data.recipient}.
${balanceText}
Gas cost: ~$0.015 USDC on Arc network
Please confirm the transaction details below:`,
          type: "confirmation",
        });
        setPendingConfirmation(data);
      } else if (response?.response) {
        addMessage({
          sender: "agent",
          text: response.response,
          type: "normal",
        });
      } else {
        addMessage({
          sender: "agent",
          text: "Sorry, I couldn't process that.",
          type: "error",
        });
      }
    } catch (error: unknown) {
      addMessage({
        sender: "agent",
        text: "Server error. Please try again.",
        type: "error",
      });

      if (error instanceof Error) {
        throw new Error(`Error fetching intent response: ${error.message}`);
      } else {
        throw new Error("Error fetching intent response");
      }
    }
  };

  const addMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const simulateTyping = () => {
    setIsTyping(true);

    // setTimeout(() =>
    //   setIsTyping(false),
    // 800);
  };

  const confirmTransaction = async () => {
    if (!pendingConfirmation) return;

    // Send real transaction and get hash
    const txHash = await sendRealTransaction(pendingConfirmation);

    // Fetch transaction status/receipt
    const txReceipt = await fetchTransaction(txHash);

addMessage({
          sender: "agent",
          text: `Transaction submitted! \n\nYour transfer is being processed on Arc network.`,
          type: "transaction",
      transactionData: {
        ...pendingConfirmation,
        txReciept: txHash,
        status: txReceipt.status || "pending",
      },
    });

    setPendingConfirmation(null);

    //  update status after a delay or on receipt change
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.transactionData?.txReciept === txHash
            ? {
                ...msg,
                text: `Transaction confirmed!\n\nSuccessfully transferred ${pendingConfirmation.amount} ${pendingConfirmation.token} to ${pendingConfirmation.recipient}`,
                transactionData: {
                  ...msg.transactionData!,
                  status: "confirmed",
                },
              }
            : msg
        )
      );
    }, 3000);
  };

  const cancelTransaction = () => {
    setPendingConfirmation(null);
    addMessage({
      sender: "agent",
      text: "Transaction cancelled. Feel free to try another command!",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined" && window.navigator) {
      try {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
          const recognitionInstance =
            new SpeechRecognition() as unknown as ISpeechRecognition;
          recognitionInstance.continuous = false;
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = "en-US";

          recognitionInstance.onstart = () => {
            setIsListening(true);
          };

          recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = "";
            let interimTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }

            // Update input with final transcript
            if (finalTranscript) {
              setInput(finalTranscript.trim());
            } else {
              // Show interim results in input
              setInput(interimTranscript.trim());
            }
          };

          recognitionInstance.onend = () => {
            setIsListening(false);
          };

          recognitionInstance.onerror = (
            event: SpeechRecognitionErrorEvent
          ) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
            // User-friendly error handling
            if (
              event.error === "network" ||
              event.error === "not-allowed" ||
              event.error === "service-not-allowed"
            ) {
              setSpeechError(
                "Voice input is not available in your browser or network. Please try again or use text input."
              );
              setSpeechSupported(false);
              setUnsupportedBrowser(true);
            } else {
              setSpeechError(
                `Voice input error: ${event.error}. Please try again or use text input.`
              );
            }
          };

          setRecognition(recognitionInstance);
          setSpeechSupported(true);
          setUnsupportedBrowser(false);
        } else {
          setSpeechSupported(false);
          setUnsupportedBrowser(true);
        }
      } catch (error) {
        setSpeechSupported(false);
        setUnsupportedBrowser(true);
        setSpeechError("Voice input is not supported in this browser.");
        console.error("Speech recognition initialization error:", error);
      }
    }
  }, []);

  // Voice recognition functions
  const startListening = () => {
    if (recognition && speechSupported) {
      setInput(""); // Clear input before starting
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <>
      <div className="min-h-screen bg-black flex font-sans">
        {/* Edge case banners */}
        <div className="fixed top-0 left-0 w-full z-[100] pointer-events-none">
          {isOffline && (
            <div className="bg-red-700 text-white text-center py-2 font-semibold animate-pulse pointer-events-auto">
              You are offline. Some features are disabled until you reconnect.
            </div>
          )}
          {unsupportedBrowser && (
            <div className="bg-yellow-700 text-white text-center py-2 font-semibold pointer-events-auto">
              Your browser does not support all features required for IntentSwap
              (e.g., voice input). Please use a modern browser like Chrome or
              Edge.
            </div>
          )}
          {speechError && (
            <div className="bg-red-800 text-white text-center py-2 font-semibold pointer-events-auto">
              {speechError}
            </div>
          )}
        </div>
        {/* Sidebar - ChatGPT Style Mobile */}
        <div
          className={cn(
            "flex flex-col bg-gray-900 border-r border-gray-700 transition-all duration-300 ease-in-out",

            "fixed left-0 top-0 min-h-screen z-[60]",
            showMobileSidebar ? "translate-x-0 w-64" : "-translate-x-full w-64",

            "md:relative md:translate-x-0 md:z-40",
            sidebarCollapsed ? "md:w-16" : "md:w-64"
          )}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            {(showMobileSidebar || !sidebarCollapsed) && (
              <h2 className="text-lg font-semibold text-white">IntentArc</h2>
            )}

            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileSidebar(false)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Desktop collapse button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 hidden md:flex"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <Button
              variant="outline"
              onClick={createNewChat}
              className={cn(
                "w-full justify-start bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white",
                sidebarCollapsed && "md:justify-center md:px-2" // Center icon when collapsed on desktop
              )}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              {/* Show text on mobile always, on desktop only when not collapsed */}
              <span
                className={cn(
                  "ml-2",
                  sidebarCollapsed && "md:hidden" // Hide text on desktop when collapsed
                )}
              >
                New Chat
              </span>
            </Button>
          </div>

          {/* Chat History */}
          <div className="flex-1 px-2 overflow-y-auto">
            {/* Mobile: Always show full list, Desktop: Show full when not collapsed */}
            <div
              className={cn(
                "space-y-2",
                "md:hidden",
                !sidebarCollapsed && "md:block"
              )}
            >
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group relative flex items-center w-full text-left text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg p-3 transition-colors",
                    currentChatId === chat.id && "bg-gray-800 text-white"
                  )}
                >
                  <div
                    className="flex items-center flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      switchToChat(chat.id);
                      // Close mobile sidebar when selecting a chat
                      setShowMobileSidebar(false);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{chat.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {chat.timestamp.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-2 h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    title="Delete chat"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Desktop collapsed view - only icons */}
            {sidebarCollapsed && (
              <div className="space-y-2 py-2 hidden md:block">
                {chatHistory.map((chat) => (
                  <Button
                    key={chat.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => switchToChat(chat.id)}
                    className={cn(
                      "w-full p-2 text-gray-300 hover:bg-gray-800 hover:text-white",
                      currentChatId === chat.id && "bg-gray-800 text-white"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="border-t border-gray-700 p-4 space-y-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-gray-300 hover:bg-gray-800 hover:text-white",
                sidebarCollapsed && "md:px-2"
              )}
            >
              <Settings className="h-4 w-4" />
              {/* Show text on mobile always, on desktop only when not collapsed */}
              <span
                className={cn(
                  "ml-2",
                  "md:hidden",
                  !sidebarCollapsed && "md:inline"
                )}
              >
                Settings
              </span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-gray-300 hover:bg-gray-800 hover:text-white",
                sidebarCollapsed && "md:px-2"
              )}
            >
              <LogOut className="h-4 w-4" />
              {/* Show text on mobile always, on desktop only when not collapsed */}
              <span
                className={cn(
                  "ml-2",
                  "md:hidden",
                  !sidebarCollapsed && "md:inline"
                )}
              >
                Sign Out
              </span>
            </Button>
          </div>
        </div>

        {/* Main Chat Area - Full width on mobile like ChatGPT */}
        <div
          className={cn(
            "flex-1 flex flex-col  transition-all duration-300 ease-in-out",
            // Mobile: Full width always (no margin)
            "w-full"
            // Desktop: Account for sidebar width
            // sidebarCollapsed ? "md:ml-16" : "md:ml-64"
          )}
        >
          {/* Header */}
          <header className="backdrop-blur-sm border-b border-gray-800/50 p-3 md:p-4 sticky top-0 z-50 bg-black/80">
            <div className=" mx-auto w-full flex items-center justify-between">
              {/* Left side - Mobile menu + App name like ChatGPT */}
              <div className="flex items-center gap-3">
                {/* Mobile menu button - like ChatGPT */}
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <h1 className="text-base md:text-lg font-semibold text-white">
                  IntentArc
                </h1>
              </div>

              {/* Right side - Wallet connection */}
              <div className="flex items-center gap-3">
                {authenticated ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-[#1E3DFF] via-[#7A1EFF] to-[#FF1E99] shadow-lg hover:shadow-xl hover:shadow-purple-500/25 transition-all duration-300 border border-white/10 backdrop-blur-sm">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></span>
                    <span className="text-xs md:text-sm text-white font-medium block">
                      Connected
                    </span>
                  </div>
                ) : (
                  <ConnectWalletButton />
                )}
              </div>
            </div>
          </header>

          {/* Chat Container */}
          <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-2 md:p-4">
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 max-h-[calc(100vh-200px)] px-2 md:px-0 pb-32">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[80%] lg:max-w-[70%] ${
                      msg.sender === "user" ? "order-2" : ""
                    }`}
                  >
                    {/* Message bubble */}
                    <div
                      className={`px-3 md:px-6 py-2 md:py-3 rounded-2xl relative text-sm md:text-base ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-[#1E3DFF] via-[#7A1EFF] to-[#FF1E99] text-white"
                          : msg.type === "error"
                          ? "bg-red-900/50 border border-red-500 text-white"
                          : msg.type === "confirmation"
                          ? "bg-yellow-900/50 border border-yellow-500 text-white"
                          : msg.type === "transaction"
                          ? "bg-green-900/50 border border-green-500 text-white"
                          : "bg-gray-900 text-white border border-gray-600"
                      }`}
                    >
                      <p className="whitespace-pre-line truncate md:truncate-none leading-relaxed ml-1">
                        {msg.text}
                      </p>

                      {/* Transaction details */}
                      {msg.transactionData && (
                        <div className="mt-3 p-2 md:p-3 bg-black/30 rounded-lg border border-gray-600">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm">
                            <div>
                              <span className="text-gray-400">Amount:</span>
                              <span className="ml-2 font-semibold">
                                {msg.transactionData.amount}{" "}
                                {msg.transactionData.token}
                              </span>
                            </div>
                            <div className="">
                              <span className="text-gray-400">To:</span>
                              <span className="ml-2 font-mono text-xs break-all whitespace-normal max-w-[10vw] block">
                                {msg.transactionData.recipient}
                              </span>
                            </div>
                          </div>

                          {msg.transactionData.txReciept && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-gray-400 text-sm">TX:</span>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    msg.transactionData!.txReciept!
                                  )
                                }
                                className="text-blue-400 hover:text-blue-300 text-xs font-mono flex items-center gap-1"
                              >
                                {msg.transactionData.txReciept.slice(0, 10)}...
                                <Copy className="w-3 h-3" />
                              </button>
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            {msg.transactionData.status === "pending" && (
                              <>
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                <span className="text-yellow-400 text-sm">
                                  Pending...
                                </span>
                              </>
                            )}
                            {msg.transactionData.status === "confirmed" && (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 text-sm">
                                  Confirmed
                                </span>
                              </>
                            )}
                            {msg.transactionData.status === "failed" && (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 text-sm">
                                  Failed
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p
                      className={`text-xs text-gray-500 mt-1 ${
                        msg.sender === "user" ? "text-right" : "text-left ml-5"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-white px-4 py-3 rounded-2xl border border-gray-600">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
            {/* Confirmation Panel */}
            {pendingConfirmation && (
              <div className="mb-4 p-3 md:p-4 bg-yellow-900/20 border border-yellow-500 rounded-xl mx-2 md:mx-0">
                <h3 className="text-yellow-400 font-semibold mb-3 text-sm md:text-base">
                  Confirm Transaction
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-black/50 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs md:text-sm">Amount</p>
                    <p className="text-white font-semibold text-sm md:text-base">
                      {pendingConfirmation?.amount} {pendingConfirmation?.token}
                    </p>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs md:text-sm">
                      Recipient
                    </p>
                    <p className="text-white font-semibold text-xs md:text-sm break-all">
                      {pendingConfirmation?.recipient}
                    </p>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs md:text-sm">Gas Fee</p>
                    <p className="text-white font-semibold text-sm md:text-base">
                      {pendingConfirmation?.gasEstimate}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    onClick={confirmTransaction}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-2 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 transition-all text-sm md:text-base"
                  >
                    Confirm & Send
                  </button>
                  <button
                    onClick={cancelTransaction}
                    className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-600 transition-all text-sm md:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Fixed Input Box at Bottom */}
          <div className="sticky bottom-0 left-0 w-full bg-black/95 z-50 py-4 border-t border-gray-800">
            <div className="flex flex-row gap-3 items-stretch sm:items-center w-full max-w-4xl mx-auto px-4">
              {/* Input Field with Microphone */}
              <div className="flex-1 relative">
                {/* Listening indicator */}
                {isListening && (
                  <div className="absolute -top-2 left-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse z-10">
                    Listening...
                  </div>
                )}
                <input
                  type="text"
                  className={`w-full px-4 py-3 pr-12 rounded-2xl border transition-all text-base ${
                    isListening
                      ? "border-red-400 bg-red-900/20 focus:ring-red-500"
                      : "border-gray-600 bg-gray-900/50 focus:ring-purple-500"
                  } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent`}
                  placeholder={
                    isOffline
                      ? "You are offline. Please reconnect."
                      : unsupportedBrowser
                      ? "Unsupported browser. Some features disabled."
                      : isListening
                      ? "Listening... Speak your command"
                      : "Type your command... (e.g., 'Send $50 to Alice')"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={
                    isTyping ||
                    !!pendingConfirmation ||
                    isOffline ||
                    unsupportedBrowser
                  }
                />
                <button
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                    isListening
                      ? "text-red-400 hover:text-red-300 animate-pulse"
                      : speechSupported && !isOffline && !unsupportedBrowser
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-600 cursor-not-allowed"
                  }`}
                  type="button"
                  title={
                    isOffline
                      ? "Voice input disabled while offline"
                      : unsupportedBrowser
                      ? "Voice input not supported in this browser"
                      : !speechSupported
                      ? "Voice input not supported"
                      : isListening
                      ? "Stop listening"
                      : "Start voice input"
                  }
                  onClick={toggleListening}
                  disabled={!speechSupported || isOffline || unsupportedBrowser}
                >
                  <FaMicrophone
                    className={`w-4 h-4 ${isListening ? "drop-shadow-lg" : ""}`}
                  />
                </button>
              </div>
              {/* Send Button */}
              <button
                onClick={sendMessage}
                disabled={
                  !input.trim() ||
                  isTyping ||
                  !!pendingConfirmation ||
                  isOffline ||
                  unsupportedBrowser
                }
                className="px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-[#1E3DFF] via-[#7A1EFF] to-[#FF1E99] text-white shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2 text-base sm:w-auto"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
            {/* Quick Suggestions */}
            <div className="flex md:flex-row-reverse gap-2 justify-center px-4 max-w-4xl mx-auto mt-2">
              {[
                "Send $50 to Alice",
                "Convert 100 euros to dollars", 
                "Put 1000 USDC into savings",
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  className="text-sm px-1.5 py-1.5 bg-gray-800/80 text-gray-300 rounded-full hover:bg-gray-700 hover:text-white transition-all border border-gray-700/50 hover:border-gray-600"
                  disabled={
                    isTyping ||
                    !!pendingConfirmation ||
                    isOffline ||
                    unsupportedBrowser
                  }
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
