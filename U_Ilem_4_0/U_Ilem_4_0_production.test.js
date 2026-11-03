'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'U_Ilem_4_0_production.js'), 'utf8');
const elements = {};
const scene = {
  dataset: {}, classList: { add(){}, remove(){}, toggle(){} },
  addEventListener(){}, querySelector(){return this.layer||null;},
  appendChild(el){this.layer=el;},
  getBoundingClientRect(){return {left:0,top:0,width:1000,height:600};}
};
const workspace = {dataset:{},innerHTML:'',addEventListener(){}};
const tabs = {querySelector(){return null;},appendChild(el){this.added=el;}};
elements.scene=scene;elements.workspace=workspace;elements.tabs=tabs;
const document = {
  getElementById(id){return elements[id]||null;},
  createElement(){return {id:'',className:'',dataset:{},style:{},innerHTML:'',textContent:'',addEventListener(){}};},
  head:{appendChild(el){if(el.id)elements[el.id]=el;}},
  querySelectorAll(){return {forEach(){}};}
};
const G = {
  cash:100000,day:1,month:4,year:1,tab:'overview',
  inventory:[
    {id:1,name:'Доска',unit:'шт',qty:20,price:450,cat:'materials',reserved:0,used:0},
    {id:2,name:'Брус',unit:'шт',qty:10,price:850,cat:'materials',reserved:0,used:0},
    {id:3,name:'Крепёж',unit:'уп.',qty:20,price:220,cat:'materials',reserved:0,used:0},
    {id:4,name:'Пропитка для древесины',unit:'л',qty:5,price:550,cat:'materials',reserved:0,used:0},
    {id:5,name:'Краска',unit:'банка',qty:2,price:900,cat:'materials',reserved:0,used:0},
    {id:6,name:'Молоток',unit:'шт',qty:1,price:900,cat:'tools',reserved:0,used:0},
    {id:7,name:'Шуруповёрт',unit:'шт',qty:1,price:6500,cat:'tools',reserved:0,used:0}
  ],
  people:[{id:'a',name:'Алексей',skill:3,hours:16,energy:90}],
  objects:{mainHouse:{name:'Родительский дом'}},
  interiorPlans:{mainHouse:{width:6,height:4,stock:[],nextId:1,history:[]}}
};
const window = {
  render(){},renderWorkspace(){},renderScene(){},
  UilemInteriors:{receiveCraftedFurniture(type,buildingId,name){const p=G.interiorPlans[buildingId];if(!p)return false;p.stock.push({id:p.nextId++,type,name});return true;}}
};
let saves=0, messages=[];
const context={G,window,document,save(){saves++;},toast(t){messages.push(t);},log(){},setTab(t){G.tab=t;window.renderWorkspace();},Math,Number,String,Array,Object,Date,JSON,Infinity,NaN};
vm.runInNewContext(source,context,{filename:'U_Ilem_4_0_production.js'});
const P=window.UilemProduction;
let checks=0;
function test(name,fn){try{fn();checks++;process.stdout.write('PASS '+checks+' - '+name+'\n');}catch(error){process.stderr.write('FAIL - '+name+': '+error.message+'\n');process.exitCode=1;}}
test('production API registered',()=>assert.equal(typeof P.craft,'function'));
test('required workshop consumables exist in warehouse',()=>assert.ok(G.inventory.some(x=>x.name==='Крепёж')&&G.inventory.some(x=>x.name==='Пропитка для древесины')));
test('chair recipe consumes exact inputs and records output',()=>{
 const before=G.cash;assert.equal(P.craft('chair'),true);
 assert.equal(G.inventory.find(x=>x.name==='Доска').qty,17);
 assert.equal(G.inventory.find(x=>x.name==='Брус').qty,9);
 assert.equal(G.inventory.find(x=>x.name==='Крепёж').qty,18);
 assert.equal(G.cash,before-120);assert.equal(G.people[0].hours,14);
 assert.equal(G.production.stock.length,1);assert.equal(G.production.totalCrafted,1);
});
test('interior furniture transfers to selected building stock',()=>{
 const g=G.production.stock[0];assert.equal(P.transferToInterior(g.id,'mainHouse'),true);
 assert.equal(G.production.stock.length,0);assert.equal(G.interiorPlans.mainHouse.stock.length,1);
 assert.equal(G.interiorPlans.mainHouse.stock[0].type,'chair');
});
test('insufficient materials do not partially deduct inputs',()=>{
 G.inventory.find(x=>x.name==='Доска').qty=0;
 const cash=G.cash,hours=G.people[0].hours,beam=G.inventory.find(x=>x.name==='Брус').qty;
 assert.equal(P.craft('table'),false);assert.equal(G.cash,cash);assert.equal(G.people[0].hours,hours);assert.equal(G.inventory.find(x=>x.name==='Брус').qty,beam);
});
test('outdoor product can be crafted and placed on map',()=>{
 G.inventory.find(x=>x.name==='Доска').qty=20;
 assert.equal(P.craft('bench'),true);
 const good=G.production.stock.find(x=>x.recipeId==='bench');
 assert.equal(P.startPlacement(good.id),true);assert.equal(P.placeAt(55,45),true);
 assert.equal(G.production.placed.length,1);assert.equal(G.production.stock.some(x=>x.id===good.id),false);
});
test('overlapping placement is rejected without consuming state',()=>{
 assert.equal(P.craft('flowerBox'),true);
 const good=G.production.stock.find(x=>x.recipeId==='flowerBox');
 P.startPlacement(good.id);assert.equal(P.placeAt(56,46),false);
 assert.equal(G.production.stock.some(x=>x.id===good.id),true);
 P.cancelPlacement();
});
test('placed product can be returned to workshop stock',()=>{
 const placed=G.production.placed[0];assert.equal(P.removePlaced(placed.id),true);
 assert.equal(G.production.placed.length,0);assert.ok(G.production.stock.some(x=>x.recipeId==='bench'));
});
test('indoor furniture cannot be placed directly on map',()=>{
 G.inventory.find(x=>x.name==='Доска').qty=12;
 assert.equal(P.craft('chair'),true);
 const good=G.production.stock.find(x=>x.recipeId==='chair');
 assert.ok(good);assert.equal(P.startPlacement(good.id),false);
});
test('lighting and workshop placement modes do not overlap',()=>{
 G.lighting={pending:77};
 assert.equal(P.craft('planter'),true);
 const good=G.production.stock.find(x=>x.recipeId==='planter');
 assert.ok(good);assert.equal(P.startPlacement(good.id),true);
 assert.equal(G.lighting.pending,null);
 assert.equal(G.production.pendingPlacement,undefined);
 P.cancelPlacement();
});
test('history and save hooks are used',()=>{assert.ok(G.production.history.length>=4);assert.ok(saves>=5);});
if(process.exitCode)process.exit(process.exitCode);
process.stdout.write('Production system: '+checks+'/9 checks passed. Saves: '+saves+'.\n');
