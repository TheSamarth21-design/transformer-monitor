import { run, all, get } from "./db.js";
import { syncTelemetryToFirestore } from "./firebase.js";

let isCloudOnline = true;
let isReplicating = false;

/**
 * Queue telemetry point locally when cloud is unreachable
 */
export async function queueTelemetryLocally(reading) {
  try {
    const queueId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString();
    await run(
      `INSERT INTO replication_queue (id, telemetry_json, synced, created_at) VALUES (?, ?, ?, ?)`,
      [queueId, JSON.stringify(reading), 0, createdAt]
    );
    console.log(`[ReplicationEngine] Queued telemetry point locally (ID: ${queueId})`);
  } catch (err) {
    console.error("[ReplicationEngine] Error queuing telemetry point:", err);
  }
}

/**
 * Flush and replay un-synced queue items to Firebase Cloud
 */
export async function flushReplicationQueue() {
  if (isReplicating) return;
  isReplicating = true;

  try {
    const pendingItems = await all(
      `SELECT * FROM replication_queue WHERE synced = 0 ORDER BY created_at ASC LIMIT 50`
    );

    if (pendingItems.length === 0) {
      isReplicating = false;
      return;
    }

    console.log(`[ReplicationEngine] Replicating ${pendingItems.length} queued records to Firebase Cloud...`);

    for (const item of pendingItems) {
      try {
        const reading = JSON.parse(item.telemetry_json);
        await syncTelemetryToFirestore(reading);
        await run(`UPDATE replication_queue SET synced = 1 WHERE id = ?`, [item.id]);
      } catch (syncErr) {
        console.warn(`[ReplicationEngine] Cloud sync failed for item ${item.id}. Will retry later.`);
        isCloudOnline = false;
        break;
      }
    }

    // Clean up old synced queue items (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await run(`DELETE FROM replication_queue WHERE synced = 1 AND created_at < ?`, [oneDayAgo]);
  } catch (err) {
    console.error("[ReplicationEngine] Error flushing replication queue:", err);
  } finally {
    isReplicating = false;
  }
}

/**
 * Get current replication queue status metrics
 */
export async function getReplicationMetrics() {
  try {
    const pending = await get(`SELECT COUNT(*) as count FROM replication_queue WHERE synced = 0`);
    const total = await get(`SELECT COUNT(*) as count FROM replication_queue`);
    return {
      isCloudOnline,
      pendingCount: pending?.count || 0,
      totalCount: total?.count || 0,
    };
  } catch (err) {
    return { isCloudOnline: true, pendingCount: 0, totalCount: 0 };
  }
}

/**
 * Start background replication monitoring loop
 */
export function startReplicationLoop() {
  setInterval(async () => {
    try {
      const pending = await get(`SELECT COUNT(*) as count FROM replication_queue WHERE synced = 0`);
      if (pending && pending.count > 0) {
        await flushReplicationQueue();
      }
    } catch {
      // Quiet fail
    }
  }, 10000); // Check every 10s
}
