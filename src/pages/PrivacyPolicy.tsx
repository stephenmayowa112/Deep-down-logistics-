import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Package, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0B1220] font-sans text-base leading-[1.65] selection:bg-[#0A54E1]/15 selection:text-[#0A54E1]">
      <Helmet>
        <title>Privacy Policy - Deep Down Logistics Limited</title>
        <meta
          name="description"
          content="Privacy Policy for Deep Down Logistics Limited (deepdownlogistics.com). Learn how we collect, use, and protect your account, cargo manifest, and WhatsApp notification data."
        />
        <link rel="canonical" href="https://deepdownlogistics.com/privacy" />
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
              LEGAL &amp; DATA PROTECTION
            </p>
            <h1 className="font-bold text-3xl sm:text-5xl tracking-[-0.03em] leading-[1.1] mb-3">
              Privacy Policy
            </h1>
            <p className="text-sm text-[#6B7585]">
              Effective Date: November 15, 2026 • Domain:{" "}
              <a href="https://deepdownlogistics.com" className="text-[#0A54E1] hover:underline">
                https://deepdownlogistics.com
              </a>
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B1220]">1. Introduction</h2>
            <p className="text-[#4B5565]">
              Deep Down Logistics Limited (&ldquo;Deep Down Logistics,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates{" "}
              <strong>https://deepdownlogistics.com</strong> to provide air cargo, ocean freight, groupage, container logistics, and customs clearing services between Guangzhou, China and Lagos, Nigeria. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our website, client portal, and Google Sign-In authentication.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B1220]">2. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2 text-[#4B5565]">
              <li>
                <strong>Account &amp; Google Sign-In Data:</strong> When you sign in using Google OAuth or create an account with your email address, we receive your basic Google profile information (email address, display name, and unique authentication identifier) solely to authenticate your identity and link you to your client dashboard.
              </li>
              <li>
                <strong>Shipping &amp; Logistics Information:</strong> We collect your designated Shipping Mark, phone/WhatsApp number, container numbers, tracking numbers, carton counts (CTN), cubic meter volume (CBM), and shipment status history.
              </li>
              <li>
                <strong>Communications:</strong> If you provide a WhatsApp phone number, we use it to send automated shipment status updates and packing list notifications via the Meta WhatsApp Cloud API.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B1220]">3. How We Use Your Information</h2>
            <p className="text-[#4B5565]">
              We use the information we collect strictly to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#4B5565]">
              <li>Authenticate your access to the Deep Down Logistics Client Portal.</li>
              <li>Match warehouse manifests and cargo records to your unique Shipping Mark.</li>
              <li>Provide live tracking updates from our Guangzhou warehouse hub to Lagos clearance ports.</li>
              <li>Send automated WhatsApp or email notifications regarding your shipment status and freight invoices.</li>
            </ul>
            <p className="text-[#4B5565]">
              Our use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements, as well as the Google APIs Terms of Service. Deep Down Logistics is strictly a commercial cargo shipping and shipment-tracking portal—we do not provide AI image or media generation features and do not use any Google APIs to generate or process synthetic media or non-consensual imagery. We never sell, rent, or trade your personal data to third parties for advertising or marketing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B1220]">4. Data Storage &amp; Security</h2>
            <p className="text-[#4B5565]">
              Your account profile and shipment records are stored securely on Google Cloud / Firebase Firestore infrastructure with strict role-based security rules and HTTPS encryption in transit. Only authorized logistics administrators and the verified account owner can view private client portal records.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B1220]">5. Your Rights &amp; Data Deletion</h2>
            <p className="text-[#4B5565]">
              You may access, update, or request deletion of your account profile and personal contact information at any time by contacting our support team. You may also revoke Google Sign-In access at any time from your Google Account Security settings.
            </p>
          </section>

          <section className="space-y-3 bg-[#F1F4F9] rounded-3xl p-6 sm:p-8 border border-[#E3E8F0]">
            <h2 className="text-xl font-bold text-[#0B1220]">6. Contact Us</h2>
            <p className="text-[#4B5565]">
              If you have any questions about this Privacy Policy or our data practices, please contact Deep Down Logistics Limited:
            </p>
            <div className="text-sm text-[#0B1220] space-y-1.5 pt-2">
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
                <strong>Lagos Office:</strong> B77 Plaza, A.P.T, Trade Fair International Market, Badagry Expressway (08067635193, 07065252406 • CEO: 08033085846)
              </p>
              <p>
                <strong>Guangzhou Warehouse:</strong> Room 105, Building 3, No. 72 Shiqing Road, Baiyun District, Guangzhou, Guangdong (+86 13143335303)
              </p>
              <p>
                <strong>Yiwu Warehouse:</strong> Unit 2, Block 9 West Ho Second District, Houzhai, Yiwu, Zhejiang (Tony: +86 18680460400)
              </p>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#E3E8F0] py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#6B7585]">
          <p>© {new Date().getFullYear()} Deep Down Logistics Limited. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/" className="hover:text-[#0A54E1]">Home</Link>
            <Link to="/privacy" className="text-[#0A54E1] font-medium">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#0A54E1]">Terms of Service</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
