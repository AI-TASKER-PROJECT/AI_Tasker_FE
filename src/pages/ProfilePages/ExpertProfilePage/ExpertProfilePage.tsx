import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Award,
  BrainCircuit,
  Cpu,
  Edit3,
  FileText,
  IdCard,
  Layers3,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  catalogApi,
  profileApi,
  type Domain,
  type Skill,
  type Technology,
} from "../../../lib/api";
import { getSession, saveSession } from "../../../lib/session";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import {
  Avatar,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Notice,
  SectionHeading,
  StatusBadge,
  Tabs,
} from "../../../components/ui";
import type { ExpertProfile, Portfolio } from "../../../types";
import {
  normalizeAccountStatus,
  parseCatalogIds,
  PreviewGroup,
  ProfileFilePicker,
  readApiError,
  resolveCatalogNames,
  translateVerificationStatus,
} from "../ProfilePages.shared";

export function ExpertProfilePage() {
  const [form, setForm] = useState({
    nationalId: "",
    portfolioUrl: "",
    yearsOfExperience: "1",
  });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Chưa gửi");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(
    null,
  );
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = true;

  useEffect(() => {
    Promise.all([
      profileApi.getMyExpert(),
      profileApi.getMyPortfolio().catch(() => null),
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
    ])
      .then(
        ([
          profile,
          expertPortfolio,
          domainItems,
          skillItems,
          technologyItems,
        ]) => {
          setForm({
            nationalId: profile.nationalId || "",
            portfolioUrl: profile.portfolioUrl || "",
            yearsOfExperience: String(profile.yearsOfExperience ?? 1),
          });
          setStatus(profile.kycStatus || "Chưa gửi");
          setRejectionReason(profile.rejectionReason || "");
          setExpertProfile(profile);
          setPortfolio(expertPortfolio);
          setDomains(domainItems);
          setSkills(skillItems);
          setTechnologies(technologyItems);
        },
      )
      .catch(() => undefined);
  }, []);

  const selectedDomains = useMemo(
    () =>
      resolveCatalogNames(
        domains,
        parseCatalogIds(portfolio?.domainIds),
        "domainId",
        "domainName",
      ),
    [domains, portfolio?.domainIds],
  );
  const selectedSkills = useMemo(
    () =>
      resolveCatalogNames(
        skills,
        parseCatalogIds(portfolio?.skillIds),
        "skillId",
        "skillName",
      ),
    [skills, portfolio?.skillIds],
  );
  const selectedTechnologies = useMemo(
    () =>
      resolveCatalogNames(
        technologies,
        parseCatalogIds(portfolio?.technologyIds),
        "technologyId",
        "technologyName",
      ),
    [technologies, portfolio?.technologyIds],
  );

  const submit = (event: FormEvent) => {
    // bấm submit
    event.preventDefault();
    if (status?.toLowerCase() === "approved") {
      setConfirmModalOpen(true);
      return;
    }
    executeSubmit();
  };

  const executeSubmit = async () => {
    setConfirmModalOpen(false);
    setIsEditing(false);
    setLoading(true);
    setMessage("");
    setError("");
    try {
      let portfolioUrl = form.portfolioUrl;
      if (portfolioFile) {
        portfolioUrl = await profileApi.uploadExpertPortfolio(portfolioFile); //lấy info hsnl
      }
      const profile = await profileApi.upsertExpert({
        nationalId: form.nationalId,
        portfolioUrl,
        yearsOfExperience: Number(form.yearsOfExperience),
      });
      setForm({
        nationalId: profile.nationalId || "",
        portfolioUrl: profile.portfolioUrl || "",
        yearsOfExperience: String(profile.yearsOfExperience ?? 1),
      });
      setStatus(profile.kycStatus);
      setRejectionReason(profile.rejectionReason || "");
      setExpertProfile(profile);

      const session = getSession(); //lưu session
      setMessage("Đã lưu thành công hồ sơ");
      if (session) {
        saveSession({
          ...session,
          accountStatus: normalizeAccountStatus(profile.kycStatus),
        });
      }
    } catch (submitError) {
      setError(readApiError(submitError, "Không thể lưu hồ sơ chuyên gia."));
    } finally {
      setLoading(false);
    }
  };

  const isApproved = status?.toLowerCase() === "approved";
  const expertDisplayName =
    expertProfile?.fullName?.trim() ||
    expertProfile?.title?.trim() ||
    "Chuyên gia AI";
  const averageRating = expertProfile?.averageRating ?? expertProfile?.rating;
  const hasAverageRating = averageRating != null && Number(averageRating) > 0;
  const yearsOfExperience = Number(
    form.yearsOfExperience ?? portfolio?.yearsExperience ?? 0,
  );
  const hasPortfolioContent = Boolean(
    portfolio?.selfDescription?.trim() ||
      selectedDomains.length ||
      selectedSkills.length ||
      selectedTechnologies.length ||
      portfolio?.certificates ||
      form.portfolioUrl,
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-100">
        <div className="bg-[radial-gradient(circle_at_top_left,#ccfbf1,transparent_35%),linear-gradient(135deg,#111827_0%,#0f766e_100%)] p-6 text-white md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <Avatar name={expertDisplayName} size="xl" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                  Trang cá nhân chuyên gia
                </p>
                <h1 className="mt-2 text-3xl font-black md:text-4xl">
                  {expertDisplayName}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/75">
                  {yearsOfExperience > 0 && (
                    <span className="inline-flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      {yearsOfExperience} năm kinh nghiệm
                    </span>
                  )}
                  {yearsOfExperience > 0 && status && (
                    <span className="hidden h-4 w-px bg-white/20 sm:inline-block" />
                  )}
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <StatusBadge status={translateVerificationStatus(status)} />
                  </span>
                  {isApproved && hasAverageRating && (
                    <>
                      <span className="hidden h-4 w-px bg-white/20 sm:inline-block" />
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-200">
                        <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                        {`${Number(averageRating).toFixed(1)}/5`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Tabs
              tabs={[
                ...(hasPortfolioContent
                  ? [{ id: "portfolio", label: "Portfolio" }]
                  : []),
                ...(hasAverageRating
                  ? [{ id: "reviews", label: "Đánh giá" }]
                  : []),
                ...(canEdit ? [{ id: "edit", label: "Cập nhật" }] : []),
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
      </Card>

      {activeTab === "portfolio" && (
        <Card className="p-6">
          <SectionHeading
            title="Portfolio"
            description="Lĩnh vực, kỹ năng, công nghệ và tệp đính kèm."
          />
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <PreviewGroup
              icon={<Layers3 className="h-4 w-4" />}
              title="Lĩnh vực"
              emptyText="Chưa có lĩnh vực"
              items={selectedDomains}
              tone="mint"
            />
            <PreviewGroup
              icon={<BrainCircuit className="h-4 w-4" />}
              title="Kỹ năng"
              emptyText="Chưa có kỹ năng"
              items={selectedSkills}
              tone="brand"
            />
            <PreviewGroup
              icon={<Cpu className="h-4 w-4" />}
              title="Công nghệ"
              emptyText="Chưa có công nghệ"
              items={selectedTechnologies}
              tone="coral"
            />
            <Card className="rounded-3xl border border-slate-100 bg-slate-50 p-5 shadow-none">
              <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
                <FileText className="h-4 w-4 text-brand-600" />
                Tệp portfolio
              </div>
              <FirebaseFileLink
                path={portfolio?.certificates || form.portfolioUrl}
                emptyText="Chưa có tệp"
                buttonText="Xem tệp"
                showPath={false}
              />
            </Card>
          </div>
        </Card>
      )}

      {activeTab === "reviews" && hasAverageRating && (
        <Card className="p-6">
          <SectionHeading title="Đánh giá" description="Điểm đánh giá từ các hợp đồng đã hoàn thành." />
          <div className="mt-5 flex items-center gap-4 rounded-3xl bg-amber-50 p-5">
            <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
            <div><p className="text-2xl font-black text-ink">{Number(averageRating).toFixed(1)}/5</p><p className="text-sm font-semibold text-slate-500">Điểm đánh giá trung bình</p></div>
          </div>
        </Card>
      )}

      {activeTab === "edit" && canEdit && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <form onSubmit={submit} className="grid gap-4">
              {message && <Notice tone="success" title={message} />}
              {error && <Notice tone="danger" title={error} />}
              <Field label="Số CCCD / Hộ chiếu">
                <Input
                  value={form.nationalId}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      nationalId: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                label="Tài liệu xác thực chuyên gia"
                hint="Chọn ảnh, PDF hoặc DOC/DOCX để thay tài liệu xác thực hiện tại."
                >
                  <ProfileFilePicker
                    file={portfolioFile}
                    onChange={setPortfolioFile}
                  buttonText="Chọn tài liệu"
                  emptyText="Chưa chọn tài liệu xác thực"
                    required={!form.portfolioUrl}
                  />
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                  Tải tài liệu để Staff xác thực hồ sơ chuyên gia.
                  </p>
                  <FirebaseFileLink
                    path={form.portfolioUrl}
                  emptyText="Chưa có tài liệu xác thực"
                  buttonText="Xem tài liệu"
                    className="mt-3"
                    showPath={false}
                  />
                </Field>
                <Field label="Số năm kinh nghiệm">
                  <Input
                    type="number"
                    min="0"
                    value={form.yearsOfExperience}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        yearsOfExperience: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                {isApproved && !isEditing ? (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4" />
                    Cập nhật
                  </Button>
                ) : isApproved && isEditing ? (
                  <Button type="submit" loading={loading}>
                    <ShieldCheck className="h-4 w-4" />
                    Cập nhật thông tin
                  </Button>
                ) : (
                  <Button type="submit" loading={loading}>
                    <ShieldCheck className="h-4 w-4" />
                    Nộp xác thực chuyên gia
                  </Button>
                )}
              </div>
            </form>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Trạng thái xác thực" />
            <div className="mt-5 flex items-center gap-3 rounded-3xl bg-mint-50 p-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-mint-600 shadow-sm">
                <IdCard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Hồ sơ hiện tại
                </p>
                <div className="mt-1">
                  <StatusBadge status={translateVerificationStatus(status)} />
                </div>
              </div>
            </div>
            {rejectionReason && status === "Rejected" && (
              <div className="mt-4">
                <Notice tone="danger" title="Lý do từ chối">
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    {rejectionReason.split(";").map((reason, index) => {
                      const trimmedReason = reason.trim();
                      return trimmedReason ? (
                        <li key={index}>{trimmedReason}</li>
                      ) : null;
                    })}
                  </ul>
                </Notice>
              </div>
            )}
          </Card>
        </div>
      )}
      <Modal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Xác nhận chỉnh sửa"
        description="Xác nhận cập nhật thông tin hồ sơ đã được duyệt?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmModalOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={executeSubmit} loading={loading}>
              Xác nhận
            </Button>
          </>
        }
      >
        {null}
      </Modal>
    </div>
  );
}

//Portfolio
