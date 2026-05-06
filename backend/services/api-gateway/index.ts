import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { natsClient } from '../../shared/messaging/index.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-biopods-key';

app.use(helmet());
app.use(cors());
app.use(express.json());

// Auth Middleware
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Basic Routes
app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway Operational', timestamp: new Date() });
});

// Auth Routes
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  // Mock login for Hackathon MVP
  if (email && password) {
    const user = { id: '1', email, role: 'ADMIN' };
    const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ accessToken, refreshToken, user });
  }
  res.status(400).json({ error: 'Invalid credentials' });
});

// Cluster Routes
app.get('/api/v1/clusters', authenticateToken, (req, res) => {
  res.json([
    { id: 'c1', name: 'Production-US-East', status: 'Healthy' },
    { id: 'c2', name: 'Staging-Internal', status: 'Warning' }
  ]);
});

// Action Execution Route
app.post('/api/v1/actions/execute', authenticateToken, (req: any, res: any) => {
  const { podId, actionType } = req.body;
  console.log(`Action requested by ${req.user.email}: ${actionType} on ${podId}`);
  
  // Publish to NATS
  natsClient.publish('action.execute', {
    podId,
    actionType,
    params: {},
    requestedBy: req.user.id,
    timestamp: new Date()
  });

  res.json({ status: 'PROTOCOL_INITIATED', requestId: Math.random().toString(36).substring(7) });
});

// Agent Management Routes
app.get('/api/v1/agents', authenticateToken, (req, res) => {
  res.json([
    { id: 'dendritic-01', name: 'Dendritic-Alpha', status: 'Active', type: 'Intelligence', efficiency: '98%' },
    { id: 't-cell-01', name: 'Cytotoxic-T', status: 'Standby', type: 'Defense', efficiency: '94%' },
    { id: 'b-cell-01', name: 'Adaptive-B', status: 'Learning', type: 'Evolution', efficiency: '88%' },
    { id: 'purge-01', name: 'Macro-Purge', status: 'Idle', type: 'Cleanup', efficiency: '100%' }
  ]);
});

app.post('/api/v1/agents/:id/control', authenticateToken, (req: any, res: any) => {
  const { id } = req.params;
  const { action } = req.body;
  console.log(`Agent ${id} control action: ${action} by ${req.user.email}`);
  
  // Publish control signal to NATS
  natsClient.publish(`agent.${id}.control`, {
    agentId: id,
    action,
    timestamp: new Date()
  });

  res.json({ status: 'SIGNAL_TRANSMITTED', agentId: id, action });
});

// Initialize NATS before starting
natsClient.connect(process.env.NATS_URL || 'nats://localhost:4222').then(() => {
  app.listen(PORT, () => {
    console.log(`BioPods API Gateway running on port ${PORT}`);
  });
}).catch(err => {
  console.error("NATS connection failed", err);
  app.listen(PORT, () => {
    console.log(`BioPods API Gateway running on port ${PORT} (MOCK MODE)`);
  });
});
