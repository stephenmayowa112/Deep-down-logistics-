import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Package } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PricingSettings {
  seaFreightRateUsd: number;
  seaClearingRateNgn: number;
  airFreightRateUsd: number;
  airClearingRateNgn: number;
  minSeaCbm: number;
  minAirKg: number;
}

const DEFAULT_SETTINGS: PricingSettings = {
  seaFreightRateUsd: 220,
  seaClearingRateNgn: 165000,
  airFreightRateUsd: 9.5,
  airClearingRateNgn: 3500,
  minSeaCbm: 0.5,
  minAirKg: 10
};

export default function Home() {
  const [trackingId, setTrackingId] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Pricing Settings State
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);

  // Interactive Calculator State
  const [calcOpen, setCalcOpen] = useState(true);
  const [calcMode, setCalcMode] = useState<'sea' | 'air'>('sea');
  const [inputMode, setInputMode] = useState<'dimensions' | 'direct'>('dimensions');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [cartons, setCartons] = useState<string>('1');
  const [weight, setWeight] = useState<string>('');
  const [directCbm, setDirectCbm] = useState<string>('');
  const [directWeight, setDirectWeight] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'pricing'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as PricingSettings);
        }
      },
      (err) => {
        console.error('Error fetching pricing settings:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = trackingId.trim().toUpperCase();
    if (!cleaned) {
      setTrackingError('Please enter a valid tracking number.');
      return;
    }
    setTrackingError('');
    navigate(`/track/${cleaned}`);
  };

  const openCalculatorWithMode = (mode: 'sea' | 'air') => {
    setCalcMode(mode);
    setCalcOpen(true);
    const el = document.getElementById('calculator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Calculate Results
  const calculateQuote = () => {
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const c = parseInt(cartons, 10) || 1;
    const wt = parseFloat(weight) || 0;
    const dCbm = parseFloat(directCbm) || 0;
    const dWt = parseFloat(directWeight) || 0;

    if (calcMode === 'sea') {
      const rawCbm = inputMode === 'dimensions' ? ((l * w * h) / 1000000) * c : dCbm;
      if (rawCbm <= 0) {
        return { volumeCbm: 0, chargeableCbm: 0, usdCost: 0, ngnCost: 0 };
      }
      const chargeableCbm = Math.max(rawCbm, settings.minSeaCbm);
      const usdCost = chargeableCbm * settings.seaFreightRateUsd;
      const ngnCost = chargeableCbm * settings.seaClearingRateNgn;
      return { volumeCbm: rawCbm, chargeableCbm, usdCost, ngnCost };
    } else {
      if (inputMode === 'dimensions') {
        const volWeight = ((l * w * h) / 5000) * c;
        const totalActualWeight = wt * c;
        const rawWeight = Math.max(volWeight, totalActualWeight);
        if (rawWeight <= 0) {
          return { volWeight: 0, actualWeight: 0, chargeableWeight: 0, usdCost: 0, ngnCost: 0 };
        }
        const chargeableWeight = Math.max(rawWeight, settings.minAirKg);
        const usdCost = chargeableWeight * settings.airFreightRateUsd;
        const ngnCost = chargeableWeight * settings.airClearingRateNgn;
        return { volWeight, actualWeight: totalActualWeight, chargeableWeight, usdCost, ngnCost };
      } else {
        if (dWt <= 0) {
          return { volWeight: 0, actualWeight: 0, chargeableWeight: 0, usdCost: 0, ngnCost: 0 };
        }
        const chargeableWeight = Math.max(dWt, settings.minAirKg);
        const usdCost = chargeableWeight * settings.airFreightRateUsd;
        const ngnCost = chargeableWeight * settings.airClearingRateNgn;
        return { volWeight: 0, actualWeight: dWt, chargeableWeight, usdCost, ngnCost };
      }
    }
  };

  const quote = calculateQuote();

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0B1220] font-sans text-base leading-[1.6] selection:bg-[#0A54E1]/15 selection:text-[#0A54E1] overflow-x-hidden">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-8">
        {/* Header */}
        <header className="rise flex justify-between items-center py-5 sm:py-7 gap-4 relative z-30">
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

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7 text-[14px]">
            <a href="#services" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              Services
            </a>
            <a href="#how" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              How it works
            </a>
            <a href="#calculator" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              Calculator
            </a>
            <a href="#faq" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              FAQ
            </a>
            <a href="#track" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              Track
            </a>
            <Link to="/contact" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              Contact
            </Link>
            <Link
              to="/login"
              className="px-5 py-[11px] text-[#0B1220] hover:opacity-65 transition-opacity"
            >
              Sign in
            </Link>
            <Link
              to="/login?mode=signup"
              className="pill-btn-minimal bg-[#0A54E1] text-white px-[22px] py-[11px] rounded-full font-medium"
            >
              Client sign up
            </Link>
          </nav>

          {/* Mobile Nav Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/login"
              className="pill-btn-minimal bg-[#0A54E1] text-white px-4 py-2 rounded-full text-xs font-medium min-h-[40px] inline-flex items-center"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-full text-[#0B1220] hover:bg-[#F1F4F9] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden bg-[#F1F4F9] rounded-3xl p-5 mb-4 flex flex-col gap-3 text-[15px] font-medium border border-[#E3E8F0]">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              Services
            </a>
            <a
              href="#how"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              How it works
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              CBM Calculator
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              FAQ
            </a>
            <a
              href="#track"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              Track cargo
            </a>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              Contact us
            </Link>
            <div className="pt-2 border-t border-[#E3E8F0] flex flex-col sm:flex-row gap-2.5">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 px-5 rounded-full bg-white text-[#0B1220] text-center font-semibold border border-[#D5DBE5]"
              >
                Sign in
              </Link>
              <Link
                to="/login?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 px-5 rounded-full bg-[#0A54E1] text-white text-center font-semibold"
              >
                Client sign up
              </Link>
            </div>
          </nav>
        )}

        {/* Hero Section */}
        <section className="hero pt-12 sm:pt-24 pb-12 sm:pb-[72px] text-center">
          <div className="blob b1" />
          <div className="blob b2" />
          <div className="dots" />

          <h1 className="rise d1 font-bold text-[clamp(36px,7vw,88px)] leading-[1.02] tracking-[-0.035em] mx-auto max-w-[880px]">
            <span className="typed">
              <span className="ty a">Guangzhou to Lagos</span>
              <span className="ty b">China to Lagos</span>
              <span className="ty c">Hong Kong to Lagos</span>
            </span>
            <br />
            made simple.
          </h1>

          <p className="rise d2 text-[17px] sm:text-[19px] text-[#4B5565] max-w-[600px] mx-auto mt-6 sm:mt-7 mb-8 sm:mb-10 px-2">
            Groupage shipping and cargo logistics from China to Nigeria. Air, sea and road, with delivery to every state and the FCT.
          </p>

          <a
            href="#calculator"
            className="rise d3 pill-btn-minimal inline-block bg-[#0A54E1] text-white px-10 py-[18px] rounded-full font-semibold text-[14px] tracking-[0.08em]"
          >
            SHIP NOW
          </a>

          {/* Animated Maritime & Air SVG Illustration */}
          <div
            className="rise d4 mt-12 sm:mt-[72px] mx-auto rounded-[20px] sm:rounded-[28px] overflow-hidden"
            style={{ boxShadow: '0 30px 60px rgba(10, 84, 225, 0.15)' }}
          >
            <svg
              viewBox="0 0 1120 440"
              width="100%"
              className="block"
              role="img"
              aria-label="A cargo ship at sea with a plane flying overhead"
            >
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#CFE0FF" />
                  <stop offset="1" stopColor="#F4F8FF" />
                </linearGradient>
                <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2F72EA" />
                  <stop offset="1" stopColor="#0A3FA8" />
                </linearGradient>
              </defs>
              <rect width="1120" height="440" fill="url(#sky)" />
              <circle cx="880" cy="110" r="64" fill="#FFFFFF" opacity=".7" />
              <g className="cloud c1">
                <ellipse cx="180" cy="90" rx="70" ry="18" fill="#FFFFFF" />
                <ellipse cx="220" cy="76" rx="44" ry="18" fill="#FFFFFF" />
              </g>
              <g className="cloud c2">
                <ellipse cx="640" cy="150" rx="60" ry="14" fill="#FFFFFF" opacity=".9" />
                <ellipse cx="672" cy="138" rx="36" ry="14" fill="#FFFFFF" opacity=".9" />
              </g>
              <path
                d="M80 260 Q560 -20 1040 200"
                fill="none"
                stroke="#0A54E1"
                strokeOpacity=".35"
                strokeWidth="2"
                strokeDasharray="6 10"
              />
              <g>
                <animateMotion
                  dur="14s"
                  repeatCount="indefinite"
                  path="M80 260 Q560 -20 1040 200"
                  rotate="auto"
                />
                <rect x="-20" y="-4" width="40" height="8" rx="4" fill="#0B1220" />
                <polygon points="-4,-4 6,-4 -6,-20 -12,-20" fill="#0B1220" />
                <polygon points="-4,4 6,4 -6,20 -12,20" fill="#0B1220" />
                <polygon points="-18,-3 -12,-3 -18,-9 -20,-9" fill="#0B1220" />
                <polygon points="-18,3 -12,3 -18,9 -20,9" fill="#0B1220" />
              </g>
              <rect y="330" width="1120" height="110" fill="url(#sea)" />
              <g className="wv1" opacity=".55">
                <path
                  d="M0 352 q35 -12 70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 V440 H0Z"
                  fill="#6FA0F5"
                />
              </g>
              <g className="ship">
                <rect x="290" y="282" width="54" height="36" rx="2" fill="#0A54E1" />
                <rect x="346" y="282" width="54" height="36" rx="2" fill="#7FA8F5" />
                <rect x="402" y="282" width="54" height="36" rx="2" fill="#F28C28" />
                <rect x="458" y="282" width="54" height="36" rx="2" fill="#FFFFFF" />
                <rect x="514" y="282" width="54" height="36" rx="2" fill="#2BB3A3" />
                <rect x="570" y="282" width="54" height="36" rx="2" fill="#0A54E1" />
                <rect x="626" y="282" width="54" height="36" rx="2" fill="#F28C28" />
                <rect x="290" y="244" width="54" height="36" rx="2" fill="#F28C28" />
                <rect x="346" y="244" width="54" height="36" rx="2" fill="#FFFFFF" />
                <rect x="402" y="244" width="54" height="36" rx="2" fill="#2BB3A3" />
                <rect x="458" y="244" width="54" height="36" rx="2" fill="#0A54E1" />
                <rect x="514" y="244" width="54" height="36" rx="2" fill="#F28C28" />
                <rect x="570" y="244" width="54" height="36" rx="2" fill="#0A54E1" />
                <rect x="290" y="206" width="54" height="36" rx="2" fill="#2BB3A3" />
                <rect x="346" y="206" width="54" height="36" rx="2" fill="#0A54E1" />
                <rect x="402" y="206" width="54" height="36" rx="2" fill="#F28C28" />
                <rect x="458" y="206" width="54" height="36" rx="2" fill="#0A54E1" />
                <path d="M240 318 H790 L748 366 H290 Z" fill="#0B1220" />
                <path d="M246 326 H784" stroke="#F28C28" strokeWidth="4" />
                <rect x="700" y="236" width="70" height="82" fill="#FFFFFF" />
                <rect x="708" y="248" width="54" height="10" fill="#0A54E1" />
                <rect x="716" y="220" width="38" height="16" fill="#E7EEFB" />
                <rect x="736" y="204" width="12" height="16" fill="#F28C28" />
              </g>
              <g className="wv2">
                <path
                  d="M0 372 q35 -12 70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 V440 H0Z"
                  fill="#0A54E1"
                  opacity=".92"
                />
              </g>
            </svg>
          </div>

          <div className="route rise d4">
            <span>Guangzhou</span>
            <div className="line">
              <span className="dot" />
            </div>
            <span>Lagos</span>
          </div>
        </section>

        {/* Track Section */}
        <section id="track" className="pt-6 pb-16 sm:pb-24 text-center">
          <form
            onSubmit={handleTrackSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-[560px] mx-auto"
          >
            <label htmlFor="tn" className="sr-only">
              Tracking number
            </label>
            <input
              id="tn"
              type="text"
              value={trackingId}
              onChange={(e) => {
                setTrackingId(e.target.value);
                if (trackingError) setTrackingError('');
              }}
              placeholder="Enter your tracking number (e.g. DDL-84920)"
              className="flex-1 min-w-[220px] min-h-[54px] px-6 border border-[#D5DBE5] rounded-full text-base sm:text-[15px] text-[#0B1220] bg-white focus:border-[#0A54E1] focus:ring-4 focus:ring-[#0A54E1]/15 outline-none transition-all"
            />
            <button
              type="submit"
              className="pill-btn-minimal min-h-[54px] px-8 rounded-full bg-[#0B1220] text-white font-medium text-[15px] cursor-pointer"
            >
              Track cargo
            </button>
          </form>
          {trackingError && (
            <p className="mt-3 text-sm text-red-600 font-medium">{trackingError}</p>
          )}

          {/* About Strip */}
          <div className="max-w-[760px] mx-auto mt-10 sm:mt-12 bg-[#F1F4F9] border border-[#E3E8F0] rounded-[24px] px-6 py-5 sm:px-8 sm:py-6 text-left sm:text-center">
            <p className="text-[15px] sm:text-[16px] text-[#4B5565] m-0 leading-relaxed">
              <strong className="text-[#0B1220] font-semibold">De Great Deep Down Logistics Limited</strong> is a Lagos-based groupage shipping and cargo logistics company. We run our own offices and warehouses in Guangzhou and Yiwu, so your goods are received, consolidated and shipped by people you can call.
            </p>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-12 sm:pt-12 sm:pb-24">
          <p className="text-[13px] font-semibold tracking-[0.12em] text-[#0A54E1] mb-3 uppercase">
            SERVICES
          </p>
          <h2 className="font-bold text-3xl sm:text-[44px] tracking-[-0.03em] leading-[1.1] mb-8 sm:mb-12">
            Three ways to move your cargo.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Express Air Card */}
            <div className="service-card-minimal bg-[#F1F4F9] rounded-[28px] p-7 sm:py-12 sm:px-10 flex flex-col justify-between">
              <div>
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 72 72"
                  aria-hidden="true"
                  className="block mb-7"
                >
                  <circle cx="36" cy="36" r="36" fill="#FFFFFF" />
                  <g transform="translate(36 36) rotate(-30) scale(1.1)">
                    <rect x="-20" y="-4" width="40" height="8" rx="4" fill="#0A54E1" />
                    <polygon points="-4,-4 6,-4 -6,-20 -12,-20" fill="#0A54E1" />
                    <polygon points="-4,4 6,4 -6,20 -12,20" fill="#0B1220" opacity="0" />
                    <polygon points="-4,4 6,4 -6,20 -12,20" fill="#0A54E1" />
                    <polygon points="-18,-3 -12,-3 -18,-9 -20,-9" fill="#0A54E1" />
                    <polygon points="-18,3 -12,3 -18,9 -20,9" fill="#0A54E1" />
                  </g>
                </svg>
                <h3 className="font-semibold text-2xl sm:text-[28px] tracking-[-0.02em] mb-3">
                  Express air
                </h3>
                <p className="text-[#4B5565] mb-4">
                  Arrives in 5–7 days. For urgent stock and high-value goods.
                </p>
                <p className="text-xs font-medium text-[#6B7585] mb-8">
                  Current rate: <span className="text-[#0B1220] font-semibold">${settings.airFreightRateUsd}/kg</span> freight •{' '}
                  <span className="text-[#0B1220] font-semibold">₦{settings.airClearingRateNgn.toLocaleString()}/kg</span> clearing (min {settings.minAirKg} kg)
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => openCalculatorWithMode('air')}
                  className="arrow-link-minimal text-[#0A54E1] font-semibold text-[14px] tracking-[0.06em] cursor-pointer bg-transparent border-0 p-0"
                >
                  AIR NOW →
                </button>
              </div>
            </div>

            {/* Ocean Freight Card */}
            <div className="service-card-minimal bg-[#F1F4F9] rounded-[28px] p-7 sm:py-12 sm:px-10 flex flex-col justify-between">
              <div>
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 72 72"
                  aria-hidden="true"
                  className="block mb-7"
                >
                  <circle cx="36" cy="36" r="36" fill="#FFFFFF" />
                  <rect x="16" y="22" width="18" height="12" rx="2" fill="#0A54E1" />
                  <rect x="36" y="22" width="18" height="12" rx="2" fill="#F28C28" />
                  <rect x="26" y="35" width="18" height="12" rx="2" fill="#7FA8F5" />
                  <path
                    d="M14 52 q5 -5 10 0 t10 0 t10 0 t10 0 t10 0"
                    fill="none"
                    stroke="#0A54E1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                <h3 className="font-semibold text-2xl sm:text-[26px] tracking-[-0.02em] mb-3">
                  Ocean freight
                </h3>
                <p className="text-[#4B5565] mb-4">
                  Arrives in 35–45 days. The economical choice for bulk and containers. Container and groupage options.
                </p>
                <p className="text-xs font-medium text-[#6B7585] mb-8">
                  Current rate: <span className="text-[#0B1220] font-semibold">${settings.seaFreightRateUsd}/CBM</span> freight •{' '}
                  <span className="text-[#0B1220] font-semibold">₦{settings.seaClearingRateNgn.toLocaleString()}/CBM</span> clearing (min {settings.minSeaCbm} CBM)
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => openCalculatorWithMode('sea')}
                  className="arrow-link-minimal text-[#0A54E1] font-semibold text-[14px] tracking-[0.06em] cursor-pointer bg-transparent border-0 p-0"
                >
                  SHIP BY SEA →
                </button>
              </div>
            </div>

            {/* Nationwide Delivery Card */}
            <div className="service-card-minimal bg-[#F1F4F9] rounded-[28px] p-7 sm:py-12 sm:px-9 flex flex-col justify-between">
              <div>
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 72 72"
                  aria-hidden="true"
                  className="block mb-7"
                >
                  <circle cx="36" cy="36" r="36" fill="#FFFFFF" />
                  <rect x="16" y="25" width="24" height="16" rx="3" fill="#0A54E1" />
                  <path d="M40 29 H49 L55 36 V41 H40 Z" fill="#F28C28" />
                  <circle cx="24" cy="44" r="4.5" fill="#0B1220" />
                  <circle cx="47" cy="44" r="4.5" fill="#0B1220" />
                  <path
                    d="M16 51 H56"
                    stroke="#7FA8F5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                <h3 className="font-semibold text-2xl sm:text-[26px] tracking-[-0.02em] mb-3">
                  Nationwide delivery
                </h3>
                <p className="text-[#4B5565] mb-4">
                  Waybill delivery to all states and the FCT.
                </p>
                <p className="text-xs font-medium text-[#6B7585] mb-8">
                  Direct dispatch from our Lagos Trade Fair hub to your doorstep or state park.
                </p>
              </div>
              <div>
                <a
                  href="#offices"
                  className="arrow-link-minimal text-[#0A54E1] font-semibold text-[14px] tracking-[0.06em]"
                >
                  OUR OFFICES →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how" className="py-12 sm:pt-12 sm:pb-24">
          <p className="text-[13px] font-semibold tracking-[0.12em] text-[#0A54E1] mb-3 uppercase">
            HOW IT WORKS
          </p>
          <h2 className="font-bold text-3xl sm:text-[44px] tracking-[-0.03em] leading-[1.1] mb-8 sm:mb-12">
            Ship, track, receive.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            <div className="how-step-minimal">
              <p className="font-bold text-[15px] text-[#0A54E1] mb-2">01</p>
              <h3 className="font-semibold text-[20px] mb-2">Ship</h3>
              <p className="text-[#4B5565] m-0">
                Send your goods to our Guangzhou or Yiwu warehouse.
              </p>
            </div>
            <div className="how-step-minimal">
              <p className="font-bold text-[15px] text-[#0A54E1] mb-2">02</p>
              <h3 className="font-semibold text-[20px] mb-2">Track</h3>
              <p className="text-[#4B5565] m-0">
                Follow your cargo from our dashboard.
              </p>
            </div>
            <div className="how-step-minimal">
              <p className="font-bold text-[15px] text-[#0A54E1] mb-2">03</p>
              <h3 className="font-semibold text-[20px] mb-2">Receive</h3>
              <p className="text-[#4B5565] m-0">
                Collect at our Lagos office or have it waybilled to your state.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-12 sm:pt-12 sm:pb-24">
          <p className="text-[13px] font-semibold tracking-[0.12em] text-[#0A54E1] mb-3 uppercase">
            FAQ
          </p>
          <h2 className="font-bold text-3xl sm:text-[44px] tracking-[-0.03em] leading-[1.1] mb-8 sm:mb-10">
            Questions, answered.
          </h2>

          <div className="border-t border-[#E3E8F0]">
            <details className="border-b border-[#E3E8F0] py-6">
              <summary className="flex gap-4 sm:gap-6 font-semibold text-[17px] sm:text-[18px] items-baseline">
                <span className="text-[#6B7585] font-medium">01</span>
                <span>How long does shipping take?</span>
              </summary>
              <p className="text-[#4B5565] mt-4 ml-8 sm:ml-12">
                Air cargo takes 5–7 days from our Guangzhou warehouse to Lagos. Ocean freight takes 35–45 days to Apapa or Tin Can Island port.
              </p>
            </details>

            <details className="border-b border-[#E3E8F0] py-6">
              <summary className="flex gap-4 sm:gap-6 font-semibold text-[17px] sm:text-[18px] items-baseline">
                <span className="text-[#6B7585] font-medium">02</span>
                <span>How do I track my cargo?</span>
              </summary>
              <p className="text-[#4B5565] mt-4 ml-8 sm:ml-12">
                Enter your tracking number in the search bar above, or sign in to your client dashboard to see your full manifest, live status updates, and WhatsApp alerts.
              </p>
            </details>

            <details className="border-b border-[#E3E8F0] py-6">
              <summary className="flex gap-4 sm:gap-6 font-semibold text-[17px] sm:text-[18px] items-baseline">
                <span className="text-[#6B7585] font-medium">03</span>
                <span>How is shipping cost calculated?</span>
              </summary>
              <p className="text-[#4B5565] mt-4 ml-8 sm:ml-12">
                Ocean freight is calculated by volume in Cubic Meters (L × W × H cm ÷ 1,000,000 × cartons) at ${settings.seaFreightRateUsd}/CBM freight plus ₦{settings.seaClearingRateNgn.toLocaleString()}/CBM clearing (minimum {settings.minSeaCbm} CBM). Express air cargo is billed by the greater of actual or volumetric weight (L × W × H cm ÷ 5,000) at ${settings.airFreightRateUsd}/kg freight plus ₦{settings.airClearingRateNgn.toLocaleString()}/kg clearing (minimum {settings.minAirKg} kg).
              </p>
            </details>

            <details className="border-b border-[#E3E8F0] py-6">
              <summary className="flex gap-4 sm:gap-6 font-semibold text-[17px] sm:text-[18px] items-baseline">
                <span className="text-[#6B7585] font-medium">04</span>
                <span>Is customs clearance included?</span>
              </summary>
              <p className="text-[#4B5565] mt-4 ml-8 sm:ml-12">
                Yes. We handle end-to-end customs documentation, shipping line settlements, and local port clearance at Apapa, Tin Can Island, and Ikeja cargo hub in Lagos so you can collect your goods hassle-free.
              </p>
            </details>
          </div>
        </section>

        {/* CBM Calculator CTA Banner & Interactive Calculator */}
        <section id="calculator" className="pb-16 sm:pb-24">
          <div className="bg-[#0A54E1] text-white rounded-[28px] sm:rounded-[32px] p-7 sm:py-[72px] sm:px-14 grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-center">
            <div>
              <h2 className="font-bold text-3xl sm:text-[40px] tracking-[-0.03em] leading-[1.1] mb-3">
                Know your volume before you ship.
              </h2>
              <p className="m-0 text-[#DCE7FF]">
                Size up your cargo in seconds with the CBM calculator.
              </p>
            </div>
            <div className="flex gap-4 flex-wrap lg:justify-end">
              <button
                type="button"
                onClick={() => setCalcOpen(!calcOpen)}
                className="pill-btn-minimal bg-white text-[#0A54E1] px-8 py-4 rounded-full font-semibold text-[15px] cursor-pointer border-0"
              >
                {calcOpen ? 'Hide calculator' : 'Open calculator'}
              </button>
              <Link
                to="/contact"
                className="pill-btn-minimal border border-white text-white px-8 py-4 rounded-full font-medium text-[15px]"
              >
                Talk to us
              </Link>
            </div>
          </div>

          {/* Interactive CBM & Air Calculator Panel */}
          {calcOpen && (
            <div className="mt-6 bg-[#F1F4F9] rounded-[28px] p-6 sm:p-10 border border-[#E3E8F0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#E3E8F0]">
                <div>
                  <p className="text-[12px] font-semibold tracking-[0.12em] text-[#0A54E1] uppercase mb-1">
                    LIVE FREIGHT & CBM ESTIMATOR
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-[-0.02em] text-[#0B1220]">
                    Calculate your shipping & clearing estimate
                  </h3>
                </div>

                {/* Mode Switcher */}
                <div className="inline-flex bg-white p-1.5 rounded-full border border-[#D5DBE5] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCalcMode('sea')}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                      calcMode === 'sea'
                        ? 'bg-[#0A54E1] text-white'
                        : 'text-[#4B5565] hover:text-[#0B1220]'
                    }`}
                  >
                    Ocean (CBM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMode('air')}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                      calcMode === 'air'
                        ? 'bg-[#0A54E1] text-white'
                        : 'text-[#4B5565] hover:text-[#0B1220]'
                    }`}
                  >
                    Express Air (KG)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Inputs Column */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="flex items-center gap-3 text-xs font-medium text-[#4B5565]">
                    <span>Input method:</span>
                    <button
                      type="button"
                      onClick={() => setInputMode('dimensions')}
                      className={`px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                        inputMode === 'dimensions'
                          ? 'bg-[#0B1220] text-white border-[#0B1220]'
                          : 'bg-white text-[#4B5565] border-[#D5DBE5]'
                      }`}
                    >
                      Carton Dimensions (cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('direct')}
                      className={`px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                        inputMode === 'direct'
                          ? 'bg-[#0B1220] text-white border-[#0B1220]'
                          : 'bg-white text-[#4B5565] border-[#D5DBE5]'
                      }`}
                    >
                      {calcMode === 'sea' ? 'Known Total CBM' : 'Known Total Weight'}
                    </button>
                  </div>

                  {inputMode === 'dimensions' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5565] mb-1.5">
                          Length per carton (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={length}
                          onChange={(e) => setLength(e.target.value)}
                          placeholder="e.g. 60"
                          className="w-full min-h-[48px] px-4 rounded-2xl border border-[#D5DBE5] bg-white text-base sm:text-sm text-[#0B1220] focus:border-[#0A54E1] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5565] mb-1.5">
                          Width per carton (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={width}
                          onChange={(e) => setWidth(e.target.value)}
                          placeholder="e.g. 40"
                          className="w-full min-h-[48px] px-4 rounded-2xl border border-[#D5DBE5] bg-white text-base sm:text-sm text-[#0B1220] focus:border-[#0A54E1] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5565] mb-1.5">
                          Height per carton (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          placeholder="e.g. 50"
                          className="w-full min-h-[48px] px-4 rounded-2xl border border-[#D5DBE5] bg-white text-base sm:text-sm text-[#0B1220] focus:border-[#0A54E1] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5565] mb-1.5">
                          Number of cartons
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={cartons}
                          onChange={(e) => setCartons(e.target.value)}
                          placeholder="1"
                          className="w-full min-h-[48px] px-4 rounded-2xl border border-[#D5DBE5] bg-white text-base sm:text-sm text-[#0B1220] focus:border-[#0A54E1] outline-none"
                        />
                      </div>
                      {calcMode === 'air' && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-[#4B5565] mb-1.5">
                            Actual Weight per carton (kg)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="e.g. 25"
                            className="w-full min-h-[48px] px-4 rounded-2xl border border-[#D5DBE5] bg-white text-base sm:text-sm text-[#0B1220] focus:border-[#0A54E1] outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {calcMode === 'sea' ? (
                        <div>
                          <label className="block text-xs font-semibold text-[#4B5565] mb-1.5">
                            Total Volume (CBM)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={directCbm}
                            onChange={(e) => setDirectCbm(e.target.value)}
                            placeholder="e.g. 2.5"
                            className="w-full min-h-[48px] px-4 rounded-2xl border border-[#D5DBE5] bg-white text-base sm:text-sm text-[#0B1220] focus:border-[#0A54E1] outline-none"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-semibold text-[#4B5565] mb-1.5">
                            Total Chargeable Weight (KG)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={directWeight}
                            onChange={(e) => setDirectWeight(e.target.value)}
                            placeholder="e.g. 45"
                            className="w-full min-h-[48px] px-4 rounded-2xl border border-[#D5DBE5] bg-white text-base sm:text-sm text-[#0B1220] focus:border-[#0A54E1] outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-[#6B7585]">
                    {calcMode === 'sea'
                      ? `Formula: Length × Width × Height (cm) ÷ 1,000,000 × Cartons. Minimum billable volume is ${settings.minSeaCbm} CBM.`
                      : `Formula: Greater of Actual Weight or Volumetric Weight (L × W × H cm ÷ 5,000). Minimum billable weight is ${settings.minAirKg} kg.`}
                  </p>
                </div>

                {/* Live Output Card */}
                <div className="lg:col-span-5 bg-white rounded-[24px] p-6 sm:p-7 border border-[#E3E8F0] space-y-5">
                  <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-4">
                    <span className="text-sm text-[#4B5565]">
                      {calcMode === 'sea' ? 'Calculated Volume' : 'Chargeable Weight'}
                    </span>
                    <span className="text-lg font-bold text-[#0B1220]">
                      {calcMode === 'sea'
                        ? `${(quote.volumeCbm || 0).toFixed(3)} CBM`
                        : `${(quote.chargeableWeight || 0).toFixed(1)} KG`}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-[#4B5565]">Estimated Freight (USD)</span>
                      <span className="text-2xl font-bold text-[#0A54E1]">
                        ${quote.usdCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-[#4B5565]">Lagos Clearing (NGN)</span>
                      <span className="text-xl font-bold text-[#0B1220]">
                        ₦{Math.round(quote.ngnCost).toLocaleString('en-NG')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      to="/login"
                      className="pill-btn-minimal block w-full text-center bg-[#0B1220] text-white py-3.5 px-6 rounded-full font-medium text-sm"
                    >
                      Book this shipment →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Our Offices Section */}
        <section id="offices" className="pb-16 sm:pb-24">
          <p className="text-[13px] font-semibold tracking-[0.12em] text-[#0A54E1] mb-3 uppercase">
            OUR OFFICES &amp; WAREHOUSES
          </p>
          <h2 className="font-bold text-3xl sm:text-[44px] tracking-[-0.03em] leading-[1.1] mb-8 sm:mb-12">
            Drop off in China, collect in Nigeria.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#F1F4F9] rounded-[24px] p-6 sm:p-8 border border-[#E3E8F0]">
              <p className="text-xs font-semibold tracking-[0.1em] text-[#0A54E1] uppercase mb-2">
                Nigeria Head Office &amp; Clearance Hubs
              </p>
              <h3 className="font-semibold text-xl text-[#0B1220] mb-3">Lagos</h3>
              <p className="text-sm text-[#4B5565] leading-relaxed mb-3">
                B77 Plaza, A.P.T, Trade Fair International Market, Badagry Expressway
              </p>
              <p className="text-xs text-[#6B7585] leading-relaxed mb-4">
                Apapa &amp; Tin Can Island Clearance Hub • Ikeja Air Cargo Terminal, Lagos
              </p>
              <div className="text-xs text-[#4B5565] space-y-1 pt-3 border-t border-[#E3E8F0]">
                <p className="m-0">
                  <span className="text-[#0B1220] font-medium">Lagos:</span>{' '}
                  <a href="tel:08067635193" className="hover:text-[#0A54E1]">08067635193</a>,{' '}
                  <a href="tel:07065252406" className="hover:text-[#0A54E1]">07065252406</a>
                </p>
                <p className="m-0">
                  <span className="text-[#0B1220] font-medium">CEO (Onyemco):</span>{' '}
                  <a href="tel:08033085846" className="hover:text-[#0A54E1]">08033085846</a>
                </p>
              </div>
            </div>

            <div className="bg-[#F1F4F9] rounded-[24px] p-6 sm:p-8 border border-[#E3E8F0]">
              <p className="text-xs font-semibold tracking-[0.1em] text-[#0A54E1] uppercase mb-2">
                China Receiving Hub
              </p>
              <h3 className="font-semibold text-xl text-[#0B1220] mb-3">Guangzhou (Baiyun Warehouse)</h3>
              <p className="text-sm text-[#4B5565] leading-relaxed mb-4">
                Room 105, Building 3, No. 72 Shiqing Road, Baiyun District, Guangzhou, Guangdong
              </p>
              <div className="text-xs text-[#4B5565] space-y-1 pt-3 border-t border-[#E3E8F0]">
                <p className="m-0">
                  <span className="text-[#0B1220] font-medium">China office:</span>{' '}
                  <a href="tel:+8613143335303" className="hover:text-[#0A54E1]">+86 13143335303</a>
                </p>
                <p className="m-0">
                  <span className="text-[#0B1220] font-medium">Tony (Guangzhou/Yiwu):</span>{' '}
                  <a href="tel:+8618680460400" className="hover:text-[#0A54E1]">+86 18680460400</a>
                </p>
              </div>
            </div>

            <div className="bg-[#F1F4F9] rounded-[24px] p-6 sm:p-8 border border-[#E3E8F0]">
              <p className="text-xs font-semibold tracking-[0.1em] text-[#0A54E1] uppercase mb-2">
                China Office &amp; Warehouse Hub
              </p>
              <h3 className="font-semibold text-xl text-[#0B1220] mb-3">Guangzhou (Yuexiu Hub)</h3>
              <p className="text-sm text-[#4B5565] leading-relaxed mb-2">
                No.111 Juncture North Station Road &amp; Sha Yong South Rd, Yuexiu District, Guangzhou
              </p>
              <p className="text-xs text-[#6B7585] leading-relaxed mb-4">
                Warehouse No.111 North Station South Rd, Guangzhou
              </p>
              <div className="text-xs text-[#4B5565] space-y-1 pt-3 border-t border-[#E3E8F0]">
                <p className="m-0">
                  <span className="text-[#0B1220] font-medium">Bishop:</span>{' '}
                  <a href="tel:+8613250277859" className="hover:text-[#0A54E1]">+86 13250277859</a>
                  {' / '}
                  <a href="tel:+861325077859" className="hover:text-[#0A54E1]">+86 1325077859</a>
                </p>
                <p className="m-0">
                  <span className="text-[#0B1220] font-medium">Office:</span>{' '}
                  <a href="tel:+8613048001610" className="hover:text-[#0A54E1]">+86 13048001610</a>
                </p>
              </div>
            </div>

            <div className="bg-[#F1F4F9] rounded-[24px] p-6 sm:p-8 border border-[#E3E8F0]">
              <p className="text-xs font-semibold tracking-[0.1em] text-[#0A54E1] uppercase mb-2">
                China Receiving Hub
              </p>
              <h3 className="font-semibold text-xl text-[#0B1220] mb-3">Yiwu warehouse</h3>
              <p className="text-sm text-[#4B5565] leading-relaxed mb-4">
                Unit 2, Block 9 West Ho Second District, Houzhai, Yiwu, Zhejiang
              </p>
              <div className="text-xs text-[#4B5565] space-y-1 pt-3 border-t border-[#E3E8F0]">
                <p className="m-0">
                  <span className="text-[#0B1220] font-medium">Tony (Guangzhou/Yiwu):</span>{' '}
                  <a href="tel:+8618680460400" className="hover:text-[#0A54E1]">+86 18680460400</a>
                </p>
                <p className="m-0">
                  <span className="text-[#0B1220] font-medium">China office:</span>{' '}
                  <a href="tel:+8613143335303" className="hover:text-[#0A54E1]">+86 13143335303</a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          id="contact"
          className="border-t border-[#E3E8F0] pt-14 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-[14px] text-[#4B5565]"
        >
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3 hover:opacity-85 transition-opacity mb-3"
            >
              <div className="w-9 h-9 clay-card-blue flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-[16px] tracking-[-0.02em] text-[#0B1220] block leading-tight">
                  Deep Down Logistics
                </span>
                <span className="text-[10px] text-[#0A54E1] font-semibold tracking-widest uppercase block">
                  Limited
                </span>
              </div>
            </Link>
            <p className="m-0">
              Groupage shipping and cargo logistics, China to Nigeria.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[#0B1220] mb-3">Services</p>
            <div className="flex flex-col gap-1.5">
              <a href="#services" className="hover:text-[#0A54E1]">Express air</a>
              <a href="#services" className="hover:text-[#0A54E1]">Ocean freight</a>
              <a href="#services" className="hover:text-[#0A54E1]">Nationwide delivery</a>
              <a href="#track" className="hover:text-[#0A54E1]">Cargo tracking</a>
              <a href="#calculator" className="hover:text-[#0A54E1]">CBM calculator</a>
              <a href="#offices" className="hover:text-[#0A54E1]">Our offices</a>
              <Link to="/contact" className="hover:text-[#0A54E1]">Contact us</Link>
              <Link to="/login" className="hover:text-[#0A54E1]">Client portal</Link>
              <Link to="/privacy" className="hover:text-[#0A54E1]">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[#0A54E1]">Terms of Service</Link>
            </div>
          </div>

          <div>
            <p className="font-semibold text-[#0B1220] mb-3">Guangzhou Hub</p>
            <div className="space-y-2 leading-relaxed">
              <p className="m-0">
                No.111 Juncture North Station Road &amp; Sha Yong South Rd, Yuexiu District, Guangzhou
              </p>
              <p className="m-0">
                <span className="text-[#0B1220] font-medium">Bishop:</span>{' '}
                <a href="tel:+8613250277859" className="hover:text-[#0A54E1]">+86 13250277859</a>
                <br />
                <span className="text-[#0B1220] font-medium">Office:</span>{' '}
                <a href="tel:+8613048001610" className="hover:text-[#0A54E1]">+86 13048001610</a>
                <br />
                <span className="text-[#0B1220] font-medium">China office:</span>{' '}
                <a href="tel:+8613143335303" className="hover:text-[#0A54E1]">+86 13143335303</a>
                <br />
                <span className="text-[#0B1220] font-medium">Tony (Guangzhou/Yiwu):</span>{' '}
                <a href="tel:+8618680460400" className="hover:text-[#0A54E1]">+86 18680460400</a>
              </p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-[#0B1220] mb-3">Lagos &amp; Warehouse</p>
            <div className="space-y-2 leading-relaxed">
              <p className="m-0">
                Apapa &amp; Tin Can Island Clearance Hub • Ikeja Air Cargo Terminal, Lagos
              </p>
              <p className="m-0">
                <span className="text-[#0B1220] font-medium">Lagos:</span>{' '}
                <a href="tel:08067635193" className="hover:text-[#0A54E1]">08067635193</a>,{' '}
                <a href="tel:07065252406" className="hover:text-[#0A54E1]">07065252406</a>
                <br />
                <span className="text-[#0B1220] font-medium">CEO (Onyemco):</span>{' '}
                <a href="tel:08033085846" className="hover:text-[#0A54E1]">08033085846</a>
              </p>
              <p className="m-0">
                Warehouse No.111 North Station South Rd, Guangzhou
                <br />
                <a href="tel:+861325077859" className="hover:text-[#0A54E1]">+86 1325077859</a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
