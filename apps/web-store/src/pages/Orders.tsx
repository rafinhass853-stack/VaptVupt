import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useStore } from "../context/StoreContext";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  MapPin,
} from "lucide-react";

interface Order {
  id: string;
  status: string;
  storeName: string;
  pricing: { totalFee: number; distanceKm: number };
  stops: any[];
  assignedDriverId: string | null;
  createdAt: any;
}

export default function Orders() {
  const { store } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!store) return;
    const q = query(
      collection(db, "orders"),
      where("storeId", "==", store.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          status: data.status,
          storeName: data.storeName,
          pricing: data.pricing || { totalFee: 0, distanceKm: 0 },
          stops: data.stops || [],
          assignedDriverId: data.assignedDriverId,
          createdAt: data.createdAt,
        });
      });
      setOrders(list);
    });
    return () => unsub();
  }, [store]);

  const activeOrders = orders.filter(
    (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["DELIVERED", "CANCELLED"].includes(o.status)
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Meus Pedidos</h1>
        <p className="text-gray-500 mt-1">
          {activeOrders.length} ativo(s) • {completedOrders.length} finalizado(s)
        </p>
      </div>

      {/* Pedidos Ativos */}
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Em Andamento
          </h2>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Histórico</h2>
        {completedOrders.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            Nenhum pedido finalizado ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Pedido #{selectedOrder.id.slice(0, 8)}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedOrder.pricing.distanceKm.toFixed(1)} km • R${" "}
              {selectedOrder.pricing.totalFee.toFixed(2)}
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <StatusTimeline status={selectedOrder.status} />
            </div>

            <h3 className="font-semibold text-gray-800 mb-3">
              Paradas ({selectedOrder.stops.length})
            </h3>
            <div className="space-y-3">
              {selectedOrder.stops.map((stop: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">
                      {stop.customerName}
                    </p>
                    <p className="text-xs text-gray-500">{stop.address}</p>
                    <p className="text-xs text-gray-500">
                      {stop.customerPhone}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full mt-6 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const statusConfig: Record<string, { label: string; color: string; icon: any }> =
    {
      SEARCHING_DRIVER: {
        label: "Buscando motoboy",
        color: "bg-yellow-100 text-yellow-700",
        icon: Clock,
      },
      OFFERED: {
        label: "Ofertado",
        color: "bg-orange-100 text-orange-700",
        icon: Clock,
      },
      ACCEPTED: {
        label: "Aceito",
        color: "bg-blue-100 text-blue-700",
        icon: Truck,
      },
      COLLECTED: {
        label: "Em rota",
        color: "bg-indigo-100 text-indigo-700",
        icon: Truck,
      },
      DELIVERED: {
        label: "Entregue",
        color: "bg-green-100 text-green-700",
        icon: CheckCircle2,
      },
      CANCELLED: {
        label: "Cancelado",
        color: "bg-red-100 text-red-700",
        icon: XCircle,
      },
    };

  const config = statusConfig[order.status] || statusConfig.SEARCHING_DRIVER;
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border p-4 hover:shadow-md transition cursor-pointer flex items-center gap-4"
    >
      <div className={`p-3 rounded-lg ${config.color}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-800">
            #{order.id.slice(0, 8)}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}
          >
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {order.stops.length} parada(s)
          </span>
          <span>{order.pricing.distanceKm.toFixed(1)} km</span>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-gray-800">
          R$ {order.pricing.totalFee.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const steps = [
    { key: "SEARCHING_DRIVER", label: "Buscando motoboy" },
    { key: "ACCEPTED", label: "Motoboy aceitou" },
    { key: "COLLECTED", label: "Pedido coletado" },
    { key: "DELIVERED", label: "Entregue" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const isDone = i < currentIndex || status === "DELIVERED";
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDone
                  ? "bg-green-500 text-white"
                  : isCurrent
                  ? "bg-blue-500 text-white animate-pulse"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {isDone ? <CheckCircle2 size={14} /> : <span className="text-xs">{i + 1}</span>}
            </div>
            <span
              className={`text-sm ${
                isCurrent
                  ? "font-bold text-blue-600"
                  : isDone
                  ? "text-gray-700"
                  : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}