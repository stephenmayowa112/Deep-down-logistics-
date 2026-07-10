import React, { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { user, dbUser, loading: authLoading, setMockMode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [shippingMark, setShippingMark] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && dbUser) {
      navigate("/dashboard");
    }
  }, [user, dbUser, authLoading, navigate]);

  if (authLoading) return <div className="h-screen bg-neutral-50" />;

  if (user && !dbUser) {
    return (
      <div className="h-full bg-[#0f172a] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans overflow-auto">
        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Package className="text-white w-6 h-6" />
          </div>
          <h2 className="mt-2 text-center text-xl font-semibold tracking-tight text-white">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-[10px] text-slate-500">
            Please provide your details to continue.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-[#1e293b] py-6 px-4 shadow-sm sm:rounded-xl sm:px-8 border border-slate-800">
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError("");
              try {
                const role = user.email?.includes("admin") ? "admin" : "client";
                await setDoc(doc(db, "users", user.uid), {
                  role,
                  phone_number: phoneNumber,
                  shipping_mark: shippingMark.toUpperCase(),
                  is_verified: true,
                });
                navigate("/dashboard");
              } catch (err: any) {
                setError(err.message || "Failed to complete profile.");
              } finally {
                setLoading(false);
              }
            }}>
              {error && (
                <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-[10px] font-medium border border-red-500/20">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Phone Number</label>
                <div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-slate-700 bg-[#0f172a] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Shipping Mark</label>
                <div>
                  <input
                    type="text"
                    required
                    value={shippingMark}
                    onChange={(e) => setShippingMark(e.target.value)}
                    placeholder="e.g. BIGFISH"
                    className="block w-full appearance-none rounded-md border border-slate-700 bg-[#0f172a] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-md bg-blue-600 py-2 px-4 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1e293b] disabled:opacity-50 transition-colors"
                >
                  {loading ? "Saving..." : "Save Profile"}
                </button>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="flex w-full justify-center rounded-md bg-transparent border border-slate-700 py-2 px-4 text-xs font-medium text-slate-300 hover:bg-slate-800 focus:outline-none transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
        
        // Auto-assign admin if it matches a specific secret pattern or just client
        const role = email.includes("admin") ? "admin" : "client";

        // Create user document
        await setDoc(doc(db, "users", userCredential.user.uid), {
          role,
          phone_number: phoneNumber,
          shipping_mark: shippingMark.toUpperCase(),
          is_verified: true,
        });
        
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-[#0f172a] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans overflow-auto">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
          <Package className="text-white w-6 h-6" />
        </div>
        <h2 className="mt-2 text-center text-xl font-semibold tracking-tight text-white">
          Deep Down Logistics
        </h2>
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Sign in to track your shipments or manage operations.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-[#1e293b] py-6 px-4 shadow-sm sm:rounded-xl sm:px-8 border border-slate-800">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-[10px] font-medium border border-red-500/20">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">Email address</label>
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-slate-700 bg-[#0f172a] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Phone Number</label>
                  <div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="block w-full appearance-none rounded-md border border-slate-700 bg-[#0f172a] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Shipping Mark</label>
                  <div>
                    <input
                      type="text"
                      required
                      value={shippingMark}
                      onChange={(e) => setShippingMark(e.target.value)}
                      placeholder="e.g. BIGFISH"
                      className="block w-full appearance-none rounded-md border border-slate-700 bg-[#0f172a] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">Password</label>
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-slate-700 bg-[#0f172a] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-blue-600 py-2 px-4 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1e293b] disabled:opacity-50 transition-colors"
              >
                {loading ? "Please wait..." : isLogin ? "Sign in" : "Create Account"}
              </button>
            </div>
          </form>

          <div className="mt-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-[10px] text-blue-400 hover:text-blue-300 font-medium"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2.5">⚡ Quick Test Bypass</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMockMode("admin");
                  navigate("/dashboard");
                }}
                className="py-2 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-md border border-blue-500/20 text-[10px] font-semibold tracking-wide transition-all uppercase"
              >
                Login as Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setMockMode("client");
                  navigate("/dashboard");
                }}
                className="py-2 px-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-md border border-emerald-500/20 text-[10px] font-semibold tracking-wide transition-all uppercase"
              >
                Login as Client
              </button>
            </div>
            <p className="mt-2 text-[9px] text-slate-500 italic">
              Guaranteed local access to fully test both portals without Firebase configuration limits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
