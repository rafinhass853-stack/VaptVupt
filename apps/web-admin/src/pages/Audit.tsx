import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Search, Shield, Clock } from "lucide-react";
import { Card, Input, Badge, EmptyState } from "@vaptvupt/shared-ui";

interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorType: string;
  targetId?: string;
  targetType?: string;
  details?: any;
  at: any;
}

export default function Audit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "audit"),
      orderBy("at", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: AuditEntry[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          action: data.action,
          actorId: data.actorId,
          actorType: data.actorType,
          targetId: data.targetId,
          targetType: data.targetType,
          details: data.details,
          at: data.at,
        });
      });
      setEntries(list);
    });
    return () => unsub();
  }, []);

  const filtered = entries.filter(
    (e) =>
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.actorId?.toLowerCase().includes(search.toLowerCase()) ||
      e.targetId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <Shield size={28} className="text-blue-600" />
          Auditoria
        </h1>
        <p className="text-slate-500 mt-1">
          Histórico completo de ações administrativas
        </p>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Buscar por ação, ator ou alvo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={16} />}
        />
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Shield size={32} />}
            title="Nenhum registro de auditoria"
            description="As ações administrativas aparecerão aqui."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((entry) => {
              const date = entry.at?.toDate?.();
              return (
                <div
                  key={entry.id}
                  className="px-6 py-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={actionVariant(entry.action)} size="sm">
                      {entry.action}
                    </Badge>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} />
                      {date
                        ? date.toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500">Ator</p>
                      <p className="font-medium text-slate-700 truncate">
                        {entry.actorType}: {entry.actorId?.slice(0, 12)}...
                      </p>
                    </div>
                    {entry.targetId && (
                      <div>
                        <p className="text-slate-500">Alvo</p>
                        <p className="font-medium text-slate-700 truncate">
                          {entry.targetType}: {entry.targetId?.slice(0, 12)}...
                        </p>
                      </div>
                    )}
                    {entry.details && (
                      <div>
                        <p className="text-slate-500">Detalhes</p>
                        <p className="font-medium text-slate-700 truncate">
                          {JSON.stringify(entry.details).slice(0, 60)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function actionVariant(
  action: string
): "default" | "success" | "warning" | "danger" | "info" {
  const map: Record<string, any> = {
    ORDER_CREATED: "info",
    ORDER_ACCEPTED: "info",
    ORDER_DELIVERED: "success",
    SET_USER_ROLE: "warning",
    PIX_CONFIRMED: "success",
  };
  return map[action] || "default";
}