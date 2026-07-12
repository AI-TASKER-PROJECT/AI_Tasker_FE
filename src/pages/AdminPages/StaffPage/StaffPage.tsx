import { Plus, Save, Settings2, Users } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [createDomainIds, setCreateDomainIds] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountId: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.listStaffs().then(setStaffs);
    catalogApi
      .listDomains(true)
      .then(setDomains)
      .catch(() => setDomains([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    setDomainIds(getStaffDomainIds(editing));
  }, [editing?.staffId]);

  const beginCreate = () => {
    setForm({ accountId: "" });
    setCreateDomainIds([]);
    setError("");
    setOpen(true);
  };

  const beginEditStaff = (staff: Staff) => {
    setEditing(staff);
    setDomainIds(getStaffDomainIds(staff));
    setError("");
  };

  const create = async () => {
    if (!form.accountId.trim()) {
      setError("Vui lòng nhập Account ID.");
      return;
    }
    if (createDomainIds.length === 0) {
      setError("Vui lòng chọn ít nhất một lĩnh vực chuyên môn cho nhân viên.");
      return;
    }

    const specialization = specializationFromDomains(createDomainIds, domains);
    const staff = await adminApi.createStaff({
      accountId: Number(form.accountId),
      specialization,
      domainIds: createDomainIds,
    });
    setStaffs((items) => [...items, staff]);
    setOpen(false);
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
          actions={
            <Button onClick={beginCreate}>
              <Plus className="h-4 w-4" /> Tạo nhân viên
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staffs.map((staff) => (
          <Card key={staff.staffId} className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="font-extrabold text-ink">
                  {staff.fullName || `Staff #${staff.staffId}`}
                </p>
                <p className="text-sm text-slate-500">
                  {staff.email || `Account #${staff.accountId}`}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
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

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError("");
        }}
        title="Tạo nhân viên"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button onClick={create}>Tạo</Button>
          </>
        }
      >
        <div className="grid gap-4">
          {error && (
            <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}

          <Field label="Account ID">
            <Input
              value={form.accountId}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  accountId: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Lĩnh vực chuyên môn">
            <SpecializationSelector
              domains={domains}
              selectedIds={createDomainIds}
              onChange={setCreateDomainIds}
            />
          </Field>
        </div>
      </Modal>

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

          <Field label="Nhân viên">
            <Input
              value={editing?.email || `Account #${editing?.accountId || ""}`}
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
