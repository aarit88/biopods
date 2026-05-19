import { connect, NatsConnection, JSONCodec } from 'nats';
import { EventEmitter } from 'events';

// ── NATS Immune Subject Schema Contracts ──
export interface ImmuneEventContracts {
  'telemetry.raw': {
    podId: string;
    clusterId: string;
    podName: string;
    namespace: string;
    metrics: Record<string, number>;
    timestamp: Date;
  };
  'danger.detected': {
    podId: string;
    podName: string;
    score: number;
    label: string;
    type: string;
    details: string;
    timestamp: Date;
  };
  'anomaly.verified': {
    podId: string;
    podName: string;
    score: number;
    confidence: number;
    timestamp: Date;
  };
  'antibody.generated': {
    ticket: any;
    actionType: string;
    affinity: number;
  };
  'memory.recalled': {
    ticket: any;
    recalledMemoryId: string;
    mitigation: string;
    confidence: number;
  };
  'action.execute': {
    podId: string;
    actionType: string;
    eventId?: string;
    requestedBy: string;
    params?: any;
    timestamp: Date;
  };
  'healing.completed': {
    actionId: string;
    podName: string;
    actionType: string;
    status: string;
    responseTimeMs: number;
    successRate: number;
  };
  'healing.failed': {
    podId: string;
    actionType: string;
    error: string;
  };
  'visualization.update': {
    type: string;
    data: any;
  };
  'visualization.broadcast': {
    type: string;
    data: any;
  };
  'threat.intelligence': {
    eventId: string;
    analysis: any;
    responseTimeMs: number;
    persistedToDb: boolean;
    timestamp: Date;
  };
}

export class MessagingService {
  private nc: NatsConnection | null = null;
  private jc = JSONCodec();
  private isMock: boolean = false;
  private localBus = new EventEmitter();
  private MAX_RETRIES = 3;
  private RETRY_BACKOFF_MS = 1000;

  async connect(servers: string = 'nats://localhost:4222') {
    try {
      this.nc = await connect({ servers, timeout: 2000 });
      this.isMock = false;
      console.log(`✅ [NATS Neural Network] Connected directly to NATS cluster at ${servers}`);
    } catch (err) {
      console.warn('⚠️ [NATS Neural Network] Connection failed. Using resilient local HTTP/EventEmitter bridge.');
      this.isMock = true;
    }
  }

  /**
   * Resilient publish with automatic retry strategy and Dead-Letter Queue (DLQ) support.
   */
  async publish<K extends keyof ImmuneEventContracts>(subject: K, data: ImmuneEventContracts[K]): Promise<void>;
  async publish(subject: string, data: any): Promise<void>;
  async publish(subject: any, data: any) {
    // 1. In Mock Mode, route through local emitter and visualization-hub HTTP bridge
    if (this.isMock) {
      this.localBus.emit(subject, data);
      
      try {
        if (subject !== 'visualization.broadcast') {
          fetch('http://localhost:3001/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, data })
          }).catch(() => {});
        }
      } catch (e) {
        // Hub offline, fail silently
      }
      return;
    }

    if (!this.nc) return;

    // 2. Production Retry Strategy with Exponential Backoff
    let attempts = 0;
    while (attempts < this.MAX_RETRIES) {
      try {
        this.nc.publish(subject, this.jc.encode(data));
        return; // Success!
      } catch (err: any) {
        attempts++;
        console.warn(`⚠️ [NATS Publish Retry] Attempt ${attempts}/${this.MAX_RETRIES} failed for subject [${subject}]: ${err.message}`);
        if (attempts >= this.MAX_RETRIES) {
          await this.routeToDLQ(subject, data, err.message);
        } else {
          await new Promise(res => setTimeout(res, this.RETRY_BACKOFF_MS * Math.pow(2, attempts)));
        }
      }
    }
  }

  /**
   * Routes unprocessable messages to the Dead-Letter Queue (DLQ) to avoid blocking threads.
   */
  private async routeToDLQ(subject: string, data: any, errorMessage: string) {
    const dlqSubject = `dlq.${subject}`;
    const dlqPayload = {
      originalSubject: subject,
      failedAt: new Date(),
      error: errorMessage,
      payload: data
    };

    console.error(`🚨 [NATS DLQ] Message permanently failed. Routing to dead-letter queue: ${dlqSubject}`);
    try {
      if (this.nc) {
        this.nc.publish(dlqSubject, this.jc.encode(dlqPayload));
      } else {
        this.localBus.emit(dlqSubject, dlqPayload);
      }
    } catch (dlqErr: any) {
      console.error(`❌ Critical: Failed routing to DLQ: ${dlqErr.message}`);
    }
  }

  subscribe<K extends keyof ImmuneEventContracts>(subject: K, callback: (data: ImmuneEventContracts[K]) => void): any;
  subscribe(subject: string, callback: (data: any) => void): any;
  subscribe(subject: any, callback: any): any {
    if (this.isMock) {
      this.localBus.on(subject, callback);
      return { unsubscribe: () => this.localBus.off(subject, callback) };
    }
    if (!this.nc) return { unsubscribe: () => {} };
    
    const sub = this.nc.subscribe(subject);
    (async () => {
      for await (const m of sub) {
        try {
          callback(this.jc.decode(m.data) as any);
        } catch (decodeErr: any) {
          console.error(`❌ [NATS Decode Error] Failed on subject ${subject}: ${decodeErr.message}`);
          await this.routeToDLQ(subject, m.data, `Decode error: ${decodeErr.message}`);
        }
      }
    })();
    return sub;
  }

  async close() {
    await this.nc?.close();
  }
}

export const natsClient = new MessagingService();
