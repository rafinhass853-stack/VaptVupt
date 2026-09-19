import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useStore } from "../context/StoreContext";
import {
  MapPin,
  Plus,
  Trash2,
  Send,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Stop {
  address: string;
  customerName: string;
  customerPhone: string;
  codValue?: number;
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
  const [distanceKm, setDistanceKm] = useState(5);
  const [pricing, setPricing] = useState<PricingSettings>({
    baseFee: 8.0,
    baseKm: 3.0,
    perKmFee: 1.5,
    extraStopFee: 2.0,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

    // Carrega as configurações de preço E o endereço da loja
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "settings", "pricing"));
      if (snap.exists()) {
        setPricing(snap.data() as PricingSettings);
      }
      // Pré-preenche a primeira parada com o endereço da loja
      if (store) {
        setStops([
          {
            address: `${store.address.street}, ${store.address.number}`,
            customerName: store.name + " (Coleta)",
            customerPhone: "",
          },
        ]);
      }
    })();
  }, [store]);

  const calculateFee = () => {
    const extraStops = Math.max(0, stops.length - 1);
    const billableKm = Math.max(0, distanceKm - pricing.baseKm);
    return (
      pricing.baseFee +
      billableKm * pricing.perKmFee +
      extraStops * pricing.extraStopFee
    );
  };

  const handleAddStop = () => {
    setStops([...stops, { address: "", customerName: "", customerPhone: "" }]);
  };

  const handleRemoveStop = (index: number) => {
    if (stops.length > 1) {
      setStops(stops.filter((_, i) => i !== index));
    }
  };

  const handleStopChange = (index: number, field: keyof Stop, value: any) => {
    const newStops = [...stops];
    (newStops[index] as any)[field] = value;
    setStops(newStops);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Validações
    const invalidStop = stops.find(
      (s) => !s.address || !s.customerName || !s.customerPhone
    );
    if (invalidStop) {
      setError("Preencha todos os campos de todas as paradas.");
      return;
    }

    if (!store) {
      setError("Loja não carregada. Faça login novamente.");
      return;
    }

    const totalFee = calculateFee();
    if (store.balance < totalFee) {
      setError(
        `Saldo insuficiente. Necessário: R$ ${totalFee.toFixed(2)} | Disponível: R$ ${store.balance.toFixed(2)}`
      );
      return;
    }

    setLoading(true);
    try {
      const createDelivery = httpsCallable(functions, "createDeliveryOrder");
      const result = await createDelivery({
        storeId: store.id,
        stops: stops.map((s) => ({
          address: s.address,
          customerName: s.customerName,
          customerPhone: s.customerPhone,
          codValue: s.codValue || 0,
          lat: -23.5613,
          lng: -46.6565,
        })),
        totalDistanceKm: distanceKm,
      });

      const data = result.data as { orderId: string; totalFee: number };
      setSuccess(
        `Rota criada! Pedido #${data.orderId.slice(0, 8)} | Cobrado: R$ ${data.totalFee.toFixed(2)}`
      );

      // Reset
      setStops([{ address: "", customerName: "", customerPhone: "" }]);
      setDistanceKm(5);

      // Refresh saldo
      await refreshStore();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao criar rota.");
    } finally {
      setLoading(false);
    }
  };

  const totalFee = calculateFee();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Nova Rota de Entrega</h1>
        <p className="text-gray-500 mt-1">
          Adicione as paradas e nós cuidamos do resto
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-6 flex items-start gap-3">
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

      {/* Paradas */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
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
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 relative"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-600">
                  Parada {index + 1}
                  {index === 0 && (
                    <span className="ml-2 text-xs text-emerald-600 font-normal">
                      (coleta)
                    </span>
                  )}
                </span>
                {stops.length > 1 && (
                  <button
                    onClick={() => handleRemoveStop(index)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Endereço completo"
                    value={stop.address}
                    onChange={(e) =>
                      handleStopChange(index, "address", e.target.value)
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={stop.customerName}
                  onChange={(e) =>
                    handleStopChange(index, "customerName", e.target.value)
                  }
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  placeholder="Telefone"
                  value={stop.customerPhone}
                  onChange={(e) =>
                    handleStopChange(index, "customerPhone", e.target.value)
                  }
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
                <div className="md:col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor a cobrar (R$) - opcional"
                    value={stop.codValue || ""}
                    onChange={(e) =>
                      handleStopChange(
                        index,
                        "codValue",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distância */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Distância total estimada (KM)
        </label>
        <input
          type="number"
          step="0.1"
          value={distanceKm}
          onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 Em produção, esta distância será calculada automaticamente via Google
          Maps API
        </p>
      </div>

      {/* Resumo */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign size={20} className="text-emerald-600" />
          Resumo do Frete
        </h2>

        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Tarifa base</span>
            <span>R$ {pricing.baseFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>
              KM adicional ({Math.max(0, distanceKm - pricing.baseKm).toFixed(1)} km)
            </span>
            <span>
              R${" "}
              {(
                Math.max(0, distanceKm - pricing.baseKm) * pricing.perKmFee
              ).toFixed(2)}
            </span>
          </div>
          {stops.length > 1 && (
            <div className="flex justify-between text-gray-600">
              <span>Paradas extras ({stops.length - 1})</span>
              <span>
                R$ {((stops.length - 1) * pricing.extraStopFee).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="border-t pt-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg text-gray-800">Total</span>
            <span className="text-3xl font-bold text-emerald-600">
              R$ {totalFee.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-gray-500 text-right mt-1">
            Saldo atual: R$ {store?.balance.toFixed(2) || "0.00"}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
        >
          {loading ? (
            "Processando..."
          ) : (
            <>
              <Send size={20} />
              Confirmar Rota e Chamar Motoboy
            </>
          )}
        </button>
      </div>
    </div>
  );
}