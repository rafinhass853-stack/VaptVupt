import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import {
  Store as StoreIcon,
  Plus,
  Search,
  DollarSign,
  MapPin,
  Trash2,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  User,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Modal,
  EmptyState,
  Badge,
  useToast,
} from "@vaptvupt/shared-ui";
import { autocompleteAddress } from "../lib/maps";
import type { GeocodedAddress } from "../lib/maps";
import { maskPhone } from "../lib/masks";
import { isValidEmail, slugify } from "../lib/validators";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const storeIcon = L.divIcon({
  html: `<div style="background:#f59e0b;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🏪</div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 16);
    }
  }, [lat, lng, map]);
  return null;
}

interface StoreDoc {
  id: string;
  name: string;
  slug: string;
  balance: number;
  phone?: string;
  email?: string;
  managerName?: string;
  address: {
    street: string;
    number: string;
    neighborhood?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  uid: string;
  status?: string;
}

export default function Stores() {
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "stores"), (snapshot) => {
      const list: StoreDoc[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || "Sem nome",
          slug: data.slug || "",
          balance: data.balance || 0,
          phone: data.phone,
          email: data.email,
          managerName: data.managerName,
          address: data.address || {
            street: "",
            number: "",
          },
          uid: data.uid || "",
          status: data.status || "active",
        });
      });
      setStores(list);
    });
    return () => unsub();
  }, []);

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar esta loja? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteDoc(doc(db, "stores", id));
      toast("Loja removida!", "success");
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Lojas
          </h1>
          <p className="text-slate-500 mt-1">{stores.length} cadastrada(s)</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowModal(true)}
        >
          Nova Loja
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Buscar por nome, e-mail ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={16} />}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<StoreIcon size={32} />}
            title="Nenhuma loja encontrada"
            description="Cadastre uma nova loja para começar."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-2.5 rounded-xl shadow">
                  <StoreIcon size={20} />
                </div>
                <button
                  onClick={() => handleDelete(store.id)}
                  className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="font-bold text-slate-800 mb-1 truncate">
                {store.name}
              </h3>
              <p className="text-xs text-slate-500 mb-4">/{store.slug}</p>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <DollarSign size={14} />
                    Saldo
                  </div>
                  <span className="text-sm font-bold text-emerald-600">
                    R$ {store.balance.toFixed(2)}
                  </span>
                </div>

                {store.managerName && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User size={14} />
                    {store.managerName}
                  </div>
                )}

                {store.address?.street && (
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {store.address.street}, {store.address.number}
                      {store.address.city && ` — ${store.address.city}`}
                    </span>
                  </div>
                )}

                {store.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={14} />
                    {store.phone}
                  </div>
                )}

                {store.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                    <Mail size={14} className="flex-shrink-0" />
                    <span className="truncate">{store.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <Badge variant={store.uid ? "success" : "warning"} size="sm">
                  {store.uid ? "Vinculada" : "Sem acesso"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewStoreModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

// ============================================
// MODAL DE NOVA LOJA
// ============================================

function NewStoreModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    slug: "",
    slugEdited: false,
    phone: "",
    managerName: "",
    email: "",
    password: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
  });

  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodedAddress[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<GeocodedAddress | null>(
    null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setField = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  // Auto-gera slug do nome se não foi editado manualmente
  const handleNameChange = (value: string) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: f.slugEdited ? f.slug : slugify(value),
    }));
    setErrors((e) => ({ ...e, name: "" }));
  };

  const handleSlugChange = (value: string) => {
    setForm((f) => ({
      ...f,
      slug: slugify(value),
      slugEdited: true,
    }));
    setErrors((e) => ({ ...e, slug: "" }));
  };

  const handleAddressChange = (value: string) => {
    setAddressQuery(value);
    setSelectedAddress(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 3) {
        setAddressLoading(true);
        const results = await autocompleteAddress(value);
        setSuggestions(results);
        setShowSuggestions(true);
        setAddressLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 500);
  };

  const handleSelectAddress = (s: GeocodedAddress) => {
    setSelectedAddress(s);
    setAddressQuery(s.displayName);
    setShowSuggestions(false);

    const parts = s.displayName.split(",");
    if (parts.length > 0) {
      const firstPart = parts[0].trim();
      const match = firstPart.match(/^(.+?),\s*(\d+)/);
      if (match) {
        setForm((f) => ({
          ...f,
          street: match[1].trim(),
          number: match[2],
        }));
      } else {
        setForm((f) => ({ ...f, street: firstPart }));
      }
    }
    if (parts.length >= 3) {
      // tentativa simples de pegar cidade no fim
      const lastPart = parts[parts.length - 3]?.trim() || "";
      if (lastPart.length < 40) {
        setForm((f) => ({ ...f, city: f.city || lastPart }));
      }
    }
    setErrors((e) => ({ ...e, street: "", number: "" }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = "Nome obrigatório";
    if (!form.slug) e.slug = "Slug obrigatório";
    if (!form.managerName) e.managerName = "Nome do responsável obrigatório";
    if (!form.email) e.email = "E-mail obrigatório";
    else if (!isValidEmail(form.email)) e.email = "E-mail inválido";
    if (!form.password || form.password.length < 6)
      e.password = "Senha deve ter ao menos 6 caracteres";
    if (!selectedAddress) e.addressQuery = "Selecione um endereço";
    if (!form.street) e.street = "Rua obrigatória";
    if (!form.number) e.number = "Número obrigatório";
    if (!form.neighborhood) e.neighborhood = "Bairro obrigatório";
    if (!form.city) e.city = "Cidade obrigatória";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      slugEdited: false,
      phone: "",
      managerName: "",
      email: "",
      password: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
    });
    setAddressQuery("");
    setSelectedAddress(null);
    setErrors({});
  };

  const handleSave = async () => {
    if (!validate()) {
      toast("Verifique os campos destacados", "error");
      return;
    }

    setLoading(true);
    try {
      const createFn = httpsCallable(functions, "createStore");
      await createFn({
        name: form.name,
        slug: form.slug,
        phone: form.phone,
        managerName: form.managerName,
        email: form.email,
        password: form.password,
        address: {
          street: form.street,
          number: form.number,
          neighborhood: form.neighborhood,
          city: form.city,
          lat: selectedAddress?.lat || 0,
          lng: selectedAddress?.lng || 0,
          fullAddress: selectedAddress?.displayName || "",
        },
      });

      toast("Loja criada com sucesso!", "success");
      resetForm();
      onClose();
    } catch (err: any) {
      const msg = err.message || "Erro ao criar loja";
      if (msg.includes("já") || msg.includes("already")) {
        toast("E-mail ou slug já cadastrado", "error");
      } else {
        toast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova Loja"
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            fullWidth
            loading={loading}
            onClick={handleSave}
          >
            {loading ? "Criando..." : "Criar Loja"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Dados da Loja */}
        <Section title="Dados da Loja">
          <div className="col-span-2">
            <FormField label="Nome do Estabelecimento" error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Pizzaria do Zé"
                className={inputClass(errors.name)}
              />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField
              label="Slug (URL amigável)"
              error={errors.slug}
            >
              <input
                type="text"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="pizzaria-do-ze"
                className={`${inputClass(errors.slug)} font-mono`}
              />
              <p className="text-xs text-slate-400 mt-1">
                Gerado automaticamente do nome — editável
              </p>
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Telefone da loja">
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setField("phone", maskPhone(e.target.value))}
                placeholder="(11) 3333-4444"
                maxLength={15}
                className={inputClass()}
              />
            </FormField>
          </div>
        </Section>

        {/* Contato & Acesso */}
        <Section title="Contato & Acesso">
          <div className="col-span-2">
            <FormField
              label="Nome do Responsável"
              error={errors.managerName}
            >
              <input
                type="text"
                value={form.managerName}
                onChange={(e) => setField("managerName", e.target.value)}
                placeholder="Maria Souza"
                className={inputClass(errors.managerName)}
              />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="E-mail de login" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="contato@pizzaria.com"
                className={inputClass(errors.email)}
              />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Senha inicial" error={errors.password}>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </FormField>
          </div>
        </Section>

        {/* Endereço */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-blue-600" />
            Endereço da Loja
          </h3>

          <div className="relative mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Buscar endereço
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Digite o endereço (mínimo 3 caracteres)"
                value={addressQuery}
                onChange={(e) => handleAddressChange(e.target.value)}
                onBlur={() =>
                  setTimeout(() => setShowSuggestions(false), 200)
                }
                className={`${inputClass(errors.addressQuery)} bg-white`}
              />
              {selectedAddress && (
                <CheckCircle2
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
                />
              )}
              {addressLoading && (
                <Loader2
                  size={16}
                  className="absolute right-10 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
                />
              )}
            </div>

            {errors.addressQuery && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.addressQuery}
              </p>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectAddress(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-b-0 transition"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={14}
                        className="text-blue-600 mt-1 flex-shrink-0"
                      />
                      <span className="text-slate-700 line-clamp-2">
                        {s.displayName}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedAddress && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="col-span-2">
                  <FormField label="Rua" error={errors.street}>
                    <input
                      type="text"
                      value={form.street}
                      onChange={(e) => setField("street", e.target.value)}
                      className={inputClass(errors.street)}
                    />
                  </FormField>
                </div>
                <FormField label="Número" error={errors.number}>
                  <input
                    type="text"
                    value={form.number}
                    onChange={(e) => setField("number", e.target.value)}
                    className={inputClass(errors.number)}
                  />
                </FormField>
                <FormField label="Bairro" error={errors.neighborhood}>
                  <input
                    type="text"
                    value={form.neighborhood}
                    onChange={(e) =>
                      setField("neighborhood", e.target.value)
                    }
                    className={inputClass(errors.neighborhood)}
                  />
                </FormField>
                <div className="col-span-2">
                  <FormField label="Cidade" error={errors.city}>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setField("city", e.target.value)}
                      className={inputClass(errors.city)}
                    />
                  </FormField>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-200">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                  <MapPin size={14} className="text-blue-600" />
                  <span className="text-xs font-semibold text-slate-700">
                    Confirme a localização
                  </span>
                </div>
                <div style={{ height: 220 }}>
                  <MapContainer
                    center={[selectedAddress.lat, selectedAddress.lng]}
                    zoom={16}
                    style={{ height: "100%", width: "100%" }}
                    zoomControl={false}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                      position={[selectedAddress.lat, selectedAddress.lng]}
                      icon={storeIcon}
                    />
                    <MapController
                      lat={selectedAddress.lat}
                      lng={selectedAddress.lng}
                    />
                  </MapContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-bold text-slate-700 mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
    error ? "border-red-400" : "border-slate-300"
  }`;
}