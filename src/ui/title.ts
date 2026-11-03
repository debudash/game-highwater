// The landing page's backdrop, drawn at full resolution on the #ui canvas: the valley at dawn
// (bg-dawn when it has been generated, else the riverside morning), the generated logo, and the
// heroes in the scene: the chopper hovering over the river and a boat bobbing below it. The menus
// are drawn over this on the HUD canvas in the pixel font (src/ui/screens.ts).

const ART = 'art/';

/** Loaded art; anything missing is simply not drawn (the logo then falls back to pixel text). */
export class TitleArt {
  bg: HTMLImageElement | null = null;
  logo: HTMLImageElement | null = null;
  chopper: HTMLImageElement | null = null;
  boat: HTMLImageElement | null = null;
  private cache: { key: string; canvas: HTMLCanvasElement } | null = null;

  /** The background scaled to cover a w×h screen with room to drift, with the dawn wash on it. */
  scaledBg(w: number, h: number): HTMLCanvasElement {
    const key = `${w}x${h}`;
    if (this.cache?.key === key) return this.cache.canvas;
    const bg = this.bg!;
    const s = Math.max(w / bg.width, h / bg.height) * 1.08;
    const cv = document.createElement('canvas');
    cv.width = Math.round(bg.width * s);
    cv.height = Math.round(bg.height * s);
    const c = cv.getContext('2d')!;
    c.imageSmoothingQuality = 'high';
    c.drawImage(bg, 0, 0, cv.width, cv.height);
    // Warm dawn wash, darker towards the bottom for the water.
    const wash = c.createLinearGradient(0, 0, 0, cv.height);
    wash.addColorStop(0, 'rgba(255,190,150,0.18)');
    wash.addColorStop(0.6, 'rgba(255,170,120,0.08)');
    wash.addColorStop(1, 'rgba(40,30,60,0.35)');
    c.fillStyle = wash;
    c.fillRect(0, 0, cv.width, cv.height);
    this.cache = { key, canvas: cv };
    return cv;
  }

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    let sizes: Record<string, [number, number]> = {};
    try {
      const r = await fetch(`${ART}sizes.json`);
      if (r.ok) sizes = await r.json();
    } catch {
      /* no art list: draw nothing */
    }
    const img = (src: string) => new Promise<HTMLImageElement | null>((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    });
    const bgName = sizes['bg-dawn'] ? 'bg-dawn' : 'bg-riverside';
    if (sizes[bgName]) this.bg = await img(`${ART}${bgName}.webp`);
    if (sizes.logo) this.logo = await img(`${ART}logo.png`);
    if (sizes.chopper) this.chopper = await img(`${ART}chopper.png`);
    if (sizes.boat) this.boat = await img(`${ART}boat.png`);
  }
}

/** Draws the backdrop. `t` is seconds since the title opened; `logoBox` is where the logo went. */
export function drawTitleBackdrop(ctx: CanvasRenderingContext2D, art: TitleArt, w: number, h: number, t: number, withLogo = true): { logo: boolean; logoBottom: number } {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Sky and valley: cover the screen, drifting slowly sideways.
  if (art.bg) {
    // Scaled once per screen size (with the dawn wash baked in), then copied 1:1 each frame:
    // resampling a large image every frame costs too much on built-in graphics.
    const scaled = art.scaledBg(w, h);
    const drift = Math.sin(t * 0.05) * (scaled.width - w) * 0.45;
    ctx.drawImage(scaled, Math.round((w - scaled.width) / 2 + drift), Math.round((h - scaled.height) / 2));
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#7d86c4');
    g.addColorStop(1, '#f7b48a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // The river along the bottom, with a boat bobbing and the chopper hovering above it.
  const waterY = h * 0.87;
  const water = ctx.createLinearGradient(0, waterY, 0, h);
  water.addColorStop(0, 'rgba(80,170,190,0.92)');
  water.addColorStop(1, 'rgba(30,80,110,0.95)');
  ctx.fillStyle = water;
  ctx.fillRect(0, waterY, w, h - waterY);
  ctx.fillStyle = 'rgba(240,250,245,0.85)';
  for (let x = 0; x < w; x += 6) {
    const y = waterY + Math.sin(x * 0.02 + t * 2) * 2;
    ctx.fillRect(x, y - 1, 6, 3);
  }
  const unit = h / 9; // about the in-game tile size, so the heroes look as they do in play
  if (art.boat) {
    const bw = unit * 1.4;
    const bh = (bw * art.boat.height) / art.boat.width;
    // Right of the menus, sitting in the water
    const bx = w * 0.9 + Math.sin(t * 0.3) * unit * 0.15;
    const by = waterY + unit * 0.22 + Math.sin(t * 2.4) * unit * 0.04;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.sin(t * 1.7) * 0.05);
    ctx.drawImage(art.boat, -bw / 2, -bh, bw, bh);
    ctx.restore();
  }
  if (art.chopper) {
    const cw = unit * 1.6;
    const ch = (cw * art.chopper.height) / art.chopper.width;
    // Left of the menus, hovering over the river
    const cx = w * 0.09 + Math.sin(t * 0.4) * unit * 0.2;
    const cy = h * 0.68 + Math.sin(t * 1.3) * unit * 0.12;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.cos(t * 0.4) * 0.06);
    ctx.drawImage(art.chopper, -cw / 2, -ch, cw, ch);
    ctx.restore();
  }
  // The generated logo across the top.
  if (art.logo && withLogo) {
    const lw = Math.min(w * 0.62, (h * 0.27 * art.logo.width) / art.logo.height);
    const lh = (lw * art.logo.height) / art.logo.width;
    const y = h * 0.04 + Math.sin(t * 1.1) * h * 0.004;
    ctx.drawImage(art.logo, (w - lw) / 2, y, lw, lh);
    return { logo: true, logoBottom: y + lh };
  }
  return { logo: false, logoBottom: 0 };
}
