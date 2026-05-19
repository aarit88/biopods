import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';
import { KaggleImportService } from '../services/kaggleImportService.js';

export function createDatasetController(options: any = {}) {
  const service = options.service || new KaggleImportService(options);
  const uploadDir = options.uploadDir || path.join(os.tmpdir(), "biopods-dataset-uploads");

  const storage = multer.diskStorage({
    destination: (_req, _file, done) => {
      fs.mkdir(uploadDir, { recursive: true }, (error) => done(error, uploadDir));
    },
    filename: (_req, file, done) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      done(null, safeName);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: options.maxUploadBytes || 512 * 1024 * 1024,
    },
    fileFilter: (_req, file, done) => {
      if (/\.csv$/i.test(file.originalname)) {
        done(null, true);
        return;
      }
      done(new Error("Only CSV uploads are supported."));
    },
  });

  return {
    upload,

    uploadDataset: async (req: any, res: any, next: any) => {
      try {
        if (!req.file) {
          res.status(400).json({ success: false, error: "CSV file is required." });
          return;
        }

        const result = await service.importCsv(req.file);
        res.status(result.duplicate ? 200 : 201).json({
          success: true,
          ...result,
        });
      } catch (error) {
        next(error);
      } finally {
        if (req.file && req.file.path && options.cleanupUploads !== false) {
          fs.promises.unlink(req.file.path).catch(() => {});
        }
      }
    },

    getHistory: async (req: any, res: any, next: any) => {
      try {
        const data = await service.getHistory(req.query);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },

    getAnomalies: async (req: any, res: any, next: any) => {
      try {
        const data = await service.getAnomalies(req.query);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },

    getTrends: async (req: any, res: any, next: any) => {
      try {
        const data = await service.getTrends(req.query);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },

    getImports: async (req: any, res: any, next: any) => {
      try {
        const data = await service.getImports();
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },
  };
}
