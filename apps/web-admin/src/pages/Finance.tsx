import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { DollarSign, PlusCircle, MinusCircle, Store, TrendingUp } from "lucide-react";

interface StoreDoc {
  id: string;
  name: string;
  balance: number;
}

interface Transaction {
  id: string;
  storeId: string;
  type: string;
  amount: number;
  description: string;
}

export default function Finance() {
  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreDoc | null>(null);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [operation, setOperation] = useState<"credit" | "debit">("credit");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "stores"), (snapshot) => {
      const list: StoreDoc[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || "Sem nome",
          balance: data.balance || 0,
        });
      });
      setStores(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "transactions"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          storeId: data.storeId,
          type: data.type,
          amount: data.amount,
          description: data.description,
        });
      });
      setTransactions(list);
    });
    return () => unsub();
  }, []);

  const totalBalance = stores.reduce((sum, s) => sum + s.balance, 0);

  const handleSubmit = async () => {
    if (!selectedStore || amount <= 0) {
      alert("Selecione uma loja e informe um valor maior que zero");
      return;
    }
    setProcessing(true);
    try {
      const delta = operation === "credit" ? amount : -amount;
      const newBalance = selectedStore.balance + delta;

      await updateDoc(doc(db, "stores", selectedStore.id), {
        balance: newBalance,
      });

      await addDoc(collection(db, "transactions"), {
        storeId: selectedStore.id,
        type: operation === "credit" ? "CREDIT_PIX" : "DEBIT_DELIVERY",
        amount: operation === "credit" ? amount : -amount,
        orderId: null,
        description: description || (operation === "credit" ? "Crédito manual" : "Débito manual"),
        createdAt: serverTimestamp(),
      });

      setAmount(0);
      setDescription("");
      setSelectedStore(null);
      alert("Transação registrada!");
    } catch (err) {
      console.error(err);
      alert("Erro ao processar");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Financeiro Global</h1>
        <p className="text-gray-500 mt-1">Créditos, débitos e extrato das lojas</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard
          icon={Store}
          label="Total em Carteiras"
          value={`R$ ${totalBalance.toFixed(2)}`}
          color="blue"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Lojas Ativas"
          value={stores.length}
          color="green"
        />
        <SummaryCard
          icon={DollarSign}
          label="Transações (últimas 30)"
          value={transactions.length}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de operação */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Ajuste Manual
          </h2>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOperation("credit")}
              className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                operation === "credit"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <PlusCircle size={18} /> Creditar
            </button>
            <button
              onClick={() => setOperation("debit")}
              className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                operation === "debit"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <MinusCircle size={18} /> Debitar
            </button>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loja
          </label>
          <select
            value={selectedStore?.id || ""}
            onChange={(e) => {
              const s = stores.find((x) => x.id === e.target.value);
              setSelectedStore(s || null);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — R$ {s.balance.toFixed(2)}
              </option>
            ))}
          </select>

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount || ""}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição (opcional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Estorno de pedido #123"
          />

          <button
            onClick={handleSubmit}
            disabled={processing}
            className={`w-full py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 ${
              operation === "credit"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {processing
              ? "Processando..."
              : `${operation === "credit" ? "Creditar" : "Debitar"} R$ ${amount.toFixed(2)}`}
          </button>
        </div>

        {/* Extrato */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800">Últimas Transações</h2>
          </div>
          <div className="max-h-[500px] overflow-auto divide-y">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhuma transação registrada.
              </div>
            ) : (
              transactions.map((t) => {
                const store = stores.find((s) => s.id === t.storeId);
                const isCredit = t.amount > 0;
                return (
                  <div key={t.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-gray-800">
                          {store?.name || "Loja removida"}
                        </p>
                        <p className="text-xs text-gray-500">{t.description}</p>
                      </div>
                      <span
                        className={`font-bold text-sm ${
                          isCredit ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isCredit ? "+" : ""}R$ {Math.abs(t.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border flex items-center gap-3">
      <div className={`p-3 rounded-lg ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}