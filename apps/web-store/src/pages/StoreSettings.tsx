import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useStore } from "../context/StoreContext";
import {
  MapPin,
  Save,
  Store as StoreIcon,
  Phone,
  Mail,
} from "lucide-react";
import { Button, Card, Input, useToast } from "@vaptvupt/shared-ui";

export default function StoreSettings() {
  const { store, refreshStore } = useStore();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [lat, setLat] = useState(-23.5613);
  const [lng, setLng] = useState(-46.6565);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!store) return;
    (async () => {
      const snap = await getDoc(doc(db, "stores", store.id));
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setStreet(data.address?.street || "");
        setNumber(data.address?.number || "");
        setLat(data.address?.lat || -23.5613);
        setLng(data.address?.lng || -46.6565);
      }
      setLoading(false);
    })();
  }, [store]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "stores", store.id), {
        name,
        phone,
        email,
        address: { street, number, lat, lng },
      });
      await refreshStore();
      toast("Configurações salvas com sucesso!", "success");
    } catch (err: any) {
      toast(err.message || "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Carregando...</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Configurações da Loja
        </h1>
        <p className="text-slate-500 mt-1">
          Defina o endereço de coleta padrão e dados de contato
        </p>
      </div>

      <div className="space-y-6">
        {/* Dados básicos */}
        <Card>
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <StoreIcon size={20} className="text-emerald-600" />
            Dados da Loja
          </h2>

          <div className="space-y-4">
            <Input
              label="Nome da Loja"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pizzaria do Zé"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                icon={<Phone size={16} />}
              />
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@loja.com"
                icon={<Mail size={16} />}
              />
            </div>
          </div>
        </Card>

        {/* Endereço */}
        <Card>
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-600" />
            Endereço de Coleta
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Este será o ponto de partida padrão das suas rotas
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Rua / Avenida"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Av. Paulista"
                />
              </div>
              <Input
                label="Número"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="1000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Latitude"
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
              />
              <Input
                label="Longitude"
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              💡 Em breve, o endereço será geocodificado automaticamente ao digitar.
            </div>
          </div>
        </Card>

        {/* Botão salvar */}
        <div className="flex justify-end">
          <Button
            variant="success"
            size="lg"
            loading={saving}
            icon={<Save size={18} />}
            onClick={handleSave}
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}