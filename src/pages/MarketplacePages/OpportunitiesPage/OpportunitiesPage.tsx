/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  XCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  getApiErrorMessage,
  marketplaceApi,
  profileApi,
  sowApi,
  type GeneratedSow,
  type GeneratedSowMilestone,
  type Domain,
  type JobSkill,
  type Skill,
  type Technology,
} from "../../../services";
import { cn, formatCompactCurrency, formatCurrency } from "../../../lib/utils";
import { useSession } from "../../../context/sessionContext";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import type {
  AcceptanceCriteria,
  ExpertProfile,
  Job,
  Milestone,
  Portfolio,
  Proposal,
} from "../../../types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Modal,
  Notice,
  PageHeader,
  SearchInput,
  SectionHeading,
  StatusBadge,
  Textarea,
  Select,
} from "../../../components/ui";
import { JobCard, JobDomainBadge } from "../../PublicPages";
import {
  formatGeneratedSow,
  jobDomainLabel,
  parseCatalogIdList,
  resolveDomainName,
  resolveSkillName,
  skillCountLabel,
  type MilestoneDraft,
  type SkillAssignment,
} from "../marketplacePages.utils";

const JOBS_PER_PAGE = 6;

//cmt1: Bộ lọc nhiều lựa chọn dùng để chuyên gia lọc Job theo domain, skill hoặc technology trước khi nộp proposal.
function MultiSelect({ label, options, selectedValues, onChange }: { label: string, options: { value: number, label: string }[], selectedValues: number[], onChange: (values: number[]) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Thêm hoặc bỏ một giá trị lọc trong danh sách Job cơ hội.
  const toggleValue = (value: number) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#df0e84] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">
          {selectedValues.length === 0 ? label : `${label} (${selectedValues.length})`}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-md">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-slate-100"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-[#df0e84] focus:ring-[#df0e84]"
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleValue(option.value)}
              />
              <span className="truncate">{option.label}</span>
            </label>
          ))}
          {options.length === 0 && <div className="px-2 py-1.5 text-sm text-slate-500">Không có dữ liệu</div>}
        </div>
      )}
    </div>
  );
}

export function OpportunitiesPage() {
  const [query, setQuery] = useState("");
  const [domainIds, setDomainIds] = useState<number[]>([]);
  const [skillIds, setSkillIds] = useState<number[]>([]);
  const [techIds, setTechIds] = useState<number[]>([]);

  const [jobs, setJobs] = useState<any[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  //cmt2: Đưa danh sách cơ hội về trang đầu khi chuyên gia thay đổi bộ lọc.
  const resetPagination = () => setCurrentPage(1);

  //cmt3: Tải danh sách Job đang mở và các danh mục để chuyên gia tìm cơ hội phù hợp.
  useEffect(() => {
    Promise.all([
      marketplaceApi.listJobs(),
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
    ])
      .then(([jobsData, domainsData, skillsData, techData]) => {
        setJobs(jobsData);
        setDomains(domainsData);
        setSkills(skillsData);
        setTechnologies(techData);
      })
      .catch(() => {
        setJobs([]);
        setDomains([]);
        setSkills([]);
        setTechnologies([]);
      });
  }, []);

  //cmt4: Lọc Job theo từ khóa, domain, skill và technology trước khi chuyên gia mở chi tiết để nộp proposal.
  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const textToSearch = `${job.title} ${job.rawRequirements} ${job.structuredSow || ""}`.toLowerCase();
        const matchQuery = textToSearch.includes(query.toLowerCase());
        
        const matchDomain = domainIds.length > 0 
          ? domainIds.some(id => job.domainIds?.includes(id)) 
          : true;
          
        const matchSkill = skillIds.length > 0 
          ? skillIds.some(id => job.skillIds?.includes(id)) 
          : true;
          
        const matchTech = techIds.length > 0 
          ? techIds.some(id => job.technologyIds?.includes(id)) 
          : true;

        return matchQuery && matchDomain && matchSkill && matchTech;
      }),
    [jobs, query, domainIds, skillIds, techIds],
  );
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedJobs = filteredJobs.slice(
    (effectivePage - 1) * JOBS_PER_PAGE,
    effectivePage * JOBS_PER_PAGE,
  );
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Cơ hội dành cho chuyên gia"
          description="Chuyên gia xem thông tin các dự án và nộp đề xuất đến doanh nghiệp."
        />
      </div>
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              resetPagination();
            }}
            placeholder="Tìm theo từ khóa..."
          />
          <MultiSelect
            label="Tất cả Lĩnh vực"
            options={domains.map(d => ({ value: d.domainId, label: d.domainName }))}
            selectedValues={domainIds}
            onChange={(values) => {
              setDomainIds(values);
              resetPagination();
            }}
          />
          <MultiSelect
            label="Tất cả Kỹ năng"
            options={skills.map(s => ({ value: s.skillId, label: s.skillName }))}
            selectedValues={skillIds}
            onChange={(values) => {
              setSkillIds(values);
              resetPagination();
            }}
          />
          <MultiSelect
            label="Tất cả Công nghệ"
            options={technologies.map(t => ({ value: t.technologyId, label: t.technologyName }))}
            selectedValues={techIds}
            onChange={(values) => {
              setTechIds(values);
              resetPagination();
            }}
          />
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {paginatedJobs.map((job) => (
          <JobCard key={job.jobId} job={job} hideStatus={true} compact />
        ))}
      </div>
      {filteredJobs.length === 0 && (
        <EmptyState
          title="Chưa có job mở"
          description="Dữ liệu được lấy trực tiếp từ backend `/api/v1/jobs`."
        />
      )}
      {filteredJobs.length > JOBS_PER_PAGE && (
        <Card className="sticky bottom-4 z-20 flex flex-col gap-3 bg-white/95 p-4 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Hiển thị {paginatedJobs.length} trên tổng {filteredJobs.length} cơ hội
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={effectivePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              title="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "h-9 min-w-9 rounded-xl px-3 text-sm font-extrabold transition",
                  effectivePage === page
                    ? "bg-pink-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-pink-100 hover:text-pink-600",
                )}
              >
                {page}
              </button>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={effectivePage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              title="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
