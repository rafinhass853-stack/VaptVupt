import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import {
  Users,
  Ban,
  XCircle,
  Bike,
  Car,
  Search,
  UserCheck,
  Plus,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Input,
  EmptyState,
  useToast,
  Modal,
} from "@vaptvupt/shared-ui";
import { maskCPF, maskPhone, maskPlate, maskYear } from "../lib/masks";
import {
  isValidCPF,
  isValidPlate,
  isValidPhone,
  isValidEmail,
} from "../lib/validators";

interface Courier {
  id: string;
  fullName: string;
  cpf: string;
  phone: string;
  email?: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
  };
  licenseCategory?: string;
  licenseNumber?: string;
  vehicle?: {
    type: string;
    plate: string;
    color: string;
    year: string;
    brand: string;
    model: string;
  };
  status: string;
  driverStatus?: string;
  blocked?: boolean;
  totalDeliveries?: number;
}

const VEHICLE_OPTIONS = [
  { key: "moto", icon: Bike, label: "Moto" },
  { key: "carro", icon: Car, label: "Carro" },
];

export default function Couriers() {
  const { toast } = useToast();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Courier | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "drivers"), (snapshot) => {
      const list: Courier[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          fullName: data.fullName || data.name || "Sem nome",
          cpf: data.cpf || "",
          phone: data.phone || "",
          email: data.email,
          address: data.address,
          licenseCategory: data.licenseCategory || data.cnhCategory,
          licenseNumber: data.licenseNumber || data.cnhNumber,
          vehicle: data.vehicle || {
            type: data.vehicleType?.toLowerCase() || "moto",
            plate: data.plate || "",
            color: data.color || "",
            year: data.vehicleYear?.toString() || "",
            brand: data.brand || "",
            model: data.model || "",
          },
          status: data.status || "active",
          driverStatus: data.driverStatus || data.status,
          blocked: !!data.blocked,
          totalDeliveries: data.totalDeliveries || 0,
        });
      });
      setCouriers(list);
    });
    return () => unsub();
  }, []);

  const filtered = couriers.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf?.includes(search) ||
      c.phone?.includes(search) ||
      c.vehicle?.plate?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && c.status === "active") ||
      (filter === "inactive" && c.status === "inactive") ||
      (filter === "blocked" && c.blocked);
    return matchesSearch && matchesFilter;
  });

  const handleBlock = async (courierId: string) => {
    if (!confirm("Bloquear este motoboy?")) return;
    try {
      await updateDoc(doc(db, "drivers", courierId), {
        blocked: true,
        driverStatus: "OFFLINE",
      });
      toast("Motoboy bloqueado!", "success");
      setSelected(null);
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  const handleUnblock = async (courierId: string) => {
    try {
      await updateDoc(doc(db, "drivers", courierId), { blocked: false });
      toast("Motoboy desbloqueado!", "success");
      setSelected(null);
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  const handleDelete = async (courierId: string) => {
    if (!confirm("Deletar este motoboy permanentemente?")) return;
    try {
      await deleteDoc(doc(db, "drivers", courierId));
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
            {couriers.length} cadastrado(s)
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowCreate(true)}
        >
          Cadastrar Motoboy
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, CPF, telefone ou placa..."
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
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="blocked">Bloqueados</option>
        </select>
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Nome
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Telefone
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Veículo / Placa
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
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
                      description="Cadastre um novo ou ajuste os filtros."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((courier) => (
                  <tr
                    key={courier.id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setSelected(courier)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            courier.blocked
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {courier.fullName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {courier.cpf || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {courier.phone || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {courier.vehicle?.type === "moto" ? (
                          <Bike size={18} className="text-slate-700" />
                        ) : (
                          <Car size={18} className="text-slate-700" />
                        )}
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {courier.vehicle?.type || "—"}
                        </span>
                        {courier.vehicle?.plate && (
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">
                            {courier.vehicle.plate}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <CourierStatusBadge courier={courier} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {courier.blocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnblock(courier.id);
                            }}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                            title="Desbloquear"
                          >
                            <UserCheck size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlock(courier.id);
                            }}
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg"
                            title="Bloquear"
                          >
                            <Ban size={18} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(courier.id);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Excluir"
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

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Detalhes: ${selected.fullName}` : ""}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="CPF" value={selected.cpf || "—"} />
              <InfoField label="Telefone" value={selected.phone || "—"} />
              <InfoField label="E-mail" value={selected.email || "—"} />
              <InfoField
                label="Categoria CNH"
                value={selected.licenseCategory || "—"}
              />
              <InfoField
                label="Número CNH"
                value={selected.licenseNumber || "—"}
              />
              <InfoField
                label="Tipo Veículo"
                value={selected.vehicle?.type || "—"}
              />
              <InfoField label="Placa" value={selected.vehicle?.plate || "—"} />
              <InfoField
                label="Marca/Modelo"
                value={`${selected.vehicle?.brand || ""} ${
                  selected.vehicle?.model || ""
                }`.trim() || "—"}
              />
              <InfoField label="Cor" value={selected.vehicle?.color || "—"} />
              <InfoField label="Ano" value={selected.vehicle?.year || "—"} />
              <InfoField
                label="Entregas"
                value={String(selected.totalDeliveries || 0)}
              />
              <InfoField
                label="Status"
                value={selected.status === "active" ? "Ativo" : "Inativo"}
              />
            </div>

            {selected.address && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Endereço</p>
                <p className="text-sm text-slate-700">
                  {selected.address.street}, {selected.address.number} —{" "}
                  {selected.address.neighborhood}, {selected.address.city}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {selected.blocked ? (
                <Button
                  variant="success"
                  fullWidth
                  onClick={() => handleUnblock(selected.id)}
                >
                  Desbloquear
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => handleBlock(selected.id)}
                >
                  Bloquear
                </Button>
              )}
              <Button
                variant="danger"
                fullWidth
                onClick={() => handleDelete(selected.id)}
              >
                Deletar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <CreateCourierModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
    </div>
  );
}

function CourierStatusBadge({ courier }: { courier: Courier }) {
  if (courier.blocked) return <Badge variant="danger">Bloqueado</Badge>;
  if (courier.status === "inactive")
    return <Badge variant="default">Inativo</Badge>;
  return <Badge variant="success">Ativo</Badge>;
}

// ============================================
// MODAL DE CADASTRO DE COURIER
// ============================================

function CreateCourierModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    cpf: "",
    phone: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    licenseCategory: "A",
    licenseNumber: "",
    vehicleType: "moto",
    plate: "",
    color: "",
    year: "",
    brand: "",
    model: "",
  });

  const setField = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = "E-mail obrigatório";
    else if (!isValidEmail(form.email)) e.email = "E-mail inválido";
    if (!form.password || form.password.length < 6)
      e.password = "Senha deve ter ao menos 6 caracteres";
    if (!form.fullName) e.fullName = "Nome obrigatório";
    if (!form.cpf) e.cpf = "CPF obrigatório";
    else if (!isValidCPF(form.cpf)) e.cpf = "CPF inválido";
    if (!form.phone) e.phone = "Telefone obrigatório";
    else if (!isValidPhone(form.phone)) e.phone = "Telefone inválido";
    if (!form.street) e.street = "Rua obrigatória";
    if (!form.number) e.number = "Número obrigatório";
    if (!form.neighborhood) e.neighborhood = "Bairro obrigatório";
    if (!form.city) e.city = "Cidade obrigatória";
    if (!form.licenseNumber) e.licenseNumber = "Número da CNH obrigatório";
    if (!form.plate) e.plate = "Placa obrigatória";
    else if (!isValidPlate(form.plate)) e.plate = "Placa inválida";
    if (!form.brand) e.brand = "Marca obrigatória";
    if (!form.model) e.model = "Modelo obrigatório";
    if (!form.color) e.color = "Cor obrigatória";
    if (!form.year) e.year = "Ano obrigatório";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({
      email: "",
      password: "",
      fullName: "",
      cpf: "",
      phone: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      licenseCategory: "A",
      licenseNumber: "",
      vehicleType: "moto",
      plate: "",
      color: "",
      year: "",
      brand: "",
      model: "",
    });
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast("Verifique os campos destacados", "error");
      return;
    }

    setLoading(true);
    try {
      const createFn = httpsCallable(functions, "createCourier");
      await createFn({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        cpf: form.cpf,
        phone: form.phone,
        address: {
          street: form.street,
          number: form.number,
          neighborhood: form.neighborhood,
          city: form.city,
        },
        licenseCategory: form.licenseCategory,
        licenseNumber: form.licenseNumber,
        vehicle: {
          type: form.vehicleType,
          plate: form.plate,
          color: form.color,
          year: form.year,
          brand: form.brand,
          model: form.model,
        },
      });

      toast("Motoboy cadastrado com sucesso!", "success");
      resetForm();
      onClose();
    } catch (err: any) {
      const msg = err.message || "Erro ao cadastrar";
      if (msg.includes("já cadastrado")) {
        toast("E-mail ou CPF já cadastrado", "error");
      } else {
        toast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cadastrar Motoboy"
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            fullWidth
            loading={loading}
            onClick={handleSubmit}
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Acesso */}
        <Section title="Acesso">
          <div className="col-span-2">
            <FormField label="E-mail" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="motoboy@exemplo.com"
                className={inputClass(errors.email)}
              />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Senha" error={errors.password}>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </FormField>
          </div>
        </Section>

        {/* Dados Pessoais */}
        <Section title="Informações Pessoais">
          <div className="col-span-2">
            <FormField label="Nome Completo" error={errors.fullName}>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder="João da Silva"
                className={inputClass(errors.fullName)}
              />
            </FormField>
          </div>
          <FormField label="CPF" error={errors.cpf}>
            <input
              type="text"
              value={form.cpf}
              onChange={(e) => setField("cpf", maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              className={inputClass(errors.cpf)}
            />
          </FormField>
          <FormField label="Telefone" error={errors.phone}>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setField("phone", maskPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              maxLength={15}
              className={inputClass(errors.phone)}
            />
          </FormField>
        </Section>

        {/* Endereço */}
        <Section title="Endereço">
          <div className="col-span-2">
            <FormField label="Rua" error={errors.street}>
              <input
                type="text"
                value={form.street}
                onChange={(e) => setField("street", e.target.value)}
                placeholder="Av. Paulista"
                className={inputClass(errors.street)}
              />
            </FormField>
          </div>
          <FormField label="Número" error={errors.number}>
            <input
              type="text"
              value={form.number}
              onChange={(e) => setField("number", e.target.value)}
              placeholder="1000"
              className={inputClass(errors.number)}
            />
          </FormField>
          <FormField label="Bairro" error={errors.neighborhood}>
            <input
              type="text"
              value={form.neighborhood}
              onChange={(e) => setField("neighborhood", e.target.value)}
              placeholder="Centro"
              className={inputClass(errors.neighborhood)}
            />
          </FormField>
          <div className="col-span-2">
            <FormField label="Cidade" error={errors.city}>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="São Paulo"
                className={inputClass(errors.city)}
              />
            </FormField>
          </div>
        </Section>

        {/* Habilitação */}
        <Section title="Habilitação">
          <FormField label="Categoria CNH">
            <select
              value={form.licenseCategory}
              onChange={(e) => setField("licenseCategory", e.target.value)}
              className={inputClass()}
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="AC">AC</option>
              <option value="AD">AD</option>
              <option value="AE">AE</option>
            </select>
          </FormField>
          <FormField label="Número da CNH" error={errors.licenseNumber}>
            <input
              type="text"
              value={form.licenseNumber}
              onChange={(e) =>
                setField(
                  "licenseNumber",
                  e.target.value.replace(/\D/g, "").slice(0, 11)
                )
              }
              placeholder="00000000000"
              maxLength={11}
              className={inputClass(errors.licenseNumber)}
            />
          </FormField>
        </Section>

        {/* Veículo */}
        <Section title="Veículo">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Veículo
            </label>
            <div className="grid grid-cols-2 gap-3">
              {VEHICLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = form.vehicleType === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setField("vehicleType", opt.key)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={26} />
                    <span className="text-sm font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <FormField label="Placa" error={errors.plate}>
            <input
              type="text"
              value={form.plate}
              onChange={(e) => setField("plate", maskPlate(e.target.value))}
              placeholder="ABC1D23"
              maxLength={7}
              className={`${inputClass(errors.plate)} font-mono uppercase`}
            />
          </FormField>
          <FormField label="Ano" error={errors.year}>
            <input
              type="text"
              value={form.year}
              onChange={(e) => setField("year", maskYear(e.target.value))}
              placeholder="2020"
              maxLength={4}
              className={inputClass(errors.year)}
            />
          </FormField>
          <FormField label="Marca" error={errors.brand}>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => setField("brand", e.target.value)}
              placeholder="Honda"
              className={inputClass(errors.brand)}
            />
          </FormField>
          <FormField label="Modelo" error={errors.model}>
            <input
              type="text"
              value={form.model}
              onChange={(e) => setField("model", e.target.value)}
              placeholder="CG 160"
              className={inputClass(errors.model)}
            />
          </FormField>
          <div className="col-span-2">
            <FormField label="Cor" error={errors.color}>
              <input
                type="text"
                value={form.color}
                onChange={(e) => setField("color", e.target.value)}
                placeholder="Vermelha"
                className={inputClass(errors.color)}
              />
            </FormField>
          </div>
        </Section>
      </div>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-bold text-slate-700 mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
    error ? "border-red-400" : "border-slate-300"
  }`;
}