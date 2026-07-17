import { call } from "./apiClient";
import type { AcceptanceCriteria } from "../types";
import type {
  Domain,
  JobDomain,
  JobSkill,
  JobTechnology,
  Skill,
  Technology,
} from "./api.types";

export const catalogApi = {
  // Lấy danh sách lĩnh vực để người dùng chọn domain chính khi tạo Job.
  listDomains(activeOnly = true) {
    return call<Domain[]>({
      method: "GET",
      url: "/api/v1/domains",
      params: { activeOnly },
    });
  },
  // Tạo domain mới, dùng khi admin thêm lĩnh vực mới vào hệ thống.
  createDomain(payload: Partial<Domain>) {
    return call<Domain>({
      method: "POST",
      url: "/api/v1/domains",
      data: payload,
    });
  },
  // Cập nhật domain, dùng khi admin chỉnh sửa thông tin lĩnh vực.
  updateDomain(domainId: number, payload: Partial<Domain>) {
    return call<Domain>({
      method: "PATCH",
      url: `/api/v1/domains/${domainId}`,
      data: payload,
    });
  },
  // Xóa domain, dùng khi admin xóa lĩnh vực khỏi hệ thống.
  deleteDomain(domainId: number) {
    return call<Domain>({
      method: "DELETE",
      url: `/api/v1/domains/${domainId}`,
    });
  },
  // Lấy danh sách skill để gắn yêu cầu chuyên môn cho Job.
  listSkills(activeOnly = true) {
    return call<Skill[]>({
      method: "GET",
      url: "/api/v1/skills",
      params: { activeOnly },
    });
  },
  // Tạo skill mới, dùng khi admin thêm kỹ năng mới vào hệ thống.
  createSkill(payload: Partial<Skill>) {
    return call<Skill>({
      method: "POST",
      url: "/api/v1/skills",
      data: payload,
    });
  },
  // Cập nhật skill, dùng khi admin chỉnh sửa thông tin kỹ năng.
  updateSkill(skillId: number, payload: Partial<Skill>) {
    return call<Skill>({
      method: "PATCH",
      url: `/api/v1/skills/${skillId}`,
      data: payload,
    });
  },
  // Xóa skill, dùng khi admin xóa kỹ năng khỏi hệ thống.
  deleteSkill(skillId: number) {
    return call<Skill>({
      method: "DELETE",
      url: `/api/v1/skills/${skillId}`,
    });
  },
  // Lấy danh sách technology để gắn nền tảng/công nghệ cho Job.
  listTechnologies(activeOnly = true) {
    return call<Technology[]>({
      method: "GET",
      url: "/api/v1/technologies",
      params: { activeOnly },
    });
  },
  // Tạo technology mới, dùng khi admin thêm nền tảng/công nghệ mới vào hệ thống.
  createTechnology(payload: Partial<Technology>) {
    return call<Technology>({
      method: "POST",
      url: "/api/v1/technologies",
      data: payload,
    });
  },
  // Cập nhật technology, dùng khi admin chỉnh sửa thông tin nền tảng/công nghệ.
  updateTechnology(technologyId: number, payload: Partial<Technology>) {
    return call<Technology>({
      method: "PATCH",
      url: `/api/v1/technologies/${technologyId}`,
      data: payload,
    });
  },
  // Xóa technology, dùng khi admin xóa nền tảng/công nghệ khỏi hệ thống.
  deleteTechnology(technologyId: number) {
    return call<Technology>({
      method: "DELETE",
      url: `/api/v1/technologies/${technologyId}`,
    });
  },
  // Lấy danh sách tiêu chí chấp nhận (Acceptance Criteria) để gắn cho Job.
  listAcceptanceCriteria(activeOnly = true) {
    void activeOnly;
    return Promise.resolve([] as AcceptanceCriteria[]);
  },
  // Lấy domain đã gắn với Job để mở lại màn chỉnh sửa Job và gắn domainId vào payload proposal.
  listJobDomains(jobId: number) {
    return call<JobDomain[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/domains`,
    });
  },
  // Ghi đè domain của Job sau khi lưu nháp hoặc cập nhật Job.
  replaceJobDomains(jobId: number, domainIds: number[]) {
    return call<JobDomain[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/domains`,
      data: domainIds,
    });
  },
  // Lấy skill đã gắn với Job để mở lại màn chỉnh sửa Job và gắn skillId vào payload proposal.
  listJobSkills(jobId: number) {
    return call<JobSkill[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/skills`,
    });
  },
  // Ghi đè danh sách skill của Job, bao gồm cờ bắt buộc nếu có.
  replaceJobSkills(
    jobId: number,
    assignments: Array<{
      skillId: number;
      isMandatory?: boolean;
    }>,
  ) {
    return call<JobSkill[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/skills`,
      data: assignments,
    });
  },
  // Lấy technology đã gắn với Job để chỉnh sửa Job hoặc để chuyên gia hiểu bối cảnh trước khi nộp proposal.
  listJobTechnologies(jobId: number) {
    return call<JobTechnology[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/technologies`,
    });
  },
  // Ghi đè danh sách technology của Job sau khi người dùng chỉnh lựa chọn.
  replaceJobTechnologies(jobId: number, technologyIds: number[]) {
    return call<JobTechnology[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/technologies`,
      data: technologyIds,
    });
  },
};
