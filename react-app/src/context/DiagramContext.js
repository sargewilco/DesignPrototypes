import React, { createContext, useReducer, useContext } from 'react';
import diagramReducer, { initialState } from './diagramReducer';

const DiagramContext = createContext();

export const DiagramProvider = ({ children }) => {
  const [state, dispatch] = useReducer(diagramReducer, initialState);

  return (
    <DiagramContext.Provider value={{ state, dispatch }}>
      {children}
    </DiagramContext.Provider>
  );
};

export const useDiagram = () => useContext(DiagramContext);
