/* У Илем 4.0 — водоснабжение, запас воды и полив. */
(function(){
'use strict';
if(typeof G==='undefined'||!G||typeof save!=='function')return;
const C=[
{id:'surfacePump',name:'Поверхностная насосная станция',kind:'pump',price:18500,flow:800,watt:750,hours:3,skill:2,desc:'До 800 л за игровой день при наличии электропитания.'},
{id:'submersiblePump',name:'Погружной насос',kind:'pump',price:26500,flow:1500,watt:1100,hours:4,skill:2,desc:'До 1 500 л за игровой день при наличии электропитания.'},
{id:'tank500',name:'Накопительная ёмкость 500 л',kind:'tank',price:9500,capacity:500,hours:1.5,skill:1,desc:'Запас воды между циклами насоса.'},
{id:'tank1000',name:'Накопительная ёмкость 1 000 л',kind:'tank',price:15800,capacity:1000,hours:2,skill:1,desc:'Увеличивает резерв воды на участке.'},
{id:'filter',name:'Механический фильтр грубой очистки',kind:'filter',price:4900,hours:1.5,skill:2,desc:'Задерживает механические примеси, но не подтверждает питьевую безопасность.'},
{id:'pipe10',name:'Труба для водопровода, 10 м',kind:'pipe',price:2600,meters:10,desc:'Запас трубы для подключения точек.'},
{id:'dripKit',name:'Комплект капельного полива',kind:'irrigation',price:6400,hours:2,skill:1,desc:'Позволяет подключить автоматический полив сада.'}
];
const TARGETS=[
{id:'mainHouse',name:'Родительский дом',demand:140},
{id:'guestA',name:'Гостевой дом №1',demand:70},
{id:'guestB',name:'Гостевой дом №2',demand:70},
{id:'bath',name:'Баня',demand:100},
{id:'garden',name:'Сад и огород',demand:160,garden:true}
];
const ui={worker:'d',target:'mainHouse',length:10};
const $=id=>document.getElementById(id);
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const rub=v=>Math.round(n(v)).toLocaleString('ru-RU')+' ₽';
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=()=>[n(G.day,1),n(G.month,1),n(G.year,1)].join('.');
const month=()=>[n(G.month,1),n(G.year,1)].join('.');
function fresh(){return{version:1,stock:[],nextId:1,pump:null,tanks:[],filterInstalled:false,dripInstalled:false,pipeStockMeters:0,pipeInstalledMeters:0,connections:[],storageLitres:0,manualDrawnToday:0,lastProcessedDay:null,irrigationEnabled:false,monthEnergyKwh:0,energyDebt:0,lastBill:0,powerBlocked:false,lastDay:{date:null,produced:0,demand:0,served:0,shortage:0,storage:0},history:[]};}
function cap(){return(G.waterSystem.tanks||[]).reduce((s,x)=>s+n(x.capacity),0);}
function ensure(){
 if(!G.waterSystem||typeof G.waterSystem!=='object')G.waterSystem=fresh();
 const s=G.waterSystem,d=fresh();
 Object.keys(d).forEach(k=>{if(s[k]===undefined)s[k]=d[k]});
 ['stock','tanks','connections','history'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[];});
 ['storageLitres','pipeStockMeters','pipeInstalledMeters','manualDrawnToday','monthEnergyKwh','energyDebt'].forEach(k=>s[k]=Math.max(0,n(s[k])));
 if(!Number.isFinite(Number(s.nextId))||s.nextId<1)s.nextId=1;
 if(!s.lastProcessedDay)s.lastProcessedDay=date();
 s.storageLitres=cap()?Math.min(s.storageLitres,cap()):0;
}
function worker(){return(G.people||[]).find(p=>String(p.id)===String(ui.worker))||(G.people||[]).find(p=>p.id==='d')||(G.people||[])[0]||null;}
function work(hours,skill){
 const p=worker();
 if(!p)return toast('Нет доступного исполнителя.');
 if(n(p.skill)<skill)return toast('Нужен навык не ниже '+skill+'/5.');
 if(n(p.hours)<hours)return toast('Недостаточно свободных часов.');
 if(n(p.energy)<10)return toast('Участнику нужен отдых.');
 p.hours=n(p.hours)-hours;p.energy=Math.max(0,n(p.energy)-Math.ceil(hours*1.5));return true;
}
function spec(id){return C.find(x=>x.id===id);}
function target(id){return TARGETS.find(x=>x.id===id);}
function isConnected(id){return G.waterSystem.connections.some(x=>x.targetId===id);}
function online(){const p=G.waterSystem.pump;return !!p&&(!p.watt||!(G.lighting&&G.lighting.source==='none'));}
function demand(){return G.waterSystem.connections.reduce((s,c)=>{const t=target(c.targetId);return s+(t&&c.active!==false&&(!t.garden||G.waterSystem.irrigationEnabled)?t.demand:0);},0);}
function record(t){if(typeof log==='function')log(t);}
function refresh(){save();if(G.tab==='waterSystem')render();else if(typeof window.render==='function')window.render();}
function buy(id){
 ensure();const x=spec(id);if(!x)return;
 if(n(G.cash)<x.price)return toast('Недостаточно свободных денег.');
 G.cash=n(G.cash)-x.price;
 if(x.kind==='pipe')G.waterSystem.pipeStockMeters+=x.meters;
 else G.waterSystem.stock.push({id:G.waterSystem.nextId++,type:x.id,name:x.name,price:x.price});
 record('Куплено оборудование водоснабжения: '+x.name+' за '+rub(x.price)+'.');
 refresh();toast('Покупка добавлена.');
}
function install(id){
 ensure();const s=G.waterSystem,x=s.stock.find(v=>String(v.id)===String(id));if(!x)return;
 const d=spec(x.type);if(!d)return;
 if(d.kind==='pump'&&s.pump)return toast('Сначала демонтируй установленный насос.');
 if(d.kind==='filter'&&s.filterInstalled)return toast('Фильтр уже установлен.');
 if(d.kind==='irrigation'&&s.dripInstalled)return toast('Комплект полива уже установлен.');
 if(!work(n(d.hours),n(d.skill)))return;
 s.stock=s.stock.filter(v=>v!==x);
 if(d.kind==='pump')s.pump={type:d.id,name:d.name,flow:d.flow,watt:d.watt};
 else if(d.kind==='tank')s.tanks.push({type:d.id,name:d.name,capacity:d.capacity});
 else if(d.kind==='filter')s.filterInstalled=true;
 else if(d.kind==='irrigation')s.dripInstalled=true;
 record('Установлено оборудование: '+d.name+'.');
 refresh();toast('Оборудование установлено.');
}
function uninstallPump(){
 const s=G.waterSystem;if(!s.pump)return;
 if(s.connections.length)return toast('Сначала отключи все точки водоснабжения.');
 if(!work(1.5,2))return;
 s.stock.push({id:s.nextId++,type:s.pump.type,name:s.pump.name,price:0});s.pump=null;s.powerBlocked=false;
 record('Насос демонтирован и возвращён на склад.');refresh();
}
function uninstallTank(i){
 const s=G.waterSystem,t=s.tanks[i];if(!t)return;
 if(s.storageLitres>cap()-n(t.capacity))return toast('Сначала используй или перекачай воду из этой ёмкости.');
 if(!work(1,1))return;
 s.tanks.splice(i,1);s.stock.push({id:s.nextId++,type:t.type,name:t.name,price:0});
 record('Ёмкость демонтирована и возвращена на склад.');refresh();
}
function connect(id,length){
 ensure();const s=G.waterSystem,t=target(id),m=n(length);
 if(!t)return toast('Неизвестная точка подключения.');
 if(isConnected(id))return toast('Точка уже подключена.');
 if(!Number.isFinite(m)||m<1||m>500)return toast('Длина трассы должна быть от 1 до 500 м.');
 if(s.pipeStockMeters<m)return toast('Недостаточно трубы: есть '+s.pipeStockMeters+' м, требуется '+m+' м.');
 const hours=Math.max(.5,Math.round(m*.12*10)/10);if(!work(hours,2))return;
 s.pipeStockMeters-=m;s.pipeInstalledMeters+=m;s.connections.push({targetId:id,length:m,active:true,connectedAt:date()});
 record('Подключено '+t.name+': '+m+' м трубы, работа '+hours+' ч.');refresh();toast('Точка подключена.');
}
function disconnect(id){
 const s=G.waterSystem,c=s.connections.find(x=>x.targetId===id);if(!c)return;
 const t=target(id),hours=Math.max(.3,Math.round(n(c.length)*.05*10)/10);if(!work(hours,1))return;
 s.connections=s.connections.filter(x=>x!==c);s.pipeInstalledMeters=Math.max(0,s.pipeInstalledMeters-n(c.length));s.pipeStockMeters+=n(c.length);
 if(id==='garden')s.irrigationEnabled=false;
 record('Отключено '+(t?t.name:id)+'. Труба возвращена в запас.');refresh();
}
function toggleIrrigation(){
 const s=G.waterSystem;
 if(!s.dripInstalled)return toast('Сначала установи комплект капельного полива.');
 if(!isConnected('garden'))return toast('Сначала подключи сад.');
 s.irrigationEnabled=!s.irrigationEnabled;record('Автоматический полив '+(s.irrigationEnabled?'включён.':'выключен.'));
 refresh();
}
function hasManualWater(litres){
 ensure();const amount=Math.max(1,n(litres,40)),s=G.waterSystem;
 const fromTank=Math.min(amount,s.storageLitres);return s.manualDrawnToday+amount-fromTank<=120;
}
function takeManualWater(litres){
 ensure();const amount=Math.max(1,n(litres,40)),s=G.waterSystem;if(!hasManualWater(amount))return false;
 const fromTank=Math.min(amount,s.storageLitres);s.storageLitres-=fromTank;s.manualDrawnToday+=amount-fromTank;save();return true;
}
function settleMonth(previous){
 const s=G.waterSystem;if(!s.pump||!s.pump.watt)return;
 const tariff=G.lighting&&Number.isFinite(Number(G.lighting.tariff))?n(G.lighting.tariff):8;
 const monthly=Math.round(s.monthEnergyKwh*tariff*100)/100,total=Math.round((s.energyDebt+monthly)*100)/100;
 s.lastBill=monthly;if(total<=0)return;
 if(total<=n(G.cash)){
  const debt=s.energyDebt>0;G.cash=n(G.cash)-total;s.energyDebt=0;s.powerBlocked=false;
  record('Электроэнергия насоса за месяц '+previous+': '+rub(monthly)+(debt?' · долг погашен':'')+'.');
 }else{s.energyDebt=total;s.powerBlocked=true;record('Не хватает денег на электроэнергию насоса. Долг '+rub(total)+', насос отключён.');}
 s.monthEnergyKwh=0;
}
function dailyTick(){
 ensure();const s=G.waterSystem,stamp=date();if(s.lastProcessedDay===stamp)return false;
 s.lastProcessedDay=stamp;s.manualDrawnToday=0;
 const need=demand(),capacity=cap();let produced=0,energy=0;
 if(need>0&&s.pump&&online()&&!s.powerBlocked){
  const refill=Math.max(0,capacity-s.storageLitres)+Math.max(0,need-s.storageLitres);
  produced=Math.min(n(s.pump.flow),refill);
  if(s.pump.watt&&produced>0){energy=n(s.pump.watt)*2/1000;s.monthEnergyKwh+=energy;}
 }
 const available=s.storageLitres+produced,served=Math.min(available,need),shortage=Math.max(0,need-served);
 s.storageLitres=Math.min(capacity,Math.max(0,available-served));
 s.lastDay={date:stamp,produced:Math.round(produced),demand:need,served:Math.round(served),shortage:Math.round(shortage),storage:Math.round(s.storageLitres),energyKwh:energy};
 s.history.unshift({...s.lastDay});s.history=s.history.slice(0,30);
 if(shortage>0&&(!s.history[1]||s.history[1].shortage<=0))record('Водоснабжение: дефицит '+Math.round(shortage)+' л за игровой день.');
 return true;
}
function render(){
 const w=$('workspace');if(!w||G.tab!=='waterSystem')return;ensure();
 const s=G.waterSystem,capacity=cap(),need=demand();
 const workerOptions=(G.people||[]).map(p=>'<option value="'+esc(p.id)+'"'+(String(p.id)===String(ui.worker)?' selected':'')+'>'+esc(p.name)+' · навык '+esc(p.skill)+'/5 · '+esc(p.hours)+' ч</option>').join('');
 const stock=s.stock.map(x=>'<div class="u4w-row"><span><b>'+esc(x.name)+'</b><small>Склад оборудования</small></span><button data-wa="install" data-id="'+x.id+'">Установить</button></div>').join('');
 const pump=s.pump?'<div class="u4w-row"><span><b>'+esc(s.pump.name)+'</b><small>'+s.pump.flow+' л/день · '+s.pump.watt+' Вт · '+(online()&&!s.powerBlocked?'готов':'нет питания / отключён')+'</small></span><button data-wa="unpump">Демонтировать</button></div>':'<p class="muted">Насос не установлен. Ручной забор из колодца доступен до 120 л за игровой день.</p>';
 const tanks=s.tanks.map((x,i)=>'<div class="u4w-row"><span><b>'+esc(x.name)+'</b><small>'+x.capacity+' л</small></span><button data-wa="untank" data-id="'+i+'">Демонтировать</button></div>').join('');
 const points=TARGETS.map(t=>{const c=s.connections.find(x=>x.targetId===t.id),on=!!c;return'<div class="u4w-row"><span><b>'+esc(t.name)+'</b><small>'+t.demand+' л/день · '+(on?'подключено, '+c.length+' м':'не подключено')+'</small></span><span>'+(on?'<button data-wa="disconnect" data-target="'+t.id+'">Отключить</button>':'<button data-wa="connect" data-target="'+t.id+'">Подключить</button>')+(t.garden&&on?'<button data-wa="irrigation">'+(s.irrigationEnabled?'Выключить':'Включить')+' автополив</button>':'')+'</span></div>';}).join('');
 const catalog=C.map(x=>'<div class="u4w-card"><b>'+esc(x.name)+'</b><p>'+esc(x.desc)+'</p><b>'+rub(x.price)+'</b><button data-wa="buy" data-type="'+x.id+'">Купить</button></div>').join('');
 const history=s.history.slice(0,7).map(x=>'<div class="u4w-history"><span>'+esc(x.date)+'</span><span>'+x.produced+' / '+x.demand+' л</span><b>'+(x.shortage?'дефицит '+x.shortage+' л':'обеспечено')+'</b></div>').join('');
 w.innerHTML='<div class="u4w-wrap"><div class="u4w-head"><div><h3>Водоснабжение участка</h3><p class="muted">Колодец → насос → резерв → точки потребления. Параметры игрового моделирования.</p></div><label class="u4w-field">Исполнитель<select id="u4w-worker">'+workerOptions+'</select></label></div>'+
 '<div class="u4w-warning"><b>Важно:</b> качество воды из колодца не подтверждено анализом. Механический фильтр не делает воду автоматически питьевой. Это игровая модель, не инженерный проект для реального монтажа.</div>'+
 '<div class="u4w-metrics"><span><small>Запас воды</small><b>'+Math.round(s.storageLitres)+' / '+capacity+' л</b></span><span><small>Потребность в день</small><b>'+need+' л</b></span><span><small>Насос</small><b>'+(s.pump?s.pump.flow+' л/день':'не установлен')+'</b></span><span><small>Труба в сети / запас</small><b>'+s.pipeInstalledMeters+' / '+s.pipeStockMeters+' м</b></span></div>'+
 '<div class="u4w-grid"><section class="u4w-panel"><h4>Источник и оборудование</h4><div class="u4w-row"><span><b>Существующий колодец</b><small>Основной источник · качество неизвестно</small></span><span class="u4w-pill">Доступен</span></div>'+pump+tanks+(s.filterInstalled?'<div class="u4w-row"><b>Механический фильтр установлен</b></div>':'')+(s.dripInstalled?'<div class="u4w-row"><b>Комплект полива установлен</b></div>':'')+'<h5>Склад оборудования</h5>'+(stock||'<p class="muted">Пока пусто.</p>')+'</section>'+
 '<section class="u4w-panel"><h4>Распределение воды</h4><label class="u4w-field">Точка подключения<select id="u4w-target">'+TARGETS.map(t=>'<option value="'+t.id+'"'+(ui.target===t.id?' selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select></label><label class="u4w-field">Длина трассы, м<input id="u4w-length" type="number" min="1" max="500" step="1" value="'+esc(ui.length)+'"></label><button data-wa="connect-selected">Подключить выбранную точку</button><div>'+points+'</div></section></div>'+
 '<section class="u4w-panel"><h4>Магазин оборудования</h4><div class="u4w-catalog">'+catalog+'</div></section>'+
 '<section class="u4w-panel"><h4>Последний игровой день</h4><div class="u4w-last"><span>Подано: <b>'+s.lastDay.served+' / '+s.lastDay.demand+' л</b></span><span>Дефицит: <b>'+s.lastDay.shortage+' л</b></span><span>Резерв: <b>'+s.storageLitres+' л</b></span></div><p class="u4w-note">Расход электричества считается по условной работе насоса 2 часа в день. Последний месячный расчёт: '+rub(s.lastBill)+'. Долг: '+rub(s.energyDebt)+'.</p><h5>История подачи</h5>'+(history||'<p class="muted">Появится после смены игровых дней.</p>')+'</section>'+
 '<p class="u4w-foot">Ручной забор воды из колодца для полива: до 120 л за игровой день. Автополив требует комплекта капельного полива, подключённой садовой ветки и работающего насоса. Все нормы условные.</p></div>';
}
function click(e){
 const b=e.target.closest('[data-wa]');if(!b)return;const a=b.dataset.wa;
 if(a==='buy')buy(b.dataset.type);else if(a==='install')install(b.dataset.id);
 else if(a==='unpump')uninstallPump();else if(a==='untank')uninstallTank(Number(b.dataset.id));
 else if(a==='connect')connect(b.dataset.target,ui.length);else if(a==='disconnect')disconnect(b.dataset.target);
 else if(a==='connect-selected'){ui.target=$('u4w-target')?.value||ui.target;ui.length=$('u4w-length')?.value||ui.length;connect(ui.target,ui.length);}
 else if(a==='irrigation')toggleIrrigation();
}
function change(e){if(e.target.id==='u4w-worker')ui.worker=e.target.value;else if(e.target.id==='u4w-target')ui.target=e.target.value;else if(e.target.id==='u4w-length')ui.length=e.target.value;}
function styles(){
 if($('u4w-style'))return;const s=document.createElement('style');s.id='u4w-style';
 s.textContent=[
 '.u4w-wrap{display:grid;gap:12px}.u4w-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.u4w-head h3{margin:0 0 4px}.u4w-field{display:grid;gap:4px;font:12px Arial;color:#68583f;min-width:160px;margin:6px 0}.u4w-field select,.u4w-field input{padding:8px;border:1px solid #b9a27c;border-radius:8px;background:#fffaf0;color:#322719}.u4w-warning{background:#fff3d7;color:#6e4b1f;border:1px solid #d5b36f;border-radius:10px;padding:10px;font:12px/1.45 Arial}.u4w-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.u4w-metrics span{display:grid;gap:3px;background:#f8f0df;border:1px solid #d4c29e;border-radius:9px;padding:10px}.u4w-metrics small{font:10px Arial;color:#806c4e}.u4w-metrics b{font:bold 16px Arial;color:#4c3a27}.u4w-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}.u4w-panel{background:#f7efde;border:1px solid #cdb992;border-radius:12px;padding:12px}.u4w-panel h4{margin:0 0 9px;color:#50351f}.u4w-panel h5{margin:12px 0 5px;color:#6b5130}.u4w-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #dfd1b5;font:12px Arial}.u4w-row small{display:block;color:#806c4e;font:10px Arial;margin-top:3px}.u4w-row button,.u4w-card button{font:11px Arial;padding:7px 9px;margin:2px}.u4w-pill{font:10px Arial;padding:5px 8px;border-radius:16px;background:#e1ead8;color:#42633e}.u4w-note,.u4w-foot{font:11px/1.45 Arial;color:#77684f}.u4w-catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px}.u4w-card{display:grid;gap:6px;background:#fffaf0;border:1px solid #d8c8a7;border-radius:9px;padding:10px}.u4w-card p{font:10px/1.4 Arial;color:#806c4e;margin:0;min-height:34px}.u4w-last{display:flex;gap:14px;flex-wrap:wrap;font:11px Arial;color:#6f6047}.u4w-history{display:grid;grid-template-columns:80px 1fr 1fr;gap:8px;border-bottom:1px solid #e0d2b6;padding:5px 0;font:10px Arial;color:#74664f}@media(max-width:760px){.u4w-grid{grid-template-columns:1fr}.u4w-metrics{grid-template-columns:repeat(2,1fr)}.u4w-panel{padding:9px}}'
 ].join('');document.head.appendChild(s);
}
ensure();styles();
const tabs=$('tabs');if(tabs&&!tabs.querySelector('[data-tab="waterSystem"]')){const b=document.createElement('button');b.type='button';b.dataset.tab='waterSystem';b.textContent='Водоснабжение';tabs.appendChild(b);}
const workspace=$('workspace');if(workspace&&!workspace.dataset.u4wBound){workspace.dataset.u4wBound='1';workspace.addEventListener('click',click);workspace.addEventListener('change',change);}
const oldWorkspace=window.renderWorkspace;window.renderWorkspace=function(){if(G.tab==='waterSystem'){render();return;}if(typeof oldWorkspace==='function')oldWorkspace();};
let insideAdvance=false;
const oldAdvance=window.advanceDay;
if(typeof oldAdvance==='function'&&!window.__uilemWaterAdvanceWrapped){
 window.__uilemWaterAdvanceWrapped=true;
 window.advanceDay=function(){const before=date(),beforeMonth=month();insideAdvance=true;try{oldAdvance();}finally{insideAdvance=false;}if(date()!==before){if(month()!==beforeMonth)settleMonth(beforeMonth);dailyTick();save();if(G.tab==='waterSystem')render();}};
}
const oldNextMonth=window.nextMonth;
if(typeof oldNextMonth==='function'&&!window.__uilemWaterNextMonthWrapped){
 window.__uilemWaterNextMonthWrapped=true;
 window.nextMonth=function(){const beforeMonth=month();if(!insideAdvance){const day=n(G.day,1);for(let d=day+1;d<=30;d++){G.day=d;dailyTick();}G.day=day;}insideAdvance=true;try{oldNextMonth();}finally{insideAdvance=false;}if(month()!==beforeMonth)settleMonth(beforeMonth);dailyTick();save();if(G.tab==='waterSystem')render();};
}
window.UilemWater={catalog:C,render,buy,install,connect,disconnect,dailyTick,hasManualWater,takeManualWater,toggleIrrigation,getState:()=>G.waterSystem,getDailyDemand:demand,getTankCapacity:cap,pumpOnline:online};
save();if(G.tab==='waterSystem')render();
})();
