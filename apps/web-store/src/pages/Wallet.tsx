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
  X,
  Copy,
  CheckCircle2,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: any;
}

export default function Wallet() {
  const { store } = useStore();
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
    setTimeout(() => setCopied(false), 2000);
  };

  const totalCredit = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebit = Math.abs(
    transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Carteira</h1>
        <p className="text-gray-500 mt-1">Saldo, recargas e extrato</p>
      </div>

      {/* Card de Saldo */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-8 text-white shadow-lg mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-200">
              <WalletIcon size={20} />
              <span className="text-sm">Saldo disponível</span>
            </div>
            <p className="text-5xl font-bold">
              R$ {store?.balance.toFixed(2) || "0.00"}
            </p>
            <p className="text-emerald-200 text-sm mt-2">{store?.name}</p>
          </div>
          <button
            onClick={() => setShowPixModal(true)}
            className="bg-white text-emerald-700 font-bold px-5 py-3 rounded-lg hover:bg-emerald-50 transition flex items-center gap-2"
          >
            <Plus size={20} />
            Adicionar Saldo
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-emerald-500/30">
          <div>
            <p className="text-xs text-emerald-200">Total creditado</p>
            <p className="text-xl font-bold">R$ {totalCredit.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-200">Total gasto em fretes</p>
            <p className="text-xl font-bold">R$ {totalDebit.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Extrato */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-gray-800">Extrato de Transações</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            Nenhuma transação ainda.
            <br />
            Clique em "Adicionar Saldo" para começar.
          </div>
        ) : (
          <div className="divide-y">
            {transactions.map((t) => {
              const isCredit = t.amount > 0;
              return (
                <div key={t.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                  <div
                    className={`p-3 rounded-full ${
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
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{t.description}</p>
                    <p className="text-xs text-gray-500">
                      {t.type === "CREDIT_PIX" ? "Recarga PIX" : "Frete"}
                    </p>
                  </div>
                  <span
                    className={`font-bold ${
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
      </div>

      {/* Modal PIX */}
      {showPixModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Recarga via PIX</h2>
              <button
                onClick={() => {
                  setShowPixModal(false);
                  setPixGenerated(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {!pixGenerated ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor a adicionar (R$)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[50, 100, 200, 500].map((v) => (
                    <button
                      key={v}
                      onClick={() => setPixAmount(v)}
                      className={`py-2 rounded-lg border-2 font-medium transition ${
                        pixAmount === v
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      R$ {v}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={pixAmount}
                  onChange={(e) => setPixAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 mb-4"
                />
                <button
                  onClick={() => setPixGenerated(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg"
                >
                  Gerar QR Code PIX
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="bg-gray-100 rounded-xl p-6 mb-4">
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <div className="w-48 h-48 bg-[repeating-linear-gradient(0deg,#000_0,#000_8px,#fff_8px,#fff_16px),repeating-linear-gradient(90deg,#000_0,#000_8px,#fff_8px,#fff_16px)] bg-blend-multiply mx-auto"></div>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    Escaneie com o app do seu banco
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-left">
                  <p className="text-xs text-emerald-800 font-medium mb-1">
                    PIX Copia e Cola:
                  </p>
                  <p className="text-xs text-emerald-700 break-all font-mono">
                    {pixKey.slice(0, 50)}...
                  </p>
                </div>

                <button
                  onClick={handleCopyPix}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 rounded-lg flex items-center justify-center gap-2 mb-3"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={18} className="text-green-600" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copiar código PIX
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500">
                  O saldo será creditado automaticamente após a confirmação do
                  pagamento.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}