/**
 * 3D 面试官主组件
 * 
 * 使用 Three.js 程序化生成面试官形象（无需外部 GLB 模型文件）
 * 基础几何体组合：
 * - 头部（球体）
 * - 眼睛（球体）
 * - 眉毛（胶囊体）
 * - 嘴巴（可缩放扁球体 - 口型同步）
 * - 身体（长方体/胶囊体）
 * - 领带/衣领（小几何体装饰）
 */

import { useRef, useMemo } from 'react';
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
    mouthScaleY: 1,
    mouthScaleX: 1,
    eyeScaleY: 1,
    headTilt: 0,
  },
  smile: {
    eyebrowY: 0.02,
    eyebrowAngle: -0.1,
    mouthScaleY: 0.4,
    mouthScaleX: 1.4,
    eyeScaleY: 0.9,
    headTilt: 0,
  },
  serious: {
    eyebrowY: -0.01,
    eyebrowAngle: 0.15,
    mouthScaleY: 0.3,
    mouthScaleX: 1,
    eyeScaleY: 1,
    headTilt: 0.02,
  },
  thinking: {
    eyebrowY: 0.04,
    eyebrowAngle: 0.2,
    mouthScaleY: 0.5,
    mouthScaleX: 0.8,
    eyeScaleY: 0.85,
    headTilt: 0.05,
  },
  surprised: {
    eyebrowY: 0.06,
    eyebrowAngle: 0,
    mouthScaleY: 0.7,
    mouthScaleX: 0.9,
    eyeScaleY: 1.15,
    headTilt: -0.03,
  },
  encourage: {
    eyebrowY: 0.03,
    eyebrowAngle: -0.08,
    mouthScaleY: 0.45,
    mouthScaleX: 1.35,
    eyeScaleY: 0.92,
    headTilt: -0.01,
  },
};

/**
 * 面试官皮肤/服装颜色配置
 */
const colorConfig = {
  male: {
    skinColor: '#f5d0c5',
    hairColor: '#2d2d2d',
    suitColor: '#2c3e50',
    shirtColor: '#ffffff',
    tieColor: '#8b0000',
    eyeColor: '#3d3d3d',
    lipColor: '#c97b7b',
  },
  female: {
    skinColor: '#fce4d6',
    hairColor: '#5c4033',
    suitColor: '#5b4a6b',
    shirtColor: '#f8f0ff',
    tieColor: '#c8a2c8',
    eyeColor: '#3d3d3d',
    lipColor: '#d49090',
  },
};

/**
 * 3D 面试官主组件
 * 
 * 使用基础几何体程序化构建，不依赖外部模型文件
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
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyebrowRef = useRef<THREE.Mesh>(null);
  const rightEyebrowRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
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
      bodyRef.current.position.y = Math.sin(time * 0.8) * 0.005 * bodySway;
      bodyRef.current.rotation.z = Math.sin(time * 0.4) * 0.01 * bodySway;
    }

    // 头部跟随看向用户
    if (headRef.current) {
      headRef.current.rotation.y = THREE.MathUtils.lerp(
        headRef.current.rotation.y,
        lookAtAngle * 0.3,
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
        targetExpr.mouthScaleY * 2.5,
        mouthOpen
      );
      mouthRef.current.scale.y = THREE.MathUtils.lerp(
        mouthRef.current.scale.y,
        Math.max(0.1, targetScaleY),
        0.15
      );
      mouthRef.current.scale.x = THREE.MathUtils.lerp(
        mouthRef.current.scale.x,
        targetExpr.mouthScaleX,
        0.1
      );
    }

    // 眉毛动画
    if (leftEyebrowRef.current && rightEyebrowRef.current) {
      leftEyebrowRef.current.position.y = THREE.MathUtils.lerp(
        leftEyebrowRef.current.position.y,
        0.18 + targetExpr.eyebrowY,
        0.1
      );
      rightEyebrowRef.current.position.y = THREE.MathUtils.lerp(
        rightEyebrowRef.current.position.y,
        0.18 + targetExpr.eyebrowY,
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
      const targetEyeScale = targetExpr.eyeScaleY;
      leftEyeRef.current.scale.y = THREE.MathUtils.lerp(
        leftEyeRef.current.scale.y,
        targetEyeScale,
        0.1
      );
      rightEyeRef.current.scale.y = THREE.MathUtils.lerp(
        rightEyeRef.current.scale.y,
        targetEyeScale,
        0.1
      );
    }
  });

  // ============ 头部组件 ============
  const Head = () => (
    <group ref={headRef} position={[0, 1.5, 0]}>
      {/* 脸部/头部 */}
      <mesh castShadow>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={colors.skinColor} roughness={0.6} />
      </mesh>

      {/* 头发 */}
      <Hair />

      {/* 左眼 */}
      <mesh ref={leftEyeRef} position={[-0.12, 0.05, 0.28]} castShadow>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colors.eyeColor} roughness={0.2} metalness={0.3} />
      </mesh>
      {/* 左眼白 */}
      <mesh position={[-0.12, 0.05, 0.27]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* 右眼 */}
      <mesh ref={rightEyeRef} position={[0.12, 0.05, 0.28]} castShadow>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colors.eyeColor} roughness={0.2} metalness={0.3} />
      </mesh>
      {/* 右眼白 */}
      <mesh position={[0.12, 0.05, 0.27]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* 左眉毛 */}
      <mesh ref={leftEyebrowRef} position={[-0.12, 0.18, 0.3]} castShadow>
        <capsuleGeometry args={[0.015, 0.06, 4, 8]} />
        <meshStandardMaterial color={colors.hairColor} />
      </mesh>

      {/* 右眉毛 */}
      <mesh ref={rightEyebrowRef} position={[0.12, 0.18, 0.3]} castShadow>
        <capsuleGeometry args={[0.015, 0.06, 4, 8]} />
        <meshStandardMaterial color={colors.hairColor} />
      </mesh>

      {/* 鼻子 */}
      <mesh position={[0, -0.05, 0.33]} castShadow>
        <boxGeometry args={[0.04, 0.06, 0.04]} />
        <meshStandardMaterial color={colors.skinColor} roughness={0.5} />
      </mesh>

      {/* 嘴巴 - 口型同步关键部位 */}
      <mesh ref={mouthRef} position={[0, -0.15, 0.3]} castShadow>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={colors.lipColor} roughness={0.4} />
      </mesh>

      {/* 耳朵 */}
      <mesh position={[-0.32, 0, 0]} castShadow>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={colors.skinColor} roughness={0.6} />
      </mesh>
      <mesh position={[0.32, 0, 0]} castShadow>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={colors.skinColor} roughness={0.6} />
      </mesh>

      {/* 眼镜（男性面试官） */}
      {modelType === 'male' && <Glasses />}
    </group>
  );

  // ============ 头发组件 ============
  const Hair = () => (
    <group>
      {modelType === 'male' ? (
        <>
          {/* 男性短发 */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <sphereGeometry args={[0.37, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={colors.hairColor} roughness={0.8} />
          </mesh>
          {/* 前额 */}
          <mesh position={[0, 0.2, 0.2]} castShadow>
            <boxGeometry args={[0.4, 0.08, 0.15]} />
            <meshStandardMaterial color={colors.hairColor} roughness={0.8} />
          </mesh>
        </>
      ) : (
        <>
          {/* 女性长发 */}
          <mesh position={[0, 0.1, -0.05]} castShadow>
            <sphereGeometry args={[0.38, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <meshStandardMaterial color={colors.hairColor} roughness={0.6} />
          </mesh>
          {/* 披肩长发 */}
          <mesh position={[0, -0.1, -0.15]} castShadow>
            <capsuleGeometry args={[0.2, 0.3, 8, 16]} />
            <meshStandardMaterial color={colors.hairColor} roughness={0.6} />
          </mesh>
        </>
      )}
    </group>
  );

  // ============ 眼镜组件（男性） ============
  const Glasses = () => (
    <group position={[0, 0.06, 0.32]}>
      {/* 左镜片 */}
      <mesh position={[-0.12, 0, 0]}>
        <torusGeometry args={[0.06, 0.005, 8, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* 右镜片 */}
      <mesh position={[0.12, 0, 0]}>
        <torusGeometry args={[0.06, 0.005, 8, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* 鼻梁架 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.005, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );

  // ============ 身体组件 ============
  const Body = () => (
    <group ref={bodyRef} position={[0, 0.7, 0]}>
      {/* 躯干 - 西装 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.9, 0.4]} />
        <meshStandardMaterial color={colors.suitColor} roughness={0.7} />
      </mesh>

      {/* 衬衫（领口区域） */}
      <mesh position={[0, 0.35, 0.16]} castShadow>
        <boxGeometry args={[0.25, 0.25, 0.05]} />
        <meshStandardMaterial color={colors.shirtColor} roughness={0.5} />
      </mesh>

      {/* 领带 */}
      <mesh position={[0, 0.15, 0.2]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.02]} />
        <meshStandardMaterial color={colors.tieColor} roughness={0.4} />
      </mesh>

      {/* 肩膀 */}
      <mesh position={[-0.4, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={colors.suitColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.4, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={colors.suitColor} roughness={0.7} />
      </mesh>

      {/* 左臂 */}
      <mesh position={[-0.5, -0.1, 0]} rotation={[0, 0, 0.1]} castShadow>
        <capsuleGeometry args={[0.08, 0.4, 8, 16]} />
        <meshStandardMaterial color={colors.suitColor} roughness={0.7} />
      </mesh>
      {/* 右臂 */}
      <mesh position={[0.5, -0.1, 0]} rotation={[0, 0, -0.1]} castShadow>
        <capsuleGeometry args={[0.08, 0.4, 8, 16]} />
        <meshStandardMaterial color={colors.suitColor} roughness={0.7} />
      </mesh>
    </group>
  );

  // ============ 渲染 ============
  return (
    <Float
      speed={1.5}
      rotationIntensity={0.1}
      floatIntensity={0.3}
      floatingRange={[-0.01, 0.01]}
    >
      <group ref={groupRef} position={[0, -0.7, 0]} scale={1.2}>
        <Head />
        <Body />

        {/* 颈部 */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.15, 16]} />
          <meshStandardMaterial color={colors.skinColor} roughness={0.6} />
        </mesh>
      </group>
    </Float>
  );
}

export default Interviewer3D;
