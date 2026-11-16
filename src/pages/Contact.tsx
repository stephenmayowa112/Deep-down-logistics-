import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Menu, X, Package, Phone, MapPin, Clock, Mail } from 'lucide-react';

export default function Contact() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0B1220] font-sans text-base leading-[1.6] selection:bg-[#0A54E1]/15 selection:text-[#0A54E1] overflow-x-hidden">
      <Helmet>
        <title>Contact Us - Deep Down Logistics Limited</title>
        <meta
          name="description"
          content="Offices and warehouses in Lagos, Guangzhou, and Yiwu. Contact De Great Deep Down Logistics Limited for groupage shipping, air cargo, ocean freight, and nationwide waybill delivery."
        />
        <link rel="canonical" href="https://deepdownlogistics.com/contact" />
      </Helmet>

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
            <Link to="/#services" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              Services
            </Link>
            <Link to="/#how" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              How it works
            </Link>
            <Link to="/#calculator" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              Calculator
            </Link>
            <Link to="/#faq" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              FAQ
            </Link>
            <Link to="/#track" className="text-[#0B1220] hover:opacity-65 transition-opacity">
              Track
            </Link>
            <Link to="/contact" className="text-[#0A54E1] font-semibold">
              Contact
            </Link>
            <Link
              to="/login"
              className="px-5 py-[11px] text-[#0B1220] hover:opacity-65 transition-opacity"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="pill-btn-minimal bg-[#0A54E1] text-white px-[22px] py-[11px] rounded-full font-medium"
            >
              Create account
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
            <Link
              to="/#services"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              Services
            </Link>
            <Link
              to="/#how"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              How it works
            </Link>
            <Link
              to="/#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              CBM Calculator
            </Link>
            <Link
              to="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              FAQ
            </Link>
            <Link
              to="/#track"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl hover:bg-white transition-colors"
            >
              Track cargo
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl bg-white text-[#0A54E1] font-semibold"
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
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 px-5 rounded-full bg-[#0A54E1] text-white text-center font-semibold"
              >
                Create account
              </Link>
            </div>
          </nav>
        )}

        {/* Hero Section */}
        <section className="hero pt-10 sm:pt-20 pb-10 sm:pb-16 text-center">
          <div className="blob b1" />
          <div className="blob b2" />
          <div className="dots" />

          <p className="rise text-[13px] font-semibold tracking-[0.12em] text-[#0A54E1] mb-3 uppercase">
            CONTACT US
          </p>
          <h1 className="rise d1 font-bold text-[clamp(36px,7vw,76px)] leading-[1.04] tracking-[-0.035em] mx-auto max-w-[780px]">
            Talk to us.
          </h1>
          <p className="rise d2 text-[17px] sm:text-[19px] text-[#4B5565] max-w-[540px] mx-auto mt-5 px-2">
            Offices in Lagos, Guangzhou and Yiwu. Call the one closest to your cargo.
          </p>

          <div className="route rise d3">
            <span>Guangzhou &amp; Yiwu</span>
            <div className="line">
              <span className="dot" />
            </div>
            <span>Lagos</span>
          </div>
        </section>

        {/* Main Offices & Hubs Grid */}
        <section className="py-8 sm:py-12 space-y-8">
          {/* Lagos (Nigeria) + Lagos Hubs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lagos Main Office Card */}
            <div className="lg:col-span-7 service-card-minimal bg-[#F1F4F9] rounded-[28px] p-7 sm:p-10 border border-[#E3E8F0] flex flex-col justify-between">
              <div>
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[#0A54E1] uppercase mb-2">
                  NIGERIA HEAD OFFICE
                </p>
                <h2 className="font-bold text-2xl sm:text-[32px] tracking-[-0.025em] text-[#0B1220] mb-4">
                  Lagos (Nigeria)
                </h2>
                <p className="text-[#4B5565] text-[15px] sm:text-base flex items-start gap-2.5 mb-6">
                  <MapPin className="w-5 h-5 text-[#0A54E1] shrink-0 mt-0.5" />
                  <span>
                    B77 Plaza, A.P.T, Trade Fair International Market, Badagry Expressway, Lagos
                  </span>
                </p>

                {/* Office Lines Pill Box */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8F0] mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7585] mb-1.5">
                    Office lines
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-[#0B1220] m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <a href="tel:08067635193" className="text-[#0A54E1] hover:underline">
                      0806 763 5193
                    </a>
                    <span className="text-[#9DB7EE]">·</span>
                    <a href="tel:07065252406" className="text-[#0A54E1] hover:underline">
                      0706 525 2406
                    </a>
                  </p>
                </div>

                {/* Direct Team Lines */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/80 rounded-2xl px-4 py-3 border border-[#E3E8F0] flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#4B5565]">Onyemco (CEO)</span>
                    <a
                      href="tel:08033085846"
                      className="text-sm font-semibold text-[#0B1220] hover:text-[#0A54E1] inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0A54E1]" />
                      0803 308 5846
                    </a>
                  </div>

                  <div className="bg-white/80 rounded-2xl px-4 py-3 border border-[#E3E8F0] flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#4B5565]">Ekene</span>
                    <a
                      href="tel:08034190266"
                      className="text-sm font-semibold text-[#0B1220] hover:text-[#0A54E1] inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0A54E1]" />
                      0803 419 0266
                    </a>
                  </div>

                  <div className="bg-white/80 rounded-2xl px-4 py-3 border border-[#E3E8F0] flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#4B5565]">Uche</span>
                    <a
                      href="tel:07034580165"
                      className="text-sm font-semibold text-[#0B1220] hover:text-[#0A54E1] inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0A54E1]" />
                      0703 458 0165
                    </a>
                  </div>

                  <div className="bg-white/80 rounded-2xl px-4 py-3 border border-[#E3E8F0] flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#4B5565]">Bishop</span>
                    <a
                      href="tel:08161249334"
                      className="text-sm font-semibold text-[#0B1220] hover:text-[#0A54E1] inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0A54E1]" />
                      0816 124 9334
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Lagos Hubs Card */}
            <div className="lg:col-span-5 service-card-minimal bg-[#F1F4F9] rounded-[28px] p-7 sm:p-10 border border-[#E3E8F0] flex flex-col justify-between">
              <div>
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[#0A54E1] uppercase mb-2">
                  CLEARANCE &amp; DISPATCH
                </p>
                <h2 className="font-bold text-2xl sm:text-[32px] tracking-[-0.025em] text-[#0B1220] mb-5">
                  Lagos hubs
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="bg-white rounded-2xl p-4 border border-[#E3E8F0] flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0A54E1] shrink-0" />
                    <span className="font-semibold text-[#0B1220] text-[15px]">
                      Apapa and Tin Can Island clearance hub
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-[#E3E8F0] flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0A54E1] shrink-0" />
                    <span className="font-semibold text-[#0B1220] text-[15px]">
                      Ikeja Air Cargo Terminal
                    </span>
                  </div>
                </div>

                <p className="text-[#4B5565] text-[15px] leading-relaxed m-0 bg-white/70 rounded-2xl p-4 border border-[#E3E8F0]">
                  We deliver to all states and the FCT by waybill.
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-[#E3E8F0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#4B5565]">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#0A54E1] shrink-0" />
                  <span>
                    <strong className="text-[#0B1220]">Email:</strong> [EMAIL]
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0A54E1] shrink-0" />
                  <span>
                    <strong className="text-[#0B1220]">Hours:</strong> [OFFICE HOURS]
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Guangzhou & Yiwu (China) Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Guangzhou (China) — Warehouse A & Warehouse B */}
            <div className="lg:col-span-7 service-card-minimal bg-[#F1F4F9] rounded-[28px] p-7 sm:p-10 border border-[#E3E8F0]">
              <p className="text-[12px] font-semibold tracking-[0.12em] text-[#0A54E1] uppercase mb-2">
                CHINA RECEIVING HUBS
              </p>
              <h2 className="font-bold text-2xl sm:text-[32px] tracking-[-0.025em] text-[#0B1220] mb-6">
                Guangzhou (China)
              </h2>

              <div className="space-y-5">
                {/* Warehouse A */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E3E8F0]">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0A54E1] mb-1.5">
                    Warehouse A
                  </p>
                  <p className="text-[#0B1220] font-medium text-[15px] mb-4 leading-relaxed">
                    Room 105, Building 3, No. 72 Shiqing Road, Baiyun District, Guangzhou City, Guangdong Province
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm pt-3 border-t border-[#E3E8F0]">
                    <div>
                      <span className="text-[#6B7585]">Tony: </span>
                      <a
                        href="tel:+8618680460400"
                        className="font-semibold text-[#0B1220] hover:text-[#0A54E1]"
                      >
                        +86 186 8046 0400
                      </a>
                    </div>
                    <div>
                      <span className="text-[#6B7585]">Office line: </span>
                      <a
                        href="tel:+8613143335303"
                        className="font-semibold text-[#0B1220] hover:text-[#0A54E1]"
                      >
                        +86 131 4333 5303
                      </a>
                    </div>
                  </div>
                </div>

                {/* Warehouse B */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E3E8F0]">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0A54E1] mb-1.5">
                    Warehouse B
                  </p>
                  <p className="text-[#0B1220] font-medium text-[15px] mb-4 leading-relaxed">
                    No. 111 Juncture North Station Road &amp; Sha Yong South Road, Yuexiu District, Guangzhou
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm pt-3 border-t border-[#E3E8F0]">
                    <div>
                      <span className="text-[#6B7585]">Bishop: </span>
                      <a
                        href="tel:+8613250277859"
                        className="font-semibold text-[#0B1220] hover:text-[#0A54E1]"
                      >
                        +86 132 5027 7859
                      </a>
                    </div>
                    <div>
                      <span className="text-[#6B7585]">Office: </span>
                      <a
                        href="tel:+8613048001610"
                        className="font-semibold text-[#0B1220] hover:text-[#0A54E1]"
                      >
                        +86 130 4800 1610
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Yiwu (China) */}
            <div className="lg:col-span-5 service-card-minimal bg-[#F1F4F9] rounded-[28px] p-7 sm:p-10 border border-[#E3E8F0] flex flex-col justify-between">
              <div>
                <p className="text-[12px] font-semibold tracking-[0.12em] text-[#0A54E1] uppercase mb-2">
                  ZHEJIANG RECEIVING HUB
                </p>
                <h2 className="font-bold text-2xl sm:text-[32px] tracking-[-0.025em] text-[#0B1220] mb-4">
                  Yiwu (China)
                </h2>

                <p className="text-[#4B5565] text-[15px] sm:text-base flex items-start gap-2.5 mb-6">
                  <MapPin className="w-5 h-5 text-[#0A54E1] shrink-0 mt-0.5" />
                  <span>
                    Unit 2, Block 9 West Ho Second District, Houzhai, Yiwu City, Zhejiang Province
                  </span>
                </p>

                <div className="space-y-3">
                  <div className="bg-white rounded-2xl px-4 py-3.5 border border-[#E3E8F0] flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#4B5565]">Ocean</span>
                    <a
                      href="tel:+8613500224598"
                      className="text-sm font-semibold text-[#0B1220] hover:text-[#0A54E1] inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0A54E1]" />
                      +86 135 0022 4598
                    </a>
                  </div>

                  <div className="bg-white rounded-2xl px-4 py-3.5 border border-[#E3E8F0] flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#4B5565]">Emeka</span>
                    <a
                      href="tel:+8615657931902"
                      className="text-sm font-semibold text-[#0B1220] hover:text-[#0A54E1] inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0A54E1]" />
                      +86 156 5793 1902
                    </a>
                  </div>

                  <div className="bg-white rounded-2xl px-4 py-3.5 border border-[#E3E8F0] flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#4B5565]">Tony</span>
                    <a
                      href="tel:+8618680460400"
                      className="text-sm font-semibold text-[#0B1220] hover:text-[#0A54E1] inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0A54E1]" />
                      +86 186 8046 0400
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[#E3E8F0] text-xs text-[#6B7585]">
                Consolidation and groupage dispatch from Yiwu and Guangzhou directly to Lagos.
              </div>
            </div>
          </div>
        </section>

        {/* Closing Callout Banner */}
        <section className="py-8 sm:py-12 pb-16 sm:pb-24">
          <div className="bg-[#0A54E1] text-white rounded-[28px] sm:rounded-[32px] p-7 sm:py-14 sm:px-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <h2 className="font-bold text-2xl sm:text-[34px] tracking-[-0.03em] leading-[1.15] m-0">
                Not sure who to call? Start with the Lagos office lines and we’ll connect you.
              </h2>
            </div>
            <div className="lg:col-span-5 flex gap-3 sm:gap-4 flex-wrap lg:justify-end">
              <a
                href="tel:08067635193"
                className="pill-btn-minimal bg-white text-[#0A54E1] px-6 py-3.5 rounded-full font-semibold text-[15px] inline-flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                0806 763 5193
              </a>
              <a
                href="tel:07065252406"
                className="pill-btn-minimal border border-white text-white px-6 py-3.5 rounded-full font-medium text-[15px] inline-flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                0706 525 2406
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#E3E8F0] pt-14 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-[14px] text-[#4B5565]">
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
              <Link to="/#services" className="hover:text-[#0A54E1]">Express air</Link>
              <Link to="/#services" className="hover:text-[#0A54E1]">Ocean freight</Link>
              <Link to="/#services" className="hover:text-[#0A54E1]">Nationwide delivery</Link>
              <Link to="/#track" className="hover:text-[#0A54E1]">Cargo tracking</Link>
              <Link to="/#calculator" className="hover:text-[#0A54E1]">CBM calculator</Link>
              <Link to="/contact" className="text-[#0A54E1] font-medium">Contact us</Link>
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
