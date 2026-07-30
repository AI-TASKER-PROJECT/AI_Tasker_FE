import {
  ChevronLeft,
  ChevronRight,
  Save,
  Settings2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminApi, catalogApi, type Domain } from "../../../lib/api";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
} from "../../../components/ui";
import {
  specializationFromDomains,
  SpecializationSelector,
} from "../AdminPages.shared";
import type { Staff } from "../../../types";

const STAFFS_PER_PAGE = 6;

function getStaffDomainIds(staff?: Staff | null) {
  if (!staff) return [];
  if (staff.domainIds?.length) return staff.domainIds;
  return staff.domains?.map((domain) => domain.domainId) || [];
}

function getStaffDomainNames(staff: Staff) {
  if (staff.domains?.length) {
    return staff.domains.map((domain) => domain.domainName);
  }
  return (staff.specialization || "Chưa gán lĩnh vực")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function StaffPage() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [domainIds, setDomainIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    adminApi.listStaffs().then(setStaffs);
    catalogApi
      .listDomains(true)
      .then(setDomains)
      .catch(() => setDomains([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    queueMicrotask(() => setDomainIds(getStaffDomainIds(editing)));
  }, [editing]);

  const totalPages = Math.max(1, Math.ceil(staffs.length / STAFFS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedStaffs = useMemo(
    () =>
      staffs.slice(
        (effectivePage - 1) * STAFFS_PER_PAGE,
        effectivePage * STAFFS_PER_PAGE,
      ),
    [effectivePage, staffs],
  );

  const beginEditStaff = (staff: Staff) => {
    setEditing(staff);
    setDomainIds(getStaffDomainIds(staff));
    setError("");
  };

  const saveStaff = async () => {
    if (!editing) return;
    if (domainIds.length === 0) {
      setError("Vui lòng chọn ít nhất một lĩnh vực chuyên môn cho nhân viên.");
      return;
    }

    const specialization = specializationFromDomains(domainIds, domains);
    const updated = await adminApi.updateStaff(editing.staffId, {
      specialization,
      domainIds,
    });
    setStaffs((items) =>
      items.map((item) => (item.staffId === updated.staffId ? updated : item)),
    );
    setEditing(null);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Quản lý nhân viên"
          description="Tạo hồ sơ nhân viên nội bộ và gán lĩnh vực chuyên môn để hệ thống tự phân công tranh chấp."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedStaffs.map((staff) => (
          <Card key={staff.staffId} className="flex h-full flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-extrabold text-ink">
                  {staff.fullName || "Nhân viên chưa có tên"}
                </p>
                <p className="break-words text-sm text-slate-500">
                  {staff.email || "Chưa có email"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-1 content-start flex-wrap gap-2">
              {getStaffDomainNames(staff).map((item) => (
                <Badge key={item} tone="brand">
                  {item}
                </Badge>
              ))}
              <Badge tone="amber">{staff.activeTickets || 0} ticket</Badge>
            </div>

            <Button
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => beginEditStaff(staff)}
            >
              <Settings2 className="h-4 w-4" /> Sửa lĩnh vực chuyên môn
            </Button>
          </Card>
        ))}
      </div>

      {staffs.length > STAFFS_PER_PAGE && (
        <Card className="sticky bottom-4 z-20 flex flex-col gap-3 bg-white/95 p-4 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Hiển thị {paginatedStaffs.length} trên tổng {staffs.length}{" "}
            nhân viên
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={effectivePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              title="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 min-w-9 rounded-xl px-3 text-sm font-extrabold transition ${
                    effectivePage === page
                      ? "bg-brand-600 text-white shadow-[0_8px_20px_rgba(23,103,242,.18)]"
                      : "bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  {page}
                </button>
              ),
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={effectivePage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              title="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => {
          setEditing(null);
          setError("");
        }}
        title="Sửa lĩnh vực chuyên môn"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button onClick={saveStaff}>
              <Save className="h-4 w-4" /> Lưu
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {error && (
            <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}

          <Field label="Họ tên nhân viên">
            <Input
              value={editing?.fullName || "Nhân viên chưa có tên"}
              readOnly
            />
          </Field>

          <Field label="Email">
            <Input
              value={editing?.email || "Nhân viên chưa có email"}
              readOnly
            />
          </Field>

          <Field label="Lĩnh vực chuyên môn">
            <SpecializationSelector
              domains={domains}
              selectedIds={domainIds}
              onChange={setDomainIds}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
