import { createServer } from 'http';
import { Server } from 'socket.io';
import { natsClient } from '../../shared/messaging/index.ts';
import Redis from 'ioredis';
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
    redis = new Map(); // Simple mock
  });
} catch (e) {
  redis = new Map();
}

const PORT = process.env.PORT || 3001;

const handleEvent = (subject: string, data: any) => {
  if (subject === 'telemetry.raw') {
    io.to(`cluster:${data.clusterId || 'global'}`).emit('telemetry:stream', data);
    io.emit('cluster:health:update', { clusterId: data.clusterId, health: Math.random() * 100 });
  } else if (subject === 'danger.score') {
    if (redis instanceof Map) redis.set(`danger:active:${data.podId}`, JSON.stringify(data));
    else redis.set(`danger:active:${data.podId}`, JSON.stringify(data), 'EX', 3600).catch(() => {});
    io.emit('pod:danger:update', data);
  } else if (subject === 'action.execute') {
    io.emit('immune:response:started', data);
  } else if (subject === 'threat.verified') {
    io.emit('threat:detected', data);
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

const startNeuralForwarding = async () => {
  await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');
  console.log('📡 Visualization Hub: Neural Forwarding Active...');

  natsClient.subscribe('telemetry.raw', (data) => handleEvent('telemetry.raw', data));
  natsClient.subscribe('danger.score', (data) => handleEvent('danger.score', data));
  natsClient.subscribe('action.execute', (data) => handleEvent('action.execute', data));
  natsClient.subscribe('threat.verified', (data) => handleEvent('threat.verified', data));
};

httpServer.listen(PORT, () => {
  console.log(`🎨 BioPods Visualization Hub running on port ${PORT}`);
  startNeuralForwarding().catch(console.error);
});
