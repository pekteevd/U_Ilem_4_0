/* У Илем 4.0: реальное подключение командного чата к локальной Ollama. */
(function(){
'use strict';
if(typeof G==='undefined'||!G)return;
const byId=id=>document.getElementById(id);
const arr=k=>Array.isArray(G[k])?G[k]:(G[k]=[]);
const uid=()=>Math.max(Date.now(),...arr('tasks').map(x=>Number(x.id)||0))+1;
const say=s=>{if(typeof toast==='function')toast(s);};
function status(text,ok){
 let el=byId('ollamaStatus');
 if(!el){const box=document.querySelector('#taskChat .chatbox'),h=box&&box.querySelector('h2');if(!box||!h)return;el=document.createElement('div');el.id='ollamaStatus';el.className='small';h.after(el);const b=document.createElement('button');b.type='button';b.textContent='Проверить Ollama';b.style.margin='4px 0 8px';b.onclick=()=>window.testOllama();el.after(b);}
 el.textContent=text;el.style.color=ok?'#28613a':'#9b3c2d';
}
async function health(){
 const r=await fetch('/api/health',{cache:'no-store'});if(!r.ok)throw new Error('Локальный сервер ответил HTTP '+r.status);
 const d=await r.json();if(!d.ollama)throw new Error('Ollama не запущена или недоступна.');
 if(!d.modelInstalled)throw new Error('Модель '+d.model+' не установлена. Доступные: '+(d.models||[]).join(', '));return d;
}
async function ask(messages){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),240000);
 try{const r=await fetch('/api/ollama/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,stream:false}),signal:c.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.detail||('Ollama HTTP '+r.status));const answer=d.message&&d.message.content||d.response||'';if(!answer)throw new Error('Модель вернула пустой ответ.');return answer;}
 finally{clearTimeout(timer);}
}
function parsePlan(raw){
 const fence=String.fromCharCode(96).repeat(3);
 const clean=String(raw||'').trim().replace(new RegExp('^'+fence+'json'),'').replace(new RegExp('^'+fence),'').replace(new RegExp(fence+'$'),'').trim();
 try{const x=JSON.parse(clean);if(x&&typeof x==='object')return x;}catch(e){}
 return {reply:String(raw||''),tasks:[]};
}
function createDrafts(items){
 let count=0;(Array.isArray(items)?items:[]).forEach(x=>{
  const title=String(x&&x.title||'').trim();if(!title)return;
  const people=arr('people'),person=people.find(p=>p.name===x.person)||people.find(p=>p.name==='Дмитрий')||people[0];
  const object=G.objects&&G.objects[x.object]?x.object:G.selected||null;
  const actions=(Array.isArray(x.actions)?x.actions:[]).map(a=>({title:String(typeof a==='string'?a:a&&a.title||'').trim(),done:false})).filter(a=>a.title);
  if(!actions.length)actions.push({title,done:false});
  const purchases=(Array.isArray(x.purchases)?x.purchases:[]).map(p=>({name:String(p.name||'').trim(),qty:Math.max(0,Number(p.qty)||0),unit:String(p.unit||'шт'),price:Math.max(0,Number(p.price)||0)})).filter(p=>p.name&&p.qty>0);
  arr('tasks').push({id:uid(),title,person:person&&person.name||'Дмитрий',object,hours:Math.max(.25,Math.min(500,Number(x.hours)||1)),status:'На согласовании',source:'Командный ИИ',priority:['Плановый','Обычный','Высокий'].includes(x.priority)?x.priority:'Плановый',actions,purchases,notes:String(x.notes||'')});count++;
 });return count;
}
window.sendCommand=async function(){
 const input=byId('chatInput'),text=input&&input.value.trim();if(!text)return;
 input.value='';input.disabled=true;if(typeof addChat==='function')addChat('Дмитрий',text);status('Связываюсь с локальной моделью…',false);
 try{
  const h=await health();
  const context={date:[G.day||1,G.month||1,G.year||1].join('.'),selectedObject:G.selected&&G.objects[G.selected]?{id:G.selected,name:G.objects[G.selected].name,state:G.objects[G.selected].state,condition:G.objects[G.selected].condition}:null,objects:Object.entries(G.objects||{}).map(([id,o])=>({id,name:o.name,state:o.state,condition:o.condition})),people:arr('people').map(p=>({name:p.name,skill:p.skill,hours:p.hours,energy:p.energy})),inventory:arr('inventory').slice(0,80).map(i=>({name:i.name,qty:i.qty,unit:i.unit,price:i.price})),activeTasks:arr('tasks').filter(t=>!['Выполнена','Отклонена','Снята с плана'].includes(t.status)).slice(-20).map(t=>({title:t.title,status:t.status,object:t.object}))};
  const system='Ты командный ИИ проекта «У Илем». Отвечай по-русски. Не выдумывай остатки, состояние объектов, исполнителей и выполненные работы. Ничего не списывай и не меняй напрямую. Для конкретных поручений предложи черновики задач. Верни только JSON: {"reply":"ответ","tasks":[{"title":"название","person":"имя участника","object":"ID или null","hours":1,"priority":"Плановый","actions":["действие"],"purchases":[{"name":"материал","qty":1,"unit":"шт","price":0}],"notes":""}]}. Если задач не нужно, tasks: []. Не предлагай материалы без основания. Контекст: '+JSON.stringify(context);
  const history=arr('chat').slice(-18).map(m=>({role:m.who==='Дмитрий'?'user':'assistant',content:String(m.text||'')}));
  const raw=await ask([{role:'system',content:system}].concat(history)),plan=parsePlan(raw),reply=String(plan.reply||raw).trim();
  if(reply&&typeof addChat==='function')addChat('У Илем',reply,'assistant');
  const n=createDrafts(plan.tasks);if(n&&typeof addChat==='function')addChat('У Илем','Подготовил '+n+' черновиков. Они появились на общей доске со статусом «На согласовании». Проверь их перед утверждением.','system');
  if(typeof save==='function')save();if(typeof renderLiveTasks==='function')renderLiveTasks();if(typeof renderStats==='function')renderStats();status('Ollama подключена · '+h.model+' · ответ получен',true);
 }catch(e){const msg=e&&e.name==='AbortError'?'Истекло время ожидания ответа модели.':e&&e.message||'Неизвестная ошибка.';if(typeof addChat==='function')addChat('У Илем','Не удалось получить ответ локальной модели: '+msg,'system');status('Ollama недоступна · '+msg,false);}
 finally{input.disabled=false;input.focus();}
};
window.testOllama=async function(){
 status('Проверка Ollama и тестовый запрос…',false);
 try{const h=await health(),reply=await ask([{role:'user',content:'Ответь одним словом: готово.'}]);status('Проверка пройдена · '+h.model+' · '+String(reply).trim().slice(0,90),true);say('Ollama отвечает.');}
 catch(e){status('Проверка не пройдена · '+(e.message||'ошибка'),false);say('Ollama не отвечает.');}
};
if(typeof fetch==='function')health().then(h=>status('Ollama подключена · '+h.model,true)).catch(e=>status('Ollama недоступна · '+e.message,false));
})();