// Minimal stand-in for the ArcGIS AMD loader, enough to exercise SurfaceFlow's own logic offline.
(function(){
const R=6378137, LAT=29.745, LON=-98.69;
const X0=LON*Math.PI/180*R, Y0=Math.log(Math.tan(Math.PI/4+LAT*Math.PI/360))*R, K=1/Math.cos(LAT*Math.PI/180);
const latOf=y=>(2*Math.atan(Math.exp(y/R))-Math.PI/2)*180/Math.PI;
class Ext{constructor(o){Object.assign(this,o);} get width(){return this.xmax-this.xmin} get height(){return this.ymax-this.ymin}
  get center(){const x=(this.xmin+this.xmax)/2,y=(this.ymin+this.ymax)/2;return {x,y,latitude:latOf(y)};}}
// Terrain in ground meters relative to center: south-sloping valley + dam (road) across valley at gy=-500 with culvert.
function z(x,y){const gx=(x-X0)/K, gy=(y-Y0)/K;
  let h=420+0.02*gy+0.06*Math.abs(gx-0.15*gy)+6*Math.sin(gx/180)*Math.cos(gy/210)+3*Math.sin((gx+gy)/97);
  if(Math.abs(gy+500)<12 && Math.abs(gx-0.15*gy-0)<400) h+=4; // embankment
  return h;}
window.__mock={X0,Y0,K,graphics:[],media:{}};
class Evented{on(){}}
class Layer{constructor(o){Object.assign(this,{visible:true},o||{});}}
class ElevationLayer extends Layer{createElevationSampler(ext){return Promise.resolve({elevationAt:(x,y)=>z(x,y)});}fetchTile(){return Promise.resolve({values:[],noDataValue:0});}load(){return Promise.resolve();}}
const BaseElevationLayer={createSubclass:(p)=>class extends Layer{}};
class FeatureLayer extends Layer{createQuery(){return {}}
  queryExtent(){const h=1500*K;return Promise.resolve({extent:new Ext({xmin:X0-h,xmax:X0+h,ymin:Y0-h,ymax:Y0+h,spatialReference:{wkid:3857}})});}
  queryFeatures(){ if(!/FeatureServer\/4/.test(this.url)) return Promise.resolve({features:[]});
    const gy=-500, gx=0.15*gy; // culvert under the embankment at the valley floor
    return Promise.resolve({features:[{geometry:{paths:[[[X0+gx*K,Y0+(gy+14)*K],[X0+gx*K,Y0+(gy-14)*K]]]}}]});}}
class GraphicsLayer extends Layer{constructor(o){super(o);this.items=[];__mock.graphics.push(this);}addMany(a){this.items.push(...a);draw();}removeAll(){this.items=[];draw();}}
class MediaLayer extends Layer{constructor(o){super(o);__mock.media[o.title]=this;} set source(s){this._s=s;draw();} get source(){return this._s}}
class ImageElement{constructor(o){Object.assign(this,o);} set image(i){this._i=i;draw();} get image(){return this._i}}
class Simple{constructor(o){Object.assign(this,o);}}
let clickFn=null;
class SceneView{constructor(o){Object.assign(this,o);this.spatialReference={wkid:3857};this.ui={add(){}};
  this.container=document.getElementById(o.container);const h=2000*K;
  this.extent=new Ext({xmin:X0-h,xmax:X0+h,ymin:Y0-h,ymax:Y0+h});this.center={x:X0,y:Y0,latitude:LAT};
  const cv=document.createElement('canvas');cv.id='dbg';cv.width=900;cv.height=900;cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#3b4a3a';this.container.appendChild(cv);__mock.view=this;}
  when(ok){setTimeout(ok,50);return Promise.resolve();} on(t,f){if(t==='click')clickFn=f;}}
__mock.click=(gx,gy)=>clickFn({stopPropagation(){},mapPoint:{x:X0+gx*K,y:Y0+gy*K}});
let pend=0;function draw(){if(pend)return;pend=requestAnimationFrame(()=>{pend=0;render();});}
function render(){const cv=document.getElementById('dbg');if(!cv)return;const g=cv.getContext('2d');g.fillStyle='#3b4a3a';g.fillRect(0,0,900,900);
  const h=1600*K, toPx=(x,y)=>[(x-(X0-h))/(2*h)*900,((Y0+h)-y)/(2*h)*900];
  // hillshade-ish background
  for(const name of ['Low spots','Rising water']){const m=__mock.media[name];if(!m||!m.visible||!m._s||!m._s.image)continue;const e=m._s.georeference.extent;const a=toPx(e.xmin,e.ymax),b=toPx(e.xmax,e.ymin);g.drawImage(m._s.image,a[0],a[1],b[0]-a[0],b[1]-a[1]);}
  for(const L of __mock.graphics){if(!L.visible)continue;for(const gr of L.items){const geo=gr.geometry;if(!geo||!geo.paths)continue;const sl=gr.symbol.symbolLayers[0];const c=sl.material.color;g.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${c[3]??1})`;g.lineWidth=sl.size;g.beginPath();geo.paths[0].forEach((p,i)=>{const q=toPx(p[0],p[1]);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);});g.stroke();
    const P=geo.paths[0];if(P.length>1){const a=toPx(...P[P.length-2]),b=toPx(...P[P.length-1]);const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);g.fillStyle=g.strokeStyle;g.beginPath();g.moveTo(b[0],b[1]);g.lineTo(b[0]-7*Math.cos(ang-0.5),b[1]-7*Math.sin(ang-0.5));g.lineTo(b[0]-7*Math.cos(ang+0.5),b[1]-7*Math.sin(ang+0.5));g.fill();}}}}
const mods={"esri/Map":Simple,"esri/views/SceneView":SceneView,"esri/layers/ElevationLayer":ElevationLayer,"esri/layers/FeatureLayer":FeatureLayer,
 "esri/layers/GraphicsLayer":GraphicsLayer,"esri/layers/MapImageLayer":Layer,"esri/layers/MediaLayer":MediaLayer,"esri/layers/support/ImageElement":ImageElement,
 "esri/layers/support/ExtentAndRotationGeoreference":Simple,"esri/Graphic":Simple,"esri/geometry/Extent":Ext,"esri/geometry/Polyline":Simple,"esri/geometry/Point":Simple,
 "esri/layers/BaseElevationLayer":BaseElevationLayer,"esri/identity/IdentityManager":{},"esri/widgets/Search":Simple};
window.require=(names,cb)=>setTimeout(()=>cb(...names.map(n=>{if(!(n in mods))throw new Error('missing '+n);return mods[n];})),0);
setInterval(draw,200);
})();
