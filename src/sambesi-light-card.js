/*
 * Sambesi Light Card v0.1.0
 * Universal Home Assistant Lovelace card for lights, scenes and rooms.
 * Repository: https://github.com/drschnalli/sambesi-light-card
 */
const SAMBESI_VERSION = "0.1.0";

const DEFAULT_CONFIG = {
  title: "Sambesi Lights",
  preset: "djungle",
  layout: "wall",
  auto_discover: true,
  group_by: "area", // area | domain | none
  sort_by: "area_name", // area_name | friendly_name | entity_id | state
  columns: "auto",
  show_header: true,
  show_stats: true,
  show_search: true,
  show_area_tabs: true,
  show_scenes: true,
  show_light_cards: true,
  show_footer: true,
  show_unavailable: true,
  compact: false,
  lights: [],
  scenes: [],
  include_areas: [],
  exclude_areas: [],
  include_entities: [],
  exclude_entities: [],
  discovery: {
    domains: ["light"],
    include_entities: [],
    exclude_entities: [],
    include_name_contains: [],
    exclude_name_contains: [],
    prefer_available: true,
    hide_unavailable_duplicates: true
  },
  controls: {
    power: true,
    brightness: true,
    quick_brightness: true,
    color_temp: "auto",
    rgb: "auto",
    scenes: true
  },
  quick_brightness_values: [10,25,50,75,100],
  rgb_presets: [
    { name: "Warm", color: [255,180,95] },
    { name: "Day", color: [255,244,214] },
    { name: "Blue", color: [80,160,255] },
    { name: "Green", color: [70,255,150] },
    { name: "Violet", color: [190,100,255] }
  ]
};

function deepMerge(base, extra) {
  const out = Array.isArray(base) ? [...base] : {...base};
  if (!extra || typeof extra !== 'object') return out;
  for (const [k,v] of Object.entries(extra)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) out[k] = deepMerge(base[k], v);
    else out[k] = Array.isArray(v) ? [...v] : v;
  }
  return out;
}

function slug(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9_äöüß -]/gi,'').trim(); }
function pctFromBrightness(b){ return Math.round((Number(b || 0) / 255) * 100); }
function brightnessFromPct(p){ return Math.round(Math.max(0, Math.min(100, Number(p))) * 2.55); }
function isOn(st){ return st && st.state === 'on'; }
function supported(entity, mode){
  const a = entity?.attributes || {};
  const modes = a.supported_color_modes || [];
  if (mode === 'brightness') return ('brightness' in a) || modes.includes('brightness') || modes.includes('color_temp') || modes.includes('hs') || modes.includes('rgb') || modes.includes('xy') || modes.includes('rgbw') || modes.includes('rgbww');
  if (mode === 'color_temp') return ('color_temp' in a) || modes.includes('color_temp');
  if (mode === 'rgb') return ('rgb_color' in a) || modes.some(m => ['hs','rgb','xy','rgbw','rgbww'].includes(m));
  return false;
}
function globMatch(text, patterns){
  if (!patterns || !patterns.length) return true;
  return patterns.some(p => new RegExp('^'+String(p).replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')+'$','i').test(text));
}
function getFriendlyName(st){ return st?.attributes?.friendly_name || st?.entity_id || ''; }

class SambesiLightCard extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this._config = deepMerge(DEFAULT_CONFIG, {});
    this._selectedArea = 'all';
    this._query = '';
  }

  static getConfigElement(){ return document.createElement('sambesi-light-card-editor'); }
  static getStubConfig(){ return { type:'custom:sambesi-light-card', title:'Sambesi Lights', preset:'djungle', layout:'wall', auto_discover:true, group_by:'area' }; }

  setConfig(config){
    if (!config) throw new Error('Invalid configuration');
    this._config = deepMerge(DEFAULT_CONFIG, config);
    this.render();
  }

  set hass(hass){ this._hass = hass; this.render(); }
  getCardSize(){ return 4; }

  _areaNameForEntity(entityId){
    const h = this._hass;
    const entityReg = h?.entities?.[entityId];
    const deviceId = entityReg?.device_id;
    const areaId = entityReg?.area_id || h?.devices?.[deviceId]?.area_id;
    if (!areaId) return 'Ohne Bereich';
    return h?.areas?.[areaId]?.name || areaId;
  }
  _areaIdForEntity(entityId){
    const h = this._hass;
    const entityReg = h?.entities?.[entityId];
    const deviceId = entityReg?.device_id;
    return entityReg?.area_id || h?.devices?.[deviceId]?.area_id || 'none';
  }

  _discoverLights(){
    const cfg = this._config;
    const states = this._hass?.states || {};
    let ids = [];
    if (cfg.auto_discover) ids = Object.keys(states).filter(id => id.startsWith('light.'));
    ids.push(...(cfg.lights || []), ...(cfg.include_entities || []), ...(cfg.discovery?.include_entities || []));
    ids = [...new Set(ids)].filter(id => states[id]);
    const excl = new Set([...(cfg.exclude_entities||[]), ...(cfg.discovery?.exclude_entities||[])]);
    ids = ids.filter(id => !excl.has(id));
    if (cfg.discovery?.include_name_contains?.length) {
      ids = ids.filter(id => cfg.discovery.include_name_contains.some(n => getFriendlyName(states[id]).toLowerCase().includes(String(n).toLowerCase())));
    }
    if (cfg.discovery?.exclude_name_contains?.length) {
      ids = ids.filter(id => !cfg.discovery.exclude_name_contains.some(n => getFriendlyName(states[id]).toLowerCase().includes(String(n).toLowerCase())));
    }
    ids = ids.filter(id => globMatch(id, cfg.discovery?.include_entities || ['*']));
    const includeAreas = cfg.include_areas || [];
    const excludeAreas = cfg.exclude_areas || [];
    if (includeAreas.length) ids = ids.filter(id => includeAreas.includes(this._areaIdForEntity(id)) || includeAreas.includes(this._areaNameForEntity(id)));
    if (excludeAreas.length) ids = ids.filter(id => !excludeAreas.includes(this._areaIdForEntity(id)) && !excludeAreas.includes(this._areaNameForEntity(id)));
    if (!cfg.show_unavailable) ids = ids.filter(id => !['unavailable','unknown'].includes(states[id].state));
    ids.sort((a,b)=>{
      const A = states[a], B = states[b];
      if (cfg.sort_by === 'entity_id') return a.localeCompare(b);
      if (cfg.sort_by === 'state') return String(A.state).localeCompare(String(B.state)) || getFriendlyName(A).localeCompare(getFriendlyName(B));
      if (cfg.sort_by === 'area_name') return this._areaNameForEntity(a).localeCompare(this._areaNameForEntity(b)) || getFriendlyName(A).localeCompare(getFriendlyName(B));
      return getFriendlyName(A).localeCompare(getFriendlyName(B));
    });
    return ids.map(id => states[id]);
  }

  _discoverScenes(lights){
    const cfg = this._config;
    const states = this._hass?.states || {};
    let ids = [...(cfg.scenes || [])];
    if (cfg.show_scenes && cfg.controls?.scenes) ids.push(...Object.keys(states).filter(id=>id.startsWith('scene.')));
    ids = [...new Set(ids)].filter(id=>states[id]);
    const areaIds = new Set(lights.map(l=>this._areaIdForEntity(l.entity_id)));
    const areaNames = new Set(lights.map(l=>this._areaNameForEntity(l.entity_id).toLowerCase()));
    return ids.map(id=>states[id]).filter(s=>{
      const sid = this._areaIdForEntity(s.entity_id);
      const name = getFriendlyName(s).toLowerCase();
      if (areaIds.has(sid)) return true;
      if ([...areaNames].some(a => a !== 'ohne bereich' && name.includes(a))) return true;
      return (cfg.scenes || []).includes(s.entity_id);
    }).slice(0, 24);
  }

  _call(domain, service, data){ return this._hass.callService(domain, service, data); }
  _toggle(id){ const st=this._hass.states[id]; this._call('light', isOn(st)?'turn_off':'turn_on', {entity_id:id}); }
  _setBrightness(id,p){ this._call('light','turn_on',{entity_id:id, brightness: brightnessFromPct(p)}); }
  _setColorTemp(id,value){ this._call('light','turn_on',{entity_id:id, color_temp: Number(value)}); }
  _setRgb(id,color){ this._call('light','turn_on',{entity_id:id, rgb_color: color}); }
  _activateScene(id){ this._call('scene','turn_on',{entity_id:id}); }

  _css(){ return `
    :host{ --s-bg:#07130f; --s-card:#10231c; --s-card2:#0b1a15; --s-text:#eafff6; --s-muted:#8ab8a4; --s-accent:#21f59b; --s-accent2:#1fb6ff; --s-warn:#febd2f; --s-danger:#ff5277; --s-radius:18px; --s-shadow:0 12px 32px rgba(0,0,0,.32); display:block; }
    .preset-neon{ --s-bg:#090a1d; --s-card:#13183a; --s-card2:#10142e; --s-accent:#40d9ff; --s-accent2:#b46cff; --s-muted:#a1a8e8; }
    .preset-lcars{ --s-bg:#050505; --s-card:#111; --s-card2:#070707; --s-text:#ffdca8; --s-muted:#d69a65; --s-accent:#ff9b25; --s-accent2:#c7a3ff; --s-radius:24px; }
    .preset-minimal{ --s-bg:var(--ha-card-background, #fff); --s-card:rgba(127,127,127,.08); --s-card2:rgba(127,127,127,.05); --s-text:var(--primary-text-color,#111); --s-muted:var(--secondary-text-color,#666); --s-accent:var(--primary-color,#03a9f4); --s-accent2:var(--accent-color,#ff9800); --s-shadow:none; }
    ha-card{ background:linear-gradient(135deg,var(--s-bg),var(--s-card2)); color:var(--s-text); border-radius:var(--s-radius); overflow:hidden; box-shadow:var(--s-shadow); border:1px solid color-mix(in srgb,var(--s-accent) 22%,transparent); }
    .wrap{padding:16px}.header{display:flex;gap:14px;align-items:center;justify-content:space-between;margin-bottom:12px}.title{font-size:20px;font-weight:800;letter-spacing:.3px}.sub{color:var(--s-muted);font-size:12px;margin-top:2px}.stats{display:flex;gap:8px;flex-wrap:wrap}.pill{border:1px solid color-mix(in srgb,var(--s-accent) 30%,transparent);background:color-mix(in srgb,var(--s-card) 72%,transparent);border-radius:999px;padding:6px 10px;font-size:12px;color:var(--s-muted)}.pill strong{color:var(--s-text)}
    .tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}.search{flex:1;min-width:170px;border-radius:12px;border:1px solid color-mix(in srgb,var(--s-accent) 24%,transparent);background:rgba(0,0,0,.18);color:var(--s-text);padding:10px 12px}.tab{cursor:pointer;border:0;border-radius:999px;background:var(--s-card);color:var(--s-muted);padding:8px 11px}.tab.active{background:linear-gradient(90deg,var(--s-accent),var(--s-accent2));color:#00150d;font-weight:800}.tabs{display:flex;gap:7px;overflow:auto;padding-bottom:4px}
    .grid{display:grid;grid-template-columns:repeat(var(--cols,auto-fit),minmax(190px,1fr));gap:12px}.layout-list .grid{grid-template-columns:1fr}.layout-compact .grid{grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}.light{background:linear-gradient(180deg,color-mix(in srgb,var(--s-card) 92%,transparent),color-mix(in srgb,var(--s-card2) 96%,transparent));border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:13px;position:relative;overflow:hidden}.light.on{border-color:color-mix(in srgb,var(--s-accent) 48%,transparent);box-shadow:0 0 22px color-mix(in srgb,var(--s-accent) 16%,transparent) inset}.name{font-weight:750;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.area{color:var(--s-muted);font-size:11px;margin-top:2px}.top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.bulb{width:38px;height:38px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.07);cursor:pointer}.on .bulb{background:color-mix(in srgb,var(--s-accent) 30%,transparent);filter:drop-shadow(0 0 10px var(--s-accent))}.unavailable{opacity:.48}.state{font-size:11px;color:var(--s-muted);margin:8px 0}.bar{height:10px;background:rgba(0,0,0,.35);border-radius:999px;overflow:hidden;margin:8px 0}.fill{height:100%;background:linear-gradient(90deg,var(--s-accent),var(--s-accent2));border-radius:999px}.range{width:100%;accent-color:var(--s-accent)}.quick{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}.q{cursor:pointer;border:0;border-radius:10px;background:rgba(255,255,255,.08);color:var(--s-text);font-size:11px;padding:6px 7px}.q:hover{background:color-mix(in srgb,var(--s-accent) 24%,rgba(255,255,255,.08))}.colors{display:flex;gap:6px;margin-top:8px}.sw{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.28);cursor:pointer}.scene-row{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.scene{cursor:pointer;border:1px solid color-mix(in srgb,var(--s-accent2) 28%,transparent);background:rgba(255,255,255,.06);color:var(--s-text);border-radius:14px;padding:9px 11px}.group-title{margin:14px 0 8px;color:var(--s-muted);font-size:12px;text-transform:uppercase;letter-spacing:.14em}.footer{color:var(--s-muted);font-size:11px;text-align:right;margin-top:12px}.empty{padding:28px;text-align:center;color:var(--s-muted)}
    .preset-lcars .light,.preset-lcars .scene,.preset-lcars .pill{border-radius:22px 6px 22px 6px}.preset-lcars .header:before{content:"";width:74px;height:28px;background:var(--s-accent);border-radius:20px 0 0 20px;display:block}.preset-lcars .bar{border-radius:0;height:12px;background:repeating-linear-gradient(90deg,#000 0 16px,#191919 16px 18px)}.preset-lcars .fill{border-radius:0;background:repeating-linear-gradient(90deg,var(--s-accent) 0 16px,#0000 16px 18px)}
  `; }

  render(){
    if (!this.shadowRoot || !this._hass) return;
    const cfg=this._config;
    const lightsAll=this._discoverLights();
    const q=this._query.toLowerCase();
    const areaCounts={}; lightsAll.forEach(l=>{ const a=this._areaNameForEntity(l.entity_id); areaCounts[a]=(areaCounts[a]||0)+1; });
    let lights=lightsAll.filter(l=> this._selectedArea==='all' || this._areaNameForEntity(l.entity_id)===this._selectedArea);
    if (q) lights=lights.filter(l=> (getFriendlyName(l)+' '+l.entity_id+' '+this._areaNameForEntity(l.entity_id)).toLowerCase().includes(q));
    const scenes=this._discoverScenes(lights);
    const on=lightsAll.filter(isOn).length, unavailable=lightsAll.filter(l=>['unavailable','unknown'].includes(l.state)).length;
    const cls=`preset-${cfg.preset||'djungle'} layout-${cfg.layout||'wall'} ${cfg.compact?'layout-compact':''}`;
    const cols = cfg.columns === 'auto' ? 'auto-fit' : Number(cfg.columns)||'auto-fit';
    this.shadowRoot.innerHTML = `<style>${this._css()}</style><ha-card class="${cls}" style="--cols:${cols}"><div class="wrap">
      ${cfg.show_header?`<div class="header"><div><div class="title">${cfg.title||'Sambesi Lights'}</div><div class="sub">Universal Light Control · v${SAMBESI_VERSION}</div></div>${cfg.show_stats?`<div class="stats"><span class="pill"><strong>${lightsAll.length}</strong> Lampen</span><span class="pill"><strong>${on}</strong> An</span><span class="pill"><strong>${unavailable}</strong> Offline</span></div>`:''}</div>`:''}
      ${(cfg.show_search||cfg.show_area_tabs)?`<div class="tools">${cfg.show_search?`<input class="search" placeholder="Lampen suchen..." value="${this._query}">`:''}</div>${cfg.show_area_tabs?`<div class="tabs"><button class="tab ${this._selectedArea==='all'?'active':''}" data-area="all">Alle ${lightsAll.length}</button>${Object.entries(areaCounts).sort((a,b)=>a[0].localeCompare(b[0])).map(([a,c])=>`<button class="tab ${this._selectedArea===a?'active':''}" data-area="${a}">${a} ${c}</button>`).join('')}</div>`:''}`:''}
      ${cfg.show_scenes&&scenes.length?`<div class="group-title">Szenen</div><div class="scene-row">${scenes.map(s=>`<button class="scene" data-scene="${s.entity_id}">✨ ${getFriendlyName(s)}</button>`).join('')}</div>`:''}
      ${lights.length?this._renderGrouped(lights):`<div class="empty">Keine passenden Light-Entitäten gefunden.</div>`}
      ${cfg.show_footer?`<div class="footer">Sambesi Light Card v${SAMBESI_VERSION}</div>`:''}
    </div></ha-card>`;
    this._bind();
  }

  _renderGrouped(lights){
    const cfg=this._config;
    if (cfg.group_by !== 'area') return `<div class="grid">${lights.map(l=>this._renderLight(l)).join('')}</div>`;
    const groups={}; lights.forEach(l=>{ const a=this._areaNameForEntity(l.entity_id); (groups[a]=groups[a]||[]).push(l); });
    return Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0])).map(([area,items])=>`<div class="group-title">${area}</div><div class="grid">${items.map(l=>this._renderLight(l)).join('')}</div>`).join('');
  }

  _renderLight(st){
    const cfg=this._config, a=st.attributes||{};
    const pct=pctFromBrightness(a.brightness || (isOn(st)?255:0));
    const un=['unavailable','unknown'].includes(st.state);
    const ctMin=a.min_mireds||153, ctMax=a.max_mireds||500, ct=a.color_temp||Math.round((ctMin+ctMax)/2);
    return `<div class="light ${isOn(st)?'on':''} ${un?'unavailable':''}" data-id="${st.entity_id}">
      <div class="top"><div><div class="name" title="${st.entity_id}">${getFriendlyName(st)}</div><div class="area">${this._areaNameForEntity(st.entity_id)}</div></div>${cfg.controls?.power?`<button class="bulb" data-toggle="${st.entity_id}">💡</button>`:''}</div>
      <div class="state">${st.state.toUpperCase()} · ${pct}%</div>
      ${cfg.controls?.brightness && supported(st,'brightness')?`<div class="bar"><div class="fill" style="width:${pct}%"></div></div><input class="range br" data-br="${st.entity_id}" type="range" min="0" max="100" value="${pct}">${cfg.controls?.quick_brightness?`<div class="quick">${(cfg.quick_brightness_values||[]).map(v=>`<button class="q" data-qb="${st.entity_id}" data-v="${v}">${v}%</button>`).join('')}</div>`:''}`:''}
      ${cfg.controls?.color_temp !== false && supported(st,'color_temp')?`<div class="state">Farbtemperatur</div><input class="range ct" data-ct="${st.entity_id}" type="range" min="${ctMin}" max="${ctMax}" value="${ct}">`:''}
      ${cfg.controls?.rgb !== false && supported(st,'rgb')?`<div class="colors">${(cfg.rgb_presets||[]).map(c=>`<button class="sw" title="${c.name}" data-rgb="${st.entity_id}" data-color="${c.color.join(',')}" style="background:rgb(${c.color.join(',')})"></button>`).join('')}</div>`:''}
    </div>`;
  }

  _bind(){
    const root=this.shadowRoot;
    root.querySelector('.search')?.addEventListener('input',e=>{this._query=e.target.value; this.render();});
    root.querySelectorAll('[data-area]').forEach(b=>b.addEventListener('click',()=>{this._selectedArea=b.dataset.area; this.render();}));
    root.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>this._toggle(b.dataset.toggle)));
    root.querySelectorAll('[data-qb]').forEach(b=>b.addEventListener('click',()=>this._setBrightness(b.dataset.qb,b.dataset.v)));
    root.querySelectorAll('[data-br]').forEach(i=>i.addEventListener('change',()=>this._setBrightness(i.dataset.br,i.value)));
    root.querySelectorAll('[data-ct]').forEach(i=>i.addEventListener('change',()=>this._setColorTemp(i.dataset.ct,i.value)));
    root.querySelectorAll('[data-rgb]').forEach(b=>b.addEventListener('click',()=>this._setRgb(b.dataset.rgb,b.dataset.color.split(',').map(Number))));
    root.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>this._activateScene(b.dataset.scene)));
  }
}

class SambesiLightCardEditor extends HTMLElement {
  constructor(){ super(); this.attachShadow({mode:'open'}); this._config=deepMerge(DEFAULT_CONFIG,{}); }
  setConfig(config){ this._config=deepMerge(DEFAULT_CONFIG,config||{}); this.render(); }
  set hass(hass){ this._hass=hass; this.render(); }
  _changed(k,v){ const cfg=deepMerge(this._config,{}); if(k.includes('.')){const [a,b]=k.split('.'); cfg[a]=cfg[a]||{}; cfg[a][b]=v;} else cfg[k]=v; this._config=cfg; this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:cfg},bubbles:true,composed:true})); this.render(); }
  render(){ if(!this.shadowRoot)return; const c=this._config; this.shadowRoot.innerHTML=`<style>.ed{display:grid;gap:10px;padding:8px}label{display:grid;gap:4px;font-size:12px}input,select{padding:8px;border-radius:8px;border:1px solid #888;background:var(--secondary-background-color);color:var(--primary-text-color)}</style><div class="ed"><label>Titel<input id="title" value="${c.title||''}"></label><label>Preset<select id="preset"><option>djungle</option><option>neon</option><option>lcars</option><option>minimal</option></select></label><label>Layout<select id="layout"><option>wall</option><option>list</option><option>compact</option></select></label><label>Gruppierung<select id="group"><option value="area">area</option><option value="none">none</option></select></label><label><input id="auto" type="checkbox" ${c.auto_discover?'checked':''}> Auto Discovery light.*</label><label><input id="scenes" type="checkbox" ${c.show_scenes?'checked':''}> Szenen anzeigen</label></div>`; this.shadowRoot.querySelector('#preset').value=c.preset||'djungle'; this.shadowRoot.querySelector('#layout').value=c.layout||'wall'; this.shadowRoot.querySelector('#group').value=c.group_by||'area'; this.shadowRoot.querySelector('#title').onchange=e=>this._changed('title',e.target.value); this.shadowRoot.querySelector('#preset').onchange=e=>this._changed('preset',e.target.value); this.shadowRoot.querySelector('#layout').onchange=e=>this._changed('layout',e.target.value); this.shadowRoot.querySelector('#group').onchange=e=>this._changed('group_by',e.target.value); this.shadowRoot.querySelector('#auto').onchange=e=>this._changed('auto_discover',e.target.checked); this.shadowRoot.querySelector('#scenes').onchange=e=>this._changed('show_scenes',e.target.checked); }
}

customElements.define('sambesi-light-card', SambesiLightCard);
customElements.define('sambesi-light-card-editor', SambesiLightCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'sambesi-light-card', name: 'Sambesi Light Card', description: 'Universal room-aware light control card with Djungle, Neon, LCARS and Minimal presets.' });
console.info(`%c SAMBESI-LIGHT-CARD %c v${SAMBESI_VERSION} `, 'color:#07130f;background:#21f59b;font-weight:700;padding:2px 4px;border-radius:4px 0 0 4px;', 'color:#eafff6;background:#10231c;font-weight:700;padding:2px 4px;border-radius:0 4px 4px 0;');