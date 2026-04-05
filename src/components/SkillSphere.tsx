import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SimNode, VisualRole } from '../store/useFrontierStore'

function materialProps(
  visual: VisualRole,
  t: number,
): {
  color: string
  emissive: string
  emissiveIntensity: number
  opacity: number
  transparent: boolean
  metalness: number
  roughness: number
} {
  switch (visual) {
    case 'locked':
      return {
        color: '#4b5568',
        emissive: '#1f2937',
        emissiveIntensity: 0.08,
        opacity: 0.38,
        transparent: true,
        metalness: 0.15,
        roughness: 0.85,
      }
    case 'frontier': {
      const pulse = 0.55 + Math.sin(t * 2.2) * 0.22
      return {
        color: '#06b6d4',
        emissive: '#22d3ee',
        emissiveIntensity: pulse,
        opacity: 1,
        transparent: false,
        metalness: 0.35,
        roughness: 0.35,
      }
    }
    case 'mastered':
      return {
        color: '#10b981',
        emissive: '#064e3b',
        emissiveIntensity: 0.25,
        opacity: 1,
        transparent: false,
        metalness: 0.45,
        roughness: 0.4,
      }
    case 'highRisk':
      return {
        color: '#ea580c',
        emissive: '#7c2d12',
        emissiveIntensity: 0.55,
        opacity: 0.72,
        transparent: true,
        metalness: 0.2,
        roughness: 0.55,
      }
  }
}

export function SkillSphere({
  node,
  radius,
  visual,
  onPointerDown,
}: {
  node: SimNode
  radius: number
  visual: VisualRole
  onPointerDown: (e: {
    stopPropagation: () => void
    clientX: number
    clientY: number
  }) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((state) => {
    const m = meshRef.current
    if (!m) return
    m.position.set(node.x, node.y, node.z)
    const p = materialProps(visual, state.clock.elapsedTime)
    const material = mat.current
    if (material) {
      material.color.set(p.color)
      material.emissive.set(p.emissive)
      material.emissiveIntensity = p.emissiveIntensity
      material.opacity = p.opacity
      material.transparent = p.transparent
      material.metalness = p.metalness
      material.roughness = p.roughness
    }
  })

  const geo = useMemo(
    () => new THREE.SphereGeometry(radius, 20, 20),
    [radius],
  )

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      onPointerDown={(e) =>
        onPointerDown({
          stopPropagation: () => e.stopPropagation(),
          clientX: e.nativeEvent.clientX,
          clientY: e.nativeEvent.clientY,
        })
      }
    >
      <meshStandardMaterial ref={mat} />
    </mesh>
  )
}
