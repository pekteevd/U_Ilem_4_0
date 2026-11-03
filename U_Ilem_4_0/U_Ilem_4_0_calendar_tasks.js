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
 const people=(G.people||[]).map(p=>'<option value="'+h(p.name)+'">'+h(p.name)+'</option>').join('');
 const objects=Object.entries(G.objects||{}).map(([id,o])=>'<option value="'+h(id)+'"'+(id===G.selected?' selected':'')+'>'+h(o.name||id)+'</option>').join('');
 const stages=(G.stages||[]).map(s=>'<option value="'+h(String(s.id))+'">'+h(s.title)+' · '+h(objectNameForTask(s.object))+'</option>').join('');
 const html='<h2>Новая задача</h2><label class="field">Название<input id="ilemNewTaskTitle" placeholder="Что нужно сделать"></label><label class="field">Описание<textarea id="ilemNewTaskDescription" rows="3"></textarea></label><div class="grid2"><label class="field">Объект<select id="ilemNewTaskObject"><option value="">Без привязки</option>'+objects+'</select></label><label class="field">Ответственный<select id="ilemNewTaskPerson">'+people+'</select></label><label class="field">Срок<input id="ilemNewTaskDue" placeholder="день.месяц.год"></label><label class="field">Приоритет<select id="ilemNewTaskPriority"><option>Плановый</option><option>Низкий</option><option>Высокий</option><option>Срочный</option></select></label><label class="field">Трудоёмкость, ч<input id="ilemNewTaskHours" type="number" min="0" value="1"></label><label class="field">Связанный этап<select id="ilemNewTaskStage"><option value="">Без отдельного этапа</option>'+stages+'</select></label></div><label class="field">Материалы и ресурсы<textarea id="ilemNewTaskResources" rows="3" placeholder="Доска: 4\nКраска: 1"></textarea></label><div class="actions"><button onclick="closeModal()">Отмена</button><button onclick="ilemSaveNewTask()">Создать задачу</button></div>';
 if(typeof window.modal==='function')window.modal(html);else if(typeof modal==='function')modal(html);
 return true;
}
function saveNewTask(){
 const val=id=>$(id)?.value??'',title=String(val('ilemNewTaskTitle')).trim();if(!title){tell('Введи название задачи.');return false;}
 const resources=String(val('ilemNewTaskResources')).split(/\r?\n/).map(line=>{const m=line.match(/^(.+?)\s*:\s*(\d+(?:[.,]\d+)?)$/);return m?{name:m[1].trim(),qty:Number(m[2].replace(',','.'))}:null;}).filter(Boolean);
 const task={id:nextId(),title,description:String(val('ilemNewTaskDescription')),notes:String(val('ilemNewTaskDescription')),person:String(val('ilemNewTaskPerson'))||'Не назначен',responsible:String(val('ilemNewTaskPerson'))||'Не назначен',object:String(val('ilemNewTaskObject'))||null,dueDate:String(val('ilemNewTaskDue')).trim()||null,priority:String(val('ilemNewTaskPriority'))||'Плановый',hours:Math.max(0,num(val('ilemNewTaskHours'),1)),stageId:String(val('ilemNewTaskStage'))||null,resources,materials:resources.map(x=>[x.name,x.qty]),status:'На согласовании',source:'Календарь · пользовательская задача',actions:[],purchases:[],calendarKey:'calendar:custom:'+year()+':'+month()+':'+title.toLowerCase(),calendarMonth:month(),calendarYear:year(),calendarSeason:season(),createdAt:date()};
 if(G.tasks.some(t=>t.calendarKey===task.calendarKey)){tell('Такая задача уже есть в плане месяца.');return false;}
 G.tasks.push(task);save();if(typeof window.closeModal==='function')window.closeModal();refresh();tell('Задача создана и добавлена на общую доску.');return task.id;
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

function objectNameForTask(id){return G.objects&&G.objects[id]?G.objects[id].name:String(id||'Объект');}
function openTaskReview(id){
 const t=G.tasks.find(x=>String(x.id)===String(id));if(!t){tell('Задача не найдена.');return false;}
 const objects=Object.entries(G.objects||{}).map(([key,o])=>'<option value="'+h(key)+'"'+(String(t.object||'')===String(key)?' selected':'')+'>'+h(o.name||key)+'</option>').join('');
 const people=(G.people||[]).map(p=>'<option value="'+h(p.name)+'"'+(String(t.person||'')===String(p.name)?' selected':'')+'>'+h(p.name)+'</option>').join('');
 const statuses=['На согласовании','Запланирована','В работе','Отложена','Выполнена','Отклонена'];
 const statusHtml=statuses.map(x=>'<option'+(String(t.status||'На согласовании')===x?' selected':'')+'>'+x+'</option>').join('');
 const stages=(G.stages||[]).map(s=>'<option value="'+h(String(s.id))+'"'+(String(t.stageId||'')===String(s.id)?' selected':'')+'>'+h(s.title)+' · '+h(objectNameForTask(s.object))+'</option>').join('');
 const resourceText=(t.resources||t.materials||[]).map(x=>Array.isArray(x)?x[0]+': '+x[1]:x.name+': '+x.qty).join('\n');
 const participants=(G.people||[]).map(p=>'<option value="'+h(p.name)+'"'+((t.participants||[]).includes(p.name)?' selected':'')+'>'+h(p.name)+'</option>').join('');
 const dateValue=String(t.dueDate||'');
 const html='<h2>Задача</h2><p class="muted">Единая запись задачи. Изменения здесь отражаются в календаре и общей доске.</p>'+
 '<label class="field">Название<input id="ilemTaskTitle" value="'+h(t.title||'')+'"></label>'+
 '<label class="field">Описание<textarea id="ilemTaskDescription" rows="3">'+h(t.description||t.notes||'')+'</textarea></label>'+
 '<div class="grid2"><label class="field">Объект<select id="ilemTaskObject"><option value="">Без привязки</option>'+objects+'</select></label>'+
 '<label class="field">Исполнитель<select id="ilemTaskPerson">'+people+'</select></label>'+
 '<label class="field">Срок<input id="ilemTaskDue" type="text" placeholder="день.месяц.год" value="'+h(dateValue)+'"></label>'+
 '<label class="field">Приоритет<select id="ilemTaskPriority">'+['Низкий','Плановый','Высокий','Срочный'].map(x=>'<option'+(String(t.priority||'Плановый')===x?' selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
 '<label class="field">Статус<select id="ilemTaskStatus">'+statusHtml+'</select></label>'+
 '<label class="field">Трудоёмкость, ч<input id="ilemTaskHours" type="number" min="0" step="0.5" value="'+Math.max(0,num(t.hours,1))+'"></label></div>'+
 '<label class="field">Связанный этап<select id="ilemTaskStage"><option value="">Без отдельного этапа</option>'+stages+'</select></label>'+
 '<label class="field">Участники<select id="ilemTaskParticipants" multiple size="'+Math.min(4,Math.max(2,(G.people||[]).length))+'">'+participants+'</select></label>'+
 '<label class="field">Материалы и ресурсы<textarea id="ilemTaskResources" rows="3" placeholder="Доска: 4\nКраска: 1">'+h(resourceText)+'</textarea></label>'+
 '<div class="actions"><button onclick="closeModal()">Закрыть</button><button onclick="ilemSaveTaskReview(\''+h(String(t.id))+'\')">Сохранить изменения</button></div>';
 if(typeof window.modal==='function')window.modal(html);else if(typeof modal==='function')modal(html);
 return true;
}
function saveTaskReview(id){
 const t=G.tasks.find(x=>String(x.id)===String(id));if(!t)return false;
 const value=id=>$(id)?.value??'';
 const title=String(value('ilemTaskTitle')).trim();if(!title){tell('У задачи должно быть название.');return false;}
 t.title=title;t.description=String(value('ilemTaskDescription'));t.notes=t.description;
 t.object=String(value('ilemTaskObject'))||null;t.person=String(value('ilemTaskPerson'))||'Не назначен';
 t.dueDate=String(value('ilemTaskDue')).trim()||null;t.priority=String(value('ilemTaskPriority'))||'Плановый';
 t.stageId=String(value('ilemTaskStage'))||null;
 const participantEl=$('ilemTaskParticipants');t.participants=participantEl?Array.from(participantEl.selectedOptions).map(x=>x.value):[];
 t.resources=String(value('ilemTaskResources')).split(/\r?\n/).map(line=>{const m=line.match(/^(.+?)\s*:\s*(\d+(?:[.,]\d+)?)$/);return m?{name:m[1].trim(),qty:Number(m[2].replace(',','.'))}:null;}).filter(Boolean);t.materials=t.resources.map(x=>[x.name,x.qty]);
 t.status=String(value('ilemTaskStatus'))||'На согласовании';t.hours=Math.max(0,num(value('ilemTaskHours'),1));
 t.updatedAt=date();save();if(typeof window.closeModal==='function')window.closeModal();
 renderBoard();if(G.tab==='calendar')render();if(typeof window.renderTasks==='function')window.renderTasks();
 if(typeof window.renderObject==='function')window.renderObject();
 tell('Задача сохранена.');return true;
}
function renderBoard(){
 const el=$('liveTasks');if(!el)return;
 const tasks=G.tasks.slice().sort((a,b)=>Number(b.createdAtMs||b.id||0)-Number(a.createdAtMs||a.id||0));
 el.innerHTML=tasks.length?tasks.map(t=>{
  const object=t.object&&G.objects&&G.objects[t.object]?G.objects[t.object].name:'Без объекта';
  return '<div class="taskline"><b>'+h(t.title)+'</b><div class="taskmeta"><span class="badge">'+h(t.person||'Не назначен')+'</span><span class="badge">'+h(t.status||'На согласовании')+'</span><span class="badge">'+h(t.priority||'Плановый')+'</span><span class="badge">'+h(object)+'</span></div>'+
  '<div class="actions"><button onclick="openTaskReview(\''+h(String(t.id))+'\')">Открыть / изменить</button>'+
  (t.status==='На согласовании'?'<button onclick="ilemSetTaskStatus(\''+h(String(t.id))+'\',\'Запланирована\')">Утвердить</button>':'')+
  (t.status==='Запланирована'||t.status==='Отложена'?'<button onclick="ilemSetTaskStatus(\''+h(String(t.id))+'\',\'В работе\')">Начать</button>':'')+
  (t.status==='В работе'?'<button onclick="ilemSetTaskStatus(\''+h(String(t.id))+'\',\'Выполнена\')">Завершить</button>':'')+
  (t.status==='Выполнена'?'<button onclick="ilemSetTaskStatus(\''+h(String(t.id))+'\',\'Запланирована\')">Открыть повторно</button>':'')+
  '</div></div>';
 }).join(''):'<p class="muted">Пока нет поручений. Создай задачу через календарь или командный чат.</p>';
}
function setTaskStatus(id,status){
 const t=G.tasks.find(x=>String(x.id)===String(id));if(!t)return false;
 t.status=status;t.updatedAt=date();if(status==='Выполнена')t.doneAt=date();if(status==='Запланирована')t.doneAt=null;
 save();renderBoard();if(G.tab==='calendar')render();if(typeof window.renderTasks==='function')window.renderTasks();
 if(typeof window.renderObject==='function')window.renderObject();
 tell('Статус задачи: '+status+'.');return true;
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
window.ilemSaveNewTask=saveNewTask;
window.openTaskReview=openTaskReview;
window.ilemSaveTaskReview=saveTaskReview;
window.ilemSetTaskStatus=setTaskStatus;
window.renderLiveTasks=renderBoard;
window.approveTask=id=>setTaskStatus(id,'Запланирована');
window.dropTask=id=>setTaskStatus(id,'Отклонена');
const previousApprove=window.ilemApproveTask;
if(typeof previousApprove==='function')window.ilemApproveTask=function(id){const result=previousApprove(id);if(G.tab==='calendar')render();return result;};
const previousReject=window.ilemRejectTask;
if(typeof previousReject==='function')window.ilemRejectTask=function(id){const result=previousReject(id);if(G.tab==='calendar')render();return result;};
const previousExecute=window.ilemExecuteTask;
if(typeof previousExecute==='function')window.ilemExecuteTask=function(id){const result=previousExecute(id);if(G.tab==='calendar')render();return result;};
window.UilemCalendarTasks={render,addTask,removeTask,createTask,migrateLegacy,getTasks:()=>G.tasks.filter(t=>t.calendarKey)};
if(G.tab==='calendar')render();
})();