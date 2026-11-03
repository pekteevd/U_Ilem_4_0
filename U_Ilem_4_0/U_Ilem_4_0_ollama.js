/* У Илем 4.0 — реальное подключение командного чата к локальной Ollama. */
(function(){
'use strict';
if(typeof G==='undefined'||!G)return;
G.chat=Array.isArray(G.chat)?G.chat:[];
let status={checked:false,online:false,modelInstalled:false,model:'qwen3:4b',error:null};
let statusNode=null;
const SYSTEM_PROMPT='Ты локальный ИИ-помощник проекта «У Илем». Отвечай по-русски, ясно и по делу. Учитывай историю диалога. Отличай обычный вопрос от поручения. Не утверждай, что изменил файлы, выполнил физическую работу, провёл закупку или сохранил что-либо, если это не подтверждено системой. Если обсуждается поручение, помоги уточнить результат, этапы, исполнителя, время и материалы. Не выдумывай состояние объектов, остатки склада и доступность людей. Если данных нет, прямо попроси уточнение.';
function setStatus(text,kind){
 const node=ensureStatus();if(!node)return;
 node.textContent=text;node.dataset.state=kind||'neutral';
}
function ensureStatus(){
 if(statusNode&&statusNode.isConnected!==false)return statusNode;
 const feed=document.getElementById('chatFeed');
 if(!feed||!feed.parentNode)return null;
 statusNode=document.getElementById('uilemOllamaStatus');
 if(!statusNode){
  statusNode=document.createElement('div');statusNode.id='uilemOllamaStatus';
  statusNode.style.cssText='font:11px Arial;padding:6px 9px;margin:5px 0;border-radius:8px;background:#eee5d2;color:#68583f';
  feed.parentNode.insertBefore(statusNode,feed);
 }
 return statusNode;
}
function updateStatus(){
 if(status.online){setStatus('Ollama подключена · '+status.model,'online');return;}
 if(status.ollama&&status.modelInstalled===false){setStatus('Ollama запущена, но модель '+status.model+' не установлена','warning');return;}
 if(status.checked){setStatus('Ollama недоступна · доступен резервный режим задач','offline');return;}
 setStatus('Проверка локальной Ollama…','neutral');
}
async function checkStatus(){
 updateStatus();
 try{
  const response=await fetch('/api/health',{method:'GET',cache:'no-store'});
  if(!response.ok)throw new Error('Локальный сервер вернул HTTP '+response.status);
  const data=await response.json();
  status={checked:true,online:data.ollama===true&&data.modelInstalled===true,ollama:data.ollama===true,modelInstalled:data.modelInstalled===true,model:data.model||'qwen3:4b',models:Array.isArray(data.models)?data.models:[],error:data.error||null};
 }catch(error){
  status={checked:true,online:false,ollama:false,modelInstalled:false,model:'qwen3:4b',models:[],error:error.message||String(error)};
 }
 updateStatus();return status;
}
function taskIntent(text){
 return /(поруч|нужно|надо|сделай|сделать|подготов|проверь|осмотр|ремонт|постро|закуп|купить|убрать|почин|покрас|установ|замен|составь|собери|организ)/i.test(text);
}
function renderChat(){
 if(typeof window.renderChat==='function')window.renderChat();
 else if(typeof renderChat==='function')renderChat();
}
function persist(){if(typeof save==='function')save();}
function appendUser(text){
 G.chat.push({who:'Дмитрий',text,kind:'user'});
}
function buildMessages(){
 const messages=[{role:'system',content:SYSTEM_PROMPT}];
 (G.chat||[]).slice(-14).forEach(m=>{
  if(!m||!m.text)return;
  messages.push({role:m.who==='Дмитрий'?'user':'assistant',content:String(m.text)});
 });
 return messages;
}
async function send(){
 const input=document.getElementById('chatInput');
 const text=String(input&&input.value||'').trim();
 if(!text)return false;
 if(input)input.value='';
 const start=G.chat.length;
 if(taskIntent(text)&&typeof window.sendCommand==='function'){
  try{window.__uilemOllamaCalling=true;previousSend();}catch(error){appendUser(text);}finally{window.__uilemOllamaCalling=false;}
  const userMessage=G.chat.slice(start).find(m=>m&&m.who==='Дмитрий');
  G.chat.splice(start);
  if(userMessage)G.chat.push(userMessage);else appendUser(text);
 }else appendUser(text);
 const pending={who:'У Илем · ИИ',text:'Проверяю Ollama и готовлю ответ…',kind:'system',pending:true};
 G.chat.push(pending);persist();renderChat();
 try{
  const current=await checkStatus();
  if(!current.online){
   pending.text=current.ollama?'Модель '+current.model+' не установлена в Ollama. Установи её командой: ollama pull '+current.model+'.':'Не удалось подключиться к локальной Ollama. Проверь, что приложение Ollama запущено и модель '+current.model+' установлена.';
   pending.pending=false;persist();renderChat();return false;
  }
  const response=await fetch('/api/ollama/chat',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({model:current.model,messages:buildMessages(),stream:false})
  });
  let data={};try{data=await response.json();}catch{}
  if(!response.ok)throw new Error(data.error||data.detail||('Ошибка чата HTTP '+response.status));
  const answer=String(data.message&&data.message.content||data.response||'').trim();
  if(!answer)throw new Error('Ollama вернула пустой ответ.');
  pending.text=answer;pending.pending=false;pending.kind='assistant';persist();renderChat();return true;
 }catch(error){
  pending.text='Ошибка локального ИИ: '+(error.message||String(error));
  pending.pending=false;persist();renderChat();setStatus('Ошибка Ollama · '+(error.message||'проверь подключение'),'offline');return false;
 }
}
const previousSend=window.sendCommand;
window.sendCommand=send;
const style=document.createElement('style');
style.textContent='#uilemOllamaStatus[data-state="online"]{background:#e1ecd9!important;color:#365b32!important}#uilemOllamaStatus[data-state="warning"]{background:#f4e9ca!important;color:#76541c!important}#uilemOllamaStatus[data-state="offline"]{background:#f0dfd9!important;color:#8a3d31!important}';
document.head.appendChild(style);
window.UilemOllama={checkStatus,send,getStatus:()=>({...status}),taskIntent};
checkStatus();
})();