/* У Илем 4.0 · система приобретаемого и устанавливаемого освещения */
(function () {
  'use strict';
  const catalog = [
    {type:'festoon10',name:'Гирлянда тёплая, 10 м',kind:'festoon',price:2400,watts:18,description:'Тёплый свет для террасы, беседки и деревьев.'},
    {type:'festoon20',name:'Гирлянда тёплая, 20 м',kind:'festoon',price:3900,watts:36,description:'Длинная гирлянда для дорожек и праздничного оформления.'},
    {type:'lantern',name:'Подвесной фонарь',kind:'lantern',price:1700,watts:5,description:'Компактный фонарь для крыльца, навеса или дерева.'},
    {type:'post',name:'Садовый фонарь на стойке',kind:'post',price:5600,watts:12,description:'Освещение дорожек и открытых площадок.'},
    {type:'wall',name:'Настенный фонарь',kind:'wall',price:2800,watts:8,description:'Локальный свет у входа и на фасаде.'},
    {type:'solar',name:'Солнечный автономный фонарь',kind:'solar',price:2100,watts:0,description:'Работает от встроенной солнечной панели без проводки.'}
  ];
  const defaults = () => ({stock:[],installed:[],enabled:true,mode:'auto',sceneTime:'evening',source:'grid',tariff:8,capacity:120,nextId:1,pending:null});
  const $ = id => document.getElementById(id);
  const rub = n => Math.round(n || 0).toLocaleString('ru-RU') + ' ₽';
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ensure(){
    if(typeof G==='undefined' || !G || typeof G!=='object') return false;
    if(!G.lighting || typeof G.lighting!=='object') G.lighting=defaults();
    const d=defaults(); Object.keys(d).forEach(k=>{if(G.lighting[k]===undefined)G.lighting[k]=d[k]});
    if(!Array.isArray(G.lighting.stock))G.lighting.stock=[];
    if(!Array.isArray(G.lighting.installed))G.lighting.installed=[];
    return true;
  }
  if(!ensure()) return;
  // Перенос старого стартового бюджета к утверждённой базовой экономике.
  // Применяется один раз и не трогает уже настроенные сохранения.
  if(!G.financeSetupVersion && G.cash===25000 && (G.reserve||0)===0 && G.year===1 && G.month===4 && G.day===1){
    G.cash=2000000;G.reserve=500000;G.financeSetupVersion=1;
    if(typeof log==='function')log('Стартовый бюджет настроен: 2 000 000 ₽ на развитие и 500 000 ₽ резерва.');
  } else if(!G.financeSetupVersion) G.financeSetupVersion=1;
  const def = type => catalog.find(x=>x.type===type) || catalog[0];
  function buy(type){
    const d=def(type);
    if(G.cash<d.price)return toast('Недостаточно свободных денег для покупки');
    G.lighting.stock.push({id:G.lighting.nextId++,type:d.type,name:d.name,kind:d.kind,price:d.price,watts:d.watts,installed:false});
    G.cash-=d.price;log('Куплено освещение: '+d.name+' за '+rub(d.price));save();render();toast('Покупка добавлена на склад');
  }
  function install(id){
    const item=G.lighting.stock.find(x=>x.id===id);if(!item)return;
    if(window.UilemProduction&&typeof window.UilemProduction.cancelPlacement==='function')window.UilemProduction.cancelPlacement(true);
    G.lighting.pending=id;$('scene')?.classList.add('placing');
    toast('Выбери точку установки на карте');
  }
  function place(e){
    const id=G.lighting.pending;if(id===null||id===undefined)return;
    if(e.target.closest('.hotspot')||e.target.closest('.ilem-light'))return;
    const scene=$('scene'),r=scene.getBoundingClientRect();
    const x=Math.max(2,Math.min(98,(e.clientX-r.left)/r.width*100));
    const y=Math.max(3,Math.min(96,(e.clientY-r.top)/r.height*100));
    const item=G.lighting.stock.find(x=>x.id===id);if(!item)return;
    const used=G.lighting.installed.reduce((n,x)=>n+x.watts,0);
    if(item.kind!=='solar'&&G.lighting.source==='none')return toast('Выбери источник питания');
    if(item.kind!=='solar'&&G.lighting.source==='grid'&&used+item.watts>G.lighting.capacity)return toast('Недостаточно мощности линии');
    G.lighting.stock=G.lighting.stock.filter(x=>x.id!==id);
    G.lighting.installed.push({...item,installed:true,x,y});
    G.lighting.pending=null;scene.classList.remove('placing');
    log('Установлено освещение: '+item.name);save();render();toast('Освещение установлено');
  }
  function uninstall(id){
    const item=G.lighting.installed.find(x=>x.id===id);if(!item)return;
    G.lighting.installed=G.lighting.installed.filter(x=>x.id!==id);
    G.lighting.stock.push({...item,installed:false,x:undefined,y:undefined});
    log('Снято освещение: '+item.name);save();render();
  }
  function lit(item){
    if(!G.lighting.enabled||G.lighting.mode==='off')return false;
    return item.kind==='solar'&&G.lighting.source==='none' ? true :
      G.lighting.mode==='on'||(G.lighting.mode==='auto'&&G.lighting.sceneTime!=='day');
  }
  function overlay(){
    const scene=$('scene');if(!scene)return;
    let layer=scene.querySelector('.ilem-light-layer');
    if(!layer){layer=document.createElement('div');layer.className='ilem-light-layer';scene.appendChild(layer)}
    layer.innerHTML='';
    G.lighting.installed.forEach(item=>{
      const el=document.createElement('span');
      el.className='ilem-light '+item.kind+(lit(item)?'':' ilem-light-off');
      el.style.left=item.x+'%';el.style.top=item.y+'%';el.title=item.name;
      el.innerHTML='<i class="lamp-core"></i>';layer.appendChild(el);
    });
    scene.classList.toggle('ilem-evening',G.lighting.sceneTime==='evening');
    scene.classList.toggle('ilem-night',G.lighting.sceneTime==='night');
  }
  function setTime(v){G.lighting.sceneTime=v;save();overlay();workspace();}
  function workspace(){
    if(G.tab!=='lighting')return;
    const w=$('workspace');if(!w)return;
    const l=G.lighting,watts=l.installed.reduce((n,x)=>n+x.watts,0);
    const kwh=watts*8*30/1000, bill=kwh*l.tariff;
    w.innerHTML=`
      <h3>💡 Освещение территории</h3>
      <p class="muted">Покупай светильники, устанавливай их на утверждённую карту и управляй вечерним оформлением. Координаты сохраняются в игровом мире.</p>
      <div class="grid2">
        <div class="tile"><small>Установлено объектов</small><b>${l.installed.length}</b></div>
        <div class="tile"><small>Подключённая мощность</small><b>${watts} Вт / ${l.capacity} Вт</b></div>
        <div class="tile"><small>Расход при 8 ч/день</small><b>${kwh.toFixed(1)} кВт·ч за 30 дней</b></div>
        <div class="tile"><small>Расчётная стоимость</small><b>${l.source==='grid'?rub(bill):l.source==='generator'?'Топливо генератора':'Автономно'}</b></div>
      </div>
      <div class="lighting-card"><b>Управление</b>
        <div class="actions">
          <button onclick="UilemLighting.mode('auto')">Автоматически</button>
          <button onclick="UilemLighting.mode('on')">Включить</button>
          <button onclick="UilemLighting.mode('off')">Выключить</button>
        </div>
        <label class="field">Время на карте<select onchange="UilemLighting.time(this.value)">
          <option value="day" ${l.sceneTime==='day'?'selected':''}>День</option>
          <option value="evening" ${l.sceneTime==='evening'?'selected':''}>Вечер</option>
          <option value="night" ${l.sceneTime==='night'?'selected':''}>Ночь</option>
        </select></label>
        <label class="field">Источник питания<select onchange="UilemLighting.source(this.value)">
          <option value="grid" ${l.source==='grid'?'selected':''}>Электросеть</option>
          <option value="generator" ${l.source==='generator'?'selected':''}>Генератор</option>
          <option value="solar" ${l.source==='solar'?'selected':''}>Солнечная система</option>
          <option value="none" ${l.source==='none'?'selected':''}>Без подключения</option>
        </select></label>
        <label class="field">Мощность линии, Вт<input type="number" min="10" value="${l.capacity}" onchange="UilemLighting.capacity(this.value)"></label>
        <label class="field">Тариф, ₽/кВт·ч<input type="number" min="0" step=".1" value="${l.tariff}" onchange="UilemLighting.tariff(this.value)"></label>
      </div>
      <h3>Магазин освещения</h3>
      <div class="lighting-grid">${catalog.map(d=>`
        <div class="lighting-card"><div class="light-preview"><i></i><b>${esc(d.name)}</b></div>
        <p class="light-meta">${esc(d.description)}</p>
        <div class="row"><span>${d.watts?d.watts+' Вт':'Автономный'}</span><b>${rub(d.price)}</b></div>
        <div class="actions"><button onclick="UilemLighting.buy('${d.type}')">Купить</button></div></div>`).join('')}</div>
      <h3>На складе</h3>
      ${l.stock.length?l.stock.map(x=>`<div class="row"><span><b>${esc(x.name)}</b><br><small>${x.watts} Вт · ${rub(x.price)}</small></span><button onclick="UilemLighting.install(${x.id})">Установить на карте</button></div>`).join(''):'<p class="muted">Пока пусто. Выбери предмет в магазине.</p>'}
      <h3>Установлено</h3>
      ${l.installed.length?l.installed.map(x=>`<div class="row"><span><b>${esc(x.name)}</b><br><small>${Math.round(x.x)}%, ${Math.round(x.y)}% карты · ${x.watts} Вт · ${lit(x)?'включено':'выключено'}</small></span><button onclick="UilemLighting.uninstall(${x.id})">Снять</button></div>`).join(''):'<p class="muted">Пока нет установленных объектов.</p>'}
      <p class="small">Проводные светильники учитываются в мощности линии. Солнечные фонари автономны. Сама карта и её координатная основа не изменяются.</p>`;
  }
  const oldWorkspace=window.renderWorkspace;
  window.renderWorkspace=function(){
    if(G.tab==='lighting'){
      document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab==='lighting'));
      workspace();return;
    }
    oldWorkspace();
  };
  const oldNextMonth=window.nextMonth;
  if(typeof oldNextMonth==='function')window.nextMonth=function(){
    const month=G.month;oldNextMonth();
    if(G.month!==month&&G.lighting.source==='grid'){
      const watts=G.lighting.installed.reduce((n,x)=>n+x.watts,0);
      const bill=watts*8*30/1000*G.lighting.tariff;
      if(bill>0){
        if(G.cash>=bill){G.cash-=bill;log('Электроэнергия освещения: '+rub(bill));}
        else{G.lighting.enabled=false;G.lighting.mode='off';log('Не хватило денег на оплату освещения. Свет отключён.');}
        save();render();
      }
    }
  };
  const oldScene=window.renderScene;window.renderScene=function(){oldScene();overlay()};
  const oldRender=window.render;window.render=function(){oldRender();overlay()};
  window.UilemLighting={
    buy,install,uninstall,time:setTime,
    mode(v){G.lighting.mode=v;G.lighting.enabled=v!=='off';save();overlay();workspace()},
    source(v){G.lighting.source=v;save();render()},
    capacity(v){G.lighting.capacity=Math.max(10,Number(v)||10);save();workspace()},
    tariff(v){G.lighting.tariff=Math.max(0,Number(v)||0);save();workspace()}
  };
  $('scene')?.addEventListener('click',place);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&G.lighting.pending!==null){
      G.lighting.pending=null;$('scene')?.classList.remove('placing');toast('Установка отменена');
    }
  });
  const tabs=$('tabs');
  if(tabs&&!tabs.querySelector('[data-tab="lighting"]')){
    const b=document.createElement('button');b.dataset.tab='lighting';b.textContent='💡 Освещение';
    b.addEventListener('click',()=>setTab('lighting'));tabs.appendChild(b);
  }
  const css=document.createElement('style');
  css.textContent=`
    #scene{overflow:hidden}
    .ilem-light-layer{position:absolute;inset:0;pointer-events:none;z-index:8}
    .ilem-light{position:absolute;transform:translate(-50%,-50%);width:12px;height:12px}
    .lamp-core{display:block;width:10px;height:10px;border-radius:50%;background:#ffe6a1;box-shadow:0 0 6px 3px #ffd36a,0 0 18px 8px #ffb84a}
    .ilem-light-off .lamp-core{opacity:.25;box-shadow:none;background:#777}
    .ilem-light.festoon{width:42px;height:12px;border-top:2px solid #f7d68b;border-radius:50%}
    .ilem-light.post:after{content:"";position:absolute;width:3px;height:22px;background:#39291d;left:4px;top:7px}
    .ilem-evening:after,.ilem-night:after{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;background:rgba(17,23,34,.25)}
    .ilem-night:after{background:rgba(9,15,29,.46)}
    .lighting-card{border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0;background:rgba(255,255,255,.035)}
    .lighting-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
    .light-preview{display:flex;align-items:center;gap:8px;color:#f1ce83}.light-preview i{width:9px;height:9px;border-radius:50%;background:#ffe6a1;box-shadow:0 0 12px 4px #ffc65b}
    .light-meta{font-size:12px;color:var(--muted);min-height:32px}
  `;
  document.head.appendChild(css);
  save();
})();
