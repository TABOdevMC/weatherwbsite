(() => {
  if (new URLSearchParams(location.search).get('debug') !== '1') return;

  const style = document.createElement('style');
  style.textContent = `
    #wb-debug{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(440px,calc(100vw - 36px));max-height:82vh;overflow:auto;background:#0b1422;color:#f8fafc;border:1px solid #33465e;border-radius:18px;box-shadow:0 20px 60px #000b;font:13px Inter,system-ui,sans-serif;padding:16px}
    #wb-debug h3{margin:0 0 4px;font-size:16px}#wb-debug .muted{color:#8ea0b5;font-size:11px;margin-bottom:12px}
    #wb-debug .dbg-row{display:flex;gap:8px;align-items:center;margin:8px 0}#wb-debug select,#wb-debug button{font:inherit;border:1px solid #33465e;border-radius:9px;background:#132136;color:#f8fafc;padding:8px 10px}#wb-debug select{flex:1}#wb-debug button{cursor:pointer;font-weight:700}#wb-debug button:hover{filter:brightness(1.12)}
    #wb-debug .dbg-current{padding:10px;border:1px solid #26384e;border-radius:11px;background:#101d2e;margin:10px 0}.dbg-current b{font-size:16px}.dbg-current span{color:#9eb0c4}
    #wb-debug .dbg-alerts{display:grid;grid-template-columns:1fr 1fr;gap:7px}.dbg-alert{border:1px solid #26384e;border-radius:10px;padding:9px;background:#101d2e}.dbg-alert b{display:block}.dbg-alert small{display:block;color:#9eb0c4;margin-top:3px}.dbg-alert.none{opacity:.55}.dbg-alert.jaune{border-color:#eab308;background:#eab30818}.dbg-alert.orange{border-color:#f97316;background:#f9731618}.dbg-alert.rouge{border-color:#ef4444;background:#ef444418}.dbg-alert.rouge-fonce{border-color:#991b1b;background:#991b1b2e}
    #wb-debug .dbg-close{float:right;border:0;background:transparent;font-size:18px;padding:0 4px}.dbg-note{margin-top:10px;color:#71849b;font-size:10px;line-height:1.4}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.id = 'wb-debug';
  panel.innerHTML = `
    <button class="dbg-close" title="Fermer">×</button>
    <h3>🛠 Mode debug météo</h3>
    <div class="muted">Test local de la météo actuelle et des 8 alertes</div>
    <div class="dbg-row"><button id="dbg-current">📡 Météo actuelle</button><button id="dbg-position">📍 Ma position</button></div>
    <div class="dbg-current" id="dbg-current-box">Aucune donnée chargée.</div>
    <div class="dbg-row"><select id="dbg-preset">
      <option value="normal">Conditions normales</option><option value="rain">🌧️ Pluie extrême</option><option value="wind">💨 Vent extrême</option><option value="snow">❄️ Neige extrême</option><option value="heat">🌡️ Chaleur extrême</option><option value="cold">🥶 Froid extrême</option><option value="storm">⛈️ Orage CAPE + LI</option><option value="ice">🧊 Pluie verglaçante</option><option value="fog">🌫️ Brouillard</option>
    </select><button id="dbg-test">Tester</button></div>
    <div class="muted">Simulation sur les prochaines 24 h</div>
    <div class="dbg-alerts" id="dbg-alerts"></div>
    <div class="dbg-note">Les simulations servent uniquement à vérifier l'affichage et les niveaux. Les données réelles viennent d'Open-Meteo.</div>
  `;
  document.body.appendChild(panel);

  const levels = ['jaune','orange','rouge','rouge foncé'];
  const meta = {rain:['🌧️','Pluie'],wind:['💨','Vent'],snow:['❄️','Neige'],heat:['🌡️','Chaleur'],cold:['🥶','Froid'],storm:['⛈️','Orage'],ice:['🧊','Pluie verglaçante'],fog:['🌫️','Brouillard']};
  const order = Object.keys(meta);
  const box = document.getElementById('dbg-current-box');
  const alertsBox = document.getElementById('dbg-alerts');

  function showAlerts(data){
    if (typeof buildAlerts !== 'function') { alertsBox.innerHTML='<div class="dbg-alert rouge-fonce">Impossible de trouver le moteur d’alertes.</div>'; return; }
    const active = new Map(buildAlerts(data).map(a => [a.type,a]));
    alertsBox.innerHTML = order.map(type => {
      const a = active.get(type); const [icon,name] = meta[type];
      if (!a) return `<div class="dbg-alert none"><b>${icon} ${name}</b><small>Aucune alerte</small></div>`;
      return `<div class="dbg-alert ${a.level}"><b>${a.icon} ${a.name} — ${levels[a.level-1]}</b><small>${a.detail}</small></div>`;
    }).join('');
  }

  function synthetic(type){
    const n=24, h={temperature_2m:Array(n).fill(20),precipitation:Array(n).fill(0),wind_speed_10m:Array(n).fill(10),wind_gusts_10m:Array(n).fill(15),snowfall:Array(n).fill(0),cape:Array(n).fill(0),lifted_index:Array(n).fill(2),visibility:Array(n).fill(30000),weather_code:Array(n).fill(1)};
    if(type==='rain') h.precipitation.fill(25),h.weather_code.fill(65);
    if(type==='wind') h.wind_gusts_10m.fill(120),h.wind_speed_10m.fill(90);
    if(type==='snow') h.snowfall.fill(22),h.temperature_2m.fill(-3),h.weather_code.fill(75);
    if(type==='heat') h.temperature_2m.fill(41);
    if(type==='cold') h.temperature_2m.fill(-18);
    if(type==='storm') h.cape.fill(3200),h.lifted_index.fill(-7),h.weather_code.fill(95);
    if(type==='ice') h.weather_code.fill(67),h.precipitation.fill(5);
    if(type==='fog') h.visibility.fill(180),h.weather_code.fill(45);
    return {hourly:h};
  }

  async function fetchActual(lat,lon){
    box.textContent='Chargement…';
    const q=new URLSearchParams({latitude:lat,longitude:lon,current:'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',hourly:'temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,snowfall,weather_code,cape,lifted_index,visibility',forecast_hours:'24',timezone:'auto'});
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`); if(!r.ok) throw new Error('Open-Meteo indisponible');
    const d=await r.json(),c=d.current;
    box.innerHTML=`<b>${Math.round(c.temperature_2m)} °C</b><br><span>Ressenti ${Math.round(c.apparent_temperature)} °C · Humidité ${c.relative_humidity_2m}% · Vent ${Math.round(c.wind_speed_10m)} km/h</span><br><span>Code météo ${c.weather_code} · ${lat.toFixed(3)}, ${lon.toFixed(3)}</span>`;
    showAlerts(d);
  }

  document.getElementById('dbg-test').onclick=()=>showAlerts(synthetic(document.getElementById('dbg-preset').value));
  document.getElementById('dbg-current').onclick=()=>{
    const lat=48.8566,lon=2.3522; fetchActual(lat,lon).catch(e=>box.textContent='Erreur : '+e.message);
  };
  document.getElementById('dbg-position').onclick=()=>navigator.geolocation.getCurrentPosition(p=>fetchActual(p.coords.latitude,p.coords.longitude).catch(e=>box.textContent='Erreur : '+e.message),()=>box.textContent='Position inaccessible.');
  panel.querySelector('.dbg-close').onclick=()=>panel.remove();
  showAlerts(synthetic('normal'));
})();
