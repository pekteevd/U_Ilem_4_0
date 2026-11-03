/* У Илем 4.0: объёмная 3D-карта на Three.js. */
(function(){
'use strict';
if(typeof window==='undefined'||!document)return;
const sceneEl=document.getElementById('scene');if(!sceneEl)return;
const CDN='https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
let THREE=null,renderer=null,world=null,camera=null,active=false,loading=null,frame=false;
let azimuth=.82,elevation=.72,distance=105,raycaster=null,pointer=null,hasOpened=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const statusText=t=>{const el=document.getElementById('uilem3dStatus');if(el)el.textContent=t;};
const css=document.createElement('style');
css.textContent='#uilem3dPanel{position:absolute;inset:0;z-index:24;background:#18251d;display:none;flex-direction:column;color:#f4ead3}#uilem3dPanel .bar{display:flex;align-items:center;gap:8px;padding:8px;background:#24372b;flex-wrap:wrap}#uilem3dPanel .bar button{border:1px solid #b99a64;border-radius:8px;background:#65492b;color:#fff2d5;padding:7px 11px;cursor:pointer}#uilem3dCanvas{position:relative;flex:1;min-height:0;touch-action:none}#uilem3dCanvas canvas{display:block;width:100%;height:100%}#uilem3dStatus{font:12px Arial;color:#d9d0b6}';
(document.head||document.documentElement).appendChild(css);
const panel=document.createElement('div');panel.id='uilem3dPanel';panel.innerHTML='<div class="bar"><b>У Илем · объёмная карта</b><span id="uilem3dStatus">Подготовка 3D-сцены…</span><button id="uilem3dReset">Сбросить вид</button><button id="uilem3dClose">Вернуться к карте</button></div><div id="uilem3dCanvas"></div>';
sceneEl.appendChild(panel);
const button=document.createElement('button');button.type='button';button.textContent='3D · объём';button.title='Открыть объёмную карту';button.style.marginLeft='6px';
const controls=document.getElementById('cameraControls');if(controls)controls.appendChild(button);else{const footer=sceneEl.parentElement&&sceneEl.parentElement.querySelector('.scenefooter');if(footer)footer.appendChild(button);}
function addMesh(group,geometry,material,x,y,z,objectId){
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;if(objectId)mesh.userData.objectId=objectId;group.add(mesh);return mesh;
}
function material(color,roughness=.9){return new THREE.MeshStandardMaterial({color,roughness});}
function createTree(x,z,scale=1){
 const g=new THREE.Group();g.position.set(x,0,z);
 addMesh(g,new THREE.CylinderGeometry(.18*scale,.28*scale,2.5*scale,7),material(0x76502e),0,1.25*scale,0);
 const crown=addMesh(g,new THREE.ConeGeometry(1.25*scale,3.2*scale,8),material(0x3e6b3b),0,3.8*scale,0);
 crown.castShadow=true;world.add(g);
}
function createHouse(x,z,name,id,type){
 const g=new THREE.Group();g.position.set(x,0,z);g.userData.objectId=id||null;
 const wood=material(type==='bath'?0x806044:0xb98a58),dark=material(0x493323),roof=material(type==='bath'?0x394c4a:0x6c4931),stone=material(0x77766b);
 addMesh(g,new THREE.BoxGeometry(9,.8,7),stone,0,.4,0,id);
 addMesh(g,new THREE.BoxGeometry(8.4,4.2,6.4),wood,0,2.9,0,id);
 addMesh(g,new THREE.BoxGeometry(1.25,2.6,.18),dark,0,1.7,3.22,id);
 addMesh(g,new THREE.BoxGeometry(1.4,1.2,.16),material(0x9dc3c0),-2.4,3,3.27,id);
 addMesh(g,new THREE.BoxGeometry(1.4,1.2,.16),material(0x9dc3c0),2.4,3,3.27,id);
 const left=addMesh(g,new THREE.BoxGeometry(9.4,.35,4.3),roof,0,5.2,-1.35,id);left.rotation.x=-.58;
 const right=addMesh(g,new THREE.BoxGeometry(9.4,.35,4.3),roof,0,5.2,1.35,id);right.rotation.x=.58;
 addMesh(g,new THREE.BoxGeometry(9.7,.3,.3),dark,0,6.35,0,id);
 world.add(g);
 const label=document.createElement('div');label.className='small';label.textContent=name||'Постройка';
 return g;
}
function createWell(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);
 const stone=material(0x77766b),wood=material(0x805a37),roof=material(0x493323);
 const ring=addMesh(g,new THREE.CylinderGeometry(1.35,1.5,.8,12),stone,0,.45,0);
 addMesh(g,new THREE.CylinderGeometry(.95,.95,.18,12),material(0x273c40),0,.9,0);
 addMesh(g,new THREE.BoxGeometry(.2,3,.2),wood,-1.2,2,0);
 addMesh(g,new THREE.BoxGeometry(.2,3,.2),wood,1.2,2,0);
 const cap=addMesh(g,new THREE.BoxGeometry(3.3,.25,2.4),roof,0,3.5,0);cap.rotation.x=.12;
 world.add(g);
}
function createBed(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);
 addMesh(g,new THREE.BoxGeometry(5,.55,2.1),material(0x815c39),0,.35,0);
 addMesh(g,new THREE.BoxGeometry(4.7,.12,1.8),material(0x493a27),0,.7,0);
 for(let i=0;i<7;i++){const plant=addMesh(g,new THREE.SphereGeometry(.22,7,6),material(i%2?0x638a43:0x7a9a4a),-1.8+i*.6,1,0);plant.scale.set(.7,1.5,.7);}
 world.add(g);
}
function buildWorld(){
 world=new THREE.Scene();world.background=new THREE.Color(0x9aa98c);world.fog=new THREE.Fog(0x9aa98c,110,230);
 const ground=addMesh(world,new THREE.PlaneGeometry(120,78),material(0x6f8956),0,0,0);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
 const water=addMesh(world,new THREE.PlaneGeometry(30,19),new THREE.MeshStandardMaterial({color:0x477f91,roughness:.25,metalness:.12}),27,.08,19);water.rotation.x=-Math.PI/2;
 const pathMat=material(0xb7a17a);
 addMesh(world,new THREE.BoxGeometry(100,.12,3),pathMat,0,.08,1);
 addMesh(world,new THREE.BoxGeometry(3,.12,42),pathMat,-12,.09,-4);
 addMesh(world,new THREE.BoxGeometry(36,.12,2),pathMat,12,.1,-10);
 const stone=material(0x77776b),fence=material(0x8d6845);
 for(let i=0;i<13;i++){
  addMesh(world,new THREE.BoxGeometry(.2,1.6,.2),fence,-28+i*4,.8,-24);
  addMesh(world,new THREE.BoxGeometry(.2,1.6,.2),fence,-28+i*4,.8,24);
 }
 addMesh(world,new THREE.BoxGeometry(52,.18,.18),fence,-4,1.1,-24);
 addMesh(world,new THREE.BoxGeometry(52,.18,.18),fence,-4,1.1,24);
 for(let i=0;i<18;i++){const x=-48+(i*17%94),z=-30+(i*23%58);createTree(x,z,.75+(i%4)*.12);}
 const staticMarkers=Array.from(document.querySelectorAll('#scene .hotspot'));
 staticMarkers.forEach((el,i)=>{
  const left=parseFloat(el.style.left)||20+i*8,top=parseFloat(el.style.top)||20+i*6;
  const x=(left-50)*1.05,z=(top-50)*.62,key=el.dataset.object||'',name=el.textContent.trim();
  if(/lake|озеро/i.test(key+' '+name)){return;}
  if(/garden|огород|сад/i.test(key+' '+name)){createBed(x,z);return;}
  if(/well|колодец/i.test(key+' '+name)){createWell(x,z);return;}
  const type=/bath|баня/i.test(key+' '+name)?'bath':'house';
  createHouse(x,z,name,key,type);
 });
 const builds=window.G&&Array.isArray(G.buildings)?G.buildings:[];
 builds.forEach(b=>{const x=((Number(b.x)||50)-50)*1.05,z=((Number(b.y)||50)-50)*.62;createHouse(x,z,b.name||b.type,b.id,b.type==='bath'?'bath':'house');});
 for(let i=0;i<4;i++)createBed(-22+i*7,15);
 const bonfire=new THREE.Group();bonfire.position.set(-5,0,16);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;addMesh(bonfire,new THREE.DodecahedronGeometry(.55,0),stone,Math.cos(a)*1.4,.4,Math.sin(a)*1.4);}
 addMesh(bonfire,new THREE.ConeGeometry(.65,2.2,7),material(0xe17b2e),0,1.3,0);
 world.add(bonfire);
 const ambient=new THREE.HemisphereLight(0xe9f0df,0x46543c,2.1);world.add(ambient);
 const sun=new THREE.DirectionalLight(0xffe4b6,2.5);sun.position.set(-35,55,30);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-75;sun.shadow.camera.right=75;sun.shadow.camera.top=75;sun.shadow.camera.bottom=-75;world.add(sun);
}
function updateCamera(){
 if(!camera)return;
 const h=Math.cos(elevation)*distance;
 camera.position.set(Math.sin(azimuth)*h,Math.sin(elevation)*distance,Math.cos(azimuth)*h);camera.lookAt(0,0,0);
}
async function init(){
 if(loading)return loading;
 loading=(async()=>{
  try{
   THREE=await import(CDN);
   const host=document.getElementById('uilem3dCanvas');const w=host.clientWidth||800,h=host.clientHeight||500;
   camera=new THREE.PerspectiveCamera(43,w/h,.1,500);renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(w,h);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
   raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();buildWorld();updateCamera();
   renderer.setAnimationLoop(()=>{if(active&&world&&camera)renderer.render(world,camera);});
   window.addEventListener('resize',resize);
   bindControls(renderer.domElement);
   statusText('Геометрия построена · вращай мышью, колесо меняет масштаб');
  }catch(e){statusText('Не удалось загрузить Three.js: '+(e.message||e));throw e;}
 })();return loading;
}
function disposeWorld(){
 if(!world)return;
 world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
}
function rebuildWorld(){disposeWorld();buildWorld();updateCamera();}
function resize(){
 if(!renderer||!camera)return;const host=document.getElementById('uilem3dCanvas');if(!host)return;
 const w=host.clientWidth||1,h=host.clientHeight||1;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
}
function bindControls(canvas){
 let down=false,lastX=0,lastY=0;
 canvas.addEventListener('pointerdown',e=>{down=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;azimuth-=dx*.006;elevation=clamp(elevation+dy*.005,.18,1.35);updateCamera();});
 canvas.addEventListener('pointerup',e=>{if(!down)return;down=false;pick(e,canvas);});
 canvas.addEventListener('pointercancel',()=>down=false);
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.08,45,180);updateCamera();},{passive:false});
}
function pick(e,canvas){
 if(!raycaster||!camera||!THREE)return;
 const r=canvas.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;
 raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(world.children,true);
 for(const hit of hits){let o=hit.object;while(o&&!(o.userData&&o.userData.objectId))o=o.parent;if(o&&G&&G.objects&&G.objects[o.userData.objectId]){G.selected=o.userData.objectId;if(typeof save==='function')save();if(typeof renderObject==='function')renderObject();statusText('Выбран объект: '+G.objects[G.selected].name);break;}}
}
function open(){
 active=true;panel.style.display='flex';const layer=sceneEl.querySelector('.camera-layer');if(layer)layer.style.visibility='hidden';sceneEl.querySelectorAll('.hotspot').forEach(x=>x.style.visibility='hidden');
 init().then(()=>{if(hasOpened)rebuildWorld();else hasOpened=true;resize();}).catch(()=>{});
}
function close(){
 active=false;panel.style.display='none';const layer=sceneEl.querySelector('.camera-layer');if(layer)layer.style.visibility='';sceneEl.querySelectorAll('.hotspot').forEach(x=>x.style.visibility='');
}
button.addEventListener('click',open);
document.getElementById('uilem3dClose').addEventListener('click',close);
document.getElementById('uilem3dReset').addEventListener('click',()=>{azimuth=.82;elevation=.72;distance=105;updateCamera();});
window.Uilem3D={open,close,reset:()=>{azimuth=.82;elevation=.72;distance=105;updateCamera();}};
})();