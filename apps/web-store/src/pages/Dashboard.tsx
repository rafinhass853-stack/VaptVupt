import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useStore } from "../context/StoreContext";
import {
  Package,
  Truck,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, Badge, SkeletonCard, EmptyState } from "@vaptvupt/shared-ui";

interface Order {
  id: string;
  status: string;
  totalOrderValue?: number;
  pricing: { totalFee: number };
  createdAt: any;
}

export default function Dashboard() {
  const { store } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store) return;
    const q = query(collection(db, "orders"), where("storeId", "==", store.id));
    const unsub = onSnapshot(q, (snap) => {
      const list: Order[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          status: data.status,
          totalOrderValue: data.totalOrderValue,
          pricing: data.pricing || { totalFee: 0 },
          createdAt: data.createdAt,
        });
      });
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, [store]);

  const active = orders.filter(
    (o) => !["DELIVERED", "CANCELLED", "FAILED"].includes(o.status)
  );
  const delivered = orders.filter((o) => o.status === "DELIVERED");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(
    (o) => o.createdAt?.toDate?.()?.getTime() >= today.getTime()
  );
  const todayRevenue = todayOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + (o.pricing?.totalFee || 0), 0);

  if (loading) {
    return (
      <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Olá, {store?.name?.split(" ")[0] || "Loja"} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Acompanhe suas entregas em tempo real
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={<Package size={22} />}
          label="Pedidos Ativos"
          value={active.length}
          color="blue"
        />
        <StatCard
          icon={<Truck size={22} />}
          label="Entregues Hoje"
          value={todayOrders.filter((o) => o.status === "DELIVERED").length}
          color="green"
        />
        <StatCard
          icon={<DollarSign size={22} />}
          label="Gasto Hoje"
          value={`R$ ${todayRevenue.toFixed(2)}`}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Total de Pedidos"
          value={delivered.length}
          color="orange"
        />
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/"
          className="group bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Package size={28} />
            </div>
            <ArrowRight
              size={28}
              className="group-hover:translate-x-1 transition-transform"
            />
          </div>
          <h3 className="text-xl font-bold mb-1">Nova Rota de Entrega</h3>
          <p className="text-emerald-100 text-sm">
            Criar pedido e chamar motoboy
          </p>
        </Link>

        <Link
          to="/tracking"
          className="group bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Truck size={28} />
            </div>
            <ArrowRight
              size={28}
              className="group-hover:translate-x-1 transition-transform"
            />
          </div>
          <h3 className="text-xl font-bold mb-1">Entregas ao Vivo</h3>
          <p className="text-slate-300 text-sm">
            Acompanhe no mapa em tempo real
          </p>
        </Link>
      </div>

      {/* Pedidos recentes */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Pedidos Recentes</h2>
          <Link
            to="/orders"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
          >
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={<Package size={32} />}
            title="Nenhum pedido ainda"
            description="Crie sua primeira rota de entrega para começar."
          />
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                to="/orders"
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition"
              >
                <div className="bg-slate-100 p-2 rounded-lg">
                  <Package size={18} className="text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {order.totalOrderValue
                      ? `R$ ${order.totalOrderValue.toFixed(2)} em produtos`
                      : "—"}
                  </p>
                </div>
                <Badge variant={statusVariant(order.status)}>
                  {statusLabel(order.status)}
                </Badge>
                <span className="text-sm font-semibold text-slate-700">
                  R$ {order.pricing.totalFee.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition">
      <div className={`inline-flex p-3 rounded-xl ${colors[color]} mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Pendente",
    SEARCHING_DRIVER: "Buscando",
    OFFERED: "Ofertado",
    ACCEPTED: "Aceito",
    COLLECTED: "Coletado",
    IN_DELIVERY: "Em rota",
    DELIVERED: "Entregue",
    CANCELLED: "Cancelado",
    FAILED: "Falhou",
  };
  return map[status] || status;
}

function statusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  const map: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    PENDING: "default",
    SEARCHING_DRIVER: "warning",
    OFFERED: "warning",
    ACCEPTED: "info",
    COLLECTED: "info",
    IN_DELIVERY: "info",
    DELIVERED: "success",
    CANCELLED: "danger",
    FAILED: "danger",
  };
  return map[status] || "default";
}