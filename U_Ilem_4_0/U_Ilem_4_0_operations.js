/* У Илем 4.0: осмотры, дефекты и сводная закупка. */
(function(){
'use strict';
if(typeof G==='undefined'||!G)return;
const $=s=>document.querySelector(s),byId=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=k=>Array.isArray(G[k])?G[k]:(G[k]=[]);
const uid=()=>Math.max(Date.now(),...arr('tasks').map(x=>Number(x.id)||0),...arr('stages').map(x=>Number(x.id)||0))+1;
const date=()=>[G.day||1,G.month||1,G.year||1].join('.');
const say=s=>{if(typeof toast==='function')toast(s);};
function saveAll(){if(typeof save==='function')save();if(typeof renderStats==='function')renderStats();}

/* Новая вкладка. */
const tabs=byId('tabs');
if(tabs&&!tabs.querySelector('[data-tab="inspection"]')){const b=document.createElement('button');b.type='button';b.dataset.tab='inspection';b.textContent='Осмотр и дефекты';tabs.appendChild(b);}

window.selectInspectionObject=function(key){
 if(!G.objects||!G.objects[key])return;
 G.selected=key;saveAll();if(typeof renderObject==='function')renderObject();window.renderInspectionWorkspace();
};
window.renderInspectionWorkspace=function(){
 const root=byId('workspace');if(!root)return;
 const objects=G.objects||{},key=G.selected&&objects[G.selected]?G.selected:Object.keys(objects)[0];
 if(key)G.selected=key;
 const object=objects[key]||{name:'Объект не выбран'};
 const inspections=arr('inspections').filter(x=>String(x.objectId)===String(key)).slice().reverse();
 const defects=arr('defects').filter(x=>String(x.objectId)===String(key)).slice().reverse();
 const opts=Object.keys(objects).map(k=>'<option value="'+esc(k)+'" '+(k===key?'selected':'')+'>'+esc(objects[k].name)+'</option>').join('');
 const inspectRows=inspections.length?inspections.map(x=>'<div class="tile"><b>'+esc(x.title||'Осмотр')+'</b><p class="small">'+esc(x.date)+' · '+esc(x.inspector||'Не указан')+'</p><p>'+esc(x.notes||'Без замечаний')+'</p></div>').join(''):'<p class="muted">Осмотров пока нет.</p>';
 const defectRows=defects.length?defects.map(d=>'<div class="tile defect-card"><b>'+esc(d.title)+'</b><div class="taskmeta"><span class="badge">'+esc(d.severity)+'</span><span class="badge">'+esc(d.status)+'</span><span class="badge">'+esc(d.date)+'</span></div><p>'+esc(d.description||'')+'</p><p class="small">Материалы: '+(d.materials||[]).map(m=>esc(m.name)+' · '+esc(m.qty)+' '+esc(m.unit)).join(', ')+'</p><div class="actions">'+(d.taskId?'<span class="small">Задача №'+esc(d.taskId)+' на общей доске</span>':'<button onclick="createTaskFromDefect('+Number(d.id)+')">Создать задачу</button>')+(d.status!=='Устранён'?'<button onclick="closeDefect('+Number(d.id)+')">Отметить устранённым</button>':'')+'</div></div>').join(''):'<p class="muted">Дефекты не зафиксированы.</p>';
 root.innerHTML='<h3>Осмотр и дефекты · '+esc(object.name)+'</h3><label class="field">Объект<select onchange="selectInspectionObject(this.value)">'+opts+'</select></label>'+
 '<div class="actions"><button onclick="openInspectionForm()">＋ Зафиксировать осмотр</button><button onclick="openDefectForm()">＋ Добавить дефект</button></div>'+
 '<h3>История осмотров</h3>'+inspectRows+'<h3>Зафиксированные дефекты</h3>'+defectRows;
};
window.openInspectionForm=function(){
 const name=G.objects&&G.objects[G.selected]&&G.objects[G.selected].name||'Объект';
 const html='<h2>Новый осмотр · '+esc(name)+'</h2><label class="field">Название осмотра<input id="inspectionTitle" value="Плановый осмотр"></label><label class="field">Кто проводил<input id="inspectionInspector" value="Дмитрий"></label><label class="field">Состояние и замечания<textarea id="inspectionNotes" rows="4" placeholder="Что проверено, что обнаружено, какие действия нужны"></textarea></label><div class="actions"><button onclick="closeModal()">Отмена</button><button onclick="saveInspection()">Сохранить осмотр</button></div>';
 if(typeof modal==='function')modal(html);
};
window.saveInspection=function(){
 const title=(byId('inspectionTitle')&&byId('inspectionTitle').value||'Плановый осмотр').trim();
 const notes=(byId('inspectionNotes')&&byId('inspectionNotes').value||'').trim();
 arr('inspections').push({id:uid(),objectId:G.selected,title,inspector:(byId('inspectionInspector')&&byId('inspectionInspector').value||'').trim(),notes,date:date()});
 saveAll();if(typeof closeModal==='function')closeModal();window.renderInspectionWorkspace();
};
window.openDefectForm=function(){
 const name=G.objects&&G.objects[G.selected]&&G.objects[G.selected].name||'Объект';
 const html='<h2>Новый дефект · '+esc(name)+'</h2><label class="field">Что обнаружено<input id="defectTitle" placeholder="Например, протекает кровля"></label><label class="field">Серьёзность<select id="defectSeverity"><option>Низкая</option><option selected>Средняя</option><option>Высокая</option><option>Критическая</option></select></label><label class="field">Описание и место<textarea id="defectDescription" rows="3"></textarea></label><label class="field">Материалы (строка: название; количество; ед.; цена)<textarea id="defectMaterials" rows="3" placeholder="Доска; 4; шт; 450&#10;Крепёж; 1; уп.; 220"></textarea></label><div class="actions"><button onclick="closeModal()">Отмена</button><button onclick="saveDefect()">Сохранить дефект</button></div>';
 if(typeof modal==='function')modal(html);
};
window.saveDefect=function(){
 const title=(byId('defectTitle')&&byId('defectTitle').value||'').trim();if(!title)return say('Опиши обнаруженный дефект.');
 const raw=byId('defectMaterials')&&byId('defectMaterials').value||'';
 const materials=raw.split(/\r?\n/).map(x=>x.split(';')).filter(x=>x[0]&&Number(x[1])>0).map(x=>({name:x[0].trim(),qty:Number(x[1]),unit:(x[2]||'шт').trim(),price:Math.max(0,Number(x[3])||0)}));
 arr('defects').push({id:uid(),objectId:G.selected,title,severity:byId('defectSeverity')&&byId('defectSeverity').value||'Средняя',description:(byId('defectDescription')&&byId('defectDescription').value||'').trim(),materials,status:'Открыт',date:date(),taskId:null});
 saveAll();if(typeof closeModal==='function')closeModal();window.renderInspectionWorkspace();
};
window.createTaskFromDefect=function(id){
 const d=arr('defects').find(x=>String(x.id)===String(id));if(!d)return;
 if(d.taskId&&arr('tasks').some(t=>String(t.id)===String(d.taskId)))return say('Для этого дефекта задача уже создана.');
 const person=arr('people').find(p=>p.name==='Дмитрий')||arr('people')[0];
 const task={id:uid(),title:'Устранить дефект: '+d.title,person:person&&person.name||'Дмитрий',object:d.objectId,hours:d.severity==='Критическая'?8:d.severity==='Высокая'?4:2,status:'На согласовании',source:'Дефект объекта',defectId:d.id,priority:d.severity==='Критическая'||d.severity==='Высокая'?'Высокий':'Обычный',actions:[{title:'Устранить дефект и проверить результат',done:false}],purchases:(d.materials||[]).map(m=>({name:m.name,qty:m.qty,unit:m.unit,price:m.price})),notes:d.description||''};
 arr('tasks').push(task);d.taskId=task.id;saveAll();if(typeof renderLiveTasks==='function')renderLiveTasks();window.renderInspectionWorkspace();say('Создан черновик задачи на общей доске.');
};
window.closeDefect=function(id){
 const d=arr('defects').find(x=>String(x.id)===String(id));if(!d)return;
 d.status='Устранён';d.closedAt=date();saveAll();window.renderInspectionWorkspace();
};

/* Общая закупка: задачи + этапы + дефекты без дублей, минус склад. */
function buildList(){
 const map=new Map(),tasks=arr('tasks').filter(t=>!['Выполнена','Отклонена','Снята с плана'].includes(t.status));
 const add=(name,qty,unit,price,source)=>{
  name=String(name||'').trim();qty=Number(qty)||0;if(!name||qty<=0)return;
  const inv=arr('inventory').find(x=>String(x.name).trim().toLowerCase()===name.toLowerCase());
  unit=unit||inv&&inv.unit||'шт';const key=name.toLowerCase()+'|'+String(unit).toLowerCase();
  let x=map.get(key);if(!x){x={name,unit,qty:0,price:Number(price)||Number(inv&&inv.price)||0,stock:Number(inv&&inv.qty)||0,sources:[]};map.set(key,x);}
  x.qty+=qty;if(!x.price&&Number(price))x.price=Number(price);if(source)x.sources.push(source);
 };
 tasks.forEach(t=>{
  (Array.isArray(t.purchases)?t.purchases:[]).forEach(p=>add(p.name,p.qty,p.unit,p.price,'Задача: '+t.title));
  if((!t.purchases||!t.purchases.length)&&Array.isArray(t.materials))t.materials.forEach(p=>Array.isArray(p)?add(p[0],p[1],'шт',0,'Задача: '+t.title):add(p.name,p.qty,p.unit,p.price,'Задача: '+t.title));
 });
 const linked=new Set(tasks.map(t=>t.constructionProjectId).filter(Boolean));
 arr('stages').filter(s=>Number(s.progress)<100&&(!s.constructionProjectId||!linked.has(s.constructionProjectId))).forEach(s=>(s.need||[]).forEach(p=>add(p[0],p[1],'шт',0,'Этап: '+s.title)));
 arr('defects').filter(d=>d.status!=='Устранён'&&!d.taskId).forEach(d=>(d.materials||[]).forEach(m=>add(m.name,m.qty,m.unit,m.price,'Дефект: '+d.title)));
 return Array.from(map.values()).map(x=>({...x,toBuy:Math.max(0,x.qty-x.stock),sum:Math.max(0,x.qty-x.stock)*x.price})).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
}
function openSummary(){
 const list=buildList(),needed=list.filter(x=>x.toBuy>0),total=needed.reduce((s,x)=>s+x.sum,0);
 if(!list.length){modal('<h2>Сводная закупка</h2><p>Активных потребностей в материалах нет.</p><div class="actions"><button onclick="closeModal()">Закрыть</button></div>');return;}
 const rows=list.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.qty+' '+esc(x.unit)+'</td><td>'+x.stock+' '+esc(x.unit)+'</td><td><b>'+x.toBuy+' '+esc(x.unit)+'</b></td><td>'+Math.round(x.sum).toLocaleString('ru-RU')+' ₽</td></tr>').join('');
 modal('<h2>Сводная закупка</h2><p class="small">Одинаковые материалы объединены. Остатки склада вычтены.</p><div class="scroll"><table class="table"><tr><th>Материал</th><th>Потребность</th><th>На складе</th><th>Докупить</th><th>Сумма</th></tr>'+rows+'</table></div><div class="tile"><small>Итого</small><b>'+Math.round(total).toLocaleString('ru-RU')+' ₽</b><p class="small">Доступно: '+Math.round(Number(G.cash)||0).toLocaleString('ru-RU')+' ₽</p></div><div class="actions"><button onclick="closeModal()">Закрыть</button><button '+(!needed.length||total>Number(G.cash)?'disabled':'')+' onclick="confirmConsolidatedPurchase()">Подтвердить закупку</button></div>');
}
window.addConsolidatedPurchaseButton=function(){
 const actions=byId('workspace')&&byId('workspace').querySelector('.actions');if(!actions||actions.querySelector('[data-consolidated-purchase]'))return;
 const b=document.createElement('button');b.type='button';b.dataset.consolidatedPurchase='1';b.textContent='Сводная закупка';b.onclick=openSummary;actions.appendChild(b);
};
window.openConsolidatedPurchase=openSummary;
window.confirmConsolidatedPurchase=function(){
 const list=buildList().filter(x=>x.toBuy>0),total=list.reduce((s,x)=>s+x.sum,0);
 if(!list.length){say('Недостающих материалов нет.');closeModal();return;}
 if(total>Number(G.cash||0))return say('Недостаточно денег для сводной закупки.');
 if(!confirm('Закупить '+list.length+' позиций на '+Math.round(total).toLocaleString('ru-RU')+' ₽?'))return;
 list.forEach(x=>{let inv=arr('inventory').find(i=>String(i.name).trim().toLowerCase()===x.name.toLowerCase());if(inv)inv.qty=(Number(inv.qty)||0)+x.toBuy;else arr('inventory').push({id:uid(),name:x.name,unit:x.unit,qty:x.toBuy,price:x.price,cat:'materials',reserved:0,used:0});});
 G.cash=Math.max(0,Number(G.cash||0)-total);arr('purchaseHistory').push({id:uid(),date:date(),total,items:list.map(x=>({name:x.name,qty:x.toBuy,unit:x.unit,price:x.price,sources:x.sources}))});
 if(typeof log==='function')log('Проведена сводная закупка на '+Math.round(total).toLocaleString('ru-RU')+' ₽.');
 saveAll();closeModal();if(typeof render==='function')render();if(typeof renderLiveTasks==='function')renderLiveTasks();say('Сводная закупка проведена.');
};
window.UilemOperations={buildConsolidatedList:buildList};
const css=document.createElement('style');css.textContent='.defect-card{margin:8px 0}.inspection-card{margin:8px 0}';(document.head||document.documentElement).appendChild(css);
})();