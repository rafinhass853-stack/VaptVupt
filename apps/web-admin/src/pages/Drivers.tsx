import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Users, CheckCircle2, XCircle, Ban, Bike, Car, Search } from "lucide-react";

interface Driver {
  id: string;
  name: string;
  status: string;
  vehicleType: string;
  uid: string;
  activeOrderId: string | null;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

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
          uid: data.uid || "",
          activeOrderId: data.activeOrderId || null,
        });
      });
      setDrivers(list);
    });
    return () => unsub();
  }, []);

  const filtered = drivers.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || d.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleBlock = async (driverId: string) => {
    if (!confirm("Bloquear este motoboy? Ele não poderá mais fazer entregas.")) return;
    await updateDoc(doc(db, "drivers", driverId), { status: "OFFLINE", blocked: true });
  };

  const handleUnblock = async (driverId: string) => {
    await updateDoc(doc(db, "drivers", driverId), { blocked: false });
  };

  const handleDelete = async (driverId: string) => {
    if (!confirm("Deletar este motoboy permanentemente?")) return;
    await deleteDoc(doc(db, "drivers", driverId));
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Motoboys</h1>
          <p className="text-gray-500 mt-1">{drivers.length} cadastrado(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Todos os status</option>
          <option value="ONLINE">Online</option>
          <option value="IN_TRIP">Em rota</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Motoboy
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Veículo
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  Nenhum motoboy encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{driver.name}</p>
                        <p className="text-xs text-gray-500">ID: {driver.id.slice(0, 12)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      {driver.vehicleType === "MOTO" && <Bike size={18} />}
                      {driver.vehicleType === "CARRO" && <Car size={18} />}
                      <span className="text-sm">{driver.vehicleType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <DriverStatusBadge status={driver.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleBlock(driver.id)}
                        className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition"
                        title="Bloquear"
                      >
                        <Ban size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(driver.id)}
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
    </div>
  );
}

function DriverStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    ONLINE: { label: "Online", className: "bg-green-100 text-green-700" },
    OFFLINE: { label: "Offline", className: "bg-gray-100 text-gray-700" },
    IN_TRIP: { label: "Em Rota", className: "bg-blue-100 text-blue-700" },
  };
  const c = map[status] || map.OFFLINE;
  return (
    <span className={`text-xs px-3 py-1 rounded-full font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}