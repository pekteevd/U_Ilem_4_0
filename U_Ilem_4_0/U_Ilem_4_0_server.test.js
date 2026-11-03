'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');

const PORT=Number(process.env.UILEM_TEST_PORT||43321);
const base='http://127.0.0.1:'+PORT;
const child=spawn(process.execPath,[path.join(__dirname,'U_Ilem_4_0_server.js')],{
 cwd:__dirname,
 env:{...process.env,UILEM_PORT:String(PORT)},
 stdio:['ignore','pipe','pipe']
});
let output='';
child.stdout.on('data',x=>output+=x.toString());
child.stderr.on('data',x=>output+=x.toString());

async function waitServer(){
 for(let i=0;i<40;i++){
  if(child.exitCode!==null)throw new Error('Server exited early: '+output);
  try{const r=await fetch(base+'/api/health');if(r.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw new Error('Server did not start: '+output);
}
(async()=>{
 try{
  await waitServer();
  const page=await fetch(base+'/__game');
  assert.equal(page.status,200);
  const html=await page.text();
  assert.ok(html.includes('<script src="/U_Ilem_4_0_world3d.js"></script>'));
  assert.ok(html.includes('<script src="/U_Ilem_4_0_ollama.js"></script>'));
  const module=await fetch(base+'/U_Ilem_4_0_world3d.js');
  assert.equal(module.status,200);
  assert.ok((await module.text()).includes('WebGL'));
  const image=await fetch(base+'/U_Ilem_4_0_visual_base.png');
  assert.equal(image.status,200);
  const bytes=new Uint8Array(await image.arrayBuffer());
  assert.ok(bytes.length>100000);
  assert.deepEqual(Array.from(bytes.slice(0,8)),[137,80,78,71,13,10,26,10]);
  process.stdout.write('Server integration: assembled page, WebGL module and approved map asset served successfully.\n');
 }catch(error){
  process.stderr.write('Server integration failed: '+(error.stack||error)+'\n');
  process.exitCode=1;
 }finally{
  child.kill('SIGTERM');
 }
})();