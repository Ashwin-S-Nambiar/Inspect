import { createPrinter, type Frame } from './printer';

let print: ((f: Frame) => void) | null = null;

self.onmessage = (event: MessageEvent<{ canvas: OffscreenCanvas } | Frame>) => {
  const data = event.data;
  if ('canvas' in data) {
    print = createPrinter(
      data.canvas,
      (w, h) => new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true })!,
    );
    return;
  }
  const start = performance.now();
  print?.(data);
  self.postMessage(performance.now() - start);
};
