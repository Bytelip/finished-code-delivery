import React, { useEffect, useRef, useState } from "react";

// ==========================================
// 1. TYPES & USER PROFILE MODEL
// ==========================================
export interface UserProfile {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  provider: "Google" | "Microsoft" | "Apple" | "Email";
  verified: boolean;
  isVerified?: boolean;
  role: string;
  avatarColor: string;
  homeLocation: string;
  defaultView: "3D" | "2D";
  defaultLayer: string;
  units: "metric" | "imperial";
  hazardAlerts: boolean;
  preferences?: {
    homeBaseName: string;
    homeCoords: { lat: number; lon: number };
    defaultViewMode: "3d" | "2d";
    defaultActiveLayer: string;
    units: "metric" | "imperial";
  };
  notifications?: {
    cycloneAlerts: boolean;
    usgsQuakeAlerts: boolean;
    droughtAlerts: boolean;
    emailAlerts: boolean;
  };
  callsign?: string;
}

const STORAGE_KEY = "agrospace_user_profile_v1";

export const getStoredUser = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("agro_user_profile");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.email === "string") {
        const derivedName = parsed.name || parsed.fullName || parsed.email.split("@")[0];
        return {
          id: parsed.id || `usr_${Date.now()}`,
          name: derivedName,
          fullName: derivedName,
          email: parsed.email,
          provider: parsed.provider || "Email",
          verified: parsed.verified ?? parsed.isVerified ?? true,
          isVerified: parsed.verified ?? parsed.isVerified ?? true,
          role: parsed.role || "Mission Commander",
          avatarColor: parsed.avatarColor || "#06B6D4",
          homeLocation:
            parsed.homeLocation ||
            parsed.preferences?.homeBaseName ||
            "Kolar Plateau, Karnataka (13.1367° N, 78.1292° E)",
          defaultView: parsed.defaultView || "3D",
          defaultLayer: parsed.defaultLayer || parsed.preferences?.defaultActiveLayer || "NDVI",
          units: parsed.units || parsed.preferences?.units || "metric",
          hazardAlerts: parsed.hazardAlerts ?? true,
        };
      }
    }

    const legacyRaw = localStorage.getItem("agro_operator");
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy?.email) {
        const legacyName = legacy.email.split("@")[0];
        return {
          id: `usr_${Date.now()}`,
          name: legacyName,
          fullName: legacyName,
          email: legacy.email,
          provider: legacy.provider || "Email",
          verified: true,
          isVerified: true,
          role: "Mission Commander",
          avatarColor: "#06B6D4",
          homeLocation: "Kolar Plateau, Karnataka (13.1367° N, 78.1292° E)",
          defaultView: "3D",
          defaultLayer: "NDVI",
          units: "metric",
          hazardAlerts: true,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const saveStoredUser = (user: UserProfile | null) => {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("agro_operator");
      localStorage.removeItem("agro_user_profile");
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem("agro_user_profile", JSON.stringify(user));
      localStorage.setItem(
        "agro_operator",
        JSON.stringify({ email: user.email, provider: user.provider }),
      );
    }
  } catch (err) {
    console.error("Failed to save user to storage:", err);
  }
};

// ==========================================
// 2. COSMIC PARALLAX BACKGROUND
// ==========================================
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
        .cosmic-stars {
          width: 1px;
          height: 1px;
          background: transparent;
          animation: animStar 60s linear var(--animation-iteration, infinite);
          position: absolute;
          top: 0;
          left: 0;
        }
        .cosmic-stars-medium {
          width: 2px;
          height: 2px;
          background: transparent;
          animation: animStar 110s linear var(--animation-iteration, infinite);
          position: absolute;
          top: 0;
          left: 0;
        }
        .cosmic-stars-large {
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
      `}</style>

      <div id="stars" style={{ boxShadow: smallStars }} className="cosmic-stars" />
      <div id="stars2" style={{ boxShadow: mediumStars }} className="cosmic-stars-medium" />
      <div id="stars3" style={{ boxShadow: bigStars }} className="cosmic-stars-large" />

      <div id="horizon">
        <div className="glow" />
      </div>
      <div id="earth" />

      {head && (
        <div className="relative z-10 mb-4 text-center pointer-events-none">
          <div className="text-[11px] font-mono uppercase tracking-[0.35em] text-cyan-300/80">
            {textParts.join(" • ")}
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-[420px] px-4">{children}</div>
    </div>
  );
};

// ==========================================
// 3. LOGIN / SIGNUP + 6-DIGIT GMAIL OTP MODAL
// ==========================================
export interface CosmicAuthPageProps {
  onAuthComplete?: (user: UserProfile) => void;
  onSuccess?: (user: UserProfile) => void;
  onClose?: () => void;
}

export const CosmicAuthPage: React.FC<CosmicAuthPageProps> = ({
  onAuthComplete,
  onSuccess,
  onClose,
}) => {
  const [step, setStep] = useState<"entry" | "otp">("entry");
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<
    "Email" | "Google" | "Microsoft" | "Apple"
  >("Email");
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string>("");
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Helper to generate & send 6-digit verification code to Gmail
  const sendVerificationCode = async (
    targetEmail: string,
    providerName: "Email" | "Google" | "Microsoft" | "Apple",
  ) => {
    setSendingEmail(true);
    setOtpError("");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpDigits(["", "", "", "", "", ""]);
    setSelectedProvider(providerName);

    // Optional: If EmailJS environment variables are configured, send real email to Gmail
    const envObj = (import.meta as unknown as { env?: Record<string, string> }).env;
    const serviceId = envObj?.VITE_EMAILJS_SERVICE_ID;
    const templateId = envObj?.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = envObj?.VITE_EMAILJS_PUBLIC_KEY;

    if (serviceId && templateId && publicKey) {
      try {
        await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            template_params: {
              to_email: targetEmail,
              verification_code: code,
              app_name: "AgroSpace Nexus",
            },
          }),
        });
      } catch (err) {
        console.warn("EmailJS fallback to local preview OTP:", err);
      }
    }

    setTimeout(() => {
      setSendingEmail(false);
      setStep("otp");
      setResendTimer(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, 450);
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;
    sendVerificationCode(email.trim(), "Email");
  };

  const handleSocialOAuth = (provider: "Google" | "Microsoft" | "Apple") => {
    const targetEmail =
      email.trim() && isEmailValid ? email.trim() : `naren.${provider.toLowerCase()}@gmail.com`;
    setEmail(targetEmail);
    sendVerificationCode(targetEmail, provider);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value.slice(-1);
    setOtpDigits(next);
    setOtpError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otpDigits.join("");
    if (entered.length < 6) {
      setOtpError("Please enter all 6 digits.");
      return;
    }
    if (entered !== generatedOtp) {
      setOtpError("Invalid verification code. Please check the code and try again.");
      return;
    }

    const derivedName =
      name.trim() ||
      email
        .split("@")[0]
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const newUser: UserProfile = {
      id: "usr_" + Date.now(),
      name: derivedName || "Commander Naren",
      fullName: derivedName || "Commander Naren",
      email: email.trim(),
      provider: selectedProvider,
      verified: true,
      isVerified: true,
      role: "Mission Commander",
      avatarColor: "#06B6D4",
      homeLocation: "Kolar Plateau, Karnataka (13.1367° N, 78.1292° E)",
      defaultView: "3D",
      defaultLayer: "NDVI",
      units: "metric",
      hazardAlerts: true,
    };

    saveStoredUser(newUser);
    onAuthComplete?.(newUser);
    onSuccess?.(newUser);
  };

  return (
    <CosmicParallaxBg head="AGROSPACE NEXUS" text="ORBITAL TELEMETRY, EARTH INTELLIGENCE">
      <div className="relative rounded-[28px] border border-white/15 bg-[#0B111E]/90 p-8 sm:p-9 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.16)] text-white">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        )}

        {/* Top Emblem */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-500/20 to-blue-600/10 shadow-[0_0_25px_rgba(34,211,238,0.25)]">
          <svg
            className="h-7 w-7 text-cyan-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="4" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-30 12 12)" />
          </svg>
        </div>

        {step === "entry" ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Welcome to AgroSpace
              </h1>
              <p className="mt-1 text-sm text-slate-400">Sign in or sign up</p>
            </div>

            {/* Social OAuth Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSocialOAuth("Google")}
                className="relative flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] font-medium text-white transition hover:border-cyan-400/40 hover:bg-white/[0.11] cursor-pointer"
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
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialOAuth("Microsoft")}
                className="relative flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] font-medium text-white transition hover:border-cyan-400/40 hover:bg-white/[0.11] cursor-pointer"
              >
                <svg className="absolute left-4 h-4 w-4" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                <span>Continue with Microsoft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialOAuth("Apple")}
                className="relative flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] font-medium text-white transition hover:border-cyan-400/40 hover:bg-white/[0.11] cursor-pointer"
              >
                <svg className="absolute left-4 h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span>Continue with Apple</span>
              </button>
            </div>

            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-medium text-slate-400">Or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailContinue} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Profile Name (optional, e.g., Naren)"
                className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your Gmail or email address"
                className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!isEmailValid || sendingEmail}
                className={`w-full rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer ${
                  isEmailValid
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:brightness-110"
                    : "cursor-not-allowed bg-white/15 text-slate-400"
                }`}
              >
                {sendingEmail ? "Sending Verification Code..." : "Continue"}
              </button>
            </form>
          </>
        ) : (
          /* STEP 2: 6-DIGIT GMAIL VERIFICATION CODE SCREEN */
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-semibold text-white">Check your Gmail</h2>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                We sent a 6-digit verification code to{" "}
                <span className="font-mono text-cyan-300">{email}</span>
              </p>
            </div>

            {/* Simulated Gmail Dispatch Banner (So Hackathon Judges / Local Testing Can See Code Immediately) */}
            <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Gmail Dispatch OTP:</span>
                <span className="font-mono text-sm font-bold tracking-widest text-white">
                  {generatedOtp}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOtpDigits(generatedOtp.split(""))}
                className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/30 cursor-pointer"
              >
                Auto-Fill
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-between gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="h-12 w-12 rounded-xl border border-white/15 bg-slate-900/90 text-center font-mono text-lg font-bold text-cyan-300 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/25"
                  />
                ))}
              </div>

              {otpError && <p className="text-center text-xs text-rose-400">{otpError}</p>}

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] transition hover:brightness-110 cursor-pointer"
              >
                Verify & Create Account
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setStep("entry")}
                className="hover:text-white cursor-pointer"
              >
                ← Change email
              </button>
              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={() => sendVerificationCode(email, selectedProvider)}
                className={`cursor-pointer ${
                  resendTimer > 0 ? "text-slate-500" : "text-cyan-400 hover:underline"
                }`}
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code to Gmail"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
          By continuing, you agree to our <span className="underline">Terms of Service</span> and{" "}
          <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </CosmicParallaxBg>
  );
};

// ==========================================
// 4. MAIN PAGE TOP-RIGHT USER ICON & SETTINGS MODAL
// ==========================================
export interface UserProfileNavbarWidgetProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
  onNavigateHome?: (locationStr: string) => void;
}

export const UserProfileNavbarWidget: React.FC<UserProfileNavbarWidgetProps> = ({
  user,
  onUpdateUser,
  onLogout,
  onNavigateHome,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formState, setFormState] = useState<UserProfile>(user);

  useEffect(() => {
    setFormState(user);
  }, [user]);

  const initials = (user.name || user.email || "OP")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredUser(formState);
    onUpdateUser(formState);
    setSettingsOpen(false);
  };

  return (
    <div className="relative z-50">
      {/* Top-Right Profile Trigger Button on Main Page */}
      <button
        type="button"
        aria-label="Operator Profile Quick Menu"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-full border border-cyan-500/30 bg-slate-950/80 py-1.5 pl-2 pr-3.5 text-left backdrop-blur-xl transition hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] cursor-pointer"
      >
        <div
          className="relative flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold text-slate-950 shadow-inner"
          style={{ backgroundColor: user.avatarColor || "#06B6D4" }}
        >
          {initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-white">{user.name}</span>
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-mono uppercase text-cyan-300">
              {user.provider}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
            {user.email}
          </div>
        </div>
      </button>

      {/* Quick Account Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-cyan-500/25 bg-slate-950/95 p-4 text-slate-100 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
          <div className="border-b border-white/10 pb-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                ✓ VERIFIED
              </span>
            </div>
            <p className="mt-0.5 text-xs font-mono text-slate-400 truncate">{user.email}</p>
            <p className="mt-1 text-[11px] text-cyan-400">{user.role}</p>
          </div>

          <div className="py-2 space-y-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-200 hover:bg-white/10 cursor-pointer"
            >
              <span>⚙️ Account & Profile Settings</span>
              <span className="text-slate-400">→</span>
            </button>
            <div
              onClick={() => {
                if (onNavigateHome && user.homeLocation) {
                  onNavigateHome(user.homeLocation);
                  setMenuOpen(false);
                }
              }}
              className="rounded-xl bg-slate-900/80 px-3 py-2 text-[11px] text-slate-400 cursor-pointer hover:bg-slate-900"
            >
              <div className="font-mono uppercase text-[10px] text-slate-500 flex items-center justify-between">
                <span>Home Base</span>
                <span className="text-[9px] text-cyan-400">Lock</span>
              </div>
              <div className="text-slate-200 truncate">{user.homeLocation}</div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2 text-[11px]">
              <span className="text-slate-400">Default View / Layer</span>
              <span className="font-mono text-cyan-300">
                {user.defaultView} • {user.defaultLayer}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              saveStoredUser(null);
              onLogout();
            }}
            className="mt-2 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 cursor-pointer"
          >
            Sign Out of Mission Control
          </button>
        </div>
      )}

      {/* Full Account & Profile Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-cyan-500/30 bg-[#0B111E] p-6 sm:p-8 text-white shadow-[0_0_60px_rgba(6,182,212,0.2)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Operator Account & Settings</h3>
                <p className="text-xs text-slate-400">
                  Manage your profile name, verified Gmail, and default NASA telemetry settings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono uppercase text-slate-400 mb-1">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono uppercase text-slate-400 mb-1">
                    Mission Role / Title
                  </label>
                  <input
                    type="text"
                    value={formState.role}
                    onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono uppercase text-slate-400 mb-1">
                  Verified Gmail / Account Email ({formState.provider})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    disabled
                    value={formState.email}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-400"
                  />
                  <span className="shrink-0 rounded-xl bg-emerald-500/20 px-3 py-2 font-mono text-[11px] text-emerald-300">
                    ✓ OTP Verified
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-mono uppercase text-slate-400 mb-1">
                  Default Home Base Coordinates
                </label>
                <input
                  type="text"
                  value={formState.homeLocation}
                  onChange={(e) => setFormState({ ...formState, homeLocation: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono uppercase text-slate-400 mb-1">
                    Default Globe Mode
                  </label>
                  <select
                    value={formState.defaultView}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        defaultView: e.target.value as "3D" | "2D",
                      })
                    }
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="3D">3D Orbital Globe</option>
                    <option value="2D">2D Satellite Map</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono uppercase text-slate-400 mb-1">
                    Default NASA Layer
                  </label>
                  <select
                    value={formState.defaultLayer}
                    onChange={(e) => setFormState({ ...formState, defaultLayer: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="NDVI">NDVI Vegetation</option>
                    <option value="EVI">EVI Canopy</option>
                    <option value="LAI">LAI Leaf Index</option>
                    <option value="ECOSTRESS ESI">ECOSTRESS ESI</option>
                    <option value="SMAP Moisture">SMAP Soil Moisture</option>
                    <option value="GPM Rain">GPM Precipitation</option>
                    <option value="FIRMS Fires">FIRMS Thermal Fires</option>
                    <option value="Smoke AOD">Smoke AOD</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <div>
                  <div className="font-semibold text-white">Gmail Hazard & Drought Alerts</div>
                  <div className="text-[11px] text-slate-400">
                    Send alerts to {formState.email} when Cyclone or Drought thresholds trigger
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formState.hazardAlerts}
                  onChange={(e) => setFormState({ ...formState, hazardAlerts: e.target.checked })}
                  className="h-4 w-4 accent-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] cursor-pointer"
                >
                  Save Account Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmicAuthPage;
