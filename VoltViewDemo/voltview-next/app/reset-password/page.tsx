"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/lib/api";

const PW_RULES = [
  { id: "length",  label: "At least 8 characters",  test: (p: string) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter",    test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower",   label: "One lowercase letter",    test: (p: string) => /[a-z]/.test(p) },
  { id: "special", label: "One special character",   test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwValid = PW_RULES.every(r => r.test(password));
  const confirmMatch = password === confirm;

  // Extract access_token from URL hash — only available client-side
  // Supabase recovery emails redirect to: /reset-password#access_token=...&type=recovery
  useEffect(() => {
    const hash = window.location.hash.slice(1); // strip leading '#'
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const type = params.get("type");

    if (!token || (type !== "recovery" && type !== "invite")) {
      setTokenError(true);
    } else {
      setAccessToken(token);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwValid || !confirmMatch || !accessToken) return;
    setError(null);
    setLoading(true);
    try {
      const res = await resetPassword(accessToken, password);
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setError(res.message || "Failed to reset password. Please request a new link.");
      }
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
          <h1 className="text-[2.2rem] font-bold leading-[1.1] voltview-title">VoltView</h1>

          {/* Invalid/missing token */}
          {tokenError && (
            <div className="space-y-5">
              <div className="px-5 py-4 rounded-2xl text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                <p className="font-medium mb-1">Invalid or expired link</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  This reset link is no longer valid. Please request a new one.
                </p>
              </div>
              <button
                onClick={() => router.push("/forgot-password")}
                className="w-full rounded-full bg-white text-black font-semibold py-3 hover:bg-white/90 transition-colors"
              >
                Request New Link
              </button>
            </div>
          )}

          {/* Success state */}
          {done && !tokenError && (
            <div className="space-y-5">
              <div className="px-5 py-4 rounded-2xl text-sm"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
                <p className="font-medium mb-1">Password updated</p>
                <p className="text-white/50 text-xs">Redirecting you to sign in...</p>
              </div>
            </div>
          )}

          {/* Form state */}
          {!tokenError && !done && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">Set new password</h2>
                <p className="text-sm text-white/40">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className={inputClass}
                />

                {/* Password rules */}
                <div className="text-left px-2 space-y-1.5">
                  {PW_RULES.map(r => {
                    const met = r.test(password);
                    return (
                      <div key={r.id} className="flex items-center gap-2 text-sm" style={{ color: met ? "#4ade80" : "#555" }}>
                        <span className="text-xs">{met ? "✓" : "✗"}</span>
                        <span>{r.label}</span>
                      </div>
                    );
                  })}
                  {confirm.length > 0 && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: confirmMatch ? "#4ade80" : "#ef4444" }}>
                      <span className="text-xs">{confirmMatch ? "✓" : "✗"}</span>
                      <span>Passwords match</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="px-4 py-2 rounded-full text-sm"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !pwValid || !confirmMatch}
                  className="w-full rounded-full bg-white text-black font-semibold py-3 hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? "Updating..." : "Set New Password"}
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
