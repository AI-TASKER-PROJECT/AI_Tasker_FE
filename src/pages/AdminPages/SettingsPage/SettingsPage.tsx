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
          title="System Settings"
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
                    {setting.settingKey}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {setting.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="brand">{setting.valueType}</Badge>
                    <Badge tone={setting.isActive ? "mint" : "rose"}>
                      {setting.isActive ? "Active" : "Inactive"}
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
        <Field label={editing?.settingKey || "Setting"}>
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}
