import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

const RobloxCharacter = ({ position, onPositionChange, onCheckpoint }) => {
  const groupRef = useRef();
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [isGrounded, setIsGrounded] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [cameraAngle, setCameraAngle] = useState({ horizontal: 0, vertical: 0 });
  const [lastCheckpoint, setLastCheckpoint] = useState([0, 3, 0]);
  
  // Input states
  const keys = useRef({
    w: false, a: false, s: false, d: false,
    space: false, arrowUp: false, arrowDown: false,
    arrowLeft: false, arrowRight: false
  });
  
  // Movement constants
  const GRAVITY = -35;
  const MOVE_SPEED = 12;
  const JUMP_FORCE = 18;
  const CAMERA_SPEED = 0.08;
  
  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      e.preventDefault();
      switch (e.code) {
        case 'KeyW': keys.current.w = true; break;
        case 'KeyA': keys.current.a = true; break;
        case 'KeyS': keys.current.s = true; break;
        case 'KeyD': keys.current.d = true; break;
        case 'Space': keys.current.space = true; break;
        case 'ArrowUp': keys.current.arrowUp = true; break;
        case 'ArrowDown': keys.current.arrowDown = true; break;
        case 'ArrowLeft': keys.current.arrowLeft = true; break;
        case 'ArrowRight': keys.current.arrowRight = true; break;
      }
    };
    
    const handleKeyUp = (e) => {
      e.preventDefault();
      switch (e.code) {
        case 'KeyW': keys.current.w = false; break;
        case 'KeyA': keys.current.a = false; break;
        case 'KeyS': keys.current.s = false; break;
        case 'KeyD': keys.current.d = false; break;
        case 'Space': keys.current.space = false; break;
        case 'ArrowUp': keys.current.arrowUp = false; break;
        case 'ArrowDown': keys.current.arrowDown = false; break;
        case 'ArrowLeft': keys.current.arrowLeft = false; break;
        case 'ArrowRight': keys.current.arrowRight = false; break;
      }
    };
    
    // Mouse look
    const handleMouseMove = (e) => {
      if (document.pointerLockElement) {
        setCameraAngle(prev => ({
          horizontal: prev.horizontal - e.movementX * 0.002,
          vertical: Math.max(-1, Math.min(1, prev.vertical - e.movementY * 0.002))
        }));
      }
    };
    
    const handleMouseDown = (e) => {
      if (e.button === 2) { // Right click
        document.body.requestPointerLock();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
  
  // Physics and animation
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Clamp delta to prevent physics issues
    const clampedDelta = Math.min(delta, 0.05);
    
    // Update animation time
    setAnimationTime(prev => prev + clampedDelta);
    
    // Calculate movement input
    let moveX = 0, moveZ = 0;
    if (keys.current.w) moveZ -= 1;
    if (keys.current.s) moveZ += 1;
    if (keys.current.a) moveX -= 1;
    if (keys.current.d) moveX += 1;
    
    // Camera rotation from arrow keys
    if (keys.current.arrowLeft) {
      setCameraAngle(prev => ({ ...prev, horizontal: prev.horizontal + 0.02 }));
    }
    if (keys.current.arrowRight) {
      setCameraAngle(prev => ({ ...prev, horizontal: prev.horizontal - 0.02 }));
    }
    if (keys.current.arrowUp) {
      setCameraAngle(prev => ({ ...prev, vertical: Math.min(1, prev.vertical + 0.02) }));
    }
    if (keys.current.arrowDown) {
      setCameraAngle(prev => ({ ...prev, vertical: Math.max(-1, prev.vertical - 0.02) }));
    }
    
    // Apply camera rotation to movement
    const rotatedMovement = new THREE.Vector3(moveX, 0, moveZ);
    rotatedMovement.applyEuler(new THREE.Euler(0, cameraAngle.horizontal, 0));
    
    // Update velocity
    const newVelocity = { ...velocity };
    newVelocity.x = rotatedMovement.x * MOVE_SPEED;
    newVelocity.z = rotatedMovement.z * MOVE_SPEED;
    newVelocity.y += GRAVITY * clampedDelta;
    
    // Jump
    if (keys.current.space && isGrounded) {
      newVelocity.y = JUMP_FORCE;
      setIsGrounded(false);
    }
    
    // Set moving state
    setIsMoving(Math.abs(moveX) > 0 || Math.abs(moveZ) > 0);
    
    // Physics step with sub-stepping
    const steps = Math.ceil(clampedDelta / 0.016);
    const stepDelta = clampedDelta / steps;
    
    for (let i = 0; i < steps; i++) {
      performPhysicsStep(stepDelta, newVelocity);
    }
    
    // Update camera position
    const characterPos = groupRef.current.position;
    const cameraDistance = 6;
    const cameraHeight = 4;
    
    const cameraX = characterPos.x + Math.sin(cameraAngle.horizontal) * cameraDistance;
    const cameraZ = characterPos.z + Math.cos(cameraAngle.horizontal) * cameraDistance;
    const cameraY = characterPos.y + cameraHeight + cameraAngle.vertical * 3;
    
    // Smooth camera movement
    state.camera.position.lerp(new THREE.Vector3(cameraX, cameraY, cameraZ), CAMERA_SPEED);
    state.camera.lookAt(characterPos.x, characterPos.y + 2, characterPos.z);
    
    // Update position for parent component
    onPositionChange(characterPos);
    
    // Respawn if fallen too far
    if (characterPos.y < -10) {
      respawnAtCheckpoint();
    }
  });
  
  // Physics and collision detection
  const performPhysicsStep = (delta, newVelocity) => {
    if (!groupRef.current) return;
    
    // Get current position
    const currentPos = groupRef.current.position;
    
    // Calculate new position after movement
    const newPos = {
      x: currentPos.x + newVelocity.x * delta,
      y: currentPos.y + newVelocity.y * delta,
      z: currentPos.z + newVelocity.z * delta
    };

    // Collision detection parameters
    let onPlatform = false;
    const tolerance = 0.3; // Horizontal tolerance for platform edges
    const verticalTolerance = 0.1; // Vertical tolerance for landing
    
    // Player's bottom position (character is 2 units tall, pivot at center)
    const playerBottom = newPos.y - 1;
    
    // Check spawn platform first (always at origin)
    const spawnPlatform = { pos: [0, 0, 0], size: [6, 0.5, 6], type: 'platform' };
    
    // Vertical check - is player at platform height?
    if (playerBottom <= spawnPlatform.pos[1] + spawnPlatform.size[1]/2 + verticalTolerance && 
        playerBottom >= spawnPlatform.pos[1] - spawnPlatform.size[1]/2 - 0.5) {
      
      // Horizontal check - is player within platform bounds?
      const isOnSpawn = Math.abs(newPos.x - spawnPlatform.pos[0]) <= spawnPlatform.size[0]/2 + tolerance && 
                       Math.abs(newPos.z - spawnPlatform.pos[2]) <= spawnPlatform.size[2]/2 + tolerance;
      
      // Land on platform if moving downward
      if (isOnSpawn && newVelocity.y <= 0.1) {
        newPos.y = spawnPlatform.pos[1] + spawnPlatform.size[1]/2 + 1;
        newVelocity.y = Math.max(0, newVelocity.y);
        onPlatform = true;
        setIsGrounded(true);
      }
    }
    
    // Check spiral tower platforms (performance optimized)
    if (!onPlatform) {
      const centerX = 0, centerZ = 0, baseRadius = 8, totalLevels = 50;
      const heightIncrement = 0.8, platformsPerRotation = 12;
      
      // Only check platforms near player's height
      const playerHeight = newPos.y;
      const startLevel = Math.max(0, Math.floor((playerHeight - 3) / heightIncrement));
      const endLevel = Math.min(totalLevels, Math.floor((playerHeight + 3) / heightIncrement) + 1);
      
      for (let level = startLevel; level < endLevel; level++) {
        // Calculate platform position
        const angle = (level / platformsPerRotation) * Math.PI * 2;
        const height = 1.5 + level * heightIncrement;
        const radius = baseRadius + Math.sin(level * 0.2) * 1;
        
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        
        // Platform size based on difficulty
        let platformSize = [2.5, 0.5, 2.5];
        if (height < 10) platformSize = [3, 0.5, 3];
        else if (height < 20) platformSize = [2.5, 0.5, 2.5];
        else if (height < 30) platformSize = [2, 0.5, 2];
        else platformSize = [1.8, 0.5, 1.8];
        
        // Platform collision check
        if (playerBottom <= height + platformSize[1]/2 + verticalTolerance && 
            playerBottom >= height - platformSize[1]/2 - 0.5) {
          
          const isOnPlatform = Math.abs(newPos.x - x) <= platformSize[0]/2 + tolerance && 
                              Math.abs(newPos.z - z) <= platformSize[2]/2 + tolerance;
          
          if (isOnPlatform && newVelocity.y <= 0.1) {
            // Snap to platform top
            newPos.y = height + platformSize[1]/2 + 1;
            newVelocity.y = Math.max(0, newVelocity.y);
            onPlatform = true;
            setIsGrounded(true);
            
            // Check for checkpoints
            if (level > 0 && level % 8 === 0) {
              const checkpointPos = [x, height + 1, z];
              const distanceToCheckpoint = Math.sqrt(
                Math.pow(newPos.x - checkpointPos[0], 2) +
                Math.pow(newPos.z - checkpointPos[2], 2)
              );
              if (distanceToCheckpoint < 2) {
                setLastCheckpoint(checkpointPos);
                onCheckpoint(level);
              }
            }
            break;
          }
        }
        
        // Check bridge platforms (every 4 levels)
        if (level % 4 === 1 && level > 0) {
          const prevAngle = ((level - 1) / platformsPerRotation) * Math.PI * 2;
          const prevX = centerX + Math.cos(prevAngle) * radius;
          const prevZ = centerZ + Math.sin(prevAngle) * radius;
          const prevHeight = 1.5 + (level - 1) * heightIncrement;
          
          const bridgeX = (x + prevX) / 2;
          const bridgeZ = (z + prevZ) / 2;
          const bridgeHeight = (height + prevHeight) / 2;
          const bridgeSize = [1.5, 0.5, 1.5];
          
          if (playerBottom <= bridgeHeight + bridgeSize[1]/2 + verticalTolerance && 
              playerBottom >= bridgeHeight - bridgeSize[1]/2 - 0.5) {
            
            const isOnBridge = Math.abs(newPos.x - bridgeX) <= bridgeSize[0]/2 + tolerance && 
                              Math.abs(newPos.z - bridgeZ) <= bridgeSize[2]/2 + tolerance;
            
            if (isOnBridge && newVelocity.y <= 0.1) {
              newPos.y = bridgeHeight + bridgeSize[1]/2 + 1;
              newVelocity.y = Math.max(0, newVelocity.y);
              onPlatform = true;
              setIsGrounded(true);
              break;
            }
          }
        }
      }
    }
    
    // Update grounded state
    if (!onPlatform) {
      setIsGrounded(false);
    }
    
    // Update position
    groupRef.current.position.set(newPos.x, newPos.y, newPos.z);
    setVelocity(newVelocity);
  };
  
  const respawnAtCheckpoint = () => {
    if (groupRef.current) {
      groupRef.current.position.set(lastCheckpoint[0], lastCheckpoint[1] + 1, lastCheckpoint[2]);
      setVelocity({ x: 0, y: 0, z: 0 });
      setIsGrounded(true);
    }
  };
  
  // Character rotation based on movement
  useFrame(() => {
    if (!groupRef.current || !isMoving) return;
    
    const moveDirection = new THREE.Vector3(velocity.x, 0, velocity.z);
    if (moveDirection.length() > 0) {
      const angle = Math.atan2(moveDirection.x, moveDirection.z);
      groupRef.current.rotation.y = angle;
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Head */}
      <Box
        position={[0, 0.75, 0]}
        args={[1, 1, 1]}
        material={<meshStandardMaterial color="#FFDBAC" />}
      >
        {/* Simple face */}
        <mesh position={[0, 0, 0.52]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial color="black" />
        </mesh>
      </Box>
      
      {/* Torso */}
      <Box
        position={[0, 0, 0]}
        args={[1.2, 1.6, 0.8]}
        material={<meshStandardMaterial color="#4FC3F7" />}
      />
      
      {/* Left Arm */}
      <Box
        position={[-0.9, 0.1 + (isMoving ? Math.sin(animationTime * 8) * 0.1 : 0), 0]}
        args={[0.6, 1.2, 0.6]}
        material={<meshStandardMaterial color="#FFDBAC" />}
      />
      
      {/* Right Arm */}
      <Box
        position={[0.9, 0.1 + (isMoving ? Math.sin(animationTime * 8 + Math.PI) * 0.1 : 0), 0]}
        args={[0.6, 1.2, 0.6]}
        material={<meshStandardMaterial color="#FFDBAC" />}
      />
      
      {/* Left Leg */}
      <Box
        position={[-0.4, -1.5 + (isMoving ? Math.sin(animationTime * 8 + Math.PI) * 0.1 : 0), 0]}
        args={[0.6, 1.4, 0.6]}
        material={<meshStandardMaterial color="#2E7D32" />}
      />
      
      {/* Right Leg */}
      <Box
        position={[0.4, -1.5 + (isMoving ? Math.sin(animationTime * 8) * 0.1 : 0), 0]}
        args={[0.6, 1.4, 0.6]}
        material={<meshStandardMaterial color="#2E7D32" />}
      />
    </group>
  );
};

export default RobloxCharacter;