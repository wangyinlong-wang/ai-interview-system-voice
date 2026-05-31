import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const avatarSource = readFileSync(
  resolve(__dirname, '../src/components/three/Interviewer3D.tsx'),
  'utf8'
);
const roomSource = readFileSync(
  resolve(__dirname, '../src/pages/FaceToFaceRoom.tsx'),
  'utf8'
);

const checks = [
  {
    name: 'uses softer physical materials for skin and clothing',
    pass: avatarSource.includes('meshPhysicalMaterial'),
  },
  {
    name: 'renders eyes with iris, pupil, and catchlight detail',
    pass:
      avatarSource.includes('function Eye') &&
      avatarSource.includes('catchlight') &&
      avatarSource.includes('iris'),
  },
  {
    name: 'renders a layered mouth instead of a single lip sphere',
    pass:
      avatarSource.includes('function Mouth') &&
      avatarSource.includes('inner mouth') &&
      avatarSource.includes('upper lip'),
  },
  {
    name: 'adds professional clothing details',
    pass:
      avatarSource.includes('lapel') &&
      avatarSource.includes('shirt placket') &&
      avatarSource.includes('pocket square'),
  },
  {
    name: 'keeps the bust high enough to show shoulders above the interview desk',
    pass:
      avatarSource.includes('position={[0, -0.36, 1.18]}') &&
      avatarSource.includes('BODY_BASE_POSITION[1] + Math.sin'),
  },
  {
    name: 'uses a portrait camera framing for face-to-face interview',
    pass:
      roomSource.includes('ResponsiveInterviewCamera') &&
      roomSource.includes('target={[0, 0.62, 0]}'),
  },
];

const failures = checks.filter((check) => !check.pass);

if (failures.length > 0) {
  console.error('Avatar visual checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure.name}`);
  }
  process.exit(1);
}

console.log(`Avatar visual checks passed (${checks.length}/${checks.length}).`);
