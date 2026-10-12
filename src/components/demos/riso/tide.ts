import { rngFor } from './print';

export const LOOP = 12;

export const SCENE = { w: 1600, h: 1000 };

type InkKey = 'y' | 'p' | 'g' | 'b';
type Tones = Partial<Record<InkKey, number>>;
export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Plates = readonly Ctx[];

const INDEX: Record<InkKey, number> = { y: 0, p: 1, g: 2, b: 3 };
const ALL: InkKey[] = ['y', 'p', 'g', 'b'];
const TAU = Math.PI * 2;

const mod = (a: number, n: number) => ((a % n) + n) % n;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const between = (a: number, b: number, v: number) => smooth((v - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function fill(P: Plates, path: Path2D, tones: Tones) {
  for (const key of Object.keys(tones) as InkKey[]) {
    const ctx = P[INDEX[key]]!;
    ctx.globalAlpha = tones[key]!;
    ctx.fill(path);
  }
}

function stroke(P: Plates, path: Path2D, width: number, tones: Tones) {
  for (const key of Object.keys(tones) as InkKey[]) {
    const ctx = P[INDEX[key]]!;
    ctx.globalAlpha = tones[key]!;
    ctx.lineWidth = width;
    ctx.stroke(path);
  }
}

function clear(P: Plates, path: Path2D, keys: InkKey[] = ALL, width = 0) {
  for (const key of keys) {
    const ctx = P[INDEX[key]]!;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
    if (width > 0) {
      ctx.lineWidth = width;
      ctx.stroke(path);
    } else ctx.fill(path);
    ctx.globalCompositeOperation = 'source-over';
  }
}

const LOW = 0.13;
const HIGH = 1.12;
const RISE = [2.4, 5.6] as const;
const FALL = [7, 10.4] as const;

export function flood(t: number): number {
  const s = mod(t, LOOP);
  if (s < RISE[0]) return 0;
  if (s < RISE[1]) return between(RISE[0], RISE[1], s);
  if (s < FALL[0]) return 1;
  if (s < FALL[1]) return 1 - between(FALL[0], FALL[1], s);
  return 0;
}

export function edge(x: number, t: number): number {
  const s = mod(t, LOOP);
  const swash = 0.028 * Math.sin((TAU * s) / 1.5);
  const level = LOW + (HIGH - LOW) * flood(t) + swash;
  return (
    level * SCENE.h +
    24 * Math.sin(x * 0.0052 + (TAU * s) / LOOP) +
    11 * Math.sin(x * 0.017 - (TAU * s * 3) / LOOP)
  );
}

function wet(x: number, y: number, t: number) {
  return between(-8, 45, edge(x, t) - y);
}

interface Rock {
  x: number;
  y: number;
  r: number;
  squash: number;
  key: string;
}

const ROCKS: Rock[] = [
  { x: 230, y: 850, r: 250, squash: 0.72, key: 'home' },
  { x: 740, y: 470, r: 115, squash: 0.8, key: 'p1' },
  { x: 1215, y: 430, r: 135, squash: 0.75, key: 'p2' },
  { x: 1290, y: 690, r: 150, squash: 0.8, key: 'p3' },
  { x: 930, y: 790, r: 110, squash: 0.7, key: 'p4' },
  { x: 1370, y: 250, r: 175, squash: 0.62, key: 'shelf' },
  { x: 330, y: 300, r: 150, squash: 0.7, key: 'north' },
  { x: 1560, y: 900, r: 190, squash: 0.7, key: 'corner' },
];

function blob(x: number, y: number, r: number, squash: number, key: string, lumps = 7): Path2D {
  const rng = rngFor(`blob:${key}`);
  const phases = Array.from({ length: 3 }, () => rng() * TAU);
  const tilt = rng() * TAU;
  const path = new Path2D();
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const k =
      1 +
      0.13 * Math.sin(a * 2 + phases[0]!) +
      0.09 * Math.sin(a * 3 + phases[1]!) +
      0.05 * Math.sin(a * lumps + phases[2]!) +
      0.025 * Math.sin(a * 13 + phases[0]! * 3);
    const px = Math.cos(a) * r * k;
    const py = Math.sin(a) * r * k * squash;
    const qx = x + px * Math.cos(tilt) - py * Math.sin(tilt) * 0.35;
    const qy = y + py + px * Math.sin(tilt) * 0.12;
    if (i === 0) path.moveTo(qx, qy);
    else path.lineTo(qx, qy);
  }
  path.closePath();
  return path;
}

const POOL = { x: 1010, y: 580, r: 250, squash: 0.62 };

let shapes: { rocks: Path2D[]; pool: Path2D } | null = null;
const outlines = () =>
  (shapes ??= {
    rocks: ROCKS.map((r) => blob(r.x, r.y, r.r, r.squash, r.key)),
    pool: blob(POOL.x, POOL.y, POOL.r, POOL.squash, 'pool', 5),
  });

interface Anemone {
  x: number;
  y: number;
  r: number;
  key: string;
}

const POOL_ANEMONES: Anemone[] = [
  { x: 1110, y: 520, r: 34, key: 'a1' },
  { x: 900, y: 610, r: 26, key: 'a2' },
  { x: 1150, y: 655, r: 22, key: 'a3' },
];

const SHELF_ANEMONES: Anemone[] = [
  { x: 1320, y: 250, r: 30, key: 's1' },
  { x: 1440, y: 290, r: 24, key: 's2' },
  { x: 360, y: 280, r: 26, key: 's3' },
];

function anemone(P: Plates, a: Anemone, open: number, t: number) {
  const rng = rngFor(`anemone:${a.key}`);
  const s = mod(t, LOOP);
  const n = 18;
  const body = new Path2D();
  body.arc(a.x, a.y, a.r * lerp(0.62, 0.5, open), 0, TAU);
  if (open > 0.02) {
    const arms = new Path2D();
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + rng() * 0.3;
      const len = a.r * (0.55 + 0.75 * open) * (0.85 + rng() * 0.3);
      const bend = Math.sin((TAU * s * 2) / LOOP + i * 1.7) * 0.35 * open;
      const bx = a.x + Math.cos(ang) * a.r * 0.4;
      const by = a.y + Math.sin(ang) * a.r * 0.4;
      const tx = a.x + Math.cos(ang + bend) * len;
      const ty = a.y + Math.sin(ang + bend) * len;
      const mx = a.x + Math.cos(ang + bend * 0.4) * len * 0.6;
      const my = a.y + Math.sin(ang + bend * 0.4) * len * 0.6;
      arms.moveTo(bx, by);
      arms.quadraticCurveTo(mx, my, tx, ty);
    }
    for (const ctx of P) ctx.lineCap = 'round';
    stroke(P, arms, a.r * 0.34, { p: 0.8 });
    stroke(P, arms, a.r * 0.14, { y: 0.45 });
  }
  fill(P, body, { p: 1, b: lerp(0.35, 0.18, open) });
  const mouth = new Path2D();
  mouth.arc(a.x, a.y, a.r * 0.16 * (0.4 + open), 0, TAU);
  clear(P, mouth, ['b']);
  fill(P, mouth, { y: 0.7 });
}

function starfish(P: Plates, x: number, y: number, r: number, turn: number) {
  const path = new Path2D();
  for (let i = 0; i <= 10; i++) {
    const a = turn + (i / 10) * TAU;
    const k = i % 2 === 0 ? r : r * 0.42;
    const px = x + Math.cos(a) * k;
    const py = y + Math.sin(a) * k;
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }
  path.closePath();
  clear(P, path, ['b', 'g']);
  for (const ctx of P) ctx.lineJoin = 'round';
  fill(P, path, { p: 0.85, y: 0.9 });
  stroke(P, path, 6, { p: 0.85, y: 0.9 });
  const dots = new Path2D();
  for (let i = 0; i < 5; i++) {
    const a = turn + (i / 5) * TAU;
    for (let j = 1; j <= 3; j++) {
      dots.moveTo(x + Math.cos(a) * r * j * 0.22 + 3, y + Math.sin(a) * r * j * 0.22);
      dots.arc(x + Math.cos(a) * r * j * 0.22, y + Math.sin(a) * r * j * 0.22, 3, 0, TAU);
    }
  }
  fill(P, dots, { b: 0.45 });
}

function weed(P: Plates, x: number, y: number, dir: number, len: number, key: string, t: number) {
  const s = mod(t, LOOP);
  const under = wet(x, y, t);
  const rng = rngFor(`weed:${key}`);
  const path = new Path2D();
  for (let strand = 0; strand < 7; strand++) {
    const base = dir + (strand / 6 - 0.5) * 1.1 + (rng() - 0.5) * 0.3;
    const curl = (rng() - 0.5) * 0.5;
    const l = len * (0.6 + rng() * 0.6);
    let px = x + (rng() - 0.5) * 12;
    let py = y + (rng() - 0.5) * 12;
    let a = base;
    path.moveTo(px, py);
    for (let seg = 1; seg <= 8; seg++) {
      const surge = Math.sin((TAU * s) / 1.5 - seg * 0.45 + strand * 0.7) * 0.22 * under;
      const limp = lerp(Math.PI / 2 + (base - dir) * 0.8 + (dir - Math.PI / 2) * 0.3, a, under);
      a = lerp(limp, a, under) + curl * under + surge;
      const step = (l / 8) * lerp(0.75, 1, under);
      px += Math.cos(a) * step;
      py += Math.sin(a) * step;
      path.lineTo(px, py);
    }
  }
  for (const ctx of P) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  stroke(P, path, 7, { g: 0.9, y: 0.5 });
}

const HOME = { x: 300, y: 820 };
const OUT = { x: 520, y: 720 };
const RIM = { x: 800, y: 700 };
const CRAB_START = 10.9;

interface CrabPose {
  x: number;
  y: number;
  face: number;
  stride: number;
  pick: number;
  alarm: number;
}

const scuttle = (u: number) => clamp01(smooth(u) + 0.045 * Math.sin(TAU * 3 * u));

export function crabAt(t: number): CrabPose | null {
  const c = mod(t - CRAB_START, LOOP);
  if (c > 5) return null;
  const across = Math.atan2(RIM.y - OUT.y, RIM.x - OUT.x) - Math.PI / 2;
  const toPool = Math.atan2(POOL.y - RIM.y, POOL.x - RIM.x);
  let x: number;
  let y: number;
  let face = across;
  let stride = 0;
  let pick = 0;
  let alarm = 0;
  if (c < 0.6) {
    const k = smooth(c / 0.6);
    x = lerp(HOME.x, OUT.x, k);
    y = lerp(HOME.y, OUT.y, k);
    stride = c * 3;
  } else if (c < 1.9) {
    const k = scuttle((c - 0.6) / 1.3);
    x = lerp(OUT.x, RIM.x, k);
    y = lerp(OUT.y, RIM.y, k);
    stride = 1.8 + k * 9;
  } else if (c < 3.6) {
    x = RIM.x;
    y = RIM.y;
    face = lerp(across, toPool, between(1.9, 2.3, c));
    pick = between(2.3, 2.5, c) * (1 - between(3.3, 3.5, c));
    alarm = between(3.4, 3.6, c);
    stride = 10.8 + (c - 1.9) * 0.4;
  } else {
    const k = smooth((c - 3.6) / 1.1);
    const path = [RIM, OUT, HOME];
    const seg = k < 0.7 ? 0 : 1;
    const local = seg === 0 ? k / 0.7 : (k - 0.7) / 0.3;
    x = lerp(path[seg]!.x, path[seg + 1]!.x, local);
    y = lerp(path[seg]!.y, path[seg + 1]!.y, local);
    face = lerp(toPool, across, between(3.6, 3.8, c));
    alarm = 1 - between(4.2, 4.6, c);
    stride = 11.5 + k * 14;
  }
  return { x, y, face, stride, pick, alarm };
}

function crab(P: Plates, pose: CrabPose, t: number) {
  const { x, y, face, stride, pick, alarm } = pose;
  const s = mod(t, LOOP);
  const fx = Math.cos(face);
  const fy = Math.sin(face);
  const at = (f: number, l: number): [number, number] => [x + fx * f - fy * l, y + fy * f + fx * l];

  const legs = new Path2D();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const phase = stride * TAU * 0.9 + i * Math.PI + (side > 0 ? Math.PI / 2 : 0);
      const swing = Math.sin(phase) * 9 * Math.min(1, stride);
      const lift = Math.max(0, Math.cos(phase)) * 5 * Math.min(1, stride);
      const f = 10 - i * 11;
      const [rx, ry] = at(f, side * 30);
      const [kx, ky] = at(f + 6 + swing * 0.5, side * (58 + lift));
      const [tx, ty] = at(f - 8 - i * 4 + swing, side * 76);
      legs.moveTo(rx, ry);
      legs.lineTo(kx, ky);
      legs.lineTo(tx, ty);
    }
  }

  const claws = new Path2D();
  const pincers = new Path2D();
  for (const side of [-1, 1]) {
    const dip = pick * Math.max(0, Math.sin((TAU * s * 5) / LOOP + (side > 0 ? Math.PI : 0)));
    const raise = alarm * 18;
    const [sx, sy] = at(20, side * 26);
    const [ex, ey] = at(44 + raise, side * (46 + raise * 0.6));
    const [hx, hy] = at(64 + raise * 1.4 + dip * 22, side * (30 + raise * 0.9 - dip * 6));
    claws.moveTo(sx, sy);
    claws.lineTo(ex, ey);
    claws.lineTo(hx, hy);
    const open = 0.35 + alarm * 0.4 + dip * 0.2;
    const [ax, ay] = at(
      64 + raise * 1.4 + dip * 22 + 22,
      side * (30 + raise * 0.9 - dip * 6) + side * 8 * open,
    );
    const [bx, by] = at(
      64 + raise * 1.4 + dip * 22 + 18,
      side * (30 + raise * 0.9 - dip * 6) - side * 10 * open,
    );
    pincers.moveTo(hx, hy);
    pincers.ellipse(hx, hy, 15, 11, face, 0, TAU);
    pincers.moveTo(hx, hy);
    pincers.lineTo(ax, ay);
    pincers.moveTo(hx, hy);
    pincers.lineTo(bx, by);
  }

  const shell = new Path2D();
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * TAU;
    const front = Math.cos(a) > 0 ? 0.82 : 1;
    const [px, py] = at(Math.cos(a) * 30 * front, Math.sin(a) * 44);
    if (i === 0) shell.moveTo(px, py);
    else shell.lineTo(px, py);
  }
  shell.closePath();

  const shadow = new Path2D();
  shadow.ellipse(x + 7, y + 10, 46, 32, face, 0, TAU);
  fill(P, shadow, { b: 0.3, p: 0.12 });

  for (const ctx of P) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  clear(P, legs, ['b'], 8);
  stroke(P, legs, 7, { p: 0.9, y: 0.8 });
  clear(P, claws, ['b'], 12);
  stroke(P, claws, 11, { p: 0.95, y: 0.85 });
  clear(P, pincers, ['b'], 7);
  fill(P, pincers, { p: 1, y: 0.8 });
  stroke(P, pincers, 6, { p: 1, y: 0.8 });
  clear(P, shell, ['b', 'g']);
  fill(P, shell, { p: 0.95, y: 0.95 });

  const ridge = new Path2D();
  const [r0x, r0y] = at(-18, -26);
  const [r1x, r1y] = at(6, 0);
  const [r2x, r2y] = at(-18, 26);
  ridge.moveTo(r0x, r0y);
  ridge.quadraticCurveTo(r1x, r1y, r2x, r2y);
  stroke(P, ridge, 4, { b: 0.35 });
  const back = new Path2D();
  const [bx, by] = at(-12, 0);
  back.ellipse(bx, by, 16, 34, face, 0, TAU);
  fill(P, back, { b: 0.18 });

  const eyes = new Path2D();
  for (const side of [-1, 1]) {
    const [ex, ey] = at(30, side * 12);
    eyes.moveTo(ex + 5, ey);
    eyes.arc(ex, ey, 5 + alarm, 0, TAU);
  }
  fill(P, eyes, { b: 1, p: 1, g: 0.6 });
}

function seaPath(t: number, offset = 0): Path2D {
  const path = new Path2D();
  path.moveTo(-20, -20);
  path.lineTo(SCENE.w + 20, -20);
  for (let x = SCENE.w + 20; x >= -20; x -= 16) path.lineTo(x, edge(x, t) + offset);
  path.closePath();
  return path;
}

function edgeLine(t: number, offset: number, from = -20, to = SCENE.w + 20): Path2D {
  const path = new Path2D();
  for (let x = from; x <= to; x += 16) {
    if (x === from) path.moveTo(x, edge(x, t) + offset);
    else path.lineTo(x, edge(x, t) + offset);
  }
  return path;
}

const FOAM = (() => {
  const rng = rngFor('foam');
  return Array.from({ length: 150 }, () => ({
    x: rng() * SCENE.w,
    back: rng() ** 1.6 * 70,
    r: 2 + rng() * 6,
  }));
})();

export function drawTide(P: Plates, t: number) {
  const { rocks: ROCK_PATHS, pool: POOL_PATH } = outlines();
  const s = mod(t, LOOP);
  for (const ctx of P) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  const all = new Path2D();
  all.rect(-20, -20, SCENE.w + 40, SCENE.h + 40);
  fill(P, all, { y: 0.34, p: 0.05 });
  const ripples = new Path2D();
  for (let j = 0; j < 30; j++) {
    const y0 = 40 + j * 34;
    for (let x = -20; x <= SCENE.w + 20; x += 20) {
      const y = y0 + 9 * Math.sin(x * 0.011 + j * 1.3) + 5 * Math.sin(x * 0.031 + j);
      if (x === -20) ripples.moveTo(x, y);
      else ripples.lineTo(x, y);
    }
  }
  stroke(P, ripples, 6, { y: 0.3, p: 0.05 });

  const ebb = s >= FALL[0] && s < FALL[1] + 1.2 ? 1 : 0.55;
  for (const ctx of [P[INDEX.b]!, P[INDEX.p]!]) {
    const top = edge(SCENE.w / 2, t);
    const g = ctx.createLinearGradient(0, top - 30, 0, top + 170);
    const strength = (ctx === P[INDEX.b] ? 0.24 : 0.06) * ebb;
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fill(seaPath(t, 170));
    ctx.fillStyle = '#000';
  }

  fill(P, POOL_PATH, { b: 0.44, g: 0.16 });
  const deep = blob(POOL.x + 20, POOL.y + 10, POOL.r * 0.62, POOL.squash, 'pool-deep', 5);
  fill(P, deep, { b: 0.22, p: 0.08 });
  for (const ctx of P) {
    ctx.save();
    ctx.clip(POOL_PATH);
  }
  const caustics = new Path2D();
  for (let i = 0; i < 9; i++) {
    const y0 = POOL.y - 150 + i * 36;
    for (let x = POOL.x - 280; x <= POOL.x + 280; x += 14) {
      const y =
        y0 +
        12 * Math.sin(x * 0.028 + i * 2.1 + (TAU * s * 2) / LOOP) +
        7 * Math.sin(x * 0.061 - i + (TAU * s * 3) / LOOP);
      if (x === POOL.x - 280) caustics.moveTo(x, y);
      else caustics.lineTo(x, y);
    }
  }
  clear(P, caustics, ['b', 'g'], 5);
  stroke(P, caustics, 5, { y: 0.55 });
  starfish(P, 1000, 690, 44, 0.4);
  for (const a of POOL_ANEMONES) anemone(P, a, 1, t);
  for (const ctx of P) ctx.restore();

  stroke(P, POOL_PATH, 10, { b: 0.35, g: 0.2 });

  const pebbles = new Path2D();
  const prng = rngFor('pebbles');
  for (let i = 0; i < 26; i++) {
    const px = prng() * SCENE.w;
    const py = 350 + prng() * 650;
    const pr = 5 + prng() * 10;
    pebbles.moveTo(px + pr, py);
    pebbles.ellipse(px, py, pr, pr * 0.75, prng() * 3, 0, TAU);
  }
  fill(P, pebbles, { p: 0.3, b: 0.3 });

  const pose = crabAt(t);
  if (pose) crab(P, pose, t);

  ROCKS.forEach((rock, i) => {
    const path = ROCK_PATHS[i]!;
    clear(P, path, ['y']);
    fill(P, path, { p: 0.34, g: 0.24 });
    const ctx = P[INDEX.b]!;
    const g = ctx.createRadialGradient(
      rock.x - rock.r * 0.35,
      rock.y - rock.r * 0.4 * rock.squash,
      rock.r * 0.1,
      rock.x,
      rock.y,
      rock.r * 1.1,
    );
    g.addColorStop(0, 'rgba(0,0,0,0.16)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fill(path);
    ctx.fillStyle = '#000';
    const lit = blob(
      rock.x - rock.r * 0.28,
      rock.y - rock.r * 0.3 * rock.squash,
      rock.r * 0.45,
      rock.squash,
      `${rock.key}:lit`,
    );
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.55;
    ctx.fill(lit);
    ctx.globalCompositeOperation = 'source-over';
    const shade = blob(
      rock.x + rock.r * 0.2,
      rock.y + rock.r * 0.25 * rock.squash,
      rock.r * 0.7,
      rock.squash,
      `${rock.key}:shade`,
    );
    P[INDEX.p]!.save();
    P[INDEX.p]!.clip(path);
    fill(P, shade, { p: 0.3 });
    P[INDEX.p]!.restore();
    const cracks = new Path2D();
    const crng = rngFor(`cracks:${rock.key}`);
    for (let c = 0; c < 2; c++) {
      let cx = rock.x + (crng() - 0.5) * rock.r * 0.8;
      let cy = rock.y + (crng() - 0.5) * rock.r * 0.5;
      let ca = crng() * TAU;
      cracks.moveTo(cx, cy);
      for (let seg = 0; seg < 5; seg++) {
        ca += (crng() - 0.5) * 1.2;
        cx += Math.cos(ca) * rock.r * 0.12;
        cy += Math.sin(ca) * rock.r * 0.12;
        cracks.lineTo(cx, cy);
      }
    }
    for (const plate of P) {
      plate.save();
      plate.clip(path);
    }
    stroke(P, cracks, 4, { b: 0.5, p: 0.4 });
    for (const plate of P) plate.restore();
    const rng = rngFor(`barnacles:${rock.key}`);
    const barnacles = new Path2D();
    const count = Math.round(rock.r / 9);
    for (let b = 0; b < count; b++) {
      const a = rng() * TAU;
      const d = Math.sqrt(rng()) * rock.r * 0.75;
      const bx = rock.x + Math.cos(a) * d;
      const by = rock.y + Math.sin(a) * d * rock.squash;
      const br = 3 + rng() * 5;
      barnacles.moveTo(bx + br, by);
      barnacles.arc(bx, by, br, 0, TAU);
    }
    clear(P, barnacles, ['b', 'p', 'g']);
    fill(P, barnacles, { y: 0.35 });
  });

  weed(P, 830, 505, 0.4, 90, 'w1', t);
  weed(P, 1180, 520, 1.6, 80, 'w2', t);
  weed(P, 1250, 330, -2.4, 95, 'w3', t);
  weed(P, 150, 640, -1.3, 85, 'w4', t);
  weed(P, 300, 380, 0.5, 80, 'w5', t);

  for (const a of SHELF_ANEMONES) anemone(P, a, wet(a.x, a.y, t), t);

  const sea = seaPath(t);
  fill(P, sea, { b: 0.5, g: 0.14 });
  const deepSea = seaPath(t, -160);
  fill(P, deepSea, { b: 0.18, p: 0.06 });

  for (let k = 0; k < 5; k++) {
    const d = mod(k + s / 1.5, 5) * 60 + 30;
    const crest = edgeLine(t, -d);
    const strength = between(300, 180, d) * between(20, 80, d);
    if (strength < 0.02) continue;
    const ctx = P[INDEX.b]!;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = strength;
    ctx.lineWidth = 7;
    ctx.stroke(crest);
    ctx.globalCompositeOperation = 'source-over';
  }

  const foam = edgeLine(t, -4);
  clear(P, foam, ALL, 14);
  const bubbles = new Path2D();
  for (const f of FOAM) {
    const y = edge(f.x, t) - 10 - f.back;
    bubbles.moveTo(f.x + f.r, y);
    bubbles.arc(f.x, y, f.r, 0, TAU);
  }
  clear(P, bubbles);
  stroke(P, edgeLine(t, 6), 4, { b: 0.35 });

  const grng = rngFor('glints');
  const glints = new Path2D();
  for (let i = 0; i < 40; i++) {
    const gx = mod(grng() * SCENE.w + s * 30, SCENE.w);
    const gy = grng() * SCENE.h;
    const on = Math.sin((TAU * s * 4) / LOOP + i * 2.3);
    if (on < 0.4 || gy > edge(gx, t) - 60) continue;
    glints.moveTo(gx - 9, gy);
    glints.lineTo(gx + 9, gy);
  }
  clear(P, glints, ALL, 4);
  stroke(P, glints, 4, { y: 0.8 });
  for (const ctx of P) ctx.globalAlpha = 1;
}
