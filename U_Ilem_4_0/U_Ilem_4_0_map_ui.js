/* У Илем 4.0 — управление этапами строго в контексте выбранного объекта. */
(function(){
'use strict';
if(typeof G==='undefined'||!G||typeof save!=='function')return;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
function say(s){if(typeof toast==='function')toast(s);}
function showModal(html){if(typeof window.modal==='function')window.modal(html);else if(typeof modal==='function')modal(html);}
function objectName(id){return G.objects&&G.objects[id]?G.objects[id].name:String(id||'Объект');}
function ensureMapControls(){
 const scene=$('scene');if(!scene)return false;
 let box=$('plotControls');
 if(!box){
  box=document.createElement('div');box.id='plotControls';box.className='plot-tools';
  box.innerHTML='<button type="button">＋ Строить · участок 2</button><button type="button">＋ Строить · участок 3</button>';
  scene.appendChild(box);
 }
 let buttons=box.querySelectorAll?box.querySelectorAll('button'):[];
 if(!buttons.length){
  box.innerHTML='<button type="button">＋ Строить · участок 2</button><button type="button">＋ Строить · участок 3</button>';
  buttons=box.querySelectorAll?box.querySelectorAll('button'):[];
 }
 buttons.forEach(button=>{
  const match=String(button.textContent||'').match(/участок\s*(\d+)/i);
  const plot=match?Number(match[1]):null;
  if(plot)button.onclick=function(e){if(e&&e.preventDefault)e.preventDefault();if(typeof window.choosePlot==='function')window.choosePlot(plot);};
 });
 return buttons.length>0;
}
function objectStages(id){return (G.stages||[]).filter(s=>String(s.object)===String(id));}
function openObjectStages(id){
 const key=String(id||G.selected||'');
 if(!key||!G.objects||!G.objects[key]){say('Сначала выбери объект на карте.');return false;}
 const stages=objectStages(key);
 const active=stages.filter(s=>num(s.progress)<100).length;
 const rows=stages.length?stages.map(s=>'<div class="row"><span><b>'+esc(s.title)+'</b><br><small>'+num(s.progress)+'% · '+num(s.hours)+' ч · навык '+num(s.skill,1)+'/5</small></span><button onclick="ilemOpenStageById('+Number(s.id)+')">'+(num(s.progress)>=100?'Посмотреть':'Открыть этап')+'</button></div>').join(''):'<p class="muted">Для этого объекта пока не создано этапов. Создай первый отдельным действием.</p>';
 showModal('<h2>Работы объекта</h2><p><b>'+esc(objectName(key))+'</b></p><div class="grid2"><div class="tile"><small>Всего этапов</small><b>'+stages.length+'</b></div><div class="tile"><small>Активных</small><b>'+active+'</b></div></div><h3>Этапы</h3>'+rows+'<div class="actions"><button onclick="ilemCreateStageForObject(\''+esc(key)+'\')">＋ Создать новый этап</button><button onclick="ilemShowObjectWorks(\''+esc(key)+'\')">Все работы объекта</button><button onclick="closeModal()">Закрыть</button></div>');
 return true;
}
function openStageDetails(id){
 const s=(G.stages||[]).find(x=>String(x.id)===String(id));
 if(!s){say('Этап не найден.');return false;}
 const needs=(s.need||[]).map(([name,qty])=>{
  const it=(G.inventory||[]).find(x=>x.name===name);
  return '<div class="row"><span>'+esc(name)+': нужно '+esc(qty)+'</span><b>'+esc(it?it.qty:0)+' в наличии</b></div>';
 }).join('');
 const people=(G.people||[]).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · навык '+esc(p.skill)+'/5 · '+esc(p.hours)+' ч</option>').join('');
 showModal('<h2>Этап объекта</h2><p><b>'+esc(s.title)+'</b></p><p class="muted">'+esc(objectName(s.object))+'</p><div class="tile"><small>Трудоёмкость</small><b>'+num(s.hours)+' часов</b> · квалификация '+num(s.skill,1)+'/5 · прогресс '+num(s.progress)+'%</div><h3>Материалы</h3>'+(needs||'<p class="muted">Материалы пока не указаны.</p>')+'<div class="row"><span>Дополнительные расходы</span><b>'+num(s.cost).toLocaleString('ru-RU')+' ₽</b></div><label class="field">Исполнитель<select id="stagePerson">'+people+'</select></label><label class="field">Способ обеспечения материалов<select id="stageMode"><option value="stock">Использовать только склад</option><option value="buy">Докупить недостающее</option></select></label><div class="actions"><button onclick="closeModal()">Отмена</button>'+(num(s.progress)>=100?'':'<button onclick="executeStage('+Number(s.id)+')">Выполнить этап</button>')+'</div>');
 return true;
}
function createStageForm(id){
 const key=String(id||G.selected||'');
 if(!key||!G.objects||!G.objects[key])return false;
 showModal('<h2>Новый этап · '+esc(objectName(key))+'</h2><label class="field">Название этапа<input id="ilemNewStageTitle" placeholder="Например, заменить входную дверь"></label><div class="grid2"><label class="field">Трудоёмкость, ч<input id="ilemNewStageHours" type="number" min="0.1" step="0.5" value="8"></label><label class="field">Дополнительные расходы, ₽<input id="ilemNewStageCost" type="number" min="0" step="100" value="0"></label><label class="field">Требуемый навык, 1–5<input id="ilemNewStageSkill" type="number" min="1" max="5" value="1"></label></div><label class="field">Материалы и количество<textarea id="ilemNewStageMaterials" rows="3" placeholder="Доска: 4&#10;Краска: 1"></textarea></label><p class="small">Этап будет привязан к этому объекту автоматически. Материалы будут проверяться по складу при выполнении.</p><div class="actions"><button onclick="closeModal()">Отмена</button><button onclick="ilemSaveNewStage(\''+esc(key)+'\')">Создать этап</button></div>');
 return true;
}
function saveNewStage(id){
 const key=String(id||'');
 const title=String($('ilemNewStageTitle')?.value||'').trim();
 if(!title){say('Введи название этапа.');return false;}
 const ids=(G.stages||[]).map(s=>Number(s.id)||0);
 const next=Math.max(Date.now(),0,...ids)+1;
 const need=String($('ilemNewStageMaterials')?.value||'').split(/\r?\n/).map(line=>{const m=line.match(/^(.+?)\s*:\s*(\d+(?:[.,]\d+)?)$/);return m?[m[1].trim(),Number(m[2].replace(',','.'))]:null;}).filter(Boolean);
 const stage={id:next,title,object:key,progress:0,need,hours:Math.max(.1,num($('ilemNewStageHours')?.value,8)),cost:Math.max(0,num($('ilemNewStageCost')?.value)),skill:Math.max(1,Math.min(5,num($('ilemNewStageSkill')?.value,1)))};
 G.stages.push(stage);
 if(typeof log==='function')log('Создан этап «'+title+'» для объекта «'+objectName(key)+'».');
 save();if(typeof closeModal==='function')closeModal();if(typeof render==='function')render();
 say('Этап создан и привязан к выбранному объекту.');
 openObjectStages(key);
 return stage.id;
}
function renderObjectWorks(id){
 const w=$('workspace');if(!w)return;
 const key=String(id),stages=objectStages(key),tasks=(G.tasks||[]).filter(t=>String(t.object)===key);
 const stageRows=stages.length?stages.map(s=>'<div class="row"><span><b>'+esc(s.title)+'</b><br><small>Этап · '+num(s.progress)+'% · '+num(s.hours)+' ч · навык '+num(s.skill,1)+'/5</small></span><button onclick="ilemOpenStageById('+Number(s.id)+')">'+(num(s.progress)>=100?'Посмотреть':'Открыть этап')+'</button></div>').join(''):'<p class="muted">Этапы ещё не созданы.</p>';
 const taskRows=tasks.length?tasks.map(t=>'<div class="row"><span><b>'+esc(t.title)+'</b><br><small>Задача · '+esc(t.status||'На согласовании')+' · '+esc(t.person||'Не назначен')+' · '+num(t.hours)+' ч</small></span><button onclick="openTaskReview(\''+esc(String(t.id))+'\')">Открыть задачу</button></div>').join(''):'<p class="muted">Связанных задач пока нет.</p>';
 w.innerHTML='<h3>Все работы · '+esc(objectName(key))+'</h3><p class="muted">Здесь показаны только задачи и этапы выбранного объекта.</p><h3>Задачи · '+tasks.length+'</h3>'+taskRows+'<h3>Этапы · '+stages.length+'</h3>'+stageRows+'<div class="actions"><button onclick="ilemCreateStageForObject(\''+esc(key)+'\')">＋ Новый этап</button><button onclick="ilemShowAllWorks()">Показать работы всех объектов</button></div>';
}
function showObjectWorks(id){
 G.objectTasksFilter=String(id||G.selected||'');
 allowObjectFilter=true;
 try{if(typeof window.setTab==='function')window.setTab('build');else{G.tab='build';window.renderWorkspace?.();}}
 finally{allowObjectFilter=false;}
}
function showAllWorks(){G.objectTasksFilter=null;if(typeof window.renderWorkspace==='function')window.renderWorkspace();}
let allowObjectFilter=false;
ensureMapControls();
const previousWorkspace=window.renderWorkspace;
window.renderWorkspace=function(){
 if(G.tab==='build'&&G.objectTasksFilter){renderObjectWorks(G.objectTasksFilter);return;}
 if(typeof previousWorkspace==='function')return previousWorkspace.apply(this,arguments);
};
const previousSetTab=window.setTab;
if(typeof previousSetTab==='function')window.setTab=function(tab){
 if(tab!=='build'||!allowObjectFilter)G.objectTasksFilter=null;
 return previousSetTab.apply(this,arguments);
};
const previousRenderObject=window.renderObject;
if(typeof previousRenderObject==='function')window.renderObject=function(){
 previousRenderObject.apply(this,arguments);
 const box=$('objectDetail');if(!box)return;
 const buttons=box.querySelectorAll?box.querySelectorAll('button'):[];
 for(const button of buttons){
  if(String(button.textContent||'').trim()==='Все работы'){
   button.onclick=function(e){if(e&&e.preventDefault)e.preventDefault();showObjectWorks(G.selected);};
   break;
  }
 }
};
window.openStage=openObjectStages;
window.ilemOpenStageById=openStageDetails;
window.ilemCreateStageForObject=createStageForm;
window.ilemSaveNewStage=saveNewStage;
window.ilemShowObjectWorks=showObjectWorks;
window.ilemShowAllWorks=showAllWorks;
const style=document.createElement('style');
style.id='uilem-map-visual-cleanup';
style.textContent='.scene:after{animation:none!important;background-size:100% 100%!important;background:linear-gradient(180deg,#14241412,#13211500 55%,#14241422)!important}';
document.head.appendChild(style);
window.UilemMapUI={openObjectStages,openStageDetails,createStageForm,saveNewStage,showObjectWorks,showAllWorks};
})();