import { api, setDataMode } from "./apiClient";
import type { GenerateSowRequest, GenerateSowResponse } from "./api.types";

export const sowApi = {
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
