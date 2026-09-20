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
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
} from "lucide-react";

interface Stop {
  address: string;
  customerName: string;
  customerPhone: string;
  codValue?: number;
  lat?: number;
  lng?: number;
}

interface PricingSettings {
  baseFee: number;
  baseKm: number;
  perKmFee: number;
  extraStopFee: number;
}

export default function NewRoute() {
  const { store, refreshStore } = useStore();
  const [stops, setStops] = useState<Stop[]>([
    { address: "", customerName: "", customerPhone: "" },
  ]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [pricing, setPricing] = useState<PricingSettings>({
    baseFee: 8.0,
    baseKm: 3.0,
    perKmFee: 1.5,
    extraStopFee: 2.0,
  });
  const [loading, setLoading] = useState(false);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "settings", "pricing"));
      if (snap.exists()) setPricing(snap.data() as PricingSettings);
      if (store) {
        setStops([
          {
            address: `${store.address.street}, ${store.address.number}`,
            customerName: store.name + " (Coleta)",
            customerPhone: "",
            lat: store.address.lat,
            lng: store.address.lng,
          },
        ]);
      }
    })();
  }, [store]);

  // Recalcula rota quando os stops têm coordenadas
  useEffect(() => {
    const withCoords = stops.filter((s) => s.lat && s.lng);
    if (withCoords.length < 2) {
      setRouteResult(null);
      return;
    }

    setCalculatingRoute(true);
    calculateRoute(withCoords.map((s) => ({ lat: s.lat!, lng: s.lng! }))).then(
      (result) => {
        setRouteResult(result);
        setCalculatingRoute(false);
      }
    );
  }, [stops]);

  const distanceKm = routeResult?.distanceKm || 0;

  const calculateFee = () => {
    const extraStops = Math.max(0, stops.length - 1);
    const billableKm = Math.max(0, distanceKm - pricing.baseKm);
    return (
      pricing.baseFee + billableKm * pricing.perKmFee + extraStops * pricing.extraStopFee
    );
  };

  const handleAddStop = () => {
    setStops([...stops, { address: "", customerName: "", customerPhone: "" }]);
  };

  const handleRemoveStop = (index: number) => {
    if (stops.length > 1) setStops(stops.filter((_, i) => i !== index));
  };

  const handleStopChange = (index: number, field: keyof Stop, value: any) => {
    const newStops = [...stops];
    (newStops[index] as any)[field] = value;
    setStops(newStops);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    const invalidStop = stops.find(
      (s) => !s.address || !s.customerName || !s.customerPhone || !s.lat || !s.lng
    );
    if (invalidStop) {
      setError("Preencha todos os campos e selecione endereços válidos pelo autocomplete.");
      return;
    }

    if (!store) {
      setError("Loja não carregada.");
      return;
    }

    const totalFee = calculateFee();
    if (store.balance < totalFee) {
      setError(`Saldo insuficiente. Necessário: R$ ${totalFee.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const createDelivery = httpsCallable(functions, "createDeliveryOrder");
      const idempotencyKey = `${store.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

      const result = await createDelivery({
        storeId: store.id,
        stops: stops.map((s) => ({
          address: s.address,
          customerName: s.customerName,
          customerPhone: s.customerPhone,
          codValue: s.codValue || 0,
          lat: s.lat,
          lng: s.lng,
        })),
        totalDistanceKm: distanceKm,
        idempotencyKey,
      });

      const data = result.data as {
        orderId: string;
        totalFee: number;
        idempotent?: boolean;
      };

      setSuccess(
        `${data.idempotent ? "Rota já existente" : "Rota criada"}! Pedido #${data.orderId.slice(
          0,
          8
        )} | R$ ${data.totalFee.toFixed(2)}`
      );

      setStops([{ address: "", customerName: "", customerPhone: "" }]);
      setRouteResult(null);
      await refreshStore();
    } catch (err: any) {
      setError(err.message || "Erro ao criar rota.");
    } finally {
      setLoading(false);
    }
  };

  const totalFee = calculateFee();
  const validStops = stops.filter((s) => s.lat && s.lng);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Nova Rota de Entrega</h1>
        <p className="text-slate-500 mt-1">Adicione as paradas e nós cuidamos do resto</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg mb-6 flex items-start gap-3">
          <CheckCircle2 size={22} className="flex-shrink-0 mt-0.5" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle size={22} className="flex-shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulário (coluna esquerda) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <MapPin size={20} className="text-emerald-600" />
                Paradas ({stops.length})
              </h2>
              <button
                onClick={handleAddStop}
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
              >
                <Plus size={18} /> Adicionar
              </button>
            </div>

            <div className="space-y-4">
              {stops.map((stop, index) => (
                <StopInput
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
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-600" />
              Resumo do Frete
            </h2>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Distância</span>
                <span className="font-medium">
                  {calculatingRoute ? (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Loader2 size={14} className="animate-spin" /> Calculando...
                    </span>
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
              <div className="flex justify-between text-slate-600 pt-2 border-t">
                <span>Tarifa base</span>
                <span>R$ {pricing.baseFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>KM adicional</span>
                <span>R$ {(Math.max(0, distanceKm - pricing.baseKm) * pricing.perKmFee).toFixed(2)}</span>
              </div>
              {stops.length > 1 && (
                <div className="flex justify-between text-slate-600">
                  <span>Paradas extras ({stops.length - 1})</span>
                  <span>R$ {((stops.length - 1) * pricing.extraStopFee).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-slate-800">Total</span>
                <span className="text-3xl font-bold text-emerald-600">
                  R$ {totalFee.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-slate-500 text-right mt-1">
                Saldo: R$ {store?.balance.toFixed(2) || "0.00"}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || calculatingRoute || distanceKm === 0 || validStops.length < 2}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Processando...
                </>
              ) : (
                <>
                  <Send size={20} /> Confirmar Rota e Chamar Motoboy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mapa (coluna direita) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600" />
              Prévia da Rota
            </h3>
            <RouteMap
              stops={validStops.map((s) => ({
                lat: s.lat!,
                lng: s.lng!,
                name: s.customerName,
              }))}
              geometry={routeResult?.geometry}
              height="500px"
            />
            {routeResult && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-700">Distância</p>
                  <p className="font-bold text-emerald-900">
                    {routeResult.distanceKm.toFixed(2)} km
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">Tempo</p>
                  <p className="font-bold text-blue-900">
                    {routeResult.durationMinutes} min
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StopInput({
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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(stop.address);
  }, [stop.address]);

  const handleChange = (value: string) => {
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

  return (
    <div className="border border-slate-200 rounded-lg p-4 relative bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-slate-600">
          Parada {index + 1}
          {isFirst && (
            <span className="ml-2 text-xs text-emerald-600 font-normal">(coleta)</span>
          )}
        </span>
        {canRemove && (
          <button onClick={onRemove} className="text-red-400 hover:text-red-600">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="Digite o endereço (mínimo 3 caracteres)"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
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
                  className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm border-b border-slate-100 last:border-b-0"
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
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
        />
        <input
          type="text"
          placeholder="Telefone"
          value={stop.customerPhone}
          onChange={(e) => onChange("customerPhone", e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
        />
        <div className="md:col-span-2">
          <input
            type="number"
            step="0.01"
            placeholder="Valor a cobrar (R$) - opcional"
            value={stop.codValue || ""}
            onChange={(e) => onChange("codValue", parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
          />
        </div>
      </div>
    </div>
  );
}