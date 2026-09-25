import { useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, Float, RoundedBox, Sparkles } from "@react-three/drei"
import * as THREE from "three"

import { STEPS } from "./steps"

const CYCLE = 14
const STEP_LEN = CYCLE / STEPS.length

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const span = (t: number, a: number, b: number) => ease(clamp01((t - a) / (b - a)))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface LayerSpec {
  color: string
  size: [number, number]
  start: [number, number]
  end: [number, number]
  z: number
  emissive?: number
}

const LAYERS: LayerSpec[] = [
  { color: "#1c1530", size: [3.6, 2.3], start: [0, 0], end: [0, 0], z: 0.02 },
  { color: "#a855f7", size: [1.5, 0.95], start: [-2.6, 1.8], end: [-0.95, 0.45], z: 0.07, emissive: 0.35 },
  { color: "#e879f9", size: [1.5, 0.95], start: [2.8, -1.9], end: [0.75, 0.45], z: 0.07, emissive: 0.3 },
  { color: "#22d3ee", size: [3.1, 0.34], start: [-3, -2.2], end: [0, -0.45], z: 0.07, emissive: 0.25 },
  { color: "#f5f3ff", size: [1.1, 0.26], start: [2.6, 2], end: [-1.05, -0.88], z: 0.07 },
  { color: "#7c3aed", size: [0.8, 0.26], start: [3.2, 0.2], end: [0.2, -0.88], z: 0.07, emissive: 0.4 },
]

function cursorGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(0, -0.62)
  s.lineTo(0.17, -0.47)
  s.lineTo(0.3, -0.74)
  s.lineTo(0.41, -0.69)
  s.lineTo(0.28, -0.43)
  s.lineTo(0.5, -0.43)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 2,
  })
  g.center()
  return g
}

function Board({ onStep }: { onStep?: (i: number) => void }) {
  const group = useRef<THREE.Group>(null)
  const layerRefs = useRef<(THREE.Mesh | null)[]>([])
  const cursor = useRef<THREE.Mesh>(null)
  const exportCard = useRef<THREE.Group>(null)
  const selection = useRef<THREE.LineSegments>(null)
  const lastStep = useRef(-1)
  const cursorGeo = useMemo(cursorGeometry, [])
  const selectionGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime % CYCLE
    const step = Math.min(STEPS.length - 1, Math.floor(t / STEP_LEN))
    if (step !== lastStep.current) {
      lastStep.current = step
      onStep?.(step)
    }

    const draw = span(t, 0.4, 2.6)
    const arrange = span(t, STEP_LEN + 0.2, STEP_LEN + 2.4)
    const explode =
      span(t, STEP_LEN * 2 + 0.2, STEP_LEN * 2 + 1.6) * (1 - span(t, STEP_LEN * 3 - 0.9, STEP_LEN * 3 + 0.4))
    const ship = span(t, STEP_LEN * 3 + 0.4, STEP_LEN * 3 + 2.2)
    const reset = span(t, CYCLE - 0.8, CYCLE)

    if (group.current) {
      const g = group.current
      g.rotation.x = lerp(-0.62, -0.95, explode) + Math.sin(state.clock.elapsedTime * 0.3) * 0.02
      g.rotation.z = lerp(0.18, 0.5, explode)
      g.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.08
      g.position.y = lerp(0, -0.3, explode)
    }

    LAYERS.forEach((l, i) => {
      const m = layerRefs.current[i]
      if (!m) return
      if (i === 0) {
        const grow = draw * (1 - reset)
        m.scale.set(Math.max(0.001, grow), Math.max(0.001, grow), 1)
        m.position.set(lerp(-1.8, 0, grow), lerp(1.15, 0, grow), l.z + explode * 0.05)
        return
      }
      const appear = span(t, 1.6 + i * 0.25, 2.4 + i * 0.25) * (1 - reset)
      const x = lerp(l.start[0], l.end[0], arrange)
      const y = lerp(l.start[1], l.end[1], arrange)
      m.position.set(x, y, l.z + explode * (0.35 + i * 0.42) + (1 - appear) * 1.5)
      m.scale.setScalar(Math.max(0.001, appear))
      const mat = m.material as THREE.MeshStandardMaterial
      mat.opacity = appear
    })

    if (cursor.current) {
      const c = cursor.current
      let x: number
      let y: number
      if (t < STEP_LEN) {
        x = lerp(-1.8, 1.8, draw)
        y = lerp(1.15, -1.15, draw)
      } else if (t < STEP_LEN * 2) {
        x = lerp(1.8, -0.95, arrange)
        y = lerp(-1.15, 0.45, arrange)
      } else if (t < STEP_LEN * 3) {
        x = lerp(-0.95, 1.6, explode)
        y = lerp(0.45, 1.3, explode)
      } else {
        x = lerp(1.6, 2.2, ship)
        y = lerp(1.3, -0.2, ship)
      }
      c.position.set(x + 0.2, y - 0.25, 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.04 + explode * 2.4)
    }

    if (selection.current) {
      const s = selection.current
      const active = t > STEP_LEN && t < STEP_LEN * 2 + 0.3
      const target = LAYERS[1]
      s.visible = active
      s.position.set(lerp(target.start[0], target.end[0], arrange), lerp(target.start[1], target.end[1], arrange), 0.12)
      s.scale.set(target.size[0] + 0.12, target.size[1] + 0.12, 1)
    }

    if (exportCard.current) {
      const e = exportCard.current
      const out = ship * (1 - reset)
      e.visible = out > 0.01
      e.position.set(lerp(0, 3.1, out), lerp(0, 1.2, out), lerp(0.2, 1.6, out))
      e.rotation.set(lerp(0, 0.5, out), lerp(0, -0.5, out), lerp(0, -0.12, out))
      e.scale.setScalar(lerp(0.4, 0.55, out))
    }
  })

  return (
    <group ref={group}>
      <mesh position={[0, 0, -0.06]} receiveShadow>
        <boxGeometry args={[5.4, 3.6, 0.08]} />
        <meshStandardMaterial color="#0e0b18" metalness={0.4} roughness={0.35} />
      </mesh>
      <gridHelper args={[5.2, 26, "#3b2a63", "#1e1733"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.015]} />
      {LAYERS.map((l, i) => (
        <RoundedBox
          key={i}
          ref={(m: THREE.Mesh | null) => {
            layerRefs.current[i] = m
          }}
          args={[l.size[0], l.size[1], i === 0 ? 0.04 : 0.06]}
          radius={i === 0 ? 0.06 : 0.03}
          smoothness={4}
          castShadow
        >
          <meshStandardMaterial
            color={l.color}
            emissive={l.color}
            emissiveIntensity={l.emissive ?? 0.05}
            metalness={0.2}
            roughness={0.35}
            transparent
          />
        </RoundedBox>
      ))}
      <lineSegments ref={selection} geometry={selectionGeo}>
        <lineBasicMaterial color="#d8b4fe" />
      </lineSegments>
      <mesh ref={cursor} geometry={cursorGeo} castShadow>
        <meshStandardMaterial color="#ffffff" emissive="#c084fc" emissiveIntensity={0.25} roughness={0.2} />
      </mesh>
      <group ref={exportCard} visible={false}>
        <RoundedBox args={[3.6, 2.3, 0.05]} radius={0.08} smoothness={4}>
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.9} transparent opacity={0.85} />
        </RoundedBox>
        <RoundedBox args={[3.3, 0.18, 0.06]} radius={0.05} position={[0, -0.8, 0.04]}>
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
        </RoundedBox>
      </group>
    </group>
  )
}

function FitCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  useFrame(() => {
    const halfWidth = 4.4
    const halfHeight = 3.1
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const z = Math.max(halfHeight / tan, halfWidth / (tan * aspect), 7.2)
    if (Math.abs(camera.position.z - z) > 0.01) {
      camera.position.z = z
      camera.updateProjectionMatrix()
    }
  })
  return null
}

export function HeroScene({ onStep }: { onStep?: (i: number) => void }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, -0.4, 7.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <FitCamera />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 6]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 2, 3]} intensity={30} color="#a855f7" />
      <pointLight position={[4, -2, 3]} intensity={24} color="#e879f9" />
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
        <Board onStep={onStep} />
      </Float>
      <Sparkles count={70} scale={[10, 6, 4]} size={2.2} speed={0.35} color="#c084fc" opacity={0.6} />
      <ContactShadows position={[0, -2.4, 0]} opacity={0.5} scale={12} blur={2.8} far={4} color="#3b0764" />
    </Canvas>
  )
}
