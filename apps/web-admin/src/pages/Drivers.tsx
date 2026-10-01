import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
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
  const [showCreateModal, setShowCreateModal] = useState(false);

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

      <NewDriverModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

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

function NewDriverModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", cpf: "", phone: "",
    street: "", number: "", neighborhood: "", city: "São Carlos",
    licenseCategory: "A", licenseNumber: "", vehicleType: "moto",
    plate: "", color: "", year: String(new Date().getFullYear()), brand: "", model: "",
  });

  const setField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Nome obrigatório";
    if (!form.email.trim()) e.email = "E-mail obrigatório";
    else if (!/^\\S+@\\S+\\.\\S+$/.test(form.email)) e.email = "E-mail inválido";
    if (form.password.length < 6) e.password = "Mínimo de 6 caracteres";
    const cpf = form.cpf.replace(/\\D/g, "");
    if (cpf.length !== 11) e.cpf = "CPF deve ter 11 dígitos";
    const phone = form.phone.replace(/\\D/g, "");
    if (![10, 11].includes(phone.length)) e.phone = "Telefone inválido";
    if (!form.licenseCategory) e.licenseCategory = "Categoria obrigatória";
    if (!form.licenseNumber.trim()) e.licenseNumber = "CNH obrigatória";
    if (!form.plate.trim()) e.plate = "Placa obrigatória";
    if (!form.brand.trim()) e.brand = "Marca obrigatória";
    if (!form.model.trim()) e.model = "Modelo obrigatório";
    if (!form.color.trim()) e.color = "Cor obrigatória";
    if (!form.year.trim()) e.year = "Ano obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setForm({ fullName: "", email: "", password: "", cpf: "", phone: "", street: "", number: "", neighborhood: "", city: "São Carlos", licenseCategory: "A", licenseNumber: "", vehicleType: "moto", plate: "", color: "", year: String(new Date().getFullYear()), brand: "", model: "" });
    setErrors({});
    setShowPassword(false);
  };

  const save = async () => {
    if (!validate()) { toast("Verifique os campos destacados", "error"); return; }
    setLoading(true);
    try {
      const createCourier = httpsCallable(functions, "createCourier");
      await createCourier({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fullName: form.fullName.trim(),
        cpf: form.cpf,
        phone: form.phone,
        address: { street: form.street.trim(), number: form.number.trim(), neighborhood: form.neighborhood.trim(), city: form.city.trim() },
        licenseCategory: form.licenseCategory,
        licenseNumber: form.licenseNumber.trim(),
        vehicle: {
          type: form.vehicleType,
          plate: form.plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
          color: form.color.trim(),
          year: form.year.trim(),
          brand: form.brand.trim(),
          model: form.model.trim(),
        },
      });
      toast("Motoboy cadastrado com sucesso!", "success");
      reset();
      onClose();
    } catch (err: any) {
      const code = err?.code || "";
      const msg = err?.message || "Erro ao cadastrar motoboy";
      if (code.includes("already-exists") || msg.includes("CPF já") || msg.includes("E-mail já")) toast("CPF ou e-mail já cadastrado", "error");
      else toast(msg, "error");
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo Motoboy" size="lg" footer={
      <div className="flex gap-3"><Button variant="ghost" fullWidth onClick={onClose}>Cancelar</Button><Button variant="primary" fullWidth loading={loading} onClick={save}>{loading ? "Cadastrando..." : "Cadastrar Motoboy"}</Button></div>
    }>
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <FormSection title="Dados pessoais">
          <Field label="Nome completo" error={errors.fullName} className="col-span-2"><input value={form.fullName} onChange={e=>setField("fullName",e.target.value)} placeholder="João da Silva" className={fieldClass(errors.fullName)} /></Field>
          <Field label="CPF" error={errors.cpf}><input value={form.cpf} onChange={e=>setField("cpf",maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} className={fieldClass(errors.cpf)} /></Field>
          <Field label="Telefone" error={errors.phone}><input value={form.phone} onChange={e=>setField("phone",maskPhone(e.target.value))} placeholder="(16) 99999-9999" maxLength={15} className={fieldClass(errors.phone)} /></Field>
          <Field label="E-mail de login" error={errors.email} className="col-span-2"><input type="email" value={form.email} onChange={e=>setField("email",e.target.value)} placeholder="motoboy@email.com" className={fieldClass(errors.email)} /></Field>
          <Field label="Senha inicial" error={errors.password} className="col-span-2"><div className="relative"><input type={showPassword?"text":"password"} value={form.password} onChange={e=>setField("password",e.target.value)} placeholder="Mínimo 6 caracteres" className={fieldClass(errors.password)+" pr-10"}/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPassword?"Ocultar":"Mostrar"}</button></div></Field>
        </FormSection>
        <FormSection title="Endereço">
          <Field label="Rua"><input value={form.street} onChange={e=>setField("street",e.target.value)} placeholder="Rua Exemplo" className={fieldClass()} /></Field>
          <Field label="Número"><input value={form.number} onChange={e=>setField("number",e.target.value)} placeholder="123" className={fieldClass()} /></Field>
          <Field label="Bairro"><input value={form.neighborhood} onChange={e=>setField("neighborhood",e.target.value)} placeholder="Centro" className={fieldClass()} /></Field>
          <Field label="Cidade"><input value={form.city} onChange={e=>setField("city",e.target.value)} className={fieldClass()} /></Field>
        </FormSection>
        <FormSection title="CNH">
          <Field label="Categoria" error={errors.licenseCategory}><select value={form.licenseCategory} onChange={e=>setField("licenseCategory",e.target.value)} className={fieldClass(errors.licenseCategory)}><option value="A">A</option><option value="AB">AB</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option></select></Field>
          <Field label="Número da CNH" error={errors.licenseNumber}><input value={form.licenseNumber} onChange={e=>setField("licenseNumber",e.target.value)} placeholder="00000000000" className={fieldClass(errors.licenseNumber)} /></Field>
        </FormSection>
        <FormSection title="Veículo">
          <Field label="Tipo"><select value={form.vehicleType} onChange={e=>setField("vehicleType",e.target.value)} className={fieldClass()}><option value="moto">Moto</option><option value="carro">Carro</option></select></Field>
          <Field label="Placa" error={errors.plate}><input value={form.plate} onChange={e=>setField("plate",e.target.value.toUpperCase())} placeholder="ABC1D23" maxLength={7} className={fieldClass(errors.plate)} /></Field>
          <Field label="Marca" error={errors.brand}><input value={form.brand} onChange={e=>setField("brand",e.target.value)} placeholder="Honda" className={fieldClass(errors.brand)} /></Field>
          <Field label="Modelo" error={errors.model}><input value={form.model} onChange={e=>setField("model",e.target.value)} placeholder="CG 160" className={fieldClass(errors.model)} /></Field>
          <Field label="Cor" error={errors.color}><input value={form.color} onChange={e=>setField("color",e.target.value)} placeholder="Preta" className={fieldClass(errors.color)} /></Field>
          <Field label="Ano" error={errors.year}><input value={form.year} onChange={e=>setField("year",e.target.value.replace(/\\D/g,""))} placeholder="2025" maxLength={4} className={fieldClass(errors.year)} /></Field>
        </FormSection>
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">O cadastro cria automaticamente o acesso do motoboy no Firebase Authentication e o perfil operacional em <b>drivers</b>. O motoboy já fica aprovado e disponível como offline.</div>
      </div>
    </Modal>
  );
}

function FormSection({title,children}:{title:string;children:React.ReactNode}) { return <div className="border-t pt-4"><h3 className="text-sm font-bold text-slate-700 mb-3">{title}</h3><div className="grid grid-cols-2 gap-3">{children}</div></div>; }
function Field({label,error,className="",children}:{label:string;error?:string;className?:string;children:React.ReactNode}) { return <div className={className}><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}{error&&<p className="text-xs text-red-600 mt-1">{error}</p>}</div>; }
function fieldClass(error?:string){return `w-full px-4 py-2.5 bg-white text-slate-800 placeholder:text-slate-400 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${error?"border-red-400":"border-slate-300"}`;}
function maskCpf(v:string){return v.replace(/\\D/g,"").slice(0,11).replace(/(\\d{3})(\\d)/,"$1.$2").replace(/(\\d{3})(\\d)/,"$1.$2").replace(/(\\d{3})(\\d{1,2})$/,"$1-$2");}
function maskPhone(v:string){const d=v.replace(/\\D/g,"").slice(0,11); if(d.length<=10)return d.replace(/(\\d{2})(\\d{4})(\\d{0,4})/,"($1) $2-$3").replace(/-$/g,""); return d.replace(/(\\d{2})(\\d{5})(\\d{0,4})/,"($1) $2-$3").replace(/-$/g,"");}
