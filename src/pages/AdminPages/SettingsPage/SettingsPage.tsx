import { Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "../../../lib/api";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
} from "../../../components/ui";
import type { SystemSetting } from "../../../types";

const settingLabels: Record<string, { label: string; description: string }> = {
  platform_fee_percent: {
    label: "Phí nền tảng",
    description: "Tỷ lệ phí nền tảng áp dụng cho giao dịch escrow thành công.",
  },
  default_sla_days: {
    label: "Số ngày SLA mặc định",
    description: "Số ngày mặc định trước khi hệ thống xử lý milestone quá hạn.",
  },
  auto_assign_staff_enabled: {
    label: "Tự động phân công Staff",
    description: "Tự động phân công Staff khi phát sinh tranh chấp.",
  },
  max_open_jobs_per_business: {
    label: "Số dự án mở tối đa",
    description: "Số dự án được mở đồng thời trên mỗi doanh nghiệp.",
  },
};

settingLabels["credit.job_post.price_vnd"] = {
  label: "Giá credit đăng dự án",
  description: "Số tiền doanh nghiệp cần trả cho mỗi credit đăng dự án, tính bằng VND.",
};
settingLabels["credit.proposal.price_vnd"] = {
  label: "Giá credit nộp proposal",
  description: "Số tiền chuyên gia cần trả cho mỗi credit nộp proposal, tính bằng VND.",
};

function settingMeta(setting: SystemSetting) {
  return settingLabels[setting.settingKey] || {
    label: setting.settingKey
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    description: setting.description || "Cấu hình hệ thống.",
  };
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editing, setEditing] = useState<SystemSetting | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    adminApi.listSettings().then(setSettings);
  }, []);

  const save = async () => {
    if (!editing) return;
    const updated = await adminApi.updateSetting(
      editing.settingKey,
      value,
      editing.isActive,
    );
    setSettings((items) =>
      items.map((item) =>
        item.settingKey === updated.settingKey ? updated : item,
      ),
    );
    setEditing(null);
  };

  const toggle = async (setting: SystemSetting) => {
    const updated = await adminApi.updateSetting(
      setting.settingKey,
      setting.settingValue,
      !setting.isActive,
    );
    setSettings((items) =>
      items.map((item) =>
        item.settingKey === updated.settingKey ? updated : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Cài đặt hệ thống"
          description="Cấu hình phí nền tảng, SLA và auto assign staff không cần sửa code."
        />
      </div>
      <div className="grid gap-4">
        {settings.map((setting) => (
          <Card key={setting.settingKey} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Settings2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-extrabold text-ink">
                    {settingMeta(setting).label}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {settingMeta(setting).description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={setting.isActive ? "mint" : "rose"}>
                      {setting.isActive ? "Đang bật" : "Đang tắt"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-slate-50 px-4 py-2 font-display text-lg font-black text-ink">
                  {setting.settingValue}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(setting);
                    setValue(setting.settingValue);
                  }}
                >
                  Sửa
                </Button>
                <Button variant="ghost" onClick={() => toggle(setting)}>
                  {setting.isActive ? "Tắt" : "Bật"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Cập nhật setting"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button onClick={save}>
              <Save className="h-4 w-4" /> Lưu
            </Button>
          </>
        }
      >
        <Field label={editing ? settingMeta(editing).label : "Cài đặt"}>
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}
