import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Store,
  Settings,
  DollarSign,
  LogOut,
  Truck,
  Shield,
  FileText,
} from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "Torre de Controle" },
    { to: "/drivers", icon: Users, label: "Motoboys" },
    { to: "/stores", icon: Store, label: "Lojas" },
    { to: "/finance", icon: DollarSign, label: "Financeiro" },
    { to: "/audit", icon: FileText, label: "Auditoria" },
    { to: "/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
              <Truck size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">VaptVupt</h1>
              <p className="text-xs text-blue-300">Painel Admin</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950/50 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
              <Shield size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Administrador</p>
              <p className="text-sm font-medium truncate">
                {user?.email?.split("@")[0]}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium w-full px-4 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}