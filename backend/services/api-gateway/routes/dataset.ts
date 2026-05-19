import express from 'express';
import { createDatasetController } from '../controllers/datasetController.js';

export function createDatasetRouter(options: any = {}) {
  const router = express.Router();
  const controller = createDatasetController(options);

  router.post("/upload", controller.upload.single("file"), controller.uploadDataset);
  router.get("/history", controller.getHistory);
  router.get("/anomalies", controller.getAnomalies);
  router.get("/trends", controller.getTrends);
  router.get("/imports", controller.getImports);

  return router;
}
