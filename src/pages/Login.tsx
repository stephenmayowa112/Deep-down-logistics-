import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { Package, Lock, Mail, Phone, Tag, LogOut, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const ADMIN_EMAILS = ["stephenmayowa112@gmail.com"];

function resolveRoleForEmail(email?: string | null): "admin" | "client" {
  if (!email) return "client";
  const normalized = email.toLowerCase().trim();
  if (ADMIN_EMAILS.includes(normalized) || normalized.includes("admin")) {
    return "admin";
  }
  return "client";
}

export default function Login() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [shippingMark, setShippingMark] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const popupInFlightRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && dbUser) {
      navigate("/dashboard");
    }
  }, [user, dbUser, authLoading, navigate]);

  useEffect(() => {
    if (user && !dbUser && resolveRoleForEmail(user.email) === "admin" && !shippingMark) {
      setShippingMark("ADMIN");
    }
  }, [user, dbUser, shippingMark]);

  if (authLoading) return <div className="min-h-dvh bg-slate-50" />;

  if (user && !dbUser) {
    return (
      <div className="min-h-dvh bg-slate-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-x-clip relative">
        <Helmet>
          <title>Complete Profile - Deep Down Logistics</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.03] mix-blend-overlay pointer-events-none z-0"
        />

        <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none liquid-blob-1" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none liquid-blob-2" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center relative z-10">
          <Link to="/" className="flex flex-col items-center group">
            <div className="w-12 h-12 clay-card-blue flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform duration-300">
              <Package className="text-white w-6 h-6" />
            </div>
            <h2 className="mt-1 text-center text-xl font-display font-bold tracking-tight text-slate-900 group-hover:text-blue-400 transition-colors">
              Complete Your Profile
            </h2>
          </Link>
          <p className="mt-1 text-center text-xs text-slate-500 tracking-wider uppercase font-semibold">
            China to Nigeria Cargo Logistics
          </p>
        </div>

        <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="glass-panel py-6 px-5 sm:py-8 sm:px-8 rounded-2xl shadow-2xl">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError("");
                const path = `users/${user.uid}`;
                try {
                  const role = resolveRoleForEmail(user.email);
                  await setDoc(doc(db, "users", user.uid), {
                    role,
                    phone_number: phoneNumber.trim(),
                    shipping_mark: shippingMark.trim().toUpperCase(),
                    is_verified: true,
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
                <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-xs font-semibold border border-red-500/15">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 08031234567"
                    className="block w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Shipping Mark</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={shippingMark}
                    onChange={(e) => setShippingMark(e.target.value)}
                    placeholder="e.g. KENNEDY"
                    className="block w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all uppercase shadow-inner"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="clay-btn-blue w-full py-2.5 min-h-[44px] rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? "Saving Profile..." : "Save Profile"}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="clay-btn-slate w-full py-2.5 min-h-[44px] rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </form>
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
        return "This domain is not authorized for Google Sign-In in Firebase Console.";
      case "auth/web-storage-unsupported":
        return "Browser storage is blocked in this context (try opening the app in a new tab or enabling cookies/storage).";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      default:
        return err?.message || fallback;
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
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const role = resolveRoleForEmail(email);

        await setDoc(doc(db, "users", userCredential.user.uid), {
          role,
          phone_number: phoneNumber.trim(),
          shipping_mark: shippingMark.trim().toUpperCase(),
          is_verified: true,
        });

        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(formatAuthError(err, "Authentication failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-x-clip relative">
      <Helmet>
        <title>Login / Register - Deep Down Logistics</title>
        <meta name="description" content="Access your personalized client dashboard at Deep Down Logistics to manage manifests, track your consolidated cargo, and estimate costs." />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <div
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.03] mix-blend-overlay pointer-events-none z-0"
      />

      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none liquid-blob-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none liquid-blob-2" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center relative z-10">
        <Link to="/" className="flex flex-col items-center group">
          <div className="w-12 h-12 clay-card-blue flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform duration-300">
            <Package className="text-white w-6 h-6" />
          </div>
          <h2 className="mt-1 text-center text-xl font-display font-extrabold tracking-tight text-slate-900 group-hover:text-blue-400 transition-colors">
            Deep Down Logistics
          </h2>
        </Link>
        <p className="mt-1 text-center text-xs text-slate-500 uppercase tracking-widest font-semibold">
          Secure Operator & Client Gateway
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-6 px-5 sm:py-8 sm:px-8 rounded-2xl shadow-2xl relative overflow-hidden">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-xs font-semibold border border-red-500/15">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all shadow-inner"
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 08031234567"
                      className="block w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all shadow-inner"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Shipping Mark</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={shippingMark}
                      onChange={(e) => setShippingMark(e.target.value)}
                      placeholder="e.g. SKYFALL"
                      className="block w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all uppercase shadow-inner"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-lg text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="clay-btn-blue w-full py-2.5 min-h-[44px] rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 liquid-gloss-shine"
              >
                {loading ? "Accessing Core..." : isLogin ? "Sign in to Gateway" : "Initialize Account"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-4">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/80 px-2 text-slate-400 font-semibold tracking-wider">Or</span>
              </div>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 min-h-[44px] px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.13H1.05v3.14C3.06 21.17 7.21 24 12 24Z" />
                <path fill="#FBBC05" d="M5.03 14.04c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.18H1.05C.38 7.52 0 9.02 0 10.68s.38 3.16 1.05 4.5l3.98-1.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.79 0 3.4.62 4.67 1.82l3.5-3.5C18.07 1.19 15.3 0 12 0 7.21 0 3.06 2.83 1.05 6.86l3.98 3.14c.98-2.94 3.73-5.25 6.97-5.25Z" />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="min-h-[44px] inline-flex items-center justify-center px-3 text-xs text-blue-600 hover:text-blue-700 font-bold tracking-wide uppercase transition-colors"
            >
              {isLogin ? "Create custom client portal account" : "Back to gateway sign-in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
