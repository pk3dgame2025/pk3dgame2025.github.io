import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import RobloxCharacter from './RobloxCharacter';
import ObbyEnvironment from './ObbyEnvironment';
import './App.css';

// Game UI Component
const GameUI = ({ 
  stage, 
  height, 
  zone, 
  checkpoints, 
  progress, 
  isVictory,
  instructions 
}) => {
  return (
    <div className="game-ui">
      {/* Main Stats Panel */}
      <div className="stats-panel">
        <div className="stat-item">
          <span className="stat-label">Stage</span>
          <span className="stat-value">{stage}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Height</span>
          <span className="stat-value">{height.toFixed(1)}m</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Zone</span>
          <span className="stat-value">{zone}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Checkpoints</span>
          <span className="stat-value">{checkpoints}</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="progress-text">{progress.toFixed(1)}% Complete</span>
      </div>
      
      {/* Victory Message */}
      {isVictory && (
        <div className="victory-message">
          <h1>🎉 VICTORY! 🎉</h1>
          <p>You conquered the Obby Tower!</p>
        </div>
      )}
      
      {/* Instructions */}
      <div className="instructions-panel">
        <h3>Controls:</h3>
        <div className="controls-grid">
          <div>WASD - Move</div>
          <div>Space - Jump</div>
          <div>Arrow Keys - Camera</div>
          <div>Right Click + Drag - Mouse Look</div>
        </div>
      </div>
    </div>
  );
};

// Loading Component
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-content">
      <h1>🎮 Roblox Obby Game 🎮</h1>
      <div className="loading-spinner"></div>
      <p>Loading 3D World...</p>
    </div>
  </div>
);

// Main App Component
function App() {
  const [playerPosition, setPlayerPosition] = useState([0, 2, 0]);
  const [gameStats, setGameStats] = useState({
    stage: 1,
    height: 2,
    zone: 'Spawn',
    checkpoints: 0,
    progress: 0,
    isVictory: false
  });
  
  // Update game stats based on player position
  useEffect(() => {
    const height = Math.max(0, (playerPosition[1] || 2) - 1);
    const maxHeight = 50 * 0.8; // 50 levels * 0.8 height increment
    const progress = Math.min(100, (height / maxHeight) * 100);
    
    let stage = 1;
    let zone = 'Spawn';
    
    if (height > 40) {
      stage = 5;
      zone = 'Master';
    } else if (height > 30) {
      stage = 4;
      zone = 'Expert';
    } else if (height > 20) {
      stage = 3;
      zone = 'Hard';
    } else if (height > 10) {
      stage = 2;
      zone = 'Medium';
    } else if (height > 2) {
      stage = 1;
      zone = 'Easy';
    }
    
    const isVictory = progress >= 95;
    
    setGameStats(prev => ({
      ...prev,
      stage,
      height,
      zone,
      progress,
      isVictory
    }));
  }, [playerPosition]);
  
  const handleCheckpoint = (level) => {
    setGameStats(prev => ({
      ...prev,
      checkpoints: prev.checkpoints + 1
    }));
  };
  
  return (
    <div className="App">
      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: [12, 6, 12],
          fov: 60
        }}
        shadows={false} // Disabled for performance
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[50, 50, 50]}
            intensity={0.8}
            castShadow={false} // Disabled for performance
          />
          
          {/* Environment and Fog */}
          <fog attach="fog" args={['#87CEEB', 30, 100]} />
          
          {/* Game Environment */}
          <ObbyEnvironment playerPosition={playerPosition} />
          
          {/* Player Character */}
          <RobloxCharacter
            position={[0, 2, 0]}
            onPositionChange={setPlayerPosition}
            onCheckpoint={handleCheckpoint}
          />
          
          {/* Optional: Environment for better lighting */}
          <Environment preset="city" />
        </Suspense>
      </Canvas>
      
      {/* Game UI Overlay */}
      <GameUI
        stage={gameStats.stage}
        height={gameStats.height}
        zone={gameStats.zone}
        checkpoints={gameStats.checkpoints}
        progress={gameStats.progress}
        isVictory={gameStats.isVictory}
      />
      
      {/* Touch Controls for Mobile */}
      <div className="touch-controls">
        <div className="touch-pad" id="movement-pad">
          <div className="touch-center">MOVE</div>
        </div>
        <div className="jump-button" id="jump-button">
          JUMP
        </div>
      </div>
      
      {/* Loading Screen */}
      <Suspense fallback={<LoadingScreen />}>
        <div />
      </Suspense>
    </div>
  );
}

export default App;