// src/hooks/useUserWebSocket.js
import { useEffect, useRef } from "react";

export default function useUserWebSocket() {
  const wsRef = useRef(null);

  useEffect(() => {
    const access =
      sessionStorage.getItem("access") || localStorage.getItem("access");
    if (!access) return; // not logged in

    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    // Adjust path if your Channels route differs
    const url = `${scheme}://${window.location.host}/ws/profile/?token=${access}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        if (msg.type === "force_logout") {
          try {
            sessionStorage.clear();
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
          } finally {
            alert("You were logged out because your account was used on another device.");
            window.location.assign("/login?reason=other_device");
          }
          return;
        }

        // handle your other messages here (e.g., profile_update)
        // if (msg.type === "profile_update") { ... }
      } catch {}
    };

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, []);
}
