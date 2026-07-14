import { BadgeCheck, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
} from "../../../components/ui";
import { adminApi } from "../../../lib/api";
import { formatCurrency } from "../../../lib/utils";
import type { MembershipPackage, MembershipPackageRequest } from "../../../types";

type RoleFilter = "ALL" | "BUSINESS" | "EXPERT";

const blankForm: MembershipPackageRequest = {
  roleType: "BUSINESS",
  packageCode: "",
  packageName: "",
  price: 0,
  badgeDurationDays: 30,
  jobPostQuota: 0,
  proposalQuota: 0,
  recommendVisibility: false,
  isActive: true,
};

function roleLabel(role?: string) {
  if (role === "BUSINESS") return "Doanh nghiệp";
  if (role === "EXPERT") return "Chuyên gia";
  return "Không xác định";
}

export function MembershipPackagesPage() {
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MembershipPackage | null>(null);
  const [form, setForm] = useState<MembershipPackageRequest>(blankForm);

  const loadPackages = async () => {
    setLoading(true);
    setError("");
    try {
      setPackages(await adminApi.listMembershipPackages(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách gói thành viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadPackages);
  }, []);

  const filteredPackages = useMemo(() => {
    return packages
      .filter((item) => roleFilter === "ALL" || item.roleType === roleFilter)
      .sort((left, right) => {
        const roleDelta = left.roleType.localeCompare(right.roleType);
        if (roleDelta !== 0) return roleDelta;
        return left.price - right.price;
      });
  }, [packages, roleFilter]);

  const beginCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setModalOpen(true);
  };

  const beginEdit = (pkg: MembershipPackage) => {
    setEditing(pkg);
    setForm({
      roleType: pkg.roleType,
      packageCode: pkg.packageCode,
      packageName: pkg.packageName,
      price: pkg.price,
      badgeDurationDays: pkg.badgeDurationDays,
      jobPostQuota: pkg.jobPostQuota,
      proposalQuota: pkg.proposalQuota,
      recommendVisibility: pkg.recommendVisibility,
      isActive: pkg.isActive ?? true,
    });
    setModalOpen(true);
  };

  const replacePackage = (saved: MembershipPackage) => {
    setPackages((current) =>
      current.some((item) => item.packageId === saved.packageId)
        ? current.map((item) => (item.packageId === saved.packageId ? saved : item))
        : [...current, saved],
    );
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        packageCode: form.packageCode?.trim(),
        packageName: form.packageName?.trim(),
        price: Number(form.price) || 0,
        badgeDurationDays: Number(form.badgeDurationDays) || 0,
        jobPostQuota: Number(form.jobPostQuota) || 0,
        proposalQuota: Number(form.proposalQuota) || 0,
      };
      const saved = editing
        ? await adminApi.updateMembershipPackage(editing.packageId, payload)
        : await adminApi.createMembershipPackage(payload);
      replacePackage(saved);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được gói thành viên.");
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async (pkg: MembershipPackage) => {
    setError("");
    try {
      replacePackage(await adminApi.deleteMembershipPackage(pkg.packageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa mềm được gói thành viên.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_55%,#f7fbf5_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Gói thành viên"
          description="Quản lý gói dành cho doanh nghiệp và chuyên gia. Màn hình chỉ hiển thị thông tin cấu hình gói, không hiển thị ID nội bộ."
          actions={
            <Button onClick={beginCreate}>
              <Plus className="h-4 w-4" /> Tạo gói
            </Button>
          }
        />
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        {(["ALL", "BUSINESS", "EXPERT"] as RoleFilter[]).map((role) => (
          <Button
            key={role}
            variant={roleFilter === role ? "primary" : "secondary"}
            onClick={() => setRoleFilter(role)}
          >
            {role === "ALL" ? "Tất cả" : roleLabel(role)}
          </Button>
        ))}
      </Card>

      {error && <Notice tone="danger" title="Có lỗi xảy ra">{error}</Notice>}

      {loading ? (
        <Card className="p-8 text-center text-sm font-semibold text-slate-500">Đang tải danh sách gói...</Card>
      ) : filteredPackages.length === 0 ? (
        <Card className="p-8 text-center text-sm font-semibold text-slate-500">Chưa có gói phù hợp bộ lọc.</Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filteredPackages.map((pkg) => (
            <Card key={pkg.packageCode} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={pkg.roleType === "BUSINESS" ? "brand" : "violet"}>{roleLabel(pkg.roleType)}</Badge>
                    <Badge tone={pkg.isActive ?? true ? "mint" : "rose"}>{pkg.isActive ?? true ? "Đang mở" : "Đang đóng"}</Badge>
                  </div>
                  <h2 className="mt-3 break-words font-display text-xl font-black text-ink">{pkg.packageName}</h2>
                  <p className="mt-1 break-all font-mono text-xs font-bold text-slate-400">{pkg.packageCode}</p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <BadgeCheck className="h-5 w-5" />
                </span>
              </div>

              <p className="mt-5 font-display text-2xl font-black text-ink">{formatCurrency(pkg.price)}</p>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-3">Badge xác minh: {pkg.badgeDurationDays} ngày</div>
                <div className="rounded-2xl bg-slate-50 p-3">Credit đăng dự án: {pkg.jobPostQuota}</div>
                <div className="rounded-2xl bg-slate-50 p-3">Credit nộp đề xuất: {pkg.proposalQuota}</div>
                {pkg.recommendVisibility && (
                  <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 font-bold text-amber-700">
                    <Sparkles className="h-4 w-4" /> Ưu tiên gợi ý AI
                  </div>
                )}
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Button variant="secondary" onClick={() => beginEdit(pkg)}>Sửa</Button>
                <Button variant="danger" size="icon" title="Xóa mềm" onClick={() => softDelete(pkg)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Cập nhật gói thành viên" : "Tạo gói thành viên"}
        description={editing ? "Mã gói không thể thay đổi sau khi tạo." : "Thông tin này sẽ ảnh hưởng trực tiếp đến màn mua gói của người dùng."}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={save} loading={saving}>
              <Save className="h-4 w-4" /> Lưu
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Vai trò">
            <select
              value={form.roleType || "BUSINESS"}
              onChange={(event) => setForm((value) => ({ ...value, roleType: event.target.value as "BUSINESS" | "EXPERT" }))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            >
              <option value="BUSINESS">Doanh nghiệp</option>
              <option value="EXPERT">Chuyên gia</option>
            </select>
          </Field>
          <Field label="Mã gói">
            <Input
              value={form.packageCode || ""}
              disabled={Boolean(editing)}
              onChange={(event) => setForm((value) => ({ ...value, packageCode: event.target.value }))}
            />
          </Field>
          <Field label="Tên gói" className="md:col-span-2">
            <Input value={form.packageName || ""} onChange={(event) => setForm((value) => ({ ...value, packageName: event.target.value }))} />
          </Field>
          <Field label="Giá">
            <Input type="number" min={0} value={form.price ?? 0} onChange={(event) => setForm((value) => ({ ...value, price: Number(event.target.value) }))} />
          </Field>
          <Field label="Thời hạn badge">
            <Input type="number" min={0} value={form.badgeDurationDays ?? 0} onChange={(event) => setForm((value) => ({ ...value, badgeDurationDays: Number(event.target.value) }))} />
          </Field>
          <Field label="Credit đăng dự án">
            <Input type="number" min={0} value={form.jobPostQuota ?? 0} onChange={(event) => setForm((value) => ({ ...value, jobPostQuota: Number(event.target.value) }))} />
          </Field>
          <Field label="Credit nộp đề xuất">
            <Input type="number" min={0} value={form.proposalQuota ?? 0} onChange={(event) => setForm((value) => ({ ...value, proposalQuota: Number(event.target.value) }))} />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.recommendVisibility)}
              onChange={(event) => setForm((value) => ({ ...value, recommendVisibility: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Ưu tiên hiển thị trong gợi ý AI
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Mở bán gói này cho người dùng
          </label>
        </div>
      </Modal>
    </div>
  );
}
