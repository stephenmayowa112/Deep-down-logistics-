/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import PublicTracking from "./pages/PublicTracking";
import { Toaster } from "sonner";

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: "admin" | "client" }) => {
  const { user, dbUser, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center bg-neutral-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (!user || !dbUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && dbUser.role !== allowedRole && dbUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const DashboardRouter = () => {
  const { dbUser } = useAuth();
  if (dbUser?.role === "admin") return <AdminDashboard />;
  return <ClientDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/track/:trackingId" element={<PublicTracking />} />
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
