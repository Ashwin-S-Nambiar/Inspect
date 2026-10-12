import { createPress, INKS, type Press } from './print';
import { type Ctx, drawTide, SCENE } from './tide';

export interface Frame {
  t: number;
  width: number;
  height: number;
  dpr: number;
  pitch: number;
  slip: number;
  plates: number;
  screened: boolean;
}

interface Target {
  width: number;
  height: number;
  getContext(kind: '2d'): Ctx | null;
}

interface Rig {
  width: number;
  height: number;
  dpr: number;
  pitch: number;
  press: Press;
  layers: Ctx[];
  out: ImageData;
}

export function createPrinter(target: Target, layer: (width: number, height: number) => Ctx) {
  let rig: Rig | null = null;

  return (f: Frame) => {
    const { width, height, dpr, pitch } = f;
    let r = rig;
    if (!r || r.width !== width || r.height !== height || r.dpr !== dpr || r.pitch !== pitch) {
      const sameSize = r?.width === width && r?.height === height;
      if (!sameSize) {
        target.width = width;
        target.height = height;
      }
      r = {
        width,
        height,
        dpr,
        pitch,
        press: createPress(width, height, pitch * dpr, dpr),
        layers: sameSize && r ? r.layers : INKS.map(() => layer(width, height)),
        out: new ImageData(width, height),
      };
      rig = r;
    }

    const scale = Math.max(width / SCENE.w, height / SCENE.h);
    const ox = (width - SCENE.w * scale) / 2;
    const oy = (height - SCENE.h * scale) / 2;
    for (const ctx of r.layers) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#000';
    }
    drawTide(r.layers, f.t);
    const coverage = r.layers.map((ctx) => ctx.getImageData(0, 0, width, height).data);
    r.press.print(coverage, r.out.data, {
      plates: f.plates,
      slip: f.slip * dpr,
      screened: f.screened,
    });
    target.getContext('2d')!.putImageData(r.out, 0, 0);
  };
}
