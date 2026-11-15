import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Package, MapPin, Box, PlaneTakeoff, Container, 
  Search, 
  Plane, 
  Ship, 
  Warehouse, 
  FileText, 
  ArrowRight, 
  Calculator, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  Info,
  Menu,
  X
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState("");
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estimator State
  const [length, setLength] = useState<number>(40);
  const [width, setWidth] = useState<number>(40);
  const [height, setHeight] = useState<number>(40);
  const [cartons, setCartons] = useState<number>(8);
  const [freightType, setFreightType] = useState<"sea" | "air">("sea");
  const [rateUsd, setRateUsd] = useState<number>(0);
  const [rateNgn, setRateNgn] = useState<number>(0);
  const [settings, setSettings] = useState<any>({ exchangeRateUsdNgn: 1500, seaFreightRateUsd: 180, seaClearingRateNgn: 300000, airFreightRateUsd: 8, airClearingRateNgn: 15000 });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "pricing"),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      },
      (err) => {
        console.error("Failed to subscribe to pricing settings:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (freightType === "sea") {
      setRateUsd(settings.seaFreightRateUsd);
      setRateNgn(settings.seaClearingRateNgn);
    } else {
      setRateUsd(settings.airFreightRateUsd);
      setRateNgn(settings.airClearingRateNgn);
    }
  }, [freightType, settings]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) {
      setError("Please enter a tracking ID");
      return;
    }
    setError("");
    navigate(`/track/${trackingId.trim().toUpperCase()}`);
  };

  // Estimator Calculations
  const calculatedCbm = ((length * width * height) / 1000000) * cartons;
  const airVolumetricWeight = ((length * width * height) / 5000) * cartons; // Air division ratio standard
  const recommendedMode = calculatedCbm > 1.2 || cartons > 12 ? "Sea Freight" : "Air Freight";
  
  const estimatedCostUsd = freightType === "sea" 
    ? calculatedCbm * rateUsd 
    : airVolumetricWeight * rateUsd;

  const estimatedCostNgn = freightType === "sea" 
    ? calculatedCbm * rateNgn 
    : airVolumetricWeight * rateNgn;

  return (
    <div className="min-h-screen bg-blue-50 text-slate-700 font-sans flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      <Helmet>
        <title>Deep Down Logistics - China to Lagos Air & Ocean Cargo Tracking</title>
        <meta name="description" content="Deep Down Logistics provides express air cargo and economical ocean freight from Guangzhou, China to Lagos, Nigeria. Track your cargo, view shipping manifests, and manage container logistics live." />
        <meta name="keywords" content="China to Nigeria shipping, Guangzhou to Lagos cargo, air freight Lagos, ocean container shipping Apapa, cargo tracking, shipping manifest, CBM calculator, logistics portal" />
        <link rel="canonical" href="https://ais-pre-3sakkjp7mhx3nmrgvewgs5-556021110533.europe-west2.run.app/" />
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "LogisticsService",
              "name": "Deep Down Logistics",
              "image": "https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1920&q=80",
              "description": "Express air cargo and economical ocean freight from Guangzhou, China to Lagos, Nigeria.",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "B77 PLAZA A.P.T. TRADEFAIR INTERNATIONAL MARKET, BADAGRY EXPRESS WAY",
                "addressLocality": "Lagos",
                "addressCountry": "NG"
              },
              "telephone": "+86 13048001610",
              "url": "https://ais-pre-3sakkjp7mhx3nmrgvewgs5-556021110533.europe-west2.run.app/"
            }
          `}
        </script>
      </Helmet>
      
      {/* GLOBAL ROUTES NETWORK BACKGROUND OVERLAY */}
      <div 
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.03] mix-blend-overlay pointer-events-none z-0" 
      />

      {/* BACKGROUND LIQUID GLASS AMBIENT BLOBS */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none liquid-blob-1" />
      <div className="absolute top-[30%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none liquid-blob-2" />
      <div className="absolute bottom-[10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-emerald-500/5 blur-[110px] pointer-events-none liquid-blob-3" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-blue-50/95 border-b border-blue-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 clay-card-blue flex items-center justify-center shadow-lg">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="font-display font-bold text-sm sm:text-base tracking-tight text-slate-900 whitespace-nowrap">
              Deep Down Logistics
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <a href="#services" className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">
              Services
            </a>
            <a href="#estimator" className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">
              CBM Estimator
            </a>
            <a href="#how-it-works" className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">
              How It Works
            </a>
            <a href="#contact" className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">
              Offices
            </a>
            <Link 
              to="/login" 
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors border-l border-slate-200 pl-6 whitespace-nowrap"
            >
              Portal Login
            </Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="clay-btn-blue px-3.5 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all liquid-gloss-shine whitespace-nowrap"
            >
              <span className="hidden xs:inline sm:inline">Access Portal</span>
              <span className="xs:hidden sm:hidden">Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-blue-100 bg-white/95 backdrop-blur-xl px-4 py-3 space-y-1 shadow-lg">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            >
              Services
            </a>
            <a
              href="#estimator"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            >
              CBM Estimator
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            >
              How It Works
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            >
              Offices & Hubs
            </a>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              Portal Login
            </Link>
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-grow relative z-10">
        
        {/* Banner Announcement & Search Panel */}
        <section className="relative pt-8 pb-14 sm:pt-12 sm:pb-24 overflow-hidden bg-blue-100">
          
          {/* BACKGROUND MOTION NETWORK PATTERNS */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Floating particles or logistics icons */}
            <motion.div 
              animate={{ 
                x: [0, 40, -20, 0], 
                y: [0, -30, 20, 0],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[15%] left-[5%] text-blue-500/10"
            >
              <Plane className="w-16 h-16" />
            </motion.div>

            <motion.div 
              animate={{ 
                x: [0, -30, 30, 0], 
                y: [0, 40, -20, 0],
                rotate: [0, -15, 15, 0]
              }}
              transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[50%] right-[10%] text-indigo-500/10"
            >
              <Ship className="w-24 h-24" />
            </motion.div>

            <motion.div 
              animate={{ 
                x: [0, 25, -25, 0], 
                y: [0, 30, -30, 0],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[10%] left-[25%] text-emerald-500/10"
            >
              <Package className="w-12 h-12" />
            </motion.div>

            <motion.div 
              animate={{ 
                scale: [1, 1.15, 0.9, 1],
                opacity: [0.03, 0.08, 0.05, 0.03]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[30%] left-[45%] w-96 h-96 rounded-full bg-blue-500/15 blur-[100px]"
            />

            <motion.div 
              animate={{ 
                scale: [0.9, 1.1, 0.95, 0.9],
                opacity: [0.04, 0.09, 0.04, 0.04]
              }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[10%] right-[30%] w-80 h-80 rounded-full bg-indigo-500/15 blur-[90px]"
            />

            {/* Dynamic animated routing line */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <motion.path 
                d="M -100 150 Q 300 80, 600 300 T 1200 100 T 2000 250" 
                fill="none" 
                stroke="white" 
                strokeWidth="2" 
                strokeDasharray="6, 6"
                animate={{ strokeDashoffset: [0, -60] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
              <motion.path 
                d="M 100 400 Q 500 500, 900 250 T 1800 450" 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="1.5" 
                strokeDasharray="5, 5"
                animate={{ strokeDashoffset: [0, 50] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <div className="text-center mb-6 sm:mb-10">
              <p className="text-xs font-semibold tracking-wider uppercase text-blue-700">
                Guangzhou, China · Lagos, Nigeria · Express Cargo Delivery
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Headings & Tracking glass block */}
              <div className="lg:col-span-6 space-y-5 sm:space-y-6 text-center lg:text-left">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold text-slate-900 tracking-tight leading-tight text-balance">
                  Guangzhou to Lagos <br className="hidden sm:inline" />
                  <span className="text-blue-700">
                    Cargo Shipping Made Simple
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Consolidate, measure, and track your air cargo or sea freight from our secure warehouse in Guangzhou 
                  directly to our Lagos office and warehouse hubs. No hidden charges, zero clearance hassle.
                </p>

                {/* Tracking Card */}
                <div className="max-w-xl mx-auto lg:mx-0 glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl relative overflow-hidden text-left">
                  <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

                  <h2 className="font-display text-xs sm:text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <Search className="w-4 h-4 text-blue-500 shrink-0" />
                    Track Consignment Manifest
                  </h2>
                  
                  <form onSubmit={handleTrackSubmit} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:relative">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Package className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                          type="text"
                          placeholder="Tracking ID (e.g. DDL-2026-12345)"
                          value={trackingId}
                          onChange={(e) => {
                            setTrackingId(e.target.value);
                            setError("");
                          }}
                          className="block w-full pl-10 pr-3 sm:pr-28 py-3 min-h-[46px] bg-white/95 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all shadow-inner"
                        />
                      </div>
                      <button
                        type="submit"
                        className="sm:absolute sm:inset-y-1.5 sm:right-1.5 min-h-[44px] sm:min-h-0 px-5 py-2.5 sm:py-0 bg-blue-600 hover:bg-blue-500 text-white rounded-xl sm:rounded-lg text-sm sm:text-xs font-semibold shadow-md transition-colors clay-btn-blue flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        Track Cargo
                        <ArrowRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                    {error && (
                      <p className="text-red-600 text-xs pl-1 font-semibold">
                        {error}
                      </p>
                    )}
                  </form>
                </div>

                {/* Operator and client login hint */}
                <div className="pt-1 flex justify-center lg:justify-start">
                  <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/60 text-xs sm:text-sm text-slate-600 border border-slate-200/80">
                    <span>Registered Cargo Client or Operator?</span>
                    <Link to="/login" className="text-blue-700 font-semibold hover:text-blue-600 inline-flex items-center gap-0.5 transition-colors">
                      Login Securely <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Column: Route Visual Card */}
              <div className="lg:col-span-6 space-y-6">
                <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-600/10 rounded-full blur-[90px] pointer-events-none" />
                  <div className="absolute top-1/3 right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-[70px] pointer-events-none" />

                  <div className="glass-panel rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200 shadow-2xl relative overflow-hidden group">
                    <div className="h-52 sm:h-72 lg:h-80 w-full rounded-xl sm:rounded-2xl overflow-hidden relative border border-slate-200 shadow-inner bg-slate-900">
                      <img 
                        src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=800&q=80" 
                        alt="Maritime Cargo Container Ship" 
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 opacity-90"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/15" />
                      
                      <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 space-y-1.5">
                        <div className="text-[11px] font-mono tracking-widest text-blue-300 font-bold uppercase">
                          Active Maritime Corridor
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1">
                          <div>
                            <p className="text-base sm:text-lg font-display font-bold text-white">Guangzhou ➔ Apapa Lagos</p>
                            <p className="text-xs text-slate-200 font-mono">Consolidated Sea Container Line</p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-xs font-mono font-bold text-emerald-300">Weekly Departures</p>
                            <p className="text-[11px] text-slate-300 font-mono">Apapa Harbour Clearance</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3.5 sm:mt-4">
                      <div className="bg-white/85 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
                        <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Warehouse
                        </span>
                        <span className="text-xs font-bold text-slate-800 font-mono block">
                          Guangzhou
                        </span>
                      </div>
                      <div className="bg-white/85 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
                        <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Air Cargo
                        </span>
                        <span className="text-xs font-bold text-blue-600 font-mono block tabular-nums">
                          5–7 Days
                        </span>
                      </div>
                      <div className="bg-white/85 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
                        <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Sea Line
                        </span>
                        <span className="text-xs font-bold text-indigo-600 font-mono block">
                          Weekly Sat
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="py-6 sm:py-8 bg-blue-50 border-y border-blue-100 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-center">
              <div className="p-3 sm:p-4">
                <p className="text-lg sm:text-2xl font-display font-bold text-slate-900">Guangzhou</p>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold uppercase tracking-wider mt-1">Direct Warehouse Hub</p>
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-lg sm:text-2xl font-display font-bold text-blue-600 tabular-nums">5 - 7 Days</p>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold uppercase tracking-wider mt-1">Express Air Cargo</p>
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-lg sm:text-2xl font-display font-bold text-indigo-600 tabular-nums">35 - 45 Days</p>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold uppercase tracking-wider mt-1">Consolidated Sea Freight</p>
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-lg sm:text-2xl font-display font-bold text-emerald-600">100% Secure</p>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold uppercase tracking-wider mt-1">Apapa Custom Clearance</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight text-balance">
              Our Direct Cargo & Shipping Services
            </h2>
            <p className="mt-3 text-sm text-slate-600 max-w-lg mx-auto">
              Professional sea and air freight consolidation, custom clearance, and secure warehousing solutions tailored for Nigerian importers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* CARD 1: Express Air Cargo */}
            <div className="glass-panel glass-panel-hover rounded-2xl relative overflow-hidden group flex flex-col">
              <div className="h-24 sm:h-32 w-full relative overflow-hidden bg-blue-50 flex items-center justify-center border-b border-blue-100">
                <PlaneTakeoff className="w-12 h-12 sm:w-16 sm:h-16 text-blue-300 group-hover:scale-110 group-hover:text-blue-400 transition-all duration-500" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between relative z-10">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 mb-2">Express Air Cargo</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Fast weekly cargo flights departing Guangzhou airport directly to Lagos Ikeja Hub. Ideal for time-critical commercial imports.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 2: Ocean Freight */}
            <div className="glass-panel glass-panel-hover rounded-2xl relative overflow-hidden group flex flex-col">
              <div className="h-24 sm:h-32 w-full relative overflow-hidden bg-indigo-50 flex items-center justify-center border-b border-indigo-100">
                <Container className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-300 group-hover:scale-110 group-hover:text-indigo-400 transition-all duration-500" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between relative z-10">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 mb-2">Ocean Freight (LCL/FCL)</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Affordable container consolidation. We charge precise CBM volume, protecting bulk imports, machinery, and commercial stocks.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 3: Guangzhou Warehousing */}
            <div className="glass-panel glass-panel-hover rounded-2xl relative overflow-hidden group flex flex-col">
              <div className="h-24 sm:h-32 w-full relative overflow-hidden bg-amber-50 flex items-center justify-center border-b border-amber-100">
                <Warehouse className="w-12 h-12 sm:w-16 sm:h-16 text-amber-300 group-hover:scale-110 group-hover:text-amber-400 transition-all duration-500" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between relative z-10">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 mb-2">Guangzhou Warehousing</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Accepting and cataloging goods directly from your 1688, Taobao, or local Chinese manufacturers. Free count verification.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 4: Lagos Port Clearance */}
            <div className="glass-panel glass-panel-hover rounded-2xl relative overflow-hidden group flex flex-col">
              <div className="h-24 sm:h-32 w-full relative overflow-hidden bg-emerald-50 flex items-center justify-center border-b border-emerald-100">
                <ShieldCheck className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-300 group-hover:scale-110 group-hover:text-emerald-400 transition-all duration-500" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between relative z-10">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 mb-2">Lagos Port Clearance</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Full-scale customs documentation, shipping agent settlements, and Apapa / Tincan port clearance handled seamlessly by us.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Estimator */}
        <section id="estimator" className="py-14 sm:py-20 bg-blue-100 border-y border-blue-200 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  <Calculator className="w-4 h-4" />
                  Interactive Estimator
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight leading-tight text-balance">
                  Instant Volume & CBM Estimator
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Avoid cargo surprises. Calculate the volumetric cubic meters (CBM) of your delivery cartons to forecast accurate sea shipping costs, or evaluate the volumetric weight for cargo flights.
                </p>
                
                <div className="space-y-3.5 pt-3 border-t border-blue-200/70">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 font-display">Fast Rate Approximation</p>
                      <p className="text-xs text-slate-600">Volumetric rates apply standard multiplier formulas for transparency.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 font-display">LCL Container Optimization</p>
                      <p className="text-xs text-slate-600">Estimates if your bulk load qualifies as full container or partial consolidated.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 glass-panel p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
                <div className="space-y-4">
                  <h3 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                    1. Input Package Dimensions
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase">L (cm)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={length}
                        onChange={(e) => setLength(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2.5 min-h-[44px] text-base sm:text-sm text-slate-900 font-semibold font-mono focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase">W (cm)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={width}
                        onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2.5 min-h-[44px] text-base sm:text-sm text-slate-900 font-semibold font-mono focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase">H (cm)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={height}
                        onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2.5 min-h-[44px] text-base sm:text-sm text-slate-900 font-semibold font-mono focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase">Total Packages / Cartons</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={cartons}
                        onChange={(e) => setCartons(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-slate-900 font-semibold font-mono focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase">Rate / {freightType === 'sea' ? 'CBM' : 'Kg'} ($)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={rateUsd || ""}
                          placeholder="e.g., 200"
                          onChange={(e) => setRateUsd(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-slate-900 font-semibold font-mono focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase">Rate / {freightType === 'sea' ? 'CBM' : 'Kg'} (₦)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={rateNgn || ""}
                          placeholder="e.g., 300000"
                          onChange={(e) => setRateNgn(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-slate-900 font-semibold font-mono focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="block text-[11px] font-semibold text-slate-600 mb-2 uppercase">Freight Priority Filter</span>
                    <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setFreightType("sea")}
                        className={`flex-1 min-h-[44px] py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all ${freightType === "sea" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                      >
                        Sea Cargo
                      </button>
                      <button
                        type="button"
                        onClick={() => setFreightType("air")}
                        className={`flex-1 min-h-[44px] py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all ${freightType === "air" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                      >
                        Air Cargo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="clay-card-slate p-4 sm:p-5 flex flex-col justify-between border border-slate-200">
                  <div>
                    <h3 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">
                      2. Calculation Metrics
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
                        <span className="text-slate-600">Total Volume:</span>
                        <span className="text-slate-900 font-bold font-mono tabular-nums bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                          {calculatedCbm.toFixed(3)} CBM
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
                        <span className="text-slate-600">Air Vol Weight:</span>
                        <span className="text-slate-900 font-bold font-mono tabular-nums bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                          {airVolumetricWeight.toFixed(1)} kg
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
                        <span className="text-slate-600">Est. Cost (USD):</span>
                        <span className="text-blue-700 font-bold font-mono tabular-nums bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                          ${estimatedCostUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
                        <span className="text-slate-600">Est. Cost (NGN):</span>
                        <span className="text-emerald-700 font-bold font-mono tabular-nums bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          ₦{estimatedCostNgn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2 text-xs sm:text-sm pt-2.5 border-t border-slate-200">
                        <span className="text-slate-600 font-medium">Best Shipping Choice:</span>
                        <span className="text-blue-700 font-bold font-display">
                          {recommendedMode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-slate-200 text-xs text-slate-600 flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 font-display">Transit Overview</p>
                      <p className="text-xs text-slate-600 leading-normal mt-0.5">
                        {freightType === "sea" ? "Estimated sea voyage 35-45 days. Consolidations depart Guangzhou every Saturday." : "Express flight departs Guangzhou airport Tuesday/Friday. 5-7 days clearance lag."}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Timeline / How It Works */}
        <section id="how-it-works" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight text-balance">
              A Transparent Tracking Cycle
            </h2>
            <p className="mt-3 text-sm text-slate-600 max-w-lg mx-auto">
              Our automated manifest registry assigns precise tracking numbers and uploads real-time status steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-6 left-16 right-16 h-0.5 bg-slate-200 -z-10" />

            <div className="text-center group">
              <div className="w-12 h-12 bg-white border border-slate-200 text-slate-900 rounded-2xl flex items-center justify-center font-display font-bold text-sm mx-auto mb-4 shadow-md group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors duration-300">
                1
              </div>
              <h4 className="text-sm font-display font-bold text-slate-900 mb-2">Inventory Handover</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-[240px] mx-auto">
                Deliver or forward items from Chinese suppliers to our Guangzhou warehouse, labeled with your shipping mark.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-12 h-12 bg-white border border-slate-200 text-slate-900 rounded-2xl flex items-center justify-center font-display font-bold text-sm mx-auto mb-4 shadow-md group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors duration-300">
                2
              </div>
              <h4 className="text-sm font-display font-bold text-slate-900 mb-2">Manifest Cataloging</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-[240px] mx-auto">
                We inspect volume metrics, record cartons, and initialize your shipment tracking ID into our central database.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-12 h-12 bg-white border border-slate-200 text-slate-900 rounded-2xl flex items-center justify-center font-display font-bold text-sm mx-auto mb-4 shadow-md group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors duration-300">
                3
              </div>
              <h4 className="text-sm font-display font-bold text-slate-900 mb-2">En Route Tracking</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-[240px] mx-auto">
                Your portal dashboard displays departure updates, ocean coordinates, and air freight flight completions.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-12 h-12 bg-white border border-slate-200 text-slate-900 rounded-2xl flex items-center justify-center font-display font-bold text-sm mx-auto mb-4 shadow-md group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors duration-300">
                4
              </div>
              <h4 className="text-sm font-display font-bold text-slate-900 mb-2">Lagos Arrival</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-[240px] mx-auto">
                Upon Apapa customs clearing, inspect shipping bills, clear local handling invoices, and pickup goods or request dispatcher.
              </p>
            </div>
          </div>
        </section>

      
        {/* Contact Section */}
        <section id="contact" className="py-14 sm:py-20 bg-blue-100 border-t border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
                Our Offices & Hubs
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-600">
                AIR CARGO, SEA SHIPPING, GROUPAGE, FULL CONTAINER AND CLEARING.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              {/* China Office */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
                  China Office
                </h3>
                <address className="not-italic text-xs sm:text-sm text-slate-600 space-y-3 leading-relaxed">
                  <p>
                    No.111 Juncture North Station Road<br/>
                    and Sha Yong South Rd<br/>
                    Yueixiu District, Guangzhou
                  </p>
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                      <span className="text-slate-400 text-xs w-28 shrink-0">BISHOP:</span>
                      <a href="tel:+8613250277859" className="text-slate-800 hover:text-blue-600 font-mono">+86 13250277859</a>
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                      <span className="text-slate-400 text-xs w-28 shrink-0">OFFICE LINE:</span>
                      <a href="tel:+8613048001610" className="text-slate-800 hover:text-blue-600 font-mono">+86 13048001610</a>
                    </p>
                  </div>
                </address>
              </div>

              {/* Warehouse */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display mb-4 flex items-center gap-2">
                  <Box className="w-5 h-5 text-emerald-500 shrink-0" />
                  Warehouse Hub
                </h3>
                <address className="not-italic text-xs sm:text-sm text-slate-600 space-y-3 leading-relaxed">
                  <p>
                    Warehouse No.111 Juncture North Station<br/>
                    South Road and Sha Yong South Rd<br/>
                    Yueixiu District, Guangzhou
                  </p>
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                      <span className="text-slate-400 text-xs w-28 shrink-0">CONTACT BISHOP:</span>
                      <a href="tel:+861325077859" className="text-slate-800 hover:text-blue-600 font-mono">+86 1325077859</a>
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                      <span className="text-slate-400 text-xs w-28 shrink-0">OFFICE LINE:</span>
                      <a href="tel:+8613048001610" className="text-slate-800 hover:text-blue-600 font-mono">+86 13048001610</a>
                    </p>
                  </div>
                </address>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 sm:py-16 relative z-10 shrink-0 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-10 border-b border-slate-800">
            
            <div>
              <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity mb-4">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-white block">Deep Down Logistics</span>
                  <span className="text-[10px] text-blue-400 block font-medium uppercase tracking-wider">Limited</span>
                </div>
              </Link>
              <p className="text-xs leading-relaxed text-slate-400">
                AIR CARGO, SEA SHIPPING, GROUPAGE, FULL CONTAINER AND CLEARING
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">China Office</h4>
              <address className="not-italic text-xs leading-relaxed text-slate-400 space-y-1.5">
                <p>No.111 Juncture North Station Road and Sha Yong South Rd</p>
                <p>Yueixiu District, Guangzhou</p>
                <div className="pt-2 space-y-1">
                  <p className="flex flex-wrap items-center gap-2"><span className="text-slate-500">BISHOP:</span> <a href="tel:+8613250277859" className="hover:text-white">+86 13250277859</a></p>
                  <p className="flex flex-wrap items-center gap-2"><span className="text-slate-500">OFFICE LINE:</span> <a href="tel:+8613048001610" className="hover:text-white">+86 13048001610</a></p>
                </div>
              </address>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Warehouse Hub</h4>
              <address className="not-italic text-xs leading-relaxed text-slate-400 space-y-1.5">
                <p>Warehouse No.111 Juncture North Station South Road and Sha Yong South Rd</p>
                <p>Yueixiu District, Guangzhou</p>
                <div className="pt-2 space-y-1">
                  <p className="flex flex-wrap items-center gap-2"><span className="text-slate-500">CONTACT BISHOP:</span> <a href="tel:+861325077859" className="hover:text-white">+86 1325077859</a></p>
                  <p className="flex flex-wrap items-center gap-2"><span className="text-slate-500">OFFICE LINE:</span> <a href="tel:+8613048001610" className="hover:text-white">+86 13048001610</a></p>
                </div>
              </address>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Quick Links</h4>
              <div className="flex flex-col gap-2 text-xs font-medium">
                <a href="#services" className="hover:text-blue-400 transition-colors w-fit py-0.5">Our Services</a>
                <a href="#estimator" className="hover:text-blue-400 transition-colors w-fit py-0.5">Cost Estimator</a>
                <a href="#how-it-works" className="hover:text-blue-400 transition-colors w-fit py-0.5">Shipping Process</a>
                <a href="#contact" className="hover:text-blue-400 transition-colors w-fit py-0.5">Contact Offices</a>
                <Link to="/login" className="hover:text-blue-400 transition-colors w-fit py-0.5">Client Portal Access</Link>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 text-xs text-slate-500 font-medium text-center sm:text-left">
            <p>© {new Date().getFullYear()} Deep Down Logistics Limited. All rights reserved.</p>
            <p>Guangzhou Warehouse Hub • Lagos Clearance Port</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
