import { Gavel } from "lucide-react";
import { FormEvent, useState } from "react";
import { disputeApi } from "../../../lib/api";
import type { Dispute } from "../../../types";
import {
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
} from "../../../components/ui";

export function NewDisputePage() {
  const [form, setForm] = useState({
    contractId: "",
    milestoneId: "",
  });
  const [created, setCreated] = useState<Dispute | null>(null);
  const [message, setMessage] = useState("");

  // Tạo tranh chấp thủ công theo contractId và milestoneId khi cần kiểm thử hoặc mở hồ sơ trực tiếp.
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const contractId = Number(form.contractId);
    const milestoneId = Number(form.milestoneId);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(milestoneId) ||
      milestoneId <= 0
    ) {
      setMessage("Vui lòng chọn hợp đồng và mốc hợp lệ.");
      return;
    }

    setMessage("");
    const dispute = await disputeApi.create({
      contractId,
      milestoneId,
      initiationType: "OTHER",
    });
    setCreated(dispute);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Tạo tranh chấp"
          description="Tạo tranh chấp theo hợp đồng và cột mốc đúng với điểm truy cập máy chủ hiện có."
        />
      </div>

      <Notice tone="info" title="Bằng chứng được gửi sau khi tạo tranh chấp">
        Máy chủ hiện chưa nhận báo cáo bằng chứng hoặc phương án đề xuất khi tạo tranh chấp. Sau khi tạo tranh chấp, bằng chứng sẽ được bổ sung tại màn hình chi tiết.
      </Notice>

      <Card className="p-6">
        <form onSubmit={submit} className="grid gap-4">
          {message && <Notice tone="danger" title={message} />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hợp đồng">
              <Input
                type="number"
                min={1}
                value={form.contractId}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    contractId: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <Field label="Mốc">
              <Input
                type="number"
                min={1}
                value={form.milestoneId}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    milestoneId: event.target.value,
                  }))
                }
                required
              />
            </Field>
          </div>
          <Button type="submit">
            <Gavel className="h-4 w-4" /> Tạo tranh chấp
          </Button>
        </form>
        {created && (
          <Notice
            tone="success"
            title="Đã tạo hồ sơ tranh chấp"
            className="mt-4"
          />
        )}
      </Card>
    </div>
  );
}
