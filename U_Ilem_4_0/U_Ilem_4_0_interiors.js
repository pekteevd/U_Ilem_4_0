/* У Илем 4.0 — редактор внутренних планировок. */
(function(){
'use strict';
if(typeof G==='undefined'||!G||typeof save!=='function'){console.error('U Ilem 4.0 interiors: game state unavailable.');return;}
const ROOMS=[['common','Общее пространство','#e7dcc8'],['hall','Прихожая','#d9c7a7'],['corridor','Коридор','#d3c6b4'],['living','Гостиная','#dfc69e'],['bedroom','Спальня','#c9d6bd'],['guest','Гостевая комната','#c5d5d9'],['kitchen','Кухня','#e5d0a8'],['bathroom','Ванная','#bad2d6'],['shower','Душевая','#b7d8df'],['wc','Туалет','#c8d6d4'],['pantry','Кладовая','#cdbfa8'],['workshop','Мастерская','#d4bba2'],['boiler','Техническое помещение','#c5c4bc']].map(([id,name,color])=>({id,name,color}));
const ITEMS=[['bed','Кровать','🛏',24000,1,['bedroom','guest']],['sofa','Диван','🛋',21000,1,['living','guest','common']],['table','Стол','▤',8500,.65,['living','kitchen','guest','workshop','common']],['chair','Стул','🪑',2200,.3,['living','kitchen','guest','workshop','common']],['stove','Печь / плита','♨',18000,.8,['kitchen','living','workshop']],['sink','Мойка','▱',9000,.5,['kitchen','bathroom','workshop']],['shower','Душ','🚿',7000,.55,['bathroom','shower']],['toilet','Унитаз','▣',9500,.5,['wc','bathroom']],['wardrobe','Шкаф','▥',12000,.65,['bedroom','guest','hall','common']],['shelf','Стеллаж','▤',4500,.5,['pantry','workshop','living','common']],['workbench','Верстак','⚒',16000,1,['workshop']],['fridge','Холодильник','▯',26000,.55,['kitchen']],['desk','Рабочий стол','⌨',9000,.7,['bedroom','guest','workshop','common']],['dresser','Комод','▤',6500,.45,['bedroom','guest','living']],['lamp','Напольный светильник','💡',3000,.2,['living','bedroom','guest','common']]].map(([id,name,icon,price,area,rooms])=>({id,name,icon,price,area,rooms}));
const BASE={mainHouse:{name:'Родительский дом',width:6,height:4},guestA:{name:'Гостевой дом №1',width:5,height:3},guestB:{name:'Гостевой дом №2',width:5,height:3},bath:{name:'Баня',width:4,height:3}};
const COST={wallAdd:{cost:3900,hours:3.5,skill:2,label:'Устройство перегородки'},wallRemove:{cost:1600,hours:1.5,skill:1,label:'Демонтаж перегородки'},doorAdd:{cost:6800,hours:3.5,skill:3,label:'Монтаж межкомнатной двери'},doorClose:{cost:1800,hours:1,skill:2,label:'Закрытие дверного проёма'},entryMove:{cost:11000,hours:5,skill:3,label:'Перенос входной двери в пределах контура'},windowAdd:{cost:8900,hours:4,skill:3,label:'Устройство / перенос оконного проёма'},windowClose:{cost:2000,hours:1,skill:2,label:'Закрытие оконного проёма'}};
const ui={building:'mainHouse',cell:0,mode:'room',worker:'d',stockId:'',movingId:'',isoRotation:0};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=v=>Math.round(Number(v)||0).toLocaleString('ru-RU')+' ₽',room=id=>ROOMS.find(x=>x.id===id)||ROOMS[0],item=id=>ITEMS.find(x=>x.id===id);
function getBuildings(){const out=[];Object.keys(BASE).forEach(id=>{const o=G.objects&&G.objects[id],d=BASE[id];if(o)out.push({id,name:o.name||d.name,width:d.width,height:d.height,state:o.state,condition:o.condition});});(Array.isArray(G.buildings)?G.buildings:[]).forEach(b=>{if(!b||!b.id||!String(b.id).startsWith('custom_')||out.some(x=>x.id===b.id))return;const o=G.objects&&G.objects[b.id];if(!o)return;const d=b.type==='bath'?[4,3]:[5,3];out.push({id:b.id,name:o.name||b.name||'Постройка',width:d[0],height:d[1],state:o.state,condition:o.condition});});return out;}
function makePlan(id,b){return{width:b.width,height:b.height,cells:Array.from({length:b.width*b.height},()=>({type:'common',label:'Общее пространство'})),partitions:[],doors:[],outerDoor:null,windows:[],protectedEdges:[],stock:[],furniture:[],nextId:1,history:[],measurement:'Эскизная сетка без фактического масштаба',createdFrom:id};}
function ensurePlan(id,b){G.interiorPlans=G.interiorPlans&&typeof G.interiorPlans==='object'?G.interiorPlans:{};let p=G.interiorPlans[id];if(!p||typeof p!=='object')p=G.interiorPlans[id]=makePlan(id,b);p.width=Number(p.width)||b.width;p.height=Number(p.height)||b.height;const n=p.width*p.height;if(!Array.isArray(p.cells))p.cells=[];while(p.cells.length<n)p.cells.push({type:'common',label:'Общее пространство'});p.cells=p.cells.slice(0,n).map(c=>({type:room(c&&c.type).id,label:String(c&&c.label||room(c&&c.type).name).slice(0,48)}));for(const k of ['partitions','doors','windows','protectedEdges','stock','furniture','history'])if(!Array.isArray(p[k]))p[k]=[];if(!Number.isFinite(Number(p.nextId))||p.nextId<1)p.nextId=1;p.outerDoor=typeof p.outerDoor==='string'?p.outerDoor:null;return p;}
function building(){const a=getBuildings();return a.find(x=>x.id===ui.building)||a[0]||null;}
function plan(){const b=building();if(!b)return null;ui.building=b.id;return ensurePlan(b.id,b);}
getBuildings().forEach(b=>ensurePlan(b.id,b));G.gameVersion='4.0';save();
function selectedWorker(){return(G.people||[]).find(p=>String(p.id)===String(ui.worker))||(G.people||[])[0]||null;}
function charge(p,job){const person=selectedWorker();if(!person)return toast('Нет доступного участника для этой работы.');if(Number(person.skill)<job.skill)return toast('Нужен навык не ниже '+job.skill+'/5. Выбери другого исполнителя.');if(Number(person.hours)<job.hours)return toast('У участника недостаточно свободных часов в этом месяце.');if(Number(person.energy)<10)return toast('Участнику нужен отдых перед этой работой.');if(Number(G.cash)<job.cost)return toast('Недостаточно средств. Требуется '+rub(job.cost)+'.');G.cash=Number(G.cash)-job.cost;person.hours=Number(person.hours)-job.hours;person.energy=Math.max(0,Number(person.energy)-Math.ceil(job.hours*1.5));p.history.unshift({action:job.label,cost:job.cost,hours:job.hours,person:person.name,date:[G.day||1,G.month||1,G.year||1].join('.')});p.history=p.history.slice(0,30);if(typeof log==='function')log('Планировка: '+job.label+'. '+rub(job.cost)+', '+job.hours+' ч.');save();return true;}
function parseEdge(id,p){let m;if((m=/^v:(\d+):(\d+)$/.exec(id))){const x=+m[1],y=+m[2];return x>=0&&x<p.width-1&&y>=0&&y<p.height?{kind:'inner',axis:'v',x,y}:null;}if((m=/^h:(\d+):(\d+)$/.exec(id))){const x=+m[1],y=+m[2];return x>=0&&x<p.width&&y>=0&&y<p.height-1?{kind:'inner',axis:'h',x,y}:null;}if((m=/^([tblr]):(\d+)$/.exec(id))){const side=m[1],n=+m[2],max=side==='t'||side==='b'?p.width:p.height;return n>=0&&n<max?{kind:'outer',side,n}:null;}return null;}
function refresh(){save();if(G.tab==='interiors')render();else if(typeof window.render==='function')window.render();}
function toggleWall(id,p){const e=parseEdge(id,p);if(!e||e.kind!=='inner')return toast('Перегородку можно размещать только внутри контура.');if(p.protectedEdges.includes(id))return toast('Эта стена защищена как несущая. Изменение запрещено.');if(p.doors.includes(id))return toast('Сначала закрой дверной проём.');const exists=p.partitions.includes(id),job=exists?COST.wallRemove:COST.wallAdd;if(!charge(p,job))return;p.partitions=exists?p.partitions.filter(x=>x!==id):p.partitions.concat(id);refresh();}
function toggleDoor(id,p){const e=parseEdge(id,p);if(!e)return;if(e.kind==='outer'){if(p.outerDoor===id)return toast('Вход уже расположен здесь. Внешняя оболочка не меняется.');if(p.windows.includes(id))return toast('Сначала закрой окно в этом сегменте стены.');if(!charge(p,COST.entryMove))return;p.outerDoor=id;refresh();return;}if(p.protectedEdges.includes(id))return toast('В защищённой стене нельзя размещать дверь.');if(!p.partitions.includes(id)){const j={cost:COST.wallAdd.cost+COST.doorAdd.cost,hours:COST.wallAdd.hours+COST.doorAdd.hours,skill:3,label:'Перегородка с дверным проёмом'};if(!charge(p,j))return;p.partitions.push(id);p.doors.push(id);refresh();return;}const exists=p.doors.includes(id),job=exists?COST.doorClose:COST.doorAdd;if(!charge(p,job))return;p.doors=exists?p.doors.filter(x=>x!==id):p.doors.concat(id);refresh();}
function toggleWindow(id,p){const e=parseEdge(id,p);if(!e||e.kind!=='outer')return toast('Окна размещаются только во внешней стене.');if(p.outerDoor===id)return toast('Нельзя совместить окно и входную дверь в одном сегменте.');const exists=p.windows.includes(id),job=exists?COST.windowClose:COST.windowAdd;if(!charge(p,job))return;p.windows=exists?p.windows.filter(x=>x!==id):p.windows.concat(id);refresh();}
function toggleProtection(id,p){const e=parseEdge(id,p);if(!e||e.kind!=='inner')return toast('Защищённые линии отмечаются внутри плана.');if(!p.partitions.includes(id))return toast('Сначала добавь стену. Защищать можно только существующую перегородку.');p.protectedEdges=p.protectedEdges.includes(id)?p.protectedEdges.filter(x=>x!==id):p.protectedEdges.concat(id);if(typeof log==='function')log(p.protectedEdges.includes(id)?'Стена отмечена как несущая / защищённая.':'Защита внутренней стены снята.');refresh();}
function setRoom(i,type,name,p){if(!Number.isInteger(i)||i<0||i>=p.cells.length)return;const t=room(type);const occupied=p.furniture.filter(f=>Number(f.cell)===i);const incompatible=occupied.find(f=>!item(f.type)||!item(f.type).rooms.includes(t.id));if(incompatible)return toast('Сначала переставь или убери предмет «'+incompatible.name+'»: он не подходит новому назначению комнаты.');const area=occupied.reduce((sum,f)=>sum+((item(f.type)||{}).area||1),0);if(area>1.001)return toast('Для нового назначения здесь не хватает свободной площади.');p.cells[i]={type:t.id,label:String(name||t.name).trim().slice(0,48)||t.name};ui.cell=i;refresh();}
function usedArea(p,cell,except){return p.furniture.reduce((s,x)=>s+(Number(x.cell)===cell&&String(x.id)!==String(except)?((item(x.type)||{}).area||1):0),0);}
function canPlace(d,cell,p,except){if(!d||!p.cells[cell])return{ok:false,reason:'Ячейка не найдена.'};if(!d.rooms.includes(p.cells[cell].type))return{ok:false,reason:'Предмет не подходит для помещения «'+room(p.cells[cell].type).name+'».'};if(usedArea(p,cell,except)+d.area>1.001)return{ok:false,reason:'В этой ячейке недостаточно свободного места.'};return{ok:true};}
function buyFurniture(type,p){const d=item(type);if(!d)return;if(Number(G.cash)<d.price)return toast('Недостаточно средств для покупки.');G.cash=Number(G.cash)-d.price;p.stock.push({id:p.nextId++,type:d.id,name:d.name,price:d.price});if(typeof log==='function')log('Куплено для интерьера: '+d.name+' за '+rub(d.price)+'. На складе мебели.');refresh();toast('Мебель куплена и добавлена на склад интерьера.');}
function placeFurniture(id,cell,p){const stock=p.stock.find(x=>String(x.id)===String(id));if(!stock)return toast('Предмет не найден на складе.');const c=canPlace(item(stock.type),cell,p);if(!c.ok)return toast(c.reason);p.stock=p.stock.filter(x=>String(x.id)!==String(id));p.furniture.push({id:stock.id,type:stock.type,name:stock.name,cell,rotation:0});ui.stockId='';ui.mode='room';refresh();toast('Предмет размещён.');}
function moveFurniture(id,cell,p){const f=p.furniture.find(x=>String(x.id)===String(id));if(!f)return;const c=canPlace(item(f.type),cell,p,id);if(!c.ok)return toast(c.reason);f.cell=cell;ui.movingId='';ui.mode='room';refresh();toast('Мебель переставлена.');}
function removeFurniture(id,p){const f=p.furniture.find(x=>String(x.id)===String(id));if(!f)return;p.furniture=p.furniture.filter(x=>String(x.id)!==String(id));p.stock.push({id:f.id,type:f.type,name:f.name,price:0});refresh();toast('Предмет возвращён на склад интерьера.');}
const S=88;
function geom(id,p){const e=parseEdge(id,p);if(!e)return null;if(e.kind==='inner')return e.axis==='v'?{x1:(e.x+1)*S,y1:e.y*S,x2:(e.x+1)*S,y2:(e.y+1)*S}:{x1:e.x*S,y1:(e.y+1)*S,x2:(e.x+1)*S,y2:(e.y+1)*S};if(e.side==='t')return{x1:e.n*S,y1:0,x2:(e.n+1)*S,y2:0};if(e.side==='b')return{x1:e.n*S,y1:p.height*S,x2:(e.n+1)*S,y2:p.height*S};if(e.side==='l')return{x1:0,y1:e.n*S,x2:0,y2:(e.n+1)*S};return{x1:p.width*S,y1:e.n*S,x2:p.width*S,y2:(e.n+1)*S};}
const line=(a,b,c,d,cl,attrs)=>'<line x1="'+a+'" y1="'+b+'" x2="'+c+'" y2="'+d+'" class="'+cl+'" '+(attrs||'')+'/>';
function wall(id,p,outer){const g=geom(id,p);if(!g)return'';const door=outer?p.outerDoor===id:p.doors.includes(id),win=outer&&p.windows.includes(id),lock=p.protectedEdges.includes(id),v=g.x1===g.x2,mx=(g.x1+g.x2)/2,my=(g.y1+g.y2)/2,col=lock?'#a34032':outer?'#493d31':'#594735',sw=outer?9:7;let s=line(g.x1,g.y1,g.x2,g.y2,'u4i-wall','stroke="'+col+'" stroke-width="'+sw+'"');if(door||win){s+=line(mx-(v?0:17),my-(v?17:0),mx+(v?0:17),my+(v?17:0),'u4i-opening','stroke="#f6efdf" stroke-width="'+(sw+2)+'"');if(door)s+=line(mx,my,mx+(v?26:0),my+(v?0:-26),'u4i-door','stroke="#b77837" stroke-width="3"');if(win)s+=line(mx-(v?0:13),my-(v?13:0),mx+(v?0:13),my+(v?13:0),'u4i-window','stroke="#3d91ae" stroke-width="5"');}if(lock)s+='<text x="'+(mx+7)+'" y="'+(my-7)+'" class="u4i-lock">Н</text>';return s;}
function draw(p){const w=p.width*S,h=p.height*S;let s='<svg id="u4i-plan" viewBox="-16 -16 '+(w+32)+' '+(h+32)+'" role="img" aria-label="Эскиз плана">';p.cells.forEach((c,i)=>{const x=i%p.width,y=Math.floor(i/p.width),r=room(c.type);s+='<rect data-cell="'+i+'" x="'+(x*S+3)+'" y="'+(y*S+3)+'" width="'+(S-6)+'" height="'+(S-6)+'" rx="6" fill="'+r.color+'" class="u4i-cell'+(i===ui.cell?' selected':'')+'"/><text x="'+(x*S+S/2)+'" y="'+(y*S+34)+'" class="u4i-label">'+esc(c.label).slice(0,36)+'</text>';const fs=p.furniture.filter(f=>Number(f.cell)===i);if(fs.length)s+='<text x="'+(x*S+S/2)+'" y="'+(y*S+60)+'" class="u4i-items">'+fs.map(f=>(item(f.type)||{}).icon||'▪').join(' ')+'</text>';s+='<text x="'+(x*S+9)+'" y="'+(y*S+16)+'" class="u4i-index">'+(i+1)+'</text>';});for(let y=0;y<p.height;y++)for(let x=0;x<p.width-1;x++){const id='v:'+x+':'+y,g=geom(id,p);if(p.partitions.includes(id)||p.protectedEdges.includes(id))s+=wall(id,p,false);s+=line(g.x1,g.y1,g.x2,g.y2,'u4i-hit','data-edge="'+id+'"');}for(let y=0;y<p.height-1;y++)for(let x=0;x<p.width;x++){const id='h:'+x+':'+y,g=geom(id,p);if(p.partitions.includes(id)||p.protectedEdges.includes(id))s+=wall(id,p,false);s+=line(g.x1,g.y1,g.x2,g.y2,'u4i-hit','data-edge="'+id+'"');}for(let x=0;x<p.width;x++)for(const id of ['t:'+x,'b:'+x]){s+=wall(id,p,true);const g=geom(id,p);s+=line(g.x1,g.y1,g.x2,g.y2,'u4i-hit','data-edge="'+id+'"');}for(let y=0;y<p.height;y++)for(const id of ['l:'+y,'r:'+y]){s+=wall(id,p,true);const g=geom(id,p);s+=line(g.x1,g.y1,g.x2,g.y2,'u4i-hit','data-edge="'+id+'"');}return s+'</svg>';}
function drawIso(p){
 const sx=34,sy=18,wallUnit=42,margin=34,wallHeight=1.72;
 const rot=((Number(ui.isoRotation)||0)%4+4)%4;
 const rw=rot%2?p.height:p.width,rh=rot%2?p.width:p.height;
 const ox=rh*sx+margin,oy=margin+wallUnit*wallHeight+4;
 const viewW=(rw+rh)*sx+margin*2;
 const viewH=wallUnit*wallHeight+(rw+rh)*sy+margin*2+8;
 function rotate(x,y){
  if(rot===1)return[p.height-y,x];
  if(rot===2)return[p.width-x,p.height-y];
  if(rot===3)return[y,p.width-x];
  return[x,y];
 }
 function pt(x,y,z){
  const q=rotate(x,y);return[ox+(q[0]-q[1])*sx,oy+(q[0]+q[1])*sy-(z||0)*wallUnit];
 }
 const pts=a=>a.map(v=>v[0].toFixed(1)+','+v[1].toFixed(1)).join(' ');
 const poly=(a,fill,stroke,sw,opacity)=>'<polygon points="'+pts(a)+'" fill="'+fill+'" stroke="'+(stroke||'#8b795e')+'" stroke-width="'+(sw||1)+'"'+(opacity!=null?' opacity="'+opacity+'"':'')+'/>';
 const svgLine=(a,b,color,width)=>'<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'" stroke="'+color+'" stroke-width="'+(width||2)+'" stroke-linecap="round"/>';
 let out='<svg id="u4i-iso" viewBox="0 0 '+viewW+' '+viewH+'" role="img" aria-label="Объёмный изометрический предпросмотр интерьера">';
 out+='<rect x="0" y="0" width="'+viewW+'" height="'+viewH+'" rx="12" fill="#eee5d4"/>';
 const cells=[];
 for(let i=0;i<p.cells.length;i++)cells.push({i,x:i%p.width,y:Math.floor(i/p.width),cell:p.cells[i]});
 cells.sort((a,b)=>(a.x+a.y)-(b.x+b.y));
 cells.forEach(v=>{
  const r=room(v.cell.type),x=v.x,y=v.y;
  out+=poly([pt(x,y,0),pt(x+1,y,0),pt(x+1,y+1,0),pt(x,y+1,0)],r.color,'#b6a487',1);
  const c=pt(x+.5,y+.5,.04),label=esc(v.cell.label||r.name).slice(0,18);
  out+='<text x="'+c[0].toFixed(1)+'" y="'+c[1].toFixed(1)+'" text-anchor="middle" font-family="Arial" font-size="9" font-weight="600" fill="#493d2e">'+label+'</text>';
 });
 function edgeEnds(id){
  const e=parseEdge(id,p);if(!e)return null;
  if(e.kind==='inner')return e.axis==='v'?{a:[e.x+1,e.y],b:[e.x+1,e.y+1]}:{a:[e.x,e.y+1],b:[e.x+1,e.y+1]};
  if(e.side==='t')return{a:[e.n,0],b:[e.n+1,0]};
  if(e.side==='b')return{a:[e.n,p.height],b:[e.n+1,p.height]};
  if(e.side==='l')return{a:[0,e.n],b:[0,e.n+1]};
  return{a:[p.width,e.n],b:[p.width,e.n+1]};
 }
 function interp(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
 function wallPiece(a,b,z,id,outer,protectedWall){
  const p1=pt(a[0],a[1],0),p2=pt(b[0],b[1],0),p3=pt(b[0],b[1],z),p4=pt(a[0],a[1],z);
  const fill=protectedWall?'#ad6659':outer?'#7b6b58':'#9a8166';
  let s=poly([p1,p2,p3,p4],fill,'#514537',1.2);
  s+=svgLine(p4,p3,protectedWall?'#d73b31':'#d0b896',1.5);
  return s;
 }
 function drawWall(id,outer,front){
  const e=parseEdge(id,p),ends=edgeEnds(id);if(!e||!ends)return'';
  const door=outer?p.outerDoor===id:p.doors.includes(id);
  const win=outer&&p.windows.includes(id);
  const protectedWall=p.protectedEdges.includes(id);
  const height=front?.78:wallHeight;
  let s='';
  if(door){
   s+=wallPiece(ends.a,interp(ends.a,ends.b,.24),height,id,outer,protectedWall);
   s+=wallPiece(interp(ends.a,ends.b,.76),ends.b,height,id,outer,protectedWall);
   const a=pt(ends.a[0]+(ends.b[0]-ends.a[0])*.24,ends.a[1]+(ends.b[1]-ends.a[1])*.24,0);
   const b=pt(ends.a[0]+(ends.b[0]-ends.a[0])*.76,ends.a[1]+(ends.b[1]-ends.a[1])*.76,0);
   const topA=pt(ends.a[0]+(ends.b[0]-ends.a[0])*.24,ends.a[1]+(ends.b[1]-ends.a[1])*.24,Math.min(height,.95));
   const topB=pt(ends.a[0]+(ends.b[0]-ends.a[0])*.76,ends.a[1]+(ends.b[1]-ends.a[1])*.76,Math.min(height,.95));
   s+=svgLine(a,topA,'#a9753d',2)+svgLine(b,topB,'#a9753d',2)+svgLine(topA,topB,'#a9753d',2);
   s+=svgLine(a,pt(ends.a[0]+(ends.b[0]-ends.a[0])*.42,ends.a[1]+(ends.b[1]-ends.a[1])*.42,.06),'#b77a3c',2);
  }else{
   s+=wallPiece(ends.a,ends.b,height,id,outer,protectedWall);
  }
  if(win){
   const a=interp(ends.a,ends.b,.22),b=interp(ends.a,ends.b,.78);
   s+=poly([pt(a[0],a[1],.62),pt(b[0],b[1],.62),pt(b[0],b[1],1.28),pt(a[0],a[1],1.28)],'#83bfd0','#397c91',2,.93);
   s+=svgLine(pt(a[0],a[1],.62),pt(b[0],b[1],.62),'#d5f3f7',1.2);
  }
  return s;
 }
 // Far walls and partitions first; near walls remain lower so the room is visible.
 for(let x=0;x<p.width;x++)out+=drawWall('t:'+x,true,false);
 for(let y=0;y<p.height;y++)out+=drawWall('l:'+y,true,false);
 for(const id of p.partitions)out+=drawWall(id,false,false);
 // Compact furniture blocks, laid out separately when several items share a room.
 const visual={
  bed:{w:.68,d:.78,h:.30,c:'#b99278'},sofa:{w:.78,d:.56,h:.42,c:'#9f7865'},
  table:{w:.70,d:.58,h:.38,c:'#b78b53'},chair:{w:.30,d:.32,h:.48,c:'#9b7148'},
  stove:{w:.48,d:.48,h:.62,c:'#696b68'},sink:{w:.48,d:.36,h:.52,c:'#91b1b5'},
  shower:{w:.55,d:.55,h:.62,c:'#8cbac6'},toilet:{w:.34,d:.42,h:.40,c:'#deded7'},
  wardrobe:{w:.48,d:.38,h:1.22,c:'#8b6745'},shelf:{w:.46,d:.34,h:.94,c:'#a98555'},
  workbench:{w:.68,d:.48,h:.62,c:'#9b744b'},fridge:{w:.42,d:.42,h:1.28,c:'#aab8ba'},
  desk:{w:.60,d:.42,h:.48,c:'#a17a52'},dresser:{w:.52,d:.36,h:.62,c:'#a77b56'},
  lamp:{w:.18,d:.18,h:1.35,c:'#d0aa5d'}
 };
 const grouped={};
 p.furniture.forEach(f=>{const key=Number(f.cell);(grouped[key]||(grouped[key]=[])).push(f);});
 Object.keys(grouped).forEach(key=>{
  const list=grouped[key],cell=Number(key),cx=cell%p.width+.5,cy=Math.floor(cell/p.width)+.5;
  const offsets=list.length===1?[[0,0]]:list.length===2?[[-.18,-.1],[.18,.1]]:list.length===3?[[-.2,-.16],[.2,-.16],[0,.2]]:[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]];
  list.forEach((f,i)=>{
   const d=visual[f.type]||{w:.42,d:.42,h:.42,c:'#a58a69'},o=offsets[i]||[0,0];
   const x=cx+o[0]-d.w/2,y=cy+o[1]-d.d/2;
   const a=pt(x,y,.02),b=pt(x+d.w,y,.02),c=pt(x+d.w,y+d.d,.02),e=pt(x,y+d.d,.02);
   const at=pt(x,y,d.h),bt=pt(x+d.w,y,d.h),ct=pt(x+d.w,y+d.d,d.h),et=pt(x,y+d.d,d.h);
   out+=poly([b,c,ct,bt],d.c,'#6c5540',.8);
   out+=poly([e,c,ct,et],'#'+(d.c==='#deded7'?'c7c7c0':'806044'),'#6c5540',.8);
   out+=poly([at,bt,ct,et],d.c,'#594632',.9);
   const mid=pt(cx+o[0],cy+o[1],d.h+.08);
   out+='<text x="'+mid[0].toFixed(1)+'" y="'+mid[1].toFixed(1)+'" text-anchor="middle" font-family="Arial" font-size="10" fill="#34291f">'+esc((item(f.type)||{}).icon||'▪')+'</text>';
  });
 });
 // Near walls are deliberately cut down as a cutaway view.
 for(let x=0;x<p.width;x++)out+=drawWall('b:'+x,true,true);
 for(let y=0;y<p.height;y++)out+=drawWall('r:'+y,true,true);
 out+='<text x="'+(margin+7)+'" y="'+(viewH-12)+'" font-family="Arial" font-size="9" fill="#77684f">Изометрический эскиз · условные размеры · не строительный чертёж</text>';
 return out+'</svg>';
}
function render(){
 const w=document.getElementById('workspace');if(!w||G.tab!=='interiors')return;const bs=getBuildings();if(!bs.length){w.innerHTML='<p>Нет доступных зданий.</p>';return;}const b=bs.find(x=>x.id===ui.building)||bs[0];ui.building=b.id;const p=ensurePlan(b.id,b);ui.cell=Math.max(0,Math.min(p.cells.length-1,Number(ui.cell)||0));const c=p.cells[ui.cell];
 const roomOpts=ROOMS.map(x=>'<option value="'+x.id+'"'+(x.id===c.type?' selected':'')+'>'+esc(x.name)+'</option>').join(''),buildingOpts=bs.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===b.id?' selected':'')+'>'+esc(x.name)+'</option>').join('');
 const workerOpts=(G.people||[]).map(x=>'<option value="'+esc(x.id)+'"'+(String(x.id)===String(ui.worker)?' selected':'')+'>'+esc(x.name)+' · навык '+esc(x.skill)+'/5 · '+esc(x.hours)+' ч</option>').join('');
 const itemOpts=ITEMS.map(x=>'<option value="'+x.id+'">'+esc(x.name)+' · '+rub(x.price)+'</option>').join(''),stockOpts=p.stock.map(x=>'<option value="'+x.id+'"'+(String(x.id)===String(ui.stockId)?' selected':'')+'>'+esc(x.name)+'</option>').join('');
 const placed=p.furniture.map(x=>{const d=item(x.type);return '<div class="u4i-row"><span>'+(d?d.icon:'▪')+' <b>'+esc(x.name)+'</b><small>ячейка '+(Number(x.cell)+1)+'</small></span><span><button data-act="move" data-id="'+x.id+'">Переместить</button><button data-act="remove" data-id="'+x.id+'">Снять</button></span></div>';}).join('');
 const history=p.history.slice(0,5).map(x=>'<div class="u4i-history"><small>'+esc(x.date)+' · '+esc(x.person)+'</small><b>'+esc(x.action)+'</b><small>'+rub(x.cost)+' · '+esc(x.hours)+' ч</small></div>').join('');
 const hints={room:'Выбери ячейку, затем назначь назначение помещения.',partition:'Нажми на внутреннюю линию: построить или демонтировать перегородку.',door:'На внутренней стене создай / закрой дверь. На внешней стене перенеси вход.',window:'Нажми на сегмент внешней стены, чтобы добавить или закрыть окно.',protect:'Отметь существующую стену как несущую. После этого её нельзя демонтировать или прорезать.',furniture:'Выбери мебель со склада, затем нажми на помещение. Для перестановки используй кнопку у предмета.'};
 let html='<div class="u4i-wrap"><div class="u4i-head"><div><h3>Планировка и интерьер</h3><p class="muted">Редактирование внутреннего пространства независимо от внешней оболочки.</p></div><label class="u4i-field">Здание<select id="u4i-building">'+buildingOpts+'</select></label></div>';
 html+='<div class="u4i-warning"><b>Эскизная схема.</b> Клетки условные, это не обмер в метрах. Внешний контур фиксирован. Реальные несущие стены нужно отметить режимом «Защита» после обследования. Не используй схему как строительный чертёж до внесения фактических размеров и конструкций.</div>';
 html+='<div class="u4i-toolbar"><label class="u4i-field">Режим<select id="u4i-mode">';[['room','Назначение комнат'],['partition','Перегородки'],['door','Двери / вход'],['window','Окна'],['protect','Защита несущих стен'],['furniture','Мебель']].forEach(([id,n])=>{html+='<option value="'+id+'"'+(ui.mode===id?' selected':'')+'>'+n+'</option>';});
 html+='</select></label><label class="u4i-field">Исполнитель<select id="u4i-worker">'+workerOpts+'</select></label><div class="u4i-metrics"><span><b>'+p.width+' × '+p.height+'</b><small>условная сетка</small></span><span><b>'+p.partitions.length+'</b><small>перегородок</small></span><span><b>'+p.windows.length+'</b><small>окон</small></span><span><b>'+p.furniture.length+'</b><small>предметов</small></span></div></div>';
 html+='<div class="u4i-layout"><section class="u4i-planbox"><div class="u4i-caption"><b>'+esc(b.name)+'</b><span>'+esc(b.condition||'Состояние не оценено')+'</span></div>'+draw(p)+'<div class="u4i-hint">'+esc(hints[ui.mode]||hints.room)+'</div><div class="u4i-legend"><span>■ стена</span><span style="color:#b77837">━ дверь</span><span style="color:#3d91ae">━ окно</span><span style="color:#a34032">Н защищённая стена</span></div></section>';
 html+='<aside class="u4i-controls"><section class="u4i-card"><h4>Зона · ячейка '+(ui.cell+1)+'</h4><label class="u4i-field">Назначение<select id="u4i-room-type">'+roomOpts+'</select></label><label class="u4i-field">Название / уточнение<input id="u4i-room-name" maxlength="48" value="'+esc(c.label)+'"></label><button data-act="apply-room">Применить назначение</button></section>';
 html+='<section class="u4i-card"><h4>Мебель и оборудование</h4><label class="u4i-field">Каталог<select id="u4i-item-type">'+itemOpts+'</select></label><button data-act="buy">Купить на склад</button><label class="u4i-field">Предмет на складе<select id="u4i-stock"><option value="">Выбери предмет</option>'+stockOpts+'</select></label><button data-act="place-stock" '+(p.stock.length?'':'disabled')+'>Выбрать для размещения</button>';
 if(ui.movingId)html+='<p class="u4i-note">Нажми новую ячейку на схеме или отмени перестановку.</p><button data-act="cancel">Отменить перестановку</button>';
 html+='<h5>Размещённые предметы</h5>'+(placed||'<small>Мебель пока не размещена.</small>')+'</section><section class="u4i-card"><h4>Работы и стоимость</h4><div class="u4i-cost"><span>Перегородка</span><b>'+rub(COST.wallAdd.cost)+' · '+COST.wallAdd.hours+' ч</b></div><div class="u4i-cost"><span>Межкомнатная дверь</span><b>'+rub(COST.doorAdd.cost)+' · '+COST.doorAdd.hours+' ч</b></div><div class="u4i-cost"><span>Окно</span><b>'+rub(COST.windowAdd.cost)+' · '+COST.windowAdd.hours+' ч</b></div><p class="u4i-small">Расценки игровые, это не смета реальных работ.</p><h5>Последние операции</h5>'+(history||'<small>Операций пока нет.</small>')+'</section></aside></div>';
 html+='<section class="u4i-iso-box"><div class="u4i-iso-head"><div><b>Объёмный изометрический предпросмотр</b><small>Планировка, проёмы и расстановка мебели в четырёх направлениях обзора</small></div><div class="u4i-iso-buttons"><button type="button" data-iso-rotate="-1">↶ Повернуть</button><button type="button" data-iso-rotate="1">Повернуть ↻</button></div></div>'+drawIso(p)+'</section>';
 html+='<p class="u4i-small">Ограничения: наружные стены и площадь оболочки не перемещаются; защищённые стены нельзя демонтировать или прорезать; окна и двери размещаются только в допустимых сегментах; мебель проверяется по назначению комнаты и свободной площади ячейки.</p></div>';w.innerHTML=html;
}
function click(e){const p=plan();if(!p)return;const rotation=e.target.closest('[data-iso-rotate]');if(rotation){ui.isoRotation=((Number(ui.isoRotation)||0)+Number(rotation.dataset.isoRotate)+4)%4;render();return;}const b=e.target.closest('[data-act]');if(b){const a=b.dataset.act;if(a==='apply-room')setRoom(ui.cell,document.getElementById('u4i-room-type').value,document.getElementById('u4i-room-name').value,p);else if(a==='buy')buyFurniture(document.getElementById('u4i-item-type').value,p);else if(a==='place-stock'){ui.stockId=document.getElementById('u4i-stock').value;ui.movingId='';ui.mode='furniture';render();toast('Теперь выбери ячейку на схеме.');}else if(a==='move'){ui.movingId=b.dataset.id;ui.stockId='';ui.mode='furniture';render();toast('Выбери новую ячейку для мебели.');}else if(a==='remove')removeFurniture(b.dataset.id,p);else if(a==='cancel'){ui.movingId='';ui.stockId='';ui.mode='room';render();}return;}const edge=e.target.closest('[data-edge]');if(edge){if(ui.mode==='partition')toggleWall(edge.dataset.edge,p);else if(ui.mode==='door')toggleDoor(edge.dataset.edge,p);else if(ui.mode==='window')toggleWindow(edge.dataset.edge,p);else if(ui.mode==='protect')toggleProtection(edge.dataset.edge,p);else toast('Сначала выбери режим работы со стенами.');return;}const cell=e.target.closest('[data-cell]');if(cell){const i=Number(cell.dataset.cell);ui.cell=i;if(ui.mode==='furniture'&&ui.movingId)moveFurniture(ui.movingId,i,p);else if(ui.mode==='furniture'&&ui.stockId)placeFurniture(ui.stockId,i,p);else render();}}
function change(e){if(e.target.id==='u4i-building'){ui.building=e.target.value;ui.cell=0;ui.stockId='';ui.movingId='';render();}else if(e.target.id==='u4i-mode'){ui.mode=e.target.value;ui.stockId='';ui.movingId='';render();}else if(e.target.id==='u4i-worker')ui.worker=e.target.value;else if(e.target.id==='u4i-stock')ui.stockId=e.target.value;}
function styles(){if(document.getElementById('u4i-interior-style'))return;const s=document.createElement('style');s.id='u4i-interior-style';s.textContent=`
.u4i-wrap{display:grid;gap:12px}.u4i-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.u4i-head h3{margin:0 0 3px}.u4i-field{display:grid;gap:4px;font:12px Arial;color:#68583f;margin:6px 0;min-width:150px}.u4i-field select,.u4i-field input{width:100%;padding:8px;border:1px solid #b9a27c;border-radius:8px;background:#fffaf0;color:#322719}.u4i-warning{border:1px solid #d5b36f;background:#fff3d7;color:#6e4b1f;border-radius:10px;padding:10px 12px;font:12px/1.45 Arial}.u4i-toolbar{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;background:#f1e6ce;border:1px solid #d1bd98;border-radius:12px;padding:10px}.u4i-toolbar .u4i-field{min-width:180px}.u4i-metrics{display:flex;gap:14px;flex-wrap:wrap;margin-left:auto}.u4i-metrics span{display:grid;gap:2px;text-align:center;min-width:58px}.u4i-metrics b{font:bold 18px Arial;color:#4c3a27}.u4i-metrics small{font:10px Arial;color:#806c4e}.u4i-layout{display:grid;grid-template-columns:minmax(320px,1.15fr) minmax(290px,.85fr);gap:12px;align-items:start}.u4i-planbox,.u4i-card{background:#f7efde;border:1px solid #cdb992;border-radius:12px;padding:12px}.u4i-iso-box{background:#f7efde;border:1px solid #cdb992;border-radius:12px;padding:12px;display:grid;gap:8px}.u4i-iso-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font:13px Arial;color:#503c27}.u4i-iso-head small{display:block;font:10px Arial;color:#806c4e;margin-top:3px}.u4i-iso-buttons{display:flex;gap:6px}.u4i-iso-buttons button{font:11px Arial;padding:7px 10px}#u4i-iso{display:block;width:100%;max-height:620px;border:1px solid #d1c1a2;border-radius:10px;background:#eee5d4}.u4i-caption{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font:13px Arial;margin-bottom:8px}.u4i-caption span{font-size:11px;color:#78684d}#u4i-plan{display:block;width:100%;max-height:620px;background:#eee5d4;border:1px solid #d1c1a2;border-radius:10px}.u4i-cell{stroke:#b9a88a;stroke-width:1;cursor:pointer}.u4i-cell.selected{stroke:#b27c31;stroke-width:4}.u4i-label{font:11px Arial;fill:#3e3428;text-anchor:middle;pointer-events:none}.u4i-items{font:17px Arial;fill:#3d3023;text-anchor:middle;pointer-events:none}.u4i-index{font:9px Arial;fill:#85765d;pointer-events:none}.u4i-wall,.u4i-opening,.u4i-door,.u4i-window{pointer-events:none;stroke-linecap:square}.u4i-hit{stroke:transparent;stroke-width:22;pointer-events:stroke;cursor:pointer}.u4i-hit:hover{stroke:#c68b37;stroke-opacity:.25}.u4i-lock{font:bold 12px Arial;fill:#a34032;pointer-events:none}.u4i-hint{background:#e9dec7;border-radius:8px;padding:9px;margin-top:8px;font:12px/1.4 Arial;color:#594b35}.u4i-legend{display:flex;gap:12px;flex-wrap:wrap;font:10px Arial;color:#6f614a;margin-top:8px}.u4i-controls{display:grid;gap:10px}.u4i-card h4{margin:0 0 8px;color:#50351f;font-size:16px}.u4i-card h5{margin:10px 0 5px;color:#6b5130}.u4i-card button{font:11px Arial;padding:7px 9px;margin:3px}.u4i-card button:disabled{opacity:.45}.u4i-note{font:11px Arial;color:#795b2c;background:#f8e9c5;padding:7px;border-radius:7px}.u4i-row,.u4i-cost{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #e0d2b6;padding:5px 0;font:11px Arial}.u4i-row small{display:block;color:#85745a}.u4i-history{display:grid;gap:2px;border-bottom:1px solid #e0d2b6;padding:5px 0;font:10px Arial}.u4i-small{font:10px/1.45 Arial;color:#817258}@media(max-width:900px){.u4i-layout{grid-template-columns:1fr}.u4i-metrics{margin-left:0}}@media(max-width:560px){.u4i-planbox,.u4i-card{padding:8px}.u4i-toolbar .u4i-field{min-width:100%}.u4i-caption{display:grid}}
`;document.head.appendChild(s);}
styles();const tabs=document.getElementById('tabs');if(tabs&&!tabs.querySelector('[data-tab="interiors"]')){const b=document.createElement('button');b.type='button';b.dataset.tab='interiors';b.textContent='Планировки домов';tabs.appendChild(b);}
const workspace=document.getElementById('workspace');if(workspace&&!workspace.dataset.u4iBound){workspace.dataset.u4iBound='1';workspace.addEventListener('click',click);workspace.addEventListener('change',change);}
const original=window.renderWorkspace;window.renderWorkspace=function(){if(G.tab==='interiors'){render();return;}if(typeof original==='function')original();};
window.UilemInteriors={render,getPlan:()=>plan(),togglePartition:id=>toggleWall(id,plan()),toggleDoor:id=>toggleDoor(id,plan()),toggleWindow:id=>toggleWindow(id,plan()),toggleProtected:id=>toggleProtection(id,plan()),setRoom:(i,t,n)=>setRoom(i,t,n,plan()),buyFurniture:t=>buyFurniture(t,plan()),placeFurniture:(id,i)=>placeFurniture(id,i,plan()),moveFurniture:(id,i)=>moveFurniture(id,i,plan()),removeFurniture:id=>removeFurniture(id,plan()),parseEdge:id=>parseEdge(id,plan()),drawIso:(p)=>drawIso(p||plan()),rotateIso:step=>{ui.isoRotation=((Number(ui.isoRotation)||0)+Number(step||1)+4)%4;render();}};
save();if(G.tab==='interiors')render();
})();
