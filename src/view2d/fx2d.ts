// Particles for look B: dust, chips, splash, sparks, confetti and rotor wash, in art px.

import { C } from '../view/palette';
import { css } from './placeholders';

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; g: number; grow: number; spin: number }

export class Fx2D {
  private ps: P[] = [];

  private add(n: number, f: (i: number) => Partial<P> & { x: number; y: number }): void {
    for (let i = 0; i < n; i++) {
      const p = f(i);
      const life = p.life ?? 0.5;
      this.ps.push({ vx: 0, vy: 0, size: 8, color: '#fff', g: 0, grow: 0, spin: 0, ...p, life, max: life });
    }
    if (this.ps.length > 600) this.ps.splice(0, this.ps.length - 600);
  }

  dust(x: number, y: number, n: number): void {
    this.add(n, () => ({ x: x + (Math.random() - 0.5) * 40, y: y - 6, vx: (Math.random() - 0.5) * 160, vy: -30 - Math.random() * 60, life: 0.45 + Math.random() * 0.2, size: 10 + Math.random() * 8, color: css(C.sand, 0.85), grow: 30 }));
  }

  chips(x: number, y: number, colors: number[], n: number): void {
    this.add(n, (i) => ({ x, y, vx: (Math.random() - 0.5) * 520, vy: -200 - Math.random() * 380, life: 0.7 + Math.random() * 0.4, size: 7 + Math.random() * 9, color: css(colors[i % colors.length]), g: 1500, spin: 1 }));
  }

  splash(x: number, y: number, n: number): void {
    this.add(n, () => ({ x: x + (Math.random() - 0.5) * 50, y, vx: (Math.random() - 0.5) * 300, vy: -260 - Math.random() * 320, life: 0.55 + Math.random() * 0.25, size: 6 + Math.random() * 8, color: css(Math.random() > 0.4 ? C.foam : C.water, 0.95), g: 1500 }));
  }

  sparks(x: number, y: number): void {
    this.add(10, () => ({ x, y, vx: (Math.random() - 0.5) * 500, vy: -Math.random() * 400, life: 0.25 + Math.random() * 0.15, size: 5 + Math.random() * 4, color: Math.random() > 0.5 ? '#ffd35a' : '#ff9a3c', g: 600 }));
  }

  confetti(x: number, y: number): void {
    const cols = [C.red, C.peg1, C.peg2, C.peg3, C.cream, C.grass];
    this.add(40, (i) => ({ x, y, vx: (Math.random() - 0.5) * 600, vy: -400 - Math.random() * 400, life: 1.4 + Math.random() * 0.6, size: 8 + Math.random() * 6, color: css(cols[i % cols.length]), g: 700, spin: 1 }));
  }

  /** Dark smoke puffs that rise and grow (explosions, a jet going down). */
  smoke(x: number, y: number, n: number): void {
    this.add(n, () => ({ x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 80, life: 0.8 + Math.random() * 0.5, size: 22 + Math.random() * 16, color: 'rgba(60,52,48,0.55)', grow: 50 }));
  }

  rotorWash(x: number, y: number): void {
    this.add(2, (i) => ({ x: x + (i ? 1 : -1) * 20, y: y - 4, vx: (i ? 1 : -1) * (160 + Math.random() * 100), vy: -20 - Math.random() * 30, life: 0.4, size: 6 + Math.random() * 5, color: css(C.foam, 0.8), g: 200 }));
  }

  update(dt: number): void {
    for (const p of this.ps) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += p.grow * dt;
    }
    this.ps = this.ps.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.ps) {
      const a = Math.min(1, p.life / p.max * 1.6);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.spin) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 9);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
