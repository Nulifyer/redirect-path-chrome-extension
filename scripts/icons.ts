import { deflateSync } from 'node:zlib';

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let i=0;i<8;i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name: string, bytes: Uint8Array) {
  const data = Buffer.concat([Buffer.from(name), bytes]);
  const size = Buffer.alloc(4); size.writeUInt32BE(bytes.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(data));
  return Buffer.concat([size, data, crc]);
}
/** Rasterize an original redirect arrow at the requested toolbar resolution. */
export function icon(size: number) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const points = [[.22,.24],[.58,.24],[.58,.68],[.78,.68]];
  const lines = [...points.slice(1).map((p,i)=>[points[i],p]),[[.62,.52],[.78,.68]],[[.62,.84],[.78,.68]]];
  function distance(x:number,y:number,a:number[],b:number[]) {
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
    return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
  }
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const index=y*(size*4+1)+1+x*4;
    const stroke=lines.some(([a,b])=>distance((x+.5)/size,(y+.5)/size,a,b)<.048);
    raw.set(stroke ? [227,235,255,255] : [49,73,113,255],index);
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
