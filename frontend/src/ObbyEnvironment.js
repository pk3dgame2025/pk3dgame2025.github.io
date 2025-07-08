import React, { useMemo } from 'react';
import { Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

// Lego Block Component
const LegoBlock = ({ position, size, color, studs = 2 }) => {
  const studPositions = useMemo(() => {
    const positions = [];
    const studSize = 0.1;
    const spacing = 0.4;
    const actualStuds = Math.min(studs, 4); // Limit studs for performance
    
    for (let i = 0; i < actualStuds; i++) {
      const x = (i % 2 - 0.5) * spacing;
      const z = (Math.floor(i / 2) - 0.5) * spacing;
      positions.push([x, size[1] / 2 + studSize / 2, z]);
    }
    return positions;
  }, [studs, size]);
  
  return (
    <group position={position}>
      {/* Main block */}
      <Box args={size} material={<meshStandardMaterial color={color} />} />
      
      {/* Studs */}
      {studPositions.map((pos, index) => (
        <Cylinder
          key={index}
          position={pos}
          args={[0.08, 0.08, 0.1, 6]} // Reduced segments for performance
          material={<meshStandardMaterial color={color} />}
        />
      ))}
    </group>
  );
};

// Floating Lego Brick
const FloatingLegoBrick = ({ position, size, color, rotationSpeed = 0.01 }) => {
  const ref = React.useRef();
  
  React.useEffect(() => {
    const animate = () => {
      if (ref.current) {
        ref.current.rotation.y += rotationSpeed;
        ref.current.position.y = position[1] + Math.sin(Date.now() * 0.001) * 0.2;
      }
      requestAnimationFrame(animate);
    };
    animate();
  }, [position, rotationSpeed]);
  
  return (
    <group ref={ref} position={position}>
      <LegoBlock position={[0, 0, 0]} size={size} color={color} studs={2} />
    </group>
  );
};

// Main Environment Component
const ObbyEnvironment = ({ playerPosition }) => {
  // Generate spiral tower platforms
  const spiralPlatforms = useMemo(() => {
    const platforms = [];
    const centerX = 0, centerZ = 0;
    const baseRadius = 8;
    const totalLevels = 50;
    const heightIncrement = 0.8;
    const platformsPerRotation = 12;
    
    for (let level = 0; level < totalLevels; level++) {
      const angle = (level / platformsPerRotation) * Math.PI * 2;
      const height = 1.5 + level * heightIncrement;
      const radius = baseRadius + Math.sin(level * 0.2) * 1;
      
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      
      // Platform size based on difficulty
      let platformSize = [2.5, 0.5, 2.5];
      let platformColor = '#4FC3F7'; // Blue
      
      if (height < 10) {
        platformSize = [3, 0.5, 3];
        platformColor = '#4FC3F7'; // Blue - Easy
      } else if (height < 20) {
        platformSize = [2.5, 0.5, 2.5];
        platformColor = '#E91E63'; // Pink - Medium
      } else if (height < 30) {
        platformSize = [2, 0.5, 2];
        platformColor = '#9C27B0'; // Purple - Hard
      } else {
        platformSize = [1.8, 0.5, 1.8];
        platformColor = '#F44336'; // Red - Very Hard
      }
      
      platforms.push({
        key: `platform-${level}`,
        position: [x, height, z],
        size: platformSize,
        color: platformColor,
        level: level
      });
      
      // Add bridge platforms (every 4 levels)
      if (level % 4 === 1 && level > 0) {
        const prevAngle = ((level - 1) / platformsPerRotation) * Math.PI * 2;
        const prevX = centerX + Math.cos(prevAngle) * radius;
        const prevZ = centerZ + Math.sin(prevAngle) * radius;
        const prevHeight = 1.5 + (level - 1) * heightIncrement;
        
        const bridgeX = (x + prevX) / 2;
        const bridgeZ = (z + prevZ) / 2;
        const bridgeHeight = (height + prevHeight) / 2;
        
        platforms.push({
          key: `bridge-${level}`,
          position: [bridgeX, bridgeHeight, bridgeZ],
          size: [1.5, 0.5, 1.5],
          color: '#FF9800', // Orange - Bridge
          level: level
        });
      }
      
      // Add checkpoints (every 8 levels)
      if (level > 0 && level % 8 === 0) {
        platforms.push({
          key: `checkpoint-${level}`,
          position: [x, height + 1, z],
          size: [1, 2, 1],
          color: '#4CAF50', // Green - Checkpoint
          level: level,
          isCheckpoint: true
        });
      }
    }
    
    return platforms;
  }, []);
  
  // Background floating elements (reduced for performance)
  const floatingElements = useMemo(() => {
    const elements = [];
    
    // Add fewer floating bricks for performance
    for (let i = 0; i < 8; i++) {
      elements.push({
        key: `floating-${i}`,
        position: [
          (Math.random() - 0.5) * 40,
          Math.random() * 20 + 10,
          (Math.random() - 0.5) * 40
        ],
        size: [1, 1, 1],
        color: ['#4FC3F7', '#E91E63', '#9C27B0', '#4CAF50'][i % 4],
        rotationSpeed: (Math.random() - 0.5) * 0.02
      });
    }
    
    // Add city skyline elements
    for (let i = 0; i < 4; i++) {
      elements.push({
        key: `skyline-${i}`,
        position: [
          (Math.random() - 0.5) * 80,
          Math.random() * 5,
          (Math.random() - 0.5) * 80
        ],
        size: [3, 8, 3],
        color: '#757575', // Gray
        rotationSpeed: 0
      });
    }
    
    return elements;
  }, []);
  
  return (
    <group>
      {/* Spawn Platform */}
      <LegoBlock
        position={[0, 0, 0]}
        size={[6, 0.5, 6]}
        color="#4CAF50" // Green
        studs={4}
      />
      
      {/* Spiral Tower Platforms */}
      {spiralPlatforms.map((platform) => (
        <LegoBlock
          key={platform.key}
          position={platform.position}
          size={platform.size}
          color={platform.color}
          studs={platform.isCheckpoint ? 0 : 2}
        />
      ))}
      
      {/* Floating Background Elements */}
      {floatingElements.map((element) => (
        <FloatingLegoBrick
          key={element.key}
          position={element.position}
          size={element.size}
          color={element.color}
          rotationSpeed={element.rotationSpeed}
        />
      ))}
      
      {/* Ground Plane */}
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2E7D32" />
      </mesh>
      
      {/* Skybox */}
      <mesh>
        <sphereGeometry args={[100, 16, 16]} />
        <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

export default ObbyEnvironment;