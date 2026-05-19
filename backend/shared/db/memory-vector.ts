import axios from 'axios';
import { prisma } from './index.ts';

const CHROMADB_URL = process.env.CHROMADB_URL || 'http://localhost:8000';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const COLLECTION_NAME = 'biopods_immune_memory';

export interface VectorThreatMemory {
  id: string;
  threatSignature: string;
  mitigationStrategy: string;
  affinityScore: number;
  successRate: number;
  recordedAt: string;
}

export class MemoryCellService {
  private static collectionId: string | null = null;
  private static hasChroma = false;

  /**
   * Initializes ChromaDB collection by checking heartbeat and creating collection.
   */
  static async initialize() {
    try {
      // 1. Heartbeat check
      await axios.get(`${CHROMADB_URL}/api/v1/heartbeat`, { timeout: 1500 });
      
      // 2. Get or create collection
      const res = await axios.post(`${CHROMADB_URL}/api/v1/collections`, {
        name: COLLECTION_NAME,
        get_or_create: true
      }, { timeout: 2000 });

      this.collectionId = res.data.id;
      this.hasChroma = true;
      console.log(`🧠 [Vector Memory] ChromaDB Connected & Collection initialized: ${COLLECTION_NAME}`);
    } catch (e) {
      console.warn(`⚠️ [Vector Memory] ChromaDB not active. Falling back to relational DB emulation.`);
      this.hasChroma = false;
    }
  }

  /**
   * Generates a 128-dimension semantic vector embedding.
   * Leverages Ollama's local embeddings if active; otherwise generates a robust deterministic semantic hash vector.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (OLLAMA_URL) {
        const res = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
          model: 'llama3',
          prompt: text
        }, { timeout: 1500 });
        
        // Truncate or pad to 128 dimensions for standard indexing
        const rawEmbed = res.data.embedding as number[];
        if (rawEmbed && rawEmbed.length > 0) {
          if (rawEmbed.length >= 128) return rawEmbed.slice(0, 128);
          return [...rawEmbed, ...new Array(128 - rawEmbed.length).fill(0)];
        }
      }
    } catch (e) {
      // Fallback to deterministic metric semantic vector
    }

    // Deterministic semantic embedding generation fallback
    const vector = new Array(128).fill(0.0);
    const normalized = text.toLowerCase();
    
    // Seed dimensions based on metrics keywords
    if (normalized.includes('cpu') || normalized.includes('stress')) vector[10] = 0.85;
    if (normalized.includes('leak') || normalized.includes('oom')) vector[25] = 0.90;
    if (normalized.includes('network') || normalized.includes('burst')) vector[50] = 0.80;
    if (normalized.includes('latency') || normalized.includes('lag')) vector[75] = 0.75;
    if (normalized.includes('pamp') || normalized.includes('restart')) vector[100] = 0.95;

    // Apply simple char-code hashing to populate remainder dimensions
    for (let i = 0; i < normalized.length; i++) {
      const dimIndex = (i + normalized.charCodeAt(i)) % 128;
      vector[dimIndex] += (normalized.charCodeAt(i) % 10) / 10.0;
    }

    // Normalize vector (L2 norm)
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < 128; i++) {
        vector[i] /= magnitude;
      }
    }
    return vector;
  }

  /**
   * Stores a threat mitigation response in vector memory and relational DB memory.
   */
  static async storeMemory(
    threatSignature: string,
    mitigationStrategy: string,
    affinityScore: number,
    successRate: number
  ) {
    const memoryId = `mem-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const embedText = `Threat: ${threatSignature}. Mitigation: ${mitigationStrategy}. Success rate: ${successRate}%`;
    const embedding = await this.generateEmbedding(embedText);

    // 1. Relational DB Persistence (Prisma SQLite)
    try {
      await prisma.memoryCell.create({
        data: {
          id: memoryId,
          threatSignature,
          vectorId: `chroma-${memoryId}`,
          mitigationStrategy,
          affinityScore,
          successCount: 1,
          lastSeen: new Date(),
        }
      });
      console.log(`💾 [Vector Memory] Prisma MemoryCell created: ${threatSignature}`);
    } catch (e) {
      // Relational save skipped if table lock or constraint
    }

    // 2. ChromaDB Vector Store
    if (this.hasChroma && this.collectionId) {
      try {
        await axios.post(`${CHROMADB_URL}/api/v1/collections/${this.collectionId}/add`, {
          ids: [memoryId],
          embeddings: [embedding],
          metadatas: [{
            threatSignature,
            mitigationStrategy,
            affinityScore,
            successRate,
            timestamp
          }],
          documents: [embedText]
        });
        console.log(`🧠 [Vector Memory] Vector successfully indexed in ChromaDB`);
      } catch (err: any) {
        console.error(`❌ ChromaDB Add failed: ${err.message}`);
      }
    }
  }

  /**
   * Performs Semantic Vector Query in ChromaDB to retrieve top-k matching memory cells.
   */
  static async queryMemory(threatQuery: string, k: number = 3): Promise<VectorThreatMemory[]> {
    if (!this.hasChroma) {
      await this.initialize();
    }

    const queryEmbed = await this.generateEmbedding(threatQuery);

    if (this.hasChroma && this.collectionId) {
      try {
        const res = await axios.post(`${CHROMADB_URL}/api/v1/collections/${this.collectionId}/query`, {
          query_embeddings: [queryEmbed],
          n_results: k,
          include: ['metadatas', 'documents', 'distances']
        });

        const queryResult = res.data;
        if (queryResult.ids && queryResult.ids[0] && queryResult.ids[0].length > 0) {
          const memories: VectorThreatMemory[] = [];
          for (let i = 0; i < queryResult.ids[0].length; i++) {
            const id = queryResult.ids[0][i];
            const meta = queryResult.metadatas[0][i];
            
            memories.push({
              id,
              threatSignature: meta.threatSignature || 'unknown',
              mitigationStrategy: meta.mitigationStrategy || 'none',
              affinityScore: meta.affinityScore || 50.0,
              successRate: meta.successRate || 75.0,
              recordedAt: meta.timestamp || new Date().toISOString()
            });
          }
          console.log(`🧠 [Vector Memory] Retrieved ${memories.length} semantic matches from ChromaDB.`);
          return memories;
        }
      } catch (err: any) {
        console.warn(`⚠️ ChromaDB query failed, resorting to relational search: ${err.message}`);
      }
    }

    // Relational Database Query Fallback
    try {
      const records = await prisma.memoryCell.findMany({
        where: {
          OR: [
            { threatSignature: { contains: threatQuery.toLowerCase() } },
            { mitigationStrategy: { contains: threatQuery.toLowerCase() } }
          ]
        },
        orderBy: { affinityScore: 'desc' },
        take: k
      });

      return records.map(r => ({
        id: r.id,
        threatSignature: r.threatSignature || 'unknown',
        mitigationStrategy: r.mitigationStrategy || 'none',
        affinityScore: r.affinityScore || 50.0,
        successRate: 85.0,
        recordedAt: r.lastSeen?.toISOString() || new Date().toISOString()
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Strengthens a memory's affinity when the mitigation succeeds.
   */
  static async strengthenMemory(threatSignature: string, success: boolean) {
    try {
      const sig = threatSignature.toLowerCase().replace(/\s+/g, '-');
      const cell = await prisma.memoryCell.findFirst({
        where: { threatSignature: sig }
      });

      if (cell) {
        const increment = success ? 2.5 : -10.0;
        const newAffinity = Math.max(10.0, Math.min(99.9, (cell.affinityScore || 50.0) + increment));
        const newCount = (cell.successCount || 0) + (success ? 1 : 0);

        await prisma.memoryCell.update({
          where: { id: cell.id },
          data: {
            affinityScore: newAffinity,
            successCount: newCount,
            lastSeen: new Date()
          }
        });
        console.log(`🧬 [Vector Memory] Reinforced memory cell affinity: ${newAffinity.toFixed(1)}%`);
      }
    } catch (e) {
      // Fail silently
    }
  }
}
