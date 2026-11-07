/* Canonical work item helpers for У Илем 4.1. */
(function(root){
'use strict';
const STATUSES=new Set(['draft','review','planned','in_progress','waiting_resources','done','rejected','cancelled']);
const KINDS=new Set(['task','object_stage','seasonal','maintenance','construction']);
const txt=(v,d)=>typeof v==='string'&&v.trim()?v.trim():(d||'');
const num=(v,d)=>Number.isFinite(Number(v))?Number(v):(d||0);
function normalize(x,defaults){
 x=x&&typeof x==='object'?x:{};defaults=defaults||{};
 const map={'На согласовании':'review','Запланирована':'planned','В работе':'in_progress','Ожидает ресурсы':'waiting_resources','Выполнена':'done','Отклонена':'rejected','Отменена':'cancelled','Планирование':'draft'};
 const raw=txt(x.status,defaults.status||'draft'),status=STATUSES.has(raw)?raw:(map[raw]||'draft');
 const kind=KINDS.has(x.kind)?x.kind:(defaults.kind||'task');
 return {id:txt(x.id,defaults.id||('wi_'+Date.now())),legacyId:x.legacyId??null,kind,title:txt(x.title,'Новая задача'),
 description:txt(x.description,''),status,objectId:x.objectId??x.object??defaults.objectId??null,assigneeId:x.assigneeId??x.personId??defaults.assigneeId??null,
 source:x.source&&typeof x.source==='object'?x.source:{type:defaults.sourceType||'legacy',text:txt(x.source,'')},
 priority:x.priority||'normal',schedule:x.schedule||{startDay:null,dueDay:null,season:x.season||null},
 effort:{estimateHours:Math.max(.1,num((x.effort ? x.effort.estimateHours : undefined) ?? x.hours,.5)),spentHours:Math.max(0,num(x.effort&&x.effort.spentHours,0)),requiredSkill:Math.max(1,Math.min(5,num((x.effort ? x.effort.requiredSkill : undefined) ?? x.skill,1)))},
 materials:Array.isArray(x.materials)?x.materials:Array.isArray(x.need)?x.need:[],purchases:Array.isArray(x.purchases)?x.purchases:[],
 progress:Math.max(0,Math.min(100,num(x.progress,0))),updatedAt:x.updatedAt||new Date().toISOString()};
}
function id(prefix,value,index){return 'legacy_'+prefix+'_'+String(value==null?index:value).replace(/[^\w-]/g,'_');}
function migrate(state){
 state=state&&typeof state==='object'?state:{};const out=[],seen=new Set();
 function add(x,kind,prefix,i,extra){const key=id(prefix,x&&x.id,i);if(seen.has(key))return;seen.add(key);const merged=Object.assign({},x,extra||{},{id:key,legacyId:x&&x.id!=null?x.id:null,kind:kind});out.push(normalize(merged,{id:key,kind:kind}));}
 (state.stages||[]).forEach(function(x,i){add(x, 'object_stage','stage',i,{objectId:x.object,status:Number(x.progress)>=100?'done':Number(x.progress)>0?'in_progress':'planned'});});
 (state.tasks||[]).forEach(function(x,i){const person=(state.people||[]).find(function(p){return p.name===x.person;});add(x,x.kind==='seasonal'?'seasonal':'task','task',i,{objectId:x.object,assigneeId:x.personId||(person&&person.id)||null});});
 (state.calendar&&state.calendar.monthlyTasks||[]).forEach(function(x,i){add(x,'seasonal','calendar',i,{status:x.status||'На согласовании',schedule:{season:x.season||null}});});
 return out;
}
function chooseAssignee(task,people){
 const effort=task.effort||{},hours=num(effort.estimateHours,.5),skill=num(effort.requiredSkill,1);
 const candidates=(people||[]).filter(function(p){return p&&p.id&&num(p.hours)>=hours&&num(p.skill,1)>=skill;});
 if(!candidates.length)return {assigneeId:null,reason:'Нет участника с подходящим навыком и свободными часами.'};
 const title=(task.title+' '+(task.description||'')).toLowerCase();
 const domain=/сад|огород|растен|урожай|гост|кухн/.test(title)?'hospitality':/электр|техник|инструмент|станок/.test(title)?'technical':/стро|ремонт|кровл|фундамент|каркас/.test(title)?'construction':'general';
 const hints={hospitality:/сад|кулин|хозяйств|гост/,technical:/техник|мастер|электр/,construction:/стро|ремонт|плотник|управлен/,general:/помощ|хозяйств|управлен/};
 candidates.sort(function(a,b){return (Number(hints[domain].test(b.role||''))-Number(hints[domain].test(a.role||'')))||(num(b.skill)-num(a.skill))||(num(b.hours)-num(a.hours));});
 return {assigneeId:candidates[0].id,reason:null};
}
function validate(drafts,objects){
 const errors=[],ids=new Set((objects||[]).map(function(x){return x.id;}));
 if(!Array.isArray(drafts)||drafts.length<3||drafts.length>8)return {ok:false,errors:['Нужно от 3 до 8 задач.']};
 drafts.forEach(function(x,i){if(!txt(x&&x.title,''))errors.push('Нет названия в задаче '+(i+1));if(!(num(x&&x.hours,0)>0&&num(x&&x.hours,0)<=80))errors.push('Некорректные часы в задаче '+(i+1));if(!ids.has(x.object))errors.push('Неизвестный объект '+x.object);});
 return {ok:errors.length===0,errors:errors};
}
root.UILemWorkItems=Object.freeze({STATUSES:STATUSES,KINDS:KINDS,normalize:normalize,migrate:migrate,chooseAssignee:chooseAssignee,validate:validate});
})(typeof window!=='undefined'?window:globalThis);