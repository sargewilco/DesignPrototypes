import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, DEFAULT_LB_ALGORITHM } from '../constants';

export const initialState = {
  networkSet: 'standard',
  nodes: {}, // id -> { id, type, label, x, y, width, height, color }
  connections: [], // { id, sourceId, targetId, flow, status, label, sequence, waypoints }
  selectedNodeIds: [],
  selectedConnectionId: null,
  scale: 1,
  panX: 0,
  panY: 0,
  past: [],
  future: [],
};

const HISTORY_LIMIT = 50;

// The slice of state that participates in undo/redo.
function snapshot(state) {
  return {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    connections: JSON.parse(JSON.stringify(state.connections)),
    scale: state.scale,
    panX: state.panX,
    panY: state.panY,
  };
}

// Returns the history fields for a state about to be mutated by a
// "committing" action: the pre-mutation snapshot is pushed onto the past.
function pushHistory(state) {
  return {
    past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
    future: [],
  };
}

const diagramReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NETWORK_SET':
      return { ...state, networkSet: action.payload };

    // --- Committing mutations (recorded in history) ---
    case 'ADD_NODE':
      return {
        ...state,
        ...pushHistory(state),
        nodes: { ...state.nodes, [action.payload.id]: action.payload },
      };

    case 'ADD_CONNECTION': {
      const exists = state.connections.some(
        (c) =>
          (c.sourceId === action.payload.sourceId && c.targetId === action.payload.targetId) ||
          (c.sourceId === action.payload.targetId && c.targetId === action.payload.sourceId)
      );
      if (exists) return state;
      return {
        ...state,
        ...pushHistory(state),
        connections: [...state.connections, action.payload],
      };
    }

    case 'DELETE_NODES': {
      const ids = new Set(action.payload);
      const nodes = { ...state.nodes };
      ids.forEach((id) => delete nodes[id]);
      return {
        ...state,
        ...pushHistory(state),
        nodes,
        connections: state.connections.filter(
          (c) => !ids.has(c.sourceId) && !ids.has(c.targetId)
        ),
        selectedNodeIds: [],
      };
    }

    case 'DELETE_CONNECTION':
      return {
        ...state,
        ...pushHistory(state),
        connections: state.connections.filter((c) => c.id !== action.payload),
        selectedConnectionId:
          state.selectedConnectionId === action.payload ? null : state.selectedConnectionId,
      };

    case 'UPDATE_CONNECTION':
      return {
        ...state,
        ...pushHistory(state),
        connections: state.connections.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload.changes } : c
        ),
      };

    case 'ADD_WAYPOINT':
      return {
        ...state,
        ...pushHistory(state),
        connections: state.connections.map((c) =>
          c.id === action.payload.connId
            ? { ...c, waypoints: [...c.waypoints, action.payload.waypoint] }
            : c
        ),
      };

    case 'SET_NODE_COLOR': {
      const ids = new Set(action.payload.ids);
      const nodes = { ...state.nodes };
      ids.forEach((id) => {
        if (nodes[id]) nodes[id] = { ...nodes[id], color: action.payload.color };
      });
      return { ...state, ...pushHistory(state), nodes };
    }

    case 'SET_NODE_ALGORITHM': {
      const ids = new Set(action.payload.ids);
      const nodes = { ...state.nodes };
      ids.forEach((id) => {
        if (nodes[id]) nodes[id] = { ...nodes[id], algorithm: action.payload.algorithm };
      });
      return { ...state, ...pushHistory(state), nodes };
    }

    case 'LOAD_STATE': {
      const data = action.payload;
      const nodes = {};
      (data.nodes || []).forEach((n) => {
        nodes[n.id] = {
          id: n.id,
          type: n.type,
          label: n.label != null ? n.label : (n.textContent || n.type),
          x: n.x,
          y: n.y,
          width: n.width || DEFAULT_NODE_WIDTH,
          height: n.height || DEFAULT_NODE_HEIGHT,
          color: n.color || '#ffffff',
          algorithm:
            n.type === 'Load Balancer' ? n.algorithm || DEFAULT_LB_ALGORITHM : n.algorithm,
        };
      });
      const connections = (data.connections || []).map((c, i) => ({
        id: c.id || `conn_${c.sourceId}_${c.targetId}_${i}`,
        sourceId: c.sourceId,
        targetId: c.targetId,
        flow: c.flow || 'forward',
        status: c.status || 'normal',
        label: c.label || '',
        sequence: c.sequence || '',
        waypoints: (c.waypoints || []).map((wp) => ({ x: wp.x, y: wp.y })),
      }));
      return {
        ...state,
        ...pushHistory(state),
        nodes,
        connections,
        scale: data.scale || 1,
        panX: data.panX || 0,
        panY: data.panY || 0,
        selectedNodeIds: [],
        selectedConnectionId: null,
      };
    }

    case 'CLEAR':
      return {
        ...state,
        ...pushHistory(state),
        nodes: {},
        connections: [],
        selectedNodeIds: [],
        selectedConnectionId: null,
        scale: 1,
        panX: 0,
        panY: 0,
      };

    // Explicit pre-mutation snapshot used for drag operations.
    case 'COMMIT':
      return { ...state, ...pushHistory(state) };

    // --- Non-committing mutations (not recorded individually) ---
    case 'UPDATE_NODE':
      if (!state.nodes[action.payload.id]) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload.id]: { ...state.nodes[action.payload.id], ...action.payload.changes },
        },
      };

    case 'MOVE_NODES': {
      const nodes = { ...state.nodes };
      action.payload.forEach(({ id, x, y }) => {
        if (nodes[id]) nodes[id] = { ...nodes[id], x, y };
      });
      return { ...state, nodes };
    }

    case 'SET_NODE_SIZE': {
      const node = state.nodes[action.payload.id];
      if (!node || (node.width === action.payload.width && node.height === action.payload.height)) {
        return state;
      }
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload.id]: {
            ...node,
            width: action.payload.width,
            height: action.payload.height,
          },
        },
      };
    }

    case 'MOVE_WAYPOINT':
      return {
        ...state,
        connections: state.connections.map((c) => {
          if (c.id !== action.payload.connId) return c;
          const waypoints = c.waypoints.map((wp, i) =>
            i === action.payload.index ? { x: action.payload.x, y: action.payload.y } : wp
          );
          return { ...c, waypoints };
        }),
      };

    case 'SET_TRANSFORM':
      return {
        ...state,
        scale: action.payload.scale != null ? action.payload.scale : state.scale,
        panX: action.payload.panX != null ? action.payload.panX : state.panX,
        panY: action.payload.panY != null ? action.payload.panY : state.panY,
      };

    // --- Selection ---
    case 'SET_SELECTED_NODES':
      return { ...state, selectedNodeIds: action.payload, selectedConnectionId: null };

    case 'TOGGLE_SELECTED_NODE': {
      const id = action.payload;
      const has = state.selectedNodeIds.includes(id);
      return {
        ...state,
        selectedNodeIds: has
          ? state.selectedNodeIds.filter((n) => n !== id)
          : [...state.selectedNodeIds, id],
        selectedConnectionId: null,
      };
    }

    case 'SELECT_CONNECTION':
      return { ...state, selectedConnectionId: action.payload, selectedNodeIds: [] };

    case 'DESELECT_ALL':
      return { ...state, selectedNodeIds: [], selectedConnectionId: null };

    // --- Undo / Redo ---
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        ...prev,
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future],
        selectedNodeIds: [],
        selectedConnectionId: null,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        ...next,
        past: [...state.past, snapshot(state)],
        future: state.future.slice(1),
        selectedNodeIds: [],
        selectedConnectionId: null,
      };
    }

    default:
      return state;
  }
};

export default diagramReducer;
