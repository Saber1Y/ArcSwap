"use client";
import { TypeAnimation } from "react-type-animation";

export default function AnimatedWordType() {
  return (
    <span className="bg-gradient-to-r from-[#adc5ea] to-[#e3e8e7] bg-clip-text text-transparent animate-gradient text-2xl md:text-7xl font-extrabold">
      JUST -{" "}
      <TypeAnimation
        sequence={["WORDS.", 1500, "VOICE.", 1500]}
        wrapper="span"
        speed={50}
        style={{ display: "inline-block" }}
        repeat={Infinity}
        aria-live="polite"
      />
      <noscript>
        <span className="text-white">WORDS &amp; VOICE.</span>
      </noscript>
    </span>
  );
}
