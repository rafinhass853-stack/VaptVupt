import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import LiveMap from "../components/LiveMap";
import type { MapMarker } from "../components/LiveMap";
import { Users, Package, DollarSign, TrendingUp } from "lucide-react";

interface Driver {
  id: string;
  name: string;
  status: string;
  lat?: number;
  lng?: number;
}

interface Order {
  id: string;
  status: string;
  storeName: string;
  pricing: { totalFee: number };
  createdAt: any;
}

export default function Dashboard() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);

  // Escuta motoristas em tempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "drivers"), (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || "Sem nome",
          status: data.status || "OFFLINE",
          lat: data.lat,
          lng: data.lng,
        });
      });
      setDrivers(list);
    });
    return () => unsub();
  }, []);

  // Escuta últimos pedidos
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          status: data.status,
          storeName: data.storeName,
          pricing: data.pricing,
          createdAt: data.createdAt,
        });
      });
      setOrders(list);
    });
    return () => unsub();
  }, []);

  // Atualiza os marcadores do mapa
  useEffect(() => {
    const newMarkers: MapMarker[] = [];
    drivers.forEach((d) => {
      if (d.lat && d.lng) {
        newMarkers.push({
          id: `driver-${d.id}`,
          lat: d.lat,
          lng: d.lng,
          name: d.name,
          status: d.status,
          type: "driver",
        });
      }
    });
    // Adicionar loja de teste fixa
    newMarkers.push({
      id: "store-loja-teste-001",
      lat: -23.5613,
      lng: -46.6565,
      name: "Pizzaria do Zé",
      status: "Loja",
      type: "store",
    });
    setMarkers(newMarkers);
  }, [drivers]);

  // Estatísticas
  const onlineDrivers = drivers.filter((d) => d.status === "ONLINE").length;
  const inTripDrivers = drivers.filter((d) => d.status === "IN_TRIP").length;
  const activeOrders = orders.filter(
    (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
  ).length;
  const totalRevenue = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + (o.pricing?.totalFee || 0), 0);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-8 py-4">
        <h1 className="text-2xl font-bold text-gray-800">Torre de Controle</h1>
        <p className="text-sm text-gray-500">Monitoramento em tempo real</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50">
        <StatCard
          icon={Users}
          label="Motoboys Online"
          value={onlineDrivers}
          color="green"
        />
        <StatCard
          icon={Package}
          label="Em Rota"
          value={inTripDrivers}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Pedidos Ativos"
          value={activeOrders}
          color="orange"
        />
        <StatCard
          icon={DollarSign}
          label="Receita (Total)"
          value={`R$ ${totalRevenue.toFixed(2)}`}
          color="purple"
        />
      </div>

      {/* Mapa + Lista de Pedidos */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mapa */}
        <div className="flex-1 relative">
          <LiveMap markers={markers} />
          <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
            <p className="text-sm font-semibold text-gray-700">
              {markers.length} marcador(es) no mapa
            </p>
          </div>
        </div>

        {/* Sidebar com pedidos */}
        <div className="w-96 bg-white border-l overflow-auto">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-800">Pedidos Recentes</h2>
          </div>
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Nenhum pedido ainda.
              <br />
              Crie uma rota no Portal da Loja para testar.
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-800">
                      {order.storeName}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {order.id.slice(0, 8)}...
                  </div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">
                    R$ {order.pricing?.totalFee?.toFixed(2) || "0.00"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pendente", className: "bg-gray-100 text-gray-700" },
    SEARCHING_DRIVER: { label: "Buscando", className: "bg-yellow-100 text-yellow-700" },
    OFFERED: { label: "Ofertado", className: "bg-orange-100 text-orange-700" },
    ACCEPTED: { label: "Aceito", className: "bg-blue-100 text-blue-700" },
    COLLECTED: { label: "Coletado", className: "bg-indigo-100 text-indigo-700" },
    DELIVERED: { label: "Entregue", className: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelado", className: "bg-red-100 text-red-700" },
  };

  const config = statusMap[status] || {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}