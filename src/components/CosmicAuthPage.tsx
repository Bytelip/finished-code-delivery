import React, { useEffect, useState } from "react";
import {
  MIN_PASSWORD_LENGTH,
  fetchSignedInProfile,
  resendConfirmation,
  sendPasswordReset,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
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
// ==========================================
// 3. LOGIN / SIGNUP + 6-DIGIT EMAIL OTP MODAL
// ==========================================
export interface CosmicAuthPageProps {
  onAuthComplete?: (user: UserProfile) => void;
  onSuccess?: (user: UserProfile) => void;
  onClose?: () => void;
  initialMode?: "signin" | "signup";
}

type AuthStep = "entry" | "check_email" | "forgot" | "reset_sent";

const inputClass =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:border-cyan-400 focus:outline-none";
const providerButtonClass =
  "relative flex min-h-11 w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition disabled:opacity-50 cursor-pointer";
const primaryButtonClass = (enabled: boolean) =>
  `w-full rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer ${
    enabled
      ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:brightness-110"
      : "cursor-not-allowed bg-white/15 text-muted-foreground"
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
  const namePlaceholder = useLocalizedValue("Your name (e.g., Naren Kumar)");
  const emailPlaceholder = useLocalizedValue("Enter your email address");
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
  const canSubmit =
    isEmailValid && isPasswordValid && (authMode === "signin" || isNameValid) && !isSubmitting;

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

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (authMode === "signin") {
        const result = await signInWithEmail(email, password);
        if (!result.ok) return showError(result.error || "Wrong email or password.");
        await finishSignIn();
        return;
      }
      const result = await signUpWithEmail(name, email, password);
      if (!result.ok) return showError(result.error || "Could not create your account.");
      if (result.needsConfirmation) {
        setPassword("");
        setResendCooldown(45);
        setStep("check_email");
        return;
      }
      await finishSignIn();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setAuthError("");
    setIsSubmitting(true);
    try {
      const result = await resendConfirmation(email);
      if (!result.ok) return showError(result.error || "Could not resend the email.");
      setResendCooldown(45);
      toast.success(<LocalizedText text="Confirmation email sent again" />);
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
      if (!result.ok) return showError(result.error || "Could not send the reset email.");
      setStep("reset_sent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const backToEntry = () => {
    setStep("entry");
    setAuthError("");
  };

  return (
    <CosmicParallaxBg head="AGROSPACE NEXUS" text="ORBITAL TELEMETRY, EARTH INTELLIGENCE">
      <div className="relative my-4 max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto rounded-xl border border-white/15 bg-[#0B111E]/90 p-4 sm:mx-auto sm:p-8 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.16)] text-foreground">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground cursor-pointer"
          >
            ✕
          </button>
        )}

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-400/30 bg-gradient-to-b from-cyan-500/20 to-blue-600/10 shadow-[0_0_25px_rgba(34,211,238,0.25)]">
          <svg className="h-7 w-7 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="4" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-30 12 12)" />
          </svg>
        </div>

        {authError && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <p>
              <LocalizedText text={authError} />
            </p>
          </div>
        )}

        {step === "entry" && (
          <>
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-900/90 p-1 border border-white/10">
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

            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                <LocalizedText text={authMode === "signin" ? "Sign in to AgroSpace" : "Create your AgroSpace account"} />
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                <LocalizedText
                  text={
                    authMode === "signin"
                      ? "Use the account you signed up with"
                      : "Your farm profile and map settings are saved to your account"
                  }
                />
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={loadingOAuth !== null}
                onClick={() => handleSocialOAuth("google")}
                className={`${providerButtonClass} border-[#8E918F] bg-[#131314] text-[#E3E3E3] hover:brightness-125`}
              >
                <svg aria-hidden="true" className="absolute left-4 h-[18px] w-[18px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                <span>
                  <LocalizedText text={loadingOAuth === "google" ? "Opening Google…" : "Continue with Google"} />
                </span>
              </button>

              <button
                type="button"
                disabled={loadingOAuth !== null}
                onClick={() => handleSocialOAuth("microsoft")}
                className={`${providerButtonClass} border-white/12 bg-white/[0.06] text-foreground hover:border-cyan-400/40 hover:bg-white/[0.11]`}
              >
                <svg aria-hidden="true" className="absolute left-4 h-4 w-4" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                <span>
                  <LocalizedText text={loadingOAuth === "microsoft" ? "Opening Microsoft…" : "Continue with Microsoft"} />
                </span>
              </button>

              <button
                type="button"
                disabled={loadingOAuth !== null}
                onClick={() => handleSocialOAuth("apple")}
                className={`${providerButtonClass} border-white bg-white font-[system-ui] text-black hover:brightness-95`}
              >
                <span>
                  {loadingOAuth === "apple" ? "Opening Apple…" : "Continue with Apple"}
                </span>
              </button>
            </div>

            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-medium text-muted-foreground">
                <LocalizedText text="Or" />
              </span>
              <div className="h-px flex-1 bg-white/10" />
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

              {authMode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError("");
                      setStep("forgot");
                    }}
                    className="text-xs font-medium text-cyan-300 hover:underline cursor-pointer"
                  >
                    <LocalizedText text="Forgot password?" />
                  </button>
                </div>
              )}

              <button type="submit" disabled={!canSubmit} className={primaryButtonClass(canSubmit)}>
                <LocalizedText
                  text={
                    isSubmitting
                      ? "Please wait…"
                      : authMode === "signin"
                        ? "Sign In"
                        : "Create Account"
                  }
                />
              </button>
            </form>
          </>
        )}

        {step === "check_email" && (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              <LocalizedText text="Check your email" />
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              <LocalizedText text="We sent a confirmation link to" />{" "}
              <span className="font-mono text-cyan-300 break-all">{email.trim()}</span>.{" "}
              <LocalizedText text="Open it to finish creating your account, then sign in." />
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isSubmitting}
                className="min-h-11 rounded-xl border border-white/12 text-sm font-medium text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : <LocalizedText text="Resend email" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleTabSwitch("signin");
                  backToEntry();
                }}
                className="min-h-11 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <LocalizedText text="Back to sign in" />
              </button>
            </div>
          </div>
        )}

        {step === "forgot" && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">
                <LocalizedText text="Reset your password" />
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
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
            <button type="submit" disabled={!isEmailValid || isSubmitting} className={primaryButtonClass(isEmailValid && !isSubmitting)}>
              <LocalizedText text={isSubmitting ? "Sending…" : "Send reset link"} />
            </button>
            <button type="button" onClick={backToEntry} className="w-full min-h-11 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <LocalizedText text="Back to sign in" />
            </button>
          </form>
        )}

        {step === "reset_sent" && (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              <LocalizedText text="Check your email" />
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              <LocalizedText text="If an account exists for" />{" "}
              <span className="font-mono text-cyan-300 break-all">{email.trim()}</span>,{" "}
              <LocalizedText text="you'll get a link to choose a new password." />
            </p>
            <button type="button" onClick={backToEntry} className="mt-5 w-full min-h-11 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <LocalizedText text="Back to sign in" />
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          <LocalizedText text="By continuing, you agree to our Terms of Service and Privacy Policy." />
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
