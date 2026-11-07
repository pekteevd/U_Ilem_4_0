'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'U_Ilem_4_0_water.js'), 'utf8');
const G = {
  cash: 100000, day: 1, month: 1, year: 1, tab: 'waterSystem',
  lighting: { source: 'grid', tariff: 8 },
  people: [{ id: 'd', name: 'Дмитрий', skill: 5, hours: 120, energy: 100 }]
};
const elements = {};
const workspace = { dataset: {}, innerHTML: '', addEventListener() {} };
const tabs = { querySelector() { return null; }, appendChild(el) { this.last = el; } };
const document = {
  getElementById(id) { return elements[id] || null; },
  createElement() { return { id: '', dataset: {}, style: {}, textContent: '' }; },
  head: { appendChild(el) { if (el.id) elements[el.id] = el; } }
};
elements.workspace = workspace; elements.tabs = tabs;
const window = {
  render() {}, renderWorkspace() {},
  advanceDay() { if (G.day < 30) G.day++; else { G.day = 1; G.month++; if (G.month > 12) { G.month = 1; G.year++; } } },
  nextMonth() { G.day = 1; G.month++; if (G.month > 12) { G.month = 1; G.year++; } }
};
let saves = 0;
const context = {
  G, window, document, save() { saves++; }, toast() {}, log() {},
  console, Math, Number, String, Array, Object, Date, JSON, Infinity, NaN
};
vm.runInNewContext(source, context, { filename: 'U_Ilem_4_0_water.js' });
const W = window.UilemWater;
let checks = 0;
function test(name, fn) {
  try { fn(); checks++; process.stdout.write('PASS ' + checks + ' - ' + name + '\n'); }
  catch (error) { process.stderr.write('FAIL - ' + name + ': ' + error.message + '\n'); process.exitCode = 1; }
}
test('water API is registered', () => assert.equal(typeof W.dailyTick, 'function'));
test('pump purchase charges money and adds to stock', () => { W.buy('surfacePump'); assert.equal(G.cash, 81500); assert.equal(G.waterSystem.stock.length, 1); });
test('pump installs from stock', () => { W.install(G.waterSystem.stock[0].id); assert.equal(G.waterSystem.pump.type, 'surfacePump'); assert.equal(G.waterSystem.stock.length, 0); });
test('storage capacity is accounted for', () => { W.buy('tank500'); W.install(G.waterSystem.stock[0].id); assert.equal(W.getTankCapacity(), 500); });
test('house connection consumes pipe stock', () => { W.buy('pipe10'); W.connect('mainHouse', 10); assert.equal(G.waterSystem.pipeStockMeters, 0); assert.equal(G.waterSystem.pipeInstalledMeters, 10); });
test('duplicate connection is rejected', () => { const before = G.waterSystem.connections.length; W.connect('mainHouse', 10); assert.equal(G.waterSystem.connections.length, before); });
test('garden connection and automatic irrigation set demand', () => { W.buy('pipe10'); W.buy('dripKit'); const kit=G.waterSystem.stock.find(x=>x.type==='dripKit'); W.install(kit.id); W.connect('garden',10); W.toggleIrrigation(); assert.equal(W.getDailyDemand(),300); });
test('pump output is capped by pump capacity', () => { G.day=2; W.dailyTick(); assert.equal(G.waterSystem.lastDay.produced,800); });
test('demand is served and tank fills to capacity', () => { assert.equal(G.waterSystem.lastDay.served,300); assert.equal(G.waterSystem.storageLitres,500); });
test('pump restores consumed reserve on the following day', () => { G.day=3; W.dailyTick(); assert.equal(G.waterSystem.lastDay.produced,300); assert.equal(G.waterSystem.storageLitres,500); });
test('same game date is processed only once', () => { const before=G.waterSystem.history.length; assert.equal(W.dailyTick(),false); assert.equal(G.waterSystem.history.length,before); });
test('manual watering consumes stored water', () => { assert.equal(W.takeManualWater(40),true); assert.equal(G.waterSystem.storageLitres,460); });
test('manual well drawing has a 120 litre daily cap', () => { G.waterSystem.storageLitres=0; G.waterSystem.manualDrawnToday=100; assert.equal(W.hasManualWater(40),false); });
test('pump fills a reserve even without active consumers', () => { G.waterSystem.connections=[]; G.waterSystem.storageLitres=0; G.day=4; W.dailyTick(); assert.equal(G.waterSystem.lastDay.produced,500); assert.equal(G.waterSystem.storageLitres,500); });
test('monthly transition processes day one once', () => { G.day=4; window.nextMonth(); assert.equal(G.month,2); assert.equal(G.day,1); assert.equal(G.waterSystem.lastProcessedDay,'1.2.1'); });
test('history is capped at 30 records', () => { for(let day=2;day<=35;day++){G.day=day;W.dailyTick();} assert.equal(G.waterSystem.history.length,30); });
test('installed pipe length equals connected routes', () => { assert.equal(G.waterSystem.pipeInstalledMeters,20); });
if(process.exitCode)process.exit(process.exitCode);
process.stdout.write('Water system: '+checks+'/17 checks passed. Saves: '+saves+'.\n');
