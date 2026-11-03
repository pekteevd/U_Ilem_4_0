/* У Илем 4.0 — единая связь календаря и общей доски задач. */
(function(){
'use strict';
if(typeof G==='undefined'||!G||typeof save!=='function')return;
G.tasks=Array.isArray(G.tasks)?G.tasks:[];
G.calendar=G.calendar&&typeof G.calendar==='object'?G.calendar:{};
G.calendar.monthlyTasks=Array.isArray(G.calendar.monthlyTasks)?G.calendar.monthlyTasks:[];
const SEASONS=['Зима','Весна','Лето','Осень'];
const JOBS={
 'Зима':['Обслуживание отопления и техники','Планирование посадок и закупок','Внутренние ремонтные работы','Проверка кровель и водоотведения'],
 'Весна':['Осмотр сада после зимы','Подготовка грядок и теплицы','Посадки по погодным условиям','Обследование построек и коммуникаций'],
 'Лето':['Полив и уход за садом и огородом','Наружные строительные работы','Сбор раннего урожая','Подготовка площадок и событий'],
 'Осень':['Сбор и переработка урожая','Подготовка сада к зиме','Заготовка топлива и утепление','Консервация сезонных систем']
};
const $=id=>document.getElementById(id);
const h=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const month=()=>Math.max(1,Number(G.month)||1);
const year=()=>Math.max(1,Number(G.year)||1);
const season=()=>SEASONS[Math.min(3,Math.floor((month()-1)/3))];
const date=()=>[G.day||1,month(),year()].join('.');
function nextId(){
 const ids=G.tasks.map(t=>Number(t&&t.id)||0);
 return Math.max(Date.now(),0,...ids)+1;
}
function tell(message){if(typeof toast==='function')toast(message);}
function refresh(){
 save();
 if(typeof window.renderLiveTasks==='function')window.renderLiveTasks();
 if(typeof renderTasks==='function')renderTasks();
 if(typeof window.renderWorkspace==='function')window.renderWorkspace();
}
function migrateLegacy(){
 if(G.calendar.monthlyTasksMigrated)return false;
 let changed=false;
 G.calendar.monthlyTasks.forEach((item,index)=>{
  const title=String(item&&item.title||'').trim();
  if(!title)return;
  const key='legacy-calendar:'+year()+':'+month()+':'+index+':'+title;
  if(G.tasks.some(t=>t.calendarKey===key))return;
  G.tasks.push({
   id:nextId(),title,person:String(item.person||G.people?.[0]?.name||'Дмитрий'),
   object:item.object||null,hours:Math.max(.1,Number(item.hours)||1),
   status:item.status||'На согласовании',source:'Календарь · перенос старого плана',
   actions:[{title,done:false}],purchases:[],priority:item.priority||'Плановый',
   calendarKey:key,calendarMonth:month(),calendarYear:year(),calendarSeason:item.season||season(),
   createdAt:date()
  });
  changed=true;
 });
 G.calendar.monthlyTasksMigrated=true;
 if(changed)save();
 return changed;
}
function taskKey(index,title){
 return 'calendar:'+year()+':'+month()+':'+index+':'+title;
}
function addTask(index){
 const list=JOBS[season()],title=list&&list[index];
 if(!title)return false;
 const key=taskKey(index,title);
 if(G.tasks.some(t=>t.calendarKey===key)){
  tell('Эта рекомендация уже добавлена в план.');
  return false;
 }
 const task={
  id:nextId(),title,person:String(G.people?.[0]?.name||'Дмитрий'),
  object:null,
  hours:1,status:'На согласовании',
  source:'Календарь · сезонная рекомендация · '+season(),
  actions:[{title,done:false}],purchases:[],priority:'Плановый',notes:'',
  calendarKey:key,calendarMonth:month(),calendarYear:year(),calendarSeason:season(),
  createdAt:date()
 };
 G.tasks.push(task);
 refresh();
 tell('Задача добавлена в общий план и на доску задач.');
 return task.id;
}
function removeTask(id){
 const task=G.tasks.find(t=>Number(t.id)===Number(id));
 if(!task||!task.calendarKey)return false;
 if(task.status==='Выполнена')return false;
 task.status='Отклонена';
 task.calendarRemovedAt=date();
 refresh();
 tell('Задача убрана из плана. Запись сохранена в истории.');
 return true;
}
function createTask(){
 const title=typeof prompt==='function'?prompt('Название задачи на этот месяц'):'';
 if(!title||!String(title).trim())return false;
 const key='calendar:custom:'+year()+':'+month()+':'+String(title).trim().toLowerCase();
 if(G.tasks.some(t=>t.calendarKey===key)){tell('Такая задача уже есть в плане месяца.');return false;}
 const task={
  id:nextId(),title:String(title).trim(),person:String(G.people?.[0]?.name||'Дмитрий'),
  object:G.objects&&G.objects[G.selected]?G.selected:null,hours:1,status:'На согласовании',
  source:'Календарь · пользовательская задача',actions:[{title:String(title).trim(),done:false}],
  purchases:[],priority:'Плановый',notes:'',calendarKey:key,calendarMonth:month(),
  calendarYear:year(),calendarSeason:season(),createdAt:date()
 };
 G.tasks.push(task);refresh();tell('Задача добавлена на общую доску.');return task.id;
}
function render(){
 const w=$('workspace');if(!w)return;
 const current=G.tasks.filter(t=>t.calendarKey&&Number(t.calendarMonth)===month()&&Number(t.calendarYear)===year()&&t.status!=='Отклонена');
 const visibleKeys=new Set(current.map(t=>t.calendarKey));
 const recommendations=JOBS[season()].map((title,index)=>({title,index,key:taskKey(index,title)})).filter(x=>!visibleKeys.has(x.key));
 const recHtml=recommendations.length?recommendations.map(x=>'<div class="row"><span>'+h(x.title)+'</span><button onclick="ilemAddCalendarTask('+x.index+')">В план</button></div>').join(''):'<p class="muted">Все сезонные рекомендации уже добавлены в план.</p>';
 const taskHtml=current.length?current.map(t=>'<div class="row"><span><b>'+h(t.title)+'</b><br><small>'+h(t.status||'На согласовании')+' · '+h(t.person||'Исполнитель не назначен')+' · '+h(t.hours||1)+' ч</small></span><span class="actions"><button onclick="openTaskReview('+Number(t.id)+')">Открыть</button>'+(t.status==='Выполнена'?'':'<button onclick="ilemRemoveCalendarTask('+Number(t.id)+')">Убрать</button>')+'</span></div>').join(''):'<p class="muted">План месяца пока пуст. Добавь сезонную рекомендацию или свою задачу.</p>';
 w.innerHTML='<h3>Календарь хозяйства · '+h((typeof months!=='undefined'&&months[month()-1])||month())+', '+year()+' год</h3>'+
  '<div class="grid2"><div class="tile"><small>Сезон</small><b>'+season()+'</b><p class="muted">'+(G.day||1)+'-й день месяца из 30</p></div><div class="tile"><small>Планирование</small><b>Единый список задач</b><p class="muted">Задачи календаря сразу появляются на общей доске. Выполнение и закупки подтверждаются отдельно.</p></div></div>'+
  '<h3>Сезонные рекомендации</h3>'+recHtml+
  '<h3>План месяца · '+current.length+'</h3>'+taskHtml+
  '<div class="actions"><button onclick="ilemCreateCalendarTask()">＋ Своя задача</button><button onclick="nextMonth()">Завершить месяц →</button></div>'+
  '<p class="small">Добавленная рекомендация исчезает из списка предложений и остаётся одной записью в календаре и общей доске задач.</p>';
}
migrateLegacy();
const previousWorkspace=window.renderWorkspace;
window.renderWorkspace=function(){
 if(G.tab==='calendar'){render();return;}
 if(typeof previousWorkspace==='function')return previousWorkspace.apply(this,arguments);
};
window.ilemAddCalendarTask=addTask;
window.ilemRemoveCalendarTask=removeTask;
window.ilemCreateCalendarTask=createTask;
const previousApprove=window.ilemApproveTask;
if(typeof previousApprove==='function')window.ilemApproveTask=function(id){const result=previousApprove(id);if(G.tab==='calendar')render();return result;};
const previousReject=window.ilemRejectTask;
if(typeof previousReject==='function')window.ilemRejectTask=function(id){const result=previousReject(id);if(G.tab==='calendar')render();return result;};
const previousExecute=window.ilemExecuteTask;
if(typeof previousExecute==='function')window.ilemExecuteTask=function(id){const result=previousExecute(id);if(G.tab==='calendar')render();return result;};
window.UilemCalendarTasks={render,addTask,removeTask,createTask,migrateLegacy,getTasks:()=>G.tasks.filter(t=>t.calendarKey)};
if(G.tab==='calendar')render();
})();