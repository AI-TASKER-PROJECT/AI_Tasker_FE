import { FormEvent, useEffect, useMemo, useState } from "react";
import { Award, BrainCircuit, ClipboardCheck, Cpu, FileText, Layers3, Sparkles } from "lucide-react";
import { catalogApi, profileApi, type Domain, type Skill, type Technology } from "../../../lib/api";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import { Badge, Button, Card, Field, Input, Notice, PageHeader, SectionHeading, Textarea } from "../../../components/ui";
import { parseCatalogIds, PreviewGroup, ProfileFilePicker, readApiError, TogglePill } from "../ProfilePages.shared";

export function ExpertPortfolioPage() {
  const [form, setForm] = useState({
    yearsExperience: "1",
    certificates: "",
    selfDescription: "",
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [selectedTechnologyIds, setSelectedTechnologyIds] = useState<number[]>(
    [],
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
      profileApi.getMyPortfolio().catch(() => null),
      profileApi.getMyExpert().catch(() => null),
    ]).then(
      ([
        domainItems,
        skillItems,
        technologyItems,
        portfolio,
        expertProfile,
      ]) => {
        setDomains(domainItems);
        setSkills(skillItems);
        setTechnologies(technologyItems);
        if (portfolio) {
          setForm({
            yearsExperience: String(
              expertProfile?.yearsOfExperience ??
                portfolio.yearsExperience ??
                1,
            ),
            certificates: portfolio.certificates || "",
            selfDescription: portfolio.selfDescription || "",
          });
          setSelectedDomainIds(parseCatalogIds(portfolio.domainIds));
          setSelectedSkillIds(parseCatalogIds(portfolio.skillIds));
          setSelectedTechnologyIds(parseCatalogIds(portfolio.technologyIds));
        } else {
          setForm((f) => ({
            ...f,
            yearsExperience: String(expertProfile?.yearsOfExperience ?? 1),
          }));
          setSelectedDomainIds([]);
          setSelectedSkillIds([]);
          setSelectedTechnologyIds([]);
        }
      },
    );
  }, []);

  const selectedDomains = useMemo(
    () =>
      domains.filter((domain) => selectedDomainIds.includes(domain.domainId)),
    [domains, selectedDomainIds],
  );

  const selectedSkills = useMemo(
    () => skills.filter((skill) => selectedSkillIds.includes(skill.skillId)),
    [skills, selectedSkillIds],
  );

  const selectedTechnologies = useMemo(
    () =>
      technologies.filter((technology) =>
        selectedTechnologyIds.includes(technology.technologyId),
      ),
    [technologies, selectedTechnologyIds],
  );

  const toggleDomain = (domainId: number) => {
    setSelectedDomainIds((items) =>
      items.includes(domainId)
        ? items.filter((id) => id !== domainId)
        : [...items, domainId],
    );
  };

  const toggleSkill = (skillId: number) => {
    setSelectedSkillIds((items) =>
      items.includes(skillId)
        ? items.filter((id) => id !== skillId)
        : [...items, skillId],
    );
  };

  const toggleTechnology = (technologyId: number) => {
    setSelectedTechnologyIds((items) =>
      items.includes(technologyId)
        ? items.filter((id) => id !== technologyId)
        : [...items, technologyId],
    );
  };

  const submit = async (event: FormEvent) => {
    //bấm submit
    event.preventDefault();
    if (
      selectedDomainIds.length === 0 ||
      selectedSkillIds.length === 0 ||
      selectedTechnologyIds.length === 0
    ) {
      setError("Vui lòng chọn ít nhất 1 lĩnh vực, 1 kỹ năng và 1 công nghệ.");
      return;
    }
    setLoading(true);
    setSaved(false);
    setError("");
    try {
      let certificates = form.certificates;
      if (certificateFile) {
        certificates =
          await profileApi.uploadExpertCertificate(certificateFile);
      }
      await profileApi.upsertPortfolio({
        domainIds: selectedDomainIds.join(","),
        skillIds: selectedSkillIds.join(","),
        technologyIds: selectedTechnologyIds.join(","),
        yearsExperience: Number(form.yearsExperience),
        certificates,
        selfDescription: form.selfDescription,
      });
      setForm((value) => ({ ...value, certificates }));
      setSaved(true); //lưu
    } catch (submitError) {
      setError(readApiError(submitError, "Không thể lưu hồ sơ năng lực."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Hồ sơ năng lực AI"
          description="Biến hồ sơ chuyên gia thành một bản giới thiệu rõ ràng để doanh nghiệp nhìn thấy lĩnh vực mạnh, nhóm công nghệ, chứng chỉ và cách bạn giải quyết dự án."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <form onSubmit={submit} className="space-y-6">
          {error && <Notice tone="danger" title={error} />}

          <Card className="p-6">
            <SectionHeading
              title="Vùng chuyên môn"
              description="Chọn các mảng AI mà bạn tự tin nhận dự án."
            />
            <div className="mt-5">
              <p className="mb-3 text-sm font-extrabold text-ink">Lĩnh vực</p>
              <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {domains.map((domain) => (
                  <TogglePill
                    key={domain.domainId}
                    checked={selectedDomainIds.includes(domain.domainId)}
                    label={domain.domainName}
                    description={domain.description}
                    onChange={() => toggleDomain(domain.domainId)}
                    compact
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Kỹ năng & công nghệ"
              description="Kết hợp kỹ năng nghiệp vụ với công nghệ triển khai để hệ thống đối sánh chính xác hơn."
            />
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-extrabold text-ink">Kỹ năng</p>
                <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
                  {skills.map((skill) => (
                    <TogglePill
                      key={skill.skillId}
                      checked={selectedSkillIds.includes(skill.skillId)}
                      label={skill.skillName}
                      description={skill.description}
                      onChange={() => toggleSkill(skill.skillId)}
                      compact
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-extrabold text-ink">
                  Công nghệ
                </p>
                <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
                  {technologies.map((technology) => (
                    <TogglePill
                      key={technology.technologyId}
                      checked={selectedTechnologyIds.includes(
                        technology.technologyId,
                      )}
                      label={technology.technologyName}
                      description={technology.description}
                      onChange={() => toggleTechnology(technology.technologyId)}
                      compact
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Bằng chứng năng lực"
              description="Kinh nghiệm, chứng chỉ và đoạn tự giới thiệu sẽ là phần doanh nghiệp đọc kỹ nhất."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr]">
              <Field label="Số năm kinh nghiệm">
                <Input
                  type="text"
                  min="0"
                  value={form.yearsExperience}
                  disabled
                  className="bg-slate-50 text-slate-500"
                  required
                />
              </Field>
              <Field
                label="Chứng chỉ trong hồ sơ năng lực AI"
                hint={
                  form.certificates ||
                  "Chứng chỉ trong hồ sơ năng lực AI. Chọn ảnh, PDF hoặc DOC/DOCX để tải lên kho lưu trữ."
                }
              >
                <ProfileFilePicker
                  file={certificateFile}
                  onChange={setCertificateFile}
                  buttonText="Chọn chứng chỉ"
                  emptyText="Chưa chọn chứng chỉ"
                />
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Nộp kèm chứng chỉ để doanh nghiệp có thêm căn cứ đánh giá năng lực chuyên gia.
                </p>
              </Field>
            </div>
            <Field label="Mô tả bản thân" className="mt-4">
              <Textarea
                value={form.selfDescription}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    selfDescription: event.target.value,
                  }))
                }
                placeholder="Ví dụ: Tôi chuyên xây dựng RAG, chatbot CSKH và pipeline dữ liệu từ PoC đến production..."
                className="min-h-40"
                required
              />
            </Field>
            <div className="mt-5 flex justify-end">
              <Button type="submit" loading={loading}>
                <ClipboardCheck className="h-4 w-4" />
                Nộp hồ sơ năng lực AI
              </Button>
            </div>
          </Card>
        </form>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden">
            <div className="bg-ink p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-mint-100 ring-1 ring-white/15">
                  <Sparkles className="h-6 w-6" />
                </span>
                <Badge tone="mint">
                  {form.yearsExperience || 0} năm kinh nghiệm
                </Badge>
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold">
                Hồ sơ chuyên gia AI
              </h2>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-white/75">
                {form.selfDescription ||
                  "Thêm mô tả bản thân để doanh nghiệp hiểu thế mạnh, cách làm việc và loại dự án bạn phù hợp."}
              </p>
            </div>
            <div className="space-y-5 p-6">
              <PreviewGroup
                icon={<Layers3 className="h-4 w-4" />}
                title="Lĩnh vực"
                emptyText="Chưa chọn lĩnh vực"
                items={selectedDomains.map((item) => item.domainName)}
                tone="mint"
              />
              <PreviewGroup
                icon={<BrainCircuit className="h-4 w-4" />}
                title="Kỹ năng nổi bật"
                emptyText="Chưa chọn kỹ năng"
                items={selectedSkills.map((item) => item.skillName)}
                tone="brand"
              />
              <PreviewGroup
                icon={<Cpu className="h-4 w-4" />}
                title="Nhóm công nghệ"
                emptyText="Chưa chọn công nghệ"
                items={selectedTechnologies.map((item) => item.technologyName)}
                tone="coral"
              />
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
                  <Award className="h-4 w-4 text-amber-600" />
                  Chứng chỉ
                </div>
                <FirebaseFileLink
                  path={form.certificates}
                  emptyText="Chưa có chứng chỉ"
                  buttonText="Xem chứng chỉ"
                  showPath={false}
                />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-base font-extrabold text-ink">
                  Gợi ý để đối sánh tốt
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Chọn đúng công nghệ đang dùng trong dự án thật và viết mô tả
                  theo kết quả đã bàn giao. Điều này giúp doanh nghiệp đọc hồ sơ
                  nhanh hơn khi so sánh bản đề xuất.
                </p>
              </div>
            </div>
          </Card>

          {saved && (
            <Notice tone="success" title="Đã lưu hồ sơ năng lực">
              Hồ sơ năng lực đã sẵn sàng để doanh nghiệp xem khi đánh giá bản đề xuất.
            </Notice>
          )}
        </aside>
      </div>
    </div>
  );
}
