import express from "express";
import { pollAndSaveMetrics } from "../services/prometheusService.ts";
import { prisma } from "../shared/db/index.ts";

const router = express.Router();

router.get("/live", async (req, res) => {
  const data = await pollAndSaveMetrics();
  res.json(data);
});

router.get("/history", async (req, res) => {
  try {
    const history = await prisma.telemetry.findMany({
      orderBy: { recordedAt: 'desc' },
      take: 100
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.get("/anomalies", async (req, res) => {
  try {
    const anomalies = await prisma.dangerEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch anomalies" });
  }
});

// Fallback for general /api/metrics
router.get("/", async (req, res) => {
  const data = await pollAndSaveMetrics();
  res.json(data);
});

export default router;
