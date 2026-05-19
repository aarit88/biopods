import EventEmitter from 'events';
import dotenv from 'dotenv';

dotenv.config();

export class CytokineBus {
  private localBus = new EventEmitter();
  private hubUrl = 'http://localhost:3001/api/events';

  async publish(channel: string, payload: any) {
    console.log(`[Cytokine] Publishing to ${channel}:`, payload);
    
    // Internal process communication
    this.localBus.emit(channel, payload);

    // Cross-process bridge via Visualization Hub
    try {
      await fetch(this.hubUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: channel, data: payload })
      });
    } catch (e) {
      // Hub might not be up yet, silent failure
    }
  }

  subscribe(channel: string, callback: (data: any) => void) {
    this.localBus.on(channel, callback);
    return () => this.localBus.off(channel, callback);
  }
}

export const cytokineBus = new CytokineBus();
