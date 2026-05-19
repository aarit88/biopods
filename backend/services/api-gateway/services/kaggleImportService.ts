import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import csv from 'csv-parser';
import { prisma } from '../../../shared/db/index.js';

const CONTAINER_SERVICES = [
  "accounts-db",
  "balancereader",
  "contacts",
  "frontend",
  "ledger-db",
  "ledgerwriter",
  "transactionhistory",
  "userservice",
];

const BOA_LABELS: Record<string, any> = {
  "0": { anomaly: false, attackType: null, status: "normal" },
  "1": { anomaly: true, attackType: "slowloris", status: "critical" },
  "2": { anomaly: true, attackType: "torshammer", status: "critical" },
};

export class KaggleImportService {
  private batchSize: number;
  private syntheticStart: Date;
  private syntheticIntervalSeconds: number;

  constructor(options: any = {}) {
    this.batchSize = options.batchSize || 500;
    this.syntheticStart = new Date(options.syntheticStart || "2024-01-01T00:00:00.000Z");
    this.syntheticIntervalSeconds = options.syntheticIntervalSeconds || 5;
  }

  async importCsv(file: any, options: any = {}) {
    const filePath = typeof file === "string" ? file : file.path;
    if (!filePath) {
      throw new Error("CSV file path is required.");
    }

    const sourceFile =
      options.sourceFile ||
      file.originalname ||
      file.filename ||
      path.basename(filePath);
    
    const stats = fs.statSync(filePath);
    const fileHash = await this.hashFile(filePath);

    const existingImport = await this.findExistingImport(fileHash);
    if (existingImport) {
      return {
        duplicate: true,
        importId: existingImport.id,
        detectedDatasetType: existingImport.datasetType,
        sourceFile: existingImport.sourceFile,
        fileHash,
        insertedRows: existingImport.rowsInserted,
        skippedRows: existingImport.rowsSkipped,
        message: "Dataset already imported; no new rows were inserted.",
      };
    }

    const headers = await this.readCsvHeaders(filePath);
    const datasetType = this.detectDatasetType(headers, sourceFile);
    
    if (!datasetType) {
      throw new Error(`Unsupported dataset format for ${sourceFile}. Expected Cloud anomaly or BoA container metric columns.`);
    }

    let insertedRows = 0;
    let skippedRows = 0;
    let sourceRows = 0;
    let batch: any[] = [];

    const stream = fs.createReadStream(filePath).pipe(
      csv({
        mapHeaders: ({ header }) => {
          const trimmed = (header || "").trim().replace(/^\uFEFF/, "");
          return trimmed || null;
        },
      })
    );

    for await (const row of stream) {
      sourceRows += 1;
      const records = this.normalizeRow(row, datasetType, sourceFile, sourceRows);
      
      for (const record of records) {
        if (!this.isUsefulRecord(record)) {
          skippedRows += 1;
          continue;
        }

        batch.push(record);
        if (batch.length >= this.batchSize) {
          insertedRows += await this.insertRecords(batch);
          batch = [];
        }
      }
    }

    if (batch.length) {
      insertedRows += await this.insertRecords(batch);
    }

    const importRecord = await this.createImportRecord({
      sourceFile,
      fileSize: BigInt(stats.size),
      fileHash,
      datasetType,
      rowsInserted: insertedRows,
      rowsSkipped: skippedRows,
      metadata: JSON.stringify({ sourceRows }),
    });

    return {
      duplicate: false,
      importId: importRecord.id,
      detectedDatasetType: datasetType,
      sourceFile,
      fileHash,
      sourceRows,
      insertedRows,
      skippedRows,
    };
  }

  normalizeRow(row: any, datasetType: string, sourceFile: string, rowNumber: number) {
    if (datasetType === "cloud_anomaly") {
      return [this.normalizeCloudAnomalyRow(row, sourceFile)];
    }

    if (datasetType === "boa_ml_ready") {
      return [this.normalizeBoaMlRow(row, sourceFile, rowNumber)];
    }

    if (datasetType === "boa_container_timeseries") {
      return this.normalizeBoaContainerTimeseriesRow(row, sourceFile);
    }

    return [];
  }

  normalizeCloudAnomalyRow(row: any, sourceFile: string) {
    const anomalyCode = this.cleanString(row["Anomaly status"]);

    return {
      collectedAt: this.parseDatasetTimestamp(row.timestamp),
      timeSynthetic: false,
      source: "kaggle",
      sourceFile,
      entityType: "vm",
      entityName: this.cleanString(row.vm_id),
      podName: null,
      nodeName: this.cleanString(row.vm_id),
      cpuUsage: this.numberOrNull(row.cpu_usage),
      memoryUsage: this.numberOrNull(row.memory_usage),
      memoryBytes: null,
      networkIo: this.numberOrNull(row.network_traffic),
      networkReceiveBytesRate: null,
      networkTransmitBytesRate: null,
      status: this.cleanString(row.task_status),
      anomalyLabel: anomalyCode === "1" ? true : anomalyCode === "0" ? false : null,
      labelCode: anomalyCode,
      attackType: anomalyCode === "1" ? "cloud_anomaly" : null,
      rawMetrics: JSON.stringify(row),
    };
  }

  normalizeBoaMlRow(row: any, sourceFile: string, rowNumber: number) {
    const labelCode = this.cleanString(row.label);
    const label = BOA_LABELS[labelCode as string] || {
      anomaly: labelCode === null ? null : labelCode !== "0",
      attackType: labelCode ? "unknown_attack" : null,
      status: labelCode && labelCode !== "0" ? "critical" : "normal",
    };
    const receive = this.numberOrNull(row.container_network_receive_bytes_rate);
    const transmit = this.numberOrNull(row.container_network_transmit_bytes_rate);

    return {
      collectedAt: this.syntheticTimestamp(this.syntheticStart, rowNumber, this.syntheticIntervalSeconds),
      timeSynthetic: true,
      source: "kaggle",
      sourceFile,
      entityType: "container",
      entityName: "frontend-microservice",
      podName: "frontend",
      nodeName: null,
      cpuUsage: this.numberOrNull(row.container_cpu_usage_seconds_rate),
      memoryUsage: null,
      memoryBytes: this.coalesceNullable(
        this.numberOrNull(row.container_memory_usage_bytes),
        this.numberOrNull(row.container_memory_working_set_bytes)
      ),
      networkIo: this.sumNullable(receive, transmit),
      networkReceiveBytesRate: receive,
      networkTransmitBytesRate: transmit,
      status: label.status,
      anomalyLabel: label.anomaly,
      labelCode,
      attackType: label.attackType,
      rawMetrics: JSON.stringify(row),
    };
  }

  normalizeBoaContainerTimeseriesRow(row: any, sourceFile: string) {
    const collectedAt = this.parseDatasetTimestamp(row.timestamp);
    const attackType = this.attackTypeFromFilename(sourceFile);
    const records = [];

    for (const service of CONTAINER_SERVICES) {
      const receive = this.numberOrNull(row[`${service}_container_network_receive_bytes_rate`]);
      const transmit = this.numberOrNull(row[`${service}_container_network_transmit_bytes_rate`]);
      const replicasAvailable = this.numberOrNull(row[`${service}_kube_deployment_status_replicas_available`]);
      const replicasUnavailable = this.numberOrNull(row[`${service}_kube_deployment_status_replicas_unavailable`]);

      const record = {
        collectedAt,
        timeSynthetic: false,
        source: "kaggle",
        sourceFile,
        entityType: "kubernetes_service",
        entityName: service,
        podName: service,
        nodeName: null,
        cpuUsage: this.numberOrNull(row[`${service}_container_cpu_usage_seconds_rate`]),
        memoryUsage: null,
        memoryBytes: this.numberOrNull(row[`${service}_container_memory_usage_bytes`]),
        networkIo: this.sumNullable(receive, transmit),
        networkReceiveBytesRate: receive,
        networkTransmitBytesRate: transmit,
        status: this.deploymentStatus(replicasAvailable, replicasUnavailable),
        anomalyLabel: this.parseOptionalAnomaly(row.label || row.Label),
        labelCode: this.cleanString(row.label || row.Label),
        attackType,
        rawMetrics: JSON.stringify({
          service,
          replicas_available: replicasAvailable,
          replicas_unavailable: replicasUnavailable,
          source_row: row,
        }),
      };

      if (this.isUsefulRecord(record)) {
        records.push(record);
      }
    }

    return records;
  }

  async findExistingImport(fileHash: string) {
    return (prisma as any).datasetImport.findUnique({
      where: { fileHash },
    });
  }

  async createImportRecord(record: any) {
    return (prisma as any).datasetImport.create({
      data: record,
    });
  }

  async insertRecords(records: any[]) {
    if (!records.length) return 0;
    const res = await (prisma as any).historicalMetric.createMany({
      data: records,
    });
    return res.count;
  }

  async getHistory(filters: any = {}) {
    const where = this.buildPrismaWhere(filters);
    const limit = this.parseLimit(filters.limit, 500, 5000);

    const records = await (prisma as any).historicalMetric.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      take: limit,
    });

    return records.map(this.toDashboardRecord.bind(this));
  }

  async getAnomalies(filters: any = {}) {
    const where = this.buildPrismaWhere({ ...filters, anomalyOnly: true });
    const limit = this.parseLimit(filters.limit, 250, 2500);

    const records = await (prisma as any).historicalMetric.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      take: limit,
    });

    return records.map(this.toDashboardRecord.bind(this));
  }

  async getTrends(filters: any = {}) {
    const where = this.buildPrismaWhere(filters, { requireTimestamp: true });
    const limit = this.parseLimit(filters.limit, 1000, 5000);

    const records = await (prisma as any).historicalMetric.findMany({
      where,
      orderBy: { collectedAt: 'asc' },
      take: limit,
    });
    
    // Grouping in memory due to SQLite constraints on date_trunc
    const bucketSizeMs = filters.bucket === 'hour' ? 3600000 : filters.bucket === 'day' ? 86400000 : 60000;
    
    const buckets: Record<string, any> = {};
    for (const row of records) {
      if (!row.collectedAt) continue;
      
      const bucketTime = new Date(Math.floor(row.collectedAt.getTime() / bucketSizeMs) * bucketSizeMs).toISOString();
      const key = `${bucketTime}-${row.source}-${row.entityName}-${row.attackType}`;
      
      if (!buckets[key]) {
        buckets[key] = {
          bucket: bucketTime,
          source: row.source,
          entity_name: row.entityName,
          attack_type: row.attackType,
          cpu_sum: 0,
          memory_sum: 0,
          memory_bytes_sum: 0,
          network_sum: 0,
          sample_count: 0,
          anomaly_count: 0
        };
      }
      
      buckets[key].cpu_sum += (row.cpuUsage || 0);
      buckets[key].memory_sum += (row.memoryUsage || 0);
      buckets[key].memory_bytes_sum += (row.memoryBytes || 0);
      buckets[key].network_sum += (row.networkIo || 0);
      buckets[key].sample_count += 1;
      if (row.anomalyLabel) buckets[key].anomaly_count += 1;
    }
    
    const result = Object.values(buckets).map(b => ({
      bucket: b.bucket,
      source: b.source,
      entity_name: b.entity_name,
      attack_type: b.attack_type,
      cpu_avg: b.cpu_sum / b.sample_count,
      memory_avg: b.memory_sum / b.sample_count,
      memory_bytes_avg: b.memory_bytes_sum / b.sample_count,
      network_avg: b.network_sum / b.sample_count,
      sample_count: b.sample_count,
      anomaly_count: b.anomaly_count
    }));
    
    return result;
  }

  async getImports() {
    const imports = await (prisma as any).datasetImport.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return imports.map((imp: any) => ({
      ...imp,
      fileSize: imp.fileSize ? Number(imp.fileSize) : 0,
    }));
  }

  // --- Utility functions below ---

  buildPrismaWhere(filters: any = {}, options: any = {}) {
    const where: any = {};
    if (filters.source) where.source = filters.source;
    if (filters.entity) {
      where.OR = [
        { entityName: filters.entity },
        { podName: filters.entity },
        { nodeName: filters.entity },
      ];
    }
    if (filters.attack_type) where.attackType = filters.attack_type;
    if (filters.from || filters.to) {
      where.collectedAt = {};
      if (filters.from) where.collectedAt.gte = new Date(filters.from);
      if (filters.to) where.collectedAt.lte = new Date(filters.to);
    }
    if (filters.anomalyOnly) {
      where.anomalyLabel = true;
    }
    if (options.requireTimestamp) {
      if (!where.collectedAt) where.collectedAt = {};
      where.collectedAt.not = null;
    }
    return where;
  }

  detectDatasetType(headers: string[], sourceFile: string = "") {
    const normalized = new Set(headers.map((h) => h.trim()));

    if (normalized.has("vm_id") && normalized.has("timestamp") && normalized.has("cpu_usage") && normalized.has("Anomaly status")) {
      return "cloud_anomaly";
    }

    if (normalized.has("label") && normalized.has("container_cpu_usage_seconds_rate")) {
      return "boa_ml_ready";
    }

    if (normalized.has("timestamp") && headers.some((h) => /_container_cpu_usage_seconds_rate$/.test(h))) {
      return "boa_container_timeseries";
    }

    return null;
  }

  toDashboardRecord(row: any) {
    const podStatus = row.status || (row.anomalyLabel ? "critical" : "historical");

    return {
      ...row,
      cpu: row.cpuUsage,
      memory: this.coalesceNullable(row.memoryUsage, row.memoryBytes),
      network: row.networkIo,
      podStatus,
      clusterHealth: row.anomalyLabel ? "degraded" : "healthy",
      agentActivity: row.anomalyLabel ? "memory-match" : "baseline",
    };
  }

  async hashFile(filePath: string): Promise<string> {
    const hash = crypto.createHash("sha256");
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .on("data", (chunk) => hash.update(chunk))
        .on("error", reject)
        .on("end", () => resolve(hash.digest("hex")));
    });
  }

  async readCsvHeaders(filePath: string): Promise<string[]> {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      rl.close();
      return this.splitCsvLine(line.replace(/^\uFEFF/, "")).map((h) => h.trim());
    }
    return [];
  }

  splitCsvLine(line: string) {
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        fields.push(current);
        current = "";
        continue;
      }
      current += char;
    }
    fields.push(current);
    return fields;
  }

  parseDatasetTimestamp(value: any) {
    const text = this.cleanString(value);
    if (!text) return null;

    let match = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
    if (match) {
      const [, day, month, year, hour, minute, second = "00"] = match;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
    }

    match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
    if (match) {
      const [, year, month, day, hour, minute, second = "00"] = match;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  syntheticTimestamp(start: Date, rowNumber: number, intervalSeconds: number) {
    return new Date(start.getTime() + Math.max(0, rowNumber - 1) * intervalSeconds * 1000);
  }

  cleanString(value: any) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length ? text : null;
  }

  numberOrNull(value: any) {
    const text = this.cleanString(value);
    if (text === null) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  sumNullable(...values: any[]) {
    const present = values.filter((v) => v !== null && v !== undefined);
    if (!present.length) return null;
    return present.reduce((a, b) => a + b, 0);
  }

  coalesceNullable(...values: any[]) {
    for (const v of values) {
      if (v !== null && v !== undefined) return v;
    }
    return null;
  }

  deploymentStatus(available: any, unavailable: any) {
    if (unavailable !== null && unavailable > 0) return "warning";
    if (available !== null && available > 0) return "healthy";
    return null;
  }

  parseOptionalAnomaly(value: any) {
    const text = this.cleanString(value);
    if (text === null) return null;
    if (text === "0" || /^benign$/i.test(text) || /^normal$/i.test(text)) return false;
    return true;
  }

  attackTypeFromFilename(sourceFile: string) {
    if (/torshammer/i.test(sourceFile)) return "torshammer";
    if (/slowloris/i.test(sourceFile)) return "slowloris";
    return null;
  }

  isUsefulRecord(record: any) {
    return Boolean(
      record &&
        (record.collectedAt ||
          record.cpuUsage !== null ||
          record.memoryUsage !== null ||
          record.memoryBytes !== null ||
          record.networkIo !== null ||
          record.anomalyLabel !== null)
    );
  }

  parseLimit(value: any, defaultValue: number, maxValue: number) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
    return Math.min(parsed, maxValue);
  }
}
