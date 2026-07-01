import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../lib/api";
import {
  Badge,
  Button,
  Card,
  Notice,
  PageHeader,
} from "../../../components/ui";
import { formatAuditTimestamp } from "../AdminPages.shared";
import type { AuditLog } from "../../../types";

export function AuditLogsPage() {
  const [tab, setTab] =
    useState<NonNullable<AuditLog["actorGroup"]>>("EXTERNAL");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (actorGroup = tab) => {
      setLoading(true);
      setError("");
      try {
        setLogs(await adminApi.auditLogs(actorGroup));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Không tải được audit log.",
        );
      } finally {
        setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void load(tab);
    });
  }, [load, tab]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Nhật ký audit"
          description="Admin theo dõi các thao tác quan trọng của tài khoản nội bộ và tài khoản bên ngoài."
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-white px-5 py-4">
          <Button
            variant={tab === "INTERNAL" ? "primary" : "secondary"}
            onClick={() => setTab("INTERNAL")}
          >
            Nội bộ
          </Button>
          <Button
            variant={tab === "EXTERNAL" ? "primary" : "secondary"}
            onClick={() => setTab("EXTERNAL")}
          >
            Bên ngoài
          </Button>
          <Button variant="ghost" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
        <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[150px_1.1fr_1.2fr_1fr]">
          <span>Thời gian</span>
          <span>Hành động</span>
          <span>Đối tượng</span>
          <span>Người thực hiện</span>
        </div>
        {error && (
          <div className="px-5 py-4">
            <Notice tone="danger" title="Không tải được audit log">
              {error}
            </Notice>
          </div>
        )}
        {loading && (
          <div className="px-5 py-6 text-sm font-bold text-slate-500">
            Đang tải audit log...
          </div>
        )}
        {!loading && !error && logs.length === 0 && (
          <div className="px-5 py-8 text-sm font-bold text-slate-500">
            Chưa có audit log cho nhóm này.
          </div>
        )}
        {!loading &&
          !error &&
          logs.map((log) => {
            const timestamp = formatAuditTimestamp(log.createdAt);
            return (
              <div
                key={log.logId}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[150px_1.1fr_1.2fr_1fr] md:items-center"
              >
                <div className="space-y-1">
                  <p className="font-bold text-slate-600">{timestamp.date}</p>
                  <p className="text-xs font-semibold text-slate-400">
                    {timestamp.time}
                  </p>
                </div>
                <span className="font-extrabold text-ink">{log.action}</span>
                <div className="space-y-1">
                  <p className="font-extrabold text-ink">
                    {log.entityDisplayName ||
                      `${log.entityName} ${log.entityId ? `#${log.entityId}` : ""}`}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {log.entityName} {log.entityId ? `#${log.entityId}` : ""}
                  </p>
                  <div className="space-y-1 pt-1">
                    <p className="font-bold text-slate-700">
                      {log.entityOwner || "Chưa xác dịnh tài khoản"}
                    </p>
                    <p className="break-all text-xs text-slate-500">
                      {log.entityOwnerEmail || "Không có email"}
                    </p>
                    {log.entityOwnerRole ? (
                      <Badge
                        tone={
                          log.entityOwnerRole === "ADMIN"
                            ? "rose"
                            : log.entityOwnerRole === "STAFF"
                              ? "amber"
                              : "brand"
                        }
                      >
                        {log.entityOwnerRole}
                      </Badge>
                    ) : (
                      <Badge tone="slate">Không có role</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-ink">{log.actor}</p>
                  <p className="break-all text-xs text-slate-500">
                    {log.actorEmail || "Không có email"}
                  </p>
                  {log.actorRole && (
                    <Badge
                      tone={
                        log.actorRole === "ADMIN"
                          ? "rose"
                          : log.actorRole === "STAFF"
                            ? "amber"
                            : "brand"
                      }
                    >
                      {log.actorRole}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
      </Card>
    </div>
  );
}
