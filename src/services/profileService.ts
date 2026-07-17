import { api, call, setDataMode } from "./apiClient";
import type { ApiResponse, BusinessProfile, ExpertProfile, Portfolio, TaxCheckResponse } from "../types";
import { marketplaceApi } from "./marketplaceService";

export const profileApi = {
  // Lưu hoặc cập nhật hồ sơ doanh nghiệp của user hiện tại.
  // Chức năng 1: Lưu hoặc cập nhật hồ sơ định danh doanh nghiệp của người dùng hiện tại.
  upsertBusiness(payload: Partial<BusinessProfile>) {
    return call<BusinessProfile>({
      method: "POST",
      url: "/api/v1/profiles/business",
      data: payload,
    });
  },
  // Lấy hồ sơ doanh nghiệp của user hiện tại.
  // Chức năng 2: Lấy hồ sơ định danh doanh nghiệp của người dùng hiện tại.
  getMyBusiness() {
    return call<BusinessProfile>({
      method: "GET",
      url: "/api/v1/profiles/business/me",
    });
  },
  // Upload file giấy phép kinh doanh và trả về URL/path để lưu vào hồ sơ doanh nghiệp.
  // Chức năng 3: Upload giấy phép kinh doanh để đính kèm vào hồ sơ định danh doanh nghiệp.
  uploadBusinessLicense(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/business/license-file", //cập nhật GPKD
      data: formData,
    });
  },
  // Lưu hoặc cập nhật hồ sơ chuyên gia của user hiện tại.
  // Chức năng 4: Lưu hoặc cập nhật hồ sơ định danh chuyên gia của người dùng hiện tại.
  upsertExpert(payload: Partial<ExpertProfile>) {
    return call<ExpertProfile>({
      method: "POST",
      url: "/api/v1/profiles/expert",//cập nhật hồ sơ CG
      data: payload,
    });
  },
  // Lấy hồ sơ chuyên gia của user hiện tại.
  // Chức năng 5: Lấy hồ sơ định danh chuyên gia của người dùng hiện tại.
  getMyExpert() {
    return call<ExpertProfile>({
      method: "GET",
      url: "/api/v1/profiles/expert/me", //lấy thông tin expert dựa trên access token
    });
  },
  // Upload file hồ sơ năng lực của chuyên gia và trả về URL/path để lưu vào hồ sơ chuyên gia.
  // Chức năng 6: Upload file hồ sơ năng lực để đính kèm vào hồ sơ chuyên gia.
  uploadExpertPortfolio(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/expert/portfolio-file", //cập nhật hồ sơ năng lực
      data: formData,
    });
  },
  // Lưu hoặc cập nhật hồ sơ năng lực của chuyên gia hiện tại.
  // Chức năng 7: Lưu hoặc cập nhật portfolio năng lực của chuyên gia.
  upsertPortfolio(payload: Partial<Portfolio>) {
    return call<Portfolio>({
      method: "POST",
      url: "/api/v1/profiles/portfolio", //cập nhật thêm hồ sơ năng lực trên nền tảng
      data: payload,
    });
  },
  // Lấy portfolio của chuyên gia hiện tại để tham chiếu khi nộp proposal.
  // Chức năng 8: Lấy portfolio của chuyên gia hiện tại để tham chiếu khi nộp proposal.
  getMyPortfolio() {
    return call<Portfolio>({
      method: "GET",
      url: "/api/v1/profiles/portfolio/me",//lấy thông tin portfolio
    });
  },
  // Upload file chứng chỉ của chuyên gia và trả về URL/path để lưu vào hồ sơ năng lực.
  // Chức năng 9: Upload chứng chỉ chuyên gia để đính kèm vào portfolio.
  uploadExpertCertificate(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/portfolio/certificate-file",//cập nhật chứng chỉ
      data: formData,
    });
  },
  // Upload file đính kèm proposal và trả về URL/path để gửi cùng payload proposal.
  // Chức năng 10: Upload file đính kèm proposal và trả về URL/path để gửi cùng proposal.
  uploadProposalFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/proposals/file",//cập nhật file dề xuất
      data: formData,
    });
  },
  // Lấy danh sách hồ sơ doanh nghiệp để admin duyệt hồ sơ.
  // Chức năng 11: Lấy danh sách hồ sơ doanh nghiệp để Staff/Admin duyệt định danh.
  listBusinesses() {
    return call<BusinessProfile[]>({
      method: "GET",
      url: "/api/v1/profiles/business",//lấy ra danh sách DN
    });
  },
  // Lấy hồ sơ doanh nghiệp theo Job để chuyên gia xem trước khi quyết định nộp proposal.
  // Chức năng 12: Lấy hồ sơ doanh nghiệp theo Job để chuyên gia xem trước khi nộp proposal.
  getBusinessByJob(jobId: number) {
    return call<BusinessProfile>({
      method: "GET",
      url: `/api/v1/profiles/business/by-job/${jobId}`,//Lấy ra DN dựa trên jobId
    });
  },
  // Lấy hồ sơ doanh nghiệp theo ID để admin duyệt hồ sơ.
  // Chức năng 13: Lấy hồ sơ doanh nghiệp theo ID để xem chi tiết hoặc duyệt định danh.
  getBusinessById(businessId: number) {
    return call<BusinessProfile>({
      method: "GET",
      url: `/api/v1/profiles/business/${businessId}`,
    });
  },
  // Lấy danh sách các job của một doanh nghiệp.
  // Chức năng 14: Lấy danh sách Job thuộc một doanh nghiệp.
  listBusinessJobs(businessId: number) {
    return marketplaceApi.listJobs().then(list => list.filter(j => j.businessId === businessId));
  },
  // Lấy danh sách chuyên gia.
  // Chức năng 15: Lấy danh sách hồ sơ chuyên gia để Staff/Admin duyệt định danh.
  listExperts() {
    return call<ExpertProfile[]>({
      method: "GET",
      url: "/api/v1/profiles/expert", //lấy ra danh sách hồ sơ
    });
  },
  // Lấy hồ sơ chuyên gia theo ID để admin duyệt hồ sơ.
  // Chức năng 16: Lấy hồ sơ chuyên gia theo ID để xem chi tiết hoặc duyệt định danh.
  getExpertById(expertId: number) {
    return call<ExpertProfile>({
      method: "GET",
      url: `/api/v1/profiles/expert/${expertId}`,
    });
  },
  // Lấy danh sách hồ sơ năng lực.
  // Chức năng 17: Lấy danh sách portfolio để xem năng lực chuyên gia.
  listPortfolios() {
    return call<Portfolio[]>({
      method: "GET",
      url: "/api/v1/profiles/portfolio",//lấy ra ds portfolio
    });
  },
  
  // Chức năng 18: Tìm portfolio theo expertId từ danh sách portfolio.
  getPortfolioByExpert(expertId: number) {
    return profileApi
      .listPortfolios()
      .then((items) => items.find((item) => item.expertId === expertId) || null);
  },
  // Lấy URL để xem file đính kèm hồ sơ doanh nghiệp hoặc chuyên gia.
  // Chức năng 19: Lấy URL xem file đính kèm của hồ sơ hoặc proposal.
  getFileViewUrl(path: string) {
    return call<string>({
      method: "GET",
      url: "/api/v1/profiles/files/view-url",//lấy ra file 
      params: { path },
    });
  },
  // Duyệt hồ sơ doanh nghiệp hoặc chuyên gia.
  // Chức năng 20: Duyệt hoặc từ chối hồ sơ định danh doanh nghiệp/chuyên gia.
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
  // Kiểm tra mã số thuế của doanh nghiệp để xác thực hồ sơ doanh nghiệp.
  // Chức năng 21: Kiểm tra mã số thuế để xác thực hồ sơ doanh nghiệp.
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
