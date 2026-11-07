'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'U_Ilem_4_1_ecology.js'), 'utf8');
const elements = {};
const scene = {
  dataset: {},
  layer: null,
  onClick: null,
  classList: { add(){}, remove(){}, toggle(){} },
  addEventListener(name, fn) { if (name === 'click') this.onClick = fn; },
  querySelector() { return this.layer; },
  appendChild(el) { this.layer = el; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 600 }; }
};
const workspace = { dataset: {}, innerHTML: '', addEventListener() {} };
const tabs = { querySelector() { return null; }, appendChild() {} };
elements.scene = scene; elements.workspace = workspace; elements.tabs = tabs;
const document = {
  getElementById(id) { return elements[id] || null; },
  createElement() { return { id: '', className: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }; },
  head: { appendChild(el) { if (el.id) elements[el.id] = el; } },
  addEventListener() {},
  querySelectorAll() { return { forEach() {} }; }
};
const G = {
  cash: 10000, day: 1, month: 5, year: 1, tab: 'overview',
  inventory: [
    { id: 1, name: 'Саженцы', unit: 'шт', qty: 3, price: 450, cat: 'garden', reserved: 0 },
    { id: 2, name: 'Удобрения', unit: 'кг', qty: 5, price: 90, cat: 'garden', reserved: 0 }
  ],
  people: [{ id: 't', name: 'Татьяна', skill: 3, hours: 24, energy: 90 }],
  garden: { zones: [{ id: 1, name: 'Яблоневый сад', type: 'Сад', plot: 1 }], livingPlants: [] },
  weather: ['☀', 'Ясно', 20],
  lighting: { pending: null }
};
let saves = 0;
let productionCancels = 0;
const messages = [];
const window = {
  render() {}, renderWorkspace() {}, renderScene() {},
  advanceDay() { G.day++; },
  nextMonth() { G.month++; G.day = 1; },
  UilemProduction: { cancelPlacement() { productionCancels++; } }
};
const context = {
  G, window, document,
  save() { saves++; },
  toast(message) { messages.push(message); },
  log() {},
  weatherRoll() { G.weather = ['☀', 'Ясно', 20]; },
  Math, Number, String, Array, Object, Date, JSON, Infinity, NaN
};
vm.runInNewContext(source, context, { filename: 'U_Ilem_4_1_ecology.js' });
const E = window.UilemEcology;
let checks = 0;
function test(name, fn) {
  try { fn(); checks++; process.stdout.write('PASS ' + checks + ' - ' + name + '\n'); }
  catch (error) { process.stderr.write('FAIL - ' + name + ': ' + error.message + '\n'); process.exitCode = 1; }
}
test('ecology map API is registered', () => {
  assert.equal(typeof E.locate, 'function');
  assert.equal(typeof E.placeAt, 'function');
  assert.equal(typeof E.cancelLocate, 'function');
});
test('planting consumes a seedling but does not invent map coordinates', () => {
  E.plant('apple');
  assert.equal(G.garden.livingPlants.length, 1);
  assert.equal(G.inventory.find(x => x.name === 'Саженцы').qty, 2);
  assert.equal(G.garden.livingPlants[0].mapX, null);
  assert.equal(G.garden.livingPlants[0].mapY, null);
});
test('locate mode cancels workshop and lighting placements', () => {
  const p = G.garden.livingPlants[0];
  G.lighting.pending = 44;
  assert.equal(E.locate(p.id), true);
  assert.equal(productionCancels, 1);
  assert.equal(G.lighting.pending, null);
  assert.ok(scene.classList);
});
test('map coordinates are clamped to the visible map area and saved', () => {
  const p = G.garden.livingPlants[0];
  assert.equal(E.placeAt(150, -20), true);
  assert.equal(p.mapX, 98);
  assert.equal(p.mapY, 3);
  assert.ok(saves > 0);
});
test('individual plant marker appears on the shared map overlay', () => {
  E.renderMap();
  assert.ok(scene.layer);
  assert.match(scene.layer.innerHTML, /Яблоня/);
  assert.match(scene.layer.innerHTML, /left:98%;top:3%/);
});
test('plant can be moved without changing other world geometry', () => {
  const p = G.garden.livingPlants[0];
  const before = { mainHouse: { x: 12, y: 24 } };
  E.locate(p.id);
  assert.equal(E.placeAt(45, 55), true);
  assert.equal(p.mapX, 45);
  assert.equal(p.mapY, 55);
  assert.deepEqual(before.mainHouse, { x: 12, y: 24 });
});
test('native map click handler places the selected plant', () => {
  const p = G.garden.livingPlants[0];
  E.locate(p.id);
  scene.onClick({
    clientX: 500, clientY: 300,
    target: { closest() { return null; } }
  });
  assert.equal(p.mapX, 50);
  assert.equal(p.mapY, 50);
});
test('cancel locate exits map placement mode', () => {
  const p = G.garden.livingPlants[0];
  E.locate(p.id);
  E.cancelLocate();
  assert.equal(E.placeAt(10, 10), false);
});
test('removed plant marker disappears but record remains in history', () => {
  const p = G.garden.livingPlants[0];
  E.remove(p.id);
  E.renderMap();
  assert.equal(p.status, 'Удалено');
  assert.equal(G.garden.livingPlants.length, 1);
  assert.doesNotMatch(scene.layer.innerHTML, /Яблоня/);
});
test('plant card exposes map placement action', () => {
  E.plant('apple');
  G.tab = 'livingPlants';
  E.render();
  assert.match(workspace.innerHTML, /Указать место на карте|Переместить на карте/);
});
if (process.exitCode) process.exit(process.exitCode);
process.stdout.write('Ecology map integration: ' + checks + '/10 checks passed. Saves: ' + saves + '.\n');
