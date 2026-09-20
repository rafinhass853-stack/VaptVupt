import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Store as StoreIcon,
  Plus,
  Search,
  DollarSign,
  MapPin,
  Trash2,
  Phone,
  Mail,
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

interface StoreDoc {
  id: string;
  name: string;
  slug: string;
  balance: number;
  phone?: string;
  email?: string;
  address: { street: string; number: string; lat: number; lng: number };
  uid: string;
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
          address: data.address || { street: "", number: "", lat: 0, lng: 0 },
          uid: data.uid || "",
        });
      });
      setStores(list);
    });
    return () => unsub();
  }, []);

  const filtered = stores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
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
          <p className="text-slate-500 mt-1">
            {stores.length} cadastrada(s)
          </p>
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
          placeholder="Buscar por nome..."
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

                {store.address.street && (
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {store.address.street}, {store.address.number}
                    </span>
                  </div>
                )}

                {store.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={14} />
                    {store.phone}
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

function NewStoreModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [initialBalance, setInitialBalance] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !slug) {
      toast("Nome e slug são obrigatórios", "error");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "stores"), {
        name,
        slug,
        phone,
        email,
        balance: initialBalance,
        address: {
          street,
          number,
          lat: -23.5613,
          lng: -46.6565,
        },
        uid: "",
        createdAt: serverTimestamp(),
      });
      toast("Loja criada com sucesso!", "success");
      onClose();
      setName("");
      setSlug("");
      setPhone("");
      setEmail("");
      setStreet("");
      setNumber("");
      setInitialBalance(0);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
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
            loading={saving}
            onClick={handleSave}
          >
            {saving ? "Salvando..." : "Criar Loja"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome da Loja"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pizzaria do Zé"
        />

        <Input
          label="Slug (URL única)"
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
          }
          placeholder="pizzaria-do-ze"
          hint="Será usado na URL do portal da loja"
        />

        <div className="grid grid-cols-2 gap-3">
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

        <Input
          label="Saldo Inicial (R$)"
          type="number"
          step="0.01"
          value={initialBalance}
          onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
        />
      </div>
    </Modal>
  );
}