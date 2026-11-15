import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Package, ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0B1220] font-sans text-base leading-[1.65] selection:bg-[#0A54E1]/15 selection:text-[#0A54E1]">
      <Helmet>
        <title>Terms of Service - Deep Down Logistics Limited</title>
        <meta
          name="description"
          content="Terms of Service for Deep Down Logistics Limited (deepdownlogistics.com). Review our air cargo, ocean freight, customs clearance, and client portal terms."
        />
        <link rel="canonical" href="https://deepdownlogistics.com/terms" />
      </Helmet>

      <div className="max-w-[880px] mx-auto px-4 sm:px-8">
        {/* Header */}
        <header className="flex justify-between items-center py-6 border-b border-[#E3E8F0]">
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

        {/* Main Content */}
        <main className="py-12 sm:py-16 space-y-8">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.12em] text-[#0A54E1] uppercase mb-2">
              LEGAL TERMS
            </p>
            <h1 className="font-bold text-3xl sm:text-5xl tracking-[-0.03em] leading-[1.1] mb-3">
              Terms of Service
            </h1>
            <p className="text-sm text-[#6B7585]">
              Effective Date: November 15, 2026 • Domain:{" "}
              <a href="https://deepdownlogistics.com" className="text-[#0A54E1] hover:underline">
                https://deepdownlogistics.com
              </a>
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B1220]">1. Acceptance of Terms</h2>
            <p className="text-[#4B5565]">
              By accessing or using{" "}
              <strong>https://deepdownlogistics.com</strong> and the Deep Down Logistics Limited client portal, you agree to be bound by these Terms of Service and our{" "}
              <Link to="/privacy" className="text-[#0A54E1] hover:underline">
                Privacy Policy
              </Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B1220]">2. Logistics &amp; Freight Services</h2>
            <p className="text-[#4B5565]">
              Deep Down Logistics Limited provides air cargo consolidation, ocean freight groupage (LCL), full container load (FCL), and customs clearance from Guangzhou, China to Lagos, Nigeria. Estimated transit times (5–7 days for express air cargo and 35–45 days for ocean freight) are standard operational timelines and may vary due to airline schedules, maritime vessel routing, or port customs inspections.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B1220]">3. Client Portal &amp; Shipping Marks</h2>
            <p className="text-[#4B5565]">
              Clients are responsible for ensuring accurate Shipping Marks and WhatsApp contact numbers are provided when delivering goods to our Guangzhou warehouse. Freight charges (USD) and Lagos clearing charges (NGN) are calculated based on verified warehouse measurements (CBM or chargeable weight).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B1220]">4. Prohibited Goods</h2>
            <p className="text-[#4B5565]">
              Clients must not ship hazardous materials, contraband, or items restricted by Chinese export customs or Nigerian import customs regulations.
            </p>
          </section>

          <section className="space-y-3 bg-[#F1F4F9] rounded-3xl p-6 sm:p-8 border border-[#E3E8F0]">
            <h2 className="text-xl font-bold text-[#0B1220]">5. Contact Information</h2>
            <div className="text-sm text-[#0B1220] space-y-1.5">
              <p>
                <strong>Company:</strong> Deep Down Logistics Limited
              </p>
              <p>
                <strong>Website:</strong>{" "}
                <a href="https://deepdownlogistics.com" className="text-[#0A54E1] hover:underline">
                  https://deepdownlogistics.com
                </a>
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:stephenmayowa112@gmail.com" className="text-[#0A54E1] hover:underline">
                  stephenmayowa112@gmail.com
                </a>
              </p>
              <p>
                <strong>Guangzhou Hub:</strong> No.111 Juncture North Station Road &amp; Sha Yong South Rd, Yuexiu District, Guangzhou (+86 13250277859)
              </p>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#E3E8F0] py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#6B7585]">
          <p>© {new Date().getFullYear()} Deep Down Logistics Limited. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/" className="hover:text-[#0A54E1]">Home</Link>
            <Link to="/privacy" className="hover:text-[#0A54E1]">Privacy Policy</Link>
            <Link to="/terms" className="text-[#0A54E1] font-medium">Terms of Service</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
