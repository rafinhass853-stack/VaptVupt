import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import LiveMap from "../components/LiveMap";
import type { MapMarker } from "../components/LiveMap";
import {
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Activity,
  Filter,
  Download,
  Search,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Badge, Card, Button, Input, useToast } from "@vaptvupt/shared-ui";

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
  totalOrderValue?: number;
  createdAt: any;
  assignedDriverId?: string | null;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          status: data.status,
          storeName: data.storeName,
          pricing: data.pricing,
          totalOrderValue: data.totalOrderValue,
          createdAt: data.createdAt,
          assignedDriverId: data.assignedDriverId,
        });
      });
      setOrders(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const list: MapMarker[] = [];
    drivers.forEach((d) => {
      if (d.lat && d.lng) {
        list.push({
          id: `driver-${d.id}`,
          lat: d.lat,
          lng: d.lng,
          name: d.name,
          status: d.status,
          type: "driver",
        });
      }
    });
    list.push({
      id: "store-loja-teste-001",
      lat: -23.5613,
      lng: -46.6565,
      name: "Pizzaria do Zé",
      status: "Loja",
      type: "store",
    });
    setMarkers(list);
  }, [drivers]);

  const onlineDrivers = drivers.filter((d) => d.status === "ONLINE").length;
  const inTripDrivers = drivers.filter((d) => d.status === "IN_TRIP").length;
  const activeOrders = orders.filter(
    (o) => !["DELIVERED", "CANCELLED", "FAILED"].includes(o.status)
  );
  const deliveredToday = orders.filter((o) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      o.status === "DELIVERED" &&
      o.createdAt?.toDate?.()?.getTime() >= today.getTime()
    );
  });
  const totalRevenue = deliveredToday.reduce(
    (sum, o) => sum + (o.pricing?.totalFee || 0),
    0
  );
  const avgDeliveryTime = 25; // TODO: calcular

  // Filtros
  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" &&
        !["DELIVERED", "CANCELLED", "FAILED"].includes(o.status)) ||
      (filterStatus === "delivered" && o.status === "DELIVERED") ||
      (filterStatus === "cancelled" &&
        ["CANCELLED", "FAILED"].includes(o.status));
    const matchesSearch =
      !searchTerm ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.storeName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = ["ID", "Loja", "Status", "Frete", "Produtos"];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.storeName,
      o.status,
      o.pricing?.totalFee?.toFixed(2) || "0",
      o.totalOrderValue?.toFixed(2) || "0",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vaptvupt-pedidos-${Date.now()}.csv`;
    a.click();
    toast("CSV exportado com sucesso!", "success");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Torre de Controle
            </h1>
            <p className="text-sm text-slate-500">
              Monitoramento em tempo real da operação
            </p>
          </div>
          <Button
            variant="ghost"
            icon={<Download size={16} />}
            onClick={handleExportCSV}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200">
        <KpiMini
          icon={<Users size={18} />}
          label="Online"
          value={onlineDrivers}
          color="green"
        />
        <KpiMini
          icon={<Activity size={18} />}
          label="Em Rota"
          value={inTripDrivers}
          color="blue"
        />
        <KpiMini
          icon={<Package size={18} />}
          label="Ativos"
          value={activeOrders.length}
          color="orange"
        />
        <KpiMini
          icon={<CheckCircle2 size={18} />}
          label="Entregues Hoje"
          value={deliveredToday.length}
          color="emerald"
        />
        <KpiMini
          icon={<DollarSign size={18} />}
          label="Receita Hoje"
          value={`R$ ${totalRevenue.toFixed(2)}`}
          color="purple"
        />
      </div>

      {/* Mapa + Lista */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <LiveMap markers={markers} />
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-2xl shadow-lg p-4 z-[1000] space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="font-semibold text-slate-700">
                {onlineDrivers} online
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="font-semibold text-slate-700">
                {inTripDrivers} em rota
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="font-semibold text-slate-700">
                {activeOrders.length} pedidos ativos
              </span>
            </div>
          </div>
        </div>

        <div className="w-[420px] bg-white border-l border-slate-200 flex flex-col">
          {/* Filtros */}
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Pedidos Recentes</h2>
              <Badge variant="info" size="sm">
                {filteredOrders.length}
              </Badge>
            </div>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar por ID ou loja..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-1">
              {[
                { key: "all", label: "Todos" },
                { key: "active", label: "Ativos" },
                { key: "delivered", label: "Entregues" },
                { key: "cancelled", label: "Cancelados" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition ${
                    filterStatus === f.key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-auto">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center">
                <Package size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nenhum pedido</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm text-slate-800">
                        {order.storeName}
                      </span>
                      <Badge variant={statusVariant(order.status)} size="sm">
                        {statusLabel(order.status)}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">
                      #{order.id.slice(0, 12)}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-xs text-slate-500">
                        {order.totalOrderValue
                          ? `R$ ${order.totalOrderValue.toFixed(2)} em produtos`
                          : "—"}
                      </div>
                      <div className="font-bold text-slate-800">
                        R$ {order.pricing?.totalFee?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiMini({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "green" | "blue" | "orange" | "emerald" | "purple";
}) {
  const colors = {
    green: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    emerald: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}>{icon}</div>
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
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

function statusVariant(
  status: string
): "default" | "success" | "warning" | "danger" | "info" {
  const map: Record<string, any> = {
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