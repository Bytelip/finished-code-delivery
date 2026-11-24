import React, { useEffect, useState } from "react";
import {
  MIN_PASSWORD_LENGTH,
  fetchSignedInProfile,
  getLastUsedProvider,
  resendConfirmation,
  resendOtp,
  sendPasswordReset,
  sendSignInOtp,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
  verifyEmailOtp,
  type SocialProvider,
} from "@/services/cloudAuth";
import { toast } from "sonner";
import { LocalizedText, useLocalizedValue } from "@/components/i18n/LocalizedText";

// ==========================================
// 1. TYPES & USER PROFILE MODEL
// ==========================================
export interface UserProfile {
  id: string;
  name: string;
  fullName?: string | undefined;
  email: string;
  provider: "Google" | "Microsoft" | "Apple" | "Lovable" | "Email";
  verified: boolean;
  isVerified?: boolean | undefined;
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
  callsign?: string | undefined;
  apiKeys?: { nasaApiKey?: string };
  verifiedAt?: string | undefined;
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
          min-height: 100dvh;
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
          <div className="text-xs font-mono uppercase tracking-[0.35em] text-cyan-300">
            {textParts.join(" • ")}
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-[420px] px-4">{children}</div>
    </div>
  );
};

// ==========================================
// 3. LOGIN / SIGNUP + BASE44 SPLIT-SCREEN AUTH
// ==========================================
export interface CosmicAuthPageProps {
  onAuthComplete?: (user: UserProfile) => void;
  onSuccess?: (user: UserProfile) => void;
  onClose?: () => void;
  initialMode?: "signin" | "signup";
}

type AuthStep = "entry" | "password" | "verify_otp" | "forgot" | "reset_sent";

const inputClass =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all";
const providerButtonClass =
  "relative flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition disabled:opacity-50 cursor-pointer shadow-sm";
const primaryButtonClass = (enabled: boolean) =>
  `w-full rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer ${
    enabled
      ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:brightness-110 active:scale-[0.99]"
      : "cursor-not-allowed bg-white/10 text-muted-foreground"
  }`;

export const CosmicAuthPage: React.FC<CosmicAuthPageProps> = ({
  onAuthComplete,
  onSuccess,
  onClose,
  initialMode = "signin",
}) => {
  const [step, setStep] = useState<AuthStep>("entry");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [loadingOAuth, setLoadingOAuth] = useState<SocialProvider | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">(initialMode);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [otpType, setOtpType] = useState<"signup" | "email">("signup");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [useOtpSignIn, setUseOtpSignIn] = useState<boolean>(false);
  const [lastUsedProvider, setLastUsedProvider] = useState<SocialProvider | null>(null);

  // 6 separate numeric OTP input boxes
  const [otpValues, setOtpValues] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setLastUsedProvider(getLastUsedProvider());
  }, []);

  useEffect(() => {
    if (step === "verify_otp") {
      const timer = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step]);

  const namePlaceholder = useLocalizedValue("Your name (e.g., Naren Kumar)");
  const emailPlaceholder = useLocalizedValue("name@example.com");
  const passwordPlaceholder = useLocalizedValue(
    authMode === "signup"
      ? `Create password (min ${MIN_PASSWORD_LENGTH} characters)`
      : "Enter your password",
  );
  const passwordToggleLabel = useLocalizedValue(showPassword ? "Hide password" : "Show password");
  const nameFieldLabel = useLocalizedValue("Your name");
  const emailFieldLabel = useLocalizedValue("Email address");
  const passwordFieldLabel = useLocalizedValue("Password");

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isNameValid = name.trim().length >= 2 && name.trim().length <= 80;
  const isPasswordValid =
    authMode === "signup"
      ? password.length >= MIN_PASSWORD_LENGTH && password.length <= 72
      : password.length > 0 && password.length <= 72;

  const canSubmitPasswordStep =
    isEmailValid &&
    (useOtpSignIn && authMode === "signin"
      ? !isSubmitting
      : isPasswordValid && (authMode === "signin" || isNameValid) && !isSubmitting);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const showError = (msg: string) => {
    setAuthError(msg);
    toast.error(<LocalizedText text={msg} />);
  };

  const finishSignIn = async () => {
    const profile = await fetchSignedInProfile();
    if (!profile) {
      showError("Signed in, but your profile could not be loaded. Please try again.");
      return;
    }
    toast.success(<LocalizedText text={`Welcome, ${profile.name}`} />);
    onAuthComplete?.(profile);
    onSuccess?.(profile);
  };

  const handleTabSwitch = (newMode: "signin" | "signup") => {
    setAuthMode(newMode);
    setAuthError("");
    setLoadingOAuth(null);
    setIsSubmitting(false);
    setOtpValues(["", "", "", "", "", ""]);
    setUseOtpSignIn(false);
  };

  const handleSocialOAuth = async (provider: SocialProvider) => {
    setAuthError("");
    setLoadingOAuth(provider);
    try {
      const result = await signInWithProvider(provider);
      if (!result.ok) {
        showError(result.error || "Sign-in could not be started. Please try again.");
        return;
      }
      if (result.redirected) return;
      await finishSignIn();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Sign-in could not be started.");
    } finally {
      setLoadingOAuth(null);
    }
  };

  const handleContinueWithEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!isEmailValid) {
      return showError("Please enter a valid email address.");
    }
    setStep("password");
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (useOtpSignIn && authMode === "signin") {
      if (!isEmailValid) return showError("Please enter a valid email address.");
      setIsSubmitting(true);
      try {
        const result = await sendSignInOtp(email);
        if (!result.ok) return showError(result.error || "Could not send verification code.");
        setOtpType("email");
        setOtpValues(["", "", "", "", "", ""]);
        setResendCooldown(60);
        setStep("verify_otp");
        toast.info(<LocalizedText text="We sent a 6-digit verification code to your email." />);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!canSubmitPasswordStep) return;
    setIsSubmitting(true);
    try {
      if (authMode === "signin") {
        const result = await signInWithEmail(email, password);
        if (!result.ok) {
          if (result.needsConfirmation) {
            await resendOtp(email, "signup");
            setOtpType("signup");
            setOtpValues(["", "", "", "", "", ""]);
            setResendCooldown(60);
            setStep("verify_otp");
            toast.info(
              <LocalizedText text="Please verify your email with the 6-digit code sent to your inbox." />,
            );
            return;
          }
          return showError(result.error || "Wrong email or password.");
        }
        await finishSignIn();
        return;
      }

      // Create Account flow: calls signUp and prompts for mandatory 6-digit code
      const result = await signUpWithEmail(name, email, password);
      if (!result.ok) return showError(result.error || "Could not create your account.");
      setPassword("");
      setOtpType("signup");
      setOtpValues(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setStep("verify_otp");
      toast.info(<LocalizedText text="We sent a 6-digit verification code to your email." />);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpBoxChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...otpValues];
    updated[index] = digit;
    setOtpValues(updated);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpValues[index] && index > 0) {
        const updated = [...otpValues];
        updated[index - 1] = "";
        setOtpValues(updated);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clean = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!clean) return;
    const updated = ["", "", "", "", "", ""];
    for (let i = 0; i < 6; i++) {
      updated[i] = clean[i] || "";
    }
    setOtpValues(updated);
    const nextIdx = Math.min(clean.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const cleanCode = otpValues.join("").trim();
    if (cleanCode.length !== 6) {
      return showError("Please enter all 6 digits of your verification code.");
    }
    setIsVerifyingOtp(true);
    try {
      const result = await verifyEmailOtp(email, cleanCode, otpType);
      if (!result.ok) {
        return showError(result.error || "Invalid or expired verification code.");
      }
      await finishSignIn();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Verification failed. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setAuthError("");
    setIsSubmitting(true);
    try {
      const result = await resendOtp(email, otpType);
      if (!result.ok) return showError(result.error || "Could not resend verification code.");
      setResendCooldown(60);
      toast.success(<LocalizedText text="A fresh 6-digit verification code has been sent." />);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!isEmailValid) return showError("Please enter a valid email address.");
    setIsSubmitting(true);
    try {
      const result = await sendPasswordReset(email);
      if (!result.ok) return showError(result.error || "Could not send password reset email.");
      setStep("reset_sent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const backToEntry = () => {
    setStep("entry");
    setAuthError("");
    setOtpValues(["", "", "", "", "", ""]);
  };

  // Base44 split-screen card layout
  const authCardContent = (
    <div className="flex w-full flex-col justify-between p-6 sm:p-10 lg:w-[48%] xl:w-[46%] lg:p-12 xl:p-14 z-10 overflow-y-auto">
      {/* Top Brand Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
            <svg className="h-5 w-5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="4" />
              <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-30 12 12)" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold tracking-wider text-foreground">AGROSPACE NEXUS</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Earth Observation HUD</span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Form Box */}
      <div className="my-auto py-6 max-w-sm w-full mx-auto">
        {authError && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 animate-in fade-in duration-200">
            <LocalizedText text={authError} />
          </div>
        )}

        {/* STEP 1: ENTRY (Social + Email input) */}
        {step === "entry" && (
          <div className="space-y-5">
            {/* Sign In vs Create Account Mode Switcher */}
            <div className="grid grid-cols-2 rounded-xl bg-slate-900/90 p-1 border border-white/10">
              {(["signin", "signup"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleTabSwitch(mode)}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
                    authMode === mode
                      ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.35)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LocalizedText text={mode === "signin" ? "Sign In" : "Create Account"} />
                </button>
              ))}
            </div>

            <div className="text-left space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                <LocalizedText text={authMode === "signin" ? "Welcome back" : "Create your account"} />
              </h1>
              <p className="text-xs text-muted-foreground">
                <LocalizedText
                  text={
                    authMode === "signin"
                      ? "Sign in to access your satellite telemetry & farm HUD."
                      : "Get real-time orbital intelligence for your crops."
                  }
                />
              </p>
            </div>

            {/* Social OAuth Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* Google OAuth Button */}
              <button
                type="button"
                disabled={loadingOAuth !== null}
                onClick={() => handleSocialOAuth("google")}
                className={`${providerButtonClass} border-white/12 bg-white/[0.05] hover:bg-white/[0.1] text-foreground hover:border-cyan-400/40`}
              >
                <svg aria-hidden="true" className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
                </svg>
                <span className="font-medium text-xs sm:text-sm">
                  <LocalizedText text={loadingOAuth === "google" ? "Opening Google…" : "Continue with Google"} />
                </span>
                {lastUsedProvider === "google" && (
                  <span className="ml-auto rounded-full border border-cyan-400/40 bg-cyan-400/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300">
                    Last Used
                  </span>
                )}
              </button>

              {/* Microsoft OAuth Button */}
              <button
                type="button"
                disabled={loadingOAuth !== null}
                onClick={() => handleSocialOAuth("microsoft")}
                className={`${providerButtonClass} border-white/12 bg-white/[0.05] hover:bg-white/[0.1] text-foreground hover:border-cyan-400/40`}
              >
                <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                <span className="font-medium text-xs sm:text-sm">
                  <LocalizedText text={loadingOAuth === "microsoft" ? "Opening Microsoft…" : "Continue with Microsoft"} />
                </span>
                {lastUsedProvider === "microsoft" && (
                  <span className="ml-auto rounded-full border border-cyan-400/40 bg-cyan-400/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300">
                    Last Used
                  </span>
                )}
              </button>
            </div>

            {/* OR Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <LocalizedText text="Or continue with email" />
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Email Input Step 1 */}
            <form onSubmit={handleContinueWithEmail} className="space-y-3">
              <div>
                <input
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label={emailFieldLabel}
                  placeholder={emailPlaceholder}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={!isEmailValid}
                className={primaryButtonClass(isEmailValid)}
              >
                <LocalizedText text="Continue with email" />
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleTabSwitch(authMode === "signin" ? "signup" : "signin")}
                className="text-xs text-muted-foreground hover:text-cyan-300 transition-colors cursor-pointer"
              >
                {authMode === "signin" ? (
                  <LocalizedText text="Don't have an account? Create account" />
                ) : (
                  <LocalizedText text="Already have an account? Sign in" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PASSWORD / DETAILS STEP */}
        {step === "password" && (
          <div className="space-y-4">
            <div className="text-left space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                <LocalizedText text={authMode === "signin" ? "Enter your password" : "Complete your profile"} />
              </h1>
              <p className="text-xs text-muted-foreground">
                <LocalizedText
                  text={
                    authMode === "signin"
                      ? "Enter your account password to proceed."
                      : "Set a strong password for your AgroSpace account."
                  }
                />
              </p>
            </div>

            {/* Email Chip with Edit Button */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground">Email:</span>
                <span className="font-mono text-xs font-medium text-cyan-300 truncate">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep("entry")}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline px-1 cursor-pointer shrink-0"
              >
                <LocalizedText text="Edit" />
              </button>
            </div>

            <form onSubmit={handleEmailPasswordSubmit} className="space-y-3">
              {authMode === "signup" && (
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label={nameFieldLabel}
                  placeholder={namePlaceholder}
                  className={inputClass}
                />
              )}

              {!(authMode === "signin" && useOtpSignIn) && (
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={authMode === "signup" ? MIN_PASSWORD_LENGTH : 1}
                    maxLength={72}
                    autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label={passwordFieldLabel}
                    placeholder={passwordPlaceholder}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 p-1 text-muted-foreground hover:text-cyan-300 transition-colors cursor-pointer"
                    title={passwordToggleLabel}
                    aria-label={passwordToggleLabel}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      )}
                    </svg>
                  </button>
                </div>
              )}

              {authMode === "signin" && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setUseOtpSignIn((prev) => !prev)}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    <LocalizedText
                      text={
                        useOtpSignIn
                          ? "Use password instead"
                          : "Sign in with 6-digit email code"
                      }
                    />
                  </button>
                  {!useOtpSignIn && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError("");
                        setStep("forgot");
                      }}
                      className="text-muted-foreground hover:text-cyan-300 hover:underline cursor-pointer"
                    >
                      <LocalizedText text="Forgot your password?" />
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmitPasswordStep}
                className={primaryButtonClass(canSubmitPasswordStep)}
              >
                <LocalizedText
                  text={
                    isSubmitting
                      ? "Please wait…"
                      : authMode === "signin"
                        ? useOtpSignIn
                          ? "Send 6-digit code"
                          : "Sign In"
                        : "Create Account & Send Code"
                  }
                />
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  handleTabSwitch(authMode === "signin" ? "signup" : "signin");
                  setStep("entry");
                }}
                className="text-xs text-muted-foreground hover:text-cyan-300 transition-colors cursor-pointer"
              >
                {authMode === "signin" ? (
                  <LocalizedText text="Don't have an account? Create account" />
                ) : (
                  <LocalizedText text="Already have an account? Sign in" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MANDATORY 6-DIGIT EMAIL OTP VERIFICATION */}
        {step === "verify_otp" && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.25)]">
              <svg className="h-6 w-6 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                <LocalizedText text="Verify your email" />
              </h2>
              <p className="text-xs text-muted-foreground">
                <LocalizedText text="We sent a 6-digit verification code to" />{" "}
                <span className="font-mono font-medium text-cyan-300 break-all">{email.trim()}</span>.
                <button
                  type="button"
                  onClick={() => setStep("entry")}
                  className="ml-1 text-cyan-400 hover:text-cyan-300 hover:underline font-semibold cursor-pointer"
                >
                  <LocalizedText text="Edit" />
                </button>
              </p>
            </div>

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 pt-2">
              {/* 6 Individual Numeric OTP Input Boxes */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                {otpValues.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    aria-label={`Digit ${idx + 1} of verification code`}
                    className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-white/15 bg-slate-900/90 text-center font-mono text-xl sm:text-2xl font-bold text-cyan-300 shadow-inner transition-all focus:border-cyan-400 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={otpValues.join("").length !== 6 || isVerifyingOtp}
                className={primaryButtonClass(otpValues.join("").length === 6 && !isVerifyingOtp)}
              >
                <LocalizedText text={isVerifyingOtp ? "Verifying code…" : "Verify & Continue"} />
              </button>

              <div className="flex flex-col gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className="text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {resendCooldown > 0 ? (
                    `Resend code in ${resendCooldown}s`
                  ) : (
                    <LocalizedText text="Didn't get a code? Resend" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={backToEntry}
                  className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors py-1"
                >
                  <LocalizedText text="Use a different email address" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: FORGOT PASSWORD */}
        {step === "forgot" && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="text-left space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                <LocalizedText text="Reset your password" />
              </h2>
              <p className="text-xs text-muted-foreground">
                <LocalizedText text="Enter your email and we'll send you a link to choose a new password." />
              </p>
            </div>
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label={emailFieldLabel}
              placeholder={emailPlaceholder}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={!isEmailValid || isSubmitting}
              className={primaryButtonClass(isEmailValid && !isSubmitting)}
            >
              <LocalizedText text={isSubmitting ? "Sending…" : "Send reset link"} />
            </button>
            <button
              type="button"
              onClick={backToEntry}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground cursor-pointer pt-2"
            >
              <LocalizedText text="Back to sign in" />
            </button>
          </form>
        )}

        {/* STEP 5: RESET SENT CONFIRMATION */}
        {step === "reset_sent" && (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              <LocalizedText text="Check your email" />
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <LocalizedText text="If an account exists for" />{" "}
              <span className="font-mono text-cyan-300 break-all">{email.trim()}</span>,{" "}
              <LocalizedText text="you'll get a link to choose a new password." />
            </p>
            <div className="pt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleForgotSubmit}
                disabled={resendCooldown > 0 || isSubmitting}
                className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-40 cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : <LocalizedText text="Resend email" />}
              </button>
              <button
                type="button"
                onClick={backToEntry}
                className="w-full rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-foreground hover:bg-white/5 cursor-pointer mt-2"
              >
                <LocalizedText text="Go to Sign In" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Security Footer */}
      <div className="pt-4 text-[11px] text-muted-foreground font-mono flex items-center justify-between border-t border-white/5">
        <span className="truncate">NASA-LANCE AG-INTEL READY</span>
        <span className="text-emerald-400 shrink-0">● 256-BIT ENCRYPTION</span>
      </div>
    </div>
  );

  // Right-side orbital / telemetry showcase
  const visualShowcaseContent = (
    <div className="hidden lg:flex relative flex-1 flex-col justify-between overflow-hidden border-l border-white/10 bg-gradient-to-br from-[#060D1E] via-[#09152B] to-[#040814] p-10 xl:p-14 select-none">
      {/* Cosmic background glow and rings */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.18),rgba(255,255,255,0))]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full border border-cyan-500/10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full border border-blue-500/5 pointer-events-none" />

      {/* Top telemetry status pill */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3 py-1 text-xs font-mono text-cyan-300 backdrop-blur-md">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
          ORBITAL TELEMETRY FEED: 41.2° INCLINATION
        </div>
        <div className="text-xs font-mono text-muted-foreground">EO-OPS-CORE-V4.9</div>
      </div>

      {/* Center Showcase Content */}
      <div className="relative z-10 space-y-6 max-w-lg">
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400">MISSION-CRITICAL AGRICULTURE</span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground xl:text-4xl leading-tight">
            Earth observation intelligence for 600+ crop varieties.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Real-time satellite feeds from Sentinel-1, Landsat-9, and NASA LANCE calibrated for plant health, soil moisture, and hyper-local hazard defense.
          </p>
        </div>

        {/* Floating Telemetry Metrics Strip */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3.5 backdrop-blur-md shadow-lg">
            <div className="text-[10px] font-mono text-muted-foreground uppercase">NDVI Vigor</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">0.78</div>
            <div className="text-[10px] text-emerald-400/80">Optimal Vigor</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3.5 backdrop-blur-md shadow-lg">
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Root Moisture</div>
            <div className="text-xl font-bold text-cyan-400 font-mono mt-0.5">38.4%</div>
            <div className="text-[10px] text-cyan-400/80">60m Borewell</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3.5 backdrop-blur-md shadow-lg">
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Active Hazards</div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">0 CRIT</div>
            <div className="text-[10px] text-muted-foreground">Nominal Pass</div>
          </div>
        </div>
      </div>

      {/* Bottom mission badge */}
      <div className="relative z-10 flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4 backdrop-blur-md">
        <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-base font-bold shadow-inner">
          🛰️
        </div>
        <div className="text-xs">
          <div className="font-semibold text-foreground">Global Agro-Climatic Atlas</div>
          <div className="text-muted-foreground mt-0.5">Supporting farmers, agronomists, and planetary scientists worldwide.</div>
        </div>
      </div>
    </div>
  );

  // If rendered as a modal overlay (e.g. from navbar / CommandBar)
  if (onClose) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <div className="relative flex flex-col lg:flex-row w-full max-w-5xl min-h-[580px] rounded-2xl border border-white/15 bg-[#070D1E]/95 shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden text-foreground">
          {authCardContent}
          {visualShowcaseContent}
        </div>
      </div>
    );
  }

  // Standalone full-page route (/login, /signup, /auth)
  return (
    <div className="relative flex flex-col lg:flex-row w-full min-h-[100dvh] bg-[#050914] text-foreground overflow-hidden">
      {authCardContent}
      {visualShowcaseContent}
    </div>
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
        className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-slate-950/80 h-8 px-2 text-left backdrop-blur-xl transition hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] cursor-pointer shrink-0"
      >
        <div
          className="relative flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold text-muted-foreground shadow-inner shrink-0"
          style={{ backgroundColor: user.avatarColor || "#06B6D4" }}
        >
          {initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-slate-950 bg-emerald-400" />
        </div>
        <div className="hidden 2xl:block max-w-[100px] truncate">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-foreground truncate">{user.name}</span>
            <span className="rounded-md bg-cyan-500/20 px-1 py-0.2 text-xs font-mono uppercase text-cyan-300 shrink-0">
              {user.provider}
            </span>
          </div>
        </div>
      </button>

      {/* Quick Account Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-cyan-500/25 bg-slate-950/95 p-4 text-foreground backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
          <div className="border-b border-white/10 pb-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-mono text-emerald-400">
                {<LocalizedText text={"✓ VERIFIED"} />}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-mono text-muted-foreground truncate">{user.email}</p>
            <p className="mt-1 text-xs text-cyan-300">{user.role}</p>
          </div>

          <div className="py-2 space-y-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-foreground hover:bg-white/10 cursor-pointer"
            >
              <span>{<LocalizedText text={"⚙️ Account & Profile Settings"} />}</span>
              <span className="text-muted-foreground">→</span>
            </button>
            <div
              onClick={() => {
                if (onNavigateHome && user.homeLocation) {
                  onNavigateHome(user.homeLocation);
                  setMenuOpen(false);
                }
              }}
              className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-slate-900"
            >
              <div className="font-mono uppercase text-xs text-muted-foreground flex items-center justify-between">
                <span>{<LocalizedText text={"Home Base"} />}</span>
                <span className="text-xs text-cyan-300">{<LocalizedText text={"Lock"} />}</span>
              </div>
              <div className="text-foreground truncate">{user.homeLocation}</div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                {<LocalizedText text={"Default View / Layer"} />}
              </span>
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
            className="mt-2 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/20 cursor-pointer"
          >
            {<LocalizedText text={"Sign Out of Mission Control"} />}
          </button>
        </div>
      )}

      {/* Full Account & Profile Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-xl border border-cyan-500/30 bg-[#0B111E] p-6 sm:p-8 text-foreground shadow-[0_0_60px_rgba(6,182,212,0.2)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {<LocalizedText text={"Operator Account & Settings"} />}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {
                    <LocalizedText
                      text={
                        "Manage your profile name, verified Gmail, and default NASA telemetry settings"
                      }
                    />
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono uppercase text-muted-foreground mb-1">
                    {<LocalizedText text={"Profile Name"} />}
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-foreground focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono uppercase text-muted-foreground mb-1">
                    {<LocalizedText text={"Mission Role / Title"} />}
                  </label>
                  <input
                    type="text"
                    value={formState.role}
                    onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-foreground focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono uppercase text-muted-foreground mb-1">
                  {<LocalizedText text={"Verified Gmail / Account Email ("} />}
                  {formState.provider})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    disabled
                    value={formState.email}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-muted-foreground"
                  />
                  <span className="shrink-0 rounded-xl bg-emerald-500/20 px-3 py-2 font-mono text-xs text-emerald-400">
                    {<LocalizedText text={"✓ Verified"} />}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-mono uppercase text-muted-foreground mb-1">
                  {<LocalizedText text={"Default Home Base Coordinates"} />}
                </label>
                <input
                  type="text"
                  value={formState.homeLocation}
                  onChange={(e) => setFormState({ ...formState, homeLocation: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-foreground focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono uppercase text-muted-foreground mb-1">
                    {<LocalizedText text={"Default Globe Mode"} />}
                  </label>
                  <select
                    value={formState.defaultView}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        defaultView: e.target.value as "3D" | "2D",
                      })
                    }
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-foreground"
                  >
                    <option value="3D">{<LocalizedText text={"3D Orbital Globe"} />}</option>
                    <option value="2D">{<LocalizedText text={"2D Satellite Map"} />}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono uppercase text-muted-foreground mb-1">
                    {<LocalizedText text={"Default NASA Layer"} />}
                  </label>
                  <select
                    value={formState.defaultLayer}
                    onChange={(e) => setFormState({ ...formState, defaultLayer: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-foreground"
                  >
                    <option value="NDVI">{<LocalizedText text={"NDVI Vegetation"} />}</option>
                    <option value="EVI">{<LocalizedText text={"EVI Canopy"} />}</option>
                    <option value="LAI">{<LocalizedText text={"LAI Leaf Index"} />}</option>
                    <option value="ECOSTRESS ESI">
                      {<LocalizedText text={"ECOSTRESS ESI"} />}
                    </option>
                    <option value="SMAP Moisture">
                      {<LocalizedText text={"SMAP Soil Moisture"} />}
                    </option>
                    <option value="GPM Rain">{<LocalizedText text={"GPM Precipitation"} />}</option>
                    <option value="FIRMS Fires">
                      {<LocalizedText text={"FIRMS Thermal Fires"} />}
                    </option>
                    <option value="Smoke AOD">{<LocalizedText text={"Smoke AOD"} />}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <div>
                  <div className="font-semibold text-foreground">
                    {<LocalizedText text={"Gmail Hazard & Drought Alerts"} />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {<LocalizedText text={"Send alerts to "} />}
                    {formState.email}{" "}
                    {<LocalizedText text={" when Cyclone or Drought thresholds trigger"} />}
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
                  className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-foreground hover:bg-white/10 cursor-pointer"
                >
                  {<LocalizedText text={"Cancel"} />}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] cursor-pointer"
                >
                  {<LocalizedText text={"Save Account Changes"} />}
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
