import { connect, NatsConnection, JSONCodec } from 'nats';
import EventEmitter from 'events';

export class MessagingService {
  private nc: NatsConnection | null = null;
  private jc = JSONCodec();
  private isMock: boolean = false;
  private localBus = new EventEmitter();

  async connect(servers: string = 'nats://localhost:4222') {
    try {
      this.nc = await connect({ servers });
      console.log(`✅ Neural Bus Connected: NATS at ${servers}`);
    } catch (err) {
      console.warn('⚠️ NATS connection failed. Falling back to HTTP/Local Bridge for Demo.');
      this.isMock = true;
    }
  }

  async publish(subject: string, data: any) {
    if (this.isMock) {
      // Local process bridge
      this.localBus.emit(subject, data);
      
      // Cross-process bridge (Post to Visualization Hub)
      try {
        if (subject !== 'telemetry.visual') { // Avoid infinite loops
          fetch('http://localhost:3001/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, data })
          }).catch(() => {});
        }
      } catch (e) {
        // Hub might not be up yet
      }
      return;
    }
    if (!this.nc) return;
    this.nc.publish(subject, this.jc.encode(data));
  }

  subscribe(subject: string, callback: (data: any) => void): any {
    if (this.isMock) {
      this.localBus.on(subject, callback);
      return { unsubscribe: () => this.localBus.off(subject, callback) };
    }
    if (!this.nc) return { unsubscribe: () => {} };
    
    const sub = this.nc.subscribe(subject);
    (async () => {
      for await (const m of sub) {
        callback(this.jc.decode(m.data));
      }
    })();
    return sub;
  }

  async close() {
    await this.nc?.close();
  }
}

export const natsClient = new MessagingService();
