// Old: chunk.vendor.js module 984 (opentype.js draw.js, unchanged).

/** The part of a 2D canvas context the opentype drawing helpers use. */
export interface DrawingContext {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
  quadraticCurveTo(x1: number, y1: number, x: number, y: number): void;
  closePath(): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
}

/** Draws a line on the context from x1,y1 to x2,y2. */
export function line(ctx: DrawingContext, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
