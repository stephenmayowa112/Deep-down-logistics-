import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Package, Lock, Mail, Phone, Tag, LogOut, ArrowRight, ArrowLeft, Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Role } from "../types";

const SUPER_ADMIN_EMAILS = [
  "stephenmayowa112@gmail.com",
  "eyeretega@gmail.com",
];

function resolveRoleForEmail(email?: string | null): Role {
  if (!email) return "client";
  const normalized = email.toLowerCase().trim();
  if (SUPER_ADMIN_EMAILS.includes(normalized)) {
    return "super_admin";
  }
  if (normalized.includes("admin")) {
    return "admin";
  }
  return "client";
}

export default function Login() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(() => searchParams.get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [shippingMark, setShippingMark] = useState("");
  const [error, setError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const popupInFlightRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") {
      setIsLogin(false);
    } else if (mode === "signin") {
      setIsLogin(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user && dbUser) {
      navigate("/dashboard");
    }
  }, [user, dbUser, authLoading, navigate]);

  useEffect(() => {
    if (user && !dbUser && !shippingMark) {
      const resolved = resolveRoleForEmail(user.email);
      if (resolved === "super_admin" || resolved === "admin") {
        setShippingMark("ADMIN");
      }
    }
  }, [user, dbUser, shippingMark]);

  if (authLoading) return <div className="min-h-dvh bg-[#FFFFFF]" />;

  if (user && !dbUser) {
    return (
      <div className="min-h-dvh bg-[#FFFFFF] text-[#0B1220] flex flex-col font-sans overflow-x-hidden">
        <Helmet>
          <title>Complete Your Profile - Deep Down Logistics</title>
          <meta name="robots" content="noindex" />
        </Helmet>

        <div className="max-w-[1120px] w-full mx-auto px-4 sm:px-8">
          <header className="flex justify-between items-center py-5 sm:py-7">
            <Link
              to="/"
              className="flex items-center gap-3 hover:opacity-85 transition-opacity min-w-0"
            >
              <div className="w-10 h-10 clay-card-blue flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-display font-bold text-base sm:text-lg tracking-[-0.02em] text-[#0B1220] block truncate leading-tight">
                  Deep Down Logistics
                </span>
                <span className="text-[10px] text-[#0A54E1] font-semibold tracking-widest uppercase block">
                  Limited
                </span>
              </div>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4B5565] hover:text-[#0A54E1] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </header>
        </div>

        <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6">
          <div className="sm:mx-auto sm:w-full sm:max-w-[460px]">
            <div className="bg-[#F1F4F9] border border-[#E3E8F0] rounded-[28px] p-6 sm:p-10 shadow-sm">
              <div className="mb-6">
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[#0A54E1] uppercase mb-1.5">
                  FINAL STEP
                </p>
                <h1 className="text-2xl sm:text-[28px] font-bold tracking-[-0.025em] text-[#0B1220]">
                  Complete your profile
                </h1>
                <p className="text-sm text-[#4B5565] mt-1.5">
                  Add your WhatsApp number and shipping mark so we can link your cargo manifests to your account.
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  setError("");
                  const path = `users/${user.uid}`;
                  try {
                    const role = resolveRoleForEmail(user.email);
                    const now = Date.now();
                    await setDoc(doc(db, "users", user.uid), {
                      role,
                      email: (user.email || "").toLowerCase().trim().slice(0, 200),
                      phone_number: phoneNumber.trim().slice(0, 40),
                      shipping_mark: shippingMark.trim().toUpperCase().slice(0, 100),
                      is_verified: true,
                      account_status: "approved",
                      created_at: now,
                      updated_at: now,
                    });
                    navigate("/dashboard");
                  } catch (err: any) {
                    setError(err.message || "Failed to complete profile.");
                    handleFirestoreError(err, OperationType.WRITE, path);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {error && (
                  <div className="bg-red-50 text-red-600 p-3.5 rounded-2xl text-xs font-medium border border-red-200 leading-relaxed">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#0B1220] mb-1.5">
                    WhatsApp / Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Phone className="w-4 h-4 text-[#6B7585]" />
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0803 123 4567"
                      className="block w-full pl-10 pr-4 py-3 min-h-[48px] bg-white border border-[#D5DBE5] rounded-2xl text-base sm:text-sm text-[#0B1220] placeholder-[#6B7585]/70 focus:border-[#0A54E1] focus:outline-none focus:ring-4 focus:ring-[#0A54E1]/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1220] mb-1.5">
                    Shipping Mark
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Tag className="w-4 h-4 text-[#6B7585]" />
                    </div>
                    <input
                      type="text"
                      required
                      value={shippingMark}
                      onChange={(e) => setShippingMark(e.target.value)}
                      placeholder="e.g. KENNEDY"
                      className="block w-full pl-10 pr-4 py-3 min-h-[48px] bg-white border border-[#D5DBE5] rounded-2xl text-base sm:text-sm text-[#0B1220] placeholder-[#6B7585]/70 focus:border-[#0A54E1] focus:outline-none focus:ring-4 focus:ring-[#0A54E1]/15 transition-all uppercase"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-[#6B7585]">
                    Enter the unique mark written on your cartons at our Guangzhou or Yiwu warehouse.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="pill-btn-minimal w-full py-3.5 min-h-[48px] rounded-full bg-[#0A54E1] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer border-0"
                  >
                    {loading ? "Saving profile..." : "Continue to dashboard"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    className="w-full py-3 min-h-[46px] rounded-full bg-white text-[#4B5565] hover:text-[#0B1220] border border-[#D5DBE5] text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatAuthError = (err: any, fallback: string) => {
    const code = err?.code || "";
    switch (code) {
      case "auth/popup-blocked":
        return "Sign-in popup was blocked by your browser. Please allow popups for this site or sign in with email and password.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "Google sign-in was cancelled before completing.";
      case "auth/unauthorized-domain":
        return `The domain "${window.location.hostname}" is not yet authorized in Firebase. Add "${window.location.hostname}" in Firebase Console → Authentication → Settings → Authorized domains (Project: gen-lang-client-0828454544), or sign in with Email & Password below.`;
      case "auth/web-storage-unsupported":
        return "Browser storage is blocked in this context (try opening the app in a new tab or enabling cookies/storage).";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password. If this account was originally created with Google Sign-In, click 'Set / Reset password' below to create a password for your email.";
      case "auth/email-already-in-use":
        return "An account with this email already exists (for example, created via Google Sign-In). Switch to Sign in and click 'Set / Reset password' to create a password for it.";
      case "auth/weak-password":
        return "Password should be at least 6 characters long.";
      default:
        return err?.message || fallback;
    }
  };

  const handleSendPasswordSetup = async (targetEmail?: string) => {
    const emailToUse = (targetEmail ?? email).trim();
    setError("");
    setResetSuccess("");
    if (!emailToUse) {
      setError("Please enter your email address (e.g. stephenmayowa112@gmail.com) in the Email field first, then click Set / Reset password.");
      return;
    }
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, emailToUse);
      setResetSuccess(
        `A password creation / reset link has been sent to ${emailToUse}. Open the link in your email (check Inbox and Spam) to set your password, then sign in below.`
      );
    } catch (err: any) {
      setError(formatAuthError(err, "Could not send password setup email."));
    } finally {
      setSendingReset(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (popupInFlightRef.current || loading) return;
    popupInFlightRef.current = true;
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (err: any) {
      if (!auth.currentUser) {
        setError(formatAuthError(err, "Google sign-in failed."));
      }
    } finally {
      popupInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const role = resolveRoleForEmail(email);
        const now = Date.now();
        const fallbackMark = role === "super_admin" ? "SUPER ADMIN" : role === "admin" ? "ADMIN" : "CLIENT";

        await setDoc(doc(db, "users", userCredential.user.uid), {
          role,
          email: email.toLowerCase().trim().slice(0, 200),
          phone_number: phoneNumber.trim().slice(0, 40),
          shipping_mark: (shippingMark.trim().toUpperCase() || fallbackMark).slice(0, 100),
          is_verified: true,
          account_status: "approved",
          created_at: now,
          updated_at: now,
        });

        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(formatAuthError(err, "Authentication failed."));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setError("");
    setResetSuccess("");
  };

  return (
    <div className="min-h-dvh bg-[#FFFFFF] text-[#0B1220] flex flex-col font-sans selection:bg-[#0A54E1]/15 selection:text-[#0A54E1] overflow-x-hidden">
      <Helmet>
        <title>{isLogin ? "Sign In - Deep Down Logistics" : "Client Sign Up - Deep Down Logistics"}</title>
        <meta
          name="description"
          content="Sign in or create your client account at Deep Down Logistics to manage manifests, track your consolidated cargo, and receive WhatsApp updates."
        />
        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* Top Header */}
      <div className="max-w-[1120px] w-full mx-auto px-4 sm:px-8">
        <header className="flex justify-between items-center py-5 sm:py-7">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-85 transition-opacity min-w-0"
          >
            <div className="w-10 h-10 clay-card-blue flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-base sm:text-lg tracking-[-0.02em] text-[#0B1220] block truncate leading-tight">
                Deep Down Logistics
              </span>
              <span className="text-[10px] text-[#0A54E1] font-semibold tracking-widest uppercase block">
                Limited
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4B5565] hover:text-[#0A54E1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </header>
      </div>

      {/* Main Auth Section */}
      <main className="flex-1 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 relative">
        <div className="sm:mx-auto sm:w-full sm:max-w-[460px]">
          <div className="rise bg-[#F1F4F9] border border-[#E3E8F0] rounded-[28px] p-6 sm:p-10">
            {/* Segmented Mode Switcher */}
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="grid grid-cols-2 p-1.5 bg-white rounded-full border border-[#D5DBE5] mb-7"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isLogin}
                onClick={() => switchMode(true)}
                className={`py-2.5 px-4 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  isLogin
                    ? "bg-[#0A54E1] text-white shadow-sm"
                    : "text-[#4B5565] hover:text-[#0B1220]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isLogin}
                onClick={() => switchMode(false)}
                className={`py-2.5 px-4 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  !isLogin
                    ? "bg-[#0A54E1] text-white shadow-sm"
                    : "text-[#4B5565] hover:text-[#0B1220]"
                }`}
              >
                Client sign up
              </button>
            </div>

            {/* Dynamic Heading */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-[28px] font-bold tracking-[-0.025em] text-[#0B1220]">
                {isLogin ? "Sign in to your account" : "Client sign up"}
              </h1>
              <p className="text-sm text-[#4B5565] mt-1">
                {isLogin
                  ? "View your manifests, shipping marks, and live cargo status."
                  : "Create your client account to track shipments and receive WhatsApp updates."}
              </p>
            </div>

            {/* Google Sign-In UI hidden for now (toggle SHOW_GOOGLE_SIGN_IN to re-enable) */}
            {false && isLogin && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 min-h-[48px] px-4 bg-white hover:bg-[#F8FAFC] text-[#0B1220] border border-[#D5DBE5] rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                    <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.13H1.05v3.14C3.06 21.17 7.21 24 12 24Z" />
                    <path fill="#FBBC05" d="M5.03 14.04c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.18H1.05C.38 7.52 0 9.02 0 10.68s.38 3.16 1.05 4.5l3.98-1.14Z" />
                    <path fill="#EA4335" d="M12 4.75c1.79 0 3.4.62 4.67 1.82l3.5-3.5C18.07 1.19 15.3 0 12 0 7.21 0 3.06 2.83 1.05 6.86l3.98 3.14c.98-2.94 3.73-5.25 6.97-5.25Z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E3E8F0]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#F1F4F9] px-3 text-[#6B7585] font-medium tracking-wider">
                      or with email
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Email & Password Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 text-red-600 p-3.5 rounded-2xl text-xs font-medium border border-red-200 leading-relaxed space-y-2">
                  <div>{error}</div>
                  {email.trim() && (
                    <button
                      type="button"
                      disabled={sendingReset}
                      onClick={() => handleSendPasswordSetup(email)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A54E1] hover:underline cursor-pointer bg-transparent border-0 p-0"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {sendingReset ? "Sending link..." : `Send password setup link to ${email.trim()}`}
                    </button>
                  )}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-2xl text-xs font-medium border border-emerald-200 leading-relaxed flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>{resetSuccess}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0B1220] mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-[#6B7585]" />
                  </div>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full pl-10 pr-4 py-3 min-h-[48px] bg-white border border-[#D5DBE5] rounded-2xl text-base sm:text-sm text-[#0B1220] placeholder-[#6B7585]/70 focus:border-[#0A54E1] focus:outline-none focus:ring-4 focus:ring-[#0A54E1]/15 transition-all"
                  />
                </div>
              </div>

              {!isLogin && (
                <>
                  {SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim()) && (
                    <div className="bg-indigo-50 text-indigo-800 p-3 rounded-2xl text-xs font-medium border border-indigo-200">
                      Super Admin email detected (<strong>{email.toLowerCase().trim()}</strong>). This account will be created with full <strong>Super Admin</strong> privileges.
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#0B1220] mb-1.5">
                      WhatsApp / Phone Number{" "}
                      {SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim()) && (
                        <span className="text-[#6B7585] font-normal">(optional for Super Admin)</span>
                      )}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="w-4 h-4 text-[#6B7585]" />
                      </div>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required={!SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim())}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 0803 123 4567"
                        className="block w-full pl-10 pr-4 py-3 min-h-[48px] bg-white border border-[#D5DBE5] rounded-2xl text-base sm:text-sm text-[#0B1220] placeholder-[#6B7585]/70 focus:border-[#0A54E1] focus:outline-none focus:ring-4 focus:ring-[#0A54E1]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0B1220] mb-1.5">
                      Shipping Mark / Display Name{" "}
                      {SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim()) && (
                        <span className="text-[#6B7585] font-normal">(defaults to SUPER ADMIN)</span>
                      )}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Tag className="w-4 h-4 text-[#6B7585]" />
                      </div>
                      <input
                        type="text"
                        required={!SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim())}
                        value={shippingMark}
                        onChange={(e) => setShippingMark(e.target.value)}
                        placeholder={
                          SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim())
                            ? "SUPER ADMIN"
                            : "e.g. SKYFALL"
                        }
                        className="block w-full pl-10 pr-4 py-3 min-h-[48px] bg-white border border-[#D5DBE5] rounded-2xl text-base sm:text-sm text-[#0B1220] placeholder-[#6B7585]/70 focus:border-[#0A54E1] focus:outline-none focus:ring-4 focus:ring-[#0A54E1]/15 transition-all uppercase"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-[#6B7585]">
                      The unique mark written on your cartons at our Guangzhou or Yiwu warehouse.
                    </p>
                  </div>
                </>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#0B1220]">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      disabled={sendingReset}
                      onClick={() => handleSendPasswordSetup()}
                      className="text-xs font-semibold text-[#0A54E1] hover:underline cursor-pointer bg-transparent border-0 p-0"
                    >
                      {sendingReset ? "Sending link..." : "Set / Reset password?"}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-[#6B7585]" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? "Enter your password" : "Create a password (min. 6 chars)"}
                    className="block w-full pl-10 pr-11 py-3 min-h-[48px] bg-white border border-[#D5DBE5] rounded-2xl text-base sm:text-sm text-[#0B1220] placeholder-[#6B7585]/70 focus:border-[#0A54E1] focus:outline-none focus:ring-4 focus:ring-[#0A54E1]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7585] hover:text-[#0B1220] cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="pill-btn-minimal w-full py-3.5 min-h-[50px] rounded-full bg-[#0A54E1] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  {loading
                    ? isLogin
                      ? "Signing in..."
                      : "Creating account..."
                    : isLogin
                    ? "Sign in"
                    : "Client sign up"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Bottom Mode Toggle */}
            <div className="mt-6 text-center text-sm text-[#4B5565]">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode(false)}
                    className="font-semibold text-[#0A54E1] hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    Client sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode(true)}
                    className="font-semibold text-[#0A54E1] hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            {/* Legal & Contact Footer Links */}
            <div className="mt-6 pt-5 border-t border-[#E3E8F0] flex flex-wrap items-center justify-center gap-4 text-xs text-[#6B7585]">
              <Link to="/contact" className="hover:text-[#0A54E1] transition-colors">
                Contact Us
              </Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-[#0A54E1] transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-[#0A54E1] transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
