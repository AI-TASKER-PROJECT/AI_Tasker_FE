import { call } from "./apiClient";
import type { AcceptanceCriteria } from "../types";
import type { Domain, JobDomain, JobSkill, JobTechnology, Skill, Technology } from "./api.types";

export const catalogApi = {
  listDomains(activeOnly = true) {
    return call<Domain[]>({
      method: "GET",
      url: "/api/v1/domains", //lấy list lĩnh vực
      params: { activeOnly },
    });
  },
  createDomain(payload: Partial<Domain>) {
    return call<Domain>({
      method: "POST",
      url: "/api/v1/domains",//cập nhật list lĩnh vực
      data: payload,
    });
  },
  updateDomain(domainId: number, payload: Partial<Domain>) {
    return call<Domain>({
      method: "PATCH",
      url: `/api/v1/domains/${domainId}`, //chỉ cập nhật 1 domain
      data: payload,
    });
  },
  listSkills(activeOnly = true) {
    return call<Skill[]>({
      method: "GET",
      url: "/api/v1/skills", //lấy list skill
      params: { activeOnly },
    });
  },
  createSkill(payload: Partial<Skill>) {
    return call<Skill>({
      method: "POST",
      url: "/api/v1/skills", //cập nhật list slill
      data: payload,
    });
  },
  updateSkill(skillId: number, payload: Partial<Skill>) {
    return call<Skill>({
      method: "PATCH",
      url: `/api/v1/skills/${skillId}`, //cập nhật 1 skill
      data: payload,
    });
  },
  listTechnologies(activeOnly = true) {
    return call<Technology[]>({
      method: "GET",
      url: "/api/v1/technologies",//lấy ds CN
      params: { activeOnly },
    });
  },
  listAcceptanceCriteria(activeOnly = true) {
    return call<AcceptanceCriteria[]>({
      method: "GET",
      url: "/api/v1/acceptance-criteria",//lấy ds nghiệm thu
      params: { activeOnly },
    });
  },
  listJobDomains(jobId: number) {
    return call<JobDomain[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/domains`, //lấy ds JobDomain dựa trên jobId
    });
  },
  replaceJobDomains(jobId: number, domainIds: number[]) {
    return call<JobDomain[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/domains`,//cập nhật 1 JobDomains dựa trên jobId
      data: domainIds,
    });
  },
  listJobSkills(jobId: number) {
    return call<JobSkill[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/skills`,//lấy ra ds JobSkill dựa trên JobId
    });
  },
  replaceJobSkills(
    jobId: number,
    assignments: Array<{
      skillId: number;
      isMandatory?: boolean;
    }>,
  ) {
    return call<JobSkill[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/skills`,//cập nhật 1 JobSkill dựa trên jobId
      data: assignments,
    });
  },
  listJobTechnologies(jobId: number) {
    return call<JobTechnology[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/technologies`,//lấy ra ds tech dựa trên jobId
    });
  },
};
