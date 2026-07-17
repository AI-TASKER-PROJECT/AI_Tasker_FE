import type { Domain, GeneratedSow, Skill } from "../../services";

// Các kiểu dữ liệu liên quan đến việc tạo Job, dùng để chuẩn hóa dữ liệu trước khi gửi lên backend. 
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

// Render một nhóm nội dung SoW dạng danh sách để ghép vào ô mô tả Job.
export function renderListSection(title: string, values?: string[]) {
  if (!values || values.length === 0) return "";
  return `${title}:\n${values.map((item) => `- ${item}`).join("\n")}`;
}

// Chuyển SoW do AI trả về thành chuỗi dễ đọc để lưu vào structuredSow của Job.
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

// Tạo nhãn skill ngắn gọn cho Job trong màn tạo/quản lý.
export function skillCountLabel(count: number) {
  return `${count} kỹ năng`;
}

// Tìm tên skill từ id để gửi tên dễ hiểu cho AI khi tạo SoW.
export function resolveSkillName(skillId: number, skills: Skill[]) {
  return skills.find((skill) => skill.skillId === skillId)?.skillName || "Kỹ năng chưa có tên";
}

// Tìm tên domain từ id để gửi lĩnh vực dễ hiểu cho AI khi tạo SoW.
export function resolveDomainName(domainId: number, domains: Domain[]) {
  return domains.find((domain) => domain.domainId === domainId)?.domainName || "Lĩnh vực chưa có tên";
}

// Tạo nhãn domain ngắn gọn cho Job trong màn tạo/quản lý.
export function jobDomainLabel(domainIds: number[], domains: Domain[]) {
  if (domainIds.length === 0) return "Chưa có lĩnh vực";
  const names = domainIds.map((domainId) => resolveDomainName(domainId, domains));
  return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0];
}

// Chuyển chuỗi danh sách id (ví dụ "1,2,3") thành mảng số để lưu vào Job.
export function parseCatalogIdList(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}
