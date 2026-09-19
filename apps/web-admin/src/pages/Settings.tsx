import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Save, DollarSign, MapPin, Plus } from "lucide-react";

interface PricingSettings {
  baseFee: number;
  baseKm: number;
  perKmFee: number;
  extraStopFee: number;
}

export default function Settings() {
  const [pricing, setPricing] = useState<PricingSettings>({
    baseFee: 8.0,
    baseKm: 3.0,
    perKmFee: 1.5,
    extraStopFee: 2.0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const docRef = doc(db, "settings", "pricing");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setPricing(snap.data() as PricingSettings);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(doc(db, "settings", "pricing"), pricing);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Configurações Globais</h1>
        <p className="text-gray-500 mt-1">
          Ajuste as tarifas usadas para calcular o valor dos fretes
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <DollarSign size={20} className="text-blue-600" />
          Tarifas de Entrega
        </h2>

        <div className="space-y-5">
          <Field
            label="Tarifa Mínima (R$)"
            description="Valor cobrado independente da distância"
            value={pricing.baseFee}
            onChange={(v) => setPricing({ ...pricing, baseFee: v })}
          />

          <Field
            label="Franquia de KM"
            description="Quantos KM já estão inclusos na tarifa mínima"
            value={pricing.baseKm}
            onChange={(v) => setPricing({ ...pricing, baseKm: v })}
            icon={<MapPin size={18} />}
          />

          <Field
            label="Valor por KM Adicional (R$)"
            description="Cobrado para cada KM além da franquia"
            value={pricing.perKmFee}
            onChange={(v) => setPricing({ ...pricing, perKmFee: v })}
          />

          <Field
            label="Taxa por Parada Extra (R$)"
            description="Cobrado para cada parada além da primeira"
            value={pricing.extraStopFee}
            onChange={(v) => setPricing({ ...pricing, extraStopFee: v })}
            icon={<Plus size={18} />}
          />
        </div>

        {/* Simulação */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">
            💡 Exemplo prático
          </p>
          <p className="text-sm text-blue-800">
            Uma entrega de <strong>5 KM</strong> com <strong>2 paradas</strong> custa:
          </p>
          <p className="text-lg font-bold text-blue-900 mt-2">
            R${" "}
            {(
              pricing.baseFee +
              Math.max(0, 5 - pricing.baseKm) * pricing.perKmFee +
              (2 - 1) * pricing.extraStopFee
            ).toFixed(2)}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
          {saved && (
            <span className="text-green-600 text-sm font-medium">
              ✓ Salvo com sucesso!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  description,
  value,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}