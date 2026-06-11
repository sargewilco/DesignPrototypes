// AI Assist proxy. Holds ANTHROPIC_API_KEY server-side (it must never reach the
// browser) and exposes a small endpoint that turns a natural-language prompt
// into the diagram JSON the React app already understands.
//
// Run with:  npm run server      (reads react-app/.env for ANTHROPIC_API_KEY)

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.AI_PROXY_PORT || 8787;
const hasKey = !!process.env.ANTHROPIC_API_KEY;
const client = hasKey ? new Anthropic() : null;

// Allowed node types — mirrors the palette in src/constants.js. The schema's
// enum makes it structurally impossible for the model to invent a type the app
// can't render. The client re-derives reference-point labels and validity from
// src/network/topology.js, so this list only needs to stay roughly in sync.
const NODE_TYPES = [
  // Generic IT / enterprise
  'Router', 'Switch', 'Server', 'Client', 'Firewall',
  'Load Balancer', 'Database', 'Access Point', 'Cloud', 'Internet',
  // 4G / EPC
  'UE', 'eNodeB', 'MME', 'SGW', 'PGW', 'HSS', 'PCRF', 'OCS', 'ePDG',
  // 5G SA
  'gNodeB', 'AMF', 'SMF', 'UPF', 'AUSF', 'NRF',
  'PCF', 'UDM', 'UDR', 'NSSF', 'NEF', 'AF', 'CHF', 'SMSF',
];

const diagramSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: NODE_TYPES },
          label: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['id', 'type', 'label', 'x', 'y'],
      },
    },
    connections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sourceId: { type: 'string' },
          targetId: { type: 'string' },
        },
        required: ['sourceId', 'targetId'],
      },
    },
  },
  required: ['nodes', 'connections'],
};

const SYSTEM_PROMPT = `You generate network topology diagrams as JSON for a network design tool. Output only an object with "nodes" and "connections" matching the provided schema — no prose.

Node types you may use:
- Generic IT / enterprise: Router, Switch, Server, Client, Firewall, Load Balancer, Database, Access Point, Cloud, Internet
- 4G / EPC (3GPP LTE): UE, eNodeB, MME, SGW, PGW, HSS, PCRF, OCS, ePDG, Internet
- 5G SA: UE, gNodeB, AMF, SMF, UPF, AUSF, NRF, PCF, UDM, UDR, NSSF, NEF, AF, CHF, SMSF, Internet

Each node needs a unique short id (e.g. "amf", "gnb1"), a type from the list, a human label (usually the type name), and x/y canvas coordinates.

Connections reference node ids (sourceId, targetId). Only connect nodes that have a real adjacency:
- 5G SA reference points: UE-gNodeB, UE-AMF, gNodeB-AMF, gNodeB-UPF, SMF-UPF, AMF-SMF, AMF-UDM, SMF-UDM, SMF-PCF, AMF-PCF, AMF-NSSF, UDM-UDR, PCF-UDR, AF-NEF, AF-PCF, UPF-Internet, AMF-AUSF, AUSF-UDM, SMF-CHF, PCF-CHF, AMF-SMSF, SMSF-UDM. NRF is service discovery and may connect to any control-plane NF (AMF, SMF, AUSF, UDM, PCF, NSSF, NEF, CHF, SMSF).
- EPC reference points: UE-eNodeB, eNodeB-MME, eNodeB-SGW, MME-SGW, MME-HSS, SGW-PGW, PGW-Internet, PGW-PCRF, PCRF-AF, PCRF-OCS, PGW-OCS, PGW-ePDG, UE-ePDG.
- Generic IT: connect sensibly (Client-Switch, Switch-Router, Router-Firewall, Firewall-Internet, Load Balancer-Server, Server-Database, Access Point-Switch). Firewall, Load Balancer, Database, Access Point, and Cloud can connect to anything reasonable.

Layout: place nodes left-to-right by role. Access/RAN on the left, control-plane functions in the middle, user-plane (UPF/SGW/PGW) lower, and the data network/Internet toward the right or bottom. Space nodes about 180px apart horizontally and 150px vertically, with coordinates roughly in x: 80-1000, y: 80-700.

Include only the nodes and links the user asked for. Keep it minimal and correct.`;

app.get('/api/health', (req, res) => {
  res.json({ ok: true, llm: hasKey });
});

app.post('/api/generate-diagram', async (req, res) => {
  if (!client) {
    return res.status(503).json({
      error: 'No ANTHROPIC_API_KEY configured on the proxy. Add it to react-app/.env and restart the server.',
    });
  }
  const prompt = (req.body && typeof req.body.prompt === 'string' ? req.body.prompt : '').trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Missing "prompt".' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: { type: 'json_schema', schema: diagramSchema }, effort: 'medium' },
    });

    if (message.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'The model declined to generate that diagram.' });
    }

    const textBlock = message.content.find((b) => b.type === 'text');
    const raw = textBlock ? textBlock.text : '';
    let diagram;
    try {
      diagram = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ error: 'The model did not return valid JSON. Try rephrasing.' });
    }
    return res.json(diagram);
  } catch (err) {
    console.error('generate-diagram failed:', err);
    const status = err && err.status ? err.status : 500;
    return res.status(status).json({ error: (err && err.message) || 'LLM request failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`AI Assist proxy listening on http://localhost:${PORT}`);
  console.log(`  LLM: ${hasKey ? 'ready' : 'NOT configured (set ANTHROPIC_API_KEY in react-app/.env)'}`);
});
