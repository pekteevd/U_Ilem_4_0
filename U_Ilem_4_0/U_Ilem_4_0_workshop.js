/* У Илем 4.0 — мастерская, распил и производство предметов. */
(function(){
'use strict';
if(typeof G==='undefined'||!G||typeof save!=='function')return;
const BUY=[
 {id:'log',name:'Бревно',unit:'шт',price:850,cat:'materials'},
 {id:'nails',name:'Гвозди',unit:'шт',price:5,cat:'materials'},
 {id:'axe',name:'Топор',unit:'шт',price:1900,cat:'tools'},
 {id:'sawmill',name:'Пилорама',unit:'шт',price:58000,cat:'equipment'}
];
const OUTPUTS=[
 ['Дрова','шт','fuel'],['Обрезки','кг','materials'],['Стол','шт','furniture'],
 ['Стул','шт','furniture'],['Стеллаж','шт','furniture'],['Верстак','шт','furniture'],
 ['Скамейка','шт','furniture'],['Цветник деревянный','шт','furniture'],['Ящик для рассады','шт','furniture']
];
const RECIPES=[
 {id:'firewood',name:'Колка дров',station:'axe',hours:1.2,skill:1,inputs:[['Бревно',1]],outputs:[['Дрова',8]],description:'Одно бревно превращается в восемь условных единиц дров.'},
 {id:'boards',name:'Распил на доски',station:'sawmill',hours:2.2,skill:2,inputs:[['Бревно',1]],outputs:[['Доска',4],['Обрезки',1]],description:'Пилорама производит четыре доски и немного обрезков.'},
 {id:'timber',name:'Распил на брус',station:'sawmill',hours:1.8,skill:2,inputs:[['Бревно',1]],outputs:[['Брус',2],['Обрезки',1]],description:'Заготовка двух единиц бруса из бревна.'},
 {id:'chair',name:'Столярный стул',station:'workbench',hours:2,skill:1,inputs:[['Доска',3],['Брус',1],['Гвозди',6]],outputs:[['Стул',1]],description:'Готовый стул можно забрать в редактор интерьера со склада.'},
 {id:'table',name:'Стол',station:'workbench',hours:3,skill:2,inputs:[['Доска',6],['Брус',2],['Гвозди',10]],outputs:[['Стол',1]],description:'Стол для кухни, гостиной или мастерской.'},
 {id:'shelf',name:'Стеллаж',station:'workbench',hours:2.6,skill:2,inputs:[['Доска',5],['Брус',2],['Гвозди',8]],outputs:[['Стеллаж',1]],description:'Стеллаж для кладовой или мастерской.'},
 {id:'workbench',name:'Верстак',station:'workbench',hours:4.5,skill:3,inputs:[['Доска',8],['Брус',3],['Гвозди',16]],outputs:[['Верстак',1]],description:'Рабочее место для дальнейшего производства.'},
 {id:'bench',name:'Скамейка',station:'workbench',hours:3.8,skill:2,inputs:[['Доска',8],['Брус',2],['Гвозди',12]],outputs:[['Скамейка',1]],description:'Скамейка для территории усадьбы.'},
 {id:'planter',name:'Ящик для рассады',station:'workbench',hours:1.8,skill:1,inputs:[['Доска',2],['Гвозди',6]],outputs:[['Ящик для рассады',1]],description:'Деревянный ящик для рассады и укоренения растений.'},
 {id:'flowerbed',name:'Деревянный цветник',station:'workbench',hours:2.5,skill:2,inputs:[['Доска',4],['Брус',1],['Гвозди',8]],outputs:[['Цветник деревянный',1]],description:'Короб для цветов и небольших посадок.'}
];
const ui={worker:'d',qty:1};
const $=id=>document.getElementById(id);
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=v=>Math.round(n(v)).toLocaleString('ru-RU')+' ₽';
function ensure(){
 if(!Array.isArray(G.inventory))G.inventory=[];
 if(!G.workshop||typeof G.workshop!=='object')G.workshop={version:1,sawmillInstalled:false,history:[],nextId:1};
 if(!Array.isArray(G.workshop.history))G.workshop.history=[];
 if(typeof G.workshop.sawmillInstalled!=='boolean')G.workshop.sawmillInstalled=false;
 if(!Number.isFinite(Number(G.workshop.nextId))||G.workshop.nextId<1)G.workshop.nextId=1;
 const defs=[
  {name:'Бревно',unit:'шт',cat:'materials',price:850},{name:'Гвозди',unit:'шт',cat:'materials',price:5},
  {name:'Дрова',unit:'шт',cat:'fuel',price:0},{name:'Обрезки',unit:'кг',cat:'materials',price:0},
  {name:'Топор',unit:'шт',cat:'tools',price:1900},{name:'Пилорама',unit:'шт',cat:'equipment',price:58000},
  {name:'Стол',unit:'шт',cat:'furniture',price:0},{name:'Стул',unit:'шт',cat:'furniture',price:0},
  {name:'Стеллаж',unit:'шт',cat:'furniture',price:0},{name:'Верстак',unit:'шт',cat:'furniture',price:0},
  {name:'Скамейка',unit:'шт',cat:'furniture',price:0},{name:'Цветник деревянный',unit:'шт',cat:'furniture',price:0},
  {name:'Ящик для рассады',unit:'шт',cat:'furniture',price:0}
 ];
 defs.forEach(d=>stockItem(d.name,d.unit,d.cat,d.price));
}
function stockItem(name,unit,cat,price){
 let s=G.inventory.find(x=>String(x.name).trim().toLowerCase()===name.toLowerCase());
 if(!s){
  const id=G.inventory.reduce((m,x)=>Math.max(m,n(x.id)),0)+1;
  s={id,name,unit,qty:0,price:n(price),cat,reserved:0,used:0};G.inventory.push(s);
 }else{
  if(!s.unit)s.unit=unit;if(!s.cat)s.cat=cat;
  if(!Number.isFinite(Number(s.qty)))s.qty=0;
  if(s.reserved===undefined)s.reserved=0;if(s.used===undefined)s.used=0;
 }
 return s;
}
function available(s){return Math.max(0,n(s&&s.qty)-n(s&&s.reserved)-n(s&&s.used));}
function has(name,qty){const s=stockItem(name,'шт','materials',0);return available(s)>=qty;}
function take(name,qty){const s=stockItem(name,'шт','materials',0);if(available(s)<qty)return false;s.qty=n(s.qty)-qty;return true;}
function add(name,qty,unit,cat){const s=stockItem(name,unit||'шт',cat||'materials',0);s.qty=n(s.qty)+qty;return s;}
function worker(){return(G.people||[]).find(p=>String(p.id)===String(ui.worker))||(G.people||[])[0]||null;}
function hasWorkbench(){
 const plans=G.interiorPlans&&typeof G.interiorPlans==='object'?Object.values(G.interiorPlans):[];
 return plans.some(p=>(p.cells||[]).some((c,i)=>c&&c.type==='workshop'&&(p.furniture||[]).some(f=>f.type==='workbench'&&Number(f.cell)===i)));
}
function stationReady(type){
 if(type==='axe')return has('Топор',1);
 if(type==='sawmill')return !!G.workshop.sawmillInstalled;
 if(type==='workbench')return hasWorkbench()&&has('Молоток',1);
 return false;
}
function logMessage(message){if(typeof log==='function')log(message);}
function refresh(){save();if(G.tab==='workshop')render();else if(typeof window.render==='function')window.render();}
function buy(resource,quantity){
 ensure();
 const d=BUY.find(x=>x.id===resource);if(!d)return false;
 const qty=Math.max(1,Math.min(50,Math.floor(n(quantity,1)))),cost=d.price*qty;
 if(n(G.cash)<cost)return toast('Недостаточно свободных денег. Нужно '+rub(cost)+'.');
 G.cash=n(G.cash)-cost;add(d.name,qty,d.unit,d.cat);
 logMessage('Мастерская: куплено '+d.name+' · '+qty+' '+d.unit+' · '+rub(cost)+'.');
 refresh();toast('Материал добавлен на общий склад.');return true;
}
function installSawmill(){
 ensure();
 if(G.workshop.sawmillInstalled)return toast('Пилорама уже установлена.');
 if(!has('Пилорама',1))return toast('Сначала купи пилораму.');
 const p=worker();if(!p)return toast('Нет доступного исполнителя.');
 if(n(p.skill)<3)return toast('Для установки пилорамы нужен навык не ниже 3/5.');
 if(n(p.hours)<4)return toast('Недостаточно свободных часов у исполнителя.');
 if(n(p.energy)<10)return toast('Участнику нужен отдых.');
 take('Пилорама',1);p.hours=n(p.hours)-4;p.energy=Math.max(0,n(p.energy)-6);
 G.workshop.sawmillInstalled=true;
 logMessage('Пилорама установлена. Работа: 4 ч.');
 refresh();toast('Пилорама готова к работе.');return true;
}
function craft(recipeId,quantity){
 ensure();
 const recipe=RECIPES.find(x=>x.id===recipeId);if(!recipe)return false;
 const qty=Math.max(1,Math.min(8,Math.floor(n(quantity,1))));
 if(!stationReady(recipe.station)){
  if(recipe.station==='workbench')return toast('Нужна комната «Мастерская» с размещённым верстаком. Для сборки также нужен молоток на складе.');
  if(recipe.station==='sawmill')return toast('Сначала купи и установи пилораму.');
  if(recipe.station==='axe')return toast('Для колки дров нужен топор на общем складе.');
 }
 for(const [name,amount] of recipe.inputs){
  const required=amount*qty;if(!has(name,required))return toast('Не хватает материала «'+name+'»: нужно '+required+', на складе '+available(stockItem(name,'шт','materials',0))+'.');
 }
 const p=worker(),hours=recipe.hours*qty;
 if(!p)return toast('Нет доступного исполнителя.');
 if(n(p.skill)<recipe.skill)return toast('Для этой операции нужен навык не ниже '+recipe.skill+'/5.');
 if(n(p.hours)<hours)return toast('Не хватает рабочего времени: требуется '+hours.toFixed(1)+' ч.');
 if(n(p.energy)<10)return toast('Участнику нужен отдых.');
 recipe.inputs.forEach(([name,amount])=>take(name,amount*qty));
 p.hours=n(p.hours)-hours;p.energy=Math.max(0,n(p.energy)-Math.ceil(hours*1.5));
 const made=[];
 recipe.outputs.forEach(([name,amount])=>{add(name,amount*qty,unitFor(name),categoryFor(name));made.push((amount*qty)+' '+name);});
 const entry={id:G.workshop.nextId++,recipe:recipe.id,name:recipe.name,quantity:qty,outputs:made.join(', '),hours,worker:p.name,date:[G.day||1,G.month||1,G.year||1].join('.')};
 G.workshop.history.unshift(entry);G.workshop.history=G.workshop.history.slice(0,40);
 logMessage('Мастерская: '+recipe.name+' · '+made.join(', ')+' · '+hours.toFixed(1)+' ч · '+p.name+'.');
 refresh();toast('Готово: '+made.join(', ')+'.');return true;
}
function unitFor(name){return name==='Обрезки'?'кг':'шт';}
function categoryFor(name){return name==='Дрова'?'fuel':name==='Обрезки'?'materials':'furniture';}
function render(){
 const w=$('workspace');if(!w||G.tab!=='workshop')return;
 ensure();
 const people=G.people||[],p=worker();
 const workerOpts=people.map(x=>'<option value="'+esc(x.id)+'"'+(p&&String(p.id)===String(x.id)?' selected':'')+'>'+esc(x.name)+' · навык '+esc(x.skill)+'/5 · '+esc(x.hours)+' ч</option>').join('');
 const list=names=>names.map(name=>{const x=stockItem(name,'шт','materials',0);return'<div class="u4ws-stock"><span>'+esc(name)+'</span><b>'+available(x)+' '+esc(x.unit)+'</b></div>';}).join('');
 const workbench=hasWorkbench();
 const station='<div class="u4ws-stations"><div><b>Столярная мастерская</b><small>'+(workbench?'Комната с верстаком найдена':'Нужны комната «Мастерская» и размещённый верстак')+'</small></div><span class="'+(workbench?'ready':'missing')+'">'+(workbench?'Готова':'Не готова')+'</span></div>'+
 '<div class="u4ws-stations"><div><b>Пилорама</b><small>'+(G.workshop.sawmillInstalled?'Установлена и готова к распилу':has('Пилорама',1)?'Куплена, требуется установка':'Не приобретена')+'</small></div><span class="'+(G.workshop.sawmillInstalled?'ready':'missing')+'">'+(G.workshop.sawmillInstalled?'Готова':'Не готова')+'</span>'+(G.workshop.sawmillInstalled?'':'<button data-ws="install-sawmill" '+(has('Пилорама',1)?'':'disabled')+'>Установить</button>')+'</div>';
 const recipes=RECIPES.map(r=>{
  const input=r.inputs.map(x=>x[1]+' '+x[0]).join(' + '),output=r.outputs.map(x=>x[1]+' '+x[0]).join(' + ');
  const ready=stationReady(r.station);
  return'<article class="u4ws-recipe"><div class="u4ws-recipe-top"><b>'+esc(r.name)+'</b><span class="'+(ready?'ready':'missing')+'">'+(ready?'Доступно':'Нужна станция')+'</span></div><p>'+esc(r.description)+'</p><div class="u4ws-flow"><span>− '+esc(input)+'</span><span>→</span><b>+ '+esc(output)+'</b></div><small>'+r.hours+' ч · навык '+r.skill+'/5</small><button data-ws="craft" data-recipe="'+r.id+'">Изготовить</button></article>';
 }).join('');
 const history=G.workshop.history.slice(0,12).map(x=>'<div class="u4ws-history"><span>'+esc(x.date)+'</span><b>'+esc(x.name)+'</b><span>'+esc(x.outputs)+'</span><small>'+esc(x.worker)+' · '+n(x.hours).toFixed(1)+' ч</small></div>').join('');
 w.innerHTML='<div class="u4ws-wrap"><div class="u4ws-head"><div><h3>Мастерская и производство</h3><p class="muted">Сырьё поступает из общего склада, готовые изделия возвращаются туда же. Внутренний верстак берётся из редактора планировок.</p></div><label class="u4ws-worker">Исполнитель<select id="u4ws-worker">'+workerOpts+'</select></label></div>'+
 '<div class="u4ws-warning">Рабочее время и навыки участников списываются при изготовлении. Рецепты и нормы условные, рассчитаны для игровой экономики.</div>'+
 station+
 '<section class="u4ws-panel"><h4>Сырьё и оборудование</h4><div class="u4ws-buy-grid">'+BUY.map(x=>'<div class="u4ws-buy"><b>'+esc(x.name)+'</b><small>'+rub(x.price)+' / '+esc(x.unit)+'</small><button data-ws="buy" data-resource="'+x.id+'">Купить 1</button></div>').join('')+'</div><h5>Доступные материалы</h5><div class="u4ws-stock-grid">'+list(['Бревно','Доска','Брус','Гвозди','Дрова','Обрезки','Топор','Пилорама','Стол','Стул','Стеллаж','Верстак','Скамейка','Цветник деревянный','Ящик для рассады'])+'</div></section>'+
 '<section class="u4ws-panel"><h4>Производственные операции</h4><label class="u4ws-field">Количество изделий за один запуск<input id="u4ws-qty" type="number" min="1" max="8" value="1"></label><div class="u4ws-recipes">'+recipes+'</div></section>'+
 '<section class="u4ws-panel"><h4>История производства</h4>'+(history||'<p class="muted">Пока ничего не изготовлено.</p>')+'</section>'+
 '<div class="u4ws-note">Готовые столы, стулья и стеллажи можно использовать в редакторе интерьеров: при покупке соответствующего предмета модуль сначала проверит общий склад и спишет готовое изделие, а не деньги. Скамейки и садовые изделия пока остаются складскими предметами до реализации общего режима размещения на территории.</div></div>';
}
function click(e){
 const b=e.target.closest('[data-ws]');if(!b)return;const a=b.dataset.ws;
 if(a==='buy')buy(b.dataset.resource,1);
 else if(a==='install-sawmill')installSawmill();
 else if(a==='craft')craft(b.dataset.recipe,$('u4ws-qty')?$('u4ws-qty').value:1);
}
function change(e){if(e.target.id==='u4ws-worker')ui.worker=e.target.value;}
function styles(){
 if($('u4ws-style'))return;
 const s=document.createElement('style');s.id='u4ws-style';
 s.textContent=[
 '.u4ws-wrap{display:grid;gap:12px}.u4ws-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.u4ws-head h3{margin:0 0 4px}.u4ws-worker,.u4ws-field{display:grid;gap:4px;font:12px Arial;color:#68583f}.u4ws-worker select,.u4ws-field input{padding:8px;border:1px solid #b9a27c;border-radius:8px;background:#fffaf0;color:#322719}.u4ws-warning{padding:9px 11px;border:1px solid #d4bd8c;border-radius:9px;background:#fff3d7;color:#6e4b1f;font:11px/1.45 Arial}.u4ws-stations{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #d2c09c;border-radius:10px;background:#f8f0df}.u4ws-stations small{display:block;color:#806c4e;font:10px Arial;margin-top:3px}.u4ws-stations button,.u4ws-buy button,.u4ws-recipe button{font:11px Arial;padding:7px 10px}.u4ws-stations .ready,.u4ws-recipe .ready{color:#42633e;background:#e1ead8}.u4ws-stations .missing,.u4ws-recipe .missing{color:#8b5b29;background:#f4e6cf}.u4ws-stations span,.u4ws-recipe-top span{border-radius:20px;padding:4px 8px;font:10px Arial}.u4ws-panel{background:#f7efde;border:1px solid #cdb992;border-radius:12px;padding:12px}.u4ws-panel h4{margin:0 0 9px;color:#50351f}.u4ws-panel h5{margin:12px 0 7px;color:#6b5130}.u4ws-buy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}.u4ws-buy{display:grid;gap:5px;background:#fffaf0;border:1px solid #d8c8a7;border-radius:9px;padding:9px}.u4ws-buy small{font:10px Arial;color:#806c4e}.u4ws-stock-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:5px}.u4ws-stock{display:flex;justify-content:space-between;gap:8px;background:#eee4d1;border-radius:7px;padding:6px 8px;font:11px Arial}.u4ws-recipes{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}.u4ws-recipe{display:grid;gap:6px;padding:10px;border:1px solid #d8c8a7;border-radius:10px;background:#fffaf0}.u4ws-recipe-top{display:flex;justify-content:space-between;gap:6px;align-items:center;font:12px Arial}.u4ws-recipe p{min-height:30px;margin:0;color:#806c4e;font:10px/1.4 Arial}.u4ws-flow{display:grid;gap:4px;font:11px Arial;color:#66543a}.u4ws-recipe small{font:10px Arial;color:#88785e}.u4ws-field{margin:8px 0;max-width:220px}.u4ws-history{display:grid;grid-template-columns:70px 1fr 1fr 1fr;gap:8px;padding:6px 0;border-bottom:1px solid #e1d2b5;font:10px Arial;color:#6f6047}.u4ws-note{font:11px/1.5 Arial;color:#76664e}@media(max-width:700px){.u4ws-history{grid-template-columns:1fr 1fr}.u4ws-panel{padding:9px}}'
 ].join('');
 document.head.appendChild(s);
}
ensure();styles();
const tabs=$('tabs');
if(tabs&&!tabs.querySelector('[data-tab="workshop"]')){const b=document.createElement('button');b.type='button';b.dataset.tab='workshop';b.textContent='Мастерская';tabs.appendChild(b);}
const workspace=$('workspace');
if(workspace&&!workspace.dataset.u4wsBound){workspace.dataset.u4wsBound='1';workspace.addEventListener('click',click);workspace.addEventListener('change',change);}
const oldWorkspace=window.renderWorkspace;
window.renderWorkspace=function(){if(G.tab==='workshop'){render();return;}if(typeof oldWorkspace==='function')oldWorkspace();};
window.UilemWorkshop={render,buy,installSawmill,craft,hasWorkbench,getStock:name=>available(stockItem(name,'шт','materials',0)),getRecipes:()=>RECIPES};
save();if(G.tab==='workshop')render();
})();
