import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi, catalogApi, type Domain } from "../../../lib/api";
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
import {
  accountStatuses,
  externalRoles,
  internalRoles,
  selectedDomainIdsFromSpecialization,
  specializationFromDomains,
  SpecializationSelector,
} from "../AdminPages.shared";
import type { AccountStatus, AdminAccount, Role } from "../../../types";

export function AccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [accountTab, setAccountTab] = useState<"internal" | "external">(
    "internal",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageNotice, setPageNotice] = useState<{
    tone: "success" | "danger";
    title: string;
  } | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    phone: "",
    fullName: "",
    role: "STAFF" as Role,
    status: "Approved" as AccountStatus,
    domainIds: [] as number[],
  });

  const load = async () => setAccounts(await adminApi.listAccounts());

  useEffect(() => {
    void Promise.resolve().then(() => load());
    catalogApi
      .listDomains(true)
      .then(setDomains)
      .catch(() => setDomains([]));
  }, []);

  const visibleAccounts = accounts.filter((account) =>
    accountTab === "internal"
      ? internalRoles.includes(account.role)
      : externalRoles.includes(account.role),
  );

  const beginCreate = () => {
    setEditing(null);
    setErrors({});
    const role: Role = accountTab === "internal" ? "STAFF" : "BUSINESS";
    setForm({
      email: "",
      password: "",
      phone: "",
      fullName: "",
      role,
      status: role === "STAFF" ? "Approved" : "Pending",
      domainIds: [],
    });
    setOpen(true);
  };

  const beginEdit = (account: AdminAccount) => {
    setEditing(account);
    setErrors({});
    setForm({
      email: account.email,
      password: "",
      phone: account.phone || "",
      fullName: account.fullName,
      role: account.role,
      status: account.status,
      domainIds: selectedDomainIdsFromSpecialization(
        account.specialization,
        domains,
      ),
    });
    setOpen(true);
  };

  const saveAccount = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.email.trim()) newErrors.email = "Vui lòng không bỏ trống email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Email không hợp lệ.";

    if (!form.password)
      newErrors.password = "Vui lòng không bỏ trống mật khẩu.";
    else if (form.password.length < 8)
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự.";

    if (!form.fullName.trim())
      newErrors.fullName = "Vui lòng không bỏ trống họ tên.";

    if (!form.phone.trim())
      newErrors.phone = "Vui lòng không bỏ trống số điện thoại.";
    else if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(form.phone.trim()))
      newErrors.phone = "Số điện thoại không hợp lệ.";

    if (form.role === "STAFF" && form.domainIds.length === 0) {
      newErrors.domainIds = "Vui lòng chọn ít nhất một lĩnh vực chuyên môn.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const payload = {
      email: form.email.trim(),
      password: form.password || undefined,
      phone: form.phone.trim(),
      fullName: form.fullName.trim(),
      role: form.role,
      status: form.status,
      specialization:
        form.role === "STAFF"
          ? specializationFromDomains(form.domainIds, domains)
          : undefined,
    };

    try {
      const saved = editing
        ? await adminApi.updateAccount(editing.accountId, payload)
        : await adminApi.createAccount(payload);
      if (!editing && saved.role === "STAFF") {
        await adminApi.createStaff({
          accountId: saved.accountId,
          specialization: payload.specialization,
          domainIds: form.domainIds,
        });
      }
      setAccounts((items) =>
        editing
          ? items.map((item) =>
              item.accountId === saved.accountId ? saved : item,
            )
          : [...items, saved],
      );
      setOpen(false);
      setPageNotice({
        tone: "success",
        title: editing
          ? "Cập nhật tài khoản thành công"
          : "Tạo tài khoản thành công",
      });
      setTimeout(() => setPageNotice(null), 3000);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || error?.message || "Đã xảy ra lỗi";
      if (
        msg.toLowerCase().includes("email") ||
        msg.toLowerCase().includes("exist") ||
        msg.toLowerCase().includes("trùng")
      ) {
        setErrors({ email: "Email này đã tồn tại trong hệ thống." });
      } else {
        setErrors({ general: msg });
      }
    }
  };

  const changeStatus = async (account: AdminAccount, status: AccountStatus) => {
    const updated = await adminApi.setAccountStatus(account.accountId, status);
    setAccounts((items) =>
      items.map((item) =>
        item.accountId === updated.accountId ? updated : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      {pageNotice && <Notice tone={pageNotice.tone} title={pageNotice.title} />}
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Quản lý tài khoản"
          description="Tạo, chỉnh sửa và quản lý tài khoản người dùng trong hệ thống."
          actions={
            <Button onClick={beginCreate}>
              <Plus className="h-4 w-4" /> Tạo tài khoản mới
            </Button>
          }
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-white px-5 py-4">
          <Button
            variant={accountTab === "internal" ? "primary" : "secondary"}
            onClick={() => setAccountTab("internal")}
          >
            Nội bộ
          </Button>
          <Button
            variant={accountTab === "external" ? "primary" : "secondary"}
            onClick={() => setAccountTab("external")}
          >
            Bên ngoài
          </Button>
        </div>
        <div className="hidden border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[1fr_150px_130px_180px]">
          <span>Account</span>
          <span>Role</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {visibleAccounts.map((account) => (
          <div
            key={account.accountId}
            className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[1fr_150px_130px_180px] md:items-center"
          >
            <div>
              <p className="font-extrabold text-ink">{account.fullName}</p>
              <p className="text-slate-500">{account.email}</p>
            </div>
            <Badge
              tone={
                account.role === "ADMIN"
                  ? "rose"
                  : account.role === "STAFF"
                    ? "amber"
                    : "brand"
              }
            >
              {account.role}
            </Badge>
            <Badge
              tone={
                account.status === "Approved"
                  ? "mint"
                  : account.status === "Rejected"
                    ? "rose"
                    : account.status === "Lock"
                      ? "slate"
                      : "amber"
              }
            >
              {account.status}
            </Badge>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => beginEdit(account)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  changeStatus(
                    account,
                    account.status === "Lock" ? "Approved" : "Lock",
                  )
                }
              >
                {account.status === "Lock" ? "Unlock" : "Lock"}
              </Button>
            </div>
          </div>
        ))}
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit account" : "Create account"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAccount}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {errors.general && (
            <div className="md:col-span-2">
              <Notice tone="danger" title={errors.general} />
            </div>
          )}
          <Field label="Email" error={errors.email}>
            <Input
              value={form.email}
              onChange={(event) =>
                setForm((value) => ({ ...value, email: event.target.value }))
              }
            />
          </Field>
          <Field
            label={editing ? "New password" : "Password"}
            error={errors.password}
          >
            <Input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((value) => ({ ...value, password: event.target.value }))
              }
            />
          </Field>
          <Field label="Full name" error={errors.fullName}>
            <Input
              value={form.fullName}
              onChange={(event) =>
                setForm((value) => ({ ...value, fullName: event.target.value }))
              }
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input
              value={form.phone}
              onChange={(event) =>
                setForm((value) => ({ ...value, phone: event.target.value }))
              }
            />
          </Field>
          <Field label="Role">
            <select
              value={form.role}
              onChange={(event) => {
                const role = event.target.value as Role;
                setForm((value) => ({
                  ...value,
                  role,
                  status:
                    role === "STAFF" || role === "ADMIN"
                      ? "Approved"
                      : value.status,
                }));
              }}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"
            >
              {(accountTab === "internal" ? internalRoles : externalRoles).map(
                (role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  status: event.target.value as AccountStatus,
                }))
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"
            >
              {accountStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          {form.role === "STAFF" && (
            <div className="md:col-span-2">
              <Field label="Staff specialization" error={errors.domainIds}>
                <SpecializationSelector
                  domains={domains}
                  selectedIds={form.domainIds}
                  onChange={(ids) =>
                    setForm((value) => ({ ...value, domainIds: ids }))
                  }
                />
              </Field>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
