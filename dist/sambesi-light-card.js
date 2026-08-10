
const SAMBESI_VERSION = "0.1.4";
const DEFAULT_CONFIG = {
  title: "Sambesi Lights", preset: "djungle", layout: "wall",
  auto_discover: true, group_by: "area", show_search: true,
  show_area_tabs: true, show_unavailable: true, lights: [],
  quick_brightness_values: [10,25,50,75,100]
};
function merge(a,b){ return Object.assign({}, a, b || {}); }
function nameOf(s){ return (s && s.attributes && s.attributes.friendly_name) || (s && s.entity_id) || ""; }
function isOn(s){ return s && s.state === "on"; }
function pct(v){ return Math.round(((Number(v)||0)/255)*100); }
function bri(v){ return Math.round(Math.max(0, Math.min(100, Number(v)||0))*2.55); }

class SambesiLightCard extends HTMLElement {
  constructor(){
    super(); this.attachShadow({mode:"open"});
    this._config = merge(DEFAULT_CONFIG, {});
    this._area = "all"; this._query = ""; this._lastSig = ""; this._lastAt = 0;
    this._tabsBusy = false; this._tabsBusyUntil = 0;
  }
  static getConfigElement(){ return document.createElement("sambesi-light-card-editor"); }
  static getStubConfig(){ return {type:"custom:sambesi-light-card", title:"Sambesi Lights", preset:"djungle", layout:"wall", auto_discover:true, group_by:"area"}; }
  setConfig(config){ this._config = merge(DEFAULT_CONFIG, config); this.render(); }
  set hass(hass){
    this._hass = hass;
    const now = Date.now();
    if (this._tabsBusy || now < this._tabsBusyUntil) return;
    const states = hass && hass.states ? hass.states : {};
    const sig = Object.keys(states).filter(id=>id.startsWith("light.")).map(id=>`${id}:${states[id].state}:${states[id].attributes && states[id].attributes.brightness || ""}`).join("|") + this._area + this._query + JSON.stringify(this._config);
    if (sig === this._lastSig && now - this._lastAt < 1200) return;
    this._lastSig = sig; this._lastAt = now; this.render();
  }
  getCardSize(){ return 4; }
  getGridOptions(){ return {rows:4, columns:12, min_rows:3, max_rows:8, min_columns:6}; }
  areaName(entityId){
    const h=this._hass, e=h && h.entities && h.entities[entityId], d=e && e.device_id;
    const areaId = (e && e.area_id) || (h && h.devices && h.devices[d] && h.devices[d].area_id);
    return areaId ? ((h && h.areas && h.areas[areaId] && h.areas[areaId].name) || areaId) : "Ohne Bereich";
  }
  lights(){
    const states = this._hass && this._hass.states ? this._hass.states : {};
    let ids = [];
    if (this._config.auto_discover) ids = Object.keys(states).filter(id=>id.startsWith("light."));
    ids = ids.concat(this._config.lights || []);
    ids = Array.from(new Set(ids)).filter(id=>states[id]);
    if (!this._config.show_unavailable) ids = ids.filter(id=>!["unknown","unavailable"].includes(states[id].state));
    return ids.map(id=>states[id]).sort((a,b)=>this.areaName(a.entity_id).localeCompare(this.areaName(b.entity_id)) || nameOf(a).localeCompare(nameOf(b)));
  }
  css(){ return `
    :host{--bg:#07130f;--card:#10231c;--txt:#eafff6;--mut:#8ab8a4;--acc:#21f59b;--acc2:#1fb6ff;display:block}.preset-neon{--bg:#090a1d;--card:#13183a;--acc:#40d9ff;--acc2:#b46cff}.preset-lcars{--bg:#050505;--card:#111;--txt:#ffdca8;--mut:#d69a65;--acc:#ff9b25;--acc2:#c7a3ff}.preset-minimal{--bg:var(--ha-card-background,#fff);--card:rgba(127,127,127,.08);--txt:var(--primary-text-color);--mut:var(--secondary-text-color);--acc:var(--primary-color);--acc2:var(--accent-color)}ha-card{background:linear-gradient(135deg,var(--bg),#06140f);color:var(--txt);border-radius:18px;overflow:hidden;border:1px solid color-mix(in srgb,var(--acc) 22%,transparent)}.wrap{padding:16px;overflow-anchor:none}.title{font-size:20px;font-weight:800}.sub,.area,.state,.footer{color:var(--mut);font-size:12px}.stats{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.pill{border:1px solid color-mix(in srgb,var(--acc) 30%,transparent);border-radius:999px;padding:6px 10px}.search{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid color-mix(in srgb,var(--acc) 25%,transparent);background:rgba(0,0,0,.18);color:var(--txt);padding:10px;margin:10px 0}.tabs{display:flex;gap:7px;overflow-x:auto;overflow-y:hidden;padding-bottom:4px;scrollbar-width:thin;overscroll-behavior-x:contain;touch-action:pan-x}.tab{flex:0 0 auto;border:0;border-radius:999px;background:var(--card);color:var(--mut);padding:8px 11px}.tab.active{background:linear-gradient(90deg,var(--acc),var(--acc2));color:#00150d;font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.layout-list .grid{grid-template-columns:1fr}.layout-compact .grid{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))}.light{background:var(--card);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:13px}.light.on{border-color:color-mix(in srgb,var(--acc) 48%,transparent)}.top{display:flex;justify-content:space-between}.name{font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bulb{width:38px;height:38px;border-radius:14px;border:0;background:rgba(255,255,255,.08);cursor:pointer}.bar{height:10px;background:rgba(0,0,0,.35);border-radius:999px;overflow:hidden;margin:8px 0}.fill{height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2))}.range{width:100%;accent-color:var(--acc)}.q{border:0;border-radius:12px;background:rgba(255,255,255,.08);color:var(--txt);padding:7px;margin:3px;cursor:pointer}.group-title{margin:14px 0 8px;color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.12em}.footer{text-align:right;margin-top:12px}`; }
  render(){
    if(!this.shadowRoot) return;
    if(!this._hass){ this.shadowRoot.innerHTML = `<style>${this.css()}</style><ha-card class="preset-djungle"><div class="wrap"><div class="title">Sambesi Lights</div><div class="sub">Preview v${SAMBESI_VERSION}</div></div></ha-card>`; return; }
    const cfg=this._config, all=this.lights(), query=this._query.toLowerCase();
    const counts={}; all.forEach(l=>{ const a=this.areaName(l.entity_id); counts[a]=(counts[a]||0)+1; });
    const visible=all.filter(l=>(this._area==="all"||this.areaName(l.entity_id)===this._area) && (!query || (nameOf(l)+l.entity_id+this.areaName(l.entity_id)).toLowerCase().includes(query)));
    this.shadowRoot.innerHTML = `<style>${this.css()}</style><ha-card class="preset-${cfg.preset} layout-${cfg.layout}"><div class="wrap"><div class="title">${cfg.title}</div><div class="sub">Universal Light Control · v${SAMBESI_VERSION}</div><div class="stats"><span class="pill"><b>${all.length}</b> Lampen</span><span class="pill"><b>${all.filter(isOn).length}</b> An</span><span class="pill"><b>${all.filter(l=>["unavailable","unknown"].includes(l.state)).length}</b> Offline</span></div>${cfg.show_search?`<input class="search" placeholder="Lampen suchen..." value="${this._query}">`:""}${cfg.show_area_tabs?`<div class="tabs"><button class="tab ${this._area==="all"?"active":""}" data-area="all">Alle ${all.length}</button>${Object.entries(counts).sort().map(([a,c])=>`<button class="tab ${this._area===a?"active":""}" data-area="${a}">${a} ${c}</button>`).join("")}</div>`:""}${this.group(visible)}<div class="footer">Sambesi Light Card v${SAMBESI_VERSION}</div></div></ha-card>`;
    this.bind();
  }
  group(lights){ const groups={}; lights.forEach(l=>{ const a=this.areaName(l.entity_id); (groups[a]=groups[a]||[]).push(l); }); return Object.entries(groups).sort().map(([a,items])=>`<div class="group-title">${a}</div><div class="grid">${items.map(l=>this.light(l)).join("")}</div>`).join("") || `<div class="group-title">Keine Lampen gefunden</div>`; }
  light(st){ const pc=pct(st.attributes && st.attributes.brightness || (isOn(st)?255:0)); return `<div class="light ${isOn(st)?"on":""}"><div class="top"><div><div class="name" title="${st.entity_id}">${nameOf(st)}</div><div class="area">${this.areaName(st.entity_id)}</div></div><button class="bulb" data-toggle="${st.entity_id}">💡</button></div><div class="state">${String(st.state).toUpperCase()} · ${pc}%</div><div class="bar"><div class="fill" style="width:${pc}%"></div></div><input class="range" data-br="${st.entity_id}" type="range" min="0" max="100" value="${pc}"><div>${(this._config.quick_brightness_values||[]).map(v=>`<button class="q" data-qb="${st.entity_id}" data-v="${v}">${v}%</button>`).join("")}</div></div>`; }
  bind(){
    const tabs=this.shadowRoot.querySelector(".tabs");
    if(tabs){ const start=()=>{this._tabsBusy=true}; const end=()=>{this._tabsBusy=false; this._tabsBusyUntil=Date.now()+900}; tabs.addEventListener("pointerdown",start,{passive:true}); tabs.addEventListener("touchstart",start,{passive:true}); tabs.addEventListener("scroll",()=>{this._tabsBusyUntil=Date.now()+700},{passive:true}); tabs.addEventListener("pointerup",end,{passive:true}); tabs.addEventListener("pointercancel",end,{passive:true}); tabs.addEventListener("touchend",end,{passive:true}); tabs.addEventListener("mouseleave",end,{passive:true}); }
    const search=this.shadowRoot.querySelector(".search"); if(search) search.addEventListener("input",e=>{this._query=e.target.value; this.render();});
    this.shadowRoot.querySelectorAll("[data-area]").forEach(b=>b.addEventListener("click",()=>{this._area=b.dataset.area; this.render();}));
    this.shadowRoot.querySelectorAll("[data-toggle]").forEach(b=>b.addEventListener("click",()=>{ const s=this._hass.states[b.dataset.toggle]; this._hass.callService("light", isOn(s)?"turn_off":"turn_on", {entity_id:b.dataset.toggle}); }));
    this.shadowRoot.querySelectorAll("[data-br]").forEach(i=>i.addEventListener("change",()=>this._hass.callService("light","turn_on",{entity_id:i.dataset.br, brightness:bri(i.value)})));
    this.shadowRoot.querySelectorAll("[data-qb]").forEach(b=>b.addEventListener("click",()=>this._hass.callService("light","turn_on",{entity_id:b.dataset.qb, brightness:bri(b.dataset.v)})));
  }
}
class SambesiLightCardEditor extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:"open"}); this._config=merge(DEFAULT_CONFIG,{}); }
  setConfig(c){ this._config=merge(DEFAULT_CONFIG,c); this.render(); }
  set hass(h){ this._hass=h; }
  changed(k,v){ const c=merge(this._config,{}); c[k]=v; this._config=c; this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:c},bubbles:true,composed:true})); }
  render(){ const c=this._config; this.shadowRoot.innerHTML=`<style>.ed{display:grid;gap:10px;padding:8px}label{display:grid;gap:4px;font-size:12px}input,select,textarea{padding:8px;border-radius:8px;border:1px solid #888;background:var(--secondary-background-color);color:var(--primary-text-color)}</style><div class="ed"><label>Titel<input id="title" value="${c.title||""}"></label><label>Preset<select id="preset"><option>djungle</option><option>neon</option><option>lcars</option><option>minimal</option></select></label><label>Layout<select id="layout"><option>wall</option><option>list</option><option>compact</option></select></label><label><input id="auto" type="checkbox" ${c.auto_discover?"checked":""}> Auto Discovery light.*</label><label>Manuelle Lampen<textarea id="lights" rows="4">${(c.lights||[]).join("\n")}</textarea></label></div>`; this.shadowRoot.querySelector("#preset").value=c.preset; this.shadowRoot.querySelector("#layout").value=c.layout; this.shadowRoot.querySelector("#title").addEventListener("change",e=>this.changed("title",e.target.value)); this.shadowRoot.querySelector("#preset").addEventListener("change",e=>this.changed("preset",e.target.value)); this.shadowRoot.querySelector("#layout").addEventListener("change",e=>this.changed("layout",e.target.value)); this.shadowRoot.querySelector("#auto").addEventListener("change",e=>this.changed("auto_discover",e.target.checked)); this.shadowRoot.querySelector("#lights").addEventListener("change",e=>this.changed("lights",e.target.value.split(/\n|,/).map(x=>x.trim()).filter(Boolean))); }
}
customElements.define("sambesi-light-card", SambesiLightCard);
customElements.define("sambesi-light-card-editor", SambesiLightCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({type:"sambesi-light-card", name:"Sambesi Light Card", preview:true, description:"Universal Light Card for Home Assistant", documentationURL:"https://github.com/drschnalli/sambesi-light-card", getEntitySuggestion:(hass,entityId)=>{ if(!entityId || entityId.split('.')[0]!=="light") return null; return [{label:"Sambesi Light", config:{type:"custom:sambesi-light-card", title:"Sambesi Lights", preset:"djungle", layout:"wall", auto_discover:true, group_by:"area"}}]; }});
console.info(`Sambesi Light Card v${SAMBESI_VERSION}`);
