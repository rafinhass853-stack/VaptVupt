import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Save, DollarSign, MapPin, Plus, Settings as SettingsIcon } from "lucide-react";
import { Button, Card, Input, useToast } from "@vaptvupt/shared-ui";

interface PricingSettings {
  baseFee: number;
  baseKm: number;
  perKmFee: number;
  extraStopFee: number;
}

export default function Settings() {
  const { toast } = useToast();
  const [pricing, setPricing] = useState<PricingSettings>({
    baseFee: 8.0,
    baseKm: 3.0,
    perKmFee: 1.5,
    extraStopFee: 2.0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    try {
      await setDoc(doc(db, "settings", "pricing"), pricing);
      toast("Configurações salvas com sucesso!", "success");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Carregando...</div>;
  }

  const exampleTotal =
    pricing.baseFee +
    Math.max(0, 5 - pricing.baseKm) * pricing.perKmFee +
    (2 - 1) * pricing.extraStopFee;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Configurações Globais
        </h1>
        <p className="text-slate-500 mt-1">
          Ajuste as tarifas usadas para calcular o valor dos fretes
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <DollarSign size={20} className="text-blue-600" />
          Tarifas de Entrega
        </h2>

        <div className="space-y-5">
          <Input
            label="Tarifa Mínima (R$)"
            type="number"
            step="0.01"
            value={pricing.baseFee}
            onChange={(e) =>
              setPricing({ ...pricing, baseFee: parseFloat(e.target.value) || 0 })
            }
            hint="Valor cobrado independente da distância"
          />

          <Input
            label="Franquia de KM"
            type="number"
            step="0.1"
            value={pricing.baseKm}
            onChange={(e) =>
              setPricing({ ...pricing, baseKm: parseFloat(e.target.value) || 0 })
            }
            hint="Quantos KM já estão inclusos na tarifa mínima"
            icon={<MapPin size={16} />}
          />

          <Input
            label="Valor por KM Adicional (R$)"
            type="number"
            step="0.01"
            value={pricing.perKmFee}
            onChange={(e) =>
              setPricing({ ...pricing, perKmFee: parseFloat(e.target.value) || 0 })
            }
            hint="Cobrado para cada KM além da franquia"
          />

          <Input
            label="Taxa por Parada Extra (R$)"
            type="number"
            step="0.01"
            value={pricing.extraStopFee}
            onChange={(e) =>
              setPricing({
                ...pricing,
                extraStopFee: parseFloat(e.target.value) || 0,
              })
            }
            hint="Cobrado para cada parada além da primeira"
            icon={<Plus size={16} />}
          />
        </div>

        {/* Exemplo */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
            💡 Exemplo prático
          </p>
          <p className="text-sm text-blue-800">
            Uma entrega de <strong>5 KM</strong> com <strong>2 paradas</strong>{" "}
            custa:
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-2">
            R$ {exampleTotal.toFixed(2)}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            loading={saving}
            icon={<Save size={18} />}
            onClick={handleSave}
          >
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <SettingsIcon size={20} className="text-slate-500" />
          Em breve
        </h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
            Preços por região / cidade
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
            Taxa dinâmica (surge pricing)
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
            Configuração de zonas de atendimento
          </li>
        </ul>
      </Card>
    </div>
  );
}