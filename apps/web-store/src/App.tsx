import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { StoreProvider, useStore } from "./context/StoreContext";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import NewRoute from "./pages/NewRoute";
import Wallet from "./pages/Wallet";
import Orders from "./pages/Orders";
import Tracking from "./pages/Tracking";
import StoreSettings from "./pages/StoreSettings";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><NewRoute /></ProtectedRoute>} />
          <Route path="/tracking" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><StoreSettings /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}