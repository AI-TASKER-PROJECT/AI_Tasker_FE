import type { NotificationItem } from "../types";

type NotificationSocketOptions = {
  token: string;
  onNotification: (notification: NotificationItem) => void;
  onStatus?: (connected: boolean) => void;
};

type NotificationSocket = {
  close: () => void;
};

function resolveSocketUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const base = apiBase || window.location.origin;
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const serverId = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  const sessionId = Math.random().toString(36).slice(2, 12);
  url.pathname = `/ws/${serverId}/${sessionId}/websocket`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function stompFrame(command: string, headers: Record<string, string> = {}, body = "") {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  return `${command}\n${headerLines.join("\n")}\n\n${body}\0`;
}

function parseFrame(raw: string) {
  const frame = raw.replace(/\0+$/, "");
  const divider = frame.indexOf("\n\n");
  const head = divider >= 0 ? frame.slice(0, divider) : frame;
  const body = divider >= 0 ? frame.slice(divider + 2) : "";
  const [command] = head.split("\n");
  return { command, body };
}

export function connectNotificationSocket({
  token,
  onNotification,
  onStatus,
}: NotificationSocketOptions): NotificationSocket {
  let closedByClient = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: number | undefined;

  const connect = () => {
    socket = new WebSocket(resolveSocketUrl());

    const sendStomp = (frame: string) => {
      socket?.send(JSON.stringify([frame]));
    };

    const connectStomp = () => {
      socket?.send(
        JSON.stringify([
          stompFrame("CONNECT", {
            "accept-version": "1.2",
            "heart-beat": "10000,10000",
            Authorization: `Bearer ${token}`,
          }),
        ]),
      );
    };

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string" || event.data === "\n" || event.data === "h") return;

      if (event.data === "o") {
        connectStomp();
        return;
      }

      const frames =
        event.data.startsWith("a")
          ? (JSON.parse(event.data.slice(1)) as string[])
          : event.data.split("\0").filter(Boolean).map((chunk) => `${chunk}\0`);

      for (const chunk of frames) {
        const frame = parseFrame(`${chunk}\0`);
        if (frame.command === "CONNECTED") {
          onStatus?.(true);
          sendStomp(
            stompFrame("SUBSCRIBE", {
              id: "user-notifications",
              destination: "/user/queue/notifications",
              ack: "auto",
            }),
          );
          continue;
        }

        if (frame.command === "MESSAGE") {
          try {
            onNotification(JSON.parse(frame.body) as NotificationItem);
          } catch {
            // Ignore malformed realtime payloads; REST refresh remains the source of truth.
          }
        }
      }
    });

    socket.addEventListener("close", () => {
      onStatus?.(false);
      if (!closedByClient) {
        reconnectTimer = window.setTimeout(connect, 3000);
      }
    });

    socket.addEventListener("error", () => {
      onStatus?.(false);
    });
  };

  connect();

  return {
    close() {
      closedByClient = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
