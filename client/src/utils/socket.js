// client/src/utils/socket.js
import { io } from "socket.io-client";

const BASE_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const socket = io(BASE_URL, {
  path: "/socket.io",
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: true,
});

socket.on("connect_error", (err) => {
  // helpful, but non-blocking
  console.warn("Socket connect_error:", err?.message || err);
});

export default socket;
