'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'U_Ilem_4_0_operations.js'), 'utf8');
const elements={
  defectTitle:{value:'Трещина в основании'},
  defectSeverity:{value:'Высокая'},
  defectDescription:{value:'Трещина у северного угла'},
  defectMaterials:{value:'Цемент; 2; меш.; 300'}
};
const G={day:4,month:5,year:1,selected:'mainHouse',cash:10000,objects:{mainHouse:{name:'Родительский дом'}},people:[{id:'d',name:'Дмитрий',hours:24,skill:4}],tasks:[],stages:[],defects:[],inspections:[],inventory:[{id:1,name:'Доска',qty:4,unit:'шт',price:100,cat:'materials'}]};
const document={
  getElementById(id){return elements[id]||null;},
  querySelector(){return null;},
  createElement(tag){return {tagName:tag,style:{},dataset:{},textContent:'',appendChild(){},after(){},setAttribute(){},querySelector(){return null;},querySelectorAll(){return[];}};},
  head:{appendChild(){}},
  documentElement:{appendChild(){}}
};
let modalHtml='';
const window={};
const sandbox={window,document,G,save(){},toast(){},modal(x){modalHtml=x;},renderStats(){},renderLiveTasks(){},render(){},closeModal(){},log(){},confirm(){return true;}};
vm.runInNewContext(source,sandbox,{filename:'U_Ilem_4_0_operations.js'});

window.saveDefect();
assert.equal(G.defects.length,1,'defect is saved');
assert.equal(G.defects[0].objectId,'mainHouse','defect is linked to selected object');
assert.equal(G.defects[0].materials[0].name,'Цемент','defect materials are parsed');
window.createTaskFromDefect(G.defects[0].id);
const task=G.tasks[0];
assert.ok(task,'defect creates a shared task');
assert.equal(task.object,'mainHouse','defect task keeps object link');
assert.equal(task.defectId,G.defects[0].id,'task keeps defect link');
assert.equal(task.purchases[0].qty,2,'defect materials move to task procurement');

G.tasks.push(
 {id:10,title:'Крыльцо',status:'Запланирована',purchases:[{name:'Доска',qty:5,unit:'шт',price:100}]},
 {id:11,title:'Забор',status:'На согласовании',purchases:[{name:'Доска',qty:3,unit:'шт',price:100}]},
 {id:12,title:'Завершённая работа',status:'Выполнена',purchases:[{name:'Доска',qty:99,unit:'шт',price:100}]}
);
G.stages.push({id:20,title:'Крепление водостока',object:'mainHouse',progress:0,need:[['Крепёж',2]]});
const list=window.UilemOperations.buildConsolidatedList();
const board=list.find(x=>x.name==='Доска');
const cement=list.find(x=>x.name==='Цемент');
const fastener=list.find(x=>x.name==='Крепёж');
assert.equal(board.qty,8,'same material requirements are merged');
assert.equal(board.stock,4,'warehouse balance is read');
assert.equal(board.toBuy,4,'warehouse balance is subtracted');
assert.equal(cement.qty,2,'defect materials are not double-counted after task creation');
assert.equal(fastener.toBuy,2,'active stage needs enter consolidated purchase');
assert.equal(list.some(x=>x.qty===99),false,'completed task materials are excluded');

window.confirmConsolidatedPurchase();
assert.equal(G.inventory.find(x=>x.name==='Доска').qty,8,'purchase updates stock once');
assert.equal(G.inventory.find(x=>x.name==='Цемент').qty,2,'defect material is added to stock');
assert.ok(G.cash<10000,'purchase deducts cash only after confirmation');
assert.equal(G.purchaseHistory.length,1,'purchase is recorded in history');
console.log('U_Ilem_4_0_operations: all tests passed');