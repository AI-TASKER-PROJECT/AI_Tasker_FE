export interface Domain {
  domainId: number;
  domainCode: string;
  domainName: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Skill {
  skillId: number;
  skillCode: string;
  skillName: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Technology {
  technologyId: number;
  technologyCode: string;
  technologyName: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobDomain {
  id: { jobId: number; domainId: number };
  createdAt?: string;
}

export interface JobSkill {
  id: { jobId: number; skillId: number };
  isMandatory: boolean;
  createdAt?: string;
}

export interface JobTechnology {
  id: { jobId: number; technologyId: number };
  createdAt?: string;
}

export interface GenerateSowRequest {
  projectTitle: string;
  rawRequirement: string;
  budget: number;
  duration: number;
  durationUnit: string;
  supportFields?: string[];
  requiredSkills?: string[];
}

export interface GeneratedSow {
  title?: string;
  overview?: string;
  objectives?: string[];
  scopeOfWork?: string[];
  deliverables?: string[];
  assumptions?: string[];
  outOfScope?: string[];
}

export interface GeneratedSowMilestone {
  name?: string;
  description?: string;
  duration?: number;
  durationUnit?: string;
  budget?: number;
  acceptanceCriteria?: string[];
}

export interface GenerateSowResponse {
  needMoreInfo?: boolean;
  questions?: string[];
  sow?: GeneratedSow;
  milestones?: GeneratedSowMilestone[];
}

export interface ChatbotResponse {
  answer: string;
  sources: string[];
}

export interface ExpertRecommendationResponse {
  expertId: number;
  portfolioId?: number;
  rankPosition: number;
  matchScore?: number;
  matchedSkills?: string[];
  matchedDomains?: string[];
  reason?: string;
  businessSelected?: boolean;
}

export interface ExpertRecommendationListResponse {
  jobPostingId: number;
  recommendations: ExpertRecommendationResponse[];
  generatedByAi?: boolean;
  message?: string;
}
