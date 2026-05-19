import { prisma } from '../db/index.ts';

export interface TelemetrySignature {
  cpu: number;
  memory: number;
  diskIo: number;
  networkIn: number;
  networkOut: number;
  pvcLatency: number;
}

export interface Detector {
  id: string;
  center: TelemetrySignature;
  radius: number; // Detection radius
  affinity: number;
}

export class SelfProfileManager {
  private static rollingSelfWindow: TelemetrySignature[] = [];
  private static maxWindowSize = 100;
  private static isLearning = true;

  /**
   * Adds a telemetry signature confirmed to be normal/healthy to the "self" profile.
   */
  static async learnSelf(signature: TelemetrySignature) {
    this.rollingSelfWindow.push(signature);
    if (this.rollingSelfWindow.length > this.maxWindowSize) {
      this.rollingSelfWindow.shift();
    }
    
    // Periodically persist the self-baseline
    if (Math.random() < 0.05) {
      await this.persistBaseline();
    }
  }

  static getSelfProfile(): TelemetrySignature[] {
    // If we have no active learning history, provide default healthy profiles
    if (this.rollingSelfWindow.length === 0) {
      return [
        { cpu: 20, memory: 35, diskIo: 5, networkIn: 20, networkOut: 20, pvcLatency: 2 },
        { cpu: 45, memory: 50, diskIo: 10, networkIn: 40, networkOut: 45, pvcLatency: 5 },
        { cpu: 10, memory: 20, diskIo: 2, networkIn: 5, networkOut: 5, pvcLatency: 1 }
      ];
    }
    return this.rollingSelfWindow;
  }

  private static async persistBaseline() {
    try {
      const avgProfile = this.calculateAverageSelf();
      await prisma.systemSetting.upsert({
        where: { key: 'immune:baseline:self' },
        update: { value: JSON.stringify(avgProfile) },
        create: { id: 'baseline-self', key: 'immune:baseline:self', value: JSON.stringify(avgProfile) }
      });
    } catch (e) {
      // DB might be busy, fail silently
    }
  }

  static calculateAverageSelf(): TelemetrySignature {
    const profile = this.getSelfProfile();
    const count = profile.length;
    return {
      cpu: profile.reduce((acc, curr) => acc + curr.cpu, 0) / count,
      memory: profile.reduce((acc, curr) => acc + curr.memory, 0) / count,
      diskIo: profile.reduce((acc, curr) => acc + curr.diskIo, 0) / count,
      networkIn: profile.reduce((acc, curr) => acc + curr.networkIn, 0) / count,
      networkOut: profile.reduce((acc, curr) => acc + curr.networkOut, 0) / count,
      pvcLatency: profile.reduce((acc, curr) => acc + curr.pvcLatency, 0) / count,
    };
  }

  static setLearningMode(learning: boolean) {
    this.isLearning = learning;
  }
}

export class DetectorEngine {
  private static matureDetectors: Detector[] = [];
  private static maxDetectors = 50;

  /**
   * Generates candidate detectors, performs negative selection against the "self" profile,
   * and keeps only those that do NOT match self signatures.
   */
  static generateDetectors() {
    const selfProfile = SelfProfileManager.getSelfProfile();
    const candidates: Detector[] = [];
    const targetCount = this.maxDetectors - this.matureDetectors.length;
    
    if (targetCount <= 0) return;

    let attempts = 0;
    while (candidates.length < targetCount && attempts < 1000) {
      attempts++;
      // Generate a random metric signature in expected telemetry bounds
      const candidate: TelemetrySignature = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        diskIo: Math.random() * 100,
        networkIn: Math.random() * 500,
        networkOut: Math.random() * 500,
        pvcLatency: Math.random() * 100
      };

      // Define detection radius (sensitivity)
      const radius = 15.0 + Math.random() * 10.0; 

      // Perform Negative Selection: Does this candidate match any "self" signature?
      let reactsToSelf = false;
      for (const self of selfProfile) {
        const dist = this.calculateDistance(candidate, self);
        if (dist < radius) {
          reactsToSelf = true; // Apoptosis: Candidate is self-reactive!
          break;
        }
      }

      if (!reactsToSelf) {
        // Mature Detector: Successfully passed negative selection!
        candidates.push({
          id: `det-${Math.random().toString(36).substr(2, 9)}`,
          center: candidate,
          radius,
          affinity: 50.0
        });
      }
    }

    this.matureDetectors = [...this.matureDetectors, ...candidates];
    console.log(`🛡️ [Negative Selection] Generated ${candidates.length} new mature non-self detectors. Total: ${this.matureDetectors.length}`);
  }

  /**
   * Evaluates a telemetry signature against all mature detectors.
   * If it matches any detector, it lies in the "non-self" space, indicating an anomaly!
   */
  static detect(telemetry: TelemetrySignature): { isAnomaly: boolean; score: number; confidence: number } {
    if (this.matureDetectors.length === 0) {
      this.generateDetectors();
    }

    let matchingCount = 0;
    let maxCloseness = 0;

    for (const detector of this.matureDetectors) {
      const dist = this.calculateDistance(telemetry, detector.center);
      if (dist < detector.radius) {
        matchingCount++;
        // Closeness score: 1 when directly in center, 0 at edge
        const closeness = 1.0 - (dist / detector.radius);
        if (closeness > maxCloseness) {
          maxCloseness = closeness;
        }
      }
    }

    // Mutate/rebalance detectors to maintain diversity (somatic adaptation)
    if (Math.random() < 0.05) {
      this.mutateDetectors();
    }

    const isAnomaly = matchingCount > 0;
    const score = isAnomaly ? Math.min(100, 30 + maxCloseness * 70) : 0;
    const confidence = isAnomaly ? Math.min(100, 50 + (matchingCount / this.matureDetectors.length) * 50) : 100;

    return { isAnomaly, score, confidence };
  }

  private static mutateDetectors() {
    // Delete detectors with the lowest affinity and generate replacements
    this.matureDetectors.sort((a, b) => b.affinity - a.affinity);
    const obsoleteCount = Math.floor(this.matureDetectors.length * 0.1) + 1;
    
    // Purge low affinity detectors
    this.matureDetectors.splice(-obsoleteCount);
    
    // Re-generate to fill the gap
    this.generateDetectors();
  }

  /**
   * Normalizes and calculates Euclidean distance between two telemetry signatures.
   */
  static calculateDistance(s1: TelemetrySignature, s2: TelemetrySignature): number {
    const dCpu = (s1.cpu - s2.cpu) / 10.0; // scale values so distance behaves consistently
    const dMem = (s1.memory - s2.memory) / 10.0;
    const dIo = (s1.diskIo - s2.diskIo) / 10.0;
    const dNetIn = (s1.networkIn - s2.networkIn) / 50.0;
    const dNetOut = (s1.networkOut - s2.networkOut) / 50.0;
    const dPvc = (s1.pvcLatency - s2.pvcLatency) / 10.0;

    return Math.sqrt(
      dCpu * dCpu +
      dMem * dMem +
      dIo * dIo +
      dNetIn * dNetIn +
      dNetOut * dNetOut +
      dPvc * dPvc
    );
  }

  static getDetectors(): Detector[] {
    return this.matureDetectors;
  }
}
