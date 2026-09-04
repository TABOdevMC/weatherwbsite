(() => {
  if (new URLSearchParams(location.search).get('debug') !== '1') return;

  const style = document.createElement('style');
  style.textContent = `
    #wb-debug{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(480px,calc(100vw - 36px));max-height:88vh;overflow:auto;background:#0b1422;color:#f8fafc;border:1px solid #33465e;border-radius:18px;box-shadow:0 20px 60px #000b;font:13px Inter,system-ui,sans-serif;padding:16px}
    #wb-debug h3{margin:0 0 4px;font-size:16px}#wb-debug .muted{color:#8ea0b5;font-size:11px;margin-bottom:12px}
    #wb-debug .dbg-row{display:flex;gap:8px;align-items:center;margin:8px 0}#wb-debug select,#wb-debug button{font:inherit;border:1px solid #33465e;border-radius:9px;background:#132136;color:#f8fafc;padding:8px 10px}#wb-debug select{flex:1}#wb-debug button{cursor:pointer;font-weight:700}#wb-debug button:hover{filter:brightness(1.12)}
    #wb-debug .dbg-current{padding:10px;border:1px solid #26384e;border-radius:11px;background:#101d2e;margin:10px 0}.dbg-current b{font-size:16px}.dbg-current span{color:#9eb0c4}
    #wb-debug .dbg-sliders{display:grid;gap:7px;margin:10px 0}.dbg-slider{border:1px solid #26384e;border-radius:10px;padding:8px 10px;background:#101d2e}.dbg-slider label{display:flex;justify-content:space-between;gap:10px;margin-bottom:5px}.dbg-slider label b{font-variant-numeric:tabular-nums}.dbg-slider input{width:100%;accent-color:#7dd3fc}.dbg-slider small{display:block;color:#71849b;margin-top:2px}
    #wb-debug .dbg-alerts{display:grid;grid-template-columns:1fr 1fr;gap:7px}.dbg-alert{border:1px solid #26384e;border-radius:10px;padding:9px;background:#101d2e}.dbg-alert b{display:block}.dbg-alert small{display:block;color:#9eb0c4;margin-top:3px}.dbg-alert.none{opacity:.55}.dbg-alert.jaune{border-color:#eab308;background:#eab30818}.dbg-alert.orange{border-color:#f97316;background:#f9731618}.dbg-alert.rouge{border-color:#ef4444;background:#ef444418}.dbg-alert.rouge-fonce{border-color:#991b1b;background:#991b1b2e}
    #wb-debug .dbg-close{float:right;border:0;background:transparent;font-size:18px;padding:0 4px}.dbg-note{margin-top:10px;color:#71849b;font-size:10px;line-height:1.4}
    @media(max-width:560px){#wb-debug{right:8px;bottom:8px;width:calc(100vw - 16px)}#wb-debug .dbg-alerts{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.id = 'wb-debug';
  panel.innerHTML = `
    <button class="dbg-close" title="Fermer">×</button>
    <h3>🛠 Mode debug météo</h3>
    <div class="muted">Modifie les valeurs puis observe immédiatement les niveaux d'alerte.</div>
    <div class="dbg-row"><button id="dbg-current">📡 Météo actuelle</button><button id="dbg-position">📍 Ma position</button></div>
    <div class="dbg-current" id="dbg-current-box">Aucune donnée chargée.</div>

    <div class="dbg-row"><select id="dbg-preset">
      <option value="normal">Conditions normales</option><option value="rain">🌧️ Pluie extrême</option><option value="wind">💨 Vent extrême</option><option value="snow">❄️ Neige extrême</option><option value="heat">🌡️ Chaleur extrême</option><option value="cold">🥶 Froid extrême</option><option value="storm">⛈️ Orage CAPE + LI</option><option value="ice">🧊 Pluie verglaçante</option><option value="fog">🌫️ Brouillard</option>
    </select><button id="dbg-test">Tester</button></div>

    <div class="dbg-sliders" id="dbg-sliders">
      <div class="dbg-slider"><label><span>🌡️ Température</span><b id="v-temp">20 °C</b></label><input id="s-temp" type="range" min="-25" max="45" step="1" value="20"><small>Seuils : 30 / 35 / 38 / 40 °C · froid : 0 / -5 / -10 / -15 °C</small></div>
      <div class="dbg-slider"><label><span>🌧️ Précipitations</span><b id="v-rain">0 mm/h</b></label><input id="s-rain" type="range" min="0" max="30" step="0.5" value="0"><small>Seuils : 2 / 5 / 10 / 20 mm/h</small></div>
      <div class="dbg-slider"><label><span>💨 Vent moyen</span><b id="v-wind">10 km/h</b></label><input id="s-wind" type="range" min="0" max="130" step="1" value="10"><small>Le moteur utilise aussi les rafales.</small></div>
      <div class="dbg-slider"><label><span>💨 Rafales</span><b id="v-gust">15 km/h</b></label><input id="s-gust" type="range" min="0" max="140" step="1" value="15"><small>Seuils : 50 / 70 / 90 / 110 km/h</small></div>
      <div class="dbg-slider"><label><span>❄️ Neige</span><b id="v-snow">0 cm/h</b></label><input id="s-snow" type="range" min="0" max="25" step="0.5" value="0"><small>Seuils : 1 / 5 / 10 / 20 cm/h</small></div>
      <div class="dbg-slider"><label><span>⛈️ CAPE</span><b id="v-cape">0 J/kg</b></label><input id="s-cape" type="range" min="0" max="3500" step="50" value="0"><small>Seuils : 500 / 1000 / 2000 / 3000 J/kg</small></div>
      <div class="dbg-slider"><label><span>⛈️ Lifted Index</span><b id="v-li">2</b></label><input id="s-li" type="range" min="-10" max="5" step="0.5" value="2"><small>Plus c'est négatif, plus l'instabilité est forte.</small></div>
      <div class="dbg-slider"><label><span>🌫️ Visibilité</span><b id="v-vis">30 km</b></label><input id="s-vis" type="range" min="0" max="30" step="0.1" value="30"><small>Les faibles valeurs déclenchent le brouillard.</small></div>
      <div class="dbg-slider"><label><span>🔢 Code météo WMO</span><b id="v-code">1</b></label><input id="s-code" type="range" min="0" max="99" step="1" value="1"><small>45/48 = brouillard · 56/57/66/67 = verglaçant · 95/96/99 = orage.</small></div>
    </div>

    <div class="muted">Simulation sur les prochaines 24 h · les sliders sont appliqués à chaque heure.</div>
    <div class="dbg-alerts" id="dbg-alerts"></div>
    <div class="dbg-note">Les simulations servent uniquement à vérifier l'affichage et les niveaux. Les données réelles viennent d'Open-Meteo.</div>
  `;
  document.body.appendChild(panel);

  const levels = ['jaune','orange','rouge','rouge foncé'];
  const meta = {rain:['🌧️','Pluie'],wind:['💨','Vent'],snow:['❄️','Neige'],heat:['🌡️','Chaleur'],cold:['🥶','Froid'],storm:['⛈️','Orage'],ice:['🧊','Pluie verglaçante'],fog:['🌫️','Brouillard']};
  const order = Object.keys(meta);
  const box = document.getElementById('dbg-current-box');
  const alertsBox = document.getElementById('dbg-alerts');
  const ids = ['temp','rain','wind','gust','snow','cape','li','vis','code'];

  function values(){
    return Object.fromEntries(ids.map(id => [id, Number(document.getElementById(`s-${id}`).value)]));
  }

  function updateLabels(){
    const v=values();
    document.getElementById('v-temp').textContent=`${v.temp} °C`;
    document.getElementById('v-rain').textContent=`${v.rain} mm/h`;
    document.getElementById('v-wind').textContent=`${v.wind} km/h`;
    document.getElementById('v-gust').textContent=`${v.gust} km/h`;
    document.getElementById('v-snow').textContent=`${v.snow} cm/h`;
    document.getElementById('v-cape').textContent=`${v.cape} J/kg`;
    document.getElementById('v-li').textContent=v.li;
    document.getElementById('v-vis').textContent=`${v.vis} km`;
    document.getElementById('v-code').textContent=v.code;
  }

  function showAlerts(data){
    if (typeof buildAlerts !== 'function') { alertsBox.innerHTML='<div class="dbg-alert rouge-fonce">Impossible de trouver le moteur d’alertes.</div>'; return; }
    const active = new Map(buildAlerts(data).map(a => [a.type,a]));
    alertsBox.innerHTML = order.map(type => {
      const a = active.get(type); const [icon,name] = meta[type];
      if (!a) return `<div class="dbg-alert none"><b>${icon} ${name}</b><small>Aucune alerte</small></div>`;
      return `<div class="dbg-alert ${a.level}"><b>${a.icon} ${a.name} — ${levels[a.level-1]}</b><small>${a.detail}</small></div>`;
    }).join('');
  }

  function synthetic(){
    const v=values(),n=24,h={temperature_2m:Array(n).fill(v.temp),precipitation:Array(n).fill(v.rain),wind_speed_10m:Array(n).fill(v.wind),wind_gusts_10m:Array(n).fill(v.gust),snowfall:Array(n).fill(v.snow),cape:Array(n).fill(v.cape),lifted_index:Array(n).fill(v.li),visibility:Array(n).fill(v.vis*1000),weather_code:Array(n).fill(v.code)};
    return {hourly:h};
  }

  function setValues(v){
    const map={temp:v.temp,rain:v.rain,wind:v.wind,gust:v.gust,snow:v.snow,cape:v.cape,li:v.li,vis:v.vis,code:v.code};
    Object.entries(map).forEach(([id,value])=>{
      if(value !== undefined && value !== null){ const el=document.getElementById(`s-${id}`); el.value=Math.max(Number(el.min),Math.min(Number(el.max),Number(value))); }
    });
    updateLabels();
    showAlerts(synthetic());
  }

  function preset(type){
    const p={
      normal:{temp:20,rain:0,wind:10,gust:15,snow:0,cape:0,li:2,vis:30,code:1},
      rain:{temp:15,rain:25,wind:20,gust:35,snow:0,cape:0,li:1,vis:20,code:65},
      wind:{temp:12,rain:0,wind:90,gust:120,snow:0,cape:0,li:1,vis:30,code:3},
      snow:{temp:-3,rain:0,wind:20,gust:30,snow:22,cape:0,li:1,vis:10,code:75},
      heat:{temp:41,rain:0,wind:15,gust:25,snow:0,cape:0,li:2,vis:30,code:1},
      cold:{temp:-18,rain:0,wind:10,gust:15,snow:0,cape:0,li:2,vis:30,code:1},
      storm:{temp:24,rain:8,wind:60,gust:95,snow:0,cape:3200,li:-7,vis:15,code:95},
      ice:{temp:-1,rain:5,wind:15,gust:25,snow:0,cape:0,li:2,vis:8,code:67},
      fog:{temp:8,rain:0,wind:5,gust:10,snow:0,cape:0,li:2,vis:0.18,code:45}
    };
    setValues(p[type]||p.normal);
  }

  async function fetchActual(lat,lon){
    box.textContent='Chargement…';
    const q=new URLSearchParams({latitude:lat,longitude:lon,current:'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',hourly:'temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,snowfall,weather_code,cape,lifted_index,visibility',forecast_hours:'24',timezone:'auto'});
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`); if(!r.ok) throw new Error('Open-Meteo indisponible');
    const d=await r.json(),c=d.current;
    box.innerHTML=`<b>${Math.round(c.temperature_2m)} °C</b><br><span>Ressenti ${Math.round(c.apparent_temperature)} °C · Humidité ${c.relative_humidity_2m}% · Vent ${Math.round(c.wind_speed_10m)} km/h</span><br><span>Code météo ${c.weather_code} · ${lat.toFixed(3)}, ${lon.toFixed(3)}</span>`;
    const h=d.hourly;
    setValues({temp:h.temperature_2m?.[0],rain:h.precipitation?.[0],wind:h.wind_speed_10m?.[0],gust:h.wind_gusts_10m?.[0],snow:h.snowfall?.[0],cape:h.cape?.[0],li:h.lifted_index?.[0],vis:(h.visibility?.[0]||30000)/1000,code:h.weather_code?.[0]});
  }

  document.getElementById('dbg-test').onclick=()=>showAlerts(synthetic());
  document.getElementById('dbg-preset').onchange=e=>preset(e.target.value);
  ids.forEach(id=>document.getElementById(`s-${id}`).addEventListener('input',()=>{updateLabels();showAlerts(synthetic());}));
  document.getElementById('dbg-current').onclick=()=>fetchActual(48.8566,2.3522).catch(e=>box.textContent='Erreur : '+e.message);
  document.getElementById('dbg-position').onclick=()=>navigator.geolocation.getCurrentPosition(p=>fetchActual(p.coords.latitude,p.coords.longitude).catch(e=>box.textContent='Erreur : '+e.message),()=>box.textContent='Position inaccessible.');
  panel.querySelector('.dbg-close').onclick=()=>panel.remove();
  preset('normal');
})();
