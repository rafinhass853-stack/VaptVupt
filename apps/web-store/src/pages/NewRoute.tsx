import { useState, useEffect, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useStore } from "../context/StoreContext";
import { autocompleteAddress, calculateRoute } from "../lib/maps";
import type { GeocodedAddress, RouteResult } from "../lib/maps";
import RouteMap from "../components/RouteMap";
import {
  MapPin,
  Plus,
  Trash2,
  Send,
  DollarSign,
  Loader2,
  Clock,
  Package,
  X,
  KeyRound,
} from "lucide-react";
import { Button, Card, Badge, useToast } from "@vaptvupt/shared-ui";

interface OrderItem {
  nome: string;
  quantidade: number;
  valorUnitario: number;
}

interface Stop {
  address: string;
  customerName: string;
  customerPhone: string;
  lat?: number;
  lng?: number;
  items: OrderItem[];
  paymentMethod: string;
  trocoPara?: number;
  notes?: string;
}

interface PricingQuote {
  totalFee: number;
  distanceKm: number;
}

export default function NewRoute() {
  const { store, refreshStore } = useStore();
  const { toast } = useToast();
  const [stops, setStops] = useState<Stop[]>([createEmptyStop()]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [deliveryPin, setDeliveryPin] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (store) {
        setStops([
          {
            ...createEmptyStop(),
            address: `${store.address.street}, ${store.address.number}`,
            customerName: store.name + " (Coleta)",
            lat: store.address.lat,
            lng: store.address.lng,
            paymentMethod: "JA_PAGO",
          },
        ]);
      }
    })();
  }, [store]);

  useEffect(() => {
    const withCoords = stops.filter((s) => s.lat && s.lng);
    if (withCoords.length < 2) {
      setRouteResult(null);
      setQuote(null);
      return;
    }
    setCalculatingRoute(true);
    calculateRoute(withCoords.map((s) => ({ lat: s.lat!, lng: s.lng! }))).then(async (r) => {
      setRouteResult(r);
      try {
        const quoteDelivery = httpsCallable(functions, "quoteDeliveryPrice");
        const response = await quoteDelivery({
          totalDistanceKm: r.distanceKm,
          stopsCount: stops.length,
        });
        setQuote(response.data as PricingQuote);
      } finally {
        setCalculatingRoute(false);
      }
    }).catch(() => {
      setQuote(null);
      setCalculatingRoute(false);
    });
  }, [stops]);

  const distanceKm = routeResult?.distanceKm || 0;

  const calculateFee = () => quote?.totalFee || 0;

  const totalOrderValue = stops.reduce(
    (sum, s) => sum + s.items.reduce((acc, i) => acc + i.quantidade * i.valorUnitario, 0),
    0
  );

  const handleAddStop = () => setStops([...stops, createEmptyStop()]);
  const handleRemoveStop = (i: number) => {
    if (stops.length > 1) setStops(stops.filter((_, idx) => idx !== i));
  };
  const handleStopChange = (i: number, field: keyof Stop, value: any) => {
    const newStops = [...stops];
    (newStops[i] as any)[field] = value;
    setStops(newStops);
  };

  const handleSubmit = async () => {
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (!s.address || !s.customerName || !s.customerPhone || !s.lat || !s.lng) {
        toast(`Parada ${i + 1}: preencha endereço, cliente e telefone.`, "error");
        return;
      }
      if (s.items.length === 0) {
        toast(`Parada ${i + 1}: adicione ao menos 1 item.`, "error");
        return;
      }
    }

    if (!store) {
      toast("Loja não carregada.", "error");
      return;
    }

    const totalFee = calculateFee();
    if (store.balance < totalFee) {
      toast(`Saldo insuficiente. Necessário: R$ ${totalFee.toFixed(2)}`, "error");
      return;
    }

    setLoading(true);
    try {
      const createDelivery = httpsCallable(functions, "createDeliveryOrder");
      const idempotencyKey = `${store.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const result = await createDelivery({
        storeId: store.id,
        stops: stops.map((s) => ({
          address: s.address,
          customerName: s.customerName,
          customerPhone: s.customerPhone,
          lat: s.lat,
          lng: s.lng,
          items: s.items,
          paymentMethod: s.paymentMethod,
          trocoPara: s.trocoPara || 0,
          notes: s.notes || "",
          totalValue: s.items.reduce((acc, i) => acc + i.quantidade * i.valorUnitario, 0),
        })),
        totalDistanceKm: distanceKm,
        idempotencyKey,
      });

      const data = result.data as {
        orderId: string;
        totalFee: number;
        idempotent?: boolean;
        pin?: string;
      };

      toast(
        data.idempotent
          ? "Rota já existente!"
          : `Rota criada! Frete: R$ ${data.totalFee.toFixed(2)}`,
        "success"
      );

      setDeliveryPin(data.pin || null);
      setLastOrderId(data.orderId);
      setStops([createEmptyStop()]);
      setRouteResult(null);
      await refreshStore();
    } catch (err: any) {
      toast(err.message || "Erro ao criar rota.", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalFee = calculateFee();
  const validStops = stops.filter((s) => s.lat && s.lng);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Nova Rota de Entrega
        </h1>
        <p className="text-slate-500 mt-1">
          Adicione as paradas com os itens de cada pedido
        </p>
      </div>

      {deliveryPin && (
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 mb-6 text-white shadow-lg flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-xl flex-shrink-0">
            <KeyRound size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-100">
              🔑 PIN de entrega — repassar ao cliente
            </p>
            <p className="text-5xl font-bold tracking-[0.3em] mt-2">
              {deliveryPin}
            </p>
            <p className="text-xs text-blue-100 mt-2">
              ⚠️ Copie o PIN agora. Ele não será exibido novamente.
            </p>
            {lastOrderId && (
              <p className="text-xs text-blue-200 mt-1">
                Pedido #{lastOrderId.slice(0, 8)}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setDeliveryPin(null);
              setLastOrderId(null);
            }}
            className="text-white/70 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={20} className="text-emerald-600" />
                Paradas ({stops.length})
              </h2>
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={16} />}
                onClick={handleAddStop}
                className="text-emerald-600 hover:bg-emerald-50"
              >
                Adicionar
              </Button>
            </div>

            <div className="space-y-4">
              {stops.map((stop, index) => (
                <StopCard
                  key={index}
                  index={index}
                  stop={stop}
                  isFirst={index === 0}
                  canRemove={stops.length > 1}
                  onRemove={() => handleRemoveStop(index)}
                  onChange={(field, value) => handleStopChange(index, field, value)}
                />
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-600" />
              Resumo Financeiro
            </h2>

            <div className="space-y-2.5 mb-5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Valor dos pedidos</span>
                <span className="font-medium">R$ {totalOrderValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Distância</span>
                <span className="font-medium flex items-center gap-1">
                  {calculatingRoute ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                      <span className="text-blue-600">Calculando...</span>
                    </>
                  ) : (
                    `${distanceKm.toFixed(2)} km`
                  )}
                </span>
              </div>
              {routeResult && (
                <div className="flex justify-between text-slate-600">
                  <span>Tempo estimado</span>
                  <span className="font-medium flex items-center gap-1">
                    <Clock size={14} /> {routeResult.durationMinutes} min
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 pt-2.5 border-t border-slate-100">
                <span>Valor do serviço</span>
                <span className="font-bold text-slate-800">R$ {totalFee.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Valor da entrega</span>
                <span className="text-3xl font-bold text-emerald-600">
                  R$ {totalFee.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-500 text-right mt-1">
                Saldo atual: R$ {store?.balance.toFixed(2) || "0.00"}
              </p>
            </div>

            <Button
              variant="success"
              size="lg"
              fullWidth
              loading={loading}
              disabled={
                loading || calculatingRoute || !quote?.totalFee || distanceKm === 0 || validStops.length < 2
              }
              icon={!loading && <Send size={20} />}
              onClick={handleSubmit}
            >
              {loading ? "Processando..." : "Confirmar Rota e Chamar Motoboy"}
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-6" padded={false}>
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MapPin size={16} className="text-emerald-600" />
                Prévia da Rota
              </h3>
            </div>
            <div className="p-4">
              <RouteMap
                stops={validStops.map((s) => ({ lat: s.lat!, lng: s.lng! }))}
                geometry={routeResult?.geometry}
                height="500px"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function createEmptyStop(): Stop {
  return {
    address: "",
    customerName: "",
    customerPhone: "",
    items: [{ nome: "", quantidade: 1, valorUnitario: 0 }],
    paymentMethod: "DINHEIRO",
  };
}

function StopCard({
  index,
  stop,
  isFirst,
  canRemove,
  onRemove,
  onChange,
}: {
  index: number;
  stop: Stop;
  isFirst: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (field: keyof Stop, value: any) => void;
}) {
  const [query, setQuery] = useState(stop.address);
  const [suggestions, setSuggestions] = useState<GeocodedAddress[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(stop.address);
  }, [stop.address]);

  const handleAddressChange = (value: string) => {
    setQuery(value);
    onChange("address", value);
    onChange("lat", undefined);
    onChange("lng", undefined);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 3) {
        setLoading(true);
        const results = await autocompleteAddress(value);
        setSuggestions(results);
        setShowSuggestions(true);
        setLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 500);
  };

  const handleSelect = (s: GeocodedAddress) => {
    setQuery(s.displayName);
    onChange("address", s.displayName);
    onChange("lat", s.lat);
    onChange("lng", s.lng);
    setShowSuggestions(false);
  };

  const addItem = () =>
    onChange("items", [...stop.items, { nome: "", quantidade: 1, valorUnitario: 0 }]);

  const removeItem = (i: number) =>
    onChange("items", stop.items.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: keyof OrderItem, value: any) => {
    const newItems = [...stop.items];
    (newItems[i] as any)[field] = value;
    onChange("items", newItems);
  };

  const stopTotal = stop.items.reduce(
    (sum, i) => sum + i.quantidade * i.valorUnitario,
    0
  );

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">
            Pedido {index + 1}
          </span>
          {isFirst && <Badge variant="brand" size="sm">Coleta</Badge>}
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-red-400 hover:text-red-600 transition"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="Digite o endereço (mínimo 3 caracteres)"
            value={query}
            onChange={(e) => handleAddressChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white transition"
          />
          {stop.lat && stop.lng && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-lg">
              ✓
            </span>
          )}
          {loading && (
            <span className="absolute right-10 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
            </span>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm border-b border-slate-100 last:border-b-0 transition"
                >
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-emerald-600 mt-1 flex-shrink-0" />
                    <span className="text-slate-700 line-clamp-2">{s.displayName}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          placeholder="Nome do cliente"
          value={stop.customerName}
          onChange={(e) => onChange("customerName", e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white transition"
        />
        <input
          type="text"
          placeholder="Telefone"
          value={stop.customerPhone}
          onChange={(e) => onChange("customerPhone", e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white transition"
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Package size={12} /> Itens do pedido
          </span>
          <button
            onClick={addItem}
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
          >
            <Plus size={12} /> Item
          </button>
        </div>

        <div className="space-y-2">
          {stop.items.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Produto"
                value={item.nome}
                onChange={(e) => updateItem(i, "nome", e.target.value)}
                className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Qtd"
                value={item.quantidade}
                min={1}
                onChange={(e) => updateItem(i, "quantidade", parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1.5 border border-slate-300 rounded text-xs text-center focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <input
                type="number"
                step="0.01"
                placeholder="R$"
                value={item.valorUnitario || ""}
                onChange={(e) => updateItem(i, "valorUnitario", parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 border border-slate-300 rounded text-xs text-right focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {stop.items.length > 1 && (
                <button
                  onClick={() => removeItem(i)}
                  className="text-red-400 hover:text-red-600 transition"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs text-slate-500">Total do pedido:</span>
          <span className="text-sm font-bold text-emerald-600">
            R$ {stopTotal.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={stop.paymentMethod}
          onChange={(e) => onChange("paymentMethod", e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="DINHEIRO">Dinheiro</option>
          <option value="CARTAO">Cartão</option>
          <option value="PIX">PIX</option>
          <option value="JA_PAGO">Já pago</option>
        </select>
        {stop.paymentMethod === "DINHEIRO" && (
          <input
            type="number"
            step="0.01"
            placeholder="Troco para"
            value={stop.trocoPara || ""}
            onChange={(e) => onChange("trocoPara", parseFloat(e.target.value) || 0)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        )}
      </div>
    </div>
  );
}