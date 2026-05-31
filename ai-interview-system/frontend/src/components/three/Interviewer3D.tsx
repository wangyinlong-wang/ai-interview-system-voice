/**
 * 3D 面试官主组件
 *
 * 使用 Three.js 程序化生成半身视频面试官形象，不依赖外部 GLB 模型文件。
 * 当前版本强调更自然的脸型、精细五官、职业装和适合视频面试的稳重观感。
 */

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// ============ 类型定义 ============

export interface Interviewer3DProps {
  /** 面试官模型类型 */
  modelType?: 'male' | 'female';
  /** 嘴部开合度 (0-1) */
  mouthOpen?: number;
  /** 当前表情 */
  expression?: 'neutral' | 'smile' | 'serious' | 'thinking' | 'surprised' | 'encourage';
  /** 身体摆动强度 */
  bodySway?: number;
  /** 头部旋转（看向用户角度） */
  lookAtAngle?: number;
}

type Palette = typeof colorConfig.male;

const BODY_BASE_POSITION: [number, number, number] = [0, 0.7, 0.22];

/**
 * 表情配置 - 驱动面部各部位的变换
 */
const expressionConfig: Record<string, {
  eyebrowY: number;
  eyebrowAngle: number;
  mouthScaleY: number;
  mouthScaleX: number;
  eyeScaleY: number;
  headTilt: number;
}> = {
  neutral: {
    eyebrowY: 0,
    eyebrowAngle: 0,
    mouthScaleY: 0.9,
    mouthScaleX: 1,
    eyeScaleY: 1,
    headTilt: 0,
  },
  smile: {
    eyebrowY: 0.02,
    eyebrowAngle: -0.08,
    mouthScaleY: 0.55,
    mouthScaleX: 1.28,
    eyeScaleY: 0.88,
    headTilt: -0.01,
  },
  serious: {
    eyebrowY: -0.01,
    eyebrowAngle: 0.12,
    mouthScaleY: 0.38,
    mouthScaleX: 0.92,
    eyeScaleY: 0.98,
    headTilt: 0.02,
  },
  thinking: {
    eyebrowY: 0.04,
    eyebrowAngle: 0.16,
    mouthScaleY: 0.46,
    mouthScaleX: 0.82,
    eyeScaleY: 0.86,
    headTilt: 0.05,
  },
  surprised: {
    eyebrowY: 0.06,
    eyebrowAngle: 0,
    mouthScaleY: 0.84,
    mouthScaleX: 0.9,
    eyeScaleY: 1.12,
    headTilt: -0.03,
  },
  encourage: {
    eyebrowY: 0.03,
    eyebrowAngle: -0.06,
    mouthScaleY: 0.58,
    mouthScaleX: 1.2,
    eyeScaleY: 0.94,
    headTilt: -0.01,
  },
};

/**
 * 面试官皮肤/服装颜色配置
 */
const colorConfig = {
  male: {
    skinColor: '#f3c9b5',
    skinShadow: '#dba691',
    cheekColor: '#f3a99f',
    hairColor: '#3a3334',
    beardColor: '#342c2d',
    frameColor: '#6b3d30',
    suitColor: '#426bab',
    suitShadow: '#2d4f88',
    shirtColor: '#f7f9fc',
    tieColor: '#1d4776',
    eyeColor: '#2b2f35',
    irisColor: '#566f8a',
    lipColor: '#a85d5f',
  },
  female: {
    skinColor: '#f7cfbd',
    skinShadow: '#dfaa98',
    cheekColor: '#f0a6ab',
    hairColor: '#4a3029',
    beardColor: '#4a3029',
    frameColor: '#6a3a31',
    suitColor: '#43395c',
    suitShadow: '#2e273f',
    shirtColor: '#fff4fb',
    tieColor: '#b66ca4',
    eyeColor: '#2f2b32',
    irisColor: '#684f7d',
    lipColor: '#c45f76',
  },
};

/**
 * 3D 面试官主组件
 */
export function Interviewer3D({
  modelType = 'male',
  mouthOpen = 0,
  expression = 'neutral',
  bodySway = 1,
  lookAtAngle = 0,
}: Interviewer3DProps) {
  // ============ Refs ============
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Group>(null);
  const leftEyebrowRef = useRef<THREE.Group>(null);
  const rightEyebrowRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  // ============ 颜色配置 ============
  const colors = useMemo(() => colorConfig[modelType], [modelType]);

  // ============ 表情插值目标 ============
  const targetExpr = useMemo(() => expressionConfig[expression] || expressionConfig.neutral, [expression]);

  // ============ 动画帧更新 ============
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    // 身体轻微摆动（呼吸效果）
    if (bodyRef.current) {
      bodyRef.current.position.y = BODY_BASE_POSITION[1] + Math.sin(time * 0.7) * 0.006 * bodySway;
      bodyRef.current.rotation.z = Math.sin(time * 0.35) * 0.008 * bodySway;
    }

    // 头部跟随看向用户
    if (headRef.current) {
      headRef.current.rotation.y = THREE.MathUtils.lerp(
        headRef.current.rotation.y,
        lookAtAngle * 0.24,
        0.05
      );
      headRef.current.rotation.x = THREE.MathUtils.lerp(
        headRef.current.rotation.x,
        targetExpr.headTilt,
        0.05
      );
    }

    // 嘴部动画（口型同步 + 表情）
    if (mouthRef.current) {
      const targetScaleY = THREE.MathUtils.lerp(
        targetExpr.mouthScaleY,
        targetExpr.mouthScaleY * 2.15,
        mouthOpen
      );
      mouthRef.current.scale.y = THREE.MathUtils.lerp(
        mouthRef.current.scale.y,
        Math.max(0.16, targetScaleY),
        0.16
      );
      mouthRef.current.scale.x = THREE.MathUtils.lerp(
        mouthRef.current.scale.x,
        targetExpr.mouthScaleX,
        0.12
      );
    }

    // 眉毛动画
    if (leftEyebrowRef.current && rightEyebrowRef.current) {
      leftEyebrowRef.current.position.y = THREE.MathUtils.lerp(
        leftEyebrowRef.current.position.y,
        0.125 + targetExpr.eyebrowY,
        0.1
      );
      rightEyebrowRef.current.position.y = THREE.MathUtils.lerp(
        rightEyebrowRef.current.position.y,
        0.125 + targetExpr.eyebrowY,
        0.1
      );
      leftEyebrowRef.current.rotation.z = THREE.MathUtils.lerp(
        leftEyebrowRef.current.rotation.z,
        -targetExpr.eyebrowAngle,
        0.1
      );
      rightEyebrowRef.current.rotation.z = THREE.MathUtils.lerp(
        rightEyebrowRef.current.rotation.z,
        targetExpr.eyebrowAngle,
        0.1
      );
    }

    // 眼睛动画
    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = THREE.MathUtils.lerp(
        leftEyeRef.current.scale.y,
        targetExpr.eyeScaleY,
        0.1
      );
      rightEyeRef.current.scale.y = THREE.MathUtils.lerp(
        rightEyeRef.current.scale.y,
        targetExpr.eyeScaleY,
        0.1
      );
    }
  });

  return (
    <Float
      speed={1.2}
      rotationIntensity={0.04}
      floatIntensity={0.18}
      floatingRange={[-0.006, 0.008]}
    >
      <group ref={groupRef} position={[0, -0.36, 1.18]} scale={0.86}>
        <Head
          colors={colors}
          modelType={modelType}
          headRef={headRef}
          mouthRef={mouthRef}
          leftEyeRef={leftEyeRef}
          rightEyeRef={rightEyeRef}
          leftEyebrowRef={leftEyebrowRef}
          rightEyebrowRef={rightEyebrowRef}
        />
        <Body colors={colors} bodyRef={bodyRef} />

        {/* 颈部 */}
        <mesh position={[0, 1.0, 0.01]} scale={[0.7, 1, 0.68]} castShadow>
          <cylinderGeometry args={[0.092, 0.116, 0.16, 24]} />
          <meshPhysicalMaterial
            color={colors.skinColor}
            roughness={0.58}
            clearcoat={0.12}
            clearcoatRoughness={0.8}
          />
        </mesh>
      </group>
    </Float>
  );
}

// ============ 头部组件 ============

interface HeadProps {
  colors: Palette;
  modelType: 'male' | 'female';
  headRef: RefObject<THREE.Group | null>;
  mouthRef: RefObject<THREE.Group | null>;
  leftEyeRef: RefObject<THREE.Group | null>;
  rightEyeRef: RefObject<THREE.Group | null>;
  leftEyebrowRef: RefObject<THREE.Group | null>;
  rightEyebrowRef: RefObject<THREE.Group | null>;
}

function Head({
  colors,
  modelType,
  headRef,
  mouthRef,
  leftEyeRef,
  rightEyeRef,
  leftEyebrowRef,
  rightEyebrowRef,
}: HeadProps) {
  return (
    <group ref={headRef} position={[0, 1.52, 0]}>
      {/* 脸部/头部 */}
      <mesh scale={[0.82, 1.04, 0.74]} castShadow receiveShadow>
        <sphereGeometry args={[0.38, 48, 32]} />
        <meshPhysicalMaterial
          color={colors.skinColor}
          roughness={0.52}
          clearcoat={0.18}
          clearcoatRoughness={0.72}
        />
      </mesh>

      {/* 下颌和脸颊让头像更接近真人比例 */}
      <mesh position={[0, -0.27, 0.01]} scale={[0.72, 0.36, 0.56]} castShadow>
        <sphereGeometry args={[0.27, 32, 20]} />
        <meshPhysicalMaterial color={colors.skinColor} roughness={0.56} clearcoat={0.1} />
      </mesh>
      <mesh position={[-0.16, -0.085, 0.305]} scale={[1.0, 0.46, 0.15]}>
        <sphereGeometry args={[0.055, 18, 12]} />
        <meshPhysicalMaterial color={colors.cheekColor} transparent opacity={0.18} roughness={0.8} />
      </mesh>
      <mesh position={[0.16, -0.085, 0.305]} scale={[1.0, 0.46, 0.15]}>
        <sphereGeometry args={[0.055, 18, 12]} />
        <meshPhysicalMaterial color={colors.cheekColor} transparent opacity={0.18} roughness={0.8} />
      </mesh>

      <Hair colors={colors} modelType={modelType} />

      <Eye side={-1} colors={colors} eyeRef={leftEyeRef} />
      <Eye side={1} colors={colors} eyeRef={rightEyeRef} />

      <Eyebrow side={-1} colors={colors} eyebrowRef={leftEyebrowRef} />
      <Eyebrow side={1} colors={colors} eyebrowRef={rightEyebrowRef} />

      <Nose colors={colors} />
      {modelType === 'male' && <FacialHair colors={colors} />}
      <Mouth colors={colors} mouthRef={mouthRef} />

      {/* 耳朵 */}
      <mesh position={[-0.305, -0.02, 0.0]} rotation={[0.05, 0.14, 0]} scale={[0.52, 0.86, 0.4]} castShadow>
        <sphereGeometry args={[0.074, 18, 14]} />
        <meshPhysicalMaterial color={colors.skinColor} roughness={0.62} />
      </mesh>
      <mesh position={[0.305, -0.02, 0.0]} rotation={[0.05, -0.14, 0]} scale={[0.52, 0.86, 0.4]} castShadow>
        <sphereGeometry args={[0.074, 18, 14]} />
        <meshPhysicalMaterial color={colors.skinColor} roughness={0.62} />
      </mesh>

      {modelType === 'male' && <Glasses colors={colors} />}
    </group>
  );
}

// ============ 五官组件 ============

interface EyeProps {
  side: -1 | 1;
  colors: Palette;
  eyeRef: RefObject<THREE.Group | null>;
}

function Eye({ side, colors, eyeRef }: EyeProps) {
  return (
    <group ref={eyeRef} position={[side * 0.108, 0.055, 0.306]} scale={[0.9, 0.92, 0.62]}>
      {/* 眼白 */}
      <mesh scale={[1.36, 0.72, 0.2]}>
        <sphereGeometry args={[0.046, 24, 16]} />
        <meshPhysicalMaterial color="#f9fbff" roughness={0.18} clearcoat={0.45} clearcoatRoughness={0.18} />
      </mesh>
      {/* iris */}
      <mesh position={[0, -0.003, 0.033]}>
        <circleGeometry args={[0.019, 28]} />
        <meshPhysicalMaterial color={colors.irisColor} roughness={0.22} clearcoat={0.55} />
      </mesh>
      {/* 瞳孔 */}
      <mesh position={[0, -0.003, 0.035]}>
        <circleGeometry args={[0.009, 24]} />
        <meshStandardMaterial color={colors.eyeColor} />
      </mesh>
      {/* catchlight */}
      <mesh position={[-0.008 * side, 0.01, 0.037]}>
        <circleGeometry args={[0.0048, 14]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.86} />
      </mesh>
      {/* 上眼睑阴影 */}
      <mesh position={[0, 0.03, 0.034]} scale={[1.18, 0.22, 1]}>
        <sphereGeometry args={[0.044, 18, 8]} />
        <meshStandardMaterial color={colors.skinShadow} transparent opacity={0.24} />
      </mesh>
    </group>
  );
}

interface EyebrowProps {
  side: -1 | 1;
  colors: Palette;
  eyebrowRef: RefObject<THREE.Group | null>;
}

function Eyebrow({ side, colors, eyebrowRef }: EyebrowProps) {
  return (
    <group ref={eyebrowRef} position={[side * 0.11, 0.125, 0.307]} rotation={[0, 0, side * 0.04]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.0055, 0.048, 6, 12]} />
        <meshStandardMaterial color={colors.hairColor} roughness={0.72} />
      </mesh>
    </group>
  );
}

function Nose({ colors }: { colors: Palette }) {
  return (
    <group position={[0, -0.025, 0.318]}>
      <mesh position={[0, 0.022, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.5, 0.82, 0.68]} castShadow>
        <capsuleGeometry args={[0.019, 0.078, 8, 14]} />
        <meshPhysicalMaterial color={colors.skinShadow} roughness={0.6} clearcoat={0.08} />
      </mesh>
      <mesh position={[0, -0.036, 0.014]} scale={[0.68, 0.44, 0.34]} castShadow>
        <sphereGeometry args={[0.036, 18, 14]} />
        <meshPhysicalMaterial color={colors.skinColor} roughness={0.58} />
      </mesh>
    </group>
  );
}

interface MouthProps {
  colors: Palette;
  mouthRef: RefObject<THREE.Group | null>;
}

function Mouth({ colors, mouthRef }: MouthProps) {
  return (
    <group ref={mouthRef} position={[0, -0.17, 0.323]} scale={[0.58, 0.58, 0.58]}>
      {/* inner mouth */}
      <mesh scale={[1.12, 0.24, 0.18]}>
        <sphereGeometry args={[0.04, 24, 12]} />
        <meshStandardMaterial color="#3f171b" roughness={0.62} />
      </mesh>
      {/* upper lip */}
      <mesh position={[0, 0.012, 0.008]} scale={[1.08, 0.2, 0.14]}>
        <sphereGeometry args={[0.044, 24, 12]} />
        <meshPhysicalMaterial color={colors.lipColor} roughness={0.42} clearcoat={0.18} />
      </mesh>
      {/* lower lip */}
      <mesh position={[0, -0.017, 0.01]} scale={[0.98, 0.24, 0.16]}>
        <sphereGeometry args={[0.045, 24, 12]} />
        <meshPhysicalMaterial color={colors.lipColor} roughness={0.45} clearcoat={0.16} />
      </mesh>
      {/* 嘴角，避免单球体表情僵硬 */}
      <mesh position={[-0.051, -0.003, 0.011]} rotation={[0, 0, -0.18]} scale={[0.36, 0.13, 0.1]}>
        <sphereGeometry args={[0.035, 16, 8]} />
        <meshPhysicalMaterial color={colors.lipColor} roughness={0.46} />
      </mesh>
      <mesh position={[0.051, -0.003, 0.011]} rotation={[0, 0, 0.18]} scale={[0.36, 0.13, 0.1]}>
        <sphereGeometry args={[0.035, 16, 8]} />
        <meshPhysicalMaterial color={colors.lipColor} roughness={0.46} />
      </mesh>
    </group>
  );
}

// ============ 头发与配饰 ============

interface HairProps {
  colors: Palette;
  modelType: 'male' | 'female';
}

function Hair({ colors, modelType }: HairProps) {
  if (modelType === 'female') {
    return (
      <group>
        <mesh position={[0, 0.19, -0.03]} scale={[0.86, 0.58, 0.76]} castShadow>
          <sphereGeometry args={[0.38, 40, 18, 0, Math.PI * 2, 0, Math.PI * 0.54]} />
          <meshPhysicalMaterial color={colors.hairColor} roughness={0.62} clearcoat={0.08} />
        </mesh>
        <mesh position={[-0.245, -0.07, -0.05]} rotation={[0.08, 0.12, -0.08]} scale={[0.42, 1.02, 0.36]} castShadow>
          <capsuleGeometry args={[0.095, 0.32, 10, 18]} />
          <meshPhysicalMaterial color={colors.hairColor} roughness={0.64} />
        </mesh>
        <mesh position={[0.245, -0.07, -0.05]} rotation={[0.08, -0.12, 0.08]} scale={[0.42, 1.02, 0.36]} castShadow>
          <capsuleGeometry args={[0.095, 0.32, 10, 18]} />
          <meshPhysicalMaterial color={colors.hairColor} roughness={0.64} />
        </mesh>
        <mesh position={[-0.075, 0.205, 0.245]} rotation={[0.12, 0.15, 0.5]} scale={[1.0, 0.42, 0.3]} castShadow>
          <sphereGeometry args={[0.086, 20, 10]} />
          <meshStandardMaterial color={colors.hairColor} roughness={0.68} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {/* 后部发量 */}
      <mesh position={[0, 0.25, -0.065]} scale={[0.84, 0.58, 0.72]} castShadow>
        <sphereGeometry args={[0.39, 40, 18, 0, Math.PI * 2, 0, Math.PI * 0.54]} />
        <meshPhysicalMaterial color={colors.hairColor} roughness={0.66} clearcoat={0.06} />
      </mesh>
      {/* 参考图风格：向一侧梳起的厚发束 */}
      <mesh position={[-0.16, 0.292, 0.238]} rotation={[0.06, 0.14, 0.66]} scale={[1.46, 0.46, 0.38]} castShadow>
        <sphereGeometry args={[0.088, 24, 12]} />
        <meshPhysicalMaterial color={colors.hairColor} roughness={0.58} clearcoat={0.16} clearcoatRoughness={0.42} />
      </mesh>
      <mesh position={[-0.035, 0.314, 0.265]} rotation={[0.05, 0.03, 0.34]} scale={[1.42, 0.42, 0.34]} castShadow>
        <sphereGeometry args={[0.086, 24, 12]} />
        <meshPhysicalMaterial color={colors.hairColor} roughness={0.58} clearcoat={0.16} clearcoatRoughness={0.42} />
      </mesh>
      <mesh position={[0.125, 0.264, 0.244]} rotation={[0.06, -0.1, -0.34]} scale={[1.12, 0.34, 0.3]} castShadow>
        <sphereGeometry args={[0.076, 24, 12]} />
        <meshPhysicalMaterial color={colors.hairColor} roughness={0.6} clearcoat={0.14} clearcoatRoughness={0.44} />
      </mesh>
      {/* 打散发际线，避免帽盔感 */}
      {[-0.18, -0.09, 0.0, 0.09].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.215 + index * 0.008, 0.26]}
          rotation={[0.08, x * 0.6, -0.28 + index * 0.18]}
          scale={[0.58, 0.16, 0.14]}
          castShadow
        >
          <sphereGeometry args={[0.06, 18, 10]} />
          <meshPhysicalMaterial color={colors.hairColor} roughness={0.62} clearcoat={0.1} />
        </mesh>
      ))}
      <mesh position={[-0.23, 0.09, 0.06]} rotation={[0.05, 0, -0.16]} scale={[0.46, 0.84, 0.36]} castShadow>
        <capsuleGeometry args={[0.052, 0.18, 8, 14]} />
        <meshStandardMaterial color={colors.hairColor} roughness={0.72} />
      </mesh>
      <mesh position={[0.24, 0.09, 0.06]} rotation={[0.05, 0, 0.16]} scale={[0.44, 0.8, 0.36]} castShadow>
        <capsuleGeometry args={[0.05, 0.17, 8, 14]} />
        <meshStandardMaterial color={colors.hairColor} roughness={0.72} />
      </mesh>
    </group>
  );
}

function FacialHair({ colors }: { colors: Palette }) {
  return (
    <group>
      {/* 胡须轮廓，使用柔和椭球覆盖下颌，让头像接近参考图的精致 3D 风格 */}
      <mesh position={[-0.13, -0.19, 0.319]} rotation={[0, 0, -0.15]} scale={[0.48, 0.7, 0.1]} castShadow>
        <sphereGeometry args={[0.074, 24, 14]} />
        <meshPhysicalMaterial color={colors.beardColor} roughness={0.72} clearcoat={0.04} />
      </mesh>
      <mesh position={[0.13, -0.19, 0.319]} rotation={[0, 0, 0.15]} scale={[0.48, 0.7, 0.1]} castShadow>
        <sphereGeometry args={[0.074, 24, 14]} />
        <meshPhysicalMaterial color={colors.beardColor} roughness={0.72} clearcoat={0.04} />
      </mesh>
      <mesh position={[0, -0.245, 0.321]} scale={[1.42, 0.58, 0.14]} castShadow>
        <sphereGeometry args={[0.096, 30, 16]} />
        <meshPhysicalMaterial color={colors.beardColor} roughness={0.74} clearcoat={0.04} />
      </mesh>
      {/* 八字胡 */}
      <mesh position={[-0.047, -0.112, 0.348]} rotation={[0, 0, Math.PI / 2 - 0.2]} scale={[1, 0.86, 0.5]} castShadow>
        <capsuleGeometry args={[0.014, 0.08, 8, 14]} />
        <meshPhysicalMaterial color={colors.beardColor} roughness={0.68} clearcoat={0.08} />
      </mesh>
      <mesh position={[0.047, -0.112, 0.348]} rotation={[0, 0, Math.PI / 2 + 0.2]} scale={[1, 0.86, 0.5]} castShadow>
        <capsuleGeometry args={[0.014, 0.08, 8, 14]} />
        <meshPhysicalMaterial color={colors.beardColor} roughness={0.68} clearcoat={0.08} />
      </mesh>
      {/* 胡须纹理线 */}
      {[-0.1, -0.045, 0.045, 0.1].map((x) => (
        <mesh key={x} position={[x, -0.25, 0.337]} rotation={[0, 0, x * 1.7]} scale={[0.36, 0.1, 0.08]}>
          <capsuleGeometry args={[0.006, 0.06, 4, 8]} />
          <meshStandardMaterial color="#2b2529" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Glasses({ colors }: { colors: Palette }) {
  return (
    <group position={[0, 0.055, 0.334]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.108, 0, 0]}>
          <mesh position={[0, 0.043, 0]}>
            <boxGeometry args={[0.118, 0.008, 0.012]} />
            <meshPhysicalMaterial color={colors.frameColor} metalness={0.28} roughness={0.28} clearcoat={0.18} />
          </mesh>
          <mesh position={[0, -0.043, 0]}>
            <boxGeometry args={[0.118, 0.008, 0.012]} />
            <meshPhysicalMaterial color={colors.frameColor} metalness={0.28} roughness={0.28} clearcoat={0.18} />
          </mesh>
          <mesh position={[-0.059, 0, 0]}>
            <boxGeometry args={[0.008, 0.086, 0.012]} />
            <meshPhysicalMaterial color={colors.frameColor} metalness={0.28} roughness={0.28} clearcoat={0.18} />
          </mesh>
          <mesh position={[0.059, 0, 0]}>
            <boxGeometry args={[0.008, 0.086, 0.012]} />
            <meshPhysicalMaterial color={colors.frameColor} metalness={0.28} roughness={0.28} clearcoat={0.18} />
          </mesh>
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[0.102, 0.068]} />
            <meshPhysicalMaterial color="#dbeafe" transparent opacity={0.14} roughness={0.04} clearcoat={0.85} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.007, 0.012]} />
        <meshPhysicalMaterial color={colors.frameColor} metalness={0.28} roughness={0.26} clearcoat={0.18} />
      </mesh>
    </group>
  );
}

// ============ 身体组件 ============

interface BodyProps {
  colors: Palette;
  bodyRef: RefObject<THREE.Group | null>;
}

function Body({ colors, bodyRef }: BodyProps) {
  return (
    <group ref={bodyRef} position={BODY_BASE_POSITION} scale={[0.76, 0.78, 0.76]}>
      {/* 躯干 - 更圆润的职业西装 */}
      <mesh position={[0, -0.02, 0]} scale={[1.04, 1, 0.72]} castShadow receiveShadow>
        <capsuleGeometry args={[0.38, 0.52, 14, 28]} />
        <meshPhysicalMaterial color={colors.suitColor} roughness={0.6} clearcoat={0.16} clearcoatRoughness={0.52} />
      </mesh>
      <mesh position={[0, -0.1, -0.03]} scale={[0.96, 0.72, 0.62]} castShadow>
        <boxGeometry args={[0.7, 0.58, 0.38]} />
        <meshPhysicalMaterial color={colors.suitShadow} roughness={0.68} />
      </mesh>

      {/* 衬衫 */}
      <mesh position={[0, 0.28, 0.214]} scale={[0.42, 0.46, 0.22]} castShadow>
        <sphereGeometry args={[0.18, 24, 12]} />
        <meshPhysicalMaterial color={colors.shirtColor} roughness={0.36} clearcoat={0.14} />
      </mesh>
      {/* shirt placket */}
      <mesh position={[0, 0.15, 0.242]} castShadow>
        <boxGeometry args={[0.026, 0.22, 0.016]} />
        <meshStandardMaterial color="#dbe3ee" roughness={0.42} />
      </mesh>

      {/* lapel 左右翻领 */}
      <mesh position={[-0.115, 0.2, 0.245]} rotation={[0, 0, 0.36]} scale={[0.56, 1, 0.08]} castShadow>
        <coneGeometry args={[0.13, 0.38, 3]} />
        <meshPhysicalMaterial color={colors.suitShadow} roughness={0.62} />
      </mesh>
      <mesh position={[0.115, 0.2, 0.245]} rotation={[0, 0, -0.36]} scale={[0.56, 1, 0.08]} castShadow>
        <coneGeometry args={[0.13, 0.38, 3]} />
        <meshPhysicalMaterial color={colors.suitShadow} roughness={0.62} />
      </mesh>

      {/* 领带 */}
      <mesh position={[0, 0.13, 0.262]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.074, 0.074, 0.022]} />
        <meshPhysicalMaterial color={colors.tieColor} roughness={0.44} clearcoat={0.12} />
      </mesh>
      <mesh position={[0, -0.045, 0.263]} scale={[0.72, 0.86, 0.16]} castShadow>
        <coneGeometry args={[0.07, 0.32, 4]} />
        <meshPhysicalMaterial color={colors.tieColor} roughness={0.45} clearcoat={0.12} />
      </mesh>

      {/* pocket square */}
      <mesh position={[0.22, 0.08, 0.262]} rotation={[0, 0, -0.18]} castShadow>
        <boxGeometry args={[0.09, 0.052, 0.012]} />
        <meshStandardMaterial color="#e9f4ff" roughness={0.36} />
      </mesh>

      {/* 肩膀与手臂 */}
      <mesh position={[-0.43, 0.22, -0.01]} rotation={[0.1, 0, 0.2]} scale={[1.16, 0.7, 0.8]} castShadow>
        <sphereGeometry args={[0.14, 18, 12]} />
        <meshPhysicalMaterial color={colors.suitColor} roughness={0.64} clearcoat={0.1} />
      </mesh>
      <mesh position={[0.43, 0.22, -0.01]} rotation={[0.1, 0, -0.2]} scale={[1.16, 0.7, 0.8]} castShadow>
        <sphereGeometry args={[0.14, 18, 12]} />
        <meshPhysicalMaterial color={colors.suitColor} roughness={0.64} clearcoat={0.1} />
      </mesh>
      <mesh position={[-0.53, -0.16, 0.01]} rotation={[0.05, 0, 0.16]} castShadow>
        <capsuleGeometry args={[0.075, 0.48, 10, 18]} />
        <meshPhysicalMaterial color={colors.suitColor} roughness={0.66} />
      </mesh>
      <mesh position={[0.53, -0.16, 0.01]} rotation={[0.05, 0, -0.16]} castShadow>
        <capsuleGeometry args={[0.075, 0.48, 10, 18]} />
        <meshPhysicalMaterial color={colors.suitColor} roughness={0.66} />
      </mesh>
    </group>
  );
}

export default Interviewer3D;
