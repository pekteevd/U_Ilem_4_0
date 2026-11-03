/* У Илем 4.0 — живая растительность и сезонный цикл. */
(function(){
'use strict';
if(typeof G==='undefined'||!G||typeof save!=='function')return;
const CATALOG=[
{id:'apple',name:'Яблоня',kind:'Дерево',icon:'🌳',mature:5,life:60,fruit:'Яблоки',yield:18,water:1.2,hardy:-35,plantHours:2},
{id:'plum',name:'Слива',kind:'Дерево',icon:'🌳',mature:4,life:35,fruit:'Сливы',yield:14,water:1.3,hardy:-28,plantHours:2},
{id:'cherry',name:'Вишня',kind:'Дерево',icon:'🌳',mature:5,life:40,fruit:'Вишня',yield:10,water:1.4,hardy:-30,plantHours:2},
{id:'birch',name:'Берёза',kind:'Дерево',icon:'🌳',mature:8,life:80,fruit:null,yield:0,water:1.1,hardy:-45,plantHours:2},
{id:'rowan',name:'Рябина',kind:'Дерево',icon:'🌳',mature:6,life:50,fruit:'Рябина',yield:8,water:1,hardy:-40,plantHours:1.8},
{id:'spruce',name:'Ель',kind:'Хвойное дерево',icon:'🌲',mature:12,life:120,fruit:null,yield:0,water:.8,hardy:-50,plantHours:2},
{id:'currant',name:'Чёрная смородина',kind:'Кустарник',icon:'🫐',mature:3,life:15,fruit:'Смородина',yield:4,water:1.7,hardy:-38,plantHours:1},
{id:'raspberry',name:'Малина',kind:'Кустарник',icon:'🌿',mature:2,life:10,fruit:'Малина',yield:3,water:1.8,hardy:-32,plantHours:.8},
{id:'hazel',name:'Лещина',kind:'Кустарник',icon:'🌿',mature:5,life:40,fruit:'Фундук',yield:5,water:1,hardy:-35,plantHours:1.2},
{id:'lilac',name:'Сирень',kind:'Кустарник',icon:'🌸',mature:4,life:40,fruit:null,yield:0,water:.9,hardy:-35,plantHours:1}
];
const ui={zone:null,worker:'t'};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=v=>Math.round(Number(v)||0).toLocaleString('ru-RU')+' ₽';
function dateStamp(){return[G.day||1,G.month||1,G.year||1].join('.');}
function seasonIndex(){return Math.max(0,Math.min(3,Math.floor(((Number(G.month)||1)-1)/3)));}
function seasonName(){return['Зима','Весна','Лето','Осень'][seasonIndex()];}
function species(id){return CATALOG.find(x=>x.id===id)||CATALOG[0];}
function zoneName(id){const z=G.garden.zones.find(x=>String(x.id)===String(id));return z?z.name:'Зона не указана';}
function ensure(){
 G.garden=G.garden&&typeof G.garden==='object'?G.garden:{};
 if(!Array.isArray(G.garden.zones))G.garden.zones=[];
 if(!Array.isArray(G.garden.livingPlants))G.garden.livingPlants=[];
 G.garden.livingPlants=G.garden.livingPlants.filter(p=>p&&typeof p==='object');
 G.garden.livingPlants.forEach(p=>{
  if(!Number.isFinite(Number(p.id)))p.id=Date.now();
  p.species=p.species||'apple';
  p.ageDays=Math.max(0,Number(p.ageDays)||0);
  p.growth=Math.max(0,Math.min(100,Number(p.growth)||0));
  p.health=Math.max(0,Math.min(100,Number(p.health??100)));
  p.moisture=Math.max(0,Math.min(100,Number(p.moisture??65)));
  p.status=p.status||'Живое растение';
  p.lastHarvestYear=Number(p.lastHarvestYear)||0;
  p.fruitPending=Math.max(0,Number(p.fruitPending)||0);
  p.plantedAt=p.plantedAt||dateStamp();
 });
 if(ui.zone===null&&G.garden.zones.length)ui.zone=G.garden.zones[0].id;
}
function person(){return(G.people||[]).find(p=>String(p.id)===String(ui.worker))||(G.people||[]).find(p=>p.id==='t')||(G.people||[])[0]||null;}
function addLog(t){if(typeof log==='function')log(t);}
function updateScreen(){save();if(G.tab==='livingPlants')render();else if(typeof window.render==='function')window.render();}
function charge(p,hours,cash,skill){
 if(!p)return toast('Нет доступного участника.');
 if(Number(p.skill)<skill)return toast('Для этой работы нужен навык не ниже '+skill+'/5.');
 if(Number(p.hours)<hours)return toast('Недостаточно свободных часов у выбранного участника.');
 if(Number(p.energy)<8)return toast('Участнику нужен отдых.');
 if(Number(G.cash)<cash)return toast('Недостаточно свободных денег. Требуется '+rub(cash)+'.');
 G.cash=Number(G.cash)-cash;p.hours=Number(p.hours)-hours;p.energy=Math.max(0,Number(p.energy)-Math.ceil(hours*1.5));return true;
}
function seedlingItem(){return(G.inventory||[]).find(x=>String(x.name).toLowerCase()==='саженцы');}
function plant(speciesId){
 ensure();const s=species(speciesId),p=person(),stock=seedlingItem();
 if(!G.garden.zones.some(z=>String(z.id)===String(ui.zone)))return toast('Сначала выбери подготовленную зону.');
 if(!stock||Number(stock.qty)<1)return toast('На складе нет саженцев. Добавь их во вкладке «Склад».');
 if(!charge(p,s.plantHours,300,s.kind==='Дерево'?2:1))return;
 stock.qty=Number(stock.qty)-1;
 const id=G.garden.livingPlants.reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1;
 G.garden.livingPlants.push({id,species:s.id,zone:ui.zone,ageDays:0,growth:0,health:100,moisture:65,status:'Саженец',lastHarvestYear:0,fruitPending:0,plantedAt:dateStamp()});
 addLog('Посажено растение: '+s.name+' · '+zoneName(ui.zone)+'. Списан 1 саженец, работа '+s.plantHours+' ч.');
 updateScreen();toast(s.name+' посажена.');
}
function water(id){
 const p=G.garden.livingPlants.find(x=>Number(x.id)===Number(id));if(!p)return;
 if(window.UilemWater&&!window.UilemWater.hasManualWater(40))return toast('Не хватает воды. Проверь запас в системе водоснабжения или возьми воду из колодца позже.');const who=person();if(!charge(who,.5,0,1))return;if(window.UilemWater&&!window.UilemWater.takeManualWater(40))return toast('Не удалось получить воду из системы.');
 p.moisture=Math.min(100,p.moisture+42);p.health=Math.min(100,p.health+2);
 addLog('Полив: '+species(p.species).name+' · '+zoneName(p.zone)+'.');
 updateScreen();toast('Влажность почвы восстановлена.');
}
function feed(id){
 const p=G.garden.livingPlants.find(x=>Number(x.id)===Number(id));if(!p)return;
 const stock=(G.inventory||[]).find(x=>String(x.name).toLowerCase()==='удобрения');
 if(!stock||Number(stock.qty)<1)return toast('На складе нет удобрений.');
 const who=person();if(!charge(who,.7,50,1))return;
 stock.qty=Number(stock.qty)-1;p.health=Math.min(100,p.health+8);p.growth=Math.min(100,p.growth+.7);
 addLog('Подкормка: '+species(p.species).name+'. Списано 1 кг удобрений.');
 updateScreen();toast('Подкормка выполнена.');
}
function prune(id){
 const p=G.garden.livingPlants.find(x=>Number(x.id)===Number(id));if(!p)return;
 const who=person();if(!charge(who,1,120,2))return;
 p.health=Math.min(100,p.health+6);
 addLog('Обрезка и санитарный осмотр: '+species(p.species).name+'.');
 updateScreen();toast('Уход выполнен.');
}
function harvest(id){
 const p=G.garden.livingPlants.find(x=>Number(x.id)===Number(id));if(!p)return;
 if(!p.fruitPending)return toast('Сейчас нет готового урожая.');
 const s=species(p.species),who=person();if(!charge(who,.7,0,1))return;
 const name=s.fruit,qty=p.fruitPending;
 let stock=(G.inventory||[]).find(x=>x.name===name);
 if(!stock){const nextId=(G.inventory||[]).reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1;stock={id:nextId,name,unit:'кг',qty:0,price:0,cat:'food',reserved:0,used:0};G.inventory.push(stock);}
 stock.qty=Number(stock.qty||0)+qty;p.fruitPending=0;
 addLog('Собран урожай: '+name+' · '+qty+' кг.');
 updateScreen();toast('Урожай добавлен на склад.');
}
function removePlant(id){
 const p=G.garden.livingPlants.find(x=>Number(x.id)===Number(id));if(!p)return;
 const who=person();if(!charge(who,1.5,0,2))return;
 p.status='Удалено';p.health=0;p.removedAt=dateStamp();
 addLog('Растение удалено из активного сада: '+species(p.species).name+'. Запись сохранена в истории.');
 updateScreen();
}
function lifeStage(p,s){
 if(p.status==='Удалено'||p.status==='Погибло')return p.status;
 const years=p.ageDays/360;
 if(years<s.mature)return years<1?'Саженец':'Молодое растение';
 if(years>=s.life*.72)return'Стареющее растение';
 return'Взрослое растение';
}
function seasonalState(p,s){
 if(p.status==='Удалено'||p.status==='Погибло')return p.status;
 if(s.id==='spruce')return seasonName()==='Зима'?'Зимний покой':'Хвоя';
 if(seasonName()==='Зима')return'Зимний покой';
 if(seasonName()==='Весна'&&p.growth>=35)return'Распускание почек / цветение';
 if(seasonName()==='Лето')return p.growth>=100?'Вегетация / плодоношение':'Активный рост';
 if(seasonName()==='Осень')return p.fruitPending>0?'Урожай готов':'Листопад / подготовка к покою';
 return'Рост';
}
function dailyTick(){
 ensure();
 const tickDate=dateStamp();
 if(G.garden.lastProcessedDay===tickDate)return;
 G.garden.lastProcessedDay=tickDate;
 let transitions=[];
 const season=seasonIndex(),weather=Array.isArray(G.weather)?String(G.weather[1]||''):'';
 const temp=Array.isArray(G.weather)?Number(G.weather[2]):0;
 for(const p of G.garden.livingPlants){
  if(p.status==='Удалено'||p.status==='Погибло')continue;
  const s=species(p.species),before=lifeStage(p,s);
  p.ageDays=Math.max(0,Number(p.ageDays)||0)+1;
  const growthSeason=[0,.9,1,.25][season];
  const averageSeasonalGrowth=.5375;
  p.growth=Math.min(100,Number(p.growth||0)+(100/(s.mature*360*averageSeasonalGrowth))*growthSeason);
  const rain=/дожд|лив|гроза/i.test(weather),snow=/снег|метел/i.test(weather);
  const loss=[.2,1,2.2,.8][season]*s.water;
  p.moisture=Math.max(0,Math.min(100,Number(p.moisture||0)+(rain?16:snow?3:-loss)));
  if(p.moisture<18)p.health=Math.max(0,p.health-1.2);
  else if(p.moisture>42)p.health=Math.min(100,p.health+.12);
  if(temp<s.hardy)p.health=Math.max(0,p.health-.8);
  if(p.ageDays>=s.life*360||p.health<=0){p.status='Погибло';p.fruitPending=0;transitions.push(s.name+': растение погибло.');}
  else{p.status=lifeStage(p,s);if(before!==p.status)transitions.push(s.name+': '+p.status.toLowerCase()+'.');}
  if(s.fruit&&p.growth>=100&&Number(G.month)===9&&Number(G.day)<=2&&Number(p.lastHarvestYear)!==Number(G.year)){
   p.fruitPending=Math.max(1,Math.round(s.yield*(p.health/100)));p.lastHarvestYear=Number(G.year)||1;
   transitions.push(s.name+': созрел урожай '+s.fruit+' ('+p.fruitPending+' кг).');
  }
 }
 transitions.forEach(addLog);
}
function plantIcon(p){
 const s=species(p.species);if(p.status==='Погибло'||p.status==='Удалено')return'🥀';
 if(s.id==='spruce')return'🌲';if(seasonIndex()===3)return'🍂';
 if(p.growth<30)return'🌱';if(s.kind==='Кустарник')return'🌿';return'🌳';
}
function render(){
 const w=document.getElementById('workspace');if(!w||G.tab!=='livingPlants')return;
 ensure();
 const zones=G.garden.zones,plants=G.garden.livingPlants.filter(p=>p.status!=='Удалено');
 const zoneOptions=zones.map(z=>'<option value="'+esc(z.id)+'"'+(String(z.id)===String(ui.zone)?' selected':'')+'>'+esc(z.name)+'</option>').join('');
 const workerOptions=(G.people||[]).map(p=>'<option value="'+esc(p.id)+'"'+(String(p.id)===String(ui.worker)?' selected':'')+'>'+esc(p.name)+' · навык '+esc(p.skill)+'/5 · '+esc(p.hours)+' ч</option>').join('');
 const catalog=CATALOG.map(s=>'<div class="eco-card"><div class="eco-card-title"><span>'+s.icon+'</span><div><b>'+esc(s.name)+'</b><small>'+esc(s.kind)+' · зрелость около '+s.mature+' игровых лет</small></div></div><div class="eco-meta">Саженец: 1 шт. на складе · посадка '+rub(300)+' · '+s.plantHours+' ч</div><button data-eco-act="plant" data-species="'+s.id+'">Посадить в выбранной зоне</button></div>').join('');
 const list=plants.map(p=>{
  const s=species(p.species),health=Math.round(p.health),moisture=Math.round(p.moisture),growth=Math.round(p.growth),age=(p.ageDays/360).toFixed(1);
  return '<div class="eco-plant"><div class="eco-plant-head"><span class="eco-plant-icon">'+plantIcon(p)+'</span><div><b>'+esc(s.name)+'</b><small>'+esc(zoneName(p.zone))+' · '+esc(lifeStage(p,s))+' · '+age+' игровых лет</small></div><span class="eco-status">'+esc(seasonalState(p,s))+'</span></div><div class="eco-bars"><label>Рост <b>'+growth+'%</b><i><span style="width:'+growth+'%"></span></i></label><label>Здоровье <b>'+health+'%</b><i><span style="width:'+health+'%"></span></i></label><label>Влажность <b>'+moisture+'%</b><i><span style="width:'+moisture+'%"></span></i></label></div><div class="eco-actions"><button data-eco-act="water" data-id="'+p.id+'">Полить</button><button data-eco-act="feed" data-id="'+p.id+'">Подкормить</button><button data-eco-act="prune" data-id="'+p.id+'">Обрезать / осмотреть</button>'+(p.fruitPending?'<button data-eco-act="harvest" data-id="'+p.id+'">Собрать '+p.fruitPending+' кг</button>':'')+'<button data-eco-act="remove" data-id="'+p.id+'">Удалить из активного сада</button></div></div>';
 }).join('');
 const living=plants.filter(p=>p.status!=='Погибло'),trees=living.filter(p=>species(p.species).kind!=='Кустарник').length,bushes=living.length-trees;
 w.innerHTML='<div class="eco-wrap"><div class="eco-heading"><div><h3>Живая растительность</h3><p class="muted">Каждое посаженное дерево и кустарник — отдельный объект игрового мира с возрастом, ростом и состоянием.</p></div><span class="eco-season">'+seasonName()+' · '+(G.day||1)+' день</span></div><div class="eco-warning">Система моделирует игровой жизненный цикл. Скорости роста и игровые расходы — параметры симуляции, не агрономический прогноз. Фактические сорта и уже существующие деревья вводятся вручную, по результатам инвентаризации.</div><div class="eco-summary"><span><b>'+living.length+'</b><small>живых растений</small></span><span><b>'+trees+'</b><small>деревьев</small></span><span><b>'+bushes+'</b><small>кустарников</small></span><span><b>'+plants.filter(p=>p.fruitPending>0).length+'</b><small>с урожаем</small></span></div><div class="eco-tools"><label>Зона посадки<select id="eco-zone">'+zoneOptions+'</select></label><label>Исполнитель<select id="eco-worker">'+workerOptions+'</select></label><span class="eco-stock">Саженцы на складе: '+Number(seedlingItem()?.qty||0)+' шт. · Удобрения: '+Number((G.inventory||[]).find(x=>x.name==='Удобрения')?.qty||0)+' кг</span></div><h4>Каталог для посадки</h4><div class="eco-catalog">'+catalog+'</div><h4>Растения в игровом мире</h4>'+(list||'<p class="muted">Пока нет индивидуально заведённых растений. Уже существующие группы из инвентаризации сада сохранены отдельно и не превращаются автоматически в выдуманные объекты.</p>')+'<p class="eco-note">Полив повышает влажность из условного источника воды участка. Удобрение списывает 1 кг со склада. Обрезка, полив и посадка расходуют часы и энергию исполнителя. Рост идёт по игровым дням, зимой замедляется, а здоровье зависит от влажности и морозостойкости вида.</p></div>';
}
function click(e){
 const b=e.target.closest('[data-eco-act]');if(!b)return;
 const a=b.dataset.ecoAct,id=Number(b.dataset.id);
 if(a==='plant')plant(b.dataset.species);else if(a==='water')water(id);else if(a==='feed')feed(id);else if(a==='prune')prune(id);else if(a==='harvest')harvest(id);else if(a==='remove')removePlant(id);
}
function change(e){if(e.target.id==='eco-zone')ui.zone=e.target.value;else if(e.target.id==='eco-worker')ui.worker=e.target.value;if(G.tab==='livingPlants')render();}
function styles(){if(document.getElementById('eco-style'))return;const s=document.createElement('style');s.id='eco-style';s.textContent=`
.eco-wrap{display:grid;gap:12px}.eco-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}.eco-heading h3{margin:0}.eco-season{background:#e9dec7;padding:8px 12px;border-radius:20px;font:12px Arial;color:#604d31}.eco-warning{background:#fff3d7;color:#6e4b1f;border:1px solid #d5b36f;border-radius:10px;padding:10px;font:12px/1.45 Arial}.eco-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.eco-summary span{display:grid;background:#f8f0df;border:1px solid #d4c29e;border-radius:9px;padding:9px;text-align:center}.eco-summary b{font:bold 20px Arial;color:#4c3a27}.eco-summary small{font:10px Arial;color:#806c4e}.eco-tools{display:flex;gap:12px;align-items:end;flex-wrap:wrap;background:#f1e6ce;padding:10px;border-radius:10px}.eco-tools label{display:grid;gap:4px;font:12px Arial;color:#68583f;min-width:180px}.eco-tools select{padding:8px;border:1px solid #b9a27c;border-radius:8px;background:#fffaf0}.eco-stock{font:11px Arial;color:#65543a;padding:8px}.eco-catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}.eco-card,.eco-plant{background:#f8f0df;border:1px solid #d4c29e;border-radius:10px;padding:10px}.eco-card-title,.eco-plant-head{display:flex;align-items:center;gap:9px}.eco-card-title>span,.eco-plant-icon{font-size:24px}.eco-card-title div,.eco-plant-head div{display:grid;gap:2px;min-width:0}.eco-card small,.eco-plant-head small{font:11px Arial;color:#806c4e}.eco-meta{font:10px Arial;color:#806c4e;margin:8px 0}.eco-card button,.eco-actions button{font:11px Arial;padding:7px 9px;margin:3px}.eco-plant{margin:8px 0}.eco-plant-head{align-items:flex-start}.eco-status{font:10px Arial;background:#e9dec7;padding:5px 8px;border-radius:18px;margin-left:auto}.eco-bars{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.eco-bars label{display:grid;gap:3px;font:10px Arial;color:#806c4e}.eco-bars b{color:#4c3a27}.eco-bars i{height:7px;background:#ddd0b4;border-radius:10px;overflow:hidden}.eco-bars i span{display:block;height:100%;background:#78965c}.eco-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}.eco-note{font:10px/1.45 Arial;color:#817258}@media(max-width:600px){.eco-summary{grid-template-columns:repeat(2,1fr)}.eco-bars{grid-template-columns:1fr}}
`;document.head.appendChild(s);}
ensure();styles();
const tabs=document.getElementById('tabs');if(tabs&&!tabs.querySelector('[data-tab="livingPlants"]')){const b=document.createElement('button');b.type='button';b.dataset.tab='livingPlants';b.textContent='Живая растительность';tabs.appendChild(b);}
const workspace=document.getElementById('workspace');if(workspace&&!workspace.dataset.ecoBound){workspace.dataset.ecoBound='1';workspace.addEventListener('click',click);workspace.addEventListener('change',change);}
const oldWorkspace=window.renderWorkspace;window.renderWorkspace=function(){if(G.tab==='livingPlants'){render();return;}if(typeof oldWorkspace==='function')oldWorkspace();};
let insideAdvance=false,advanceStart=null;
const oldNextMonth=window.nextMonth;
if(typeof oldNextMonth==='function'&&!window.__uilemEcologyNextMonthWrapped){
 window.__uilemEcologyNextMonthWrapped=true;
 window.nextMonth=function(){
  if(!insideAdvance){
   const originalDay=Number(G.day)||1;
   for(let d=originalDay+1;d<=30;d++){G.day=d;if(Math.random()<.28&&typeof weatherRoll==='function')weatherRoll();dailyTick();}
   G.day=originalDay;
  }
  oldNextMonth();
  dailyTick();
  if(G.tab==='livingPlants')render();
 };
}
const oldAdvance=window.advanceDay;
if(typeof oldAdvance==='function'&&!window.__uilemEcologyAdvanceWrapped){
 window.__uilemEcologyAdvanceWrapped=true;
 window.advanceDay=function(){
  const beforeYear=Number(G.year)||1,beforeMonth=Number(G.month)||1,beforeDay=Number(G.day)||1;
  insideAdvance=true;
  try{oldAdvance();}finally{insideAdvance=false;}
  if(dateStamp()!==[beforeDay,beforeMonth,beforeYear].join('.')){dailyTick();save();if(G.tab==='livingPlants')render();}
 };
}
window.UilemEcology={catalog:CATALOG,render,dailyTick,plant,water,feed,prune,harvest,remove:removePlant};
save();if(G.tab==='livingPlants')render();
})();
