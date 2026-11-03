'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'U_Ilem_4_0_map_ui.js'),'utf8');
const buttons=[{textContent:'Выполнить этап'},{textContent:'Все работы',onclick:null}];
const mapButtons=[{textContent:'＋ Строить · участок 2',onclick:null},{textContent:'＋ Строить · участок 3',onclick:null}];
const elements={
 scene:{appendChild(el){elements[el.id]=el;}},
 plotControls:{querySelectorAll(){return mapButtons;},innerHTML:''},
 objectDetail:{innerHTML:'',querySelectorAll(){return buttons;}},
 workspace:{innerHTML:''},
 ilemNewStageTitle:{value:'Покрасить дверь'},
 ilemNewStageHours:{value:'5'},
 ilemNewStageCost:{value:'1200'},
 ilemNewStageSkill:{value:'2'}
};
const document={
 getElementById(id){return elements[id]||null;},
 createElement(){return {id:'',textContent:''};},
 head:{appendChild(el){elements[el.id]=el;}}
};
const G={
 selected:'mainHouse',tab:'overview',objectTasksFilter:null,
 objects:{mainHouse:{name:'Родительский дом'},bath:{name:'Баня'}},
 stages:[
  {id:1,title:'Починить крыльцо',object:'mainHouse',progress:0,need:[['Доска',3]],hours:4,cost:100,skill:1},
  {id:2,title:'Покрасить фасад',object:'mainHouse',progress:100,need:[],hours:2,cost:0,skill:1},
  {id:3,title:'Установить печь',object:'bath',progress:0,need:[],hours:6,cost:500,skill:2}
 ],
 inventory:[{name:'Доска',qty:10,unit:'шт'}],
 people:[{id:'d',name:'Дмитрий',skill:3,hours:20}],
 tasks:[]
};
let modalHtml='',workspaceCalls=0,renderCalls=0,saves=0;
const window={
 renderWorkspace(){workspaceCalls++;},setTab(t){G.tab=t;this.renderWorkspace();},
 renderObject(){elements.objectDetail.innerHTML='object';},modal(html){modalHtml=html;},choosePlot(plot){G.lastChosenPlot=plot;},
 executeStage(){},render(){renderCalls++;}
};
const context={G,window,document,save(){saves++;},toast(){},log(){},render(){renderCalls++;},closeModal(){},Date,Math,Number,String,Array,Object,JSON};
vm.runInNewContext(source,context,{filename:'U_Ilem_4_0_map_ui.js'});
const U=window.UilemMapUI;
let checks=0;
function test(name,fn){try{fn();checks++;process.stdout.write('PASS '+checks+' - '+name+'\n');}catch(e){process.stderr.write('FAIL - '+name+': '+e.message+'\n');process.exitCode=1;}}
test('map UI API registered',()=>assert.equal(typeof U.openObjectStages,'function'));
test('map construction buttons are rebound to plot selection',()=>{assert.equal(typeof mapButtons[0].onclick,'function');mapButtons[0].onclick({preventDefault(){}});assert.equal(G.lastChosenPlot,2);});
test('object stage manager only lists selected object stages',()=>{
 window.openStage('mainHouse');
 assert.ok(modalHtml.includes('Починить крыльцо'));
 assert.ok(modalHtml.includes('Покрасить фасад'));
 assert.equal(modalHtml.includes('Установить печь'),false);
});
test('specific stage opens its own detail view',()=>{
 window.ilemOpenStageById(3);
 assert.ok(modalHtml.includes('Установить печь'));
 assert.ok(modalHtml.includes('executeStage(3)'));
});
test('new stage form is tied to selected object',()=>{
 window.ilemCreateStageForObject('mainHouse');
 assert.ok(modalHtml.includes('Новый этап · Родительский дом'));
 assert.ok(modalHtml.includes('ilemSaveNewStage'));
});
test('saving a new stage stores the selected object id',()=>{
 const id=window.ilemSaveNewStage('mainHouse');
 const s=G.stages.find(x=>x.id===id);
 assert.ok(s);assert.equal(s.object,'mainHouse');assert.equal(s.title,'Покрасить дверь');
 assert.equal(s.hours,5);assert.equal(s.cost,1200);assert.equal(s.skill,2);
});
test('object work filter excludes other buildings',()=>{
 window.ilemShowObjectWorks('mainHouse');
 assert.ok(elements.workspace.innerHTML.includes('Починить крыльцо'));
 assert.equal(elements.workspace.innerHTML.includes('Установить печь'),false);
});
test('top-level build navigation clears object-only filter',()=>{
 window.setTab('build');
 assert.equal(G.objectTasksFilter,null);
 assert.ok(workspaceCalls>0);
});
test('object detail all-works button is redirected to object filter',()=>{
 G.selected='mainHouse';window.renderObject();
 buttons[1].onclick({preventDefault(){}});
 assert.equal(G.objectTasksFilter,'mainHouse');
 assert.ok(elements.workspace.innerHTML.includes('Починить крыльцо'));
});
test('moving sweep animation is disabled without removing the map',()=>{
 const css=elements['uilem-map-visual-cleanup'].textContent;
 assert.ok(css.includes('animation:none!important'));
 assert.ok(css.includes('.scene:after'));
});
if(process.exitCode)process.exit(process.exitCode);
process.stdout.write('Map and object-work integration: '+checks+'/8 checks passed. Saves: '+saves+'.\n');
