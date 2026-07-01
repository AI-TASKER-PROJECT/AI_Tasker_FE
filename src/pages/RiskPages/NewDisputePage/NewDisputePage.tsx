import { Gavel } from "lucide-react";
import { FormEvent, useState } from "react";
import { disputeApi } from "../../../lib/api";
import type { Dispute } from "../../../types";
import { Button, Card, Field, Input, Notice, PageHeader, Textarea } from "../../../components/ui";

export function NewDisputePage() {
  const [form, setForm] = useState({
    contractId: "",
    milestoneId: "",
    evidenceReport: "",
    proposedAction: "",
  });
  const [created, setCreated] = useState<Dispute | null>(null);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const contractId = Number(form.contractId);
    const milestoneId = form.milestoneId ? Number(form.milestoneId) : undefined;
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      (milestoneId !== undefined &&
        (!Number.isFinite(milestoneId) || milestoneId <= 0))
    ) {
      setMessage(
        "Contract ID và Milestone ID phải là số dương từ database thật.",
      );
      return;
    }
    setMessage("");
    const dispute = await disputeApi.create({
      contractId,
      milestoneId,
      evidenceReport: form.evidenceReport,
      proposedAction: form.proposedAction,
      status: "Open",
    });
    setCreated(dispute);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Tạo tranh chấp"
          description="Dùng khi một bên khiếu nại và cần đóng băng dòng tiền milestone."
        />
      </div>
      <Card className="p-6">
        <form onSubmit={submit} className="grid gap-4">
          {message && <Notice tone="danger" title={message} />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contract ID">
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
            <Field label="Milestone ID">
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
              />
            </Field>
          </div>
          <Field label="Bằng chứng / mô tả">
            <Textarea
              value={form.evidenceReport}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  evidenceReport: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Proposed action ban đầu">
            <Input
              value={form.proposedAction}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  proposedAction: event.target.value,
                }))
              }
            />
          </Field>
          <Button type="submit">
            <Gavel className="h-4 w-4" /> Tạo dispute
          </Button>
        </form>
        {created && (
          <Notice
            tone="success"
            title={`Đã tạo dispute #${created.disputeId}`}
            className="mt-4"
          />
        )}
      </Card>
    </div>
  );
}
