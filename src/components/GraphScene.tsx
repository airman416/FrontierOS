import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { buildLinks } from '../data/graph'
import { getSimulation } from '../sim/forceGraph'
import {
  computeVisualRole,
  isClickableFrontier,
  type SimNode,
  useFrontierStore,
} from '../store/useFrontierStore'
import { SkillSphere } from './SkillSphere'

const links = buildLinks()

/** Module-scratch buffer for edge line positions (avoid per-frame alloc + hook immutability lint) */
const edgePositionScratch = new Float32Array(links.length * 6)

function levelRadius(level: number): number {
  return 0.11 + level * 0.068
}

function resolveLinkEndpoint(
  raw: string | SimNode,
  fallbackNodes: SimNode[],
): SimNode {
  if (typeof raw === 'object' && raw !== null && 'id' in raw) {
    return raw as SimNode
  }
  return fallbackNodes.find((n) => n.id === raw)!
}

function EdgeLines({ nodes }: { nodes: SimNode[] }) {
  const ref = useRef<THREE.LineSegments>(null)

  useFrame(() => {
    const arr = edgePositionScratch
    let i = 0
    for (const l of links) {
      const a = resolveLinkEndpoint(l.source as string | SimNode, nodes)
      const b = resolveLinkEndpoint(l.target as string | SimNode, nodes)
      arr[i++] = a.x
      arr[i++] = a.y
      arr[i++] = a.z
      arr[i++] = b.x
      arr[i++] = b.y
      arr[i++] = b.z
    }
    const geom = ref.current?.geometry
    const pos = geom?.attributes.position as THREE.BufferAttribute | undefined
    if (pos) {
      pos.array.set(arr)
      pos.needsUpdate = true
    }
  })

  return (
    <lineSegments ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[edgePositionScratch, 3]}
          count={links.length * 2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#3d4a6a"
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </lineSegments>
  )
}

function PulseEdgeLine({
  pulse,
  nodes,
}: {
  pulse: { fromId: string; toId: string; startedAt: number }
  nodes: SimNode[]
}) {
  const lineObj = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const mat = new THREE.LineBasicMaterial({
      color: '#5eead4',
      transparent: true,
      opacity: 0.95,
    })
    return new THREE.Line(geom, mat)
  }, [])
  const v1 = useMemo(() => new THREE.Vector3(), [])
  const v2 = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const from = nodes.find((n) => n.id === pulse.fromId)!
    const to = nodes.find((n) => n.id === pulse.toId)!
    const t = (performance.now() - pulse.startedAt) / 1200
    const u = Math.min(1, Math.max(0, t))
    v1.set(from.x, from.y, from.z)
    v2.set(
      from.x + (to.x - from.x) * u,
      from.y + (to.y - from.y) * u,
      from.z + (to.z - from.z) * u,
    )
    lineObj.geometry.setFromPoints([v1, v2])
  })

  return <primitive object={lineObj} />
}

function GraphContent() {
  const { simulation, nodes } = getSimulation()
  const readinessScore = useFrontierStore((s) => s.readinessScore)
  const mastered = useFrontierStore((s) => s.mastered)
  const pulses = useFrontierStore((s) => s.pulses)
  const prunePulses = useFrontierStore((s) => s.prunePulses)
  const [dragId, setDragId] = useState<string | null>(null)
  const dragMoved = useRef(false)
  const p0 = useRef({ x: 0, y: 0 })
  const { camera, gl } = useThree()

  const plane = useMemo(() => new THREE.Plane(), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const coplanar = useMemo(() => new THREE.Vector3(), [])
  const normal = useMemo(() => new THREE.Vector3(), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const pointer = useMemo(() => new THREE.Vector2(), [])

  useFrame(() => {
    const now = performance.now()
    simulation.tick()
    prunePulses(now)
  })

  useEffect(() => {
    if (!dragId) return
    const onMove = (e: PointerEvent) => {
      const d = Math.hypot(e.clientX - p0.current.x, e.clientY - p0.current.y)
      if (d > 10) dragMoved.current = true
      if (!dragMoved.current) return
      const node = nodes.find((n) => n.id === dragId)
      if (!node) return
      const rect = gl.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      coplanar.set(node.x, node.y, node.z)
      camera.getWorldDirection(normal)
      normal.negate()
      plane.setFromNormalAndCoplanarPoint(normal, coplanar)
      const ok = raycaster.ray.intersectPlane(plane, hit)
      if (ok) {
        node.fx = hit.x
        node.fy = hit.y
        node.fz = hit.z
        node.x = hit.x
        node.y = hit.y
        node.z = hit.z
        simulation.alphaTarget(0.25).restart()
      }
    }
    const onUp = () => {
      const node = nodes.find((n) => n.id === dragId)
      if (node) {
        node.fx = null
        node.fy = null
        node.fz = null
      }
      if (dragId && !dragMoved.current) {
        const st = useFrontierStore.getState()
        if (isClickableFrontier(dragId, st.mastered, st.readinessScore)) {
          st.toggleMaster(dragId)
        }
      }
      setDragId(null)
      dragMoved.current = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [
    dragId,
    camera,
    gl,
    nodes,
    plane,
    hit,
    coplanar,
    normal,
    raycaster,
    pointer,
    simulation,
  ])

  const onPointerDownNode = useCallback(
    (id: string) => (e: { stopPropagation: () => void; clientX: number; clientY: number }) => {
      e.stopPropagation()
      p0.current = { x: e.clientX, y: e.clientY }
      dragMoved.current = false
      setDragId(id)
      const node = nodes.find((n) => n.id === id)
      if (node) {
        node.fx = node.x
        node.fy = node.y
        node.fz = node.z
      }
    },
    [nodes],
  )

  return (
    <>
      <color attach="background" args={['#07080d']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 12, 6]} intensity={0.85} />

      <EdgeLines nodes={nodes} />

      {nodes.map((node) => (
        <SkillSphere
          key={node.id}
          node={node}
          radius={levelRadius(node.level)}
          visual={computeVisualRole(node.id, mastered, readinessScore)}
          onPointerDown={onPointerDownNode(node.id)}
        />
      ))}

      {pulses.map((p) => (
        <PulseEdgeLine key={p.id} pulse={p} nodes={nodes} />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={28}
        rotateSpeed={0.65}
        zoomSpeed={0.7}
        enablePan
      />
    </>
  )
}

export function GraphCanvas() {
  return (
    <div className="h-[min(72vh,560px)] w-full min-h-[320px] touch-none md:h-[min(78vh,640px)]">
      <Canvas
        camera={{ position: [0, 2, 14], fov: 48, near: 0.1, far: 80 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#07080d')
        }}
      >
        <GraphContent />
      </Canvas>
    </div>
  )
}
