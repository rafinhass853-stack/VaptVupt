import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Store, Plus, Search, DollarSign, MapPin, X } from "lucide-react";

interface StoreDoc {
  id: string;
  name: string;
  slug: string;
  balance: number;
  address: { street: string; number: string; lat: number; lng: number };
  uid: string;
}

export default function Stores() {
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
    await deleteDoc(doc(db, "stores", id));
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Lojas</h1>
          <p className="text-gray-500 mt-1">{stores.length} cadastrada(s)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={18} />
          Nova Loja
        </button>
      </div>

      <div className="mb-6 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-xl border">
            Nenhuma loja encontrada.
          </div>
        ) : (
          filtered.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Store size={20} />
                </div>
                <button
                  onClick={() => handleDelete(store.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
              <h3 className="font-bold text-gray-800 mb-1">{store.name}</h3>
              <p className="text-xs text-gray-500 mb-3">/{store.slug}</p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign size={14} />
                  <span className="font-semibold">
                    R$ {store.balance.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-gray-500 text-xs">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                  <span>
                    {store.address.street}, {store.address.number}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <NewStoreModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function NewStoreModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [initialBalance, setInitialBalance] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !slug) {
      alert("Nome e slug são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "stores"), {
        name,
        slug,
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
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao criar loja");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Nova Loja</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <Input label="Nome da Loja" value={name} onChange={setName} placeholder="Pizzaria do Zé" />
          <Input
            label="Slug (URL única)"
            value={slug}
            onChange={(v) => setSlug(v.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="pizzaria-do-ze"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Rua" value={street} onChange={setStreet} placeholder="Av. Paulista" />
            <Input label="Número" value={number} onChange={setNumber} placeholder="1000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saldo Inicial (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Criar Loja"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}