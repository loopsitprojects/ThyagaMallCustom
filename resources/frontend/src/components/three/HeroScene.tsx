'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Float,
  RoundedBox,
  MeshDistortMaterial,
  Sparkles,
  Environment,
  Lightformer,
  ContactShadows,
  PerformanceMonitor,
} from '@react-three/drei';
import { getAssetUrl } from '@/utils/assets';

export interface HeroSceneProps {
  /** Main gift box colour — changes per hero slide */
  color: string;
  /** Secondary accent used for orbs */
  accent: string;
  /** Stop rendering frames while the hero is off-screen */
  paused?: boolean;
}

const GOLD = '#f5c04a';

// Shared gold look: partly metallic with a faint warm glow so it never reflects to black.
function GoldMaterial() {
  return <meshStandardMaterial color={GOLD} metalness={0.55} roughness={0.28} emissive="#8a5a00" emissiveIntensity={0.22} />;
}

// Smoothly blends a material colour toward a target each frame so slide changes feel fluid.
// Returns the colour to mount with; later target changes are animated rather than snapped.
function useColorLerp(target: string) {
  const ref = useRef<THREE.MeshPhysicalMaterial>(null);
  const [initial] = useState(target);
  const goal = useMemo(() => new THREE.Color(target), [target]);
  useFrame((_, delta) => {
    ref.current?.color.lerp(goal, Math.min(1, delta * 3));
  });
  return [ref, initial] as const;
}

const LABEL_WIDTH = 1.12;
const LABEL_HEIGHT = LABEL_WIDTH * (560 / 1024);
// Just outside the gold ribbon (1.62 deep) so the label sits on top of it like a brand tag.
const LABEL_OFFSET = 0.826;
const LABEL_FACES: { position: [number, number, number]; rotationY: number }[] = [
  { position: [0, 0, LABEL_OFFSET], rotationY: 0 },
  { position: [LABEL_OFFSET, 0, 0], rotationY: Math.PI / 2 },
  { position: [0, 0, -LABEL_OFFSET], rotationY: Math.PI },
  { position: [-LABEL_OFFSET, 0, 0], rotationY: -Math.PI / 2 },
];

// Draws the Thyaga Mall logo onto a white rounded label so it stays readable on any box colour.
function useLogoLabelTexture(): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let disposed = false;
    let created: THREE.CanvasTexture | null = null;
    const image = new Image();

    image.onload = () => {
      if (disposed) return;
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 560;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 72);
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#f5c04a';
      ctx.stroke();

      const padding = 90;
      const scale = Math.min((canvas.width - padding * 2) / image.width, (canvas.height - padding * 2) / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);

      created = new THREE.CanvasTexture(canvas);
      created.colorSpace = THREE.SRGBColorSpace;
      created.anisotropy = 8;
      setTexture(created);
    };
    image.src = getAssetUrl('/logo.png');

    return () => {
      disposed = true;
      created?.dispose();
    };
  }, []);

  return texture;
}

function LogoLabels() {
  const texture = useLogoLabelTexture();
  if (!texture) return null;

  return (
    <>
      {LABEL_FACES.map(({ position, rotationY }) => (
        <mesh key={rotationY} position={position} rotation={[0, rotationY, 0]}>
          <planeGeometry args={[LABEL_WIDTH, LABEL_HEIGHT]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
    </>
  );
}

function GiftBox({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const [bodyMat, bodyInitial] = useColorLerp(color);
  const [lidMat, lidInitial] = useColorLerp(color);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) group.current.rotation.y = t * 0.35;
    // Lid gently "breathes" open, hinting at a surprise inside.
    if (lid.current) lid.current.position.y = 0.78 + Math.max(0, Math.sin(t * 1.4)) * 0.12;
  });

  return (
    <group ref={group} rotation={[0.18, 0.6, 0]}>
      {/* Box body */}
      <RoundedBox args={[1.6, 1.25, 1.6]} radius={0.08} smoothness={4}>
        <meshPhysicalMaterial ref={bodyMat} color={bodyInitial} roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} />
      </RoundedBox>
      {/* Body ribbons */}
      <mesh>
        <boxGeometry args={[0.3, 1.27, 1.62]} />
        <GoldMaterial />
      </mesh>
      <mesh>
        <boxGeometry args={[1.62, 1.27, 0.3]} />
        <GoldMaterial />
      </mesh>
      {/* Thyaga Mall branding on every side */}
      <LogoLabels />

      {/* Lid + bow */}
      <group ref={lid} position={[0, 0.78, 0]}>
        <RoundedBox args={[1.78, 0.34, 1.78]} radius={0.07} smoothness={4}>
          <meshPhysicalMaterial ref={lidMat} color={lidInitial} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
        </RoundedBox>
        <mesh>
          <boxGeometry args={[0.32, 0.36, 1.8]} />
          <GoldMaterial />
        </mesh>
        <mesh>
          <boxGeometry args={[1.8, 0.36, 0.32]} />
          <GoldMaterial />
        </mesh>
        {/* Bow loops */}
        <mesh position={[-0.28, 0.36, 0]} rotation={[0, 0, Math.PI / 3.2]}>
          <torusGeometry args={[0.26, 0.085, 16, 40]} />
          <GoldMaterial />
        </mesh>
        <mesh position={[0.28, 0.36, 0]} rotation={[0, 0, -Math.PI / 3.2]}>
          <torusGeometry args={[0.26, 0.085, 16, 40]} />
          <GoldMaterial />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <GoldMaterial />
        </mesh>
      </group>
    </group>
  );
}

function Orb({ position, color, size, speed }: { position: [number, number, number]; color: string; size: number; speed: number }) {
  return (
    <Float speed={speed} rotationIntensity={1.2} floatIntensity={2.2}>
      <mesh position={position}>
        <sphereGeometry args={[size, 48, 48]} />
        <MeshDistortMaterial color={color} distort={0.38} speed={2} roughness={0.15} metalness={0.25} />
      </mesh>
    </Float>
  );
}

function Coin({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.6;
  });
  return (
    <Float speed={2.4} floatIntensity={1.6}>
      <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 40]} />
        <GoldMaterial />
      </mesh>
    </Float>
  );
}

// Moves the camera slightly toward the cursor for a parallax "window into 3D" feel.
function PointerRig() {
  useFrame((state, delta) => {
    const { camera, pointer } = state;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.9, 3, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.4 + pointer.y * 0.5, 3, delta);
    camera.lookAt(0, 0.2, 0);
  });
  return null;
}

// Static stand-in shown when the browser has no WebGL support.
function StaticGift() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 64 64" className="w-1/2 max-w-[220px] float-y drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)]" aria-hidden>
        <path d="M12 24 L32 34 L52 24 L32 14 Z" fill="#a78bfa" />
        <path d="M12 24 L32 34 L32 54 L12 44 Z" fill="#7c3aed" />
        <path d="M32 34 L52 24 L52 44 L32 54 Z" fill="#5b21b6" />
        <path d="M28 16 L36 20 L36 54 L28 50 Z" fill="#f5c04a" />
        <circle cx="32" cy="18" r="4" fill="#f5c04a" />
        <path d="M32 18 C28 10 20 14 28 20 Z" fill="#f59e0b" />
        <path d="M32 18 C36 10 44 14 36 20 Z" fill="#f59e0b" />
      </svg>
    </div>
  );
}

// Probe once whether this browser can create a WebGL context at all.
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}

// If anything inside the 3D scene throws (driver bugs, lost context…), show the static gift instead
// of letting the error take down the homepage.
class SceneErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <StaticGift /> : this.props.children;
  }
}

export default function HeroScene(props: HeroSceneProps) {
  const [webgl] = useState(supportsWebGL);

  if (!webgl) return <StaticGift />;

  return (
    <SceneErrorBoundary>
      <Scene3D {...props} />
    </SceneErrorBoundary>
  );
}

function Scene3D({ color, accent, paused = false }: HeroSceneProps) {
  // Adaptive quality: lower resolution when FPS drops, shed extras if it keeps struggling.
  const [dpr, setDpr] = useState(1.5);
  const [lite, setLite] = useState(false);

  return (
    <Canvas
      frameloop={paused ? 'never' : 'always'}
      dpr={dpr}
      fallback={<StaticGift />}
      camera={{ position: [0, 0.4, 6.2], fov: 38 }}
      gl={{ antialias: !lite, alpha: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
    >
      <PerformanceMonitor
        onIncline={() => setDpr(Math.min(window.devicePixelRatio, 1.75))}
        onDecline={() => setDpr(1)}
        flipflops={3}
        onFallback={() => {
          setDpr(0.75);
          setLite(true);
        }}
      />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <pointLight position={[-3, -1, 2]} intensity={18} color={accent} />

      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.9}>
        <group position={[0.4, 0, 0]} scale={0.92}>
          <GiftBox color={color} />
        </group>
      </Float>

      <Orb position={[-1.6, 1.1, -0.6]} color={accent} size={0.34} speed={2.2} />
      <Coin position={[-1.2, -0.95, 0.6]} />
      <Coin position={[2.3, 0.5, 0.4]} />
      {!lite && (
        <>
          <Orb position={[2.1, -0.9, -0.4]} color="#ff4f9a" size={0.24} speed={2.8} />
          <Orb position={[1.9, 1.35, -1.2]} color="#8b5cf6" size={0.2} speed={3.2} />
          <Sparkles count={60} scale={[6, 3.5, 3]} size={2.6} speed={0.45} color="#ffe7a3" />
          <ContactShadows position={[0.4, -1.25, 0]} opacity={0.45} scale={6} blur={2.6} far={2.5} color="#12001f" />
        </>
      )}

      {/* Studio lighting built from local light panels — no HDR download needed */}
      <Environment resolution={lite ? 64 : 256}>
        <Lightformer intensity={2.4} position={[0, 4, -3]} scale={[8, 2, 1]} />
        <Lightformer intensity={1.6} color="#ffd1e8" position={[-4, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer intensity={1.2} color="#c9b6ff" position={[4, 0, 2]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer intensity={1.5} color="#ffe2a8" position={[0, -3, 3]} rotation-x={-Math.PI / 2} scale={[6, 2, 1]} />
      </Environment>

      <PointerRig />
    </Canvas>
  );
}
