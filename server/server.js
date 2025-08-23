import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import connectDB from "./configs/db.js";
import "dotenv/config";
import userRouter from "./routes/userRoute.js";
import sellerRouter from "./routes/sellerRoute.js";
import connectCloudinary from "./configs/cloudinary.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import addressRouter from "./routes/addressRoute.js";
import orderRouter from "./routes/orderRoute.js";
import { stripeWebhooks } from "./controllers/orderController.js";

const app = express();
const port = process.env.PORT || 5000;

const ORIGINS = [process.env.CLIENT_URL, process.env.CLIENT_URL_PROD].filter(Boolean);
const allowed = new Set(ORIGINS);

await connectDB();
await connectCloudinary();

app.set("trust proxy", 1);

// ----- CORS (allow prod + localhost + any *.vercel.app preview) -----
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow curl/postman/no-origin
    try {
      const url = new URL(origin);
      const ok =
        allowed.has(origin) ||
        url.hostname.endsWith(".vercel.app"); // ✅ previews
      return ok ? cb(null, true) : cb(new Error("Not allowed by CORS"));
    } catch {
      return cb(new Error("Bad Origin"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight

app.use(cookieParser());

// ----- Stripe webhook BEFORE json parser (raw body) -----
app.post(
  "/api/order/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

// regular json for everything else
app.use(express.json({ limit: "1mb" }));

// ----- Health + routes -----
app.get("/", (_req, res) => res.send("API is Working"));
app.get("/healthz", (_req, res) => res.json({ ok: true, time: Date.now() }));

app.use("/api/user", userRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);
app.use("/api/order", orderRouter);

// ----- HTTP server + Socket.IO -----
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      try {
        const url = new URL(origin);
        const ok =
          allowed.has(origin) ||
          url.hostname.endsWith(".vercel.app");
        return ok ? cb(null, true) : cb(new Error("Not allowed by CORS"));
      } catch {
        return cb(new Error("Bad Origin"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH"],
  },
});
global.io = io;

io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
});

server.listen(port, () => {
  const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  console.log(`🚀 Server running on ${host}`);
  console.log(`   Allowed base origins: ${ORIGINS.join(", ") || "(none set)"}`);
});
