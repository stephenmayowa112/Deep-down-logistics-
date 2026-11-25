/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { auth } from "./lib/firebase";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import PublicTracking from "./pages/PublicTracking";
import PackingListPreview from "./pages/PackingListPreview";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import { Toaster } from "sonner";
import { ShieldAlert, Clock, LogOut, Package } from "lucide-react";

const ProtectedRoute = ({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole?: "super_admin" | "admin" | "client";
}) => {
  const { user, dbUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !dbUser) {
    return <Navigate to="/login" replace />;
  }

  const isPrivileged = dbUser.role === "admin" || dbUser.role === "super_admin";
  if (allowedRole && dbUser.role !== allowedRole && !isPrivileged) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AccountStatusGate = ({ children }: { children: React.ReactNode }) => {
  const { dbUser } = useAuth();

  if (!dbUser) return null;

  // Super Admin always bypasses status gates
  if (dbUser.role === "super_admin") {
    return <>{children}</>;
  }

  const effectiveStatus =
    dbUser.account_status || (dbUser.is_verified ? "approved" : "pending");

  if (effectiveStatus === "suspended") {
    return (
      <div className="min-h-dvh bg-[#FFFFFF] text-[#0B1220] flex flex-col justify-center items-center px-4 py-12 font-sans">
        <div className="max-w-md w-full bg-[#F1F4F9] border border-[#E3E8F0] rounded-[28px] p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#0B1220]">Account Suspended</h1>
          <p className="text-sm text-[#4B5565] mt-2 leading-relaxed">
            Your account ({dbUser.shipping_mark}) has been suspended by the platform Super Admin. Please contact our Lagos office for assistance.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              to="/contact"
              className="w-full py-3 rounded-full bg-[#0A54E1] text-white text-sm font-semibold inline-flex items-center justify-center"
            >
              Contact Support
            </Link>
            <button
              onClick={() => auth.signOut()}
              className="w-full py-3 rounded-full bg-white border border-[#D5DBE5] text-[#4B5565] hover:text-[#0B1220] text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveStatus === "pending") {
    return (
      <div className="min-h-dvh bg-[#FFFFFF] text-[#0B1220] flex flex-col justify-center items-center px-4 py-12 font-sans">
        <div className="max-w-md w-full bg-[#F1F4F9] border border-[#E3E8F0] rounded-[28px] p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#0B1220]">Pending Account Approval</h1>
          <p className="text-sm text-[#4B5565] mt-2 leading-relaxed">
            Your account (<span className="font-mono font-semibold text-[#0B1220]">{dbUser.shipping_mark}</span>) is currently awaiting approval from a Super Admin. You will gain full dashboard access once approved.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              to="/"
              className="w-full py-3 rounded-full bg-[#0A54E1] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              Back to Home & Public Tracking
            </Link>
            <button
              onClick={() => auth.signOut()}
              className="w-full py-3 rounded-full bg-white border border-[#D5DBE5] text-[#4B5565] hover:text-[#0B1220] text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const INVENTORY_APP_URL = "https://shipping-inventry-gp91.vercel.app";

const InventoryRedirect = () => {
  React.useEffect(() => {
    const subPath = window.location.pathname.replace(/^\/inventory/, "");
    const targetUrl = `${INVENTORY_APP_URL}${subPath}${window.location.search}${window.location.hash}`;
    window.location.replace(targetUrl);
  }, []);

  return (
    <div className="min-h-dvh bg-[#FFFFFF] text-[#0B1220] flex flex-col items-center justify-center px-4 font-sans">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A54E1] mb-4" />
      <p className="text-sm text-[#4B5565]">
        Redirecting to Shipping Inventory{" "}
        <a
          href={INVENTORY_APP_URL}
          className="text-[#0A54E1] font-semibold underline"
        >
          ({INVENTORY_APP_URL})
        </a>
        ...
      </p>
    </div>
  );
};

const DashboardRouter = () => {
  const { dbUser } = useAuth();
  if (dbUser?.role === "super_admin" || dbUser?.role === "admin") {
    return (
      <AccountStatusGate>
        <AdminDashboard />
      </AccountStatusGate>
    );
  }
  return (
    <AccountStatusGate>
      <ClientDashboard />
    </AccountStatusGate>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/inventory" element={<InventoryRedirect />} />
          <Route path="/inventory/*" element={<InventoryRedirect />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/track/:trackingId" element={<PublicTracking />} />
          <Route path="/dev/packing-list-preview" element={<PackingListPreview />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
