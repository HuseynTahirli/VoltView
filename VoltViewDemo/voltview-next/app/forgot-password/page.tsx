"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError("Connection error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full text-white border border-white/10 rounded-full py-3 px-4 focus:outline-none focus:border-white/30 text-center bg-transparent";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&display=swap');
        @keyframes glow-ltr {
          0%   { background-position: -150% center; }
          100% { background-position: 250% center; }
        }
        .voltview-title {
          font-family: 'Orbitron', sans-serif;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.45) 0%,
            rgba(255,255,255,0.45) 30%,
            rgba(255,255,255,1)    50%,
            rgba(255,255,255,0.45) 70%,
            rgba(255,255,255,0.45) 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: glow-ltr 2.8s linear infinite;
          letter-spacing: 0.12em;
        }
      `}</style>
      <div className="flex w-full flex-col min-h-screen bg-black items-center justify-center">
        <div className="w-full max-w-sm px-4 space-y-6 text-center">

          {/* Logo */}
          <div className="space-y-1">
            <h1 className="text-[2.2rem] font-bold leading-[1.1] voltview-title">VoltView</h1>
          </div>

          {sent ? (
            /* Success state */
            <div className="space-y-5">
              <div className="px-5 py-4 rounded-2xl text-sm"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
                <p className="font-medium mb-1">Check your email</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  If an account exists for <span className="text-white/70">{email}</span>, a password reset link has been sent. Check your inbox and spam folder.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-full bg-white text-black font-semibold py-3 hover:bg-white/90 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            /* Form state */
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">Reset your password</h2>
                <p className="text-sm text-white/40">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
                {error && (
                  <div className="px-4 py-2 rounded-full text-sm"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-white text-black font-semibold py-3 hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-sm text-white/40 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
