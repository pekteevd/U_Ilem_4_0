/* U Ilem 4.1 · Ollama bridge, common work registry, calendar and save slots. */
(function(){
'use strict';
const statusEl=document.getElementById('ollamaStatus');
const input=document.getElementById('chatInput');
let busy=false;
const esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
function setStatus(v){if(statusEl)statusEl.textContent=v;}
function seasonName(){return ['Зима','Весна','Лето','Осень'][Math.floor(((G.month||1)-1)/3)];}
function syncWorkItems(){
 if(!Array.isArray(G.tasks))G.tasks=[];
 if(!Array.isArray(G.stages))G.stages=[];
 if(!G.calendar)G.calendar={monthlyTasks:[]};
 if(!Array.isArray(G.calendar.monthlyTasks))G.calendar.monthlyTasks=[];
 G.calendar.monthlyTasks.forEach(function(t,i){
  const exists=G.tasks.some(function(x){return x.kind==='seasonal'&&String(x.title)===String(t.title)&&String(x.season||'')===String(t.season||'');});
  if(!exists)G.tasks.push({id:'cal_'+Date.now()+'_'+i,title:t.title,person:'Не назначен',object:G.selected||null,hours:1,status:t.status||'На согласовании',source:'Календарь хозяйства',materials:[],purchases:[],actions:[],priority:'Плановый',kind:'seasonal',season:t.season||seasonName()});
 });
 G.calendar.monthlyTasks=[];
 if(window.UILemWorkItems)G.workItems=window.UILemWorkItems.migrate({stages:G.stages,tasks:G.tasks,calendar:{monthlyTasks:[]}});
}
syncWorkItems();
const baseSave=window.save;
if(typeof baseSave==='function'){
 window.save=function(show){syncWorkItems();return baseSave(show);};
}
const baseRenderWorkspace=window.renderWorkspace;
if(typeof baseRenderWorkspace==='function'){
 window.renderWorkspace=function(){
  syncWorkItems();
  baseRenderWorkspace();
  if(G.tab!=='calendar')return;
  const w=document.getElementById('workspace');if(!w)return;
  const items=(G.workItems||[]).filter(function(x){return x.kind==='seasonal'&&!['done','rejected','cancelled'].includes(x.status);});
  const suggestions={
   'Зима':['Обслуживание отопления и техники','Планирование посадок и закупок','Внутренние ремонтные работы','Проверка кровель и водоотведения'],
   'Весна':['Осмотр сада после зимы','Подготовка грядок и теплицы','Посадки по погодным условиям','Обследование построек и коммуникаций'],
   'Лето':['Полив и уход за садом и огородом','Наружные строительные работы','Сбор раннего урожая','Подготовка площадок и событий'],
   'Осень':['Сбор и переработка урожая','Подготовка сада к зиме','Заготовка топлива и утепление','Консервация сезонных систем']
  }[seasonName()];
  w.innerHTML='<h3>Календарь хозяйства · '+esc(months[G.month-1])+' '+G.year+'</h3>'+
   '<div class="grid2"><div class="tile"><small>Сезон</small><b>'+seasonName()+'</b><p class="muted">'+G.day+'-й день месяца</p></div><div class="tile"><small>Единый список</small><b>'+items.length+' активных сезонных задач</b><p class="muted">Календарь и общая доска показывают одни и те же задачи.</p></div></div>'+
   '<h3>Сезонные рекомендации</h3>'+suggestions.map(function(t,i){return '<div class="row"><span>'+esc(t)+'</span><button onclick="addSeasonalWork('+i+')">В план</button></div>';}).join('')+
   '<h3>План месяца</h3>'+(items.length?items.map(function(t){return '<div class="row"><span><b>'+esc(t.title)+'</b><br><small>'+esc(t.status)+' · '+esc(t.schedule&&t.schedule.season||seasonName())+'</small></span><button onclick="removeSeasonalWork(\''+esc(t.legacyId)+'\')">Убрать</button></div>';}).join(''):'<p class="muted">План месяца пока пуст.</p>')+
   '<div class="actions"><button onclick="createSeasonalWork()">＋ Своя задача</button><button onclick="nextMonth()">Завершить месяц →</button></div>'+
   '<p class="small">Добавленные пункты сразу появляются на общей доске и сохраняются как единые записи работ.</p>';
 };
}
window.addSeasonalWork=function(i){
 const names={
 'Зима':['Обслуживание отопления и техники','Планирование посадок и закупок','Внутренние ремонтные работы','Проверка кровель и водоотведения'],
 'Весна':['Осмотр сада после зимы','Подготовка грядок и теплицы','Посадки по погодным условиям','Обследование построек и коммуникаций'],
 'Лето':['Полив и уход за садом и огородом','Наружные строительные работы','Сбор раннего урожая','Подготовка площадок и событий'],
 'Осень':['Сбор и переработка урожая','Подготовка сада к зиме','Заготовка топлива и утепление','Консервация сезонных систем']
 };
 const title=(names[seasonName()]||[])[i];if(!title)return;
 G.tasks.push({id:'cal_'+Date.now(),title:title,person:'Не назначен',object:G.selected||null,hours:1,status:'На согласовании',source:'Календарь хозяйства',materials:[],purchases:[],actions:[],priority:'Плановый',kind:'seasonal',season:seasonName()});
 save();renderWorkspace();if(typeof renderLiveTasks==='function')renderLiveTasks();
};
window.removeSeasonalWork=function(id){
 const item=(G.workItems||[]).find(function(x){return x.kind==='seasonal'&&String(x.legacyId)===String(id);});
 if(!item)return;
 G.tasks=G.tasks.filter(function(t){return String(t.id)!==String(item.legacyId);});
 save();renderWorkspace();if(typeof renderLiveTasks==='function')renderLiveTasks();
};
window.createSeasonalWork=function(){
 const title=prompt('Название сезонной задачи');if(!title||!title.trim())return;
 G.tasks.push({id:'cal_'+Date.now(),title:title.trim(),person:'Не назначен',object:G.selected||null,hours:1,status:'На согласовании',source:'Календарь хозяйства',materials:[],purchases:[],actions:[],priority:'Плановый',kind:'seasonal',season:seasonName()});
 save();renderWorkspace();if(typeof renderLiveTasks==='function')renderLiveTasks();
};
const oldLive=window.renderLiveTasks;
if(typeof oldLive==='function'){
 window.renderLiveTasks=function(){
  syncWorkItems();oldLive();
  const box=document.getElementById('liveTasks');if(!box)return;
  const stages=(G.workItems||[]).filter(function(x){return x.kind==='object_stage'&&!['done','rejected','cancelled'].includes(x.status);});
  if(!stages.length)return;
  const section=document.createElement('section');section.className='taskline';
  section.innerHTML='<b>Этапы объектов</b>'+stages.map(function(x){
   const st=(G.stages||[]).find(function(s){return String(s.id)===String(x.legacyId);});
   return '<div class="row"><span>'+esc(x.title)+'<br><small>'+esc(G.objects[x.objectId]&&G.objects[x.objectId].name||x.objectId||'Объект не указан')+' · '+(st?st.progress:0)+'%</small></span><button onclick="openStage(\''+esc(x.objectId)+'\',\''+esc(x.legacyId)+'\')">Открыть этап</button></div>';
  }).join('');
  box.appendChild(section);
 };
}
window.openSaveSlots=function(){
 const slots=[1,2,3].map(function(n){
  const raw=localStorage.getItem('uilem4_1_slot_'+n);let label='Пусто';
  try{const d=JSON.parse(raw);label=d.savedAt?new Date(d.savedAt).toLocaleString('ru-RU'):'Сохранение есть';}catch(e){}
  return '<div class="row"><span><b>Ячейка '+n+'</b><br><small>'+esc(label)+'</small></span><div class="actions"><button onclick="saveManualSlot('+n+')">Сохранить</button><button onclick="loadManualSlot('+n+')">Загрузить</button></div></div>';
 }).join('');
 modal('<h2>Ручные сохранения</h2><p class="muted">Автосохранение работает отдельно. Ручные ячейки не перезаписывают друг друга.</p>'+slots+'<div class="actions"><button onclick="exportGameBackup()">Экспорт резервной копии</button><button onclick="closeModal()">Закрыть</button></div>');
};
window.saveManualSlot=function(n){
 if(![1,2,3].includes(Number(n)))return;
 syncWorkItems();
 const payload={gameId:'u-ilem',build:'4.1',savedAt:new Date().toISOString(),state:G};
 localStorage.setItem('uilem4_1_slot_'+n,JSON.stringify(payload));
 if(typeof toast==='function')toast('Сохранено в ручную ячейку '+n);
 window.openSaveSlots();
};
window.loadManualSlot=function(n){
 if(![1,2,3].includes(Number(n)))return;
 let payload;try{payload=JSON.parse(localStorage.getItem('uilem4_1_slot_'+n)||'null');}catch(e){}
 if(!payload||payload.gameId!=='u-ilem'||!payload.state)return toast('В этой ячейке нет подходящего сохранения.');
 if(!confirm('Загрузить ячейку '+n+'? Текущее состояние останется в автосохранении до следующего сохранения.'))return;
 try{G=typeof migrateGame==='function'?migrateGame(payload.state):payload.state;syncWorkItems();save();closeModal();render();renderLiveTasks();toast('Сохранение загружено.');}
 catch(e){console.error(e);toast('Не удалось загрузить сохранение: '+e.message);}
};
window.exportGameBackup=function(){
 try{
  syncWorkItems();
  const blob=new Blob([JSON.stringify({gameId:'u-ilem',build:'4.1',savedAt:new Date().toISOString(),state:G},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='U_Ilem_4_1_backup.json';a.click();URL.revokeObjectURL(url);
 }catch(e){toast('Не удалось создать резервную копию.');}
};
const schema={type:'object',properties:{
 reply:{type:'string'},
 tasks:{type:'array',minItems:3,maxItems:8,items:{type:'object',properties:{
  title:{type:'string'},object:{type:'string'},hours:{type:'number',minimum:.5,maximum:80},
  priority:{type:'string',enum:['Срочная','Обычная','Плановая']},
  materials:{type:'array',items:{type:'object',properties:{name:{type:'string'},qty:{type:'number',minimum:0}},required:['name','qty']}}
 },required:['title','object','hours','priority','materials']}}
},required:['reply','tasks']};
function gameContext(){
 return {date:{day:G.day,month:G.month,year:G.year,season:seasonName()},selectedObject:G.selected,
  objects:Object.entries(G.objects||{}).map(function(pair){return {id:pair[0],name:pair[1].name,condition:pair[1].condition,state:pair[1].state};}),
  people:(G.people||[]).map(function(p){return {id:p.id,name:p.name,role:p.role,skill:p.skill,freeHours:p.hours,energy:p.energy};}),
  inventory:(G.inventory||[]).map(function(x){return {name:x.name,qty:x.qty,unit:x.unit,category:x.cat,price:x.price};}),
  activeTasks:(G.tasks||[]).filter(function(t){return !['Выполнена','Отклонена','Отменена'].includes(t.status);}).slice(-40).map(function(t){return {title:t.title,status:t.status,person:t.person,object:t.object,hours:t.hours};})};
}
function parseJson(raw){
 let s=String(raw||'').trim();s=s.replace(new RegExp(String.fromCharCode(96),'g'),'').replace(/^json\s*/i,'');
 const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a<0||b<a)throw new Error('Модель не вернула JSON.');return JSON.parse(s.slice(a,b+1));
}
window.checkOllamaStatus=async function(){
 setStatus('Проверяю Ollama…');
 try{
  const r=await fetch('/api/ollama/status',{cache:'no-store'}),d=await r.json();
  if(d.available&&d.modelReady)setStatus('● Ollama готова · '+d.model);
  else if(d.available)setStatus('! Ollama запущена, но модель '+d.model+' не установлена');
  else setStatus('○ Ollama недоступна · '+(d.error||'проверьте запуск приложения'));
  return d;
 }catch(e){setStatus('○ Локальный сервер игры недоступен');return {available:false,error:e.message};}
};
window.sendCommand=async function(){
 if(busy)return;const text=input&&input.value.trim();if(!text)return;
 const button=document.querySelector('#taskChat .chatinput button');
 busy=true;if(input)input.disabled=true;if(button)button.disabled=true;setStatus('Поручение отправлено модели…');
 try{
  const payload={model:'qwen3:4b',stream:false,format:schema,messages:[
   {role:'system',content:'Ты локальный помощник игры У Илем. Разбей поручение на 3–8 конкретных последовательных задач. Используй только object id из контекста. Если объект неясен, используй selectedObject. Не выдумывай ресурсы и наличие материалов. Верни только JSON по схеме. Ничего не утверждай и не выполняй.'},
   {role:'user',content:'Поручение: '+text+'\nКонтекст игры: '+JSON.stringify(gameContext())}
  ]};
  const r=await fetch('/api/ollama/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await r.json();if(!r.ok)throw new Error(data.error||data.detail||'Ollama HTTP '+r.status);
  const result=parseJson(data.message&&data.message.content||data.response||'');
  const validation=window.UILemWorkItems?UILemWorkItems.validate(result.tasks,Object.entries(G.objects||{}).map(function(x){return {id:x[0]};})):{ok:Array.isArray(result.tasks)&&result.tasks.length>=3,errors:[]};
  if(!validation.ok)throw new Error(validation.errors.join(' '));
  const drafts=result.tasks.map(function(t,i){
   const title=String(t.title).trim(),object=t.object,hours=Number(t.hours);
   const need=(t.materials||[]).filter(function(m){return String(m.name||'').trim()&&Number(m.qty)>0;}).map(function(m){return [String(m.name).trim(),Number(m.qty)];});
   const spec={title:title,description:title,effort:{estimateHours:hours,requiredSkill:1}};
   const choice=window.UILemWorkItems?UILemWorkItems.chooseAssignee(spec,(G.people||[]).map(function(p){return {id:p.id,role:p.role,skill:p.skill,hours:p.hours};})).assigneeId:null;
   const person=(G.people||[]).find(function(p){return p.id===choice;});
   const purchases=need.map(function(m){const stock=(G.inventory||[]).find(function(x){return x.name.toLowerCase()===m[0].toLowerCase();});return {name:m[0],qty:m[1],price:stock?stock.price:0};});
   return {id:'ai_'+Date.now()+'_'+i,title:title,person:person?person.name:'Не назначен',personId:person?person.id:null,object:object,hours:hours,status:'На согласовании',source:text,materials:need,purchases:purchases,actions:[],priority:t.priority||'Обычная',kind:'task',aiGenerated:true};
  });
  G.tasks.push.apply(G.tasks,drafts);
  if(typeof addChat==='function'){addChat('Дмитрий',text);addChat('Команда',String(result.reply||'План подготовлен.'));addChat('У Илем','Создано '+drafts.length+' черновых задач. Они ждут утверждения. Ресурсы и деньги не списывались.','system');}
  if(typeof log==='function')log('Ollama подготовила '+drafts.length+' задач: '+text);
  if(input)input.value='';save();renderLiveTasks();renderTasks();renderWorkspace();if(typeof renderChat==='function')renderChat();
  setStatus('● Ответ получен · '+(data.model||'qwen3:4b'));
 }catch(e){
  setStatus('! Ollama не подготовила план');
  if(typeof addChat==='function')addChat('У Илем','Не удалось создать черновики через Ollama: '+e.message+'. Проверьте, что Ollama запущена и модель qwen3:4b установлена.','system');
  console.error('У Илем 4.1 AI:',e);
 }finally{busy=false;if(input)input.disabled=false;if(button)button.disabled=false;}
};
syncWorkItems();
if(typeof window.renderLiveTasks==='function')window.renderLiveTasks();
if(typeof window.checkOllamaStatus==='function')window.checkOllamaStatus();
})();