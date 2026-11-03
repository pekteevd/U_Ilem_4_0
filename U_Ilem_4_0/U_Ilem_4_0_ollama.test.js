'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'U_Ilem_4_0_ollama.js'),'utf8');
const feed={innerHTML:'',scrollTop:0,parentNode:{insertBefore(node){elements[node.id]=node;}}};
const input={value:''};
const elements={chatFeed:feed,chatInput:input};
const document={getElementById(id){return elements[id]||null;},createElement(){return{id:'',style:{cssText:''},dataset:{},textContent:'',isConnected:true};},head:{appendChild(){}}};
const G={chat:[{who:'У Илем',text:'Команда на связи.'}],tasks:[]};
let saves=0,rendered=0,oldSendCalls=0,healthCalls=0,chatCalls=0;
let health={ok:true,ollama:true,modelInstalled:true,model:'qwen3:4b',models:['qwen3:4b']};
let answer='Локальный ИИ отвечает.';
const window={renderChat(){rendered++;},sendCommand(){oldSendCalls++;G.chat.push({who:'Дмитрий',text:input.value});G.chat.push({who:'Дмитрий',text:'Принял. Черновик готов.'});G.tasks.push({id:1,title:'Осмотреть объект'});}};
async function fetchStub(url,options){
 if(url==='/api/health'){healthCalls++;return{ok:true,json:async()=>health};}
 if(url==='/api/ollama/chat'){chatCalls++;return{ok:true,json:async()=>({message:{content:answer}})};}
 throw new Error('Unexpected URL '+url);
}
const context={G,window,document,save(){saves++;},fetch:fetchStub,Date,Math,Number,String,Array,Object,JSON,Set,Promise};
vm.runInNewContext(source,context,{filename:'U_Ilem_4_0_ollama.js'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 let checks=0;
 async function test(name,fn){try{await fn();checks++;process.stdout.write('PASS '+checks+' - '+name+'\n');}catch(e){process.stderr.write('FAIL - '+name+': '+e.message+'\n');process.exitCode=1;}}
 await wait(0);
 await test('Ollama status check is registered',()=>assert.equal(typeof window.UilemOllama.checkStatus,'function'));
 await test('health endpoint confirms installed model',()=>{const s=window.UilemOllama.getStatus();assert.equal(s.online,true);assert.equal(s.modelInstalled,true);});
 await test('task message creates local draft and requests AI response',async()=>{input.value='Нужно осмотреть сад';await window.sendCommand();assert.equal(oldSendCalls,1);assert.equal(G.tasks.length,1);assert.ok(G.chat.some(m=>m.text===answer));assert.equal(chatCalls,1);});
 await test('ordinary question does not generate accidental tasks',async()=>{input.value='Почему листья желтеют осенью?';const before=G.tasks.length;await window.sendCommand();assert.equal(G.tasks.length,before);assert.ok(G.chat.some(m=>m.text===answer));});
 await test('missing model is reported without sending chat request',async()=>{health={ok:true,ollama:true,modelInstalled:false,model:'qwen3:4b',models:[]};const before=chatCalls;input.value='Привет';await window.sendCommand();assert.equal(chatCalls,before);assert.ok(G.chat.some(m=>m.text.includes('ollama pull qwen3:4b')));});
 await test('offline Ollama is not falsely shown as connected',async()=>{health={ok:true,ollama:false,modelInstalled:false,model:'qwen3:4b',models:[]};await window.UilemOllama.checkStatus();assert.equal(window.UilemOllama.getStatus().online,false);});
 if(process.exitCode)process.exit(process.exitCode);
 process.stdout.write('Ollama chat integration: '+checks+'/6 checks passed. Health requests: '+healthCalls+'; chat requests: '+chatCalls+'.\n');
})().catch(error=>{process.stderr.write('FAIL - async suite: '+error.stack+'\n');process.exitCode=1;});
