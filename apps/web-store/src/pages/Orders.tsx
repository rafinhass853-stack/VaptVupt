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
  RefreshCw,
} from "lucide-react";
import { Card, Badge, Modal, EmptyState, SkeletonList } from "@vaptvupt/shared-ui";

interface Order {
  id: string;
  status: string;
  storeName: string;
  pricing: { totalFee: number; distanceKm: number };
  stops: any[];
  totalOrderValue?: number;
  assignedDriverId: string | null;
  createdAt: any;
}

export default function Orders() {
  const { store } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
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
          totalOrderValue: data.totalOrderValue,
          assignedDriverId: data.assignedDriverId,
          createdAt: data.createdAt,
        });
      });
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, [store]);

  const activeOrders = orders.filter(
    (o) => !["DELIVERED", "CANCELLED", "FAILED"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["DELIVERED", "CANCELLED", "FAILED"].includes(o.status)
  );

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Meus Pedidos</h1>
        </div>
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Meus Pedidos
        </h1>
        <p className="text-slate-500 mt-1">
          {activeOrders.length} em andamento • {completedOrders.length} finalizados
        </p>
      </div>

      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <RefreshCw size={18} className="text-blue-600" />
            Em Andamento ({activeOrders.length})
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

      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">
          Histórico ({completedOrders.length})
        </h2>
        {completedOrders.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Package size={32} />}
              title="Nenhum pedido finalizado"
              description="Seus pedidos concluídos aparecerão aqui."
            />
          </Card>
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

      {/* Modal */}
      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Pedido #${selectedOrder.id.slice(0, 8)}` : ""}
        size="lg"
      >
        {selectedOrder && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-slate-500">
                  {selectedOrder.pricing.distanceKm.toFixed(2)} km
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  R$ {selectedOrder.pricing.totalFee.toFixed(2)}
                </p>
              </div>
              <Badge variant={statusVariant(selectedOrder.status)}>
                {statusLabel(selectedOrder.status)}
              </Badge>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-5">
              <StatusTimeline status={selectedOrder.status} />
            </div>

            <h3 className="font-bold text-slate-800 mb-3">
              Paradas ({selectedOrder.stops.length})
            </h3>
            <div className="space-y-3">
              {selectedOrder.stops.map((stop: any, i: number) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-100 text-emerald-700 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">
                        {stop.customerName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {stop.address}
                      </p>
                      <p className="text-xs text-slate-500">
                        {stop.customerPhone}
                      </p>

                      {stop.items && stop.items.length > 0 && (
                        <div className="mt-3 bg-slate-50 rounded-lg p-2 space-y-1">
                          {stop.items.map((item: any, j: number) => (
                            <div key={j} className="flex justify-between text-xs">
                              <span className="text-slate-600">
                                {item.quantidade}× {item.nome}
                              </span>
                              <span className="text-slate-800 font-medium">
                                R${" "}
                                {(item.quantidade * item.valorUnitario).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {stop.totalValue && (
                            <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                              <span className="font-semibold text-slate-700">
                                Total do pedido
                              </span>
                              <span className="font-bold text-emerald-600">
                                R$ {stop.totalValue.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const config = statusConfig(order.status);
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition cursor-pointer flex items-center gap-4"
    >
      <div className={`p-3 rounded-xl ${config.bgColor}`}>
        <Icon size={22} className={config.iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-slate-800">
            #{order.id.slice(0, 8)}
          </span>
          <Badge variant={statusVariant(order.status)} size="sm">
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {order.stops.length} parada(s)
          </span>
          <span>{order.pricing.distanceKm.toFixed(2)} km</span>
          {order.totalOrderValue && (
            <span className="text-emerald-600 font-medium">
              R$ {order.totalOrderValue.toFixed(2)} em produtos
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-slate-800">
          R$ {order.pricing.totalFee.toFixed(2)}
        </p>
        <p className="text-xs text-slate-400">frete</p>
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
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                isDone
                  ? "bg-green-500 text-white"
                  : isCurrent
                  ? "bg-blue-500 text-white animate-pulse"
                  : "bg-slate-200 text-slate-400"
              }`}
            >
              {isDone ? (
                <CheckCircle2 size={14} />
              ) : (
                <span className="text-xs font-semibold">{i + 1}</span>
              )}
            </div>
            <span
              className={`text-sm ${
                isCurrent
                  ? "font-bold text-blue-600"
                  : isDone
                  ? "text-slate-700 font-medium"
                  : "text-slate-400"
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

function statusConfig(status: string) {
  const map: Record<string, any> = {
    SEARCHING_DRIVER: {
      label: "Buscando motoboy",
      icon: Clock,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
    OFFERED: {
      label: "Ofertado",
      icon: Clock,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    ACCEPTED: {
      label: "Aceito",
      icon: Truck,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    COLLECTED: {
      label: "Em rota",
      icon: Truck,
      bgColor: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    IN_DELIVERY: {
      label: "Em rota",
      icon: Truck,
      bgColor: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    DELIVERED: {
      label: "Entregue",
      icon: CheckCircle2,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    CANCELLED: {
      label: "Cancelado",
      icon: XCircle,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
    },
    FAILED: {
      label: "Falhou",
      icon: XCircle,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
    },
  };
  return (
    map[status] || {
      label: status,
      icon: Package,
      bgColor: "bg-slate-100",
      iconColor: "text-slate-600",
    }
  );
}

function statusLabel(status: string): string {
  return statusConfig(status).label;
}

function statusVariant(
  status: string
): "default" | "success" | "warning" | "danger" | "info" {
  const map: Record<string, any> = {
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