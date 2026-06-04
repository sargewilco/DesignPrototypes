export const initialState = {
  nodes: {},
  connections: [],
  selectedNodeIds: [],
  selectedConnectionId: null,
};

const diagramReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NODE':
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload.id]: action.payload,
        },
      };
    case 'ADD_CONNECTION':
      return {
        ...state,
        connections: [...state.connections, action.payload],
      };
    case 'SET_SELECTED_NODES':
      return {
        ...state,
        selectedNodeIds: action.payload,
      };
    default:
      return state;
  }
};

export default diagramReducer;
