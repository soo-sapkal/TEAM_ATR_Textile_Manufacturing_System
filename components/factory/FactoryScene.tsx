"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { WarehouseModel, SpinningMachineModel, WeavingMachineModel, DyeingMachineModel, QCCheckingModel, DispatchModel } from "./FactoryModels";

// Positions for the 10 stages
const STAGES = [
  { id: 1, name: "Raw Yarn Warehouse", pos: [-6, 0, -4], color: "#475569" },
  { id: 2, name: "Spinning", pos: [-2, 0, -4], color: "#3b82f6" },
  { id: 3, name: "Spun Yarn Warehouse", pos: [2, 0, -4], color: "#475569" },
  { id: 4, name: "Weaving", pos: [6, 0, -4], color: "#8b5cf6" },
  { id: 5, name: "Woven Fabric Warehouse", pos: [6, 0, 0], color: "#475569" },
  { id: 6, name: "Dyeing", pos: [2, 0, 0], color: "#ec4899" },
  { id: 7, name: "Dyed Fabric Warehouse", pos: [-2, 0, 0], color: "#475569" },
  { id: 8, name: "Quality Checking", pos: [-6, 0, 0], color: "#f59e0b" },
  { id: 9, name: "Final Goods Warehouse", pos: [-6, 0, 4], color: "#475569" },
  { id: 10, name: "Dispatch", pos: [0, 0, 4], color: "#10b981" },
];

function FactoryStage({ data, label, subLabel, pos, color, hoveredStage, setHoveredStage, id, isSimulation, portal }: any) {
  const isHovered = hoveredStage === id;
  const scale = isHovered ? 1.05 : 1;
  const yPos = isHovered ? pos[1] + 0.2 : pos[1];

  let Model = WarehouseModel;
  if (id === 2) Model = SpinningMachineModel;
  if (id === 4) Model = WeavingMachineModel;
  if (id === 6) Model = DyeingMachineModel;
  if (id === 8) Model = QCCheckingModel;
  if (id === 10) Model = DispatchModel;

  return (
    <group 
      position={[pos[0], yPos, pos[2]]} 
      scale={scale}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredStage(id); }}
      onPointerOut={(e) => { e.stopPropagation(); setHoveredStage(null); }}
    >
      <Model color={isHovered ? "#94a3b8" : color} isSimulation={isSimulation} />
      
      {/* Label above the stage */}
      {portal?.current && (
        <Html position={[0, 2, 0]} center portal={portal}>
          <div style={{
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            padding: "8px 12px",
            borderRadius: "8px",
            boxShadow: `0 4px 12px ${color}40`,
            border: `1px solid ${color}`,
            textAlign: "center",
            minWidth: "150px",
            transition: "transform 0.2s",
            transform: isHovered ? "scale(1.05)" : "scale(1)",
            pointerEvents: "none"
          }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#94a3b8", marginBottom: "4px" }}>{id}. {label}</div>
            <div style={{ fontSize: "16px", fontWeight: "900", color: "#f8fafc" }}>{data}</div>
            {subLabel && <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>{subLabel}</div>}
          </div>
        </Html>
      )}
    </group>
  );
}

function TransportPath({ start, end, offset, isSimulation, speed, color }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(start[0], 0.2, start[2]),
      new THREE.Vector3(start[0] + (end[0] - start[0]) / 2, 0.2, start[2] + (end[2] - start[2]) / 2),
      new THREE.Vector3(end[0], 0.2, end[2])
    ]);
  }, [start, end]);

  const points = useMemo(() => curve.getPoints(50), [curve]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    if (isSimulation) {
      const p = (state.clock.elapsedTime * 0.2 * speed + offset) % 1;
      const materialPos = curve.getPointAt(p);
      meshRef.current.position.copy(materialPos);
    }
  });

  return (
    <group>
      <line>
        <bufferGeometry attach="geometry" />
        <lineDashedMaterial attach="material" color="#cbd5e1" dashSize={0.2} gapSize={0.2} opacity={0.5} transparent />
        <primitive object={new THREE.BufferGeometry().setFromPoints(points)} attach="geometry" />
      </line>

      <mesh ref={meshRef} position={curve.getPointAt(isSimulation ? offset % 1 : 1)}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={color || "#3b82f6"} />
      </mesh>
    </group>
  );
}

export function FactoryScene({ stageData, isSimulation, speed = 1 }: any) {
  const [hoveredStage, setHoveredStage] = useState(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  // We need to pass a mutable ref object to Html's portal prop
  const portalRef = useMemo(() => ({ current: portalContainer }), [portalContainer]);

  return (
    <div style={{ width: "100%", height: "600px", background: "#020617", borderRadius: "16px", overflow: "hidden", position: "relative" }}>
      <div ref={setPortalContainer} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 20 }} />
      {isSimulation && (
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, background: "rgba(239, 68, 68, 0.8)", border: "1px solid #ef4444", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backdropFilter: "blur(4px)" }}>
          SIMULATION MODE
        </div>
      )}
      <Canvas shadows camera={{ position: [0, 15, 15], fov: 45, near: 0.1, far: 1000 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} color="#e0f2fe" castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#3b82f6" />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#a855f7" />
        
        <group position={[0, -0.5, 0]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <planeGeometry args={[30, 20]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <gridHelper args={[30, 30, "#1e293b", "#1e293b"]} position={[0, -0.49, 0]} />

          {STAGES.map((stage) => {
            const dataForStage = stageData[stage.id] || { value: "-", label: "" };
            return (
              <FactoryStage 
                key={stage.id}
                id={stage.id}
                label={stage.name}
                pos={stage.pos}
                color={stage.color}
                data={dataForStage.value}
                subLabel={dataForStage.label}
                hoveredStage={hoveredStage}
                setHoveredStage={setHoveredStage}
                isSimulation={isSimulation}
                portal={portalRef}
              />
            );
          })}

          {/* Paths connecting stages continuously */}
          {STAGES.slice(0, STAGES.length - 1).map((stage, idx) => {
            const nextStage = STAGES[idx + 1];
            let materialColor = "#3b82f6"; // default yarn
            if (stage.id >= 4 && stage.id < 6) materialColor = "#a855f7"; // woven
            if (stage.id >= 6) materialColor = "#10b981"; // dyed/final

            return (
              <TransportPath 
                key={`path-${stage.id}`} 
                start={stage.pos} 
                end={nextStage.pos} 
                offset={idx * 0.1}
                isSimulation={isSimulation}
                speed={speed}
                color={materialColor}
              />
            );
          })}
        </group>

        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2 - 0.1}
          minDistance={10}
          maxDistance={40}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
