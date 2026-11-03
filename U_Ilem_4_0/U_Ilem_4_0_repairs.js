/* У Илем 4.0: исправление карты, календаря и привязки этапов. */
(function(){
'use strict';
if(typeof G==='undefined'||!G)return;
window.G=G;
const $=s=>document.querySelector(s),byId=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toastMsg=s=>{if(typeof toast==='function')toast(s);};
const arr=k=>Array.isArray(G[k])?G[k]:(G[k]=[]);
const uid=()=>Math.max(Date.now(),...arr('tasks').map(x=>Number(x.id)||0),...arr('stages').map(x=>Number(x.id)||0))+1;
function saveNow(){if(typeof save==='function')save();if(typeof renderStats==='function')renderStats();}
function season(){return ['Зима','Весна','Лето','Осень'][Math.floor(((Number(G.month)||1)-1)/3)];}

/* Календарная запись и общая задача получают один ID. */
function calendarRecords(){
 G.calendar=G.calendar&&typeof G.calendar==='object'?G.calendar:{};
 const records=Array.isArray(G.calendar.monthlyTasks)?G.calendar.monthlyTasks:(G.calendar.monthlyTasks=[]);
 let changed=false;
 records.forEach(r=>{
  if(!r||!r.title)return;
  let t=r.taskId!=null?arr('tasks').find(x=>String(x.id)===String(r.taskId)):null;
  if(!t)t=arr('tasks').find(x=>x.source==='Календарь хозяйства'&&x.title===r.title&&Number(x.calendarMonth||G.month)===Number(r.month||G.month)&&Number(x.calendarYear||G.year)===Number(r.year||G.year));
  if(!t){t={id:uid(),title:r.title,person:'Дмитрий',object:G.selected||null,hours:.5,status:r.status||'На согласовании',source:'Календарь хозяйства',season:r.season||season(),priority:'Плановый',actions:[{title:r.title,done:false}],purchases:[],calendarMonth:r.month||G.month,calendarYear:r.year||G.year};arr('tasks').push(t);changed=true;}
  if(String(r.taskId)!==String(t.id)){r.taskId=t.id;changed=true;}
  if(!r.month){r.month=G.month;changed=true;}if(!r.year){r.year=G.year;changed=true;}
 });
 if(changed)saveNow();
 return records;
}
function addCalendarTask(title,seasonName){
 title=String(title||'').trim();if(!title)return false;
 const records=calendarRecords();
 if(records.some(r=>r.title===title&&Number(r.month||G.month)===Number(G.month)&&Number(r.year||G.year)===Number(G.year))){toastMsg('Эта задача уже есть в плане месяца.');return false;}
 const id=uid(),s=seasonName||season();
 arr('tasks').push({id,title,person:'Дмитрий',object:G.selected||null,hours:.5,status:'На согласовании',source:'Календарь хозяйства',season:s,priority:'Плановый',actions:[{title,done:false}],purchases:[],calendarMonth:G.month,calendarYear:G.year});
 records.push({id:'calendar_'+id,taskId:id,title,season:s,status:'На согласовании',month:G.month,year:G.year});
 saveNow();if(typeof renderLiveTasks==='function')renderLiveTasks();window.renderWorkspace?.();return id;
}
function removeCalendarTask(i){
 const records=calendarRecords(),r=records[i];if(!r)return;
 records.splice(i,1);const t=arr('tasks').find(x=>String(x.id)===String(r.taskId));
 if(t&&!['Выполнена','Отклонена'].includes(t.status)){t.status='Снята с плана';t.calendarRemovedAt=[G.day,G.month,G.year].join('.');}
 saveNow();if(typeof renderLiveTasks==='function')renderLiveTasks();window.renderWorkspace?.();
}
function hideScheduled(){
 const root=byId('workspace');if(!root)return;
 const titles=new Set(calendarRecords().map(r=>String(r.title||'').trim()));
 const h3=Array.from(root.querySelectorAll('h3')).find(x=>x.textContent.includes('Сезонные рекомендации'));if(!h3)return;
 let node=h3.nextElementSibling,hidden=0;
 while(node&&node.tagName!=='H3'){const label=node.querySelector('span');if(label&&titles.has(label.textContent.trim())){const next=node.nextElementSibling;node.remove();node=next;hidden++;}else node=node.nextElementSibling;}
 if(hidden&&(!h3.nextElementSibling||h3.nextElementSibling.tagName==='H3')){const p=document.createElement('p');p.className='small';p.textContent='Все сезонные рекомендации уже добавлены в план.';h3.after(p);}
}

/* Просмотр этапа по ID, без переключения на чужой объект. */
function openStageById(id){
 const s=arr('stages').find(x=>String(x.id)===String(id));if(!s)return toastMsg('Этап не найден.');
 const need=(s.need||[]).map(p=>{const i=arr('inventory').find(x=>x.name===p[0]);return '<div class="row"><span>'+esc(p[0])+': нужно '+Number(p[1])+'</span><b>'+Number(i&&i.qty||0)+' в наличии</b></div>';}).join('');
 const html='<h2>'+esc(s.title)+'</h2><div class="tile"><small>Трудоёмкость</small><b>'+esc(s.hours||0)+' ч</b> · навык '+esc(s.skill||1)+'/5</div><h3>Материалы</h3>'+need+
 '<div class="row"><span>Дополнительные расходы</span><b>'+(typeof money==='function'?money(s.cost||0):s.cost||0)+'</b></div>'+
 '<label class="field">Исполнитель<select id="stagePerson">'+arr('people').map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+esc(p.hours)+' ч</option>').join('')+'</select></label>'+
 '<label class="field">Материалы<select id="stageMode"><option value="stock">Только склад</option><option value="buy">Докупить недостающее</option></select></label>'+
 '<div class="actions"><button onclick="closeModal()">Отмена</button><button onclick="executeStage('+Number(s.id)+')">Выполнить этап</button></div>';
 if(typeof modal==='function')modal(html);
}
function openObjectStages(key){
 key=key||G.selected;const o=G.objects&&G.objects[key];if(!o)return toastMsg('Сначала выбери объект на карте.');
 const stages=arr('stages').filter(s=>String(s.object)===String(key));
 const rows=stages.length?stages.map(s=>'<div class="row"><span><b>'+esc(s.title)+'</b><br><small>'+Number(s.progress||0)+'% · '+Number(s.hours||0)+' ч</small></span><button '+(s.progress>=100?'disabled':'')+' onclick="openStageById('+Number(s.id)+')">Открыть</button></div>').join(''):'<p class="muted">У этого объекта пока нет этапов.</p>';
 if(typeof modal==='function')modal('<h2>Работы: '+esc(o.name)+'</h2><p class="small">Здесь отображаются только этапы выбранного объекта.</p>'+rows+'<div class="actions"><button onclick="closeModal()">Закрыть</button><button onclick="openNewStageForObject(\''+esc(String(key))+'\')">＋ Новый этап</button></div>');
}
function openNewStage(key){
 key=key||G.selected;const o=G.objects&&G.objects[key];if(!o)return;
 if(typeof modal==='function')modal('<h2>Новый этап · '+esc(o.name)+'</h2><label class="field">Название<input id="newStageTitle" placeholder="Например, заменить окна"></label><div class="grid2"><label class="field">Часы<input id="newStageHours" type="number" value="8" min=".1" step=".1"></label><label class="field">Навык 1–5<input id="newStageSkill" type="number" value="1" min="1" max="5"></label><label class="field">Расходы, ₽<input id="newStageCost" type="number" value="0" min="0"></label></div><p class="small">Объект уже привязан: '+esc(o.name)+'.</p><div class="actions"><button onclick="closeModal()">Отмена</button><button onclick="createStageForObject(\''+esc(String(key))+'\')">Создать этап</button></div>');
}
function createStage(key){
 const title=(byId('newStageTitle')&&byId('newStageTitle').value||'').trim();if(!title)return toastMsg('Введи название этапа.');
 arr('stages').push({id:uid(),title,object:key,progress:0,need:[],hours:Math.max(.1,Number(byId('newStageHours')&&byId('newStageHours').value)||8),cost:Math.max(0,Number(byId('newStageCost')&&byId('newStageCost').value)||0),skill:Math.max(1,Math.min(5,Number(byId('newStageSkill')&&byId('newStageSkill').value)||1))});
 saveNow();if(typeof closeModal==='function')closeModal();if(typeof render==='function')render();openObjectStages(key);
}
function renderBuild(){
 const root=byId('workspace');if(!root)return;const key=G.workFilterObject||null;
 const stages=arr('stages').filter(s=>!key||String(s.object)===String(key));
 const title=key&&G.objects[key]?'Работы: '+G.objects[key].name:'Строительство и восстановление';
 const rows=stages.length?stages.map(s=>'<div class="row"><span><b>'+esc(s.title)+'</b><br><small>'+esc(G.objects[s.object]&&G.objects[s.object].name||'Объект не указан')+' · '+Number(s.hours||0)+' ч · '+Number(s.progress||0)+'%</small></span><button '+(s.progress>=100?'disabled':'')+' onclick="openStageById('+Number(s.id)+')">'+(s.progress>=100?'Готово':'Открыть этап')+'</button></div>').join(''):'<p class="muted">Для этого объекта пока нет этапов.</p>';
 root.innerHTML='<h3>'+esc(title)+'</h3>'+rows+'<div class="actions">'+(key?'<button onclick="clearObjectWorkFilter()">Все объекты</button>':'')+'<button onclick="openNewStageForObject(\''+esc(String(key||G.selected||''))+'\')">＋ Новый этап</button></div>';
}
window.openStageById=openStageById;window.openObjectStages=openObjectStages;window.openNewStageForObject=openNewStage;window.createStageForObject=createStage;
window.openStage=function(key){openObjectStages(key||G.selected);};
window.showObjectWorks=function(){G.workFilterObject=G.selected||null;G.tab='build';window.renderWorkspace?.();};
window.clearObjectWorkFilter=function(){G.workFilterObject=null;window.renderWorkspace?.();};

const oldObject=window.renderObject;
if(typeof oldObject==='function')window.renderObject=function(){
 oldObject();const el=byId('objectDetail');if(!el)return;const buttons=Array.from(el.querySelectorAll('button'));
 if(buttons[0])buttons[0].setAttribute('onclick','openObjectStages()');
 if(buttons[1])buttons[1].setAttribute('onclick','showObjectWorks()');
 if(!el.querySelector('[data-open-inspection]')){const b=document.createElement('button');b.type='button';b.dataset.openInspection='1';b.textContent='Осмотр и дефекты';b.onclick=()=>{G.tab='inspection';window.renderWorkspace?.();};const actions=el.querySelector('.actions');if(actions)actions.appendChild(b);}
};
const oldWorkspace=window.renderWorkspace;
window.renderWorkspace=function(){
 calendarRecords();if(typeof oldWorkspace==='function')oldWorkspace();
 if(G.tab==='calendar')hideScheduled();
 if(G.tab==='build')renderBuild();
 if(G.tab==='inspection'&&typeof window.renderInspectionWorkspace==='function')window.renderInspectionWorkspace();
 if(G.tab==='warehouse'&&typeof window.addConsolidatedPurchaseButton==='function')window.addConsolidatedPurchaseButton();
};
const css=document.createElement('style');
css.textContent='#scene::after{animation:none!important;background:linear-gradient(180deg,#14241412,#13211500 55%,#14241422)!important;pointer-events:none!important}#scene .camera-layer>img{animation:none!important}#scene .weatherfx,#scene .weatherfx *{pointer-events:none!important}#scene .hotspot{pointer-events:auto!important;z-index:10!important}#scene .camera-layer{pointer-events:auto!important}';
(document.head||document.documentElement).appendChild(css);

/* Единая точка обработки кликов по карте. */
const scene=byId('scene');
if(scene)scene.addEventListener('click',function(e){
 const marker=e.target.closest('#scene .hotspot');
 if(marker){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(G.plotSelection){toastMsg('Сначала выбери свободное место, а не существующий объект.');return;}const key=marker.dataset.object;if(G.objects&&G.objects[key]){G.selected=key;saveNow();if(typeof renderScene==='function')renderScene();if(typeof renderObject==='function')renderObject();}return;}
 if(G.plotSelection&&!e.target.closest('button')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const layer=scene.querySelector('.camera-layer')||scene,r=layer.getBoundingClientRect();if(!r.width||!r.height)return;const x=Math.max(1,Math.min(99,(e.clientX-r.left)/r.width*100)),y=Math.max(1,Math.min(99,(e.clientY-r.top)/r.height*100)),p=G.plotSelection;if(typeof window.addBuildingAt==='function')window.addBuildingAt(p.plot,p.type,x,y);else toastMsg('Инструмент размещения недоступен.');}
},true);

/* Добавляем календарные действия после загрузки базовых обработчиков. */
window.ilemAddCalendarTask=function(i){
 const sets={'Зима':['Обслуживание отопления и техники','Планирование посадок и закупок','Внутренние ремонтные работы','Проверка кровель и водоотведения'],'Весна':['Осмотр сада после зимы','Подготовка грядок и теплицы','Посадки по погодным условиям','Обследование построек и коммуникаций'],'Лето':['Полив и уход за садом и огородом','Наружные строительные работы','Сбор раннего урожая','Подготовка площадок и событий'],'Осень':['Сбор и переработка урожая','Подготовка сада к зиме','Заготовка топлива и утепление','Консервация сезонных систем']};
 const title=(sets[season()]||[])[Number(i)];if(title)addCalendarTask(title,season());else toastMsg('Не удалось определить сезонную рекомендацию.');
};
window.ilemCreateCalendarTask=function(){const title=prompt('Название сезонной задачи');if(title)addCalendarTask(title,season());};
window.ilemRemoveCalendarTask=removeCalendarTask;
const oldOpenTaskReview=window.openTaskReview;
if(typeof oldOpenTaskReview==='function')window.openTaskReview=function(id){if(!arr('tasks').some(t=>String(t.id)===String(id))){toastMsg('Задача не найдена.');return;}return oldOpenTaskReview(id);};
window.UilemRepairs={calendarRecords,addCalendarTask,removeCalendarTask,openObjectStages,openStageById};
if(typeof renderLiveTasks==='function')renderLiveTasks();
})();