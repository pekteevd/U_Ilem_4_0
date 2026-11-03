/* У Илем 4.0 — мастерская и хозяйственное производство. */
(function(){
'use strict';
if(typeof G==='undefined'||!G||typeof save!=='function'){
 console.error('U Ilem 4.0 production: game state unavailable.');
 return;
}
const RECIPES=[
 {id:'chair',name:'Стул деревянный',icon:'🪑',kind:'interior',targetType:'chair',hours:2,skill:2,cash:120,tools:['Молоток','Шуруповёрт'],materials:[['Доска',3],['Брус',1],['Крепёж',2]],desc:'Простой стул для кухни, гостевой комнаты или мастерской.'},
 {id:'table',name:'Стол деревянный',icon:'▤',kind:'interior',targetType:'table',hours:4.5,skill:3,cash:350,tools:['Молоток','Шуруповёрт'],materials:[['Доска',6],['Брус',2],['Крепёж',3]],desc:'Надёжный стол для дома, мастерской или гостевой комнаты.'},
 {id:'shelf',name:'Стеллаж',icon:'▥',kind:'interior',targetType:'shelf',hours:3,skill:2,cash:180,tools:['Молоток','Шуруповёрт'],materials:[['Доска',4],['Брус',2],['Крепёж',2]],desc:'Полки для кладовой, мастерской или жилого помещения.'},
 {id:'workbench',name:'Верстак',icon:'⚒',kind:'interior',targetType:'workbench',hours:5,skill:3,cash:500,tools:['Молоток','Шуруповёрт'],materials:[['Доска',8],['Брус',3],['Крепёж',4]],desc:'Рабочее место для дальнейших производственных задач.'},
 {id:'bench',name:'Садовая скамья',icon:'🪑',kind:'outdoor',hours:4,skill:3,cash:260,tools:['Молоток','Шуруповёрт'],materials:[['Доска',7],['Брус',2],['Крепёж',3],['Пропитка для древесины',0.5]],desc:'Уличная скамья для дорожки, сада или костровой зоны.'},
 {id:'flowerBox',name:'Цветочный ящик',icon:'🌼',kind:'outdoor',hours:1.5,skill:2,cash:90,tools:['Молоток','Шуруповёрт'],materials:[['Доска',3],['Брус',1],['Крепёж',1],['Краска',0.25]],desc:'Небольшой деревянный короб для цветов и рассады.'},
 {id:'firewoodRack',name:'Дровница',icon:'🪵',kind:'outdoor',hours:3.5,skill:2,cash:190,tools:['Молоток','Шуруповёрт'],materials:[['Доска',5],['Брус',3],['Крепёж',3],['Пропитка для древесины',0.5]],desc:'Открытая стойка для хранения дров под навесом.'},
 {id:'planter',name:'Кашпо деревянное',icon:'🪴',kind:'outdoor',hours:2,skill:2,cash:130,tools:['Молоток','Шуруповёрт'],materials:[['Доска',4],['Брус',1],['Крепёж',2],['Пропитка для древесины',0.25]],desc:'Деревянное кашпо для размещения на территории.'},
 {id:'birdhouse',name:'Скворечник',icon:'🐦',kind:'outdoor',hours:1.25,skill:2,cash:70,tools:['Молоток','Шуруповёрт'],materials:[['Доска',2],['Брус',1],['Крепёж',1]],desc:'Небольшой домик для птиц. Место установки выбирается на карте.'},
 {id:'gardenTable',name:'Садовый стол',icon:'🪵',kind:'outdoor',hours:4.5,skill:3,cash:320,tools:['Молоток','Шуруповёрт'],materials:[['Доска',6],['Брус',2],['Крепёж',3],['Пропитка для древесины',0.5]],desc:'Стол для террасы, сада или общей площадки.'}
];
const ui={worker:'a',interiorBuilding:'mainHouse',pendingPlacement:null};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const rub=v=>Math.round(num(v)).toLocaleString('ru-RU')+' ₽';
const date=()=>[num(G.day,1),num(G.month,1),num(G.year,1)].join('.');
function addResource(name,unit,price){
 if(!Array.isArray(G.inventory))G.inventory=[];
 let item=G.inventory.find(x=>String(x.name).toLowerCase()===name.toLowerCase());
 if(!item){
  const id=G.inventory.reduce((m,x)=>Math.max(m,num(x.id)),0)+1;
  item={id,name,unit,qty:0,price,cat:'materials',reserved:0,used:0};
  G.inventory.push(item);
 }else{
  if(!item.unit)item.unit=unit;
  if(!Number.isFinite(Number(item.qty)))item.qty=0;
  if(!Number.isFinite(Number(item.price))||Number(item.price)<=0)item.price=price;
  if(!item.cat)item.cat='materials';
  if(item.reserved===undefined)item.reserved=0;
  if(item.used===undefined)item.used=0;
 }
 return item;
}
function ensure(){
 if(!G.production||typeof G.production!=='object')G.production={version:1,stock:[],placed:[],history:[],nextId:1,totalCrafted:0};
 const p=G.production;
 if(!Array.isArray(p.stock))p.stock=[];
 if(!Array.isArray(p.placed))p.placed=[];
 if(!Array.isArray(p.history))p.history=[];
 if(!Number.isFinite(Number(p.nextId))||p.nextId<1)p.nextId=1;
 p.totalCrafted=Math.max(0,num(p.totalCrafted));
 addResource('Крепёж','уп.',220);
 addResource('Пропитка для древесины','л',550);
}
function person(){
 return(G.people||[]).find(p=>String(p.id)===String(ui.worker))||
       (G.people||[]).find(p=>p.id==='a')||(G.people||[])[0]||null;
}
function recipe(id){return RECIPES.find(x=>x.id===id)||null;}
function available(item){return Math.max(0,num(item&&item.qty)-num(item&&item.reserved));}
function inventoryItem(name){return(G.inventory||[]).find(x=>String(x.name).toLowerCase()===name.toLowerCase())||null;}
function say(message){if(typeof toast==='function')toast(message);}
function record(message){
 if(typeof log==='function')log(message);
 G.production.history.unshift({date:date(),text:message});
 G.production.history=G.production.history.slice(0,40);
}
function refresh(){
 save();
 renderMap();
 if(G.tab==='production')render();
 else if(typeof window.render==='function')window.render();
}
function preflight(r,p){
 if(!p)return'Нет доступного исполнителя.';
 if(num(p.skill)<r.skill)return'Для этой работы нужен навык не ниже '+r.skill+'/5.';
 if(num(p.hours)<r.hours)return'Недостаточно свободных часов у '+p.name+'.';
 if(num(p.energy)<10)return'Участнику нужен отдых.';
 if(num(G.cash)<r.cash)return'Недостаточно свободных денег. Дополнительные расходы: '+rub(r.cash)+'.';
 for(const tool of r.tools){
  const t=inventoryItem(tool);
  if(!t||available(t)<1)return'Для работы нужен инструмент: '+tool+'. Проверь склад.';
 }
 for(const pair of r.materials){
  const it=inventoryItem(pair[0]),qty=Number(pair[1]);
  if(!it||available(it)+1e-9<qty){
   const have=it?available(it):0;
   return'Не хватает материала «'+pair[0]+'»: нужно '+qty+', доступно '+have+'.';
  }
 }
 return'';
}
function craft(id){
 ensure();
 const r=recipe(id);if(!r)return false;
 const p=person(),error=preflight(r,p);
 if(error){say(error);return false;}
 const deductions=[];
 for(const pair of r.materials){
  const it=inventoryItem(pair[0]),qty=Number(pair[1]);
  deductions.push({item:it,qty});
 }
 // All requirements were checked before any resource or time is changed.
 deductions.forEach(x=>{x.item.qty=Math.max(0,num(x.item.qty)-x.qty);});
 G.cash=num(G.cash)-r.cash;
 p.hours=num(p.hours)-r.hours;
 p.energy=Math.max(0,num(p.energy)-Math.ceil(r.hours*1.4));
 const good={id:G.production.nextId++,recipeId:r.id,type:r.targetType||r.id,name:r.name,icon:r.icon,kind:r.kind,createdAt:date(),maker:p.name};
 G.production.stock.push(good);
 G.production.totalCrafted++;
 record(p.name+' изготовил: '+r.name+'. Материалы списаны, работа '+r.hours+' ч, расходы '+rub(r.cash)+'.');
 refresh();say('Готовое изделие добавлено на склад мастерской.');
 return true;
}
function interiorBuildings(){
 const plans=G.interiorPlans&&typeof G.interiorPlans==='object'?G.interiorPlans:{};
 return Object.keys(plans).map(id=>({id,name:(G.objects&&G.objects[id]&&G.objects[id].name)||id}));
}
function transferToInterior(stockId,buildingId){
 ensure();
 const goods=G.production.stock.find(x=>String(x.id)===String(stockId));
 if(!goods)return false;
 const r=recipe(goods.recipeId);
 if(!r||r.kind!=='interior')return say('Это изделие предназначено для размещения на территории, а не в помещении.'),false;
 if(!window.UilemInteriors||typeof window.UilemInteriors.receiveCraftedFurniture!=='function'){
  say('Редактор интерьеров не готов принять изделие. Перезапусти игру и проверь модуль интерьеров.');
  return false;
 }
 const target=buildingId||ui.interiorBuilding;
 const ok=window.UilemInteriors.receiveCraftedFurniture(goods.type,target,goods.name);
 if(!ok){say('Не удалось передать изделие в интерьер.');return false;}
 G.production.stock=G.production.stock.filter(x=>String(x.id)!==String(stockId));
 record('Передано в интерьер: '+goods.name+' · '+((G.objects&&G.objects[target]&&G.objects[target].name)||target)+'.');
 save();render();say('Изделие передано на внутренний склад здания.');
 return true;
}
function startPlacement(stockId){
 ensure();
 const goods=G.production.stock.find(x=>String(x.id)===String(stockId));
 if(!goods)return false;
 const r=recipe(goods.recipeId);
 if(!r||r.kind!=='outdoor'){say('Эту мебель нужно передать в интерьер.');return false;}
 // Placement modes are mutually exclusive: one map click must place exactly one object.
 if(window.UilemEcology&&typeof window.UilemEcology.cancelLocate==='function')window.UilemEcology.cancelLocate(true);
 if(G.lighting&&G.lighting.pending!==null&&G.lighting.pending!==undefined){
  G.lighting.pending=null;
  const scene=document.getElementById('scene');
  if(scene)scene.classList.remove('placing');
 }
 ui.pendingPlacement=goods.id;
 const scene=document.getElementById('scene');
 if(scene)scene.classList.add('u4p-placement-active');
 say('Выбери свободную точку на карте для установки: '+goods.name+'.');
 return true;
}
function placeAt(x,y){
 ensure();
 const id=ui.pendingPlacement;
 if(id===null||id===undefined)return false;
 const goods=G.production.stock.find(x=>String(x.id)===String(id));
 if(!goods){ui.pendingPlacement=null;renderMap();return false;}
 const px=Math.max(2,Math.min(98,num(x))),py=Math.max(3,Math.min(96,num(y)));
 const close=G.production.placed.find(x=>Math.hypot(num(x.x)-px,num(x.y)-py)<4.2);
 if(close){say('Слишком близко к объекту «'+close.name+'». Выбери другое место.');return false;}
 G.production.placed.push({id:G.production.nextId++,recipeId:goods.recipeId,type:goods.type,name:goods.name,icon:goods.icon,x:px,y:py,placedAt:date()});
 G.production.stock=G.production.stock.filter(x=>String(x.id)!==String(id));
 ui.pendingPlacement=null;
 const scene=document.getElementById('scene');
 if(scene)scene.classList.remove('u4p-placement-active');
 record('На территории установлено: '+goods.name+'.');
 save();renderMap();render();
 say(goods.name+' размещён на территории.');
 return true;
}
function mapClick(e){
 if(ui.pendingPlacement===null||ui.pendingPlacement===undefined)return;
 if(e.target&&typeof e.target.closest==='function'&&e.target.closest('.hotspot'))return;
 const scene=document.getElementById('scene');
 if(!scene)return;
 const rect=scene.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 placeAt((e.clientX-rect.left)/rect.width*100,(e.clientY-rect.top)/rect.height*100);
}
function cancelPlacement(silent=false){
 if(!G.production)return;
 ui.pendingPlacement=null;
 const scene=document.getElementById('scene');
 if(scene)scene.classList.remove('u4p-placement-active');
 renderMap();if(!silent)say('Размещение отменено.');
}
function removePlaced(id){
 ensure();
 const item=G.production.placed.find(x=>String(x.id)===String(id));
 if(!item)return false;
 G.production.placed=G.production.placed.filter(x=>String(x.id)!==String(id));
 G.production.stock.push({id:G.production.nextId++,recipeId:item.recipeId,type:item.type,name:item.name,icon:item.icon,kind:'outdoor',createdAt:item.placedAt,maker:'Возвращено с территории'});
 record('С территории снято и возвращено на склад: '+item.name+'.');
 save();renderMap();render();say('Изделие возвращено на склад мастерской.');
 return true;
}
function renderMap(){
 const scene=document.getElementById('scene');if(!scene)return;
 let layer=scene.querySelector('.u4p-map-layer');
 if(!layer){layer=document.createElement('div');layer.className='u4p-map-layer';scene.appendChild(layer);}
 layer.innerHTML=G.production.placed.map(x=>'<span class="u4p-map-item" style="left:'+num(x.x)+'%;top:'+num(x.y)+'%" title="'+esc(x.name)+'"><b>'+esc(x.icon)+'</b><small>'+esc(x.name)+'</small></span>').join('');
 scene.classList.toggle('u4p-placement-active',ui.pendingPlacement!==null);
}
function render(){
 const w=document.getElementById('workspace');if(!w||G.tab!=='production')return;
 ensure();
 const people=(G.people||[]).map(p=>'<option value="'+esc(p.id)+'"'+(String(p.id)===String(ui.worker)?' selected':'')+'>'+esc(p.name)+' · навык '+esc(p.skill)+'/5 · '+esc(p.hours)+' ч</option>').join('');
 const buildings=interiorBuildings();
 if(!buildings.some(x=>x.id===ui.interiorBuilding)&&buildings.length)ui.interiorBuilding=buildings[0].id;
 const buildingOptions=buildings.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===ui.interiorBuilding?' selected':'')+'>'+esc(x.name)+'</option>').join('');
 const cards=RECIPES.map(r=>{
  const materials=r.materials.map(m=>{
   const it=inventoryItem(m[0]),have=it?available(it):0;
   return'<span>'+esc(m[0])+': '+esc(m[1])+' '+esc(it?it.unit:'')+' <small>· есть '+esc(have)+'</small></span>';
  }).join('');
  return'<article class="u4p-recipe"><div class="u4p-recipe-head"><span>'+r.icon+'</span><div><b>'+esc(r.name)+'</b><small>'+(r.kind==='interior'?'Для интерьера':'Для территории')+' · '+r.hours+' ч · навык '+r.skill+'/5</small></div></div><p>'+esc(r.desc)+'</p><div class="u4p-materials">'+materials+'</div><div class="u4p-recipe-foot"><span>Дополнительные расходы: '+rub(r.cash)+'</span><button data-prod-act="craft" data-id="'+r.id+'">Изготовить</button></div></article>';
 }).join('');
 const stock=G.production.stock.map(x=>{
  const r=recipe(x.recipeId);
  const actions=r&&r.kind==='interior'
   ?'<button data-prod-act="transfer" data-id="'+x.id+'">Передать в интерьер</button>'
   :'<button data-prod-act="place" data-id="'+x.id+'">Установить на карте</button>';
  return'<div class="u4p-stock-row"><span><b>'+esc(x.icon)+' '+esc(x.name)+'</b><small>Изготовлено '+esc(x.createdAt)+' · '+esc(x.maker||'Мастерская')+'</small></span><span>'+actions+'</span></div>';
 }).join('');
 const placed=G.production.placed.map(x=>'<div class="u4p-stock-row"><span><b>'+esc(x.icon)+' '+esc(x.name)+'</b><small>Координаты карты: '+Math.round(num(x.x))+'%, '+Math.round(num(x.y))+'%</small></span><button data-prod-act="remove-placed" data-id="'+x.id+'">Снять на склад</button></div>').join('');
 const history=G.production.history.slice(0,8).map(x=>'<div class="u4p-history"><small>'+esc(x.date)+'</small><span>'+esc(x.text)+'</span></div>').join('');
 let html='<div class="u4p-wrap"><div class="u4p-head"><div><h3>Мастерская и производство</h3><p class="muted">Изготавливай мебель и полезные вещи из материалов со склада. Работа расходует время, энергию, навык и деньги.</p></div><label class="u4p-field">Исполнитель<select id="u4p-worker">'+people+'</select></label></div>';
 html+='<div class="u4p-warning">Материалы списываются только после проверки всех требований. Молоток и шуруповёрт остаются инструментами и не расходуются. Изделия для дома можно передать во внутренний склад здания; уличные предметы устанавливаются кликом по карте.</div>';
 html+='<div class="u4p-metrics"><span><b>'+G.production.totalCrafted+'</b><small>изготовлено всего</small></span><span><b>'+G.production.stock.length+'</b><small>готовых изделий</small></span><span><b>'+G.production.placed.length+'</b><small>на территории</small></span><span><b>'+rub(G.cash)+'</b><small>свободные деньги</small></span></div>';
 html+='<h4>Каталог мастерской</h4><div class="u4p-catalog">'+cards+'</div>';
 html+='<h4>Готовые изделия</h4>'+(stock||'<p class="muted">Пока нет готовых изделий. Выбери рецепт и изготовь первый предмет.</p>');
 html+='<h4>Размещение на территории</h4>'+(placed||'<p class="muted">Уличные изделия пока не установлены.</p>');
 if(buildings.length)html+='<div class="u4p-transfer"><label class="u4p-field">Здание для передачи мебели<select id="u4p-building">'+buildingOptions+'</select></label><small>Мебель со склада мастерской можно передать во внутренний склад выбранного здания, а затем разместить в редакторе планировки.</small></div>';
 html+='<h4>Последние операции</h4>'+(history||'<p class="muted">История мастерской пока пуста.</p>');
 html+='<p class="u4p-note">Размещение уличных изделий пока отображается маркерами на иллюстрированной карте. Это рабочая игровая привязка и координатный слой, а не полноценные 3D-модели предметов. Геометрия утверждённой карты не меняется.</p></div>';
 w.innerHTML=html;
}
function click(e){
 const b=e.target.closest('[data-prod-act]');if(!b)return;
 const a=b.dataset.prodAct,id=b.dataset.id;
 if(a==='craft')craft(id);
 else if(a==='transfer')transferToInterior(id,document.getElementById('u4p-building')?.value||ui.interiorBuilding);
 else if(a==='place')startPlacement(id);
 else if(a==='remove-placed')removePlaced(id);
}
function change(e){
 if(e.target.id==='u4p-worker')ui.worker=e.target.value;
 else if(e.target.id==='u4p-building')ui.interiorBuilding=e.target.value;
}
function styles(){
 if(document.getElementById('u4p-style'))return;
 const s=document.createElement('style');s.id='u4p-style';s.textContent=[
 '.u4p-wrap{display:grid;gap:12px}.u4p-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.u4p-head h3{margin:0 0 4px}.u4p-field{display:grid;gap:4px;font:12px Arial;color:#68583f;min-width:190px}.u4p-field select{padding:8px;border:1px solid #b9a27c;border-radius:8px;background:#fffaf0;color:#322719}.u4p-warning{background:#fff3d7;color:#6e4b1f;border:1px solid #d5b36f;border-radius:10px;padding:10px;font:12px/1.45 Arial}.u4p-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.u4p-metrics span{display:grid;gap:3px;background:#f8f0df;border:1px solid #d4c29e;border-radius:9px;padding:10px}.u4p-metrics small{font:10px Arial;color:#806c4e}.u4p-metrics b{font:bold 16px Arial;color:#4c3a27}.u4p-catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}.u4p-recipe{display:grid;gap:7px;background:#f8f0df;border:1px solid #d4c29e;border-radius:10px;padding:11px}.u4p-recipe-head{display:flex;align-items:center;gap:9px}.u4p-recipe-head>span{font-size:24px}.u4p-recipe-head div{display:grid;gap:2px}.u4p-recipe-head small{font:10px Arial;color:#806c4e}.u4p-recipe p{font:11px/1.4 Arial;color:#806c4e;margin:0;min-height:30px}.u4p-materials{display:grid;gap:3px;font:10px Arial;color:#62553f}.u4p-materials small{color:#8b785a}.u4p-recipe-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font:10px Arial;color:#6d5939}.u4p-recipe-foot button,.u4p-stock-row button{font:11px Arial;padding:7px 9px}.u4p-stock-row{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #dfd1b5;font:12px Arial}.u4p-stock-row small{display:block;color:#806c4e;font:10px Arial;margin-top:3px}.u4p-history{display:grid;grid-template-columns:90px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid #dfd1b5;font:10px Arial;color:#74664f}.u4p-transfer{display:flex;gap:12px;align-items:end;flex-wrap:wrap;background:#f1e6ce;border-radius:10px;padding:10px}.u4p-transfer small{font:10px/1.4 Arial;color:#77684f;max-width:520px}.u4p-note{font:10px/1.45 Arial;color:#817258}.u4p-map-layer{position:absolute;inset:0;z-index:9;pointer-events:none}.u4p-map-item{position:absolute;transform:translate(-50%,-50%);display:grid;justify-items:center;gap:2px;padding:3px 6px;border:1px solid #e3c78e;border-radius:8px;background:#30271ddd;color:#fff1cf;box-shadow:0 2px 7px #0006;white-space:nowrap}.u4p-map-item b{font-size:19px;line-height:1.1}.u4p-map-item small{font:9px Arial}.u4p-placement-active{outline:3px solid #d7b56f;outline-offset:-3px;cursor:crosshair!important}@media(max-width:650px){.u4p-metrics{grid-template-columns:repeat(2,1fr)}.u4p-stock-row{align-items:flex-start;flex-direction:column}}'
 ].join('');document.head.appendChild(s);
}
ensure();styles();
const tabs=document.getElementById('tabs');
if(tabs&&!tabs.querySelector('[data-tab="production"]')){
 const b=document.createElement('button');b.type='button';b.dataset.tab='production';b.textContent='Мастерская';
 b.addEventListener('click',()=>{if(typeof setTab==='function')setTab('production');else{G.tab='production';render();}});
 tabs.appendChild(b);
}
const workspace=document.getElementById('workspace');
if(workspace&&!workspace.dataset.u4pBound){workspace.dataset.u4pBound='1';workspace.addEventListener('click',click);workspace.addEventListener('change',change);}
const scene=document.getElementById('scene');
if(scene&&!scene.dataset.u4pBound){scene.dataset.u4pBound='1';scene.addEventListener('click',mapClick);scene.dataset.u4pBound='1';}
const oldWorkspace=window.renderWorkspace;
window.renderWorkspace=function(){
 if(G.tab==='production'){
  if(typeof document.querySelectorAll==='function')document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab==='production'));
  render();return;
 }
 if(typeof oldWorkspace==='function')oldWorkspace();
};
const oldRender=window.render;
if(typeof oldRender==='function'&&!window.__uilemProductionRenderWrapped){
 window.__uilemProductionRenderWrapped=true;
 window.render=function(){oldRender();renderMap();};
}
const oldScene=window.renderScene;
if(typeof oldScene==='function'&&!window.__uilemProductionSceneWrapped){
 window.__uilemProductionSceneWrapped=true;
 window.renderScene=function(){oldScene();renderMap();};
}
window.UilemProduction={
 catalog:RECIPES,render,craft,transferToInterior,startPlacement,placeAt,cancelPlacement,removePlaced,
 getState:()=>G.production,
 setWorker:id=>{ui.worker=id;},
 renderMap
};
save();renderMap();if(G.tab==='production')render();
})();