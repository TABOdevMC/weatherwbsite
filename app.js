const $ = id => document.getElementById(id);
const status = $('status');
const weather = $('weather');

const icons = {
  sun:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  cloud:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 19H9a6 6 0 1 1 1.5-11.8A5.5 5.5 0 0 1 21 11.5 3.5 3.5 0 0 1 17.5 19Z"/></svg>',
  rain:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 15H9a6 6 0 1 1 1.5-11.8A5.5 5.5 0 0 1 21 7.5 3.5 3.5 0 0 1 17.5 15Z"/><path d="m8 18-1 3m5-3-1 3m5-3-1 3"/></svg>',
  snow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 15H9a6 6 0 1 1 1.5-11.8A5.5 5.5 0 0 1 21 7.5 3.5 3.5 0 0 1 17.5 15Z"/><path d="M8 19h.01M12 21h.01M16 19h.01"/></svg>',
  fog:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M2 12h20M5 16h14M8 20h8"/></svg>',
  storm:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14H9a6 6 0 1 1 1.5-11.8A5.5 5.5 0 0 1 21 6.5 3.5 3.5 0 0 1 17.5 14Z"/><path d="m13 13-3 5h3l-2 4 6-7h-3l2-2"/></svg>',
  drop:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 6.3 6 11a6 6 0 1 1-12 0c0-4.7 6-11 6-11Z"/></svg>'
};

const iconForCode = c => c===0 ? icons.sun : c<=3 ? icons.cloud : c<=48 ? icons.fog : c<=67 ? icons.rain : c<=77 ? icons.snow : c<=82 ? icons.rain : icons.storm;
const codes = {0:['sun','Ciel dégagé'],1:['sun','Principalement dégagé'],2:['cloud','Partiellement nuageux'],3:['cloud','Couvert'],45:['fog','Brouillard'],48:['fog','Brouillard givrant'],51:['rain','Bruine légère'],53:['rain','Bruine'],55:['rain','Forte bruine'],56:['rain','Bruine verglaçante'],57:['rain','Forte bruine verglaçante'],61:['rain','Pluie légère'],63:['rain','Pluie'],65:['rain','Forte pluie'],66:['rain','Pluie verglaçante'],67:['rain','Forte pluie verglaçante'],71:['snow','Neige légère'],73:['snow','Neige'],75:['snow','Forte neige'],77:['snow','Grains de neige'],80:['rain','Averses'],81:['rain','Averses'],82:['storm','Fortes averses'],95:['storm','Orage'],96:['storm','Orage avec grêle'],99:['storm','Orage avec grêle']};

const ALERT_LEVELS = ['jaune','orange','rouge','rouge foncé'];
const alertMeta = {rain:{icon:'🌧️',name:'Pluie'},wind:{icon:'💨',name:'Vent'},snow:{icon:'❄️',name:'Neige'},heat:{icon:'🌡️',name:'Chaleur'},cold:{icon:'🥶',name:'Froid'},storm:{icon:'⛈️',name:'Orage'},ice:{icon:'🧊',name:'Pluie verglaçante'},fog:{icon:'🌫️',name:'Brouillard'}};

function severity(value, thresholds){
  if(!Number.isFinite(value)) return 0;
  if(value>=thresholds[3]) return 4;
  if(value>=thresholds[2]) return 3;
  if(value>=thresholds[1]) return 2;
  if(value>=thresholds[0]) return 1;
  return 0;
}
function coldSeverity(value){
  if(!Number.isFinite(value)) return 0;
  if(value<=-15) return 4;
  if(value<=-10) return 3;
  if(value<=-5) return 2;
  if(value<=0) return 1;
  return 0;
}
function makeAlert(type,level,detail){return {type,level,detail,icon:alertMeta[type].icon,name:alertMeta[type].name};}

function buildAlerts(d){
  const h=d.hourly||{};
  const arr=name=>Array.isArray(h[name])?h[name].slice(0,24).filter(Number.isFinite):[];
  const rain=arr('precipitation'), wind=arr('wind_speed_10m'), gust=arr('wind_gusts_10m'), snow=arr('snowfall');
  const temp=arr('temperature_2m'), cape=arr('cape'), li=arr('lifted_index'), visibility=arr('visibility');
  const wh=Array.isArray(h.weather_code)?h.weather_code.slice(0,24):[];
  const max=(a, fallback=0)=>a.length?Math.max(...a):fallback;
  const min=(a, fallback=999999)=>a.length?Math.min(...a):fallback;
  const has=fn=>wh.some(fn);
  const alerts=[];

  let level=severity(max(rain),[2,5,10,20]);
  if(level) alerts.push(makeAlert('rain',level,`${max(rain).toFixed(1)} mm/h au plus fort`));
  level=severity(Math.max(max(wind),max(gust)),[50,70,90,110]);
  if(level) alerts.push(makeAlert('wind',level,`${Math.round(Math.max(max(wind),max(gust)))} km/h en rafales`));
  level=severity(max(snow),[1,5,10,20]);
  if(level) alerts.push(makeAlert('snow',level,`${max(snow).toFixed(1)} cm/h au plus fort`));
  level=severity(max(temp,-99),[30,35,38,40]);
  if(level) alerts.push(makeAlert('heat',level,`jusqu'à ${Math.round(max(temp))} °C`));
  level=coldSeverity(min(temp,99));
  if(level) alerts.push(makeAlert('cold',level,`jusqu'à ${Math.round(min(temp))} °C`));

  const capeMax=max(cape), liMin=min(li);
  let stormLevel=0;
  if(has(c=>c>=95)) stormLevel=3;
  if(capeMax>=500) stormLevel=Math.max(stormLevel,1);
  if(capeMax>=1000 || liMin<=-2) stormLevel=Math.max(stormLevel,2);
  if(capeMax>=2000 || liMin<=-4) stormLevel=Math.max(stormLevel,3);
  if(capeMax>=3000 || liMin<=-6 || has(c=>c>=96)) stormLevel=4;
  if(stormLevel) alerts.push(makeAlert('storm',stormLevel,`CAPE max ${Math.round(capeMax)} J/kg · LI min ${liMin.toFixed(1)}`));

  const iceHours=wh.filter(c=>[56,57,66,67].includes(c)).length;
  if(iceHours){
    const severeIce=wh.some(c=>c===67||c===57);
    let iceLevel=severeIce?3:2;
    if(iceHours>=6) iceLevel=4; else if(iceHours>=3) iceLevel=Math.max(iceLevel,3);
    alerts.push(makeAlert('ice',iceLevel,`${iceHours} heure(s) prévues`));
  }

  const visMin=min(visibility);
  level=severity(1000000-visMin,[999000,999500,999800,999900]);
  if(has(c=>c===45||c===48)) level=Math.max(level,2);
  if(level) alerts.push(makeAlert('fog',level,`visibilité minimale ${Math.round(visMin)} m`));
  return alerts;
}

function renderAlerts(d){
  const root=$('alerts'); if(!root) return;
  const active=new Map(buildAlerts(d).map(a=>[a.type,a]));
  const order=['rain','wind','snow','heat','cold','storm','ice','fog'];
  root.innerHTML=order.map(type=>{
    const a=active.get(type);
    if(!a) return `<article class="alert-card alert-none"><div class="alert-icon">${alertMeta[type].icon}</div><div><b>${alertMeta[type].name}</b><small>Aucune alerte</small></div><span class="alert-level">—</span></article>`;
    return `<article class="alert-card alert-${a.level}"><div class="alert-icon">${a.icon}</div><div><b>${a.name}</b><small>${a.detail}</small></div><span class="alert-level">${ALERT_LEVELS[a.level-1]}</span></article>`;
  }).join('');
}

let map, currentMarker, tempLayer, windLayer, rainLayer;
let heatRequestId = 0;
let heatRefreshTimer;

function initMap(){
  if(map || typeof L === 'undefined') return;
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
  map = L.map('map',{layers:[osm],zoomControl:true});
  tempLayer = L.heatLayer([], {radius:42, blur:34, maxZoom:19, minOpacity:0.24, max:0.88, gradient:{0:'#313695',0.18:'#4575b4',0.36:'#74add1',0.52:'#ffffbf',0.68:'#fdae61',0.84:'#f46d43',1:'#a50026'}});
  windLayer = L.heatLayer([], {radius:42, blur:34, maxZoom:19, minOpacity:0.2, max:0.82, gradient:{0:'#313695',0.2:'#4575b4',0.42:'#74add1',0.58:'#ffffbf',0.72:'#fdae61',0.86:'#f46d43',1:'#a50026'}});
  rainLayer = L.layerGroup();
  L.control.layers({'🗺️ OpenStreetMap':osm},{'🌡️ Température':tempLayer,'💨 Vent':windLayer,'🌧️ Précipitations':rainLayer},{collapsed:false}).addTo(map);
  map.on('moveend zoomend', scheduleViewportHeatmap);
}
function scheduleViewportHeatmap(){clearTimeout(heatRefreshTimer);heatRefreshTimer=setTimeout(()=>refreshViewportHeatmap(),220);}
function buildViewportPoints(){
  const bounds=map.getBounds(); const south=Math.max(-85,bounds.getSouth()); const north=Math.min(85,bounds.getNorth()); let west=bounds.getWest(); let east=bounds.getEast();
  if(east<west) east+=360;
  const latSpan=Math.max(0.1,north-south), lonSpan=Math.max(0.1,east-west), cos=Math.max(0.25,Math.cos(((south+north)/2)*Math.PI/180));
  const target=15, latStep=Math.max(0.18,latSpan/target), lonStep=Math.max(0.18,lonSpan/(target*cos)), points=[];
  for(let lat=south;lat<=north+latStep*0.35;lat+=latStep) for(let x=west;x<=east+lonStep*0.35;x+=lonStep){let lon=x;while(lon>180)lon-=360;while(lon<-180)lon+=360;points.push([Number(lat.toFixed(4)),Number(lon.toFixed(4))]);}
  return points.slice(0,500);
}
async function loadViewportWeather(){
  const points=buildViewportPoints(); if(!points.length)return [];
  const q=new URLSearchParams({latitude:points.map(v=>v[0]).join(','),longitude:points.map(v=>v[1]).join(','),current:'temperature_2m,wind_speed_10m',timezone:'auto'});
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),9000);
  try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`,{signal:controller.signal});if(!r.ok)throw new Error('Champ météo indisponible');const data=await r.json();return Array.isArray(data)?data:[data];}finally{clearTimeout(timer);}
}
function drawWeatherField(data){
  if(!tempLayer||!windLayer)return; const temps=[],winds=[];
  data.forEach(v=>{const temp=v.current?.temperature_2m,wind=v.current?.wind_speed_10m;if(Number.isFinite(temp))temps.push([v.latitude,v.longitude,Math.max(0,Math.min(1,(temp+10)/45))]);if(Number.isFinite(wind))winds.push([v.latitude,v.longitude,Math.max(0.04,Math.min(1,wind/70))]);});
  tempLayer.setLatLngs(temps); windLayer.setLatLngs(winds);
}
async function refreshViewportHeatmap(){
  if(!map||!tempLayer||!windLayer)return; const requestId=++heatRequestId;
  try{const data=await loadViewportWeather();if(requestId!==heatRequestId)return;drawWeatherField(data);}catch(e){if(e.name!=='AbortError')console.warn('Heatmap météo:',e);}
}
async function updateRainRadar(){
  if(!rainLayer)return; rainLayer.clearLayers();
  try{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);const r=await fetch('https://api.rainviewer.com/public/weather-maps.json',{signal:controller.signal});clearTimeout(timer);if(!r.ok)throw new Error('Radar indisponible');const data=await r.json();const frames=data.radar?.past||[];const frame=frames[frames.length-1];if(!frame)return;L.tileLayer(`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_0.png`,{opacity:0.65,maxZoom:7,attribution:'Radar météo © RainViewer'}).addTo(rainLayer);}catch(e){console.warn('Radar pluie:',e);}
}
async function updateMap(p,c){
  try{initMap();if(!map)return;map.setView([p.latitude,p.longitude],7);if(currentMarker)currentMarker.remove();currentMarker=L.marker([p.latitude,p.longitude]).addTo(map).bindPopup(`<b>${p.name}</b><br>${Math.round(c.temperature_2m)}°C · ${Math.round(c.wind_speed_10m)} km/h`);await refreshViewportHeatmap();updateRainRadar();setTimeout(()=>map.invalidateSize(),100);}catch(e){console.warn('Carte:',e);}
}
async function geocode(name){const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=fr&format=json`);const d=await r.json();if(!d.results?.length)throw new Error('Ville introuvable');return d.results[0];}

async function load(place){
  status.textContent='Chargement de la météo…'; weather.hidden=true;
  try{
    const q=new URLSearchParams({latitude:place.latitude,longitude:place.longitude,current:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',hourly:'temperature_2m,apparent_temperature,weather_code,precipitation,precipitation_probability,rain,showers,snowfall,wind_speed_10m,wind_gusts_10m,cape,lifted_index,visibility,freezing_level_height,uv_index',daily:'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max',forecast_days:'7',timezone:'auto'});
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10000); const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`,{signal:controller.signal}); clearTimeout(timer); if(!r.ok)throw new Error('Météo indisponible');
    const d=await r.json(); render(place,d); renderAlerts(d); status.textContent=''; weather.hidden=false; updateMap(place,d.current);
  }catch(e){status.textContent=e.name==='AbortError'?'La météo met trop de temps à répondre.':'Erreur : '+e.message;weather.hidden=false;}
}

function render(p,d){
  const c=d.current,code=c.weather_code,info=codes[code]||['cloud','Conditions inconnues'];
  $('place').textContent=`${p.name}${p.country_code?' · '+p.country_code:''}`; $('temperature').innerHTML=`${Math.round(c.temperature_2m)}°C <span class="weather-icon temp-icon">${iconForCode(code)}</span>`; $('description').textContent=info[1]; $('feels').textContent=Math.round(c.apparent_temperature)+'°C'; $('maxmin').textContent=`${Math.round(d.daily.temperature_2m_max[0])}° / ${Math.round(d.daily.temperature_2m_min[0])}°`; $('humidity').textContent=c.relative_humidity_2m+'%'; $('wind').textContent=Math.round(c.wind_speed_10m)+' km/h'; $('rain').textContent=Math.round(d.hourly.precipitation_probability[0])+'%'; $('uv').textContent=d.daily.uv_index_max[0].toFixed(1);
  let hs=''; for(let i=0;i<24;i++){const t=new Date(d.hourly.time[i]);hs+=`<div class="hour"><small>${t.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</small><div class="weather-icon">${iconForCode(d.hourly.weather_code[i])}</div><b>${Math.round(d.hourly.temperature_2m[i])}°</b><small class="rain-label">${icons.drop} ${d.hourly.precipitation_probability[i]}%</small></div>`;} $('hourly').innerHTML=hs;
  let ds=''; for(let i=0;i<7;i++){const dt=new Date(d.daily.time[i]);ds+=`<div class="day"><small>${dt.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}</small><div class="weather-icon day-icon">${iconForCode(d.daily.weather_code[i])}</div><b>${Math.round(d.daily.temperature_2m_max[i])}°</b><small>${Math.round(d.daily.temperature_2m_min[i])}°</small></div>`;} $('daily').innerHTML=ds;
}

$('searchForm').addEventListener('submit',async e=>{e.preventDefault();const n=$('searchInput').value.trim();if(n)try{load(await geocode(n));}catch(e){status.textContent='Erreur : '+e.message;}});
$('locationBtn').onclick=()=>navigator.geolocation.getCurrentPosition(p=>load({name:'Ma position',latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>status.textContent='Position inaccessible.');
load({name:'Paris',latitude:48.8566,longitude:2.3522,country_code:'FR'});