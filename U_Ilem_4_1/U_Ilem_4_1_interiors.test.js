'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'U_Ilem_4_1_interiors.js'), 'utf8');
const elements = {};
const workspace = { dataset: {}, innerHTML: '', addEventListener() {} };
const tabs = { querySelector() { return null; }, appendChild() {} };
const document = {
  getElementById(id) { return elements[id] || null; },
  createElement() { return { id: '', dataset: {}, style: {}, textContent: '' }; },
  head: { appendChild(el) { if (el.id) elements[el.id] = el; } }
};
elements.workspace = workspace;
elements.tabs = tabs;

const G = {
  cash: 1000000,
  tab: 'interiors',
  day: 1,
  month: 1,
  year: 1,
  people: [{ id: 'd', name: 'Дмитрий', skill: 5, hours: 120, energy: 100 }],
  objects: {
    mainHouse: { name: 'Родительский дом', condition: 'Требует ремонта' },
    guestA: { name: 'Гостевой дом №1' },
    guestB: { name: 'Гостевой дом №2' },
    bath: { name: 'Баня' }
  },
  buildings: [],
  log: []
};
const window = { render() {}, renderWorkspace() {} };
let saves = 0;
const messages = [];

vm.runInNewContext(source, {
  G, window, document,
  save() { saves++; },
  toast(message) { messages.push(String(message)); },
  log(message) { G.log.push(String(message)); },
  console, Math, Number, String, Array, Object, Date, JSON, Infinity, NaN
}, { filename: 'U_Ilem_4_1_interiors.js' });

const I = window.UilemInteriors;
assert.ok(I, 'Interior editor API must be registered');
const plan = I.getPlan();
assert.ok(plan && plan.cells.length > 0, 'A building plan must exist');
const width = plan.width;
const height = plan.height;

let checks = 0;
function test(name, fn) {
  fn();
  checks++;
  process.stdout.write('PASS ' + checks + ' - ' + name + '\n');
}

test('initial isometric preview contains floor geometry', () => {
  const svg = I.drawIso(plan);
  assert.ok(svg.includes('id="u4i-iso"'));
  assert.ok((svg.match(/<polygon/g) || []).length >= plan.cells.length);
});
test('preview is displayed below the editing controls', () => {
  assert.ok(workspace.innerHTML.includes('u4i-iso-box'));
  assert.ok(workspace.innerHTML.indexOf('u4i-iso-box') > workspace.innerHTML.indexOf('u4i-layout'));
});
test('room assignment changes the rendered label', () => {
  I.setRoom(0, 'kitchen', 'Кухня');
  assert.equal(plan.cells[0].label, 'Кухня');
  assert.ok(I.drawIso(plan).includes('Кухня'));
});
test('partition is represented in the plan', () => {
  I.togglePartition('v:0:0');
  assert.ok(plan.partitions.includes('v:0:0'));
});
test('interior door is represented in the plan', () => {
  I.toggleDoor('v:0:0');
  assert.ok(plan.doors.includes('v:0:0'));
});
test('window is represented in the plan', () => {
  I.toggleWindow('t:0');
  assert.ok(plan.windows.includes('t:0'));
});
test('furniture purchase adds an item to stock', () => {
  I.buyFurniture('table');
  assert.ok(plan.stock.some(x => x.type === 'table'));
});
test('furniture placement changes the isometric scene', () => {
  const item = plan.stock.find(x => x.type === 'table');
  I.placeFurniture(item.id, 0);
  assert.equal(plan.furniture.length, 1);
  assert.ok((I.drawIso(plan).match(/<polygon/g) || []).length > plan.cells.length);
});
test('protected wall cannot be demolished', () => {
  I.toggleProtected('v:0:0');
  const count = plan.partitions.length;
  I.togglePartition('v:0:0');
  assert.equal(plan.partitions.length, count);
  assert.ok(plan.protectedEdges.includes('v:0:0'));
});
test('view rotation changes projection', () => {
  const before = I.drawIso(plan);
  I.rotateIso(1);
  const after = I.drawIso(plan);
  assert.notEqual(after, before);
});
test('view rotation does not change the exterior footprint', () => {
  assert.equal(plan.width, width);
  assert.equal(plan.height, height);
});
if (process.exitCode) process.exit(process.exitCode);
process.stdout.write('Interior preview: ' + checks + '/11 checks passed. Saves: ' + saves + '.\n');
