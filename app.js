const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const LS={g(k){try{return localStorage.getItem(k)}catch(e){return null}},s(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const PASSCODE="TF141";
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const ST={sq:{},msgs:[],wp:[],intel:[],sos:{}};let me=LS.g("slot")||null,reply=null,tab="comms",lastSos=0;
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});

// ---- boot + gate
setTimeout(()=>{$("#boot").style.opacity=0;setTimeout(()=>$("#boot").remove(),500);if(LS.g("ok")!=="1")$("#gate").style.display="flex"},3000);
$("#pcb").onclick=()=>{if($("#pc").value.trim().toUpperCase()===PASSCODE){LS.s("ok","1");$("#gate").style.display="none"}else $("#pce").textContent="ACCESS DENIED"};
$("#pc").onkeydown=e=>{if(e.key==="Enter")$("#pcb").click()};
$$("nav button").forEach(b=>b.onclick=()=>{tab=b.dataset.t;$$("nav button").forEach(x=>x.classList.toggle("on",x===b));$$("main>section").forEach(s=>s.classList.toggle("on",s.id===tab));if(tab==="mapv"){initMap();setTimeout(()=>map.resize(),50)}});

// ---- data layer
const ORDER={msgs:{col:"ts",asc:false,lim:80},wp:{col:"ts",asc:false,lim:200},intel:{col:"ts",asc:false,lim:50}};
async function load(t){let q=sb.from(t).select("*");const o=ORDER[t];if(o)q=q.order(o.col,{ascending:o.asc}).limit(o.lim);const{data,error}=await q;if(error){console.error(t,error);return}
 if(t==="squad"){ST.sq={};data.forEach(r=>ST.sq[r.id]=r);rSquad();rBeacons()}
 else if(t==="msgs"){ST.msgs=data.reverse();rChat()}
 else if(t==="wp"){ST.wp=data;rWp()}
 else if(t==="intel"){ST.intel=data;rIntel()}
 else if(t==="sos"){ST.sos=data.find(r=>r.id==="main")||{};rSos()}}
["squad","msgs","wp","intel","sos"].forEach(load);
sb.channel("tf").on("postgres_changes",{event:"*",schema:"public"},p=>{
 if(p.table==="msgs"&&p.eventType==="INSERT"&&p.new.slot!==me)notify(p.new.cs,p.new.text);
 load(p.table)}).subscribe();
const up=(t,row)=>sb.from(t).upsert(row).then(r=>{if(r.error)alert("Error: "+r.error.message)});
function notify(title,body){if(document.hidden&&window.Notification&&Notification.permission==="granted")try{new Notification(title,{body,icon:"icon.svg"})}catch(e){}}

// ---- squad
const STAT=["ONLINE","ON PATROL","RECON","ENGAGED","RADIO SILENCE"];
function rSquad(){let h="";for(const n of["01","02","03","04"]){const o=ST.sq[n]||{};
 h+=`<div class="card ${me===n?"me":""}"><b style="color:var(--g)">SLOT ${n}</b> <span class="mut">${esc(o.callsign||"vacant")} ${o.name?"/ "+esc(o.name):""}</span><br><span style="color:var(--a)">${esc(o.status||"OFFLINE")}</span> <span class="mut">BAT ${o.bat!=null?o.bat+"%":"--"} | ACC ${o.acc!=null?o.acc+"m":"--"} | ${o.lat!=null?o.lat.toFixed(5)+", "+o.lng.toFixed(5):"NO FIX"}</span>${!me?`<div style="margin-top:8px"><button class="claim" data-n="${n}">Claim slot</button></div>`:""}</div>`}
 $("#sl").innerHTML=h;$$(".claim").forEach(b=>b.onclick=()=>claim(b.dataset.n));
 $("#mine").style.display=me?"block":"none";$("#sosb").style.display=me?"block":"none";
 $("#sts").innerHTML=STAT.map(s=>`<button class="st ${me&&ST.sq[me]&&ST.sq[me].status===s?"on":""}" data-s="${s}">${s}</button>`).join("");
 $$(".st").forEach(b=>b.onclick=()=>up("squad",{id:me,status:b.dataset.s,ts:Date.now()}))}
function claim(n){me=n;LS.s("slot",n);const o=ST.sq[n]||{};$("#cs").value=o.callsign||"";$("#nm").value=o.name||"";up("squad",{id:n,status:o.status||"ONLINE",ts:Date.now()});startTele();rSquad()}
$("#sv").onclick=()=>up("squad",{id:me,callsign:$("#cs").value.trim().slice(0,16),name:$("#nm").value.trim().slice(0,24),ts:Date.now()});
$("#rel").onclick=()=>{LS.s("slot","");me=null;rSquad()};
$("#nt").onclick=()=>{window.Notification?Notification.requestPermission().then(p=>alert("Alerts: "+p)):alert("Not supported on this browser")};
$("#sosb").onclick=()=>{if(confirm("Raise SOS to all operatives?"))sb.from("sos").upsert({id:"main",active:true,by:(ST.sq[me]||{}).callsign||"SLOT "+me,ts:Date.now()})};
$("#sosoff").onclick=()=>sb.from("sos").upsert({id:"main",active:false,ts:Date.now()});
function rSos(){const s=ST.sos,on=s.active&&Date.now()-s.ts<6e5;$("#sos").style.display=on?"flex":"none";$("#sosby").textContent=on?"RAISED BY "+(s.by||"UNKNOWN"):"";
 if(on&&s.ts!==lastSos){navigator.vibrate&&navigator.vibrate([400,200,400,200,400]);notify("SOS EMERGENCY","Raised by "+(s.by||"unknown"))}lastSos=s.ts}
let teleOn=false,lastW=0;
async function startTele(){if(teleOn||!me)return;teleOn=true;let bat=null;try{const b=await navigator.getBattery();bat=Math.round(b.level*100)}catch(e){}
 navigator.geolocation&&navigator.geolocation.watchPosition(p=>{if(Date.now()-lastW<5000)return;lastW=Date.now();up("squad",{id:me,bat,lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy),ts:Date.now()})},()=>{},{enableHighAccuracy:true,maximumAge:10000})}
if(me){const o=ST.sq[me]||{};startTele()}

// ---- comms
function rChat(){const c=$("#chat"),nb=c.scrollHeight-c.scrollTop-c.clientHeight<60;
 c.innerHTML=ST.msgs.map(x=>`<div class="m ${x.slot===me?"o":""}" data-id="${x.id}">${x.rq?`<div class="q">&gt; ${esc(x.rq)}</div>`:""}<span class="mut">[${new Date(x.ts).toTimeString().slice(0,5)}]</span> <b>${esc(x.cs)}</b>: ${esc(x.text)} <a class="rpl" style="color:var(--mut)">reply</a></div>`).join("")||'<span class="mut">No traffic.</span>';
 $$(".rpl").forEach(a=>a.onclick=()=>{const m=ST.msgs.find(z=>z.id===a.parentNode.dataset.id);reply=m;$("#rp").textContent="Replying to "+m.cs+": "+m.text.slice(0,40)});
 if(nb)c.scrollTop=c.scrollHeight}
function send(){if(!me)return alert("Claim a slot in SQUAD first");const t=$("#mi").value.trim();if(!t)return;
 sb.from("msgs").insert({slot:me,cs:(ST.sq[me]||{}).callsign||"OP"+me,text:t.slice(0,500),rq:reply?reply.cs+": "+reply.text.slice(0,60):"",ts:Date.now()}).then(r=>r.error&&alert(r.error.message));
 $("#mi").value="";reply=null;$("#rp").textContent=""}
$("#ms").onclick=send;$("#mi").onkeydown=e=>{if(e.key==="Enter")send()};

// ---- intel
function rIntel(){$("#il").innerHTML=ST.intel.map(d=>`<div class="card" data-id="${d.id}"><b style="color:var(--a)">${esc(d.title)}</b> <span class="mut">${esc(d.coords||"")}</span>`+(d.items||[]).map((it,i)=>`<div><label><input type="checkbox" class="ck" data-i="${i}" ${it.d?"checked":""} style="padding:0"> ${esc(it.t)}</label></div>`).join("")+`<div class="row" style="margin-top:6px"><input class="ni" placeholder="Add checklist item"><button class="na">+</button><button class="dl">Del</button></div></div>`).join("")||'<span class="mut">No dossiers.</span>';
 $$("#il [data-id]").forEach(c=>{const d=ST.intel.find(z=>z.id===c.dataset.id),sv=items=>sb.from("intel").update({items}).eq("id",d.id);
  c.querySelectorAll(".ck").forEach(k=>k.onchange=()=>{const its=d.items.map(z=>({...z}));its[+k.dataset.i].d=k.checked;sv(its)});
  c.querySelector(".na").onclick=()=>{const t=c.querySelector(".ni").value.trim();if(t)sv([...(d.items||[]),{t:t.slice(0,100),d:false}])};
  c.querySelector(".dl").onclick=()=>{if(confirm("Delete dossier?"))sb.from("intel").delete().eq("id",d.id)}})}
$("#ia").onclick=()=>{const t=$("#it").value.trim();if(!t)return;sb.from("intel").insert({title:t.slice(0,80),coords:$("#ic").value.trim().slice(0,40),items:[],ts:Date.now()});$("#it").value="";$("#ic").value=""};

// ---- 3D map
const ESRI="https://server.arcgisonline.com/ArcGIS/rest/services/",CARTO=n=>["a","b","c"].map(s=>`https://${s}.basemaps.cartocdn.com/${n}/{z}/{x}/{y}.png`);
const LAYERS={sat:{base:[ESRI+"World_Imagery/MapServer/tile/{z}/{y}/{x}"],lab:true},night:{base:CARTO("dark_nolabels"),lab:false},terrain:{base:[ESRI+"World_Topo_Map/MapServer/tile/{z}/{y}/{x}"],lab:false}};
function mkStyle(k){const L=LAYERS[k],s={base:{type:"raster",tiles:L.base,tileSize:256,maxzoom:19,attribution:"Esri / CARTO"}},ly=[{id:"base",type:"raster",source:"base"}];
 if(L.lab){s.lab={type:"raster",tiles:CARTO("dark_only_labels"),tileSize:256};ly.push({id:"lab",type:"raster",source:"lab"})}
 return{version:8,projection:{type:"globe"},sources:s,layers:ly}}
let map=null,mode="TARGET",ruler=[],bc={},wm={},fIdx=-1,fol=null;
const COL={TARGET:"#ff2a2a",EXTRACT:"#39ff14",HAZARD:"#ffb000","RV POINT":"#4aa8ff"};
function initMap(){if(map)return;map=new maplibregl.Map({container:"map",style:mkStyle("sat"),center:[0,20],zoom:1.4,maxZoom:19});
 map.addControl(new maplibregl.NavigationControl({showCompass:true}),"top-right");
 map.on("load",()=>{rBeacons();rWp()});
 map.on("click",e=>{const{lat,lng}=e.lngLat;if(mode==="RULER"){ruler.push([lng,lat]);if(ruler.length>2)ruler=[ruler[2]];drawRuler()}else sb.from("wp").insert({type:mode,lat,lng,ts:Date.now()})});
 map.on("dragstart",()=>fol=null)}
$$(".md").forEach(b=>b.onclick=()=>{mode=b.textContent;ruler=[];if(map)drawRuler();$$(".md").forEach(x=>x.classList.toggle("on",x===b))});
$$(".ly").forEach(b=>b.onclick=()=>{$$(".ly").forEach(x=>x.classList.toggle("on",x===b));map.setStyle(mkStyle(b.dataset.l));map.once("styledata",()=>drawRuler())});
const R=6371000,rad=x=>x*Math.PI/180;
function hav(a,b){const dl=rad(b[1]-a[1]),dn=rad(b[0]-a[0]),x=Math.sin(dl/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function brg(a,b){const y=Math.sin(rad(b[0]-a[0]))*Math.cos(rad(b[1])),x=Math.cos(rad(a[1]))*Math.sin(rad(b[1]))-Math.sin(rad(a[1]))*Math.cos(rad(b[1]))*Math.cos(rad(b[0]-a[0]));return(Math.atan2(y,x)*180/Math.PI+360)%360}
function drawRuler(){const i=$("#info"),fc={type:"FeatureCollection",features:ruler.length>1?[{type:"Feature",geometry:{type:"LineString",coordinates:ruler}}]:[]};
 if(map.getSource("rl"))map.getSource("rl").setData(fc);else{try{map.addSource("rl",{type:"geojson",data:fc});map.addLayer({id:"rl",type:"line",source:"rl",paint:{"line-color":"#ffb000","line-width":3}})}catch(e){}}
 if(ruler.length===2){const d=hav(ruler[0],ruler[1]);i.style.display="block";i.textContent="RANGE "+(d>=1000?(d/1000).toFixed(2)+" km":Math.round(d)+" m")+" | BEARING "+Math.round(brg(ruler[0],ruler[1]))+"\u00b0"}else{i.style.display=ruler.length?"block":"none";i.textContent="Ruler: tap second point"}}
function rBeacons(){if(!map)return;Object.values(ST.sq).forEach(o=>{if(o.lat==null)return;let m=bc[o.id];
  if(!m){const el=document.createElement("div");el.innerHTML='<div class="bcn"></div><div class="tag"></div>';m=bc[o.id]=new maplibregl.Marker({element:el}).setLngLat([o.lng,o.lat]).addTo(map)}
  m.setLngLat([o.lng,o.lat]);m.getElement().querySelector(".tag").textContent=o.callsign||"OP"+o.id});
 if(fol&&ST.sq[fol]&&ST.sq[fol].lat!=null)map.easeTo({center:[ST.sq[fol].lng,ST.sq[fol].lat],zoom:Math.max(map.getZoom(),15)})}
function rWp(){if(!map)return;const ids=new Set(ST.wp.map(w=>w.id));Object.keys(wm).forEach(k=>{if(!ids.has(k)){wm[k].remove();delete wm[k]}});
 ST.wp.forEach(w=>{if(wm[w.id])return;const el=document.createElement("div");el.className="pin";el.style.background=COL[w.type]||"#fff";el.title=w.type;
  el.onclick=ev=>{ev.stopPropagation();if(confirm(w.type+" waypoint: delete it?"))sb.from("wp").delete().eq("id",w.id)};
  wm[w.id]=new maplibregl.Marker({element:el}).setLngLat([w.lng,w.lat]).addTo(map)})}
$("#fo").onclick=()=>{const L=Object.values(ST.sq).filter(o=>o.lat!=null);if(!L.length)return alert("No operative has a GPS fix yet");fIdx=(fIdx+1)%L.length;fol=L[fIdx].id;rBeacons()};
$("#qb").onclick=async()=>{const q=$("#q").value.trim();if(!q)return;const m=q.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
 if(m)return map.flyTo({center:[+m[3],+m[1]],zoom:15,duration:3000});
 try{const r=await(await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(q))).json();
  if(r[0])map.flyTo({center:[+r[0].lon,+r[0].lat],zoom:13,duration:3500});else alert("Not found")}catch(e){alert("Search failed")}};
$("#q").onkeydown=e=>{if(e.key==="Enter")$("#qb").click()};
