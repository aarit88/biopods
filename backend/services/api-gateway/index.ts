import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { natsClient } from '../../shared/messaging/index.ts';
import { prisma } from '../../shared/db/index.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-biopods-key';

app.use(helmet());
app.use(cors());
app.use(express.json());

// Auth Middleware (Bypassed for Hackathon Demo)
export const authenticateToken = (req: any, res: any, next: any) => {
  req.user = { id: 'demo-user', role: 'ADMIN' }; // Mock user
  next();
};

// Basic Routes
app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway Operational', database: 'CONNECTED', timestamp: new Date() });
});

// Auth Routes
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (user && password) { // In real app, check passwordHash
      const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ accessToken, refreshToken, user });
    }
    res.status(400).json({ error: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cluster Routes
app.get('/api/v1/clusters', authenticateToken, async (req, res) => {
  try {
    const clusters = await prisma.cluster.findMany({
      include: {
        _count: {
          select: { nodes: true, pods: true }
        }
      }
    });
    res.json(clusters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
});

app.get('/api/v1/clusters/:id', authenticateToken, async (req, res) => {
  try {
    const cluster = await prisma.cluster.findUnique({
      where: { id: req.params.id },
      include: {
        nodes: {
          include: { pods: true }
        }
      }
    });
    res.json(cluster);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cluster details' });
  }
});

// Pod Routes
app.get('/api/v1/pods', authenticateToken, async (req, res) => {
  try {
    const pods = await prisma.pod.findMany();
    res.json(pods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pods' });
  }
});

// Danger Events
app.get('/api/v1/anomalies', authenticateToken, async (req, res) => {
  try {
    const anomalies = await prisma.dangerEvent.findMany({
      orderBy: { createdAt: 'desc' },
      include: { pod: true }
    });
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// Immune Agents
app.get('/api/v1/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await prisma.immuneAgent.findMany();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.post('/api/v1/agents/:id/control', authenticateToken, (req: any, res: any) => {
  const { id } = req.params;
  const { action } = req.body;
  
  natsClient.publish(`agent.${id}.control`, {
    agentId: id,
    action,
    timestamp: new Date()
  });

  res.json({ status: 'SIGNAL_TRANSMITTED', agentId: id, action });
});

// Memory Cells
app.get('/api/v1/memory-cells', authenticateToken, async (req, res) => {
  try {
    const memory = await prisma.memoryCell.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(memory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch memory cells' });
  }
});

// Action Execution
app.post('/api/v1/actions/execute', authenticateToken, (req: any, res: any) => {
  const { podId, actionType } = req.body;
  
  natsClient.publish('action.execute', {
    podId,
    actionType,
    requestedBy: req.user.id,
    timestamp: new Date()
  });

  res.json({ status: 'PROTOCOL_INITIATED', requestId: Math.random().toString(36).substring(7) });
});

// Initialize NATS and Database before starting
const bootstrap = async () => {
  try {
    await natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222');
    await prisma.$connect();
    console.log('✅ Database and Messaging layers connected.');
    
    app.listen(PORT, () => {
      console.log(`🚀 BioPods API Gateway running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Bootstrap failed", err);
    process.exit(1);
  }
};

bootstrap();
