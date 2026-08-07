const BASE_URL = "/api";

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

// WebSocket Singleton Connection
let socket: WebSocket | null = null;
const listeners = new Set<(event: { type: string; data: any }) => void>();

export function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  socket = new WebSocket(wsUrl);

  socket.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      listeners.forEach((fn) => fn(payload));
    } catch {
      // Ignore
    }
  };

  socket.onclose = () => {
    console.log("[WS] Connection closed. Reconnecting in 3s...");
    setTimeout(() => {
      connectWebSocket();
    }, 3000);
  };

  socket.onerror = (err) => {
    console.error("[WS] Error:", err);
  };
}

export function subscribeWebSocket(callback: (event: { type: string; data: any }) => void) {
  listeners.add(callback);
  connectWebSocket();
  return () => {
    listeners.delete(callback);
  };
}
