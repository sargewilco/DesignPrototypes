// Shared configuration for the diagram tool.

export const GRID_SIZE = 20;

// Default node dimensions (unscaled). Real size is measured after render.
export const DEFAULT_NODE_WIDTH = 80;
export const DEFAULT_NODE_HEIGHT = 54;

// Palette element libraries, keyed by network type.
export const elementSets = {
  standard: ['Router', 'Switch', 'Server', 'Client', 'Internet'],
  '3gpp': ['UE', 'eNodeB', 'MME', 'SGW', 'PGW', 'HSS', 'Internet'],
  '5gsa': ['UE', 'gNodeB', 'AMF', 'SMF', 'UPF', 'PCF', 'UDM', 'UDR', 'NSSF', 'NEF', 'AF', 'Internet'],
};

export const networkTypeOptions = [
  { value: 'standard', label: 'Standard' },
  { value: '3gpp', label: '3GPP Mobile' },
  { value: '5gsa', label: '5G SA Mobile' },
];

export const presetColors = [
  '#ffffff', // White
  '#f8d7da', // Pastel Red
  '#d4edda', // Pastel Green
  '#cce5ff', // Pastel Blue
  '#fff3cd', // Pastel Yellow
  '#e2e3e5', // Light Gray
  '#f5c6cb', // Darker Red
  '#b8daff', // Darker Blue
  '#ffeeba', // Darker Yellow
  '#343a40', // Dark
];

export const flowOptions = [
  { value: 'forward', label: '➡️ Forward' },
  { value: 'reverse', label: '⬅️ Reverse' },
  { value: 'bidirectional', label: '↔️ Bidirectional' },
];

export const statusOptions = [
  { value: 'normal', label: '🟢 Normal' },
  { value: 'congested', label: '🟡 Congested' },
  { value: 'down', label: '🔴 Down' },
];
