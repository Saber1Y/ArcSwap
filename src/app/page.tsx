"use client";
import Link from "next/link";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import Features from "@/components/Features";
import { SiProbot } from "react-icons/si";
import { FaBoltLightning } from "react-icons/fa6";
import { GiCheckedShield } from "react-icons/gi";
import { SlMagnifier } from "react-icons/sl";
import AnimatedWordType from "@/components/AnimatedWordType";
import Image from "next/image";

export default function Home() {
  const { authenticated } = usePrivy();
  const [showConnectMsg, setShowConnectMsg] = useState(false);

  return (
    <>
      {showConnectMsg && (
        <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white text-center py-3 font-semibold shadow-lg">
          Please connect your wallet first to start using DeFi.
        </div>
      )}
      <div className="min-h-screen bg-[#102b48] flex flex-col items-center justify-center font-sans relative overflow-x-hidden">
        {/* <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-950/20 to-black" /> */}
        <header
          className={`w-full flex justify-between items-center px-4 md:px-8 py-4 border-b border-[#e3e8e7]/20 bg-[#102b48]/90 backdrop-blur-sm ${
            showConnectMsg ? "mt-12" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="IntentSwap Logo"
              width={40}
              height={40}
            />
            <h1 className="text-[#e3e8e7] text-lg font-semibold tracking-wide">
              ArcSwap
            </h1>
          </div>
          <div className="flex items-center">
            <ConnectWalletButton />
          </div>
        </header>

        <main className="flex flex-col items-center justify-center flex-1 w-full px-4 relative z-10">
          {/* Hero Section with improved spacing and animations */}
          <div className="text-center max-w-5xl mt-5 mx-auto">
            <h2 className="text-4xl md:text-7xl font-extrabold text-center mb-6 leading-tight">
              <span className="text-[#e3e8e7] bg-clip-text animate-fade-in">
                MULTI-CURRENCY
                <br />
                DEFI
                <br />
                WITH
                <br />
              </span>
              <AnimatedWordType />
            </h2>

            <p className="text-[#e3e8e7]/80 text-md md:text-3xl text-center mb-8 max-w-2xl mx-auto leading-relaxed">
              Send, convert, and earn yield on{" "}
              <span className="text-[#e3e8e7] font-semibold">Arc</span> using simple natural language. 
              Stable $0.02 gas, real money tokens, built-in FX.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8">
              <div className="flex flex-col items-center">
                <button
                  className="mt-2 px-8 py-4 text-xl font-bold rounded cursor-pointer border-2 border-[#e3e8e7] bg-gradient-to-r from-[#adc5ea] to-[#e3e8e7] text-[#102b48] shadow-lg hover:scale-105 transition-transform"
                  onClick={() => {
                    if (authenticated) {
                      window.location.href = "/chat";
                    } else {
                      setShowConnectMsg(true);
                    }
                  }}
                >
                  START DEFI
                </button>
              </div>

              <Link href="#demo">
                <button className="mt-2 px-8 py-4 text-xl font-bold rounded cursor-pointer border-2  shadow-lg hover:scale-105 transition-transform  border-[#e3e8e7]/50 text-[#e3e8e7] hover:border-[#e3e8e7] hover:bg-[#e3e8e7] hover:text-[#102b48]  duration-300">
                  VIEW DEMO
                </button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 text-sm text-[#e3e8e7]/60 mb-16">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#adc5ea] rounded-full"></span>
                <span>Arc Testnet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#adc5ea] rounded-full"></span>
                <span>Multi-Currency</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#adc5ea] rounded-full"></span>
                <span>Yield Bearing</span>
              </div>
            </div>
          </div>

          {/* Example Commands Section */}
          <section className="w-full max-w-4xl mx-auto mb-24" id="demo">
            <h2 className="text-3xl font-bold text-[#e3e8e7] text-center mb-8">
              Try These Commands
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1a3a52]/80 backdrop-blur border border-[#e3e8e7]/30 rounded-lg p-6 hover:border-[#adc5ea] transition-colors duration-300">
                <div className="text-[#adc5ea] text-sm mb-2">
                  → Input:
                </div>
                <div className="text-[#e3e8e7] mb-4">
                  &quot;Send $50 to Alice&quot;
                </div>
                <div className="text-[#adc5ea] text-sm mb-2">
                  ← Parsed:
                </div>
                <div className="text-[#e3e8e7]/70 text-sm">
                  Amount: 50, Token: USDC, Recipient: Alice, Gas: $0.015
                </div>
              </div>

              <div className="bg-[#1a3a52]/80 backdrop-blur border border-[#e3e8e7]/30 cursor-pointer rounded-lg p-6 hover:border-[#adc5ea] transition-colors duration-300">
                <div className="text-[#adc5ea] text-sm mb-2">→ Input:</div>
                <div className="text-[#e3e8e7] mb-4">
                  &quot;Convert 100 euros to dollars&quot;
                </div>
                <div className="text-[#adc5ea] text-sm mb-2">← Parsed:</div>
                <div className="text-[#e3e8e7]/70 text-sm">
                  EURC → USDC, Amount: 100, Expected: ~$105, Gas: $0.015
                </div>
              </div>

              <div className="bg-[#1a3a52]/80 backdrop-blur border border-[#e3e8e7]/30 rounded-lg p-6 hover:border-[#adc5ea] transition-colors duration-300">
                <div className="text-[#adc5ea] text-sm mb-2">
                  → Input:
                </div>
                <div className="text-[#e3e8e7] mb-4">
                  &quot;Put 1000 USDC into savings&quot;
                </div>
                <div className="text-[#adc5ea] text-sm mb-2">
                  ← Parsed:
                </div>
                <div className="text-[#e3e8e7]/70 text-sm">
                  USDC → USYC, Amount: 1000, APY: 5%, Gas: $0.015
                </div>
              </div>

              <div className="bg-[#1a3a52]/80 backdrop-blur border border-[#e3e8e7]/30 rounded-lg p-6 hover:border-[#adc5ea] transition-colors duration-300">
                <div className="text-[#adc5ea] text-sm mb-2">→ Input:</div>
                <div className="text-[#e3e8e7] mb-4">
                  &quot;Show my balance in dollars&quot;
                </div>
                <div className="text-[#adc5ea] text-sm mb-2">← Parsed:</div>
                <div className="text-[#e3e8e7]/70 text-sm">
                  Multi-currency balance display, All tokens: USDC/EURC/USYC
                </div>
              </div>
            </div>
          </section>

          {/* Enhanced Features Section */}
          <Features
            features={[
              {
                icon: <SiProbot className="text-white" />,
                title: "Multi-Currency AI",
                description:
                  "Natural language support for USDC, EURC, and USYC with FX conversions and yield operations.",
              },
              {
                icon: <FaBoltLightning className="text-yellow-400" />,
                title: "Stable Gas Fees",
                description:
                  "Predictable $0.01-0.02 USDC gas costs on Arc network, no volatility or surprises.",
              },
              {
                icon: <GiCheckedShield className="text-white" />,
                title: "Real Money Tokens",
                description:
                  "Circle's USDC and EURC with built-in yield-bearing USYC earning ~5% APY automatically.",
              },
              {
                icon: <SlMagnifier className="text-white" />,
                title: "Built-in FX",
                description:
                  "Seamless currency conversion between USD and Euro with competitive rates and transparent pricing.",
              },
            ]}
          />
        </main>

        <footer className="w-full flex flex-col items-center justify-center py-8 border-t border-[#e3e8e7]/20 bg-[#102b48]/90 backdrop-blur relative z-10">
          <div className="text-sm text-[#e3e8e7]/60 text-center max-w-xl mb-4">
            Built on{" "}
            <span className="text-[#e3e8e7] font-semibold">
              Arc Network
            </span>{" "}
            • Making multi-currency DeFi as easy as sending a text message.
          </div>
          <div className="flex gap-6">
            <Link
              href="https://github.com/Hackathons-w-Rapto/ArcSwap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e3e8e7]/60 hover:text-[#e3e8e7] transition-colors duration-300"
            >
              GitHub
            </Link>
            <Link
              href="https://www.loom.com/share/aabf4d44adc94fcfb8c1ebf3d33d5044?sid=2294e122-09e7-437d-8c05-d95cc3b590a9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e3e8e7]/60 hover:text-[#e3e8e7] transition-colors duration-300"
            >
              Demo Video
            </Link>
          </div>
        </footer>

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes gradient {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }

          .animate-fade-in {
            animation: fade-in 1s ease-out;
          }

          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 3s ease infinite;
          }
        `}</style>
      </div>
    </>
  );
}
