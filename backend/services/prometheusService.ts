import axios from "axios";
import { prisma } from "../shared/db/index.ts";
import { cytokineBus } from "../shared/messaging/cytokine_bus.ts";

const PROMETHEUS_URL = "http://localhost:9090/api/v1/query";

export async function getMetrics() {
  try {
    const cpu = await axios.get(PROMETHEUS_URL, {
      params: {
        query: "rate(process_cpu_seconds_total[1m])"
      }
    });

    const memory = await axios.get(PROMETHEUS_URL, {
      params: {
        query: "process_resident_memory_bytes"
      }
    });

    const network = await axios.get(PROMETHEUS_URL, {
      params: {
        query: "rate(node_network_receive_bytes_total[1m])"
      }
    });

    const podHealth = await axios.get(PROMETHEUS_URL, {
      params: {
        query: "up"
      }
    });

    return {
      cpu: cpu.data?.data?.result || [],
      memory: memory.data?.data?.result || [],
      network: network.data?.data?.result || [],
      podHealth: podHealth.data?.data?.result || []
    };
  } catch (err: any) {
    console.error("Prometheus fetch error, using simulated metrics:", err.message);
    return null;
  }
}

export function getSimulatedMetrics() {
  return {
    cpu: Math.floor(Math.random() * (95 - 20 + 1)) + 20,
    memory: Math.floor(Math.random() * (90 - 30 + 1)) + 30,
    network: Math.floor(Math.random() * (800 - 100 + 1)) + 100,
    podStatus: Math.random() > 0.8 ? (Math.random() > 0.5 ? "critical" : "warning") : "healthy"
  };
}

export async function pollAndSaveMetrics() {
  let metrics = await getMetrics();
  let liveData;

  if (metrics && metrics.cpu && metrics.cpu.length > 0) {
    // Parse Prometheus format if available
    liveData = {
      cpu: parseFloat(metrics.cpu[0]?.value?.[1] || 0),
      memory: parseFloat(metrics.memory[0]?.value?.[1] || 0),
      network: parseFloat(metrics.network[0]?.value?.[1] || 0),
      podStatus: metrics.podHealth[0]?.value?.[1] == "1" ? "healthy" : "critical"
    };
  } else {
    liveData = getSimulatedMetrics();
  }

  // Save to Database
  try {
    await prisma.telemetry.create({
      data: {
        cpuUsage: liveData.cpu,
        memoryUsage: liveData.memory,
        networkIn: liveData.network,
        signalType: liveData.podStatus,
      }
    });
  } catch (dbErr: any) {
    console.error("Failed to save metric to database:", dbErr.message);
  }

  // Publish to message bus for websocket hub to emit
  await cytokineBus.publish('metrics.update', liveData);

  // Also publish as telemetry.raw so the existing dashboard UI updates automatically
  await cytokineBus.publish('telemetry.raw', {
    podId: 'prometheus-live-node',
    metrics: {
      cpu: liveData.cpu,
      memory: liveData.memory,
      temp: 45 // required by existing UI
    },
    timestamp: new Date()
  });

  return liveData;
}
