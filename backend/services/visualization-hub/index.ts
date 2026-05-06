import { createServer } from 'http';
import { Server } from 'socket.io';
import { natsClient } from '../../shared/messaging/index.ts';
import dotenv from 'dotenv';

dotenv.config();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
  console.log(`Neural Link Established: ${socket.id}`);

  socket.on('join_cluster', (clusterId) => {
    socket.join(`cluster:${clusterId}`);
    console.log(`Socket ${socket.id} joined cluster ${clusterId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Neural Link Severed: ${socket.id}`);
  });
});

// NATS Subscriptions to forward events to WebSockets
const startNeuralForwarding = async () => {
  await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');

  // If we are in mock mode, start generating synthetic events for the UI
  if ((natsClient as any).isMock) {
    console.log('Neural Forwarding in MOCK MODE: Generating synthetic petri dish activity...');
    setInterval(() => {
      const mockUpdate = {
        podId: `pod-${Math.floor(Math.random() * 10)}`,
        metrics: { cpu: Math.random() * 100, memory: Math.random() * 1024 },
        timestamp: new Date()
      };
      io.to('cluster:global').emit('podHealthUpdate', mockUpdate);
      
      if (Math.random() > 0.8) {
        io.emit('dangerScore', { podId: mockUpdate.podId, score: 85, label: 'DANGER' });
      }
    }, 2000);
    return;
  }

  // Real NATS forwarding
  natsClient.subscribe('telemetry.raw', (data) => {
    io.to(`cluster:${data.clusterId || 'global'}`).emit('podHealthUpdate', data);
  });

  // Forward Danger Scores
  natsClient.subscribe('danger.score', (data) => {
    io.emit('dangerScore', data);
  });

  // Forward Verified Threats
  natsClient.subscribe('threat.verified', (data) => {
    io.emit('threatDetected', data);
  });

  // Forward Actions
  natsClient.subscribe('action.execute', (data) => {
    io.emit('actionExecuted', data);
  });
};

httpServer.listen(PORT, () => {
  console.log(`BioPods Visualization Hub running on port ${PORT}`);
  startNeuralForwarding().catch(console.error);
});
