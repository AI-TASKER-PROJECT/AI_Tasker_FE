import { Plus, Save, Settings2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import type { SystemSetting, SystemSettingRequest } from "../../../types";

const settingLabels: Record<string, { label: string; description: string }> = {
  platform_fee_percent: {
    label: "Phí nền tảng",
    description: "Tỷ lệ phí nền tảng áp dụng cho giao dịch escrow thành công.",
  },
  default_sla_days: {
    label: "Số ngày SLA mặc định",
    description: "Số ngày trước khi hệ thống xử lý milestone quá hạn.",
  },
  auto_assign_staff_enabled: {
    label: "Tự động phân công staff",
    description: "Tự động phân công staff khi phát sinh công việc cần xử lý.",
  },
  max_open_jobs_per_business: {
    label: "Số dự án mở tối đa",
    description: "Số dự án được mở đồng thời trên mỗi doanh nghiệp.",
  },
  "credit.job_post.price_vnd": {
    label: "Giá credit đăng dự án",
    description: "Số tiền cho mỗi credit đăng dự án, tính bằng VND.",
  },
  "credit.proposal.price_vnd": {
    label: "Giá credit nộp đề xuất",
    description: "Số tiền cho mỗi credit nộp đề xuất, tính bằng VND.",
  },
};

const blankForm: SystemSettingRequest = {
  settingKey: "",
  settingValue: "",
  valueType: "STRING",
  description: "",
  isActive: true,
};

function settingMeta(setting: SystemSetting) {
  return settingLabels[setting.settingKey] || {
    label: setting.settingKey,
    description: setting.description || "Cấu hình hệ thống.",
  };
}

function maskSensitiveSetting(setting: SystemSetting) {
  const key = setting.settingKey.toLowerCase();
  if (key.includes("secret") || key.includes("token") || key.includes("password") || key.includes("key")) {
    return "Đã ẩn";
  }
  return setting.settingValue;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editing, setEditing] = useState<SystemSetting | null>(null);
  const [form, setForm] = useState<SystemSettingRequest>(blankForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      setSettings(await adminApi.listSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được cấu hình hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadSettings);
  }, []);

  const beginCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setModalOpen(true);
  };

  const beginEdit = (setting: SystemSetting) => {
    setEditing(setting);
    setForm({
      settingKey: setting.settingKey,
      settingValue: setting.settingValue,
      valueType: setting.valueType,
      description: setting.description || "",
      isActive: setting.isActive,
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        settingKey: form.settingKey?.trim(),
        settingValue: form.settingValue?.trim(),
        valueType: form.valueType?.trim().toUpperCase(),
        description: form.description?.trim(),
      };
      const saved = editing
        ? await adminApi.updateSettingBody(editing.settingKey, payload)
        : await adminApi.createSetting(payload);
      setSettings((items) =>
        editing
          ? items.map((item) => (item.settingKey === saved.settingKey ? saved : item))
          : [...items, saved].sort((left, right) => left.settingKey.localeCompare(right.settingKey)),
      );
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (setting: SystemSetting) => {
    setError("");
    try {
      const updated = await adminApi.updateSettingBody(setting.settingKey, {
        settingValue: setting.settingValue,
        valueType: setting.valueType,
        description: setting.description,
        isActive: !setting.isActive,
      });
      setSettings((items) =>
        items.map((item) => (item.settingKey === updated.settingKey ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được trạng thái.");
    }
  };

  const remove = async (setting: SystemSetting) => {
    setError("");
    try {
      const updated = await adminApi.deleteSetting(setting.settingKey);
      setSettings((items) =>
        items.map((item) => (item.settingKey === updated.settingKey ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được cấu hình.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_55%,#f7fbf5_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Cấu hình hệ thống"
          description="Quản lý SLA, phí nền tảng và các tham số vận hành bằng API thay vì phụ thuộc migration."
          actions={
            <Button onClick={beginCreate}>
              <Plus className="h-4 w-4" /> Tạo cấu hình
            </Button>
          }
        />
      </div>

      {error && <Notice tone="danger" title="Có lỗi xảy ra">{error}</Notice>}

      <div className="grid gap-4">
        {loading && <Card className="p-8 text-center text-sm font-semibold text-slate-500">Đang tải cấu hình...</Card>}
        {!loading && settings.length === 0 && (
          <Card className="p-8 text-center text-sm font-semibold text-slate-500">Chưa có cấu hình nào.</Card>
        )}
        {settings.map((setting) => (
          <Card key={setting.settingKey} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Settings2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold text-ink">{settingMeta(setting).label}</p>
                    <Badge tone={setting.isActive ? "mint" : "rose"}>
                      {setting.isActive ? "Đang bật" : "Đang tắt"}
                    </Badge>
                    <Badge tone="slate">{setting.valueType}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{settingMeta(setting).description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <span className="rounded-2xl bg-slate-50 px-4 py-2 font-display text-lg font-black text-ink">
                  {maskSensitiveSetting(setting)}
                </span>
                <Button variant="secondary" onClick={() => beginEdit(setting)}>Sửa</Button>
                <Button variant="ghost" onClick={() => toggle(setting)}>
                  {setting.isActive ? "Tắt" : "Bật"}
                </Button>
                <Button variant="danger" size="icon" title="Xóa mềm" onClick={() => remove(setting)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Cập nhật cấu hình" : "Tạo cấu hình"}
        description="Không nhập khóa bí mật, mật khẩu hoặc token vào phần mô tả hay giá trị hiển thị công khai."
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
          <Field label="Mã cấu hình">
            <Input
              value={form.settingKey || ""}
              disabled={Boolean(editing)}
              onChange={(event) => setForm((value) => ({ ...value, settingKey: event.target.value }))}
            />
          </Field>
          <Field label="Kiểu dữ liệu">
            <select
              value={form.valueType || "STRING"}
              onChange={(event) => setForm((value) => ({ ...value, valueType: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            >
              <option value="STRING">Chuỗi</option>
              <option value="INT">Số nguyên</option>
              <option value="DECIMAL">Số thập phân</option>
              <option value="BOOLEAN">Đúng/Sai</option>
            </select>
          </Field>
          <Field label="Giá trị" className="md:col-span-2">
            <Input
              value={form.settingValue || ""}
              onChange={(event) => setForm((value) => ({ ...value, settingValue: event.target.value }))}
            />
          </Field>
          <Field label="Mô tả" className="md:col-span-2">
            <textarea
              value={form.description || ""}
              rows={4}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Đang bật
          </label>
        </div>
      </Modal>
    </div>
  );
}
