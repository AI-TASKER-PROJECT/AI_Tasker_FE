import {
  Plus,
  Save,
  Settings2,
  Users,
} from "lucide-react";
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
  selectedDomainIdsFromSpecialization,
  specializationFromDomains,
  SpecializationSelector,
} from "../AdminPages.shared";
import type { Staff } from "../../../types";

export function StaffPage() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [domainIds, setDomainIds] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountId: "", specialization: "NLP" });

  useEffect(() => {
    adminApi.listStaffs().then(setStaffs);
    catalogApi
      .listDomains(true)
      .then(setDomains)
      .catch(() => setDomains([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    setTimeout(() => {
      setDomainIds(
        selectedDomainIdsFromSpecialization(editing.specialization, domains),
      );
    }, 0);
  }, [domains, editing, editing?.staffId]);

  const beginEditStaff = (staff: Staff) => {
    setEditing(staff);
    setDomainIds(
      selectedDomainIdsFromSpecialization(staff.specialization, domains),
    );
  };

  const saveStaff = async () => {
    if (!editing) return;
    const specialization =
      domainIds.length > 0
        ? specializationFromDomains(domainIds, domains)
        : editing.specialization || "General";
    const updated = await adminApi.updateStaff(editing.staffId, {
      specialization,
    });
    setStaffs((items) =>
      items.map((item) => (item.staffId === updated.staffId ? updated : item)),
    );
    setEditing(null);
  };

  const create = async () => {
    const staff = await adminApi.createStaff({
      accountId: Number(form.accountId),
      specialization: form.specialization,
    });
    setStaffs((items) => [...items, staff]);
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Quản lý Staff"
          description="Admin tạo hồ sơ staff nội bộ và khai báo specialization để auto-routing dispute."
          actions={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Tạo staff
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
              {(staff.specialization || "General").split(",").map((item) => (
                <Badge key={item.trim()} tone="brand">
                  {item.trim()}
                </Badge>
              ))}
              <Badge tone="amber">{staff.activeTickets || 0} ticket</Badge>
            </div>
            <Button
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => beginEditStaff(staff)}
            >
              <Settings2 className="h-4 w-4" /> Edit specialization
            </Button>
          </Card>
        ))}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo staff"
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
          <Field label="Specialization">
            <Input
              value={form.specialization}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  specialization: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit staff specialization"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveStaff}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Staff">
            <Input
              value={editing?.email || `Account #${editing?.accountId || ""}`}
              readOnly
            />
          </Field>
          <Field label="Specialization">
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
