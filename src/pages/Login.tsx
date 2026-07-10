import { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { user, dbUser, loading: authLoading } = useAuth();
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
        </div>
      </div>
    </div>
  );
}
