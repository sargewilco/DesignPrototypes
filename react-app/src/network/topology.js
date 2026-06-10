// Network-domain knowledge: 3GPP/5G reference points, connection validation,
// and ready-made reference-architecture templates.

// Generic node types connect to anything (no enforced reference points).
// "Internet" is the general data network / DN, attachable across topologies.
export const PERMISSIVE_TYPES = new Set([
  'Router',
  'Switch',
  'Server',
  'Client',
  'Internet',
]);

// [typeA, typeB, referencePointLabel]
const REF_DEFS = [
  // --- 5G SA (3GPP TS 23.501) ---
  ['UE', 'gNodeB', 'Uu'],
  ['UE', 'AMF', 'N1'],
  ['gNodeB', 'AMF', 'N2'],
  ['gNodeB', 'UPF', 'N3'],
  ['SMF', 'UPF', 'N4'],
  ['AMF', 'SMF', 'N11'],
  ['AMF', 'UDM', 'N8'],
  ['SMF', 'UDM', 'N10'],
  ['SMF', 'PCF', 'N7'],
  ['AMF', 'PCF', 'N15'],
  ['AMF', 'NSSF', 'N22'],
  ['UDM', 'UDR', 'N35'],
  ['PCF', 'UDR', 'N36'],
  ['NEF', 'PCF', 'N30'],
  ['NEF', 'SMF', 'N29'],
  ['AF', 'NEF', 'N33'],
  ['AF', 'PCF', 'N5'],
  ['UPF', 'Internet', 'N6'],
  // --- EPC / 3GPP LTE (TS 23.401) ---
  ['UE', 'eNodeB', 'LTE-Uu'],
  ['eNodeB', 'MME', 'S1-MME'],
  ['eNodeB', 'SGW', 'S1-U'],
  ['MME', 'SGW', 'S11'],
  ['MME', 'HSS', 'S6a'],
  ['SGW', 'PGW', 'S5/S8'],
  ['PGW', 'Internet', 'SGi'],
];

const pairKey = (a, b) => [a, b].sort().join('|');

const referencePoints = {};
REF_DEFS.forEach(([a, b, label]) => {
  referencePoints[pairKey(a, b)] = label;
});

// Reference-point label for a pair of node types, or '' if none defined.
export function getReferenceLabel(typeA, typeB) {
  return referencePoints[pairKey(typeA, typeB)] || '';
}

// A connection is valid if it involves a generic IT type (permissive) or the
// two mobile-core node types have a defined reference point between them.
export function isValidConnection(typeA, typeB) {
  if (PERMISSIVE_TYPES.has(typeA) || PERMISSIVE_TYPES.has(typeB)) return true;
  return !!getReferenceLabel(typeA, typeB);
}

// Build a LOAD_STATE-shaped diagram from node defs and type-pair edges.
function buildTemplate(nodeDefs, edges) {
  const typeById = {};
  const nodes = nodeDefs.map((n) => {
    typeById[n.id] = n.type;
    return { id: n.id, type: n.type, label: n.type, x: n.x, y: n.y, color: '#ffffff' };
  });
  const connections = edges.map(([a, b]) => ({
    sourceId: a,
    targetId: b,
    flow: 'forward',
    status: 'normal',
    label: getReferenceLabel(typeById[a], typeById[b]),
    sequence: '',
    waypoints: [],
  }));
  return { scale: 1, panX: 0, panY: 0, nodes, connections };
}

export const templates = [
  {
    key: '5gsa',
    name: '5G SA Core',
    build: () =>
      buildTemplate(
        [
          { id: 'ue', type: 'UE', x: 100, y: 300 },
          { id: 'gnb', type: 'gNodeB', x: 280, y: 300 },
          { id: 'amf', type: 'AMF', x: 480, y: 140 },
          { id: 'smf', type: 'SMF', x: 480, y: 300 },
          { id: 'upf', type: 'UPF', x: 480, y: 460 },
          { id: 'udm', type: 'UDM', x: 700, y: 140 },
          { id: 'pcf', type: 'PCF', x: 700, y: 300 },
          { id: 'nssf', type: 'NSSF', x: 700, y: 460 },
          { id: 'af', type: 'AF', x: 920, y: 300 },
          { id: 'internet', type: 'Internet', x: 480, y: 620 },
        ],
        [
          ['ue', 'gnb'],
          ['gnb', 'amf'],
          ['gnb', 'upf'],
          ['amf', 'smf'],
          ['smf', 'upf'],
          ['amf', 'udm'],
          ['smf', 'udm'],
          ['amf', 'pcf'],
          ['smf', 'pcf'],
          ['amf', 'nssf'],
          ['upf', 'internet'],
          ['pcf', 'af'],
        ]
      ),
  },
  {
    key: '3gpp',
    name: 'EPC / LTE Core',
    build: () =>
      buildTemplate(
        [
          { id: 'ue', type: 'UE', x: 100, y: 300 },
          { id: 'enb', type: 'eNodeB', x: 280, y: 300 },
          { id: 'mme', type: 'MME', x: 480, y: 160 },
          { id: 'sgw', type: 'SGW', x: 480, y: 320 },
          { id: 'pgw', type: 'PGW', x: 680, y: 320 },
          { id: 'hss', type: 'HSS', x: 680, y: 160 },
        ],
        [
          ['ue', 'enb'],
          ['enb', 'mme'],
          ['enb', 'sgw'],
          ['mme', 'sgw'],
          ['mme', 'hss'],
          ['sgw', 'pgw'],
        ]
      ),
  },
  {
    key: 'standard',
    name: 'Simple LAN',
    build: () =>
      buildTemplate(
        [
          { id: 'client', type: 'Client', x: 140, y: 300 },
          { id: 'switch', type: 'Switch', x: 320, y: 300 },
          { id: 'router', type: 'Router', x: 500, y: 300 },
          { id: 'server', type: 'Server', x: 680, y: 300 },
        ],
        [
          ['client', 'switch'],
          ['switch', 'router'],
          ['router', 'server'],
        ]
      ),
  },
];

// --- Sample 5G SA flows -----------------------------------------------------
// All flows share one 5G SA topology; each only differs in which links carry
// sequence numbers. Load a flow, then press "Play Sequence" to step through it.
// Sequences are forward chains so the animation direction reads correctly.

const FLOW_NODES = [
  { id: 'ue', type: 'UE', x: 100, y: 300 },
  { id: 'gnb', type: 'gNodeB', x: 280, y: 300 },
  { id: 'amf', type: 'AMF', x: 480, y: 140 },
  { id: 'smf', type: 'SMF', x: 480, y: 300 },
  { id: 'upf', type: 'UPF', x: 480, y: 460 },
  { id: 'udm', type: 'UDM', x: 700, y: 140 },
  { id: 'pcf', type: 'PCF', x: 700, y: 300 },
  { id: 'internet', type: 'Internet', x: 480, y: 620 },
];

const FLOW_EDGES = [
  ['ue', 'gnb'],
  ['gnb', 'amf'],
  ['gnb', 'upf'],
  ['amf', 'smf'],
  ['smf', 'upf'],
  ['amf', 'udm'],
  ['smf', 'udm'],
  ['amf', 'pcf'],
  ['smf', 'pcf'],
  ['upf', 'internet'],
];

// seq maps "srcId-tgtId" (matching FLOW_EDGES order) -> sequence string.
function buildFlow(seq) {
  const tpl = buildTemplate(FLOW_NODES, FLOW_EDGES);
  tpl.connections = tpl.connections.map((c, i) => {
    const key = `${FLOW_EDGES[i][0]}-${FLOW_EDGES[i][1]}`;
    return seq[key] ? { ...c, sequence: seq[key] } : c;
  });
  return tpl;
}

export const flows = [
  {
    key: 'registration',
    name: 'UE Registration (CP)',
    build: () =>
      buildFlow({
        'ue-gnb': '1', // RRC + Registration Request
        'gnb-amf': '2', // N2: NAS to AMF
        'amf-udm': '3', // N8: authentication / subscription
        'amf-pcf': '4', // N15: AM policy association
      }),
  },
  {
    key: 'pdu-session',
    name: 'PDU Session Setup (CP)',
    build: () =>
      buildFlow({
        'ue-gnb': '1', // PDU Session Establishment Request
        'gnb-amf': '2', // N2 to AMF
        'amf-smf': '3', // N11: create SM context
        'smf-udm': '4', // N10: session management subscription
        'smf-pcf': '5', // N7: SM policy association
        'smf-upf': '6', // N4: UPF session establishment
      }),
  },
  {
    key: 'user-plane',
    name: 'User-Plane Data (UP)',
    build: () =>
      buildFlow({
        'ue-gnb': '1', // uplink data over the air
        'gnb-upf': '2', // N3: GTP-U to UPF
        'upf-internet': '3', // N6: out to the data network
      }),
  },
];
