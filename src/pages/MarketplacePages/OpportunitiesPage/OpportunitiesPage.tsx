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
            onChange={setQuery}
            placeholder="Tìm theo từ khóa..."
          />
          <MultiSelect
            label="Tất cả Lĩnh vực"
            options={domains.map(d => ({ value: d.domainId, label: d.domainName }))}
            selectedValues={domainIds}
            onChange={setDomainIds}
          />
          <MultiSelect
            label="Tất cả Kỹ năng"
            options={skills.map(s => ({ value: s.skillId, label: s.skillName }))}
            selectedValues={skillIds}
            onChange={setSkillIds}
          />
          <MultiSelect
            label="Tất cả Công nghệ"
            options={technologies.map(t => ({ value: t.technologyId, label: t.technologyName }))}
            selectedValues={techIds}
            onChange={setTechIds}
          />
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {filteredJobs.map((job) => (
          <JobCard key={job.jobId} job={job} hideStatus={true} />
        ))}
      </div>
      {filteredJobs.length === 0 && (
        <EmptyState
          title="Chưa có job mở"
          description="Dữ liệu được lấy trực tiếp từ backend `/api/v1/jobs`."
        />
      )}
    </div>
  );
}
