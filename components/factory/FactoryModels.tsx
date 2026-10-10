import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function WarehouseModel({ color, isSimulation }: { color: string, isSimulation?: boolean }) {
  return (
    <group>
      {/* Base building */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.8, 1.8]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color={color} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.3, 1.9, 4]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#cbd5e1" />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.3, 0.91]} receiveShadow>
        <boxGeometry args={[0.6, 0.6, 0.05]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#334155" />
      </mesh>
    </group>
  );
}

export function SpinningMachineModel({ color, isSimulation }: { color: string, isSimulation?: boolean }) {
  const spindleRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (isSimulation && spindleRef.current) {
      spindleRef.current.rotation.x += delta * 5;
    }
  });

  return (
    <group>
      {/* Machine base */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.6, 1.2]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color={color} />
      </mesh>
      {/* Rotating spindles */}
      <group ref={spindleRef} position={[0, 0.7, 0]}>
        <mesh position={[-0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.6]} />
          <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#94a3b8" />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.6]} />
          <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#94a3b8" />
        </mesh>
        <mesh position={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.6]} />
          <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#94a3b8" />
        </mesh>
      </group>
    </group>
  );
}

export function WeavingMachineModel({ color, isSimulation }: { color: string, isSimulation?: boolean }) {
  const shuttleRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (isSimulation && shuttleRef.current) {
      shuttleRef.current.position.x = Math.sin(state.clock.elapsedTime * 4) * 0.6;
    }
  });

  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.8, 1.4]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color={color} />
      </mesh>
      {/* Loom top */}
      <mesh position={[0, 0.9, -0.3]} rotation={[0, 0, Math.PI/2]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 1.4]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#a855f7" />
      </mesh>
      {/* Moving shuttle */}
      <mesh ref={shuttleRef} position={[0, 0.7, 0.2]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.1]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#334155" />
      </mesh>
    </group>
  );
}

export function DyeingMachineModel({ color, isSimulation }: { color: string, isSimulation?: boolean }) {
  const liquidRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (isSimulation && liquidRef.current) {
      liquidRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group>
      {/* Vat base */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.8, 16]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color={color} />
      </mesh>
      {/* Liquid inside */}
      <mesh ref={liquidRef} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.7, 16]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#10b981" transparent opacity={0.8} />
      </mesh>
      {/* Pipe */}
      <mesh position={[0.9, 0.4, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.4]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#94a3b8" />
      </mesh>
    </group>
  );
}

export function QCCheckingModel({ color, isSimulation }: { color: string, isSimulation?: boolean }) {
  return (
    <group>
      {/* Table */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.1, 1.0]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color={color} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.8, 0.15, -0.4]}><boxGeometry args={[0.05, 0.3, 0.05]} /><meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#94a3b8" /></mesh>
      <mesh position={[0.8, 0.15, -0.4]}><boxGeometry args={[0.05, 0.3, 0.05]} /><meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#94a3b8" /></mesh>
      <mesh position={[-0.8, 0.15, 0.4]}><boxGeometry args={[0.05, 0.3, 0.05]} /><meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#94a3b8" /></mesh>
      <mesh position={[0.8, 0.15, 0.4]}><boxGeometry args={[0.05, 0.3, 0.05]} /><meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#94a3b8" /></mesh>
      
      {/* Monitor */}
      <mesh position={[0, 0.6, -0.3]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.05]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#1e293b" />
      </mesh>
      {/* Fabric on table */}
      <mesh position={[0, 0.36, 0.1]} receiveShadow>
        <boxGeometry args={[1.6, 0.02, 0.6]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#10b981" />
      </mesh>
    </group>
  );
}

export function DispatchModel({ color, isSimulation }: { color: string, isSimulation?: boolean }) {
  return (
    <group>
      {/* Loading dock */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.4, 2]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color={color} />
      </mesh>
      {/* Truck cab */}
      <mesh position={[0, 0.4, 1.8]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#3b82f6" />
      </mesh>
      {/* Truck trailer */}
      <mesh position={[0, 0.6, 0.6]} castShadow>
        <boxGeometry args={[1.2, 1.2, 1.6]} />
        <meshPhysicalMaterial metalness={0.6} roughness={0.2} clearcoat={1.0} clearcoatRoughness={0.1} color="#f8fafc" />
      </mesh>
    </group>
  );
}
