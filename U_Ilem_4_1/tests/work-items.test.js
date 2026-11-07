'use strict';
const assert=require('node:assert/strict');
require('../core/work-items.js');
const W=global.UILemWorkItems;
assert.ok(W,'work item API loaded');
const state={
 people:[{id:'d',name:'Дмитрий',role:'Строитель',skill:4,hours:20},{id:'t',name:'Татьяна',role:'Сад и хозяйство',skill:3,hours:12}],
 objects:{mainHouse:{name:'Дом'},garden:{name:'Сад'}},
 stages:[{id:1,title:'Ремонт кровли',object:'mainHouse',progress:0,hours:8,skill:3,need:[]}],
 tasks:[{id:2,title:'Уход за садом',object:'garden',person:'Татьяна',hours:2,status:'На согласовании',kind:'task'}],
 calendar:{monthlyTasks:[{id:3,title:'Подготовить теплицу',season:'Весна',status:'На согласовании'}]}
};
const items=W.migrate(state);
assert.equal(items.length,3);
assert.equal(items[0].kind,'object_stage');
assert.equal(items[1].assigneeId,'t');
assert.equal(items[2].kind,'seasonal');
const repeated=W.migrate(state);
assert.deepEqual(items.map(x=>x.id),repeated.map(x=>x.id));
const picked=W.chooseAssignee({title:'Уход за садом',description:'Посадки',effort:{estimateHours:2,requiredSkill:2}},state.people);
assert.equal(picked.assigneeId,'t');
assert.equal(W.validate([{title:'a',object:'mainHouse',hours:1},{title:'b',object:'garden',hours:2},{title:'c',object:'garden',hours:3}],Object.keys(state.objects).map(id=>({id}))).ok,true);
assert.equal(W.validate([{title:'a',object:'mainHouse',hours:1}],Object.keys(state.objects).map(id=>({id}))).ok,false);
console.log('U Ilem 4.1 work-items tests: OK');
