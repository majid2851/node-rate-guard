import express from "express";
import { rateGuard } from "../src/index.js";

const app = express();
app.use(express.json());

const loginLimiter = rateGuard({
  windowMs: 15 * 60_000,
  max: 5,
  message: "Too many login attempts. Please try again after 15 minutes.",
  statusCode: 429,
  keyGenerator: (req) => {
    const body = req.body as { email?: string };
    return body.email ?? req.ip ?? "unknown";
  },
});

const apiLimiter = rateGuard({
  windowMs: 60_000,
  max: 100,
});

app.post("/auth/login", loginLimiter, (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (email === "test@example.com" && password === "password123") {
    res.json({
      success: true,
      token: "jwt-token-here",
    });
  } else {
    res.status(401).json({
      success: false,
      error: "Invalid credentials",
    });
  }
});

app.post("/auth/register", loginLimiter, (req, res) => {
  res.json({
    success: true,
    message: "User registered",
  });
});

app.use("/api", apiLimiter);

app.get("/api/profile", (_req, res) => {
  res.json({
    id: 1,
    name: "Test User",
    email: "test@example.com",
  });
});

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("\nEndpoints:");
  console.log("  POST /auth/login    - 5 attempts per 15 minutes");
  console.log("  POST /auth/register - 5 attempts per 15 minutes");
  console.log("  GET  /api/profile   - 100 requests per minute");
});
