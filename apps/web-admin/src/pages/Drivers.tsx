import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Users,
  Ban,
  XCircle,
  Bike,
  Car,
  Search,
  UserCheck,
  Phone,
  CreditCard,
} from "lucide-react";
import { Card, Button, Badge, Input, EmptyState, useToast, Modal } from "@vaptvupt/shared-ui";

interface Driver {
  id: string;
  name: string;
  status: string;
  vehicleType: string;
  cpf?: string;
  phone?: string;
  plate?: string;
  approved?: boolean;
  blocked?: boolean;
  activeOrderId?: string | null;
  totalDeliveries?: number;
}

export default function Drivers() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Driver | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "drivers"), (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || "Sem nome",
          status: data.status || "OFFLINE",
          vehicleType: data.vehicleType || "MOTO",
          cpf: data.cpf,
          phone: data.phone,
          plate: data.plate,
          approved: data.approved !== false,
          blocked: !!data.blocked,
          activeOrderId: data.activeOrderId || null,
          totalDeliveries: data.totalDeliveries || 0,
        });
      });
      setDrivers(list);
    });
    return () => unsub();
  }, []);

  const filtered = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.cpf?.includes(search) ||
      d.plate?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "blocked" && d.blocked) ||
      (filter === "online" && d.status === "ONLINE") ||
      (filter === "in_trip" && d.status === "IN_TRIP") ||
      (filter === "offline" && d.status === "OFFLINE");
    return matchesSearch && matchesFilter;
  });

  const handleBlock = async (driverId: string) => {
    if (!confirm("Bloquear este motoboy? Ele não poderá mais fazer entregas.")) return;
    try {
      await updateDoc(doc(db, "drivers", driverId), {
        blocked: true,
        status: "OFFLINE",
      });
      toast("Motoboy bloqueado!", "success");
      setSelected(null);
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  const handleUnblock = async (driverId: string) => {
    try {
      await updateDoc(doc(db, "drivers", driverId), { blocked: false });
      toast("Motoboy desbloqueado!", "success");
      setSelected(null);
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  const handleDelete = async (driverId: string) => {
    if (!confirm("Deletar este motoboy permanentemente?")) return;
    try {
      await deleteDoc(doc(db, "drivers", driverId));
      toast("Motoboy removido!", "success");
      setSelected(null);
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Motoboys
          </h1>
          <p className="text-slate-500 mt-1">
            {drivers.length} cadastrado(s)
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, CPF ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos</option>
          <option value="online">Online</option>
          <option value="in_trip">Em rota</option>
          <option value="offline">Offline</option>
          <option value="blocked">Bloqueados</option>
        </select>
      </div>

      {/* Tabela */}
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Motoboy
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Veículo
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<Users size={32} />}
                      title="Nenhum motoboy encontrado"
                      description="Ajuste os filtros ou aguarde novos cadastros."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((driver) => (
                  <tr
                    key={driver.id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setSelected(driver)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            driver.blocked
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {driver.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            ID: {driver.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {driver.phone || "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {driver.cpf || "CPF não informado"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        {driver.vehicleType === "MOTO" && <Bike size={18} />}
                        {driver.vehicleType === "CARRO" && <Car size={18} />}
                        <span className="text-sm font-medium">
                          {driver.vehicleType}
                        </span>
                        {driver.plate && (
                          <span className="text-xs text-slate-500 ml-1">
                            {driver.plate}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <DriverStatusBadge driver={driver} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {driver.blocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnblock(driver.id);
                            }}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition"
                            title="Desbloquear"
                          >
                            <UserCheck size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlock(driver.id);
                            }}
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition"
                            title="Bloquear"
                          >
                            <Ban size={18} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(driver.id);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Deletar"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal detalhes */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Detalhes: ${selected.name}` : ""}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <InfoField
                icon={<Phone size={16} />}
                label="Telefone"
                value={selected.phone || "—"}
              />
              <InfoField
                icon={<CreditCard size={16} />}
                label="CPF"
                value={selected.cpf || "—"}
              />
              <InfoField
                icon={<Bike size={16} />}
                label="Veículo"
                value={selected.vehicleType}
              />
              <InfoField
                icon={<Users size={16} />}
                label="Placa"
                value={selected.plate || "—"}
              />
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Total de entregas</span>
                <span className="font-semibold text-slate-800">
                  {selected.totalDeliveries || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Status atual</span>
                <DriverStatusBadge driver={selected} />
              </div>
            </div>

            <div className="flex gap-3">
              {selected.blocked ? (
                <Button
                  variant="success"
                  fullWidth
                  onClick={() => handleUnblock(selected.id)}
                  icon={<UserCheck size={18} />}
                >
                  Desbloquear
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => handleBlock(selected.id)}
                  icon={<Ban size={18} />}
                >
                  Bloquear
                </Button>
              )}
              <Button
                variant="danger"
                fullWidth
                onClick={() => handleDelete(selected.id)}
                icon={<XCircle size={18} />}
              >
                Deletar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function DriverStatusBadge({ driver }: { driver: Driver }) {
  if (driver.blocked) {
    return <Badge variant="danger">Bloqueado</Badge>;
  }
  const map: Record<string, any> = {
    ONLINE: { label: "Online", variant: "success" },
    OFFLINE: { label: "Offline", variant: "default" },
    IN_TRIP: { label: "Em Rota", variant: "info" },
  };
  const c = map[driver.status] || map.OFFLINE;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}