import { Save, Settings2 } from "lucide-react";
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
import { adminApi, getApiErrorMessage } from "../../../lib/api";
import type { SystemSetting, SystemSettingRequest } from "../../../types";

const supportedSettingKeys = [
  "milestone_review_sla_duration",
  "dispute_staff_max_active_cases",
  "credit.job_post.price_vnd",
  "credit.proposal.price_vnd",
  "contract.deposit.business_percentage",
  "contract.deposit.expert_percentage",
];

const settingLabels: Record<string, { label: string; description: string }> = {
  milestone_review_sla_duration: {
    label: "Thời gian tự động nghiệm thu",
    description:
      "Thời gian chờ phản hồi trước khi mốc được hệ thống tự động nghiệm thu.",
  },
  dispute_staff_max_active_cases: {
    label: "Số tranh chấp tối đa mỗi nhân viên",
    description:
    "Giới hạn số hồ sơ tranh chấp đang xử lý đồng thời của mỗi nhân viên.",
  },
  "credit.job_post.price_vnd": {
    label: "Giá lượt đăng dự án",
    description: "Số tiền cho mỗi lượt đăng dự án của doanh nghiệp, tính bằng VND.",
  },
  "credit.proposal.price_vnd": {
    label: "Giá lượt nộp đề xuất",
    description: "Số tiền cho mỗi lượt nộp đề xuất của chuyên gia, tính bằng VND.",
  },
  "contract.deposit.business_percentage": {
    label: "Tỷ lệ ký quỹ của doanh nghiệp",
    description: "Phần trăm tổng ngân sách chốt doanh nghiệp phải ký quỹ.",
  },
  "contract.deposit.expert_percentage": {
    label: "Tỷ lệ ký quỹ của chuyên gia",
    description: "Phần trăm tổng ngân sách chốt chuyên gia phải ký quỹ.",
  },
};

const REVIEW_SLA_KEY = "milestone_review_sla_duration";
type ReviewSlaUnit = "MINUTE" | "HOUR" | "DAY";

function parseReviewSla(value?: string): { value: string; unit: ReviewSlaUnit } {
  const [rawValue = "", rawUnit = "DAY"] = String(value || "").split(":");
  const unit = ["MINUTE", "HOUR", "DAY"].includes(rawUnit)
    ? (rawUnit as ReviewSlaUnit)
    : "DAY";
  return { value: rawValue, unit };
}

function reviewSlaLabel(value?: string) {
  const parsed = parseReviewSla(value);
  const labels: Record<ReviewSlaUnit, string> = {
    MINUTE: "phút",
    HOUR: "giờ",
    DAY: "ngày",
  };
  return `${parsed.value} ${labels[parsed.unit]}`;
}

function settingMeta(setting: SystemSetting) {
  if (setting.settingKey === REVIEW_SLA_KEY) {
    return {
      label: "Thời gian tự động nghiệm thu",
      description:
        "Thời gian Doanh nghiệp có thể chấp nhận hoặc từ chối sau khi Chuyên gia nộp sản phẩm cuối.",
    };
  }
  return (
    settingLabels[setting.settingKey] || {
      label: setting.settingKey,
      description: setting.description || "Cấu hình hệ thống.",
    }
  );
}

function settingErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error) || fallback;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editing, setEditing] = useState<SystemSetting | null>(null);
  const [form, setForm] = useState<SystemSettingRequest>({
    settingKey: "",
    settingValue: "",
    valueType: "STRING",
    description: "",
    isActive: true,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [slaValue, setSlaValue] = useState("3");
  const [slaUnit, setSlaUnit] = useState<ReviewSlaUnit>("DAY");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const orderedSettings = useMemo(
    () =>
      [...settings].sort(
        (left, right) =>
          supportedSettingKeys.indexOf(left.settingKey) -
          supportedSettingKeys.indexOf(right.settingKey),
      ),
    [settings],
  );

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const items = await adminApi.listSettings();
      setSettings(
        items.filter((item) => supportedSettingKeys.includes(item.settingKey)),
      );
    } catch (err) {
      setError(settingErrorMessage(err, "Không tải được cấu hình hệ thống."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadSettings);
  }, []);

  const beginEdit = (setting: SystemSetting) => {
    setEditing(setting);
    setForm({
      settingKey: setting.settingKey,
      settingValue: setting.settingValue,
      valueType: setting.valueType,
      description: setting.description || settingMeta(setting).description,
      isActive: setting.isActive,
    });
    if (setting.settingKey === REVIEW_SLA_KEY) {
      const parsed = parseReviewSla(setting.settingValue);
      setSlaValue(parsed.value);
      setSlaUnit(parsed.unit);
    }
    setModalOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    const isReviewSla = editing.settingKey === REVIEW_SLA_KEY;
    const normalizedSlaValue = Number(slaValue);
    if (isReviewSla && (!Number.isInteger(normalizedSlaValue) || normalizedSlaValue <= 0)) {
      setError("Thời gian SLA phải là số nguyên lớn hơn 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await adminApi.updateSettingBody(editing.settingKey, {
        ...form,
        settingKey: editing.settingKey,
        settingValue: isReviewSla
          ? `${normalizedSlaValue}:${slaUnit}`
          : form.settingValue?.trim(),
        valueType: isReviewSla ? "STRING" : form.valueType?.trim().toUpperCase(),
        description: form.description?.trim(),
        isActive: isReviewSla ? true : form.isActive,
      });
      setSettings((items) =>
        items.map((item) => (item.settingKey === saved.settingKey ? saved : item)),
      );
      setModalOpen(false);
    } catch (err) {
      setError(settingErrorMessage(err, "Không lưu được cấu hình."));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (setting: SystemSetting) => {
    setError("");
    try {
      const updated = await adminApi.updateSettingBody(setting.settingKey, {
        settingKey: setting.settingKey,
        settingValue: setting.settingValue,
        valueType: setting.valueType,
        description: setting.description,
        isActive: !setting.isActive,
      });
      setSettings((items) =>
        items.map((item) =>
          item.settingKey === updated.settingKey ? updated : item,
        ),
      );
    } catch (err) {
      setError(settingErrorMessage(err, "Không cập nhật được trạng thái."));
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_55%,#f7fbf5_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Cấu hình hệ thống"
          description="Quản lý các tham số vận hành đang được máy chủ hỗ trợ."
          actions={null}
        />
      </div>

      {error && <Notice tone="danger" title="Có lỗi xảy ra">{error}</Notice>}

      <div className="grid gap-4">
        {loading && (
          <Card className="p-8 text-center text-sm font-semibold text-slate-500">
            Đang tải cấu hình...
          </Card>
        )}
        {!loading && orderedSettings.length === 0 && (
          <Card className="p-8 text-center text-sm font-semibold text-slate-500">
            Chưa có cấu hình được hỗ trợ.
          </Card>
        )}
        {orderedSettings.map((setting) => (
          <Card key={setting.settingKey} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Settings2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold text-ink">
                      {settingMeta(setting).label}
                    </p>
                    <Badge tone={setting.isActive ? "mint" : "rose"}>
                      {setting.isActive ? "Đang bật" : "Đang tắt"}
                    </Badge>
                    <Badge tone="slate">{setting.valueType}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {settingMeta(setting).description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <span className="rounded-2xl bg-slate-50 px-4 py-2 font-display text-lg font-black text-ink">
                  {setting.settingKey === REVIEW_SLA_KEY
                    ? reviewSlaLabel(setting.settingValue)
                    : setting.settingValue}
                </span>
                <Button variant="secondary" onClick={() => beginEdit(setting)}>
                  Sửa
                </Button>
                {setting.settingKey !== REVIEW_SLA_KEY && (
                  <Button variant="ghost" onClick={() => toggle(setting)}>
                    {setting.isActive ? "Tắt" : "Bật"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Cập nhật cấu hình"
          description="Chỉ cập nhật giá trị và trạng thái cho cấu hình được máy chủ hỗ trợ."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={save} loading={saving}>
              <Save className="h-4 w-4" /> Lưu
            </Button>
          </>
        }
      >
        {editing?.settingKey === REVIEW_SLA_KEY ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Thời lượng">
              <Input
                type="number"
                min={1}
                step={1}
                value={slaValue}
                onChange={(event) => setSlaValue(event.target.value)}
              />
            </Field>
            <Field label="Đơn vị">
              <select
                value={slaUnit}
                onChange={(event) => setSlaUnit(event.target.value as ReviewSlaUnit)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
              >
                <option value="MINUTE">Phút</option>
                <option value="HOUR">Giờ</option>
                <option value="DAY">Ngày</option>
              </select>
            </Field>
            <Notice
              tone="info"
              title="Áp dụng cho lượt nộp tiếp theo"
              className="md:col-span-2"
            >
              Mốc đang chờ nghiệm thu giữ nguyên hạn đã được hệ thống ghi nhận khi Chuyên gia nộp sản phẩm.
            </Notice>
          </div>
        ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Mã cấu hình">
            <Input value={form.settingKey || ""} disabled />
          </Field>
          <Field label="Kiểu dữ liệu">
            <Input value={form.valueType || "STRING"} disabled />
          </Field>
          <Field label="Giá trị" className="md:col-span-2">
            <Input
              value={form.settingValue || ""}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  settingValue: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Mô tả" className="md:col-span-2">
            <textarea
              value={form.description || ""}
              rows={4}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  description: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  isActive: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Đang bật
          </label>
        </div>
        )}
      </Modal>
    </div>
  );
}
