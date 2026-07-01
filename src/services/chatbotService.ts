import { api } from "./apiClient";
import type { ChatbotResponse } from "./api.types";

export const chatbotApi = {
  ask(question: string) {
    return api
      .post<ChatbotResponse>('/api/chatbot/ask', { question })
      .then((response) => response.data);
  },
};
