import React, { useState, useEffect, useCallback } from 'react';
import { useDiagram } from '../context/DiagramContext';
import { getReferenceLabel } from '../network/topology';
import { snapToGrid } from '../utils/geometry';

// Base URL for the proxy. In dev, the CRA "proxy" field forwards /api to the
// Express server, so the default relative base just works.
const ENDPOINT = process.env.REACT_APP_AI_ENDPOINT || '/api';

const EXAMPLES = [
  'A 5G SA core with two gNodeBs sharing one UPF, out to the internet',
  'A basic EPC/LTE network with one eNodeB',
  'A small office LAN: clients, a switch, a router, and a server',
];

// Turn the model's raw {nodes, connections} into a LOAD_STATE payload, reusing
// the app's own topology knowledge: drop dangling links, snap to grid, and
// re-derive reference-point labels (don't trust the model's labels).
function buildPayload(data) {
  const rawNodes = Array.isArray(data && data.nodes) ? data.nodes : [];
  const ids = new Set(rawNodes.map((n) => n.id));
  const typeById = {};
  rawNodes.forEach((n) => {
    typeById[n.id] = n.type;
  });

  const nodes = rawNodes.map((n) => ({
    id: n.id,
    type: n.type,
    label: n.label || n.type,
    x: snapToGrid(Number(n.x) || 0),
    y: snapToGrid(Number(n.y) || 0),
    color: '#ffffff',
  }));

  const rawConns = Array.isArray(data && data.connections) ? data.connections : [];
  const seen = new Set();
  const connections = [];
  rawConns.forEach((c) => {
    if (!ids.has(c.sourceId) || !ids.has(c.targetId) || c.sourceId === c.targetId) return;
    const key = [c.sourceId, c.targetId].sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    connections.push({
      sourceId: c.sourceId,
      targetId: c.targetId,
      flow: 'forward',
      status: 'normal',
      label: getReferenceLabel(typeById[c.sourceId], typeById[c.targetId]),
      sequence: '',
      waypoints: [],
    });
  });

  return { scale: 1, panX: 0, panY: 0, nodes, connections };
}

const AIAssistPanel = () => {
  const { state, dispatch } = useDiagram();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState('checking'); // checking | ready | no-key | unreachable

  useEffect(() => {
    let cancelled = false;
    fetch(`${ENDPOINT}/health`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
      .then((j) => {
        if (!cancelled) setHealth(j.llm ? 'ready' : 'no-key');
      })
      .catch(() => {
        if (!cancelled) setHealth('unreachable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = useCallback(async () => {
    const p = prompt.trim();
    if (!p || loading) return;
    const hasContent =
      Object.keys(state.nodes).length > 0 || state.connections.length > 0;
    if (hasContent && !window.confirm('Replace the current diagram with the generated one?')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${ENDPOINT}/generate-diagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${resp.status})`);
      }
      const data = await resp.json();
      const payload = buildPayload(data);
      if (payload.nodes.length === 0) {
        throw new Error('The model returned an empty diagram. Try rephrasing.');
      }
      dispatch({ type: 'LOAD_STATE', payload });
      setHealth('ready');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, state.nodes, state.connections, dispatch]);

  return (
    <div className="sidebar-section ai-panel">
      <h2>AI Assist</h2>

      {health === 'unreachable' && (
        <div className="ai-status ai-status-warn">
          Proxy not reachable. Start it with <code>npm run server</code>.
        </div>
      )}
      {health === 'no-key' && (
        <div className="ai-status ai-status-warn">
          No API key on the proxy. Add <code>ANTHROPIC_API_KEY</code> to
          {' '}<code>react-app/.env</code> and restart it.
        </div>
      )}
      {health === 'ready' && <div className="ai-status ai-status-ok">✓ LLM connected</div>}

      <textarea
        className="ai-prompt"
        rows={3}
        placeholder="Describe a network to generate…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate();
        }}
        disabled={loading}
      />
      <button
        className="tool-btn ai-generate"
        onClick={generate}
        disabled={loading || !prompt.trim() || health === 'unreachable' || health === 'no-key'}
      >
        {loading ? 'Generating…' : 'Generate Diagram'}
      </button>

      {error && <div className="ai-status ai-status-error">{error}</div>}

      <div className="ai-examples">
        <span className="ai-examples-label">Try:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} className="ai-example" onClick={() => setPrompt(ex)} disabled={loading}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIAssistPanel;
