'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'U_Ilem_4_0_world3d.js'),'utf8');

const gl={
 VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,DYNAMIC_DRAW:6,
 COLOR_BUFFER_BIT:1,DEPTH_BUFFER_BIT:2,BLEND:7,SRC_ALPHA:8,ONE_MINUS_SRC_ALPHA:9,FLOAT:10,
 TRIANGLES:11,STREAM_DRAW:12,LINE_LOOP:13,
 createShader(){return {};},shaderSource(){},compileShader(){},getShaderParameter(){return true;},getShaderInfoLog(){return '';},
 createProgram(){return {};},attachShader(){},linkProgram(){},getProgramParameter(){return true;},getProgramInfoLog(){return '';},
 getAttribLocation(_p,n){return n==='p'?0:1;},createBuffer(){return {};},bindBuffer(){},bufferData(){},
 enableVertexAttribArray(){},vertexAttribPointer(){},viewport(){},clearColor(){},clear(){},enable(){},blendFunc(){},
 drawArrays(){},disableVertexAttribArray(){},vertexAttrib4f(){},deleteBuffer(){}
};
const handlers={};
const canvas={id:'',style:{},width:0,height:0,getContext(){return gl;},getBoundingClientRect(){return {left:0,top:0,width:800,height:500};},addEventListener(n,fn){handlers['canvas:'+n]=fn;},setPointerCapture(){}};
const buttonList=[];
const tools={id:'',className:'',innerHTML:'',style:{},querySelectorAll(){return buttonList;},addEventListener(){}};
const image={src:'',alt:'',style:{}};
const scene={
 classList:{add(){}},style:{},children:[],
 querySelector(sel){return sel==='img'?image:null;},querySelectorAll(){return [];},
 appendChild(el){this.children.push(el);if(el.id==='uilemWorldCanvas')elements.uilemWorldCanvas=el;if(el.id==='uilemWorldTools')elements.uilemWorldTools=el;},
 getBoundingClientRect(){return {left:0,top:0,width:800,height:500};}
};
const elements={scene,weatherFx:{style:{}},uilemObjectType:{value:'house'}};
const document={
 getElementById(id){return elements[id]||null;},
 createElement(tag){if(tag==='canvas')return canvas;if(tag==='div')return {id:'',className:'',style:{},innerHTML:'',querySelectorAll(){return buttonList;},addEventListener(){}};return {id:'',style:{},textContent:''};},
 head:{appendChild(el){elements[el.id]=el;}}
};
const G={
 selected:'mainHouse',objects:{mainHouse:{name:'Родительский дом',state:40,condition:'Требует работ'}},
 buildings:[{id:'customA',name:'Теплица',type:'greenhouse',x:70,y:60}],
 production:{placed:[{id:1,recipeId:'bench',name:'Скамейка',x:55,y:65}]},
 garden:{livingPlants:[{id:7,species:'apple',status:'Саженец',mapX:30,mapY:70}]},
 tasks:[],people:[{name:'Дмитрий'}],inventory:[],stages:[]
};
let saves=0,modalHtml='';
const window={
 G,devicePixelRatio:1,save(){saves++;},render(){},renderScene(){},renderObject(){},
 renderLiveTasks(){},toast(){},modal(html){modalHtml=html;},closeModal(){},addEventListener(){}
};
const context={window,document,G,save:window.save,render(){},renderScene(){},renderObject(){},toast(){},modal:window.modal,closeModal(){},console,Date,Math,Number,String,Array,Object,JSON,Set};
vm.runInNewContext(source,context,{filename:'U_Ilem_4_0_world3d.js'});
const W=window.UilemWorld3D;
let checks=0;
function test(name,fn){try{fn();checks++;process.stdout.write('PASS '+checks+' - '+name+'\n');}catch(e){process.stderr.write('FAIL - '+name+': '+e.stack+'\n');process.exitCode=1;}}
test('WebGL map API initializes',()=>assert.equal(typeof W.draw,'function'));
test('approved base objects are registered with stable ids',()=>assert.ok(G.mapObjects.some(x=>x.id==='mainHouse')));
test('construction objects synchronize to 3D map objects',()=>assert.ok(G.mapObjects.some(x=>x.id==='customA'&&x.type==='greenhouse')));
test('workshop products synchronize to 3D map objects',()=>assert.ok(G.mapObjects.some(x=>x.id==='production_1'&&x.type==='bench')));
test('living plants synchronize to 3D tree objects',()=>assert.ok(G.mapObjects.some(x=>x.id==='plant_7'&&x.type==='tree')));
test('placing a new 3D object creates a game object and a linked task',()=>{
 const before=G.tasks.length;W.addAt(400,250);
 const placed=G.mapObjects.find(x=>x.source==='player');
 assert.ok(placed);assert.ok(G.objects[placed.id]);assert.equal(G.tasks.length,before+1);assert.equal(G.tasks.at(-1).object,placed.id);
});
test('object editor exposes name and type controls',()=>{
 const o=G.mapObjects[0];assert.equal(W.edit(o.id),true);assert.ok(modalHtml.includes('uilemMapObjectName'));assert.ok(modalHtml.includes('uilemMapObjectType'));
});
test('rendering saves and draws without a runtime exception',()=>{W.draw();assert.ok(saves>=1);});
if(process.exitCode)process.exit(process.exitCode);
process.stdout.write('WebGL map and object integration: '+checks+'/7 checks passed. Saves: '+saves+'.\n');