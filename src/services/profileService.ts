import { api, call, setDataMode } from "./apiClient";
import type { ApiResponse, BusinessProfile, ExpertProfile, Portfolio, TaxCheckResponse } from "../types";
import { marketplaceApi } from "./marketplaceService";

export const profileApi = {
  upsertBusiness(payload: Partial<BusinessProfile>) {
    return call<BusinessProfile>({
      method: "POST",
      url: "/api/v1/profiles/business", //Cập nhật/Tạo mới hồ sơ Doanh nghiệp.
      data: payload,
    });
  },
  getMyBusiness() {
    return call<BusinessProfile>({
      method: "GET",
      url: "/api/v1/profiles/business/me", //Lấy hồ sơ Doanh nghiệp của user hiện tại.
    });
  },
  uploadBusinessLicense(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/business/license-file", //cập nhật GPKD
      data: formData,
    });
  },
  upsertExpert(payload: Partial<ExpertProfile>) {
    return call<ExpertProfile>({
      method: "POST",
      url: "/api/v1/profiles/expert",//cập nhật hồ sơ CG
      data: payload,
    });
  },
  getMyExpert() {
    return call<ExpertProfile>({
      method: "GET",
      url: "/api/v1/profiles/expert/me", //lấy thông tin expert dựa trên access token
    });
  },
  uploadExpertPortfolio(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      // Backend hiện chỉ expose endpoint upload file expert dưới nhánh portfolio.
      url: "/api/v1/profiles/portfolio/certificate-file", //cập nhật hồ sơ năng lực
      data: formData,
    });
  },
  upsertPortfolio(payload: Partial<Portfolio>) {
    return call<Portfolio>({
      method: "POST",
      url: "/api/v1/profiles/portfolio", //cập nhật thêm hồ sơ năng lực trên nền tảng
      data: payload,
    });
  },
  getMyPortfolio() {
    return call<Portfolio>({
      method: "GET",
      url: "/api/v1/profiles/portfolio/me",//lấy thông tin portfolio
    });
  },
  uploadExpertCertificate(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/portfolio/certificate-file",//cập nhật chứng chỉ
      data: formData,
    });
  },
  uploadProposalFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/proposals/file",//cập nhật file dề xuất
      data: formData,
    });
  },
  listBusinesses() {
    return call<BusinessProfile[]>({
      method: "GET",
      url: "/api/v1/profiles/business",//lấy ra danh sách DN
    });
  },
  getBusinessByJob(jobId: number) {
    return call<BusinessProfile>({
      method: "GET",
      url: `/api/v1/profiles/business/by-job/${jobId}`,//Lấy ra DN dựa trên jobId
    });
  },
  getBusinessById(businessId: number) {
    return call<BusinessProfile>({
      method: "GET",
      url: `/api/v1/profiles/business/${businessId}`,
    });
  },
  listBusinessJobs(businessId: number) {
    return marketplaceApi.listJobs().then(list => list.filter(j => j.businessId === businessId));
  },
  listExperts() {
    return call<ExpertProfile[]>({
      method: "GET",
      url: "/api/v1/profiles/expert", //lấy ra danh sách hồ sơ
    });
  },
  getExpertById(expertId: number) {
    return call<ExpertProfile>({
      method: "GET",
      url: `/api/v1/profiles/expert/${expertId}`,
    });
  },
  listPortfolios() {
    return call<Portfolio[]>({
      method: "GET",
      url: "/api/v1/profiles/portfolio",//lấy ra ds portfolio
    });
  },
  getPortfolioByExpert(expertId: number) {
    return call<Portfolio>({
      method: "GET",
      url: `/api/v1/profiles/portfolio/expert/${expertId}`,
    });
  },
  getFileViewUrl(path: string) {
    return call<string>({
      method: "GET",
      url: "/api/v1/profiles/files/view-url",//lấy ra file 
      params: { path },
    });
  },
  approve(
    type: "BUSINESS" | "EXPERT",
    profileId: number,
    status: "Approved" | "Rejected",
    reason?: string,
  ) {
    return call<BusinessProfile | ExpertProfile>({
      method: "POST",
      url: `/api/v1/profiles/approve/${type}/${profileId}`,//cập nhật trạng thái cho user
      params: { status, reason },
    });
  },
  async checkTaxCode(taxCode: string) {
    const response = await api.request<
      TaxCheckResponse | ApiResponse<TaxCheckResponse>
    >({
      method: "GET",
      url: `/api/auth/tax-check/${encodeURIComponent(taxCode)}`,//lấy mã số thuế dể check
    });
    const body = response.data;
    setDataMode("live");
    if (
      body &&
      typeof body === "object" &&
      "data" in body &&
      "success" in body
    ) {
      return (body as ApiResponse<TaxCheckResponse>).data;
    }
    return body as TaxCheckResponse;
  },
};
