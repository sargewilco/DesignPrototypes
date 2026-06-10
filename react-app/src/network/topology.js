// Network-domain knowledge: 3GPP/5G reference points, connection validation,
// and ready-made reference-architecture templates.

// Generic IT node types connect to anything (no enforced reference points).
export const PERMISSIVE_TYPES = new Set(['Router', 'Switch', 'Server', 'Client']);

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
  // --- EPC / 3GPP LTE (TS 23.401) ---
  ['UE', 'eNodeB', 'LTE-Uu'],
  ['eNodeB', 'MME', 'S1-MME'],
  ['eNodeB', 'SGW', 'S1-U'],
  ['MME', 'SGW', 'S11'],
  ['MME', 'HSS', 'S6a'],
  ['SGW', 'PGW', 'S5/S8'],
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
          { id: 'ue', type: 'UE', x: 100, y: 320 },
          { id: 'gnb', type: 'gNodeB', x: 280, y: 320 },
          { id: 'amf', type: 'AMF', x: 480, y: 160 },
          { id: 'smf', type: 'SMF', x: 480, y: 320 },
          { id: 'upf', type: 'UPF', x: 480, y: 480 },
          { id: 'udm', type: 'UDM', x: 700, y: 160 },
          { id: 'pcf', type: 'PCF', x: 700, y: 320 },
          { id: 'nssf', type: 'NSSF', x: 700, y: 480 },
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
