import { CheckCircle2, FileSearch, Send, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { disputeApi } from "../../../lib/api";
import type { Dispute } from "../../../types";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Notice, PageHeader, SectionHeading, StatusBadge, Textarea } from "../../../components/ui";

export function DisputeDetailPage({
  staffMode = false,
}: {
  staffMode?: boolean;
}) {
  const { disputeId } = useParams();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [testResult, setTestResult] = useState("");
  const [report, setReport] = useState({
    reportContent: "",
    proposedAction: "FORCE_PAYOUT_70_30",
  });

  useEffect(() => {
    disputeApi
      .get(Number(disputeId))
      .then((data) => {
        setDispute(data);
        setStaffId(String(data.assignedStaffId || ""));
      })
      .catch(() => setDispute(null));
  }, [disputeId]);

  if (!dispute)
    return (
      <EmptyState
        title="Không tìm thấy dispute"
        description="Dữ liệu dispute được lấy trực tiếp từ backend."
      />
    );

  const assign = async () => {
    setDispute(await disputeApi.assign(dispute.disputeId, Number(staffId)));
    setAssignOpen(false);
  };
  const demoTesting = async () => {
    setDispute(await disputeApi.demoTesting(dispute.disputeId, testResult));
    setTestResult("");
  };
  const technicalReport = async () => {
    setDispute(
      await disputeApi.technicalReport(
        dispute.disputeId,
        report.reportContent,
        report.proposedAction,
      ),
    );
    setReportOpen(false);
  };
  const resolve = async () => {
    setDispute(
      await disputeApi.resolve(dispute.disputeId, report.proposedAction),
    );
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={dispute.title || `Dispute #${dispute.disputeId}`}
          description="Single source of truth là acceptance criteria và deliverables trong workspace."
          actions={
            <>
              <Button variant="secondary" onClick={() => setAssignOpen(true)}>
                <Users className="h-4 w-4" />
                Assign staff
              </Button>
              <Button onClick={resolve}>
                <CheckCircle2 className="h-4 w-4" />
                Resolve
              </Button>
            </>
          }
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="p-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={dispute.status} />
            <Badge tone="brand">Contract #{dispute.contractId}</Badge>
            {dispute.milestoneId && (
              <Badge tone="amber">Milestone #{dispute.milestoneId}</Badge>
            )}
          </div>
          <SectionHeading title="Bằng chứng và báo cáo" description="" />
          <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            {dispute.evidenceReport || "Chưa có báo cáo."}
          </div>
          <div className="mt-5 grid gap-4">
            <Field label="Kết quả demo testing">
              <Textarea
                value={testResult}
                onChange={(event) => setTestResult(event.target.value)}
                placeholder="Ghi nhận môi trường test, AC đạt/không đạt, lỗi tái hiện..."
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={demoTesting}>
                <FileSearch className="h-4 w-4" />
                Lưu demo testing
              </Button>
              <Button onClick={() => setReportOpen(true)}>
                <Send className="h-4 w-4" />
                Technical report
              </Button>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Đề xuất xử lý" />
          <div className="mt-5 rounded-3xl bg-gradient-to-br from-brand-50 to-indigo-50 p-5">
            <p className="text-sm font-bold text-slate-500">Proposed action</p>
            <p className="mt-2 font-display text-xl font-black text-ink">
              {dispute.proposedAction || "Chưa có"}
            </p>
          </div>
          <Notice tone="warning" title="Termination snapshot" className="mt-4">
            Giao diện có chỗ cho Force Payout / Refund / split ratio; back-end
            hiện mới lưu proposedAction dạng text.
          </Notice>
          <div className="mt-5 grid gap-3">
            <Badge tone="slate">Raised by: {dispute.raisedBy || "N/A"}</Badge>
            <Badge tone="mint">
              Assigned:{" "}
              {dispute.staffName ||
                `Staff #${dispute.assignedStaffId || "N/A"}`}
            </Badge>
          </div>
        </Card>
      </div>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign dispute"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>
              Hủy
            </Button>
            <Button onClick={assign}>Gán staff</Button>
          </>
        }
      >
        <Field label="Staff ID">
          <Input
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Technical report"
        description="Staff ghi báo cáo tiếng Việt có dấu và đề xuất tỷ lệ chia tiền."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              Hủy
            </Button>
            <Button onClick={technicalReport}>Gửi report</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Nội dung báo cáo">
            <Textarea
              value={report.reportContent}
              onChange={(event) =>
                setReport((value) => ({
                  ...value,
                  reportContent: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Proposed action">
            <Input
              value={report.proposedAction}
              onChange={(event) =>
                setReport((value) => ({
                  ...value,
                  proposedAction: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      {!staffMode && (
        <Notice tone="info" title="Luồng người dùng">
          Business/Expert xem trạng thái dispute tại đây. Staff/Admin dùng cùng
          detail nhưng có thêm ngữ cảnh xử lý ticket.
        </Notice>
      )}
    </div>
  );
}
