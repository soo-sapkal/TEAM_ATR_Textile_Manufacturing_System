import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Reusable Materials
const steelMat = new THREE.MeshStandardMaterial({ color: "#A0A4A8", roughness: 0.4, metalness: 0.8 });
const darkSteelMat = new THREE.MeshStandardMaterial({ color: "#4A4D50", roughness: 0.5, metalness: 0.7 });
const beltMat = new THREE.MeshStandardMaterial({ color: "#2B2D2F", roughness: 0.9, metalness: 0.1 });

export function WarehouseModel({ color, isPlaying, speed = 1 }: { color: string, isPlaying?: boolean, speed?: number }) {
  return (
    <group>
      {/* Floor pad */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[3, 0.1, 2.5]} />
        <meshStandardMaterial color="#E8E4D9" roughness={0.9} />
      </mesh>
      
      {/* Building walls */}
      <mesh position={[0, 0.6, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 1, 1.8]} />
        <meshStandardMaterial color="#FBF9F3" roughness={0.7} />
      </mesh>

      {/* Gabled Roof */}
      <mesh position={[0, 1.35, -0.2]} rotation={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 2.8, 3]} rotation={[0, 0, Math.PI/2]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* Front Opening */}
      <mesh position={[0, 0.5, 0.71]} receiveShadow>
        <boxGeometry args={[1.6, 0.9, 0.05]} />
        <meshStandardMaterial color="#2B2D2F" roughness={0.9} />
      </mesh>

      {/* Racks inside (visible through opening) */}
      <mesh position={[-0.5, 0.4, 0.5]} castShadow>
        <boxGeometry args={[0.3, 0.8, 0.4]} />
        <meshStandardMaterial color="#8A8D91" roughness={0.5} />
      </mesh>
      <mesh position={[0.5, 0.4, 0.5]} castShadow>
        <boxGeometry args={[0.3, 0.8, 0.4]} />
        <meshStandardMaterial color="#8A8D91" roughness={0.5} />
      </mesh>
    </group>
  );
}

export function SpinningMachineModel({ color, isPlaying, speed = 1 }: { color: string, isPlaying?: boolean, speed?: number }) {
  const spindleRef = useRef<THREE.Group>(null);
  const beltRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (isPlaying && spindleRef.current) {
      spindleRef.current.children.forEach((child, i) => {
        child.rotation.y += delta * 10 * speed;
      });
    }
  });

  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[2.6, 0.2, 1.2]} />
        <meshStandardMaterial color="#E8E4D9" roughness={0.9} />
      </mesh>

      {/* Frame */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow geometry={new THREE.BoxGeometry(2.4, 0.6, 0.8)} material={steelMat} />
      
      {/* Spindles Row */}
      <group ref={spindleRef} position={[0, 0.9, 0]}>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
          <group key={i} position={[x, 0, 0]}>
            <mesh castShadow geometry={new THREE.CylinderGeometry(0.02, 0.02, 0.4)} material={steelMat} />
            <mesh position={[0, 0, 0]} castShadow geometry={new THREE.CylinderGeometry(0.08, 0.1, 0.25)} material={new THREE.MeshStandardMaterial({ color: color })} />
          </group>
        ))}
      </group>

      {/* Output Belt */}
      <mesh position={[0, 0.4, 0.5]} castShadow geometry={new THREE.BoxGeometry(2.2, 0.05, 0.3)} material={beltMat} />
    </group>
  );
}

export function WeavingMachineModel({ color, isPlaying, speed = 1 }: { color: string, isPlaying?: boolean, speed?: number }) {
  const loomRef = useRef<THREE.Group>(null);
  const rollerRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (isPlaying && loomRef.current && rollerRef.current) {
      loomRef.current.position.z = Math.sin(state.clock.elapsedTime * 8 * speed) * 0.05;
      rollerRef.current.rotation.x += delta * 2 * speed;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow geometry={new THREE.BoxGeometry(2.4, 0.2, 1.8)} material={new THREE.MeshStandardMaterial({ color: "#E8E4D9", roughness: 0.9 })} />
      
      {/* Frame */}
      <mesh position={[0, 0.6, -0.2]} castShadow receiveShadow geometry={new THREE.BoxGeometry(2.0, 0.8, 1.2)} material={darkSteelMat} />
      
      {/* Warp threads (simplified) */}
      <mesh position={[0, 0.8, 0.2]} rotation={[Math.PI/8, 0, 0]} castShadow geometry={new THREE.PlaneGeometry(1.6, 0.8)} material={new THREE.MeshStandardMaterial({ color: "#F4F0E6", side: THREE.DoubleSide })} />
      
      {/* Moving Loom arm */}
      <group ref={loomRef} position={[0, 0.7, 0.4]}>
        <mesh castShadow geometry={new THREE.BoxGeometry(1.8, 0.1, 0.1)} material={steelMat} />
      </group>

      {/* Output Roller */}
      <mesh ref={rollerRef} position={[0, 0.4, 0.7]} rotation={[0, 0, Math.PI/2]} castShadow geometry={new THREE.CylinderGeometry(0.15, 0.15, 1.6)} material={new THREE.MeshStandardMaterial({ color: color })} />
    </group>
  );
}

export function DyeingMachineModel({ color, isPlaying, speed = 1 }: { color: string, isPlaying?: boolean, speed?: number }) {
  const rollerRef1 = useRef<THREE.Mesh>(null);
  const rollerRef2 = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (isPlaying) {
      if (rollerRef1.current) rollerRef1.current.rotation.y += delta * 3 * speed;
      if (rollerRef2.current) rollerRef2.current.rotation.y += delta * 3 * speed;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow geometry={new THREE.BoxGeometry(2.8, 0.2, 1.6)} material={new THREE.MeshStandardMaterial({ color: "#E8E4D9", roughness: 0.9 })} />
      
      {/* Main Vat */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow geometry={new THREE.CylinderGeometry(0.6, 0.6, 1.0, 16)} material={steelMat} rotation={[0, 0, Math.PI/2]} />
      
      {/* Control panel */}
      <mesh position={[-0.8, 0.8, 0.4]} castShadow geometry={new THREE.BoxGeometry(0.3, 0.5, 0.1)} material={darkSteelMat} />

      {/* Input / Output Rollers */}
      <mesh ref={rollerRef1} position={[0, 0.9, -0.4]} rotation={[0, 0, Math.PI/2]} castShadow geometry={new THREE.CylinderGeometry(0.1, 0.1, 1.4)} material={new THREE.MeshStandardMaterial({ color: "#F4F0E6" })} />
      <mesh ref={rollerRef2} position={[0, 0.4, 0.5]} rotation={[0, 0, Math.PI/2]} castShadow geometry={new THREE.CylinderGeometry(0.15, 0.15, 1.4)} material={new THREE.MeshStandardMaterial({ color: color })} />
    </group>
  );
}

export function QCCheckingModel({ color, isPlaying, speed = 1 }: { color: string, isPlaying?: boolean, speed?: number }) {
  const fabricRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (isPlaying && fabricRef.current) {
      fabricRef.current.position.z = (fabricRef.current.position.z + delta * 0.2 * speed) % 0.2;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.05, 0]} receiveShadow geometry={new THREE.BoxGeometry(2.2, 0.1, 1.6)} material={new THREE.MeshStandardMaterial({ color: "#E8E4D9", roughness: 0.9 })} />
      
      {/* Inspection Table */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow geometry={new THREE.BoxGeometry(1.6, 0.1, 1.0)} material={new THREE.MeshStandardMaterial({ color: "#FBF9F3" })} />
      <mesh position={[-0.7, 0.25, -0.4]} castShadow geometry={new THREE.CylinderGeometry(0.04, 0.04, 0.5)} material={steelMat} />
      <mesh position={[0.7, 0.25, -0.4]} castShadow geometry={new THREE.CylinderGeometry(0.04, 0.04, 0.5)} material={steelMat} />
      <mesh position={[-0.7, 0.25, 0.4]} castShadow geometry={new THREE.CylinderGeometry(0.04, 0.04, 0.5)} material={steelMat} />
      <mesh position={[0.7, 0.25, 0.4]} castShadow geometry={new THREE.CylinderGeometry(0.04, 0.04, 0.5)} material={steelMat} />

      {/* Fabric Sheet */}
      <mesh ref={fabricRef} position={[0, 0.56, 0]} receiveShadow geometry={new THREE.PlaneGeometry(1.4, 0.8)} material={new THREE.MeshStandardMaterial({ color: color })} rotation={[-Math.PI/2, 0, 0]} />

      {/* Overhead Light Bar */}
      <mesh position={[0, 1.2, 0]} castShadow geometry={new THREE.BoxGeometry(1.6, 0.05, 0.2)} material={darkSteelMat} />
      <mesh position={[-0.7, 0.85, 0]} castShadow geometry={new THREE.CylinderGeometry(0.02, 0.02, 0.7)} material={steelMat} />
      <mesh position={[0.7, 0.85, 0]} castShadow geometry={new THREE.CylinderGeometry(0.02, 0.02, 0.7)} material={steelMat} />
      
      {/* Status Light */}
      <mesh position={[0, 1.25, 0]} geometry={new THREE.SphereGeometry(0.06)} material={new THREE.MeshBasicMaterial({ color: "#10b981" })} />
    </group>
  );
}

export function DispatchModel({ color, isPlaying, speed = 1 }: { color: string, isPlaying?: boolean, speed?: number }) {
  return (
    <group>
      {/* Loading Dock */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow geometry={new THREE.BoxGeometry(2.4, 0.4, 2.0)} material={new THREE.MeshStandardMaterial({ color: "#DED8CA", roughness: 1.0 })} />
      
      {/* Truck Cab */}
      <mesh position={[0, 0.5, 1.6]} castShadow geometry={new THREE.BoxGeometry(0.8, 0.8, 0.8)} material={new THREE.MeshStandardMaterial({ color: "#F08C3A" })} />
      <mesh position={[0, 0.3, 1.2]} castShadow geometry={new THREE.BoxGeometry(1.0, 0.4, 0.4)} material={darkSteelMat} />
      
      {/* Truck Trailer */}
      <mesh position={[0, 0.7, 0.4]} castShadow geometry={new THREE.BoxGeometry(1.2, 1.0, 1.6)} material={new THREE.MeshStandardMaterial({ color: "#FBF9F3" })} />
      
      {/* Wheels */}
      <mesh position={[-0.6, 0.1, 1.6]} rotation={[0, 0, Math.PI/2]} castShadow geometry={new THREE.CylinderGeometry(0.15, 0.15, 0.2)} material={beltMat} />
      <mesh position={[0.6, 0.1, 1.6]} rotation={[0, 0, Math.PI/2]} castShadow geometry={new THREE.CylinderGeometry(0.15, 0.15, 0.2)} material={beltMat} />
      <mesh position={[-0.6, 0.1, 0.2]} rotation={[0, 0, Math.PI/2]} castShadow geometry={new THREE.CylinderGeometry(0.15, 0.15, 0.2)} material={beltMat} />
      <mesh position={[0.6, 0.1, 0.2]} rotation={[0, 0, Math.PI/2]} castShadow geometry={new THREE.CylinderGeometry(0.15, 0.15, 0.2)} material={beltMat} />
    </group>
  );
}
