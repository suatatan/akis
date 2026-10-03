export function countWords(text) {
  return (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
}
export function duration(seconds) {
  const n = Math.max(0, Math.floor(seconds));
  return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
}
export class Flow {
  constructor(gap = 10) { this.gap = gap; this.start = null; this.last = null; this.best = 0; this.completed = 0; }
  stroke(now) {
    this.tick(now);
    if (this.start === null) this.start = now;
    this.last = now;
  }
  tick(now) {
    if (this.last !== null && now - this.last > this.gap * 1000) this.finish();
    this.best = Math.max(this.best, this.seconds());
    return this.seconds();
  }
  seconds() { return this.start === null ? 0 : Math.max(0, (this.last - this.start) / 1000); }
  finish() { const value = this.seconds(); this.best = Math.max(this.best, value); this.completed += value; this.start = this.last = null; return value; }
}
