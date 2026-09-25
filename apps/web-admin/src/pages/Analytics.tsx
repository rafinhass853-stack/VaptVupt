import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import {
  Activity,
  Bike,
  CheckCircle2,
  Clock3,
  DollarSign,
  Package,
  RefreshCw,
  Store,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { functions } from "../lib/firebase";

type Kpis = {
  ordersTotal: number;
  activeOrders: number;
  searchingDriver: number;
  offered: number;
  delivered: number;
  cancelled: number;
  driversOnline: number;
  driversInTrip: number;
  driversAvailable: number;
  storesActive: number;
  grossRevenue: number;
  platformRevenue: number;
  driverPayouts: number;
  averageDeliveryMinutes: number;
  totalStores: number;
  totalDrivers: number;
};

const emptyKpis: Kpis = {
  ordersTotal: 0,
  activeOrders: 0,
  searchingDriver: 0,
  offered: 0,
  delivered: 0,
  cancelled: 0,
  driversOnline: 0,
  driversInTrip: 0,
  driversAvailable: 0,
  storesActive: 0,
  grossRevenue: 0,
  platformRevenue: 0,
  driverPayouts: 0,
  averageDeliveryMinutes: 0,
  totalStores: 0,
  totalDrivers: 0,
};

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function number(value: number) {
  return value.toLocaleString("pt-BR");
}

function minutes(value: number) {
  if (!value) return "0 min";

  const total = Math.round(value);
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }

  return `${mins} min`;
}

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: typeof Activity;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
          {description && (
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-100">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [kpis, setKpis] = useState<Kpis>(emptyKpis);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadKpis = async () => {
    try {
      setLoading(true);
      setError("");

      const getKpis = httpsCallable<unknown, Kpis>(
        functions,
        "getOperationsKpis"
      );

      const result = await getKpis({});
      setKpis(result.data);
    } catch (err) {
      console.error("Erro ao carregar KPIs:", err);
      setError(
        "Não foi possível carregar os indicadores. Verifique sua permissão de administrador e a conexão com o Firebase."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpis();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">
              BI Operacional
            </h1>
          </div>

          <p className="text-slate-500 mt-1">
            Indicadores operacionais e financeiros da plataforma.
          </p>
        </div>

        <button
          onClick={loadKpis}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-slate-500 mt-3">
            Carregando indicadores...
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Pedidos"
              value={number(kpis.ordersTotal)}
              icon={Package}
              description={`${number(kpis.activeOrders)} ativos`}
            />

            <KpiCard
              title="Entregas concluídas"
              value={number(kpis.delivered)}
              icon={CheckCircle2}
            />

            <KpiCard
              title="Cancelamentos"
              value={number(kpis.cancelled)}
              icon={XCircle}
            />

            <KpiCard
              title="Tempo médio"
              value={minutes(kpis.averageDeliveryMinutes)}
              icon={Clock3}
              description="das entregas concluídas"
            />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              Operação em tempo real
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Motoristas online"
                value={number(kpis.driversOnline)}
                icon={Bike}
              />

              <KpiCard
                title="Motoristas disponíveis"
                value={number(kpis.driversAvailable)}
                icon={Users}
              />

              <KpiCard
                title="Motoristas em viagem"
                value={number(kpis.driversInTrip)}
                icon={Truck}
              />

              <KpiCard
                title="Lojas ativas"
                value={number(kpis.storesActive)}
                icon={Store}
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              Funil de pedidos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                title="Buscando motorista"
                value={number(kpis.searchingDriver)}
                icon={Users}
              />

              <KpiCard
                title="Oferta enviada"
                value={number(kpis.offered)}
                icon={Activity}
              />

              <KpiCard
                title="Pedidos ativos"
                value={number(kpis.activeOrders)}
                icon={Package}
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              Financeiro
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard
                title="Faturamento bruto"
                value={money(kpis.grossRevenue)}
                icon={DollarSign}
              />

              <KpiCard
                title="Receita da plataforma"
                value={money(kpis.platformRevenue)}
                icon={DollarSign}
              />

              <KpiCard
                title="Repasses aos motoristas"
                value={money(kpis.driverPayouts)}
                icon={DollarSign}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">
              Base cadastrada
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-slate-700">
                    Total de lojas
                  </span>
                </div>
                <strong className="text-slate-800">
                  {number(kpis.totalStores)}
                </strong>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-slate-700">
                    Total de motoristas
                  </span>
                </div>
                <strong className="text-slate-800">
                  {number(kpis.totalDrivers)}
                </strong>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}