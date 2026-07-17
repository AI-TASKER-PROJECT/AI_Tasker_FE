import { api, setDataMode } from "./apiClient";
import type { GenerateSowRequest, GenerateSowResponse } from "./api.types";

export const sowApi = {
  // Gửi thông tin Job thô cho AI để sinh SoW và milestone gợi ý trước khi lưu Job.
  generate(payload: GenerateSowRequest) {
    return api
      .post<GenerateSowResponse>("/api/jobs/generate-sow", payload, {
        timeout: 60000,
      })
      .then((response) => {
        setDataMode("live");
        return response.data;
      });
  },
};

// ── Expert Recommendation AI ──────────────────────────────────────────────────
