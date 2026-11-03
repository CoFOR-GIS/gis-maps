// Offline end-to-end check of SurfaceFlow with a stand-in for the ArcGIS SDK (tests/mock_sdk.js).
// Needs Node and Playwright with Chromium. Usage: node tests/browser_test.js  (screenshots go to SHOT_DIR or tests/).
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1300,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.route('**/*',r=>{const u=r.request().url();
   if(u.startsWith('https://js.arcgis.com/4.31/esri'))return r.fulfill({body:'',contentType:'text/css'});
   if(u.startsWith('https://js.arcgis.com/4.31/'))return r.fulfill({body:fs.readFileSync(__dirname+'/mock_sdk.js','utf8'),contentType:'text/javascript'});
   if(u.startsWith('file:'))return r.continue(); return r.abort();});
 await p.goto('file://'+(process.argv[2] || path.join(__dirname, '..', 'index.html')));
 await p.waitForFunction(()=>!document.getElementById('runCity').disabled,{timeout:10000});
 // run with culverts OFF first to see the pond behind the embankment
 await p.uncheck('#culvertChk'); await p.click('#runCity');
 await p.waitForFunction(()=>/^Done|failed/.test(document.getElementById('status').textContent),{timeout:60000});
 console.log('status(no culvert):',await p.textContent('#status'));
 await p.screenshot({path:(process.env.SHOT_DIR || __dirname)+'/shot_noculvert.png'});
 await p.check('#culvertChk'); await p.click('#runCity');
 await p.waitForFunction(()=>/^Done|failed/.test(document.getElementById('status').textContent),{timeout:60000});
 console.log('status(culvert):',await p.textContent('#status'));
 await p.click('#dropBtn'); await p.evaluate(()=>__mock.click(-600,900)); await p.waitForTimeout(3000);
 console.log('drop:',await p.textContent('#dropInfo'));
 await p.screenshot({path:(process.env.SHOT_DIR || __dirname)+'/shot_flow.png'});
 await p.check('#handChk'); await p.fill('#handSl','8'); await p.dispatchEvent('#handSl','input'); await p.waitForTimeout(500);
 await p.screenshot({path:(process.env.SHOT_DIR || __dirname)+'/shot_hand.png'});
 // threshold slider changes
 await p.fill('#streamSl','80'); await p.dispatchEvent('#streamSl','input'); await p.waitForTimeout(1500);
 console.log('streamVal',await p.textContent('#streamVal'), 'graphics', await p.evaluate(()=>__mock.graphics[0].items.length));
 await p.fill('#handAreaSl','20'); await p.dispatchEvent('#handAreaSl','input'); await p.waitForTimeout(1500);
 await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(300);
 console.log('mobile scrollWidth', await p.evaluate(()=>document.documentElement.scrollWidth));
 await p.screenshot({path:(process.env.SHOT_DIR || __dirname)+'/shot_mobile.png'});
 await p.setViewportSize({width:1300,height:900});
 await p.click('#runView'); await p.waitForFunction(()=>/^Done|failed/.test(document.getElementById('status').textContent),{timeout:60000});
 console.log('status(view):',await p.textContent('#status'));
 console.log('errors:',errs); await b.close();})();
