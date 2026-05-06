import { connect, NatsConnection, JSONCodec, Subscription } from 'nats';

export class MessagingService {
  private nc: NatsConnection | null = null;
  private jc = JSONCodec();
  private isMock: boolean = false;

  async connect(servers: string = 'nats://localhost:4222') {
    try {
      this.nc = await connect({ servers });
      console.log(`Connected to NATS at ${servers}`);
    } catch (err) {
      console.warn('NATS connection failed. Falling back to Mock Messaging (Console Only).');
      this.isMock = true;
    }
  }

  publish(subject: string, data: any) {
    if (this.isMock) {
      console.log(`[MOCK PUBLISH] ${subject}:`, data);
      return;
    }
    if (!this.nc) return;
    this.nc.publish(subject, this.jc.encode(data));
  }

  subscribe(subject: string, callback: (data: any) => void): any {
    if (this.isMock) {
      console.log(`[MOCK SUBSCRIBE] ${subject}`);
      return { unsubscribe: () => {} };
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
