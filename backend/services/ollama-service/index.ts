import axios from 'axios';
import dotenv from 'dotenv';
import { natsClient } from '../../shared/messaging/index.ts';

dotenv.config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3';

async function analyzeThreat(threatPattern: string) {
  try {
    console.log(`🤖 Ollama analyzing threat pattern: ${threatPattern}`);
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: MODEL,
      prompt: `Analyze this Kubernetes pod threat signature and provide a mitigation strategy in JSON format: "${threatPattern}". Response should include: severity (low, high, critical), strategy_name, and description.`,
      stream: false
    });

    const analysis = JSON.parse(response.data.response);
    return analysis;
  } catch (error) {
    console.error('❌ Ollama Analysis Failed:', error);
    return {
      severity: 'high',
      strategy_name: 'default-isolation',
      description: 'Ollama analysis unavailable. Initiating default container isolation protocol.'
    };
  }
}

async function startService() {
  await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');
  console.log('🧠 BioPods Ollama Intelligence Service Active...');

  // Listen for new danger events to analyze
  natsClient.subscribe('danger.event', async (data: any) => {
    console.log(`📥 Received danger event for analysis: ${data.eventType}`);
    
    const analysis = await analyzeThreat(data.eventType);
    
    // Publish intelligence back to the system
    natsClient.publish('threat.intelligence', {
      eventId: data.id,
      analysis,
      timestamp: new Date()
    });
  });
}

startService().catch(console.error);
