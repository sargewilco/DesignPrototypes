import React from 'react';
import { useSimulation } from '../context/SimulationContext';

const FlowControls = () => {
  const {
    scenario,
    stepIndex,
    stepCount,
    isPlaying,
    currentStep,
    ladderOpen,
    togglePlay,
    next,
    prev,
    stop,
    clear,
    setLadderOpen,
  } = useSimulation();

  if (!scenario) return null;

  const human = stepIndex < 0 ? 0 : stepIndex + 1;

  return (
    <div className="flow-controls">
      <div className="flow-title">{scenario.name}</div>

      <div className="flow-buttons">
        <button className="flow-btn" onClick={prev} disabled={stepIndex <= 0} title="Previous step">
          ⏮
        </button>
        <button className="flow-btn flow-play" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          className="flow-btn"
          onClick={next}
          disabled={stepIndex >= stepCount - 1}
          title="Next step"
        >
          ⏭
        </button>
        <button className="flow-btn" onClick={stop} title="Reset to start" disabled={stepIndex < 0}>
          ⏹
        </button>
      </div>

      <div className="flow-status">
        <span className="flow-step-count">
          Step {human} / {stepCount}
        </span>
        <span className="flow-message">{currentStep ? currentStep.message : 'Ready — press play'}</span>
      </div>

      <div className="flow-buttons">
        <button
          className={`flow-btn flow-ladder ${ladderOpen ? 'active' : ''}`}
          onClick={() => setLadderOpen(!ladderOpen)}
          title="Toggle sequence (ladder) diagram"
        >
          Ladder
        </button>
        <button className="flow-btn" onClick={clear} title="Close scenario">
          ✕
        </button>
      </div>
    </div>
  );
};

export default FlowControls;
