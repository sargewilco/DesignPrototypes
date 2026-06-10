import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDiagram } from './DiagramContext';

const SimulationContext = createContext();

// Time each step is shown before auto-advancing during playback.
const STEP_MS = 1600;

export const SimulationProvider = ({ children }) => {
  const { dispatch } = useDiagram();
  const [scenario, setScenario] = useState(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ladderOpen, setLadderOpen] = useState(false);

  const stepCount = scenario ? scenario.steps.length : 0;

  const loadScenario = useCallback(
    (s) => {
      dispatch({ type: 'LOAD_STATE', payload: s.build() });
      setScenario(s);
      setStepIndex(-1);
      setIsPlaying(false);
      setLadderOpen(false);
    },
    [dispatch]
  );

  const play = useCallback(() => {
    if (!scenario) return;
    setStepIndex((i) => (i < 0 || i >= scenario.steps.length - 1 ? 0 : i));
    setIsPlaying(true);
  }, [scenario]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    setIsPlaying(false);
    setStepIndex((i) => Math.min(i + 1, stepCount - 1));
  }, [stepCount]);

  const prev = useCallback(() => {
    setIsPlaying(false);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback((i) => {
    setIsPlaying(false);
    setStepIndex(i);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setStepIndex(-1);
  }, []);

  const clear = useCallback(() => {
    setIsPlaying(false);
    setStepIndex(-1);
    setScenario(null);
    setLadderOpen(false);
  }, []);

  // Auto-advance while playing.
  useEffect(() => {
    if (!isPlaying || !scenario) return undefined;
    if (stepIndex >= scenario.steps.length - 1) {
      const t = setTimeout(() => setIsPlaying(false), STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [isPlaying, stepIndex, scenario]);

  const value = {
    scenario,
    stepIndex,
    stepCount,
    isPlaying,
    ladderOpen,
    scenarioActive: !!scenario && stepIndex >= 0,
    currentStep: scenario && stepIndex >= 0 ? scenario.steps[stepIndex] : null,
    loadScenario,
    play,
    pause,
    togglePlay,
    next,
    prev,
    goTo,
    stop,
    clear,
    setLadderOpen,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

export const useSimulation = () => useContext(SimulationContext);
