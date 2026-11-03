'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'U_Ilem_4_0_ollama.js'), 'utf8');
async function run(){
 const G={day:1,month:5,year:1,selected:'mainHouse',objects:{mainHouse:{name:'Дом',state:70,condition:'Нужен ремонт'}},people:[{id:'d',name:'Дмитрий',hours:24,skill:4}],inventory:[],tasks:[],chat:[]};
 const input={value:'Осмотри крышу',disabled:false,focus(){}};
 const heading={after(){}},chatbox={querySelector(){return heading;}},elements={chatInput:input};
 const document={getElementById(id){return elements[id]||null;},querySelector(q){return q==='#taskChat .chatbox'?chatbox:null;},createElement(){return {id:'',className:'',style:{},textContent:'',after(){},onclick:null};}};
 const calls=[];
 async function fetchMock(url){
  calls.push(url);
  if(url==='/api/health')return {ok:true,json:async()=>({ollama:true,modelInstalled:true,model:'qwen3:4b',models:['qwen3:4b']})};
  return {ok:true,json:async()=>({message:{content:JSON.stringify({reply:'Проверю крышу.',tasks:[{title:'Осмотреть крышу',person:'Дмитрий',object:'mainHouse',hours:1,actions:['Проверить покрытие']}]})}})};
 }
 const window={};
 const sandbox={window,document,G,fetch:fetchMock,AbortController,setTimeout,clearTimeout,toast(){},addChat(who,text,kind){G.chat.push({who,text,kind});},save(){},renderLiveTasks(){},renderStats(){}};
 vm.runInNewContext(source,sandbox,{filename:'U_Ilem_4_0_ollama.js'});
 await window.sendCommand();
 assert.ok(calls.includes('/api/health'),'chat checks the local Ollama health endpoint');
 assert.ok(calls.includes('/api/ollama/chat'),'chat sends the prompt to Ollama');
 assert.equal(G.tasks.length,1,'structured model output creates one draft task');
 assert.equal(G.tasks[0].object,'mainHouse','draft task inherits the selected object');
 assert.equal(G.tasks[0].status,'На согласовании','AI tasks require approval');
 assert.equal(input.disabled,false,'chat input is re-enabled after the request');
 assert.ok(G.chat.some(m=>m.text==='Проверю крышу.'),'model reply appears in the chat');
 console.log('U_Ilem_4_0_ollama: all tests passed');
}
run().catch(error=>{console.error(error);process.exitCode=1;});