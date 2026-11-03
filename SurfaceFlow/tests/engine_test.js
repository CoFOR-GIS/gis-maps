// Extracts the worker from index.html and runs it on synthetic terrain.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2] || require("path").join(__dirname, "..", "index.html"), 'utf8');
const src = html.match(/<script id="flowWorker" type="text\/js-worker">([\s\S]*?)<\/script>/)[1];
const msgs = []; const self = { postMessage: (m) => msgs.push(m) };
new Function('self', src)(self);
function check(name, cond) { console.log((cond ? 'PASS ' : 'FAIL ') + name); if (!cond) process.exitCode = 1; }

// Synthetic: tilted plane (slopes south, z drops 0.05/cell) + a V-valley along column 100 + a pit + a dam.
const W = 200, H = 300, dem = new Float32Array(W*H);
for (let r=0;r<H;r++) for (let c=0;c<W;c++) {
  let z = 400 - 0.05*r + 0.08*Math.abs(c-100);
  dem[r*W+c] = z;
}
// pit 1.5 m deep at (50,60)
for (let r=55;r<=65;r++) for (let c=45;c<=55;c++) dem[r*W+c] -= 1.5*(1 - Math.max(Math.abs(r-60),Math.abs(c-50))/6 > 0 ? 1 - Math.max(Math.abs(r-60),Math.abs(c-50))/6 : 0);
// dam (road embankment) across the valley at row 200, 3 m high
for (let c=80;c<=120;c++) dem[200*W+c] += 3;
dem[5*W+5] = NaN; // a nodata cell
const t0 = Date.now();
self.onmessage({ data: { type:'run', W, H, dem: dem.slice(), cellM: 5, streamAcres: 5, handAcres: 50 } });
const res = msgs.find(m=>m.type==='result'), err = msgs.find(m=>m.type==='error');
if (err) { console.log('ERROR', err.msg); process.exit(1); }
const { down, pond, hand, segments } = res.res;
console.log('time ms', Date.now()-t0, 'segments', segments.length, 'streamCells', res.res.nStream);
// 1. Every valid cell drains off-grid without loops
let ok = true, maxLen = 0;
for (let i=0;i<W*H;i++) { if (down[i]===-2) continue; let j=i,n=0; while(j>=0 && n<W*H){ j=down[j]; n++; } if (n>=W*H) ok=false; maxLen=Math.max(maxLen,n); }
check('no loops; all cells reach an outlet', ok);
check('nodata cell flagged -2', down[5*W+5]===-2);
// 2. Pit depth reported
check('pit holds water up to its lowest rim (~0.72 m by hand calc)', Math.abs(pond[60*W+50]-0.72) < 0.05);
check('no pond on slope', pond[150*W+20] < 0.01);
// 3. Dam ponds water behind it
check('water ponds behind dam until it spills round the end (~1.63 m)', Math.abs(pond[199*W+100]-1.63) < 0.05);
// 4. Flow direction generally southward on plane (row increases) away from valley
const d = down[100*W+30]; check('plane cell flows south-east toward valley', ((d/W|0) > 100 || (d/W|0)===100) && (d%W) >= 30);
// 5. Valley is the main stream: max accumulation near col 100 at bottom row
let best=-1,bc=-1; // find outlet with biggest stream segment
for (const s of segments) if (s.acres>best){best=s.acres; bc=s.p[s.p.length-2];}
check('largest stream ends near valley column 100 (got '+bc+')', Math.abs(bc-100)<=2);
// 6. HAND zero on valley, increases outward
check('HAND ~0 in valley', hand[250*W+100] < 0.2);
check('HAND larger on valley side', hand[250*W+60] > 2);
// 7. Streams re-threshold
msgs.length=0; self.onmessage({ data:{ type:'streams', streamAcres: 100 }});
const s2 = msgs[0].segments; check('higher threshold => fewer segments ('+s2.length+' < '+segments.length+')', s2.length < segments.length);
msgs.length=0; self.onmessage({ data:{ type:'hand', handAcres: 500 }});
check('hand message returns grid', msgs[0].hand.length===W*H);

// Performance at 1600x1600 with noise terrain
const W2=1600,H2=1600, d2=new Float32Array(W2*H2);
let seed=1; const rnd=()=>{seed=(seed*16807)%2147483647; return seed/2147483647;};
for (let r=0;r<H2;r++) for (let c=0;c<W2;c++) d2[r*W2+c]= 400 + 30*Math.sin(r/90)*Math.cos(c/120) + 15*Math.sin((r+c)/37) + rnd()*0.5 - 0.02*r;
msgs.length=0; const t1=Date.now();
self.onmessage({ data:{ type:'run', W:W2, H:H2, dem:d2, cellM:5, streamAcres:5, handAcres:250 }});
const r2 = msgs.find(m=>m.type==='result');
console.log('1600x1600 time ms', Date.now()-t1, 'segments', r2.res.segments.length);
check('large run completes < 15 s', Date.now()-t1 < 15000);
