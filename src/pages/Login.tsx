import React, { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Package, Lock, Mail, Phone, Tag, LogOut, ArrowRight, Shield } from "lucide-react";
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

  if (authLoading) return <div className="h-screen bg-[#070b14]" />;

  if (user && !dbUser) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans overflow-auto relative">
        {/* GLOBAL ROUTES NETWORK BACKGROUND OVERLAY */}
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.03] mix-blend-overlay pointer-events-none z-0" 
        />

        {/* Background liquid blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none liquid-blob-1" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none liquid-blob-2" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center relative z-10">
          <div className="w-12 h-12 clay-card-blue flex items-center justify-center mb-4">
            <Package className="text-white w-6 h-6" />
          </div>
          <h2 className="mt-2 text-center text-xl font-display font-bold tracking-tight text-white">
            Complete Your Profile
          </h2>
          <p className="mt-1 text-center text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
            China to Nigeria Cargo Cargo Logistics
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
          <div className="glass-panel py-8 px-6 sm:rounded-2xl sm:px-8 shadow-2xl">
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
                <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-[10px] font-semibold border border-red-500/15">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 bg-[#0d1323] border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Shipping Mark</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={shippingMark}
                    onChange={(e) => setShippingMark(e.target.value)}
                    placeholder="e.g. KENNEDY"
                    className="block w-full pl-9 pr-3 py-2 bg-[#0d1323] border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all uppercase shadow-inner"
                  />
                </div>
              </div>

              <div className="pt-3 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="clay-btn-blue w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? "Saving Profile..." : "Save Profile"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="clay-btn-slate w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
        const role = email.includes("admin") ? "admin" : "client";

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
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans overflow-auto relative">
      {/* GLOBAL ROUTES NETWORK BACKGROUND OVERLAY */}
      <div 
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.03] mix-blend-overlay pointer-events-none z-0" 
      />

      {/* Background liquid blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none liquid-blob-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none liquid-blob-2" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center relative z-10">
        <div className="w-12 h-12 clay-card-blue flex items-center justify-center mb-4 cursor-pointer" onClick={() => navigate("/")}>
          <Package className="text-white w-6 h-6" />
        </div>
        <h2 className="mt-2 text-center text-xl font-display font-extrabold tracking-tight text-white">
          Deep Down Logistics
        </h2>
        <p className="mt-1 text-center text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
          Secure Operator & Client Gateway
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="glass-panel py-8 px-6 sm:rounded-2xl sm:px-8 shadow-2xl relative overflow-hidden">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-[10px] font-semibold border border-red-500/15">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-[#0d1323] border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all shadow-inner"
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 bg-[#0d1323] border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all shadow-inner"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Shipping Mark</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={shippingMark}
                      onChange={(e) => setShippingMark(e.target.value)}
                      placeholder="e.g. SKYFALL"
                      className="block w-full pl-9 pr-3 py-2 bg-[#0d1323] border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all uppercase shadow-inner"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-[#0d1323] border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/10 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="clay-btn-blue w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 liquid-gloss-shine"
              >
                {loading ? "Accessing Core..." : isLogin ? "Sign in to Gateway" : "Initialize Account"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-bold tracking-wide uppercase transition-colors"
            >
              {isLogin ? "Create custom client portal account" : "Back to gateway sign-in"}
            </button>
          </div>

          <div className="mt-8 pt-5 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-extrabold tracking-widest mb-3.5 flex items-center justify-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-500/75" />
              Developer Bypass Console
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMockMode("admin");
                  navigate("/dashboard");
                }}
                className="clay-btn-slate py-2.5 px-3 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all hover:bg-slate-800"
              >
                Admin Gateway
              </button>
              <button
                type="button"
                onClick={() => {
                  setMockMode("client");
                  navigate("/dashboard");
                }}
                className="clay-btn-slate py-2.5 px-3 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all hover:bg-slate-800"
              >
                Client Gateway
              </button>
            </div>
            <p className="mt-3 text-[9px] text-slate-500 italic leading-normal">
              Bypasses network rules to instantly debug operations inside the sandboxed container preview.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
