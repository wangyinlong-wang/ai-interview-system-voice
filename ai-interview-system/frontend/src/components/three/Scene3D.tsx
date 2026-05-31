/**
 * 3D 场景组件
 * 
 * 功能:
 * - 办公室/会议室背景
 * - 桌面、椅子
 * - 光照系统(Ambient + Directional + Point)
 * - 环境氛围
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Stars } from '@react-three/drei';
import * as THREE from 'three';

// ============ 类型定义 ============

export type SceneType = 'office' | 'modern';

export interface Scene3DProps {
  /** 场景类型 */
  sceneType?: SceneType;
  /** 是否显示阴影 */
  showShadows?: boolean;
  /** 环境光强度 */
  ambientIntensity?: number;
  children?: React.ReactNode;
}

/**
 * 会议室/办公室 3D 场景
 */
export function Scene3D({
  sceneType = 'office',
  showShadows = true,
  ambientIntensity = 0.4,
  children,
}: Scene3DProps) {
  // 场景颜色配置
  const colors = useMemo(() => {
    if (sceneType === 'modern') {
      return {
        wallColor: '#f5f5f5',
        floorColor: '#e0e0e0',
        deskColor: '#ffffff',
        chairColor: '#757575',
        accentColor: '#81c784',
        windowColor: '#b3e5fc',
      };
    }
    // 标准办公室
    return {
      wallColor: '#d7ccc8',
      floorColor: '#8d6e63',
      deskColor: '#5d4037',
      chairColor: '#3e2723',
      accentColor: '#bcaaa4',
      windowColor: '#b3e5fc',
    };
  }, [sceneType]);

  return (
    <group>
      {/* 基础光照 */}
      <Lighting
        ambientIntensity={ambientIntensity}
        sceneType={sceneType}
      />

      {/* 环境贴图 */}
      <Environment preset="city" />

      {/* 房间 */}
      <Room colors={colors} />

      {/* 办公桌 */}
      <Desk colors={colors} />

      {/* 办公椅 */}
      <Chair colors={colors} />

      {/* 装饰物 */}
      <Decorations sceneType={sceneType} />

      {/* 接触阴影 */}
      {showShadows && (
        <ContactShadows
          position={[0, -0.99, 0]}
          opacity={0.4}
          scale={15}
          blur={2.5}
          far={4}
        />
      )}

      {/* 子组件（面试官等） */}
      {children}
    </group>
  );
}

// ============ 光照系统 ============

interface LightingProps {
  ambientIntensity: number;
  sceneType: SceneType;
}

function Lighting({ ambientIntensity, sceneType }: LightingProps) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  // 动态光照效果
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (pointLightRef.current) {
      pointLightRef.current.intensity = 0.5 + Math.sin(time * 0.5) * 0.05;
    }
  });

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={ambientIntensity} color="#ffffff" />

      {/* 主方向光 - 模拟窗户阳光 */}
      <directionalLight
        ref={dirLightRef}
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        color="#fff8f0"
      />

      {/* 补光 */}
      <directionalLight
        position={[-3, 4, 2]}
        intensity={0.3}
        color="#e0f0ff"
      />

      {/* 氛围点光源 */}
      <pointLight
        ref={pointLightRef}
        position={[0, 3, -2]}
        intensity={0.5}
        color={sceneType === 'modern' ? '#e8f5e9' : '#ffd8a6'}
        distance={10}
        decay={2}
      />

      {/* 桌面台灯效果 */}
      <pointLight
        position={[1.5, 1.8, 0.5]}
        intensity={0.3}
        color="#fff3e0"
        distance={5}
        decay={2}
      />
    </>
  );
}

// ============ 房间 ============

interface RoomColors {
  wallColor: string;
  floorColor: string;
  windowColor: string;
}

function Room({ colors }: { colors: RoomColors }) {
  return (
    <group>
      {/* 地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color={colors.floorColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* 后墙 */}
      <mesh position={[0, 2, -5]} receiveShadow>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color={colors.wallColor} roughness={0.9} />
      </mesh>

      {/* 左墙 */}
      <mesh position={[-5, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color={colors.wallColor} roughness={0.9} />
      </mesh>

      {/* 窗户 */}
      <mesh position={[-4.9, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3, 2.5]} />
        <meshStandardMaterial
          color={colors.windowColor}
          emissive={colors.windowColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* 窗框 */}
      <mesh position={[-4.88, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3.2, 0.1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-4.88, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.1, 2.7]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// ============ 办公桌 ============

interface DeskColors {
  deskColor: string;
}

function Desk({ colors }: { colors: DeskColors }) {
  return (
    <group position={[0, -0.2, 1.5]}>
      {/* 桌面 */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.08, 1.2]} />
        <meshStandardMaterial color={colors.deskColor} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* 桌腿 */}
      <mesh position={[-1, -0.25, -0.4]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[1, -0.25, -0.4]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[-1, -0.25, 0.4]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[1, -0.25, 0.4]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* 笔记本电脑 */}
      <Laptop />
    </group>
  );
}

// ============ 笔记本电脑 ============

function Laptop() {
  return (
    <group position={[0.3, 0.38, 0]}>
      {/* 底座 */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.02, 0.28]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* 屏幕 */}
      <mesh position={[0, 0.16, -0.12]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.28, 0.02]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.2} />
      </mesh>
      {/* 屏幕发光 */}
      <mesh position={[0, 0.16, -0.11]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[0.36, 0.24]} />
        <meshStandardMaterial
          color="#4a90d9"
          emissive="#4a90d9"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

// ============ 办公椅 ============

interface ChairColors {
  chairColor: string;
}

function Chair({ colors }: { colors: ChairColors }) {
  return (
    <group position={[0, -0.6, 2.5]}>
      {/* 坐垫 */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.55, 0.1, 0.5]} />
        <meshStandardMaterial color={colors.chairColor} roughness={0.7} />
      </mesh>

      {/* 靠背 */}
      <mesh position={[0, 0.7, 0.22]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.08]} />
        <meshStandardMaterial color={colors.chairColor} roughness={0.7} />
      </mesh>

      {/* 椅背支架 */}
      <mesh position={[0, 0.55, 0.25]} castShadow>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* 气压杆 */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 12]} />
        <meshStandardMaterial color="#555" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* 底座 */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.25, 0.05, 5]} />
        <meshStandardMaterial color="#333" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

// ============ 装饰物 ============

interface DecorationsProps {
  sceneType: SceneType;
}

function Decorations({ sceneType }: DecorationsProps) {
  return (
    <group>
      {/* 绿植 */}
      <Plant position={[-3, -1, -2]} scale={1.2} />
      <Plant position={[3, -1, -3]} scale={0.8} />

      {/* 挂画 */}
      <Picture
        position={[0, 2.5, -4.95]}
        color={sceneType === 'modern' ? '#90caf9' : '#8d6e63'}
      />

      {/* 地毯 */}
      <mesh position={[0, -0.95, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2, 1.5]} />
        <meshStandardMaterial
          color={sceneType === 'modern' ? '#e8eaf6' : '#6d4c41'}
          roughness={0.9}
        />
      </mesh>

      {/* 书架（办公室场景） */}
      {sceneType === 'office' && <Bookshelf position={[3.5, 0.5, -4.5]} />}
    </group>
  );
}

// ============ 绿植 ============

interface PlantProps {
  position: [number, number, number];
  scale?: number;
}

function Plant({ position, scale = 1 }: PlantProps) {
  return (
    <group position={position} scale={scale}>
      {/* 花盆 */}
      <mesh position={[0, -0.3, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 12]} />
        <meshStandardMaterial color="#a0522d" roughness={0.9} />
      </mesh>
      {/* 叶子 */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color="#4caf50" roughness={0.8} />
      </mesh>
      <mesh position={[0.1, 0.25, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#66bb6a" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ============ 挂画 ============

interface PictureProps {
  position: [number, number, number];
  color: string;
}

function Picture({ position, color }: PictureProps) {
  return (
    <group position={position}>
      {/* 画框 */}
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.8, 0.05]} />
        <meshStandardMaterial color="#5d4037" roughness={0.6} />
      </mesh>
      {/* 画面 */}
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[1, 0.6]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  );
}

// ============ 书架 ============

interface BookshelfProps {
  position: [number, number, number];
}

function Bookshelf({ position }: BookshelfProps) {
  return (
    <group position={position}>
      {/* 框架 */}
      <mesh castShadow>
        <boxGeometry args={[1.5, 2.5, 0.4]} />
        <meshStandardMaterial color="#5d4037" roughness={0.8} />
      </mesh>
      {/* 隔板 */}
      {[0, 0, 0].map((_, i) => (
        <mesh key={i} position={[0, -0.3 + i * 0.8, 0]} castShadow>
          <boxGeometry args={[1.4, 0.03, 0.35]} />
          <meshStandardMaterial color="#6d4c41" roughness={0.8} />
        </mesh>
      ))}
      {/* 书 */}
      <mesh position={[-0.4, -0.6, 0]} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.25]} />
        <meshStandardMaterial color="#1565c0" roughness={0.7} />
      </mesh>
      <mesh position={[-0.3, -0.65, 0]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.25]} />
        <meshStandardMaterial color="#c62828" roughness={0.7} />
      </mesh>
      <mesh position={[0.3, 0.15, 0]} castShadow>
        <boxGeometry args={[0.12, 0.45, 0.25]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.7} />
      </mesh>
    </group>
  );
}

export default Scene3D;
