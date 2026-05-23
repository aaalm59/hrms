import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { addNotification } from "@/redux/slices/notificationSlice";

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000/ws";

export function useNotificationWebSocket(isAuthenticated) {
  const dispatch = useDispatch();
  const ws = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("hrms_access_token");
    ws.current = new WebSocket(`${WS_BASE}/notifications/?token=${token}`);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      dispatch(addNotification(data));
    };

    ws.current.onerror = () => {};
    ws.current.onclose = () => {};

    return () => ws.current?.close();
  }, [isAuthenticated, dispatch]);
}
