/* У Илем 4.0 — единый слой карты и объёмных игровых объектов.
   WebGL-геометрия строится из вершин и граней, координаты и ID хранятся в G.mapObjects. */
(function () {
'use strict';
if (!window.G || typeof window.save !== 'function') return;
const $ = id => document.getElementById(id);
const TYPES = {
 house:{label:'Дом',w:8,d:7,h:5,wall:'#b98555',roof:'#68432d'},
 bath:{label:'Баня',w:6,d:5,h:3.6,wall:'#a9784d',roof:'#4b392b'},
 shed:{label:'Хозблок',w:5,d:4,h:3,wall:'#98734d',roof:'#584633'},
 greenhouse:{label:'Теплица',w:7,d:4,h:2.8,wall:'#a7c9b0',roof:'#b9d8cb'},
 gazebo:{label:'Беседка',w:5,d:5,h:3.5,wall:'#98704a',roof:'#6a4930'},
 toilet:{label:'Туалет',w:2.5,d:2.5,h:2.7,wall:'#a57b54',roof:'#59402d'},
 shower:{label:'Душ',w:2.5,d:2.5,h:2.5,wall:'#91a89b',roof:'#526b5e'},
 tree:{label:'Дерево',w:2.5,d:2.5,h:7,wall:'#765034',roof:'#557b48'},
 bench:{label:'Скамейка',w:3,d:1.2,h:1.2,wall:'#9b6638',roof:'#9b6638'},
 table:{label:'Садовый стол',w:3,d:2,h:1.5,wall:'#9b6638',roof:'#9b6638'},
 fire:{label:'Костровая зона',w:3,d:3,h:.5,wall:'#9a8061',roof:'#d58a42'},
 well:{label:'Колодец',w:2.5,d:2.5,h:1.8,wall:'#8c8170',roof:'#6a4a30'}
};
const DEFAULTS = [
 ['mainHouse','Родительский дом','house',.49,.43],['guestA','Гостевой дом','house',.29,.39],
 ['bath','Баня','bath',.61,.35],['guestB','Дом №2','house',.73,.47],
 ['garden','Сад и огород','tree',.42,.62],['well','Колодец','well',.16,.66]
];
function ensureData(){
 G.mapObjects = Array.isArray(G.mapObjects) ? G.mapObjects : [];
 const ids = new Set(G.mapObjects.map(o=>String(o.id)));
 DEFAULTS.forEach(a=>{
  if(!ids.has(a[0])) G.mapObjects.push({id:a[0],name:a[1],type:a[2],x:a[3],y:a[4],rotation:0,scale:1,source:'base'});
 });
 (G.buildings||[]).forEach(b=>{
  if(!ids.has(String(b.id))) G.mapObjects.push({id:String(b.id),name:b.name||b.type,type:normalizeType(b.type),x:Number(b.x||50)/100,y:Number(b.y||50)/100,rotation:0,scale:1,source:'building'});
 });
 G.mapObjects.forEach(o=>{o.x=clamp(Number(o.x),.02,.98);o.y=clamp(Number(o.y),.02,.98);o.rotation=Number(o.rotation)||0;o.scale=clamp(Number(o.scale)||1,.4,2.5);});
}
function normalizeType(t){return TYPES[t]?t:({guest:'house',workshop:'shed'}[t]||'shed');}
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
function clamp(v,a,b){return Math.max(a,Math.min(b,Number.isFinite(v)?v:a));}
function hex(h){const n=parseInt(h.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
function shade(c,k){return c.map(v=>clamp(v*k,0,1));}
function install(){
 const scene=$('scene'); if(!scene)return;

 scene.classList.add('uilem-world');
 const img=scene.querySelector('img');
 if(img){img.src='/U_Ilem_4_0_visual_base.png';img.alt='Утверждённая основная карта У Илем';img.style.animation='none';}
 const fx=$('weatherFx'); if(fx)fx.style.pointerEvents='none';

 let canvas=$('uilemWorldCanvas');
 if(!canvas){canvas=document.createElement('canvas');canvas.id='uilemWorldCanvas';scene.appendChild(canvas);}
 let tools=$('uilemWorldTools');
 if(!tools){tools=document.createElement('div');tools.id='uilemWorldTools';tools.className='plot-tools';scene.appendChild(tools);}
 tools.innerHTML='<button type="button" data-mode="select">↖ Выбор</button><select id="uilemObjectType" aria-label="Тип объекта"><option value="house">Дом</option><option value="bath">Баня</option><option value="shed">Хозблок</option><option value="greenhouse">Теплица</option><option value="gazebo">Беседка</option><option value="toilet">Туалет</option><option value="shower">Душ</option><option value="tree">Дерево</option><option value="bench">Скамейка</option><option value="table">Садовый стол</option><option value="fire">Костровая зона</option><option value="well">Колодец</option></select><button type="button" data-mode="place">＋ Разместить</button><button type="button" data-mode="move">↔ Переместить</button><button type="button" data-action="rotate">↻ Повернуть</button><button type="button" data-action="scaleUp">＋ Размер</button><button type="button" data-action="scaleDown">－ Размер</button><button type="button" data-action="edit">⚙ Параметры</button>';
 let style=$('uilemWorldStyle');
 if(!style){style=document.createElement('style');style.id='uilemWorldStyle';style.textContent=
 '#scene.uilem-world{isolation:isolate;touch-action:pan-y}#scene.uilem-world>img{width:100%;height:100%;object-fit:cover;animation:none!important}#uilemWorldCanvas{position:absolute;inset:0;width:100%;height:100%;z-index:4;display:block;touch-action:none}#uilemWorldTools{z-index:8;left:8px;bottom:8px;right:8px;align-items:center}#uilemWorldTools select{max-width:130px;border-radius:8px;padding:7px;background:#f3e6ca;color:#392a1b;border:1px solid #947044}#uilemWorldTools button{font-size:11px;padding:7px 9px}#scene:after{pointer-events:none!important;animation:none!important}.eco-map-layer,.u4p-map-layer{display:none!important}';document.head.appendChild(style);}
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true});
 if(!gl){canvas.style.display='none';if(tools)tools.remove();console.error('WebGL недоступен: оставлена исходная карта с обычным управлением');return;}
 const vertex='attribute vec2 p;attribute vec4 c;varying vec4 v;void main(){gl_Position=vec4(p,0.0,1.0);v=c;}';
 const fragment='precision mediump float;varying vec4 v;void main(){gl_FragColor=v;}';
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
 const legacyTools=$('plotControls'); if(legacyTools)legacyTools.remove();
 scene.querySelectorAll('.hotspot').forEach(b=>{b.style.pointerEvents='none';b.style.opacity='0';b.setAttribute('aria-hidden','true');});
 const pLoc=gl.getAttribLocation(program,'p'),cLoc=gl.getAttribLocation(program,'c');
 const pBuf=gl.createBuffer(),cBuf=gl.createBuffer();
 let W=1,H=1,mode='select',selected=G.selected?String(G.selected):null,drag=null,meshes=[];
 function worldAnchor(sx,sy){const dx=(sx-W/2)/.7071,dy=(sy-H/2)/.3536;return {x:W/2+(dx+dy)/2,y:H/2+(dy-dx)/2};}
 function project(x,y,z){return [W/2+(x-y)*.7071,H/2+(x+y)*.3536-z*.95];}
 function screen(x,y,z){const p=project(x,y,z);return [(p[0]/W)*2-1,1-(p[1]/H)*2];}
 function pushTri(out,a,b,c,color,alpha){const n=hex(color);[a,b,c].forEach(v=>{const q=screen(v[0],v[1],v[2]);out.pos.push(q[0],q[1]);out.col.push(n[0],n[1],n[2],alpha===undefined?1:alpha);});}
 function quad(out,a,b,c,d,color){pushTri(out,a,b,c,color);pushTri(out,a,c,d,color);}
 function box(out,x,y,z,w,d,h,colors,rot){
  const r=(rot||0)*Math.PI/180,pt=(a,b,c)=>[x+a*Math.cos(r)-b*Math.sin(r),y+a*Math.sin(r)+b*Math.cos(r),z+c];
  const a=pt(-w/2,-d/2,0),b=pt(w/2,-d/2,0),c=pt(w/2,d/2,0),dd=pt(-w/2,d/2,0);
  const A=pt(-w/2,-d/2,h),B=pt(w/2,-d/2,h),C=pt(w/2,d/2,h),D=pt(-w/2,d/2,h);
  quad(out,a,b,B,A,colors[0]);quad(out,b,c,C,B,colors[1]);quad(out,c,dd,D,C,colors[2]);quad(out,dd,a,A,D,colors[3]);quad(out,A,B,C,D,colors[4]);
 }
 function roof(out,x,y,z,w,d,h,color,rot){
  const r=(rot||0)*Math.PI/180,pt=(a,b,c)=>[x+a*Math.cos(r)-b*Math.sin(r),y+a*Math.sin(r)+b*Math.cos(r),z+c];
  const a=pt(-w/2,-d/2,0),b=pt(w/2,-d/2,0),c=pt(w/2,d/2,0),dd=pt(-w/2,d/2,0),ridge1=pt(0,-d/2,h),ridge2=pt(0,d/2,h);
  quad(out,a,ridge1,ridge2,dd,shade(hex(color),1.08).map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').replace(/^/,'#'));
  pushTri(out,a,b,ridge1,shade(hex(color),.88).map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').replace(/^/,'#'));
  pushTri(out,dd,ridge2,c,shade(hex(color),.72).map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').replace(/^/,'#'));
  pushTri(out,b,c,ridge2,color);pushTri(out,a,dd,ridge1,color);
 }
 function tree(out,x,y,z,s){
  box(out,x,y,z,.55*s,.55*s,2.3*s,['#765034','#68452f','#5b3c29','#79583c','#8a6542'],0);
  const season=Math.floor((Number(G.month||1)-1)/3),foliage=season===3?'#a66b39':season===0?'#6f8066':'#557b48';
  const levels=3;
  for(let k=0;k<levels;k++){const h=2.0*s+k*1.1*s,rad=(2.1-k*.42)*s,base=z+1.8*s+k*.9*s;
   const pts=[[x-rad,y-rad,base],[x+rad,y-rad,base],[x+rad,y+rad,base],[x-rad,y+rad,base]],tip=[x,y,base+h];
   pushTri(out,pts[0],pts[1],tip,k===0?foliage:'#527b46');pushTri(out,pts[1],pts[2],tip,season===3?'#8c5934':'#3c6037');pushTri(out,pts[2],pts[3],tip,season===3?'#b17a43':'#4c7542');pushTri(out,pts[3],pts[0],tip,season===3?'#c18b4f':'#62874e');
  }
 }
 function shadow(out,x,y,rx,ry){const center=[x,y,0],steps=12;for(let i=0;i<steps;i++){const a=i*Math.PI*2/steps,b=(i+1)*Math.PI*2/steps;pushTri(out,center,[x+Math.cos(a)*rx,y+Math.sin(a)*ry,0],[x+Math.cos(b)*rx,y+Math.sin(b)*ry,0],'#514a3d',.22);}}
 function buildObject(out,o,idx){
  const t=TYPES[normalizeType(o.type)]||TYPES.shed,anchor=worldAnchor(o.x*W,o.y*H),x=anchor.x,y=anchor.y,s=clamp(Number(o.scale)||1,.4,2.5),z=0;
  // Ground shadow is a translucent flattened polygon, separate from the solid mesh.
  const w=t.w*s,d=t.d*s,h=t.h*s;
  const unit=Math.min(W,H)/120; const uw=w*unit,ud=d*unit,uh=h*unit;
  shadow(out,x+unit*.35,y+unit*.45,uw*.68,ud*.62);
  if(t.label==='Дерево'){tree(out,x,y,z,s*unit);return;}
  const kind=normalizeType(o.type);
  if(['house','bath','shed','greenhouse','gazebo','toilet','shower'].includes(kind)){
   box(out,x,y,z,uw*1.06,ud*1.06,unit*.28,['#77644d','#6a5947','#74634f','#806d56','#9b876a'],o.rotation);
   box(out,x,y,unit*.28,uw,ud,Math.max(unit*.5,uh-unit*.28),[t.wall,t.wall,t.wall,t.wall,shade(hex(t.wall),1.18).map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').replace(/^/,'#')],o.rotation);
   roof(out,x,y,uh,uw*1.12,ud*1.12,uh*.42,t.roof,o.rotation);
   if(kind==='house'||kind==='bath'||kind==='well'){
    box(out,x+uw*.22,y-ud*.52,unit*.38,unit*.52,unit*.14,uh*.72,['#543b2a','#543b2a','#543b2a','#543b2a','#8a603d'],o.rotation);
    [-1,1].forEach(side=>box(out,x+side*uw*.24,y-ud*.535,uh*.45,unit*.48,unit*.12,unit*.48,['#514638','#514638','#514638','#514638','#9db6b1'],o.rotation));
    box(out,x-uw*.28,y+ud*.08,uh+unit*.3,unit*.35,unit*.35,unit*.9,['#8b806d','#776b5b','#827664','#938674','#a69a86'],o.rotation);
   }
  } else {
   box(out,x,y,z,uw,ud,uh,[t.wall,t.wall,t.wall,t.wall,shade(hex(t.wall),1.18).map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').replace(/^/,'#')],o.rotation);
  }
  if(normalizeType(o.type)==='bench'||normalizeType(o.type)==='table'){
   box(out,x,y,z+.7*s,uw,ud*.28,.22*unit,['#71472b','#805432','#71472b','#805432','#a06d3e'],o.rotation);
   box(out,x,y,z+.25*s,uw*.9,ud*.22,.18*unit,['#71472b','#805432','#71472b','#805432','#a06d3e'],o.rotation);
  }
  if(normalizeType(o.type)==='fire'){/* open firepit geometry is intentionally low */ }
 }
 function syncAuxiliaryObjects(){
  const known=new Set(G.mapObjects.map(o=>String(o.id)));
  (G.buildings||[]).forEach(b=>{if(!known.has(String(b.id))){G.mapObjects.push({id:String(b.id),name:b.name||b.type,type:normalizeType(b.type),x:clamp(num(b.x,50)/100,.02,.98),y:clamp(num(b.y,50)/100,.02,.98),rotation:0,scale:1,source:'building'});known.add(String(b.id));}});
  const placed=G.production&&Array.isArray(G.production.placed)?G.production.placed:[];
  placed.forEach(p=>{const id='production_'+p.id;let o=G.mapObjects.find(x=>String(x.id)===id);if(!o){o={id,name:p.name||'Изделие мастерской',type:p.recipeId==='gardenTable'?'table':'bench',x:clamp(num(p.x)/100,.02,.98),y:clamp(num(p.y)/100,.02,.98),rotation:0,scale:1,source:'production'};G.mapObjects.push(o);}else{o.x=clamp(num(p.x)/100,.02,.98);o.y=clamp(num(p.y)/100,.02,.98);o.name=p.name||o.name;}});
  const plants=G.garden&&Array.isArray(G.garden.livingPlants)?G.garden.livingPlants:[];const activePlantIds=new Set();
  plants.filter(p=>p&&p.status!=='Удалено'&&p.mapX!==null&&p.mapX!==undefined&&p.mapY!==null&&p.mapY!==undefined).forEach(p=>{const id='plant_'+p.id;activePlantIds.add(id);let o=G.mapObjects.find(x=>String(x.id)===id);if(!o){o={id,name:p.name||p.species||'Растение',type:'tree',x:clamp(num(p.mapX)/100,.02,.98),y:clamp(num(p.mapY)/100,.02,.98),rotation:0,scale:.72,source:'ecology'};G.mapObjects.push(o);}else{o.x=clamp(num(p.mapX)/100,.02,.98);o.y=clamp(num(p.mapY)/100,.02,.98);o.scale=clamp(.35+num(p.growth)/100*.8,.35,1.15);}});
  G.mapObjects=G.mapObjects.filter(o=>o.source!=='ecology'||activePlantIds.has(String(o.id)));
 }
 function draw(){
  syncAuxiliaryObjects();
  if(!drag&&G.selected&&String(selected)!==String(G.selected))selected=String(G.selected);
  const rect=scene.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  W=rect.width;H=rect.height;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const out={pos:[],col:[]};meshes=[];const unit=Math.min(W,H)/120;
  G.mapObjects.forEach((o,i)=>{const t=TYPES[normalizeType(o.type)]||TYPES.shed;buildObject(out,o,i);meshes.push({id:o.id,x:o.x*W,y:o.y*H,r:Math.max(t.w,t.d)*unit*1.25+12});});
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,pBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(out.pos),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(pLoc);gl.vertexAttribPointer(pLoc,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,cBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(out.col),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(cLoc);gl.vertexAttribPointer(cLoc,4,gl.FLOAT,false,0,0);
  gl.drawArrays(gl.TRIANGLES,0,out.pos.length/2);
  if(selected){const o=G.mapObjects.find(x=>String(x.id)===String(selected));if(o){const x=o.x*W,y=o.y*H;const c=gl.createBuffer();const pts=[x-14,y-10,x+14,y-10,x+14,y+10,x-14,y+10];const p=[];for(let i=0;i<4;i++){p.push(pts[i*2]/W*2-1,1-pts[i*2+1]/H*2);};gl.bindBuffer(gl.ARRAY_BUFFER,c);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(p),gl.STREAM_DRAW);gl.vertexAttribPointer(pLoc,2,gl.FLOAT,false,0,0);gl.disableVertexAttribArray(cLoc);gl.vertexAttrib4f(cLoc,1,.82,.25,1);gl.drawArrays(gl.LINE_LOOP,0,4);gl.deleteBuffer(c);}
  }
 }
 function pick(x,y){let best=null,dist=1e9;meshes.forEach(m=>{const d=Math.hypot(m.x-x,m.y-y);if(d<m.r&&d<dist){best=m.id;dist=d;}});return best;}
 function syncObject(o){if(!G.objects[o.id])G.objects[o.id]={name:o.name,condition:'Создан на карте',state:0,cost:null,type:o.type};}
 function setSelected(id){selected=id||null;if(id){G.selected=String(id);syncObject(G.mapObjects.find(o=>String(o.id)===String(id))||{id,name:id,type:'shed'});}if(typeof window.renderObject==='function')window.renderObject();if(typeof window.renderScene==='function')window.renderScene();draw();save();}
 function openObjectEditor(id){const o=G.mapObjects.find(x=>String(x.id)===String(id));if(!o)return false;const types=Object.entries(TYPES).map(([key,t])=>'<option value="'+key+'"'+(key===o.type?' selected':'')+'>'+t.label+'</option>').join('');const html='<h2>Параметры объекта</h2><label class="field">Название<input id="uilemMapObjectName" value="'+String(o.name||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))+'"></label><label class="field">Тип объекта<select id="uilemMapObjectType">'+types+'</select></label><div class="actions"><button onclick="closeModal()">Отмена</button><button onclick="ilemSaveMapObject(\''+String(o.id).replace(/'/g,'&#39;')+'\')">Сохранить</button></div>';if(typeof window.modal==='function')window.modal(html);else if(typeof modal==='function')modal(html);return true;}
 function saveObjectEditor(id){const o=G.mapObjects.find(x=>String(x.id)===String(id));if(!o)return false;const name=document.getElementById('uilemMapObjectName'),type=document.getElementById('uilemMapObjectType');if(!name||!String(name.value).trim())return false;o.name=String(name.value).trim();o.type=normalizeType(type&&type.value||o.type);if(G.objects&&G.objects[o.id]){G.objects[o.id].name=o.name;G.objects[o.id].type=o.type;}const b=(G.buildings||[]).find(x=>String(x.id)===String(o.id));if(b){b.name=o.name;b.type=o.type;}save();if(typeof window.closeModal==='function')window.closeModal();if(typeof window.renderObject==='function')window.renderObject();draw();return true;}
 function addAt(x,y){
  const type=normalizeType($('uilemObjectType').value),id='map_'+Date.now()+'_'+Math.floor(Math.random()*1000),name=TYPES[type].label+' · '+(G.mapObjects.filter(o=>o.type===type).length+1);
  const o={id,name,type,x:clamp(x/W,.03,.97),y:clamp(y/H,.03,.97),rotation:0,scale:1,source:'player'};
  G.mapObjects.push(o);G.objects[id]={name,condition:'Размещён на карте',state:0,cost:null,type};
  if(!Array.isArray(G.buildings))G.buildings=[];
  G.buildings.push({id,name,type,x:o.x*100,y:o.y*100});
  if(!Array.isArray(G.tasks))G.tasks=[];
  G.tasks.push({id:Date.now()+1,title:'Подготовить проект и построить: '+name,person:G.people&&G.people[0]?G.people[0].name:'Не назначен',object:id,hours:8,status:'На согласовании',source:'Создание 3D-объекта на карте',priority:'Плановый',actions:[],purchases:[]});
  G.selected=id;selected=id;save();if(typeof window.render==='function')window.render();draw();
  if(typeof window.toast==='function')window.toast('3D-объект размещён. Создана связанная задача.');
 }
 canvas.addEventListener('pointerdown',e=>{
  const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,id=pick(x,y);
  if(mode==='place'){addAt(x,y);mode='select';return;}
  if(id){setSelected(id);if(mode==='move'){drag={id,pointer:e.pointerId};canvas.setPointerCapture(e.pointerId);}}
  else if(mode==='select'){selected=null;G.selected=null;if(typeof window.renderObject==='function')window.renderObject();draw();}
 });
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const r=canvas.getBoundingClientRect(),o=G.mapObjects.find(x=>String(x.id)===String(drag.id));if(!o)return;o.x=clamp((e.clientX-r.left)/W,.02,.98);o.y=clamp((e.clientY-r.top)/H,.02,.98);draw();});
 canvas.addEventListener('pointerup',()=>{if(drag){drag=null;save();}});
 canvas.addEventListener('pointercancel',()=>{drag=null;});
 tools.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.action){const o=G.mapObjects.find(x=>String(x.id)===String(selected));if(!o){if(typeof window.toast==='function')window.toast('Сначала выбери объект на карте.');return;}if(b.dataset.action==='rotate')o.rotation=(Number(o.rotation)||0)+15;if(b.dataset.action==='scaleUp')o.scale=clamp((Number(o.scale)||1)+.1,.4,2.5);if(b.dataset.action==='scaleDown')o.scale=clamp((Number(o.scale)||1)-.1,.4,2.5);if(b.dataset.action==='edit'){openObjectEditor(o.id);return;}save();draw();return;}mode=b.dataset.mode;if(mode==='place'&&typeof window.toast==='function')window.toast('Выбери свободное место на карте для размещения 3D-объекта.');}));
 window.addEventListener('resize',draw);
 const oldRender=window.render;
 if(typeof oldRender==='function'&&!oldRender.__uilem3d){const wrapped=function(){oldRender.apply(this,arguments);draw();};wrapped.__uilem3d=true;window.render=wrapped;}
 const oldRenderScene=window.renderScene;
 if(typeof oldRenderScene==='function'&&!oldRenderScene.__uilem3d){const wrapped=function(){oldRenderScene.apply(this,arguments);draw();};wrapped.__uilem3d=true;window.renderScene=wrapped;}
 draw();
 window.ilemSaveMapObject=saveObjectEditor;
 window.UilemWorld3D={draw,addAt,setMode:m=>{mode=m;},getObjects:()=>G.mapObjects,edit:openObjectEditor,version:'1.0-webgl'};
}
try{ensureData();install();}catch(e){console.error('U Ilem map/3D initialization failed:',e);}
})();