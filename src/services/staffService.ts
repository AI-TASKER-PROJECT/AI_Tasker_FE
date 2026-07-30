import { call } from "./apiClient";
import type { Staff } from "../types";

export const staffApi = {
  current() {
    return call<Staff>({ method: "GET", url: "/api/v1/staff/me" });
  },
};
