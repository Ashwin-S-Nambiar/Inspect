export interface Ink {
  name: string;
  rgb: readonly [number, number, number];
  angle: number;
  slip: readonly [number, number];
}

export const INKS: readonly Ink[] = [
  { name: 'yellow', rgb: [0xff, 0xe8, 0x00], angle: 0, slip: [-0.7, 0.35] },
  { name: 'pink', rgb: [0xff, 0x48, 0xb0], angle: 75, slip: [1, 0.45] },
  { name: 'green', rgb: [0x00, 0xa9, 0x5c], angle: 45, slip: [-0.35, -1] },
  { name: 'blue', rgb: [0x00, 0x78, 0xbf], angle: 15, slip: [0.3, 0.85] },
];

const PAPER = [0xf2, 0xed, 0xe3] as const;

const DENSITY = 0.92;

export function hash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rngFor(key: string): () => number {
  let a = hash(key);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function field(w: number, h: number, key: string, cell: number, octaves = 3): Float32Array {
  const out = new Float32Array(w * h);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const size = Math.max(2, cell / 2 ** o);
    const gw = Math.ceil(w / size) + 2;
    const gh = Math.ceil(h / size) + 2;
    const rng = rngFor(`${key}:${o}`);
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rng();
    for (let y = 0; y < h; y++) {
      const gy = y / size;
      const y0 = Math.floor(gy);
      let fy = gy - y0;
      fy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < w; x++) {
        const gx = x / size;
        const x0 = Math.floor(gx);
        let fx = gx - x0;
        fx = fx * fx * (3 - 2 * fx);
        const i = y0 * gw + x0;
        const top = grid[i]! + (grid[i + 1]! - grid[i]!) * fx;
        const bot = grid[i + gw]! + (grid[i + gw + 1]! - grid[i + gw]!) * fx;
        out[y * w + x] += (top + (bot - top) * fy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

export function screen(
  w: number,
  h: number,
  pitch: number,
  angle: number,
  key: string,
): Uint8Array {
  const out = new Uint8Array(w * h);
  const rad = (angle * Math.PI) / 180;
  const c = Math.cos(rad) / pitch;
  const s = Math.sin(rad) / pitch;
  const rng = rngFor(`screen:${key}`);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x * c + y * s;
      const v = y * c - x * s;
      const fu = u - Math.floor(u) - 0.5;
      const fv = v - Math.floor(v) - 0.5;
      const d = fu * fu + fv * fv;
      const area = d <= 0.25 ? Math.PI * d : 0.785 + ((d - 0.25) / 0.25) * 0.215;
      const t = area + (rng() - 0.5) * 0.14;
      out[y * w + x] = Math.max(1, Math.min(255, Math.round(t * 255)));
    }
  }
  return out;
}

export function starvation(w: number, h: number, key: string, scale: number): Uint8Array {
  const blotch = field(w, h, `starve:${key}`, 90 * scale, 3);
  const rng = rngFor(`void:${key}`);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) {
    const v = 0.72 + blotch[i]! * 0.36 - (rng() < 0.012 ? 0.6 : 0);
    out[i] = Math.round(Math.max(0, Math.min(1, v)) * 255);
  }
  return out;
}

export function paper(w: number, h: number, scale: number): Uint8ClampedArray {
  const cloud = field(w, h, 'paper:cloud', 60 * scale, 4);
  const rng = rngFor('paper:fleck');
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const shade = (cloud[i]! - 0.5) * 16 + (rng() - 0.5) * 5 - (rng() < 0.003 ? 18 : 0);
    out[i * 4] = PAPER[0] + shade;
    out[i * 4 + 1] = PAPER[1] + shade;
    out[i * 4 + 2] = PAPER[2] + shade * 1.15;
    out[i * 4 + 3] = 255;
  }
  return out;
}

export interface PressOptions {
  plates: number;
  slip: number;
  screened: boolean;
}

export interface Press {
  width: number;
  height: number;
  print(
    coverage: readonly Uint8ClampedArray[],
    out: Uint8ClampedArray,
    options: PressOptions,
  ): void;
}

let sheet: { key: string; stock: Uint8ClampedArray; starve: Uint8Array[] } | null = null;

export function createPress(width: number, height: number, pitch: number, scale: number): Press {
  const sheetKey = `${width}x${height}@${scale}`;
  if (sheet?.key !== sheetKey) {
    sheet = {
      key: sheetKey,
      stock: paper(width, height, scale),
      starve: INKS.map((ink) => starvation(width, height, ink.name, scale)),
    };
  }
  const { stock, starve } = sheet;
  const screens = INKS.map((ink) => screen(width, height, pitch, ink.angle, ink.name));
  const absorb = INKS.map((ink) => ink.rgb.map((c) => (1 - c / 255) * DENSITY));
  const soft = pitch / 2.5;

  return {
    width,
    height,
    print(coverage, out, { plates, slip, screened }) {
      out.set(stock);
      const n = Math.min(plates, INKS.length, coverage.length);
      for (let k = 0; k < n; k++) {
        const cov = coverage[k]!;
        const th = screens[k]!;
        const st = starve[k]!;
        const [ar, ag, ab] = absorb[k]!;
        const dx = Math.round(INKS[k]!.slip[0] * slip);
        const dy = Math.round(INKS[k]!.slip[1] * slip);
        for (let y = 0; y < height; y++) {
          const sy = y - dy;
          if (sy < 0 || sy >= height) continue;
          const x0 = Math.max(0, dx);
          const x1 = Math.min(width, width + dx);
          for (let x = x0; x < x1; x++) {
            const c = cov[(sy * width + x - dx) * 4 + 3]!;
            if (c === 0) continue;
            const i = y * width + x;
            let a: number;
            if (!screened) a = c / 255;
            else if (c === 255) a = 1;
            else {
              a = ((c - th[i]!) / 255) * soft + 0.5;
              if (a <= 0) continue;
              if (a > 1) a = 1;
            }
            a *= st[i]! / 255;
            const p = i * 4;
            out[p] = out[p]! * (1 - a * ar!);
            out[p + 1] = out[p + 1]! * (1 - a * ag!);
            out[p + 2] = out[p + 2]! * (1 - a * ab!);
          }
        }
      }
    },
  };
}
