import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "@vaptvupt/shared-ui";
import { auth } from "./lib/firebase";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Operations from "./pages/Operations";
import Orders from "./pages/Orders";
import Couriers from "./pages/Couriers";
import Stores from "./pages/Stores";
import Finance from "./pages/Finance";
import Notifications from "./pages/Notifications";
import Support from "./pages/Support";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";

function Loading() { return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" /></div>; }

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6"><div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md text-center"><h2 className="text-xl font-bold text-slate-800">Acesso restrito</h2><p className="text-slate-500 mt-2 mb-6">Sua conta não possui permissão de administrador.</p><button onClick={() => auth.signOut()} className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-semibold">Sair</button></div></div>;
  return <Layout>{children}</Layout>;
}
function PublicRoute({ children }: { children: ReactNode }) { const { user, loading } = useAuth(); if (loading) return <Loading />; if (user) return <Navigate to="/" replace />; return <>{children}</>; }

export default function App() {
  return <ToastProvider><AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/operations" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
    <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
    <Route path="/couriers" element={<ProtectedRoute><Couriers /></ProtectedRoute>} />
    <Route path="/drivers" element={<Navigate to="/couriers" replace />} />
    <Route path="/stores" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
    <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
    <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
    <Route path="/audit" element={<ProtectedRoute><Audit /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></AuthProvider></ToastProvider>;
}