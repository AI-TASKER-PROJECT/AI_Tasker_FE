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
  listDomains(activeOnly = true) {
    return call<Domain[]>({
      method: "GET",
      url: "/api/v1/domains",
      params: { activeOnly },
    });
  },
  createDomain(payload: Partial<Domain>) {
    return call<Domain>({
      method: "POST",
      url: "/api/v1/domains",
      data: payload,
    });
  },
  updateDomain(domainId: number, payload: Partial<Domain>) {
    return call<Domain>({
      method: "PATCH",
      url: `/api/v1/domains/${domainId}`,
      data: payload,
    });
  },
  deleteDomain(domainId: number) {
    return call<Domain>({
      method: "DELETE",
      url: `/api/v1/domains/${domainId}`,
    });
  },
  listSkills(activeOnly = true) {
    return call<Skill[]>({
      method: "GET",
      url: "/api/v1/skills",
      params: { activeOnly },
    });
  },
  createSkill(payload: Partial<Skill>) {
    return call<Skill>({
      method: "POST",
      url: "/api/v1/skills",
      data: payload,
    });
  },
  updateSkill(skillId: number, payload: Partial<Skill>) {
    return call<Skill>({
      method: "PATCH",
      url: `/api/v1/skills/${skillId}`,
      data: payload,
    });
  },
  deleteSkill(skillId: number) {
    return call<Skill>({
      method: "DELETE",
      url: `/api/v1/skills/${skillId}`,
    });
  },
  listTechnologies(activeOnly = true) {
    return call<Technology[]>({
      method: "GET",
      url: "/api/v1/technologies",
      params: { activeOnly },
    });
  },
  createTechnology(payload: Partial<Technology>) {
    return call<Technology>({
      method: "POST",
      url: "/api/v1/technologies",
      data: payload,
    });
  },
  updateTechnology(technologyId: number, payload: Partial<Technology>) {
    return call<Technology>({
      method: "PATCH",
      url: `/api/v1/technologies/${technologyId}`,
      data: payload,
    });
  },
  deleteTechnology(technologyId: number) {
    return call<Technology>({
      method: "DELETE",
      url: `/api/v1/technologies/${technologyId}`,
    });
  },
  listAcceptanceCriteria(activeOnly = true) {
    void activeOnly;
    return Promise.resolve([] as AcceptanceCriteria[]);
  },
  listJobDomains(jobId: number) {
    return call<JobDomain[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/domains`,
    });
  },
  replaceJobDomains(jobId: number, domainIds: number[]) {
    return call<JobDomain[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/domains`,
      data: domainIds,
    });
  },
  listJobSkills(jobId: number) {
    return call<JobSkill[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/skills`,
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
      url: `/api/v1/jobs/${jobId}/skills`,
      data: assignments,
    });
  },
  listJobTechnologies(jobId: number) {
    return call<JobTechnology[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/technologies`,
    });
  },
  replaceJobTechnologies(jobId: number, technologyIds: number[]) {
    return call<JobTechnology[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/technologies`,
      data: technologyIds,
    });
  },
};
