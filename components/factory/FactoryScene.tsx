"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { 
  WarehouseModel, 
  SpinningMachineModel, 
  WeavingMachineModel, 
  DyeingMachineModel, 
  QCCheckingModel, 
  DispatchModel 
} from "./FactoryModels";

// 1. Raw Yarn, 2. Spinning, 3. Spun Yarn, 4. Weaving
// 5. Woven Storage, 6. Dyeing, 7. Dyed Storage, 8. Quality
// 9. Final Goods, 10. Dispatch
const STAGES = [
  { id: 1, name: "Raw Yarn", pos: [-12, 0, -8], color: "#D4B37F", component: WarehouseModel },
  { id: 2, name: "Spinning", pos: [-4, 0, -8], color: "#4A7A9B", component: SpinningMachineModel },
  { id: 3, name: "Spun Yarn", pos: [4, 0, -8], color: "#2E8C8C", component: WarehouseModel },
  { id: 4, name: "Weaving", pos: [12, 0, -8], color: "#6A7B9B", component: WeavingMachineModel },
  { id: 5, name: "Woven Fabric", pos: [12, 0, 0], color: "#686494", component: WarehouseModel },
  { id: 6, name: "Dyeing", pos: [4, 0, 0], color: "#C66B59", component: DyeingMachineModel },
  { id: 7, name: "Dyed Fabric", pos: [-4, 0, 0], color: "#D49C5B", component: WarehouseModel },
  { id: 8, name: "Quality Check", pos: [-12, 0, 0], color: "#4CAF50", component: QCCheckingModel },
  { id: 9, name: "Final Goods", pos: [-12, 0, 8], color: "#8E5EA2", component: WarehouseModel },
  { id: 10, name: "Dispatch", pos: [-4, 0, 8], color: "#F08C3A", component: DispatchModel },
];

function FactoryStage({ 
  id, label, dataValue, dataUnit, pos, color, Model, 
  hoveredStage, setHoveredStage, selectedStage, onSelectStage,
  isPlaying, speed, portal 
}: any) {
  const isHovered = hoveredStage === id;
  const isSelected = selectedStage === id;
  const scale = isHovered || isSelected ? 1.05 : 1;
  const yPos = isHovered || isSelected ? pos[1] + 0.2 : pos[1];

  return (
    <group 
      position={[pos[0], yPos, pos[2]]} 
      scale={(isHovered || isSelected) ? 1.55 : 1.5}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredStage(id); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHoveredStage(null); document.body.style.cursor = 'default'; }}
      onClick={(e) => { e.stopPropagation(); onSelectStage(isSelected ? null : id); }}
    >
      <Model color={color} isPlaying={isPlaying} speed={speed} />
      
      {/* Platform Highlight when hovered/selected */}
      {(isHovered || isSelected) && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[1.8, 2.0, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* HTML Label */}
      {portal?.current && (
        <Html position={[0, 2.2, 0]} center portal={portal}>
          <div style={{
            background: isSelected ? "rgba(251, 249, 243, 0.95)" : "rgba(251, 249, 243, 0.85)",
            backdropFilter: "blur(8px)",
            padding: "6px 10px",
            borderRadius: "6px",
            boxShadow: `0 4px 12px ${color}30`,
            border: `1px solid ${isSelected ? color : '#DED8CA'}`,
            textAlign: "center",
            minWidth: "100px",
            transition: "all 0.2s",
            transform: isHovered || isSelected ? "scale(0.85)" : "scale(0.7)",
            pointerEvents: "none"
          }}>
            <div style={{ fontSize: "9px", fontWeight: "bold", color: "#72766F", marginBottom: "2px" }}>
              {id.toString().padStart(2, '0')} · {label.toUpperCase()}
            </div>
            <div style={{ fontSize: "12px", fontWeight: "800", color: "#202321" }}>
              {dataValue} <span style={{ fontSize: "9px", fontWeight: "normal", color: "#72766F" }}>{dataUnit}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function TransportPath({ start, end, offset, isPlaying, speed, color, isSimulation }: any) {
  const meshRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const curve = useMemo(() => {
    // Generate a simple curve between stages with a little lift
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(start[0], 0.1, start[2]),
      new THREE.Vector3(start[0] + (end[0] - start[0]) / 2, 0.1, start[2] + (end[2] - start[2]) / 2),
      new THREE.Vector3(end[0], 0.1, end[2])
    ]);
  }, [start, end]);

  const points = useMemo(() => curve.getPoints(40), [curve]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    if (isPlaying && isSimulation) {
      // Animate material continuously in simulation mode
      const p = (state.clock.elapsedTime * 0.15 * speed + offset) % 1;
      const pos = curve.getPointAt(p);
      const tangent = curve.getTangentAt(p);
      
      meshRef.current.position.copy(pos);
      // Orient the transport object along the path
      const lookAtPos = pos.clone().add(tangent);
      meshRef.current.lookAt(lookAtPos);
    } else if (isPlaying && !isSimulation) {
      // In live mode, simulate occasional background pulses or wait for actual events
      // We'll just do a very slow intermittent pulse for live if not hooked to discrete events
      const p = ((state.clock.elapsedTime * 0.05 * speed + offset) % 2); // % 2 to create pause
      if (p <= 1) {
        meshRef.current.visible = true;
        const pos = curve.getPointAt(p);
        const tangent = curve.getTangentAt(p);
        meshRef.current.position.copy(pos);
        meshRef.current.lookAt(pos.clone().add(tangent));
      } else {
        meshRef.current.visible = false;
      }
    }
  });

  return (
    <group>
      {/* Floor path line */}
      <line>
        <bufferGeometry attach="geometry" />
        <lineDashedMaterial attach="material" color="#DED8CA" dashSize={0.3} gapSize={0.2} opacity={0.6} transparent />
        <primitive object={new THREE.BufferGeometry().setFromPoints(points)} attach="geometry" />
      </line>

      {/* Moving material / AGV */}
      <group ref={meshRef} position={curve.getPointAt(isSimulation ? offset % 1 : 1)}>
        {/* AGV Base */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[0.6, 0.1, 0.8]} />
          <meshStandardMaterial color="#4A4D50" />
        </mesh>
        {/* Material Load */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.4, 0.3, 0.4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    </group>
  );
}

export function FactoryScene({ stageData, isSimulation, isPlaying, speed = 1, resetCamera, onSelectStage, selectedStage }: any) {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const portalRef = useMemo(() => ({ current: portalContainer }), [portalContainer]);

  const cameraControlsRef = useRef<any>(null);

  useEffect(() => {
    if (resetCamera > 0 && cameraControlsRef.current) {
      cameraControlsRef.current.reset();
    }
  }, [resetCamera]);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "600px", background: "#F4F0E6", position: "relative" }}>
      <div ref={setPortalContainer} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 20 }} />
      
      <Canvas shadows camera={{ position: [0, 25, 25], fov: 50, near: 0.1, far: 1000 }}>
        {/* Light Theme Lighting */}
        <ambientLight intensity={0.7} color="#F4F0E6" />
        <directionalLight 
          position={[15, 25, 10]} 
          intensity={1.2} 
          color="#FFFFFF" 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <directionalLight position={[-15, 15, -15]} intensity={0.3} color="#FBF9F3" />
        
        <group position={[0, -0.5, 0]}>
          {/* Main Factory Floor */}
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[60, 40]} />
            <meshStandardMaterial color="#E8E4D9" roughness={0.8} />
          </mesh>
          
          {/* Subtle Tile Grid */}
          <gridHelper args={[60, 60, "#DED8CA", "#DED8CA"]} position={[0, 0.01, 0]} />

          {/* Render Stages */}
          {STAGES.map((stage) => {
            const dataForStage = stageData[stage.id] || { value: "-", unit: "", label: stage.name };
            return (
              <FactoryStage 
                key={stage.id}
                id={stage.id}
                label={stage.name}
                pos={stage.pos}
                color={stage.color}
                Model={stage.component}
                dataValue={dataForStage.value}
                dataUnit={dataForStage.unit}
                hoveredStage={hoveredStage}
                setHoveredStage={setHoveredStage}
                selectedStage={selectedStage}
                onSelectStage={onSelectStage}
                isPlaying={isPlaying}
                speed={speed}
                portal={portalRef}
              />
            );
          })}

          {/* Render Material Transfer Paths */}
          {STAGES.slice(0, STAGES.length - 1).map((stage, idx) => {
            const nextStage = STAGES[idx + 1];
            return (
              <TransportPath 
                key={`path-${stage.id}`} 
                start={stage.pos} 
                end={nextStage.pos} 
                offset={idx * 0.15} // Stagger AGVs
                isPlaying={isPlaying}
                speed={speed}
                isSimulation={isSimulation}
                color={nextStage.color} // Color matches the destination
              />
            );
          })}
        </group>

        <OrbitControls 
          ref={cameraControlsRef}
          enableDamping 
          dampingFactor={0.05} 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2 - 0.1}
          minDistance={10}
          maxDistance={50}
          target={[0, 0, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  );
}
