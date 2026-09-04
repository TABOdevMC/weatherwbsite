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
const codes = {0:['sun','Ciel dégagé'],1:['sun','Principalement dégagé'],2:['cloud','Partiellement nuageux'],3:['cloud','Couvert'],45:['fog','Brouillard'],48:['fog','Brouillard givrant'],51:['rain','Bruine légère'],53:['rain','Bruine'],55:['rain','Forte bruine'],61:['rain','Pluie légère'],63:['rain','Pluie'],65:['rain','Forte pluie'],71:['snow','Neige légère'],73:['snow','Neige'],75:['snow','Forte neige'],80:['rain','Averses'],81:['rain','Averses'],82:['storm','Fortes averses'],95:['storm','Orage'],96:['storm','Orage avec grêle'],99:['storm','Orage avec grêle']};

let map, currentMarker, tempLayer, windLayer, rainLayer;

function initMap(){
  if(map || typeof L === 'undefined') return;
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
  map = L.map('map',{layers:[osm],zoomControl:true});
  tempLayer = L.heatLayer([], {radius:70, blur:55, maxZoom:9, minOpacity:0.28, max:1, gradient:{0:'#313695',0.2:'#4575b4',0.4:'#74add1',0.55:'#ffffbf',0.7:'#fdae61',0.85:'#f46d43',1:'#a50026'}});
  windLayer = L.heatLayer([], {radius:65, blur:50, maxZoom:9, minOpacity:0.22, max:0.9, gradient:{0:'#313695',0.25:'#74add1',0.5:'#ffffbf',0.7:'#fdae61',0.85:'#f46d43',1:'#a50026'}});
  rainLayer = L.layerGroup();
  L.control.layers({'🗺️ OpenStreetMap':osm},{'🌡️ Température':tempLayer,'💨 Vent':windLayer,'🌧️ Précipitations':rainLayer},{collapsed:false}).addTo(map);
}

async function loadWeatherField(p){
  const points=[];
  const latStep=0.5;
  const lonStep=0.75/Math.max(0.35,Math.cos(p.latitude*Math.PI/180));
  for(let y=-5;y<=5;y++){
    for(let x=-5;x<=5;x++){
      points.push([p.latitude+y*latStep,p.longitude+x*lonStep]);
    }
  }
  const q = new URLSearchParams({
    latitude:points.map(v=>v[0]).join(','),
    longitude:points.map(v=>v[1]).join(','),
    current:'temperature_2m,wind_speed_10m',
    timezone:'auto'
  });
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`,{signal:controller.signal});
    if(!r.ok) throw new Error('Champ météo indisponible');
    const data=await r.json();
    return Array.isArray(data) ? data : [data];
  }finally{
    clearTimeout(timer);
  }
}

function drawWeatherField(data){
  if(!tempLayer || !windLayer) return;
  const temps=[];
  const winds=[];
  data.forEach(v=>{
    const lat=v.latitude;
    const lon=v.longitude;
    const temp=v.current?.temperature_2m;
    const wind=v.current?.wind_speed_10m;
    if(Number.isFinite(temp)) temps.push([lat,lon,Math.max(0,Math.min(1,(temp+10)/45))]);
    if(Number.isFinite(wind)) winds.push([lat,lon,Math.max(0.05,Math.min(1,wind/70))]);
  });
  tempLayer.setLatLngs(temps);
  windLayer.setLatLngs(winds);
}

async function updateRainRadar(){
  if(!rainLayer) return;
  rainLayer.clearLayers();
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),7000);
    const r=await fetch('https://api.rainviewer.com/public/weather-maps.json',{signal:controller.signal});
    clearTimeout(timer);
    if(!r.ok) throw new Error('Radar indisponible');
    const data=await r.json();
    const frames=data.radar?.past || [];
    const frame=frames[frames.length-1];
    if(!frame) return;
    L.tileLayer(`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_0.png`,{opacity:0.65,maxZoom:7,attribution:'Radar météo © RainViewer'}).addTo(rainLayer);
  }catch(e){
    console.warn('Radar pluie:',e);
  }
}

async function updateMap(p,c){
  try{
    initMap();
    if(!map) return;
    map.setView([p.latitude,p.longitude],7);
    if(currentMarker) currentMarker.remove();
    currentMarker=L.marker([p.latitude,p.longitude]).addTo(map).bindPopup(`<b>${p.name}</b><br>${Math.round(c.temperature_2m)}°C · ${Math.round(c.wind_speed_10m)} km/h`);
    try{
      const field=await loadWeatherField(p);
      drawWeatherField(field);
    }catch(e){
      console.warn('Heatmap météo:',e);
    }
    await updateRainRadar();
    setTimeout(()=>map.invalidateSize(),100);
  }catch(e){
    console.warn('Carte:',e);
  }
}

async function geocode(name){
  const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=fr&format=json`);
  const d=await r.json();
  if(!d.results?.length) throw new Error('Ville introuvable');
  return d.results[0];
}

async function load(place){
  status.textContent='Chargement de la météo…';
  weather.hidden=true;
  try{
    const q=new URLSearchParams({latitude:place.latitude,longitude:place.longitude,current:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',hourly:'temperature_2m,weather_code,precipitation_probability,uv_index',daily:'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max',forecast_days:'7',timezone:'auto'});
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`,{signal:controller.signal});
    clearTimeout(timer);
    if(!r.ok) throw new Error('Météo indisponible');
    const d=await r.json();
    render(place,d);
    status.textContent='';
    weather.hidden=false;
    updateMap(place,d.current);
  }catch(e){
    status.textContent=e.name==='AbortError'?'La météo met trop de temps à répondre.':'Erreur : '+e.message;
    weather.hidden=false;
  }
}

function render(p,d){
  const c=d.current;
  const code=c.weather_code;
  const info=codes[code]||['cloud','Conditions inconnues'];
  $('place').textContent=`${p.name}${p.country_code?' · '+p.country_code:''}`;
  $('temperature').innerHTML=`${Math.round(c.temperature_2m)}°C <span class="weather-icon temp-icon">${iconForCode(code)}</span>`;
  $('description').textContent=info[1];
  $('feels').textContent=Math.round(c.apparent_temperature)+'°C';
  $('maxmin').textContent=`${Math.round(d.daily.temperature_2m_max[0])}° / ${Math.round(d.daily.temperature_2m_min[0])}°`;
  $('humidity').textContent=c.relative_humidity_2m+'%';
  $('wind').textContent=Math.round(c.wind_speed_10m)+' km/h';
  $('rain').textContent=Math.round(d.hourly.precipitation_probability[0])+'%';
  $('uv').textContent=d.daily.uv_index_max[0].toFixed(1);
  let hs='';
  for(let i=0;i<24;i++){
    const t=new Date(d.hourly.time[i]);
    hs+=`<div class="hour"><small>${t.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</small><div class="weather-icon">${iconForCode(d.hourly.weather_code[i])}</div><b>${Math.round(d.hourly.temperature_2m[i])}°</b><small class="rain-label">${icons.drop} ${d.hourly.precipitation_probability[i]}%</small></div>`;
  }
  $('hourly').innerHTML=hs;
  let ds='';
  for(let i=0;i<7;i++){
    const dt=new Date(d.daily.time[i]);
    ds+=`<div class="day"><small>${dt.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}</small><div class="weather-icon day-icon">${iconForCode(d.daily.weather_code[i])}</div><b>${Math.round(d.daily.temperature_2m_max[i])}°</b><small>${Math.round(d.daily.temperature_2m_min[i])}°</small></div>`;
  }
  $('daily').innerHTML=ds;
}

$('searchForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const n=$('searchInput').value.trim();
  if(n) try{load(await geocode(n));}catch(e){status.textContent='Erreur : '+e.message;}
});

$('locationBtn').onclick=()=>navigator.geolocation.getCurrentPosition(
  p=>load({name:'Ma position',latitude:p.coords.latitude,longitude:p.coords.longitude}),
  ()=>status.textContent='Position inaccessible.'
);

load({name:'Paris',latitude:48.8566,longitude:2.3522,country_code:'FR'});
