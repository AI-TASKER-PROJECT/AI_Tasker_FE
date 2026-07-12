import type { Domain, Skill } from "../../services";

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
