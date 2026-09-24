import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useStore } from "../context/StoreContext";
import {
  Wallet as WalletIcon,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Copy,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button, Card, Modal, EmptyState, useToast } from "@vaptvupt/shared-ui";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: any;
}

export default function Wallet() {
  const { store } = useStore();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixAmount, setPixAmount] = useState(50);
  const [pixGenerated, setPixGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!store) return;
    const q = query(
      collection(db, "transactions"),
      where("storeId", "==", store.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          type: data.type,
          amount: data.amount,
          description: data.description,
          createdAt: data.createdAt,
        });
      });
      setTransactions(list);
    });
    return () => unsub();
  }, [store]);

  const pixKey = `00020126580014BR.GOV.BCB.PIX0136${
    store?.slug || "loja"
  }-vaptvupt5204000053039865802BR5913VaptVupt LTDA6009SAO PAULO62070503***6304ABCD`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast("Código PIX copiado!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalCredit = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebit = Math.abs(
    transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Carteira</h1>
        <p className="text-slate-500 mt-1">Saldo, recargas e extrato detalhado</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 rounded-2xl p-7 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 right-20 w-24 h-24 bg-white/5 rounded-full"></div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-100">
                <WalletIcon size={20} />
                <span className="text-sm font-medium">Saldo disponível</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setShowPixModal(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                Adicionar
              </Button>
            </div>
            <p className="text-5xl font-bold mb-2">
              R$ {store?.balance.toFixed(2) || "0.00"}
            </p>
            <p className="text-emerald-100 text-sm">{store?.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 text-green-600 p-2.5 rounded-xl">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total creditado</p>
                <p className="text-lg font-bold text-slate-800">
                  R$ {totalCredit.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="bg-red-100 text-red-600 p-2.5 rounded-xl">
                <TrendingDown size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total em fretes</p>
                <p className="text-lg font-bold text-slate-800">
                  R$ {totalDebit.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Extrato */}
      <Card>
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          Extrato de Transações
        </h2>

        {transactions.length === 0 ? (
          <EmptyState
            icon={<WalletIcon size={32} />}
            title="Nenhuma transação ainda"
            description='Clique em "Adicionar" para fazer sua primeira recarga.'
          />
        ) : (
          <div className="divide-y divide-slate-100 -mx-6">
            {transactions.map((t) => {
              const isCredit = t.amount > 0;
              return (
                <div
                  key={t.id}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition"
                >
                  <div
                    className={`p-3 rounded-xl ${
                      isCredit
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {isCredit ? (
                      <ArrowUpCircle size={20} />
                    ) : (
                      <ArrowDownCircle size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {t.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.type === "CREDIT_PIX"
                        ? "Recarga PIX"
                        : t.type === "DEBIT_DELIVERY"
                        ? "Frete de entrega"
                        : t.type}
                    </p>
                  </div>
                  <span
                    className={`font-bold whitespace-nowrap ${
                      isCredit ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isCredit ? "+" : ""}
                    R$ {Math.abs(t.amount).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal PIX */}
      <Modal
        open={showPixModal}
        onClose={() => {
          setShowPixModal(false);
          setPixGenerated(false);
        }}
        title="Recarga via PIX"
      >
        {!pixGenerated ? (
          <>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Valor a adicionar
            </label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[50, 100, 200, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setPixAmount(v)}
                  className={`py-2.5 rounded-lg border-2 font-semibold transition ${
                    pixAmount === v
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  R$ {v}
                </button>
              ))}
            </div>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                value={pixAmount}
                onChange={(e) => setPixAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-semibold"
              />
            </div>
            <Button
              variant="success"
              fullWidth
              size="lg"
              onClick={() => setPixGenerated(true)}
            >
              Gerar QR Code PIX
            </Button>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-slate-100 rounded-2xl p-6 mb-4">
              <div className="bg-white p-4 rounded-xl inline-block shadow">
                <div className="w-48 h-48 bg-[repeating-linear-gradient(0deg,#000_0,#000_8px,#fff_8px,#fff_16px),repeating-linear-gradient(90deg,#000_0,#000_8px,#fff_8px,#fff_16px)] bg-blend-multiply mx-auto"></div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Escaneie com o app do seu banco
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-emerald-800 font-semibold mb-1">
                PIX Copia e Cola:
              </p>
              <p className="text-xs text-emerald-700 break-all font-mono">
                {pixKey.slice(0, 60)}...
              </p>
            </div>

            <Button
              variant="ghost"
              fullWidth
              icon={
                copied ? (
                  <CheckCircle2 size={18} className="text-green-600" />
                ) : (
                  <Copy size={18} />
                )
              }
              onClick={handleCopyPix}
              className="mb-3"
            >
              {copied ? "Copiado!" : "Copiar código PIX"}
            </Button>

            <p className="text-xs text-slate-500">
              O saldo será creditado após a confirmação do pagamento.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}