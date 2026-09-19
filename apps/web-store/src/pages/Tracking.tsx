import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useStore } from "../context/StoreContext";
import LiveMap from "../components/LiveMap";
import type { MapMarker } from "../components/LiveMap";
import { Truck, Users, MapPin } from "lucide-react";

interface Order {
  id: string;
  status: string;
  assignedDriverId: string | null;
  stops: any[];
  storeName: string;
}

interface Driver {
  id: string;
  name: string;
  status: string;
  lat?: number;
  lng?: number;
  activeOrderId?: string | null;
}

export default function Tracking() {
  const { store } = useStore();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Pedidos ativos da loja
  useEffect(() => {
    if (!store) return;
    const q = query(
      collection(db, "orders"),
      where("storeId", "==", store.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Order[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!["DELIVERED", "CANCELLED"].includes(data.status)) {
          list.push({
            id: docSnap.id,
            status: data.status,
            assignedDriverId: data.assignedDriverId,
            stops: data.stops || [],
            storeName: data.storeName,
          });
        }
      });
      setActiveOrders(list);
    });
    return () => unsub();
  }, [store]);

  // Todos os motoboys
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "drivers"), (snap) => {
      const list: Driver[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || "Motoboy",
          status: data.status || "OFFLINE",
          lat: data.lat,
          lng: data.lng,
          activeOrderId: data.activeOrderId,
        });
      });
      setDrivers(list);
    });
    return () => unsub();
  }, []);

  // Monta os marcadores
  useEffect(() => {
    const list: MapMarker[] = [];

    // Loja (coleta)
    if (store?.address.lat && store?.address.lng) {
      list.push({
        id: `store-${store.id}`,
        lat: store.address.lat,
        lng: store.address.lng,
        name: store.name,
        status: "Sua loja (coleta)",
        type: "store",
      });
    }

    // Motoboys em rota
    const driverIdsInTrip = activeOrders
      .filter((o) => o.assignedDriverId)
      .map((o) => o.assignedDriverId);

    drivers.forEach((d) => {
      if (d.lat && d.lng && driverIdsInTrip.includes(d.id)) {
        list.push({
          id: `driver-${d.id}`,
          lat: d.lat,
          lng: d.lng,
          name: d.name,
          status: "Em rota com seu pedido",
          type: "driver",
        });
      }
    });

    // Clientes (paradas do pedido selecionado)
    if (selectedOrder) {
      selectedOrder.stops.forEach((stop: any, i: number) => {
        if (stop.lat && stop.lng) {
          list.push({
            id: `stop-${selectedOrder.id}-${i}`,
            lat: stop.lat,
            lng: stop.lng,
            name: stop.customerName || `Parada ${i + 1}`,
            status: stop.address,
            type: "customer",
          });
        }
      });
    }

    setMarkers(list);
  }, [drivers, activeOrders, selectedOrder, store]);

  const onlineDrivers = drivers.filter((d) => d.status === "ONLINE").length;
  const inTripDrivers = drivers.filter((d) => d.status === "IN_TRIP").length;

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-slate-200 px-8 py-4">
        <h1 className="text-2xl font-bold text-slate-800">Entregas em Tempo Real</h1>
        <p className="text-sm text-slate-500">
          Acompanhe seus pedidos no mapa
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Mapa */}
        <div className="flex-1 relative">
          <LiveMap markers={markers} followMarker={!!selectedOrder} />
          <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg p-4 z-[1000] space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="font-medium text-slate-700">
                {onlineDrivers} motoboy(s) online
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="font-medium text-slate-700">
                {inTripDrivers} em rota
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="font-medium text-slate-700">
                {activeOrders.length} pedido(s) ativo(s)
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-white border-l border-slate-200 overflow-auto">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Truck size={18} className="text-emerald-600" />
              Pedidos Ativos
            </h2>
          </div>

          {activeOrders.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                Nenhum pedido em andamento
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeOrders.map((order) => {
                const driver = drivers.find((d) => d.id === order.assignedDriverId);
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 cursor-pointer transition ${
                      selectedOrder?.id === order.id
                        ? "bg-emerald-50 border-l-4 border-emerald-600"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800 text-sm">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {order.stops.length} parada(s)
                    </p>
                    {driver ? (
                      <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600">
                        <Users size={12} />
                        <span className="font-medium">{driver.name}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 mt-2">
                        ⏳ Buscando motoboy...
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}