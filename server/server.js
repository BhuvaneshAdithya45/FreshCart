// server/server.js
import "dotenv/config";
import http from "http";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";

import connectDB from "./configs/db.js";
import connectCloudinary from "./configs/cloudinary.js";

import userRouter from "./routes/userRoute.js";
import sellerRouter from "./routes/sellerRoute.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import addressRouter from "./routes/addressRoute.js";
import orderRouter from "./routes/orderRoute.js";
import { stripeWebhooks } from "./controllers/orderController.js";

// ---------- App & Config ----------
const app = express();
const port = process.env.PORT || 5000;

// Allow these exact origins (set in .env)
//   CLIENT_URL=http://localhost:5173
//   CLIENT_URL_PROD=https://yourdomain.com
const ORIGINS = [process.env.CLIENT_URL, process.env.CLIENT_URL_PROD].filter(Boolean);
const allowed = new Set(ORIGINS);

// DB & Cloudinary
await connectDB();
await connectCloudinary();

// trust proxy when behind a platform proxy (Render/Vercel/etc.)
app.set("trust proxy", 1);

// ---------- CORS (localhost + prod + *.vercel.app previews) ----------
const dynamicOrigin = (origin, cb) => {
  if (!origin) return cb(null, true); // allow curl/postman/no-origin
  try {
    const url = new URL(origin);
    const ok = allowed.has(origin) || url.hostname.endsWith(".vercel.app");
    return ok ? cb(null, true) : cb(new Error("Not allowed by CORS"));
  } catch {
    return cb(new Error("Bad Origin"));
  }
};

const corsOptions = {
  origin: dynamicOrigin,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight

app.use(cookieParser());

// ---------- Stripe Webhook (RAW body) ----------
app.post(
  "/api/order/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

// Regular JSON body for everything else
app.use(express.json({ limit: "1mb" }));

// ---------- Health + Routes ----------
app.get("/", (_req, res) => res.send("API is Working"));
app.get("/healthz", (_req, res) => res.json({ ok: true, time: Date.now() }));

app.use("/api/user", userRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);
app.use("/api/order", orderRouter);

// 404 fallback
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({ success: false, message: err.message || "Server error" });
});

// ---------- HTTP Server + Socket.IO ----------
const server = http.createServer(app);

const io = new Server(server, {
  path: "/socket.io",
  cors: {
    origin: dynamicOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH"],
  },
});

// Make available to controllers (for stockUpdate emits)
global.io = io;

io.on("connection", (socket) => {
  console.log("⚡ Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Socket disconnected:", socket.id));
});

// ---------- Start ----------
server.listen(port, () => {
  const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  console.log(`🚀 Server running on ${host}`);
  console.log(`   Allowed origins: ${ORIGINS.join(", ") || "(none set)"}`);
});
