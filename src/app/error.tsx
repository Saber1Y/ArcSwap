"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#102b48] text-[#e3e8e7] px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-4 text-[#adc5ea]">
          Oops! Something went wrong.
        </h1>
        <p className="text-lg mb-6 text-[#e3e8e7]/80">
          We couldn&#39;t process your request. Please try again, check your
          internet connection, or contact support if the problem persists.
        </p>
        <button
          className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#adc5ea] to-[#e3e8e7] text-[#102b48] shadow-lg hover:scale-105 transition-transform"
          onClick={() => reset()}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
