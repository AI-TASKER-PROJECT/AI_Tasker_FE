import type { Domain, GeneratedSow, Skill } from "../../services";

export type SkillAssignment = {
  skillId: number;
  isMandatory: boolean;
};

export type MilestoneDraft = {
  milestoneName: string;
  description?: string;
  fundsAllocated: string;
  orderIndex: string;
  durationValue: string;
  acceptanceCriteria: string[];
};

export function renderListSection(title: string, values?: string[]) {
  if (!values || values.length === 0) return "";
  return `${title}:\n${values.map((item) => `- ${item}`).join("\n")}`;
}

export function formatGeneratedSow(sow?: GeneratedSow) {
  if (!sow) return "";

  const sowParts = [
    sow.overview ? `Tổng quan: ${sow.overview}` : "",
    renderListSection("Mục tiêu", sow.objectives),
    renderListSection("Phạm vi công việc", sow.scopeOfWork),
    renderListSection("Sản phẩm bàn giao", sow.deliverables),
    renderListSection("Giả dịnh", sow.assumptions),
    renderListSection("Ngoài phạm vi", sow.outOfScope),
  ];

  return sowParts
    .filter(Boolean)
    .join("\n\n");
}

export function skillCountLabel(count: number) {
  return `${count} kỹ năng`;
}

export function resolveSkillName(skillId: number, skills: Skill[]) {
  return skills.find((skill) => skill.skillId === skillId)?.skillName || "Kỹ năng chưa có tên";
}

export function resolveDomainName(domainId: number, domains: Domain[]) {
  return domains.find((domain) => domain.domainId === domainId)?.domainName || "Lĩnh vực chưa có tên";
}

export function jobDomainLabel(domainIds: number[], domains: Domain[]) {
  if (domainIds.length === 0) return "Chưa có lĩnh vực";
  const names = domainIds.map((domainId) => resolveDomainName(domainId, domains));
  return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0];
}

export function parseCatalogIdList(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}
