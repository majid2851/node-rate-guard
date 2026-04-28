import express from "express";
import { rateGuard } from "../src/index.js";

const app = express();

app.use(
  rateGuard({
    windowMs: 60_000,
    max: 10,
  })
);

app.get("/", (_req, res) => {
  res.json({ message: "Hello! You are within the rate limit." });
});

app.get("/api/data", (_req, res) => {
  res.json({
    data: [1, 2, 3, 4, 5],
    timestamp: Date.now(),
  });
});

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Rate limit: 10 requests per minute");
  console.log("Try hitting the endpoint multiple times to see rate limiting in action!");
});
