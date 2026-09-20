import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import {
  MapPin,
  Wallet,
  Package,
  LogOut,
  Store as StoreIcon,
  Truck,
  Settings,
  Home,
} from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  const { store, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems = [
    { to: "/dashboard", icon: Home, label: "Início" },
    { to: "/new-route", icon: MapPin, label: "Nova Rota" },
    { to: "/tracking", icon: Truck, label: "Entregas ao Vivo" },
    { to: "/orders", icon: Package, label: "Meus Pedidos" },
    { to: "/wallet", icon: Wallet, label: "Carteira" },
    { to: "/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-emerald-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg shadow-lg">
              <Truck size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">VaptVupt</h1>
              <p className="text-xs text-emerald-300">Portal da Loja</p>
            </div>
          </div>
        </div>

        {/* Loja Card */}
        <div className="p-4 bg-emerald-950/40 border-b border-emerald-800/50">
          <div className="flex items-center gap-2 mb-2">
            <StoreIcon size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold truncate">
              {store?.name || "Carregando..."}
            </span>
          </div>
          <div className="bg-emerald-800/50 rounded-lg p-3">
            <p className="text-xs text-emerald-300 mb-1">Saldo disponível</p>
            <p className="text-lg font-bold">
              R$ {store?.balance.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-emerald-100 hover:bg-emerald-800/60"
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-emerald-800/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-emerald-300 hover:text-white text-sm font-medium w-full px-4 py-2 rounded-lg hover:bg-emerald-800/60 transition"
          >
            <LogOut size={16} />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}