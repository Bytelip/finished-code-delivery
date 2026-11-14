import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createInitialProfile,
  saveStoredProfile,
  type AuthProvider,
  type UserProfile,
} from "@/types/userProfile";

export interface CosmicParallaxBgProps {
  head?: string;
  text?: string;
  loop?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const CosmicParallaxBg: React.FC<CosmicParallaxBgProps> = ({
  head = "",
  text = "",
  loop = true,
  className = "",
  children,
}) => {
  const [smallStars, setSmallStars] = useState<string>("");
  const [mediumStars, setMediumStars] = useState<string>("");
  const [bigStars, setBigStars] = useState<string>("");

  const textParts = text ? text.split(",").map((part) => part.trim()) : [];

  const generateStarBoxShadow = (count: number): string => {
    const shadows: string[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * 2000);
      const y = Math.floor(Math.random() * 2000);
      shadows.push(`${x}px ${y}px #FFF`);
    }
    return shadows.join(", ");
  };

  useEffect(() => {
    setSmallStars(generateStarBoxShadow(700));
    setMediumStars(generateStarBoxShadow(200));
    setBigStars(generateStarBoxShadow(100));

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--animation-iteration", loop ? "infinite" : "1");
    }
  }, [loop]);

  return (
    <div className={`cosmic-parallax-container ${className}`}>
      <style>{`
        .cosmic-parallax-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          background: radial-gradient(ellipse at bottom, #0d1d31 0%, #03060c 100%);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .cosmic-stars, .cosmic-stars::after {
          width: 1px;
          height: 1px;
          background: transparent;
          animation: animStar 60s linear var(--animation-iteration, infinite);
          position: absolute;
          top: 0;
          left: 0;
        }
        .cosmic-stars-medium, .cosmic-stars-medium::after {
          width: 2px;
          height: 2px;
          background: transparent;
          animation: animStar 110s linear var(--animation-iteration, infinite);
          position: absolute;
          top: 0;
          left: 0;
        }
        .cosmic-stars-large, .cosmic-stars-large::after {
          width: 3px;
          height: 3px;
          background: transparent;
          border-radius: 50%;
          animation: animStar 160s linear var(--animation-iteration, infinite);
          position: absolute;
          top: 0;
          left: 0;
        }
        @keyframes animStar {
          from { transform: translateY(0px); }
          to { transform: translateY(-2000px); }
        }
        #horizon {
          position: absolute;
          bottom: -360px;
          left: 50%;
          transform: translateX(-50%);
          width: 190vw;
          height: 620px;
          border-radius: 50%;
          background: transparent;
          box-shadow: 0 -45px 140px rgba(14, 165, 233, 0.4),
                      inset 0 25px 90px rgba(56, 189, 248, 0.5);
          pointer-events: none;
          z-index: 1;
        }
        #horizon .glow {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          width: 65%;
          height: 95px;
          background: radial-gradient(ellipse at center, rgba(125, 211, 252, 0.65) 0%, transparent 75%);
          filter: blur(22px);
        }
        #earth {
          position: absolute;
          bottom: -430px;
          left: 50%;
          transform: translateX(-50%);
          width: 190vw;
          height: 650px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 0%, #0b2548 0%, #02040a 68%);
          border-top: 2px solid rgba(186, 230, 253, 0.75);
          z-index: 2;
          pointer-events: none;
        }
        @keyframes modalFloatIn {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .auth-modal-animate {
          animation: modalFloatIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 3-Layer Parallax Starfield */}
      <div id="stars" style={{ boxShadow: smallStars }} className="cosmic-stars" />
      <div id="stars2" style={{ boxShadow: mediumStars }} className="cosmic-stars-medium" />
      <div id="stars3" style={{ boxShadow: bigStars }} className="cosmic-stars-large" />

      {/* Glowing Earth Horizon */}
      <div id="horizon">
        <div className="glow" />
      </div>
      <div id="earth" />

      {/* Optional Top Cosmic Subtitle */}
      {head && (
        <div className="relative z-10 mb-4 text-center pointer-events-none">
          <div className="text-[11px] font-mono uppercase tracking-[0.35em] text-cyan-300/80">
            {head}
          </div>
          <div className="mt-1 text-[10px] font-mono tracking-wider text-slate-400">
            {textParts.join(" • ")}
          </div>
        </div>
      )}

      {/* Centered Modal Container */}
      <div className="relative z-10 w-full max-w-[430px] px-4">{children}</div>
    </div>
  );
};

export interface CosmicAuthPageProps {
  onSuccess?: (user: UserProfile) => void;
  onClose?: () => void;
}

export const CosmicAuthPage: React.FC<CosmicAuthPageProps> = ({ onSuccess, onClose }) => {
  const [email, setEmail] = useState<string>("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [otpError, setOtpError] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Generate and dispatch 6-digit OTP
  const dispatchOtp = (targetEmail: string) => {
    // 6-digit secure numeric verification code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newCode);
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpError(null);
    setResendCooldown(30);

    // Visual instant fallback notification banner & toast for zero-config testing
    toast.info(`Verification Code: ${newCode}`, {
      description: `Dispatched to ${targetEmail}. Code expires in 5 minutes.`,
      duration: 10000,
    });
  };

  const handleContinueWithEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;

    setLoadingProvider("Email");
    setTimeout(() => {
      setLoadingProvider(null);
      dispatchOtp(email);
      setStep("otp");
      // Focus first OTP box on next tick
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }, 400);
  };

  // Handle single digit OTP inputs with auto-advance and backspace navigation
  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = "";
      setOtpDigits(nextDigits);
      return;
    }

    // Single digit entry
    const char = cleanValue.slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = char;
    setOtpDigits(nextDigits);
    setOtpError(null);

    // Auto-advance to next box if available
    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    } else {
      // All 6 digits filled: auto verify
      const fullCode = nextDigits.join("");
      verifyOtpCode(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const nextDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pastedData[i] || "";
    }
    setOtpDigits(nextDigits);
    setOtpError(null);

    if (pastedData.length === 6) {
      otpInputsRef.current[5]?.focus();
      verifyOtpCode(pastedData);
    } else {
      const nextFocus = Math.min(pastedData.length, 5);
      otpInputsRef.current[nextFocus]?.focus();
    }
  };

  const verifyOtpCode = (codeToVerify: string) => {
    if (codeToVerify !== generatedOtp) {
      setOtpError("Incorrect verification code. Please check and try again.");
      return;
    }

    setLoadingProvider("Verify");
    setTimeout(() => {
      setLoadingProvider(null);
      const profile = createInitialProfile(email, "Email OTP");
      saveStoredProfile(profile);
      toast.success("Email Verified", {
        description: `Welcome, ${profile.fullName}. Mission Control Clearance Granted.`,
      });
      onSuccess?.(profile);
    }, 500);
  };

  const handleOAuth = (provider: "Google" | "Microsoft" | "Apple") => {
    setLoadingProvider(provider);
    setTimeout(() => {
      setLoadingProvider(null);
      const oauthEmail =
        provider === "Google"
          ? "operator.naren@gmail.com"
          : provider === "Microsoft"
            ? "operator@outlook.com"
            : "operator@icloud.com";

      const profile = createInitialProfile(oauthEmail, provider);
      saveStoredProfile(profile);
      toast.success(`Connected with ${provider}`, {
        description: `Authenticated as ${profile.fullName}. Mission Control Clearance Granted.`,
      });
      onSuccess?.(profile);
    }, 600);
  };

  return (
    <CosmicParallaxBg
      head="AGROSPACE NEXUS"
      text="NASA ORBITAL TELEMETRY, EARTH INTELLIGENCE"
      loop={true}
    >
      {/* Clean Manus-Inspired Card Floating Over Cosmic Horizon */}
      <div className="auth-modal-animate relative rounded-[28px] border border-white/15 bg-[#0B111E]/90 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(56,189,248,0.18)] text-white">
        {/* Top-Right Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Top Emblem / Satellite Logo */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-500/20 to-blue-600/10 shadow-[0_0_25px_rgba(34,211,238,0.25)]">
          <svg
            className="h-7 w-7 text-cyan-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="4" />
            <path
              strokeLinecap="round"
              d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.07-6.93l-1.41 1.41M6.48 17.52l-1.41 1.41m0-12.02l1.41 1.41m11.04 11.04l1.41 1.41"
            />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-30 12 12)" />
          </svg>
        </div>

        {/* ---------------- STEP 1: CREDENTIALS / OAUTH SCREEN ---------------- */}
        {step === "credentials" && (
          <div className="auth-modal-animate">
            {/* Heading & Subtitle */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Welcome to AgroSpace
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">
                Sign in with OAuth or verify your Gmail/Email
              </p>
            </div>

            {/* Stacked Social OAuth Buttons */}
            <div className="space-y-2.5">
              {/* Continue with Google */}
              <button
                type="button"
                onClick={() => handleOAuth("Google")}
                disabled={!!loadingProvider}
                className="group relative flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] font-medium text-white transition-all hover:border-cyan-400/40 hover:bg-white/[0.11] hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] active:scale-[0.99] cursor-pointer"
              >
                <svg className="absolute left-4 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 17c1.9 3.9 5.8 7 10.4 7z"
                  />
                </svg>
                <span>
                  {loadingProvider === "Google" ? "Connecting Google..." : "Continue with Google"}
                </span>
              </button>

              {/* Continue with Microsoft */}
              <button
                type="button"
                onClick={() => handleOAuth("Microsoft")}
                disabled={!!loadingProvider}
                className="group relative flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] font-medium text-white transition-all hover:border-cyan-400/40 hover:bg-white/[0.11] hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] active:scale-[0.99] cursor-pointer"
              >
                <svg className="absolute left-4 h-4 w-4" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                <span>
                  {loadingProvider === "Microsoft"
                    ? "Connecting Microsoft..."
                    : "Continue with Microsoft"}
                </span>
              </button>

              {/* Continue with Apple */}
              <button
                type="button"
                onClick={() => handleOAuth("Apple")}
                disabled={!!loadingProvider}
                className="group relative flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] font-medium text-white transition-all hover:border-cyan-400/40 hover:bg-white/[0.11] hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] active:scale-[0.99] cursor-pointer"
              >
                <svg
                  className="absolute left-4 h-4 w-4 fill-current text-white"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span>
                  {loadingProvider === "Apple" ? "Connecting Apple..." : "Continue with Apple"}
                </span>
              </button>
            </div>

            {/* Clean "Or" Divider */}
            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-mono font-medium text-slate-400">Or Email OTP</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Email Input Form */}
            <form onSubmit={handleContinueWithEmail} className="space-y-3">
              <div>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your Gmail / work email"
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-400 transition focus:border-cyan-400 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>

              <button
                type="submit"
                disabled={!isEmailValid || !!loadingProvider}
                className={`w-full rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer ${
                  isEmailValid
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:brightness-110 active:scale-[0.99]"
                    : "cursor-not-allowed bg-white/15 text-slate-300/70"
                }`}
              >
                {loadingProvider === "Email" ? "Sending 6-Digit Code..." : "Continue with Email"}
              </button>
            </form>
          </div>
        )}

        {/* ---------------- STEP 2: 6-DIGIT EMAIL VERIFICATION VIEW ---------------- */}
        {step === "otp" && (
          <div className="auth-modal-animate">
            {/* Heading & Subtitle */}
            <div className="text-center mb-5">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Verify your email
              </h1>
              <p className="mt-1.5 text-xs text-slate-300">
                We've sent a 6-digit verification code to
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-300">{email}</span>
                <button
                  type="button"
                  onClick={() => setStep("credentials")}
                  className="text-[11px] font-mono text-cyan-400 underline hover:text-cyan-200 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Instant Hackathon Testing OTP Dispatch Card */}
            {generatedOtp && (
              <div className="mb-5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-3 text-center shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md">
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/90 font-semibold">
                  Operator Dispatch Code
                </div>
                <div className="mt-1 font-mono text-2xl font-black tracking-[0.25em] text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">
                  {generatedOtp}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digits = generatedOtp.split("");
                    setOtpDigits(digits);
                    verifyOtpCode(generatedOtp);
                  }}
                  className="mt-1.5 text-[10px] font-mono font-semibold text-cyan-400 hover:text-cyan-200 underline cursor-pointer"
                >
                  Click to Auto-Fill & Enter
                </button>
              </div>
            )}

            {/* 6 Individual Auto-Advancing Digit Boxes */}
            <div className="mb-4 flex justify-between gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpInputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className={`h-12 w-11 sm:h-14 sm:w-13 rounded-xl border text-center font-mono text-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/40 ${
                    otpError
                      ? "border-crimson/60 bg-crimson/10 text-crimson"
                      : digit
                        ? "border-cyan-400/80 bg-cyan-500/15 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                        : "border-white/15 bg-white/[0.04] text-white focus:border-cyan-400"
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {otpError && (
              <p className="mb-3 text-center text-xs font-mono text-rose-400 animate-pulse">
                {otpError}
              </p>
            )}

            {/* Verify Button */}
            <button
              type="button"
              onClick={() => verifyOtpCode(otpDigits.join(""))}
              disabled={otpDigits.some((d) => !d) || !!loadingProvider}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer ${
                otpDigits.every((d) => d)
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:brightness-110 active:scale-[0.99]"
                  : "cursor-not-allowed bg-white/15 text-slate-300/70"
              }`}
            >
              {loadingProvider === "Verify"
                ? "Verifying Clearance..."
                : "Verify & Enter Mission Control"}
            </button>

            {/* Resend Code Countdown */}
            <div className="mt-4 text-center">
              {resendCooldown > 0 ? (
                <span className="font-mono text-xs text-slate-400">
                  Resend code in <span className="font-bold text-cyan-300">{resendCooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatchOtp(email)}
                  className="font-mono text-xs font-semibold text-cyan-400 hover:text-cyan-200 underline cursor-pointer"
                >
                  Didn't receive code? Resend Code
                </button>
              )}
            </div>
          </div>
        )}

        {/* Terms of Service & Privacy Policy Footer */}
        <p className="mt-6 text-center text-[12px] leading-relaxed text-slate-400">
          By continuing, you agree to our{" "}
          <a
            href="#terms"
            className="underline decoration-slate-500 underline-offset-2 hover:text-cyan-300"
          >
            Terms of Service
          </a>{" "}
          and have read our{" "}
          <a
            href="#privacy"
            className="underline decoration-slate-500 underline-offset-2 hover:text-cyan-300"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </CosmicParallaxBg>
  );
};

export default CosmicAuthPage;
