'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'U_Ilem_4_0_repairs.js'), 'utf8');
function createHarness(){
  const G={day:4,month:5,year:1,selected:'mainHouse',objects:{mainHouse:{name:'Родительский дом'},bath:{name:'Баня'}},tasks:[],stages:[],inventory:[],people:[],calendar:{monthlyTasks:[]}};
  const elements={};
  const document={
    getElementById(id){return elements[id]||null;},
    querySelector(){return null;},
    createElement(tag){return {tagName:tag,style:{},dataset:{},textContent:'',appendChild(){},after(){},setAttribute(){},querySelector(){return null;},querySelectorAll(){return[];}};},
    head:{appendChild(){}},
    documentElement:{appendChild(){}}
  };
  let modalHtml='',toastText='';
  const window={renderWorkspace(){},renderObject(){},openTaskReview(){modalHtml='task review';}};
  const sandbox={window,document,G,save(){},toast(s){toastText=s;},modal(s){modalHtml=s;},renderStats(){},renderLiveTasks(){},renderWorkspace(){},render(){},closeModal(){},money:n=>String(n),log(){},confirm(){return true;},prompt(){return null;}};
  vm.runInNewContext(source,sandbox,{filename:'U_Ilem_4_0_repairs.js'});
  return {G,window,modal:()=>modalHtml,toast:()=>toastText};
}
{
  const h=createHarness(),api=h.window.UilemRepairs;
  const id=api.addCalendarTask('Осмотр сада','Весна');
  assert.ok(id,'calendar task should be created');
  assert.equal(h.G.tasks.length,1,'calendar action creates a shared task');
  assert.equal(h.G.calendar.monthlyTasks.length,1,'calendar record is created');
  assert.equal(String(h.G.calendar.monthlyTasks[0].taskId),String(h.G.tasks[0].id),'calendar and board share the same task ID');
  assert.equal(h.G.tasks[0].object,'mainHouse','task inherits selected object');
  assert.equal(api.addCalendarTask('Осмотр сада','Весна'),false,'duplicate recommendation is rejected');
  api.removeCalendarTask(0);
  assert.equal(h.G.calendar.monthlyTasks.length,0,'removed task leaves calendar');
  assert.equal(h.G.tasks[0].status,'Снята с плана','task history remains on the board');
}
{
  const h=createHarness();
  h.G.stages.push({id:1,title:'Ремонт родительского дома',object:'mainHouse',progress:0,need:[],hours:4},{id:2,title:'Ремонт бани',object:'bath',progress:0,need:[],hours:8});
  h.window.openObjectStages('mainHouse');
  assert.match(h.modal(),/Ремонт родительского дома/);
  assert.doesNotMatch(h.modal(),/Ремонт бани/,'object stage list must not include another building');
  h.window.openStageById(2);
  assert.match(h.modal(),/Ремонт бани/,'opening a stage by ID opens the requested stage');
}
{
  const h=createHarness();
  h.window.openTaskReview(999999);
  assert.match(h.toast(),/Задача не найдена/,'missing task ID must not crash task review');
}
console.log('U_Ilem_4_0_repairs: all tests passed');