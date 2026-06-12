// Single-packet trace engine.
//
// Builds an ordered list of hops (the same { from, to, message } shape the
// simulation engine animates) by walking the current diagram from a source to a
// destination. At a Load Balancer with more than one viable next hop, the LB's
// algorithm decides which backend branch this packet takes. Non-LB forks pick
// the first viable branch toward the destination (real router routing is a
// later phase).

import { getReferenceLabel } from './topology';

const MAX_HOPS = 64;

function neighbors(nodeId, connections) {
  const out = [];
  connections.forEach((c) => {
    if (c.sourceId === nodeId) out.push({ nodeId: c.targetId, conn: c });
    else if (c.targetId === nodeId) out.push({ nodeId: c.sourceId, conn: c });
  });
  return out;
}

// Can we reach destId starting from startId, without routing back through
// blockedId? (blockedId is the node we just came from.)
function canReach(startId, destId, blockedId, connections) {
  if (startId === destId) return true;
  const seen = new Set([startId]);
  if (blockedId != null) seen.add(blockedId);
  const queue = [startId];
  while (queue.length) {
    const n = queue.shift();
    for (const nb of neighbors(n, connections)) {
      if (nb.nodeId === destId) return true;
      if (seen.has(nb.nodeId)) continue;
      seen.add(nb.nodeId);
      queue.push(nb.nodeId);
    }
  }
  return false;
}

function hashKey(key) {
  let h = 0;
  const s = String(key);
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Choose a backend among viable candidate edges per the LB algorithm.
// lbState carries persistent per-LB state across traces (rr pointers, etc.).
function chooseBackend(lbId, cands, algorithm, lbState, sourceKey, labelOf) {
  const sorted = [...cands].sort((a, b) => (a.nodeId < b.nodeId ? -1 : 1));

  switch (algorithm) {
    case 'Weighted Round Robin': {
      const cw = (lbState.wrr[lbId] = lbState.wrr[lbId] || {});
      let total = 0;
      let best = null;
      let bestVal = -Infinity;
      sorted.forEach((c) => {
        const w = Number(c.conn.weight) || 1;
        total += w;
        cw[c.nodeId] = (cw[c.nodeId] || 0) + w;
        if (cw[c.nodeId] > bestVal) {
          bestVal = cw[c.nodeId];
          best = c;
        }
      });
      cw[best.nodeId] -= total;
      return { pick: best, rationale: `Weighted RR (weight ${Number(best.conn.weight) || 1} of ${total})` };
    }
    case 'Least Connections': {
      let best = sorted[0];
      let bestC = Number(sorted[0].conn.activeConnections) || 0;
      sorted.forEach((c) => {
        const cc = Number(c.conn.activeConnections) || 0;
        if (cc < bestC) {
          bestC = cc;
          best = c;
        }
      });
      const counts = sorted.map((c) => `${labelOf(c.nodeId)}=${Number(c.conn.activeConnections) || 0}`).join(', ');
      return { pick: best, rationale: `Least Connections (${counts})` };
    }
    case 'Least Response Time': {
      let best = sorted[0];
      let bestR = Number(sorted[0].conn.responseTime) || 0;
      sorted.forEach((c) => {
        const r = Number(c.conn.responseTime) || 0;
        if (r < bestR) {
          bestR = r;
          best = c;
        }
      });
      const rts = sorted.map((c) => `${labelOf(c.nodeId)}=${Number(c.conn.responseTime) || 0}ms`).join(', ');
      return { pick: best, rationale: `Least Response Time (${rts})` };
    }
    case 'IP Hash': {
      const idx = hashKey(sourceKey) % sorted.length;
      return { pick: sorted[idx], rationale: `IP Hash of "${sourceKey}" → ${idx + 1}/${sorted.length}` };
    }
    case 'Random': {
      const n = (lbState.rnd[lbId] = (lbState.rnd[lbId] || 0) + 1);
      const idx = hashKey(`${sourceKey}|${lbId}|${n}`) % sorted.length;
      return { pick: sorted[idx], rationale: 'Random' };
    }
    case 'Round Robin':
    default: {
      const ptr = lbState.rr[lbId] || 0;
      const idx = ptr % sorted.length;
      lbState.rr[lbId] = ptr + 1;
      return { pick: sorted[idx], rationale: `Round Robin (rotation ${idx + 1}/${sorted.length})` };
    }
  }
}

export function buildTrace(nodes, connections, sourceId, targetId, lbState, options = {}) {
  const labelOf = (id) => (nodes[id] ? nodes[id].label : id);

  if (!sourceId || !targetId) return { error: 'Pick a source and a destination.' };
  if (sourceId === targetId) return { error: 'Source and destination must be different.' };
  if (!nodes[sourceId] || !nodes[targetId]) return { error: 'Source or destination no longer exists.' };
  if (!canReach(sourceId, targetId, null, connections)) {
    return { error: `No path from ${labelOf(sourceId)} to ${labelOf(targetId)}.` };
  }

  const sourceKey = options.sourceKey || sourceId;
  const steps = [];
  const visited = new Set([sourceId]);
  let prev = null;
  let current = sourceId;

  while (current !== targetId) {
    if (steps.length > MAX_HOPS) {
      return { error: 'Trace exceeded the hop limit (possible loop).', steps };
    }

    // Block-scoped copies so closures below don't capture mutating loop vars.
    const from = current;
    const cameFrom = prev;
    const cands = neighbors(from, connections).filter((n) => n.nodeId !== cameFrom);
    const viable = cands.filter(
      (c) => c.nodeId === targetId || canReach(c.nodeId, targetId, from, connections)
    );
    if (viable.length === 0) {
      return { error: `Dead end at ${labelOf(from)} — no route onward to ${labelOf(targetId)}.`, steps };
    }

    let chosen;
    let rationale = '';
    if (nodes[from].type === 'Load Balancer' && viable.length > 1) {
      const algorithm = nodes[from].algorithm || 'Round Robin';
      const res = chooseBackend(from, viable, algorithm, lbState, sourceKey, labelOf);
      chosen = res.pick;
      rationale = res.rationale;
    } else if (viable.length === 1) {
      [chosen] = viable;
    } else {
      // Non-LB fork: pick the first viable branch toward the destination.
      [chosen] = [...viable].sort((a, b) => (a.nodeId < b.nodeId ? -1 : 1));
      rationale = 'forward (first viable path)';
    }

    const refLabel = getReferenceLabel(nodes[from].type, nodes[chosen.nodeId].type) || chosen.conn.label || '';
    const message = rationale || refLabel || 'forward';
    steps.push({ from, to: chosen.nodeId, message });

    if (visited.has(chosen.nodeId) && chosen.nodeId !== targetId) {
      return { error: `Loop detected at ${labelOf(chosen.nodeId)}.`, steps };
    }
    visited.add(chosen.nodeId);
    prev = from;
    current = chosen.nodeId;
  }

  return { steps };
}
