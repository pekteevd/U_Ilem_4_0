/* У Илем 4.0 — поэтапное строительство и связь с мастерской. */
(function(){
'use strict';
if(typeof G==='undefined'||!G||typeof save!=='function')return;
const TYPES={
 toilet:{name:'Туалет',phases:[['Основание',[['Цемент',2],['Кирпич',10],['Доска',2]],4,900,2],['Каркас',[['Доска',4],['Брус',2],['Крепёж',1]],5,1200,2],['Кровля',[['Кровельный материал',2],['Доска',2]],4,700,2],['Отделка',[['Краска',1],['Крепёж',1]],3,900,1]]},
 shower:{name:'Летний душ',phases:[['Основание и слив',[['Цемент',1],['Доска',2]],3,600,2],['Каркас кабины',[['Доска',3],['Брус',1],['Крепёж',1]],4,700,2],['Кровля и ограждение',[['Кровельный материал',1],['Доска',2]],3,500,2],['Отделка и ввод в работу',[['Краска',1],['Крепёж',1]],3,650,1]]},
 bath:{name:'Баня',phases:[['Фундамент',[['Цемент',8],['Кирпич',30],['Доска',4]],12,3000,3],['Силовой каркас',[['Брус',8],['Доска',12],['Крепёж',8]],18,4500,3],['Кровля и наружный контур',[['Кровельный материал',12],['Доска',6],['Крепёж',4]],12,3500,3],['Отделка',[['Краска',4],['Пропитка для древесины',2],['Крепёж',4]],12,4500,3]]},
 guest:{name:'Гостевой дом',phases:[['Фундамент',[['Цемент',10],['Кирпич',40],['Доска',5]],18,4500,3],['Силовой каркас',[['Брус',10],['Доска',18],['Крепёж',10]],24,6500,3],['Кровля и наружный контур',[['Кровельный материал',15],['Доска',8],['Крепёж',5]],18,5000,3],['Отделка',[['Краска',6],['Пропитка для древесины',2],['Крепёж',4]],18,6500,3]]},
 workshop:{name:'Мастерская',phases:[['Основание',[['Цемент',5],['Кирпич',15],['Доска',4]],8,2000,2],['Каркас',[['Брус',6],['Доска',10],['Крепёж',6]],10,2500,3],['Кровля',[['Кровельный материал',8],['Доска',4],['Крепёж',3]],8,2000,2],['Отделка',[['Краска',3],['Пропитка для древесины',1]],6,2200,2]]},
 shed:{name:'Хозблок / склад',phases:[['Основание',[['Цемент',3],['Кирпич',10],['Доска',3]],5,1200,2],['Каркас',[['Брус',3],['Доска',8],['Крепёж',4]],7,1600,2],['Кровля',[['Кровельный материал',5],['Доска',3],['Крепёж',2]],5,1200,2],['Защита',[['Краска',2],['Пропитка для древесины',1]],4,1400,1]]},
 greenhouse:{name:'Теплица',phases:[['Основание',[['Цемент',2],['Кирпич',6],['Доска',2]],4,900,2],['Каркас',[['Брус',2],['Доска',6],['Крепёж',4]],6,1100,2],['Покрытие',[['Кровельный материал',6],['Крепёж',4]],5,1000,2],['Подготовка к выращиванию',[['Доска',2],['Краска',1]],3,900,1]]},
 gazebo:{name:'Беседка',phases:[['Основание',[['Цемент',2],['Кирпич',8],['Брус',2]],4,900,2],['Каркас и настил',[['Брус',3],['Доска',8],['Крепёж',4]],7,1300,3],['Кровля',[['Кровельный материал',4],['Доска',3],['Крепёж',2]],5,1100,2],['Защита и отделка',[['Пропитка для древесины',1],['Краска',1]],4,1100,2]]},
 fire:{name:'Костровая зона',phases:[['Подготовка',[['Кирпич',20],['Цемент',2]],3,700,1],['Очаг',[['Кирпич',15],['Цемент',1]],3,700,2],['Площадка',[['Кирпич',10],['Цемент',2]],3,700,2],['Завершение и проверка',[['Кирпич',5],['Цемент',1]],2,500,1]]}
};
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const date=()=>[G.day||1,G.month||1,G.year||1].join('.');
const item=n=>(G.inventory||[]).find(x=>String(x.name).toLowerCase()===n.toLowerCase());
const next=(a,k)=>a.reduce((m,x)=>Math.max(m,num(x[k])),0)+1;
const project=id=>G.constructionProjects&&G.constructionProjects[id]||null;
const say=s=>{if(typeof toast==='function')toast(s);};
function cancelModes(){
 if(typeof window.cancelMapPlacement==='function')window.cancelMapPlacement();
 window.UilemProduction?.cancelPlacement?.(true);
 window.UilemEcology?.cancelLocate?.(true);
 if(G.lighting&&G.lighting.pending!==null&&G.lighting.pending!==undefined){G.lighting.pending=null;document.getElementById('scene')?.classList.remove('placing');}
}
function estimate(phases){
 let sum=phases.reduce((s,p)=>s+p[3],0),need={};
 phases.forEach(p=>p[1].forEach(([n,q])=>need[n]=(need[n]||0)+q));
 for(const [n,q] of Object.entries(need))sum+=q*num(item(n)&&item(n).price,300);
 return Math.round(sum);
}
function makeTask(b,plan){
 const totals={};plan.phases.forEach(p=>p[1].forEach(([n,q])=>totals[n]=(totals[n]||0)+q));
 const purchases=Object.entries(totals).map(([name,qty])=>({name,qty,price:num(item(name)&&item(name).price,300)}));
 const task={id:next(G.tasks,'id'),title:'Построить: '+b.name+' · участок '+b.plot,person:'Дмитрий',object:b.id,hours:plan.phases.reduce((s,p)=>s+p[2],0),status:'На согласовании',source:'Точка на карте · '+Math.round(b.x)+'%, '+Math.round(b.y)+'%',materials:purchases.map(p=>[p.name,p.qty]),purchases,actions:plan.phases.map((p,i)=>({title:(i+1)+'. '+p[0],done:false})),priority:'Плановый',constructionProjectId:b.id};
 G.tasks.push(task);return task;
}
function makeStages(b,plan){
 const first=next(G.stages,'id'),ids=[];
 plan.phases.forEach((p,i)=>{const id=first+i;ids.push(id);G.stages.push({id,title:p[0]+' · '+b.name,object:b.id,progress:0,need:p[1].map(x=>[x[0],x[1]]),hours:p[2],cost:p[3],skill:p[4],constructionProjectId:b.id,phaseIndex:i});});
 return ids;
}
function sync(p){
 const ss=p.stageIds.map(id=>G.stages.find(s=>s.id===id)).filter(Boolean),done=ss.filter(s=>s.progress>=100).length;
 p.completedStages=done;p.status=done===ss.length?'Готово':done?'Строительство · '+done+'/'+ss.length:'Ожидает утверждения';
 const b=G.buildings.find(x=>x.id===p.buildingId),o=G.objects[p.buildingId];
 if(b){b.status=p.status;b.completedStages=done;b.totalStages=ss.length;}
 if(o){o.constructionStatus=p.status;o.condition=done===ss.length?'Построено · готово к обустройству':done?'Строительство · '+done+' из '+ss.length+' этапов':'Проект размещён · ожидает утверждения';if(done===ss.length)o.state=100;}
 const t=G.tasks.find(x=>x.id===p.taskId);
 if(t){t.actions.forEach((a,i)=>a.done=!!(ss[i]&&ss[i].progress>=100));if(done===ss.length){t.actions.forEach(a=>a.done=true);t.status='Выполнена';t.doneAt=date();}}
}
function addProject(plot,type,x,y){
 const plan=TYPES[type];if(!plan){say('Неизвестный тип строительного объекта.');return false;}
 G.objects=G.objects||{};G.buildings=Array.isArray(G.buildings)?G.buildings:[];G.tasks=Array.isArray(G.tasks)?G.tasks:[];G.stages=Array.isArray(G.stages)?G.stages:[];G.constructionProjects=G.constructionProjects||{};
 const px=Math.max(3,Math.min(97,num(x,50))),py=Math.max(5,Math.min(94,num(y,50))),serial=next(G.buildings,'constructionSerial'),id='custom_'+Date.now()+'_'+serial;
 const b={id,plot:Number(plot),type,name:plan.name,x:Math.round(px*10)/10,y:Math.round(py*10)/10,status:'Ожидает утверждения',completedStages:0,totalStages:4,constructionSerial:serial};
 G.buildings.push(b);G.objects[id]={name:plan.name+' · участок '+plot,state:0,condition:'Проект размещён · ожидает утверждения',cost:estimate(plan.phases),plot:Number(plot),constructionStatus:'Ожидает утверждения'};
 const t=makeTask(b,plan),stageIds=makeStages(b,plan),p={buildingId:id,taskId:t.id,type,plot:Number(plot),x:px,y:py,createdAt:date(),stageIds,completedStages:0,status:'Ожидает утверждения',estimatedBudget:G.objects[id].cost};
 G.constructionProjects[id]=p;cancelModes();G.selected=id;
 if(typeof log==='function')log('Создан проект «'+plan.name+'» на участке '+plot+'. Четыре этапа, точка '+Math.round(px)+'%, '+Math.round(py)+'%.');
 save();window.render?.();window.renderLiveTasks?.();say('Проект создан. Утверди план на общей доске, подтверди закупки, затем выполняй этапы.');return id;
}
function placeCrafted(type,x,y){
 const recipe=type==='bench'?'bench':'gardenTable',state=window.UilemProduction?.getState?.(),goods=state&&state.stock&&state.stock.find(g=>g.recipeId===recipe);
 if(!goods){cancelModes();say(type==='bench'?'Сначала изготовь скамейку в мастерской.':'Сначала изготовь садовый стол в мастерской.');return false;}
 cancelModes();const ok=window.UilemProduction.startPlacement(goods.id)&&window.UilemProduction.placeAt(x,y);window.cancelMapPlacement?.();return !!ok;
}
const oldBegin=window.beginMapPlacement;
if(typeof oldBegin==='function')window.beginMapPlacement=function(plot,type){
 window.UilemProduction?.cancelPlacement?.(true);window.UilemEcology?.cancelLocate?.(true);
 if(G.lighting&&G.lighting.pending!==null&&G.lighting.pending!==undefined){G.lighting.pending=null;document.getElementById('scene')?.classList.remove('placing');}
 return oldBegin(plot,type);
};
const oldExecute=window.executeStage;
if(typeof oldExecute==='function')window.executeStage=function(id){
 const s=G.stages.find(x=>Number(x.id)===Number(id)),p=s&&project(s.object);
 if(p){
  const t=G.tasks.find(x=>x.id===p.taskId);
  if(!t||t.status!=='Запланирована'){say('Сначала утверди план строительства на общей доске.');return false;}
  const missing=(s.need||[]).filter(([n,q])=>{const it=item(n);return !it||num(it.qty)-num(it.reserved)<q;});
  if(missing.length){say('Не хватает материалов на складе. Подтверди отдельную закупку в задаче: '+missing.map(x=>x[0]+' ('+x[1]+')').join(', '));return false;}
 }
 const old=s?s.progress:null,result=oldExecute(id);
 if(p&&s&&s.progress>=100&&(old||0)<100){sync(p);save();window.render?.();window.renderLiveTasks?.();say(p.status==='Готово'?'Строительство завершено. Теперь можно обустраивать помещения.':'Этап завершён: '+p.status+'.');}
 return result;
};
window.addBuildingAt=(plot,type,x=50,y=50)=>type==='bench'||type==='table'?placeCrafted(type,x,y):addProject(plot,type,x,y);
const oldScene=window.renderScene;
if(typeof oldScene==='function')window.renderScene=function(){
 oldScene();document.querySelectorAll('.custom-hotspot').forEach(el=>{const b=G.buildings.find(x=>x.id===el.dataset.object),p=b&&project(b.id);if(!p)return;el.title=(G.objects[b.id]?.name||b.name)+' · '+p.completedStages+'/'+p.stageIds.length+' этапов';el.classList.toggle('construction-complete',p.status==='Готово');el.classList.toggle('construction-in-progress',p.completedStages>0&&p.status!=='Готово');});
};
const css=document.createElement('style');css.id='u4c-style';css.textContent='.custom-hotspot.construction-complete{background:#45683f!important;border-color:#d9ebad!important}.custom-hotspot.construction-in-progress{background:#85602b!important;border-color:#f0cf83!important}';document.head.appendChild(css);
window.UilemConstruction={blueprints:TYPES,addProject,getProject:project,sync,getReadyToFurnish:id=>project(id)?project(id).status==='Готово':true,cancelOtherPlacement:cancelModes};
save();
})();