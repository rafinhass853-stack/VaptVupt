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
import {
  DollarSign,
  PlusCircle,
  MinusCircle,
  Store as StoreIcon,
  TrendingUp,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  EmptyState,
  Badge,
  useToast,
} from "@vaptvupt/shared-ui";

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
  createdAt: any;
}

export default function Finance() {
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreDoc | null>(null);
  const [searchStore, setSearchStore] = useState("");
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
          createdAt: data.createdAt,
        });
      });
      setTransactions(list);
    });
    return () => unsub();
  }, []);

  const totalBalance = stores.reduce((sum, s) => sum + s.balance, 0);

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(searchStore.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedStore || amount <= 0) {
      toast("Selecione uma loja e informe um valor maior que zero", "error");
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
        type: operation === "credit" ? "CREDIT_MANUAL" : "DEBIT_MANUAL",
        amount: operation === "credit" ? amount : -amount,
        orderId: null,
        description:
          description ||
          (operation === "credit" ? "Crédito manual" : "Débito manual"),
        balanceAfter: newBalance,
        createdAt: serverTimestamp(),
      });

      toast(
        `${operation === "credit" ? "Crédito" : "Débito"} de R$ ${amount.toFixed(2)} aplicado!`,
        "success"
      );
      setAmount(0);
      setDescription("");
      setSelectedStore(null);
      setSearchStore("");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Financeiro Global
        </h1>
        <p className="text-slate-500 mt-1">
          Créditos, débitos e extrato consolidado
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <KpiCard
          icon={<Wallet size={22} />}
          label="Total em Carteiras"
          value={`R$ ${totalBalance.toFixed(2)}`}
          color="blue"
        />
        <KpiCard
          icon={<StoreIcon size={22} />}
          label="Lojas Ativas"
          value={stores.length}
          color="green"
        />
        <KpiCard
          icon={<TrendingUp size={22} />}
          label="Transações (últimas 30)"
          value={transactions.length}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de operação */}
        <Card>
          <h2 className="text-lg font-bold text-slate-800 mb-5">
            Ajuste Manual
          </h2>

          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setOperation("credit")}
              className={`flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                operation === "credit"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <PlusCircle size={18} /> Creditar
            </button>
            <button
              onClick={() => setOperation("debit")}
              className={`flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                operation === "debit"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <MinusCircle size={18} /> Debitar
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Buscar loja
            </label>
            <Input
              placeholder="Digite o nome da loja..."
              value={searchStore}
              onChange={(e) => setSearchStore(e.target.value)}
              icon={<Search size={16} />}
            />

            {searchStore && filteredStores.length > 0 && !selectedStore && (
              <div className="mt-2 max-h-40 overflow-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                {filteredStores.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStore(s);
                      setSearchStore(s.name);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm border-b border-slate-100 last:border-b-0 transition"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">
                        {s.name}
                      </span>
                      <span className="text-emerald-600 font-semibold">
                        R$ {s.balance.toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedStore && (
              <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {selectedStore.name}
                  </p>
                  <p className="text-xs text-emerald-700">
                    Saldo atual: R$ {selectedStore.balance.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedStore(null);
                    setSearchStore("");
                  }}
                  className="text-emerald-600 hover:text-emerald-800 text-sm"
                >
                  Trocar
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="mb-5">
            <Input
              label="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Estorno de pedido #123"
            />
          </div>

          <Button
            variant={operation === "credit" ? "success" : "danger"}
            fullWidth
            size="lg"
            loading={processing}
            onClick={handleSubmit}
          >
            {processing
              ? "Processando..."
              : `${operation === "credit" ? "Creditar" : "Debitar"} R$ ${amount.toFixed(2)}`}
          </Button>
        </Card>

        {/* Extrato */}
        <Card padded={false}>
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-bold text-slate-800">Últimas Transações</h2>
          </div>
          <div className="max-h-[600px] overflow-auto">
            {transactions.length === 0 ? (
              <EmptyState
                icon={<DollarSign size={32} />}
                title="Nenhuma transação"
                description="As movimentações aparecerão aqui."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const store = stores.find((s) => s.id === t.storeId);
                  const isCredit = t.amount > 0;
                  return (
                    <div
                      key={t.id}
                      className="p-4 hover:bg-slate-50 transition flex items-center gap-3"
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          isCredit
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowUpCircle size={18} />
                        ) : (
                          <ArrowDownCircle size={18} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {store?.name || "Loja removida"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {t.description}
                        </p>
                      </div>
                      <span
                        className={`font-bold text-sm whitespace-nowrap ${
                          isCredit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isCredit ? "+" : ""}R${" "}
                        {Math.abs(t.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "blue" | "green" | "purple";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}