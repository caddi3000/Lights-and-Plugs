const VERSION = "0.2.0";

const DEFAULT_ZONES = [
  { id:"kids", name:"Bed 2 (Kids)", area:["Bed 2","Kids","Kids Room"], x:18.7, y:35.0 },
  { id:"nursery", name:"Bed 3 (Nursery)", area:["Bed 3","Nursery"], x:18.8, y:54.0 },
  { id:"master", name:"Bed 1 (Master)", area:["Bed 1","Master","Master Bedroom"], x:18.9, y:72.0 },
  { id:"open", name:"Open Plan", area:["Open Plan","Kitchen","Dining","Living Room","Lounge"], x:43.5, y:52.0 },
  { id:"laundry", name:"Laundry", area:["Laundry"], x:58.5, y:52.7 },
  { id:"bathroom", name:"Bathroom", area:["Bathroom"], x:58.5, y:66.0 },
  { id:"porch", name:"Porch", area:["Porch","Front Porch"], x:40.5, y:80.0 },
  { id:"shed", name:"Shed", area:["Shed"], x:81.8, y:33.0 },
  { id:"garage", name:"Garage (Under house)", area:["Garage","Garage Under House"], x:77.0, y:84.0 },
];

class AutoFloorplanControls extends HTMLElement {
  static getStubConfig() { return { title:"Home Controls", image:"/local/auto-floorplan-controls/floorplan.png" }; }
  setConfig(config) {
    this.config = {
      title:"Home Controls",
      image:"/local/auto-floorplan-controls/floorplan.png",
      domains:["light","switch"],
      exclude:[],
      zones:DEFAULT_ZONES,
      ...config
    };
    if (!this.shadowRoot) this.attachShadow({mode:"open"});
    this._open = this._open || null;
  }
  set hass(hass) { this._hass=hass; this.render(); }
  getCardSize(){ return 10; }

  async _loadRegistry() {
    if (!this._hass?.callWS || this._registryLoading) return;
    this._registryLoading = true;
    try {
      const [areas, devices, entities] = await Promise.all([
        this._hass.callWS({type:"config/area_registry/list"}),
        this._hass.callWS({type:"config/device_registry/list"}),
        this._hass.callWS({type:"config/entity_registry/list"})
      ]);
      this._areas = areas; this._devices = devices; this._entities = entities;
      this._areaById = Object.fromEntries(areas.map(a=>[a.area_id,a]));
      this._deviceById = Object.fromEntries(devices.map(d=>[d.id,d]));
      this._entityRegById = Object.fromEntries(entities.map(e=>[e.entity_id,e]));
    } catch(e) { console.warn("Auto Floorplan Controls registry load failed", e); }
    finally { this._registryLoading=false; this.render(); }
  }

  _areaName(entityId) {
    const er=this._entityRegById?.[entityId];
    const dev=er?.device_id ? this._deviceById?.[er.device_id] : null;
    const aid=er?.area_id || dev?.area_id;
    return aid ? this._areaById?.[aid]?.name : null;
  }
  _zoneFor(entityId) {
    const area=(this._areaName(entityId)||"").toLowerCase();
    return (this.config.zones||DEFAULT_ZONES).find(z =>
      (z.area||[z.name]).some(a => area === String(a).toLowerCase())
    );
  }
  _entitiesFor(zone) {
    if (!this._hass) return [];
    const domains=new Set(this.config.domains||["light","switch"]);
    const excluded=new Set(this.config.exclude||[]);
    return Object.values(this._hass.states).filter(s=>{
      if(excluded.has(s.entity_id)) return false;
      const domain=s.entity_id.split(".")[0];
      if(!domains.has(domain)) return false;
      return this._zoneFor(s.entity_id)?.id===zone.id;
    }).sort((a,b)=>(a.attributes.friendly_name||a.entity_id).localeCompare(b.attributes.friendly_name||b.entity_id));
  }
  _icon(s) {
    if(s.entity_id.startsWith("light.")) return "💡";
    return "🔌";
  }
  _toggle(entityId) {
    const s=this._hass.states[entityId];
    if(!s) return;
    const domain=entityId.split(".")[0];
    this._hass.callService(domain, s.state==="on" ? "turn_off":"turn_on", {entity_id:entityId});
  }
  _brightness(entityId, pct) {
    const value = Math.max(1, Math.min(100, Number(pct)));
    this._hass.callService("light", "turn_on", {
      entity_id: entityId,
      brightness_pct: value
    });
  }
  _allOff(zone) {
    const ids = this._entitiesFor(zone).filter(s => s.state === "on").map(s => s.entity_id);
    const lights = ids.filter(id => id.startsWith("light."));
    const switches = ids.filter(id => id.startsWith("switch."));
    if (lights.length) this._hass.callService("light","turn_off",{entity_id:lights});
    if (switches.length) this._hass.callService("switch","turn_off",{entity_id:switches});
  }
  _more(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId},bubbles:true,composed:true}));
  }
  render() {
    if(!this._hass){ this.shadowRoot.innerHTML="<ha-card>Loading…</ha-card>"; return; }
    if(!this._areas){ this._loadRegistry(); }
    const zones=this.config.zones||DEFAULT_ZONES;
    const selected=zones.find(z=>z.id===this._open);
    const rows=selected ? this._entitiesFor(selected) : [];
    const markers=zones.map(z=>{
      const es=this._entitiesFor(z), on=es.filter(e=>e.state==="on").length;
      return `<button class="marker ${this._open===z.id?"selected":""}" data-zone="${z.id}" style="left:${z.x}%;top:${z.y}%">
        <span class="dot ${on?"active":""}"></span><span>${z.name}</span>
      </button>`;
    }).join("");
    const panel=selected?`
      <section class="panel">
        <header>
          <div><small>Room controls</small><h2>${selected.name}</h2></div>
          <div class="panel-actions"><button class="alloff">All off</button><button class="close">×</button></div>
        </header>
        <div class="entities">${rows.length?rows.map(s=>{
          const isLight=s.entity_id.startsWith("light.");
          const supportsBrightness=isLight && (s.attributes.supported_color_modes||[]).some(m=>m!=="onoff") &&
            s.attributes.brightness !== undefined;
          const pct=s.attributes.brightness==null?50:Math.round((s.attributes.brightness/255)*100);
          return `<div class="entity ${s.state==="on"?"active":""}">
            <button class="entity-main" data-more="${s.entity_id}">
              <span class="ico">${this._icon(s)}</span>
              <span><b>${s.attributes.friendly_name||s.entity_id}</b></span>
            </button>
            ${supportsBrightness?`<div class="brightness">
              <span>☀</span><input data-brightness="${s.entity_id}" type="range" min="1" max="100" value="${pct}" aria-label="Brightness for ${s.attributes.friendly_name||s.entity_id}">
              <span class="brightness-value">${pct}%</span>
            </div>`:""}
            <button class="toggle ${s.state==="on"?"on":""}" data-toggle="${s.entity_id}" aria-label="Toggle ${s.attributes.friendly_name||s.entity_id}">${s.state==="on"?"ON":"OFF"}</button>
          </div>`}).join(""):`<div class="empty">No lights, plugs or switches are assigned to this Home Assistant Area.</div>`}
        </div>
      </section>`:"";
    this.shadowRoot.innerHTML=`
      <ha-card>
        <style>
          :host{display:block;font-family:var(--paper-font-body1_-_font-family,system-ui)}
          ha-card{overflow:hidden;background:#061723;color:#eef7ff;border-radius:18px}
          .head{display:flex;justify-content:space-between;align-items:end;padding:16px 18px 10px}
          h1,h2{margin:0}.head small,.summary,header small{color:#9eb1c3}
          .stage{position:relative;margin:0 12px 12px}
          .stage img{display:block;width:100%;border-radius:14px}
          .marker{position:absolute;transform:translate(-50%,-50%);border:1px solid #526474;background:#142431e8;color:white;border-radius:13px;padding:8px 11px;display:flex;gap:7px;align-items:center;cursor:pointer;box-shadow:0 4px 14px #0007}
          .marker.selected{outline:2px solid #17bdf5}.dot{width:13px;height:13px;border-radius:50%;background:#a8bdcc}.dot.active{background:#35d76f;box-shadow:0 0 8px #35d76f}
          .panel{margin:0 12px 14px;background:#0c2231;border:1px solid #28465a;border-radius:14px;padding:14px}
          header{display:flex;justify-content:space-between;align-items:center}.close{font-size:25px;background:none;border:0;color:white;cursor:pointer}
          .entities{display:grid;gap:8px;margin-top:12px}.entity{display:grid;grid-template-columns:minmax(160px,1fr) minmax(120px,240px) auto;gap:12px;align-items:center;background:#102b3d;border-radius:11px;padding:9px}.entity.active{box-shadow:inset 3px 0 0 #35d76f}
          .entity-main{display:flex;gap:10px;align-items:center;text-align:left;background:none;border:0;color:white;cursor:pointer}.ico{font-size:22px}.brightness{display:flex;align-items:center;gap:7px;color:#b8d5e5}.brightness input{width:100%;accent-color:#17bdf5}.brightness-value{min-width:38px;text-align:right;font-size:12px}.panel-actions{display:flex;align-items:center;gap:8px}.alloff{border:1px solid #496173;background:#142b3a;color:white;border-radius:9px;padding:7px 11px;cursor:pointer}
          .toggle{min-width:58px;padding:8px;border-radius:9px;border:1px solid #496173;background:#263846;color:#cbd6df;cursor:pointer}.toggle.on{background:#0b6f48;color:#bfffd9;border-color:#23bd78}.empty{color:#a9bdcb;padding:15px}
          @media(max-width:700px){.marker{padding:5px 7px;font-size:11px}.entity{grid-template-columns:1fr auto}.brightness{grid-column:1 / -1}}
        </style>
        <div class="head"><div><h1>${this.config.title}</h1><small>Lights · plugs · switches · v${VERSION}</small></div></div>
        <div class="stage"><img src="${this.config.image}" alt="Home floorplan">${markers}</div>
        ${panel}
      </ha-card>`;
    this.shadowRoot.querySelectorAll("[data-zone]").forEach(b=>b.onclick=()=>{this._open=b.dataset.zone;this.render();});
    this.shadowRoot.querySelector(".close")?.addEventListener("click",()=>{this._open=null;this.render();});
    this.shadowRoot.querySelector(".alloff")?.addEventListener("click",()=>this._allOff(selected));
    this.shadowRoot.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>this._toggle(b.dataset.toggle));
    this.shadowRoot.querySelectorAll("[data-more]").forEach(b=>b.onclick=()=>this._more(b.dataset.more));
    this.shadowRoot.querySelectorAll("[data-brightness]").forEach(slider=>{
      slider.oninput=()=>{ const out=slider.parentElement.querySelector(".brightness-value"); if(out) out.textContent=`${slider.value}%`; };
      slider.onchange=()=>this._brightness(slider.dataset.brightness, slider.value);
    });
  }
}
customElements.define("auto-floorplan-controls", AutoFloorplanControls);
window.customCards=window.customCards||[];
window.customCards.push({type:"auto-floorplan-controls",name:"Auto Floorplan Controls",description:"Area-aware floorplan controls for lights, plugs and switches."});
console.info(`%c AUTO-FLOORPLAN-CONTROLS %c v${VERSION} `,"background:#17bdf5;color:#00131e;font-weight:bold","background:#102b3d;color:white");
