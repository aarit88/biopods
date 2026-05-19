import { createServer } from 'http';
import { Server } from 'socket.io';
import { natsClient } from '../../shared/messaging/index.ts';
import * as RedisModule from 'ioredis';
const Redis = (RedisModule as any).default || RedisModule.Redis || RedisModule;
import dotenv from 'dotenv';

dotenv.config();

const httpServer = createServer(async (req, res) => {
  // HTTP Event Bridge for Non-Docker Setup
  if (req.method === 'POST' && req.url === '/api/events') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { subject, data } = JSON.parse(body);
        handleEvent(subject, data);
        res.writeHead(200);
        res.end('ok');
      } catch (e) {
        res.writeHead(400);
        res.end('error');
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Mock Redis Fallback
let redis: any;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null
  });
  redis.on('error', () => {
    console.warn('⚠️ Redis connection failed. Using In-Memory cache.');
    redis = new Map(); 
  });
} catch (e) {
  redis = new Map();
}

const PORT = process.env.PORT || 3001;

// ── WebSocket Event Schema Contracts ──
const handleEvent = (subject: string, data: any) => {
  // Emit based on the incoming NATS subjects
  if (subject === 'telemetry.raw') {
    io.to(`cluster:${data.clusterId || 'global'}`).emit('telemetry:stream', data);
    io.emit('cluster:health:update', { clusterId: data.clusterId, health: 90 + Math.random() * 10 });
    
    // Forward to Dendritic Agent (Python)
    fetch('http://localhost:8003/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, data })
    }).catch(() => {});
  } 
  
  else if (subject === 'danger.score' || subject === 'danger.detected') {
    if (redis instanceof Map) redis.set(`danger:active:${data.podId}`, JSON.stringify(data));
    else redis.set(`danger:active:${data.podId}`, JSON.stringify(data), 'EX', 3600).catch(() => {});
    
    // Broadcast threat propagation and infection states
    io.emit('pod:danger:update', data);
    io.emit('pod:infection:state', { podId: data.podId, state: data.label || 'danger' });
    io.emit('threat:propagate', { source: data.podId, severity: data.label || 'high' });
  } 
  
  else if (subject === 'action.execute') {
    io.emit('immune:response:started', data);
    // Antibody deployment visual activation
    io.emit('antibody:deploy', { podId: data.podId, antibodyType: data.actionType, timestamp: new Date() });
  } 
  
  else if (subject === 'system-threats' || subject === 'anomaly.verified') {
    // Forward to Python T-Cell Patrol Agent
    fetch('http://localhost:8001/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'system-threats', data })
    }).catch(() => {});
    io.emit('threat:detected', data);
  } 
  
  else if (subject === 'ai.reasoning') {
    io.emit('ai:reasoning', data);
  } 
  
  else if (subject === 'threat.verified') {
    io.emit('threat:detected', data);
  } 
  
  else if (subject === 'healing.completed') {
    io.emit('healing:animation', { podId: data.podName || data.podId, status: 'healed', animation: 'cytokine-flash' });
    io.emit('pod:infection:state', { podId: data.podName || data.podId, state: 'healthy' });
  } 
  
  else if (subject === 'memory.recalled') {
    io.emit('memory:recalled', data);
  } 
  
  else if (subject === 'visualization.broadcast') {
    io.emit('visualization:update', data);
  }
};

io.on('connection', (socket) => {
  console.log(`🧬 Neural Link Established: ${socket.id}`);

  socket.on('join_cluster', (clusterId) => {
    socket.join(`cluster:${clusterId}`);
    console.log(`Socket ${socket.id} joined cluster ${clusterId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🧬 Neural Link Severed: ${socket.id}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── METABOLIC HEARTBEAT LIFECYCLE PULSE GENERATOR ──
// Generates background cinematic visual loops to animate the dashboard.
// ─────────────────────────────────────────────────────────────────────────────
const startMetabolicHeartbeat = () => {
  const pods = ['turbine-01', 'control-system', 'power-grid', 'database-core', 'frontend-edge'];
  
  setInterval(() => {
    // 1. Dependency Pulse Links: simulate communication flows between nodes
    const source = pods[Math.floor(Math.random() * pods.length)];
    let target = pods[Math.floor(Math.random() * pods.length)];
    while (target === source) {
      target = pods[Math.floor(Math.random() * pods.length)];
    }
    
    io.emit('dependency:pulse', {
      source,
      target,
      latencyMs: Math.round(5 + Math.random() * 45),
      pulseSpeed: 'fast'
    });

    // 2. Immune Agent Movement: simulate T-Cell patrols moving around
    const agentNames = ['T-Cell Patrol 01', 'T-Cell Patrol 02', 'B-Cell Repertoire'];
    io.emit('immune:agent:move', {
      agentName: agentNames[Math.floor(Math.random() * agentNames.length)],
      fromNode: source,
      toNode: target,
      speed: 'smooth-glide'
    });

    // 3. Danger Heatmap updates: floating noise grid for organic biological UI overlay
    const heatmapGrid = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        heatmapGrid.push({ x, y, intensity: Math.round(Math.random() * 15) });
      }
    }
    io.emit('danger:heatmap', { grid: heatmapGrid, timestamp: new Date() });

  }, 3500);
};

const startNeuralForwarding = async () => {
  await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');
  console.log('📡 [Visualization Gateway] Neural Forwarding Active...');

  // Subscribe to all immune subjects on NATS
  const subjects = [
    'telemetry.raw',
    'danger.score',
    'danger.detected',
    'anomaly.verified',
    'antibody.generated',
    'memory.recalled',
    'action.execute',
    'healing.completed',
    'visualization.broadcast'
  ];

  for (const sub of subjects) {
    natsClient.subscribe(sub, (data) => handleEvent(sub, data));
  }
};

httpServer.listen(PORT, () => {
  console.log(`🎨 [Visualization Gateway] Running on port ${PORT}`);
  startNeuralForwarding().catch(console.error);
  startMetabolicHeartbeat();
});
