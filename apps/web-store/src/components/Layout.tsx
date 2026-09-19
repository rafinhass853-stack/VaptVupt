import { ReactNode } from "react";
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
} from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  const { store, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

    const menuItems = [
    { to: "/", icon: MapPin, label: "Nova Rota" },
    { to: "/tracking", icon: Truck, label: "Entregas em Tempo Real" },
    { to: "/wallet", icon: Wallet, label: "Carteira" },
    { to: "/orders", icon: Package, label: "Meus Pedidos" },
    { to: "/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-emerald-900 text-white flex flex-col">
        <div className="p-6 border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">VaptVupt</h1>
              <p className="text-xs text-emerald-300">Portal da Loja</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-950 border-b border-emerald-800">
          <div className="flex items-center gap-2 mb-2">
            <StoreIcon size={16} className="text-emerald-400" />
            <span className="text-sm font-medium truncate">{store?.name}</span>
          </div>
          <div className="text-xs text-emerald-300">
            Saldo:{" "}
            <span className="font-bold text-white">
              R$ {store?.balance.toFixed(2) || "0.00"}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-emerald-200 hover:bg-emerald-800"
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-300 hover:text-red-200 text-sm w-full"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}