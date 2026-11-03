'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'U_Ilem_4_0_calendar_tasks.js'),'utf8');
const elements={workspace:{innerHTML:''}};
const document={getElementById(id){return elements[id]||null;}};
const G={
 day:4,month:5,year:2,tab:'calendar',selected:'mainHouse',
 objects:{mainHouse:{name:'Родительский дом'}},
 people:[{id:'d',name:'Дмитрий'}],tasks:[],
 calendar:{monthlyTasks:[]}
};
let saves=0,boardRenders=0,taskRenders=0,messages=[];
const window={
 renderWorkspace(){},renderLiveTasks(){boardRenders++;},renderTasks(){taskRenders++;},
 openTaskReview(){},ilemApproveTask(){},ilemRejectTask(){},ilemExecuteTask(){}
};
const months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const seasons=['Зима','Весна','Лето','Осень'];
const context={G,window,document,save(){saves++;},toast(x){messages.push(x);},renderTasks(){taskRenders++;},prompt(){return 'Покрасить входную дверь';},months,seasons,Date,Math,Number,String,Array,Object,JSON,Set};
vm.runInNewContext(source,context,{filename:'U_Ilem_4_0_calendar_tasks.js'});
const C=window.UilemCalendarTasks;
let checks=0;
function test(name,fn){try{fn();checks++;process.stdout.write('PASS '+checks+' - '+name+'\n');}catch(e){process.stderr.write('FAIL - '+name+': '+e.message+'\n');process.exitCode=1;}}
test('calendar task API registered',()=>assert.equal(typeof C.addTask,'function'));
test('adding recommendation creates one shared task record',()=>{
 const id=C.addTask(0),t=G.tasks.find(x=>x.id===id);
 assert.ok(t);assert.equal(typeof t.id,'number');assert.equal(t.status,'На согласовании');
 assert.equal(t.calendarMonth,5);assert.equal(t.calendarYear,2);assert.equal(t.object,null);
 assert.equal(G.calendar.monthlyTasks.length,0);
});
test('task appears in common board and calendar list',()=>{
 assert.ok(boardRenders>0);assert.ok(taskRenders>0);window.renderWorkspace();
 assert.ok(elements.workspace.innerHTML.includes('ilemAddCalendarTask(0)')===false);
 assert.ok(elements.workspace.innerHTML.includes('План месяца'));
 assert.ok(elements.workspace.innerHTML.includes('Осмотр сада после зимы'));
});
test('same recommendation cannot be added twice',()=>{
 const before=G.tasks.length;assert.equal(C.addTask(0),false);assert.equal(G.tasks.length,before);
});
test('another month gets a distinct recommendation key',()=>{
 G.month=6;const id=C.addTask(0);assert.ok(id);assert.equal(G.tasks.length,2);
});
test('removing a calendar task keeps history and hides it from plan',()=>{
 G.month=5;const task=G.tasks[0];assert.equal(C.removeTask(task.id),true);assert.equal(task.status,'Отклонена');
 window.renderWorkspace();assert.equal(elements.workspace.innerHTML.includes('<b>'+task.title+'</b>'),false);
});
test('legacy calendar entries migrate once into shared tasks',()=>{
 const old=G.calendar.monthlyTasks;old.push({title:'Старый пункт календаря',season:'Лето',status:'На согласовании'});
 G.calendar.monthlyTasksMigrated=false;C.migrateLegacy();
 assert.ok(G.tasks.some(t=>t.title==='Старый пункт календаря'&&t.calendarKey));
 const count=G.tasks.length;C.migrateLegacy();assert.equal(G.tasks.length,count);
 assert.equal(G.calendar.monthlyTasks.length,1);
});
test('custom calendar task is also a shared task',()=>{
 const id=window.ilemCreateCalendarTask();assert.ok(G.tasks.some(t=>t.id===id&&t.title==='Покрасить входную дверь'));
});
if(process.exitCode)process.exit(process.exitCode);
process.stdout.write('Calendar/task integration: '+checks+'/7 checks passed. Saves: '+saves+'.\n');
