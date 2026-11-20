"use strict";
/* =====================================================================
   ERNÄHRUNG – Tag als Zeitleiste, Teller, Vorschläge, Ziele, Gewicht & Bedarf
   Speicher: localStorage[KEY]. Sammlungen sind {id:{…,upd}} – auf dem Pi
   führt der Server sie pro Eintrag zusammen (Sync-Modus „liste“).
   ===================================================================== */
const KEY='ernaehrung_v1', APP='ernaehrung';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const num=v=>{ if(v==null||v==='') return null; const x=parseFloat(String(v).replace(',','.')); return isNaN(x)?null:x; };
const r1=v=>Math.round((+v||0)*10)/10;
const fmt=(v,d=0)=>v==null||isNaN(v)?'–':(+v).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:d});
const NUT=['kcal','p','kh','f','bal','zucker','salz'];
const NL={kcal:'Energie',p:'Eiweiß',kh:'Kohlenhydrate',f:'Fett',bal:'Ballaststoffe',zucker:'davon Zucker',salz:'Salz'};
const NLX={...NL,sfa:'davon gesättigt'};
const NC={p:'var(--p)',kh:'var(--kh)',f:'var(--f)',bal:'var(--bal)'};
/* Mikronährstoffe (Werte aus dem BLS 4.0). Referenz: D-A-CH-Referenzwerte (DGE/ÖGE/SGE), 3. Aufl. 2025, Erwachsene 25–65.
   [Name, Einheit, Referenz männlich, Referenz weiblich, Fußnote] – s = Schätzwert, d = gilt ohne Eigenbildung über Sonnenlicht, z = abhängig vom Phytat */
const MI={vA:['Vitamin A','µg',850,700],vD:['Vitamin D','µg',20,20,'d'],vE:['Vitamin E','mg',8,8,'s'],vK:['Vitamin K','µg',70,60,'s'],
  b1:['Vitamin B1','mg',1.2,1.0],b2:['Vitamin B2','mg',1.4,1.1],b3:['Niacin','mg',15,12],b6:['Vitamin B6','mg',1.6,1.4],fol:['Folat','µg',300,300],b12:['Vitamin B12','µg',4,4],vC:['Vitamin C','mg',110,95],
  k:['Kalium','mg',4000,4000,'s'],ca:['Calcium','mg',1000,1000],mg:['Magnesium','mg',350,300,'s'],fe:['Eisen','mg',11,16],zn:['Zink','mg',14,8,'z'],jod:['Jod','µg',150,150],phos:['Phosphor','mg',550,550]};
const MIK=Object.keys(MI), XTRA=['sfa','o3','alk'], XL={sfa:'Gesättigte Fettsäuren',o3:'Omega-3-Fettsäuren',alk:'Alkohol'}, ALLK=[...NUT,...MIK,...XTRA], MX=[...MIK,...XTRA];
const BLS_SRC='Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.';
const rS=v=>{ const a=Math.abs(v); return a>=100?Math.round(v):a>=10?Math.round(v*10)/10:a>=1?Math.round(v*100)/100:Math.round(v*1000)/1000; };
const rK=(k,v)=>NUT.includes(k)?r1(v):rS(v);
const WD=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'], MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

/* ---------- Datum ---------- */
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date());
const kDate=k=>new Date(k+'T00:00');
const kAdd=(k,n)=>{ const d=kDate(k); d.setDate(d.getDate()+n); return iso(d); };
const kDiff=(a,b)=>Math.round((kDate(a)-kDate(b))/864e5);
const nowHM=()=>{ const d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };
const hm2min=t=>{ const m=/^(\d{1,2}):(\d{2})/.exec(t||''); return m?+m[1]*60+ +m[2]:null; };
function fDay(k){ const d=kDate(k), t=today(); const rel=k===t?'Heute':k===kAdd(t,-1)?'Gestern':k===kAdd(t,1)?'Morgen':WD[d.getDay()];
  return {t:rel, s:(rel===WD[d.getDay()]?'':WD[d.getDay()]+', ')+d.getDate()+'. '+MON[d.getMonth()]}; }
const fDur=min=>{ min=Math.max(0,Math.round(min)); const h=Math.floor(min/60); return h?`${h} h ${String(min%60).padStart(2,'0')} min`:`${min} min`; };

/* ---------- Zustand ---------- */
const DEFSET=()=>({upd:0,ziele:{kcal:2500,p:140,kh:300,f:80,bal:30,wasser:2500,sfa:0},profil:{sex:'',alter:null,cm:null,akt:1.55},   // sfa: Obergrenze in g, 0 = automatisch 10 % der Kalorien
  phase:{art:'halten',tempo:0.25,ab:today(),zielKg:null},phasen:[],fasten:{on:false,h:16},checkin:null,mikro:false,sport:1,makro:{stil:'ausgewogen',pkg:null}});   // sport: Anteil der Sport-Kalorien, der aufs Tagesziel kommt (1 | 0.5 | 0)
let fq='', D, view='heute', day=today(), sheet=null, openBlk=null, rng=7, foodTab='eigen', lastTheme=null;
function normalize(x){ TD=null;
  x=x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  ['log','foods','recipes','weight','water','burn','mass'].forEach(c=>{ if(!x[c]||typeof x[c]!=='object'||Array.isArray(x[c])) x[c]={}; });
  const d=DEFSET(); x.set=x.set&&typeof x.set==='object'?x.set:d;
  Object.keys(d).forEach(k=>{ if(x.set[k]==null) x.set[k]=d[k]; else if(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])) Object.keys(d[k]).forEach(j=>{ if(x.set[k][j]===undefined) x.set[k][j]=d[k][j]; }); });
  x.app=APP; x.v=1; x.savedAt=+x.savedAt||0; return x; }
function load(){ let x=null; try{ x=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){} D=normalize(x); }
let sumT=null, TD=null;   // TD: Zwischenspeicher für den Bedarf
function save(){ D.savedAt=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){ toast('Speichern im Browser nicht möglich'); }
  clearTimeout(sumT); sumT=setTimeout(pushSum,1200); stamp(); }
const live=c=>Object.values(D[c]).filter(x=>x&&!x.del);
function put(c,it){ it.upd=Date.now(); D[c][it.id]=it; TD=null; return it; }
function rm(c,id){ TD=null; if(D[c][id]) D[c][id]={id,upd:Date.now(),del:true}; }
function setS(fn){ TD=null; fn(D.set); D.set.upd=Date.now(); save(); }
const G=()=>D.set.ziele;

/* ---------- Lebensmittel ---------- */
const STDMAP=Object.fromEntries(STD.map(f=>[f.id,f]));
function scale(je100,g){ const o={}; ALLK.forEach(k=>{ if(je100&&je100[k]!=null&&je100[k]!=='') o[k]=rK(k,je100[k]*g/100); }); return o; }
function sumN(list){ const o={}; NUT.forEach(k=>o[k]=0); list.forEach(e=>NUT.forEach(k=>{ o[k]+=+((e.n||{})[k])||0; })); NUT.forEach(k=>o[k]=r1(o[k])); return o; }
function recipeFood(r){ const Z=r.zutaten||[], tot=Z.reduce((t,z)=>t+(+z.g||0),0), gesamt=+r.gesamtG>0?+r.gesamtG:tot, n=sumN(Z.map(z=>({n:scale(z.n100,z.g)}))), je100={};
  NUT.forEach(k=>je100[k]=gesamt?r1(n[k]*100/gesamt):0);
  MX.forEach(k=>{ const Zg=Z.filter(z=>+z.g>0); if(!gesamt||!Zg.length||Zg.some(z=>!z.n100||z.n100[k]==null)) return;   // fehlt ein Wert, bleibt er offen (nicht 0)
    je100[k]=rS(Zg.reduce((t,z)=>t+z.n100[k]*z.g/100,0)*100/gesamt); });
  return {id:r.id,name:r.name,quelle:'rezept',je100,portionen:[{l:'1 Portion',g:Math.round(gesamt/(+r.portionen||1))}],rez:r}; }
function food(ref){ if(STDMAP[ref]) return STDMAP[ref]; if(ref&&ref.startsWith('bls-')) return BLSMAP[ref.slice(4)]||null; const f=D.foods[ref]; if(f&&!f.del) return {...f,quelle:'eigen'}; const r=D.recipes[ref]; if(r&&!r.del) return recipeFood(r); return null; }
const allFoods=withBls=>[...live('foods').map(f=>({...f,quelle:'eigen'})),...live('recipes').map(recipeFood),...STD,...(withBls&&BLS?BLS:[])];
/* ---------- BLS 4.0: liegt als /bls.json auf dem Pi (gzip, gecacht) – keine Internetverbindung nötig ---------- */
let BLS=null; const BLSMAP={};
/* Getränke im BLS: N = alkoholfreie Getränke, P = alkoholische, F…saft/nektar = Säfte, M1…milch/drink – ohne Pulver/Konzentrat */
const blsFl=(c,n)=>!/pulver|granulat|konzentrat|instant|extrakt/i.test(n)&&(/^[NP]/.test(c)||(/^F/.test(c)&&/saft|nektar|smoothie/i.test(n))||(/^M1/.test(c)&&/milch|drink|kakao/i.test(n)));
const isFl=f=>!!(f&&f.fl), unitOf=x=>x&&x.fl?'ml':'g';
function loadBLS(){ if(location.protocol==='file:') return;
  fetch('/bls.json').then(r=>r.ok?r.json():null).then(j=>{ if(!j||!Array.isArray(j.rows)) return; const K=j.keys;
    BLS=j.rows.map(r=>{ const je100={}; K.forEach((k,i)=>{ const v=r[i+2]; if(v!=null) je100[k]=v; }); return {id:'bls-'+r[0],code:r[0],name:r[1],quelle:'bls',je100,portionen:[],_n:norm(r[1]),fl:blsFl(r[0],r[1])}; });
    BLS.forEach(f=>BLSMAP[f.code]=f);
    STD.forEach(s=>{ const b=s.bls&&BLSMAP[s.bls]; if(b) MX.forEach(k=>{ if(s.je100[k]==null&&b.je100[k]!=null) s.je100[k]=b.je100[k]; }); });   // Grundliste: Mikros aus dem BLS
    if(sheet&&sheet.m==='add') drawRes(); else if(!sheet) render(); }).catch(()=>{}); }
const norm=s=>String(s||'').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
let USE=null;
function usage(){ if(USE) return USE; const u={}; live('log').forEach(e=>{ if(!e.ref) return; const x=u[e.ref]=u[e.ref]||{n:0,g:e.g,last:0}; x.n++; if(e.upd>x.last){ x.last=e.upd; x.g=e.g; } }); return USE=u; }
function search(q,tab,lim){ const u=usage(), qn=norm(q).trim(), toks=qn.split(/\s+/).filter(Boolean);
  let L=tab==='bls'?(BLS||[]):allFoods(toks.length>0||tab==='zuletzt');
  if(tab==='eigen') L=L.filter(f=>f.quelle==='eigen'); else if(tab==='rezepte') L=L.filter(f=>f.quelle==='rezept');
  else if(tab==='zuletzt') L=L.filter(f=>u[f.id]);
  if(/^\d{8,14}$/.test(qn)){ const z=s=>String(s||'').replace(/^0+/,''); return L.filter(f=>f.ean&&z(f.ean)===z(qn)); }
  if(toks.length) L=L.filter(f=>{ const h=f._n||norm(f.name+' '+(f.marke||'')); return toks.every(t=>h.includes(t)); });
  const sc=f=>(u[f.id]?Math.min(30,u[f.id].n)*3+(tab==='zuletzt'?u[f.id].last/1e12:0):0)+(toks.length&&norm(f.name).startsWith(toks[0])?8:0)+(f.quelle==='eigen'?2:0)+(f.quelle==='rezept'?1:0)+(f.quelle==='std'?4:0)
    +(f.quelle==='bls'?(/\broh\b/.test(f._n)?1:0)-f.name.length/25:0);
  return L.sort((a,b)=>sc(b)-sc(a)||a.name.localeCompare(b.name,'de')).slice(0,lim||60); }
const defG=f=>{ const u=usage()[f.id]; return u&&u.g?u.g:(f.portionen&&f.portionen[0]?f.portionen[0].g:100); };

/* ---------- Tagesdaten ---------- */
const entriesOn=k=>live('log').filter(e=>e.datum===k).sort((a,b)=>(a.zeit||'').localeCompare(b.zeit||'')||a.upd-b.upd);
const waterOn=k=>live('water').filter(w=>w.datum===k);
const drinkMl=k=>entriesOn(k).filter(e=>e.fl&&!(e.n&&+e.n.alk>0)).reduce((t,e)=>t+(+e.g||0),0);   // Getränke ohne Alkohol zählen zum Trinken
/* Sport/Garmin: verbrannte (aktive) Kalorien je Tag; erhöhen das Tagesziel um den eingestellten Anteil */
const burnOn=k=>live('burn').filter(b=>b.datum===k).sort((a,b)=>a.upd-b.upd);
const dayBurn=L=>{ const T=L.filter(b=>b.tag); return (T.length?T:L).reduce((t,b)=>t+(+b.kcal||0),0); };   // Tageswert der Uhr (tag) ersetzt Einzel-Einträge – nichts zählt doppelt
const burnSum=k=>dayBurn(burnOn(k));
const budget=k=>Math.round(G().kcal+burnSum(k)*(+D.set.sport||0));
/* Gesättigte Fettsäuren: Summe und Anteil des Fetts, für den ein Wert vorliegt (fehlt er, zählt er nicht als 0).
   Ältere Einträge ohne Angabe werden aus dem Lebensmittel nachgerechnet, sobald es einen Wert hat. */
function sfaOf(L){ let v=0, fk=0, ft=0; L.forEach(e=>{ const n=e.n||{}, f=+n.f||0; let s=n.sfa!=null?+n.sfa:null;
    if(s==null&&e.ref&&e.g>0){ const fd=food(e.ref); if(fd&&fd.je100&&fd.je100.sfa!=null) s=fd.je100.sfa*e.g/100; }
    ft+=f; if(s!=null){ v+=s; fk+=f; } }); return {v:r1(v),cov:ft>0?fk/ft:1,ft}; }
const sfaMax=()=>+G().sfa>0?+G().sfa:Math.round(G().kcal*0.1/9);
const waterSum=k=>waterOn(k).reduce((t,w)=>t+(+w.ml||0),0)+drinkMl(k);
function addEntries(items,k,zeit){ items.forEach(it=>put('log',{id:uid('e'),datum:k,zeit,ref:it.ref||null,name:it.name,g:r1(it.g),n:it.n,quelle:it.quelle||'',...(it.fl?{fl:1}:{})})); USE=null; save(); }
function suggestions(k){ const ref=k===today()?hm2min(nowHM()):12*60, since=kAdd(k,-30), have=new Set(entriesOn(k).map(e=>e.ref)), c={};
  live('log').forEach(e=>{ if(!e.ref||e.datum>=k||e.datum<since||have.has(e.ref)) return; const m=hm2min(e.zeit); if(m==null) return;
    const dlt=Math.min(Math.abs(m-ref),1440-Math.abs(m-ref)); if(dlt>90) return;
    const x=c[e.ref]=c[e.ref]||{ref:e.ref,name:e.name,n:0,g:e.g,u:0}; x.n++; if(e.upd>x.u){ x.u=e.upd; x.g=e.g; } });
  return Object.values(c).filter(x=>x.n>=2&&food(x.ref)).sort((a,b)=>b.n-a.n).slice(0,6); }

/* ---------- Gewicht, Trend, Bedarf ---------- */
function weights(){ return live('weight').filter(w=>+w.kg>0).sort((a,b)=>a.datum.localeCompare(b.datum)); }
function trend(){ const W=weights(); let t=null, prev=null; return W.map(w=>{ if(t==null) t=+w.kg; else { const dd=Math.max(1,kDiff(w.datum,prev)); const a=1-Math.pow(0.9,dd); t=t+a*(+w.kg-t); } prev=w.datum; return {datum:w.datum,kg:+w.kg,t:r1(t*10)/10}; }); }
function trendAt(T,k){ let v=null; T.forEach(x=>{ if(x.datum<=k) v=x.t; }); return v; }
function lastKg(){ const W=weights(); return W.length?+W[W.length-1].kg:null; }
/* ---------- Bedarf ----------
   Bedarf = Grundbedarf (Ruhe + Alltag) + Sport. Der Grundbedarf kommt erst aus der Formel (Profil) und wird dann aus den
   eigenen Daten gemessen: Ø gegessen − Gewichtsänderung × 7700 kcal/kg, über 4 Wochen. Angerechnete Sport-Kalorien werden
   vorher abgezogen, damit Sport nicht doppelt zählt (einmal im Bedarf, einmal als Zuschlag aufs Tagesziel). */
const SPF=()=>+D.set.sport||0;
function bmr(){ const p=D.set.profil, kg=lastKg(); if(!p.sex||!(+p.alter>0)||!(+p.cm>0)||!kg) return null; return Math.round(10*kg+6.25*+p.cm-5*+p.alter+(p.sex==='m'?5:-161)); }
const tagBurn=(a,b)=>live('burn').some(x=>x.tag&&x.datum>=a&&x.datum<=b);
const uhrTag=()=>!!SPF()&&tagBurn(kAdd(today(),-14),today());   // die Uhr liefert den ganzen Tag → Alltagsbewegung steckt schon in den Sport-Kalorien
function mifflin(){ const b=bmr(); if(!b) return null; return Math.round(b*(uhrTag()?1.1:(+D.set.profil.akt||1.55))); }
const minKcal=()=>{ const b=bmr(); return b?b*0.6:900; };   // darunter gilt ein Tag als unvollständig erfasst
function tdee(){ if(TD&&TD.s===D.savedAt&&TD.d===today()) return TD.r; const r=tdeeCalc(); TD={s:D.savedAt,d:today(),r}; return r; }
function tdeeCalc(){ const N=28, end=kAdd(today(),-1), start=kAdd(end,-(N-1)), f=SPF(), form=mifflin(), minK=minKcal(), by={}, B={};
  live('log').forEach(e=>{ if(e.datum>=start&&e.datum<=end) by[e.datum]=(by[e.datum]||0)+(+((e.n||{}).kcal)||0); });
  live('burn').forEach(x=>{ if(x.datum>=start&&x.datum<=end) (B[x.datum]=B[x.datum]||[]).push(x); });
  const full=Object.keys(by).filter(k=>by[k]>=minK), part=Object.keys(by).length-full.length;
  const W=weights().filter(w=>w.datum>=start&&w.datum<=end), span=W.length?kDiff(W[W.length-1].datum,W[0].datum):0;
  const bd=Object.keys(B), td=bd.filter(k=>B[k].some(x=>x.tag));   // mit Tageswerten der Uhr: Schnitt über diese Tage, sonst über alle 28 (kein Eintrag = kein Sport)
  const sport=!f||!bd.length?0:f*(td.length?td.reduce((t,k)=>t+dayBurn(B[k]),0)/td.length:bd.reduce((t,k)=>t+dayBurn(B[k]),0)/N);
  const o={v:form?Math.round((form+sport)/10)*10:null,base:form,sport:Math.round(sport),logged:full.length,part,nW:W.length,src:form?'Formel':null,c:0};
  const fehlt='Für eine Messung aus deinen eigenen Daten brauche ich in den letzten 4 Wochen mindestens 10 vollständig erfasste Tage und 4 Gewichtswerte über mindestens 10 Tage.';
  if(full.length<10||W.length<4||span<10){ o.need=fehlt; return o; }
  const avg=full.reduce((t,k)=>t+by[k],0)/full.length, xs=W.map(w=>kDiff(w.datum,start)), n=W.length, mx=xs.reduce((a,b)=>a+b,0)/n, my=W.reduce((a,w)=>a+ +w.kg,0)/n;
  let sxy=0, sxx=0; W.forEach((w,i)=>{ sxy+=(xs[i]-mx)*(+w.kg-my); sxx+=(xs[i]-mx)*(xs[i]-mx); });
  const slope=sxx?sxy/sxx:0, roh=avg-slope*7700, ref=form?form+sport:null;   // Ausgleichsgerade durch alle Messungen statt nur Anfang und Ende
  if(roh<1000||roh>6000||(ref&&(roh<ref*0.6||roh>ref*1.6))){ o.need='Essen und Gewichtsverlauf passen noch nicht zusammen (gemessen wären es '+fmt(Math.round(roh/10)*10)+' kcal) – vermutlich fehlen Einträge. Bis dahin gilt der Startwert.'; return o; }
  const c=Math.min(1,full.length/21)*Math.min(1,span/21), v=ref?c*roh+(1-c)*ref:roh;   // bis 3 Wochen Daten da sind, mit der Formel mischen
  return Object.assign(o,{v:Math.round(v/10)*10,base:Math.round((v-sport)/10)*10,avg:Math.round(avg),wk:slope*7,c:ref?c:1,roh:Math.round(roh/10)*10,src:!ref||c>=.99?'gemessen':'gemessen + Formel'}); }
const needOn=k=>{ const b=tdee().base; return b?Math.round(b+burnSum(k)*SPF()):null; };
/* Bilanz der letzten n Tage (nur vollständig erfasste): Ø gegessen − Bedarf, dazu die Änderung des Gewichtstrends */
function bilanz(n){ const b=tdee().base; if(!b) return null; const end=kAdd(today(),-1), minK=minKcal(); let s=0, c=0;
  for(let i=0;i<n;i++){ const k=kAdd(end,-i), kc=sumN(entriesOn(k)).kcal; if(kc<minK) continue; s+=kc-(b+burnSum(k)*SPF()); c++; }
  if(!c) return null; const T=trend(), from=kAdd(end,-n), a=trendAt(T,end), z=trendAt(T,from), wIn=weights().some(w=>w.datum>from&&w.datum<=end);
  return {d:Math.round(s/c),n:c,kg:wIn&&a!=null&&z!=null?a-z:null}; }
function prognose(){ const ph=D.set.phase, z=+ph.zielKg, T=trend(), t=T.length?T[T.length-1].t:null, tp=+ph.tempo; if(!z||t==null||!tp||ph.art==='halten') return null;
  const diff=ph.art==='ab'?t-z:z-t; if(diff<=0) return {done:true}; const w=diff/tp; return {w,datum:kAdd(today(),Math.round(w*7))}; }
/* Phase → kcal-Verschiebung pro Tag (7700 kcal ≈ 1 kg) */
const phDelta=(art,tempo)=>art==='aufbau'?Math.round((+tempo||0)*7700/7):art==='ab'?-Math.round((+tempo||0)*7700/7):0;
/* Phase/Tempo geändert: Kalorienziel um die Differenz verschieben, Eiweiß & Fett bleiben, Kohlenhydrate gleichen aus */
function shiftGoal(s,oldD,newD){ const z=s.ziele, k=Math.max(1000,Math.round(+z.kcal+newD-oldD)); z.kcal=k; z.kh=Math.max(0,Math.round((k-(+z.p||0)*4-(+z.f||0)*9)/4)); return k; }
/* Phasenwechsel: erst nach 24 h zählt eine Phase für den Verlauf. Kürzer gewählte Phasen werden verworfen;
   kehrt man so zur vorherigen Phase zurück, läuft sie mit ihrem alten „seit“-Datum weiter. */
function phaseSwitch(s,art){ const P=s.phasen=s.phasen||[], cur=s.phase, t0=+cur.ts||kDate(cur.ab).getTime(), now=Date.now();
  if(now-t0>=864e5) P.push({art:cur.art,tempo:cur.tempo,ab:cur.ab,bis:today(),ts:t0});
  const last=P[P.length-1];
  if(last&&last.art===art&&now-t0<864e5){ P.pop(); s.phase={art,tempo:last.tempo!=null?last.tempo:art==='ab'?0.5:0.25,ab:last.ab,ts:last.ts||kDate(last.ab).getTime()}; return; }
  s.phase={art,tempo:art==='ab'?0.5:0.25,ab:today(),ts:now}; }
/* Wochenkonto (Mo–So): Tagesziel − gegessen, summiert über die abgeschlossenen, vollständig erfassten Tage der Woche.
   „heute“ = Tagesziel plus das Konto gleichmäßig auf die restlichen Tage verteilt. */
const weekStart=k=>kAdd(k,-((kDate(k).getDay()+6)%7));
function wochenkonto(k){ if(k>today()) return null; const ws=weekStart(k), minK=minKcal(); let s=0, n=0;
  for(let d=ws;d<k;d=kAdd(d,1)){ const kc=sumN(entriesOn(d)).kcal; if(kc<minK) continue; s+=budget(d)-kc; n++; }
  const rest=kDiff(kAdd(ws,6),k)+1; return {s:Math.round(s),n,rest,heute:Math.round(budget(k)+s/rest)}; }
/* „Was passt noch?“: aus dem, was oft gegessen wird (mind. 2×), die Portionen, die Rest-Kalorien und fehlendes Eiweiß am besten treffen */
function wasPasst(k){ const E=entriesOn(k), t=sumN(E), g=G(), R=budget(k)-t.kcal, P=Math.max(0,g.p-t.p); if(R<120) return null;
  const u=usage(), sLeft=sfaMax()-sfaOf(E).v, had=new Set(E.map(e=>e.ref)), C=[];
  Object.keys(u).forEach(ref=>{ const f=food(ref), x=u[ref]; if(!f||!f.je100||!(f.je100.kcal>0)||x.n<2||+f.je100.alk>0) return;
    let gr=+x.g>0?+x.g:defG(f), n=scale(f.je100,gr);
    if(n.kcal>R){ const fac=R/n.kcal; if(fac<0.5) return; gr=Math.max(5,Math.round(gr*fac/5)*5); n=scale(f.je100,gr); }   // etwas kleinere Portion, aber nicht weniger als die Hälfte
    if(!(n.kcal>=40)) return;
    const p=+n.p||0, s=n.sfa!=null?+n.sfa:0; let sc=Math.min(8,x.n)*0.4-(had.has(ref)?2:0);
    if(P>=10) sc+=Math.min(p,P)/P*10+Math.min(p/n.kcal*100,12)*0.5; else sc+=(+n.bal||0)*0.4-Math.abs(R-n.kcal)/R*3;
    if(sLeft<=0) sc-=s*1.5; else if(s>sLeft) sc-=s-sLeft;
    C.push({ref,g:gr,n,name:f.name,fl:isFl(f),sc}); });
  return {R:Math.round(R),P:Math.round(P),L:C.sort((a,b)=>b.sc-a.sc).slice(0,4)}; }
/* Bauchumfang (Sammlung „mass“, ein Wert je Tag) */
const bauch=()=>live('mass').filter(m=>+m.bauch>0).sort((a,b)=>a.datum.localeCompare(b.datum));
function bauchDelta(days){ const B=bauch(); if(B.length<2) return null; const last=B[B.length-1], from=kAdd(last.datum,-days), prev=B.filter(b=>b.datum<=from).pop()||B[0];
  return prev===last?null:{cm:r1(last.bauch-prev.bauch),tage:kDiff(last.datum,prev.datum),last}; }
/* Makro-Stile: Eiweiß in g je kg [Aufbau, Halten, Abnehmen], Fett als Anteil der Kalorien, Kohlenhydrate = Rest.
   Eiweiß nach ISSN-Positionspapier 2026 (1,2–1,6 g/kg allgemein · 1,6–2,2 mit Krafttraining · im Defizit bei Trainierten 1,9–3,2);
   Fett ~30 % der Energie, gesättigte Fettsäuren höchstens 10 %, Ballaststoffe mind. 30 g (DGE-Referenzwerte). */
const STIL={ausgewogen:{t:'Ausgewogen',d:'Eiweiß moderat, Fett 30 % – nah an den DGE-Richtwerten',p:[1.6,1.4,1.6],f:.30},
  kraft:{t:'Kraft & Muskeln',d:'Viel Eiweiß, Fett 25 %, der Rest Kohlenhydrate',p:[1.8,1.8,2.2],f:.25},
  ausdauer:{t:'Ausdauer',d:'Kohlenhydrate betont, Fett 22 %',p:[1.6,1.4,1.8],f:.22},
  lowcarb:{t:'Weniger Kohlenhydrate',d:'Fett 40 %, Eiweiß hoch',p:[1.8,1.6,2.0],f:.40}};
const stilK=()=>STIL[(D.set.makro||{}).stil]?D.set.makro.stil:'ausgewogen';
const pStd=()=>STIL[stilK()].p[{aufbau:0,halten:1,ab:2}[D.set.phase.art]??1];
function recommend(){ const t=tdee(), base=t.base; if(!base) return null; const ph=D.set.phase, delta=phDelta(ph.art,ph.tempo), kcal=Math.max(1000,Math.round((base+delta)/10)*10), kg=lastKg()||70;
  const s=STIL[stilK()], pk=+(D.set.makro||{}).pkg>0?+D.set.makro.pkg:pStd(), p=Math.round(kg*pk), f=Math.max(Math.round(kg*0.6),Math.round(kcal*s.f/9)), kh=Math.max(0,Math.round((kcal-p*4-f*9)/4));
  const need=base+t.sport, W=[], b=bmr();
  if(ph.art==='ab'){ if(-delta>need*0.25) W.push(`Das Defizit ist größer als ein Viertel deines Bedarfs – das kostet eher Muskeln und Durchhaltevermögen.`);
    if(+ph.tempo>kg*0.01) W.push('Mehr als 1 % des Körpergewichts pro Woche ist sehr zügig.');
    if(b&&kcal<b) W.push(`Das Ziel läge unter deinem Grundumsatz (${fmt(b)} kcal).`); }
  if(kh<50&&stilK()!=='lowcarb') W.push('Für Kohlenhydrate bleibt kaum etwas übrig – Tempo oder Eiweiß etwas senken.');
  return {base,src:t.src,kcal,p,f,kh,bal:30,sfa:Math.round(kcal*0.1/9),pk,fpc:Math.round(f*9/kcal*100),warn:W,delta,need:Math.round(need)}; }

/* ---------- Mikronährstoffe ----------
   Karte „Mikronährstoffe“: Ballaststoffe, Zucker, Salz und gesättigte Fettsäuren stehen immer da (Ø pro Tag).
   Vitamine und Mineralstoffe sind eingeklappt und erscheinen erst, wenn im Bezugszeitraum (Tag: die Woche bis zu diesem Tag,
   Verlauf: der gewählte Zeitraum) für mindestens 70 % der Kalorien Werte vorliegen – sonst wären die Summen viel zu niedrig. */
const MIKRO_MIN=0.7, SALZ_MAX=6;   // Salz: DGE-Orientierungswert höchstens 6 g am Tag
let mikAuf=(()=>{ try{ return localStorage.getItem('essen_mikro_auf')==='1'; }catch(e){ return false; } })();   // aufgeklappt? nur auf diesem Gerät
function refOf(k){ const m=MI[k], p=D.set.profil; if(k==='fe'&&p.sex==='w'&&+p.alter>=51) return 14; return p.sex==='m'?m[2]:p.sex==='w'?m[3]:Math.max(m[2],m[3]); }
function micDays(ks){ const o={}; let kcal=0; MX.forEach(k=>o[k]={v:0,kc:0});
  ks.forEach(k=>entriesOn(k).forEach(e=>{ const n=e.n||{}, kc=+n.kcal||0; kcal+=kc; MX.forEach(m=>{ if(n[m]!=null){ o[m].v+=+n[m]; o[m].kc+=kc; } }); }));
  return {o,kcal,n:ks.length}; }
/* Anteil der Kalorien mit Vitamin- und Mineralstoffwerten (Median über die 18 Werte); null = nichts eingetragen */
function mikCov(ks){ const M=micDays(ks); if(!M.kcal) return null; const c=MIK.map(k=>M.o[k].kc/M.kcal).sort((a,b)=>a-b); return c[Math.floor(c.length/2)]; }
const woche=k=>Array.from({length:7},(_,i)=>kAdd(k,i-6));
const FN={s:['S','Schätzwert'],d:['D','gilt ohne Eigenbildung über Sonnenlicht'],z:['Z','abhängig vom Phytat (Vollkorn, Hülsenfrüchte)']};
const CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
function microCard(ks,title,cap,bezug,bezugTxt){ const M=micDays(ks), n=Math.max(1,M.n), sex=D.set.profil.sex, g=G();
  if(!M.kcal) return `<div class="card s12"><h2>${title}</h2><div class="empty">Noch keine Einträge mit Kalorien.</div></div>`;
  /* immer sichtbar: Ballaststoffe, Zucker, Salz, gesättigte Fettsäuren */
  const E=ks.flatMap(k=>entriesOn(k)), t=sumN(E), sf=sfaOf(E), smax=sfaMax(), bal=t.bal/n, zu=t.zucker/n, sa=t.salz/n, sv=sf.cov>=.5?sf.v/n:null;
  const box=(l,v,ref,ton,em)=>`<div class="mba${ton?' '+ton:''}"><span>${l}</span><b>${v}${ref?` <small>${ref}</small>`:''}</b>${em?`<em>${em}</em>`:''}</div>`;
  const basis=`<div class="mbas">${box('Ballaststoffe',fmt(bal,1)+' g','/ '+fmt(g.bal)+' g',bal>=g.bal?'ok':'')}${box('Zucker',fmt(zu,1)+' g','','')}
    ${box('Salz',fmt(sa,1)+' g','/ max. '+SALZ_MAX+' g',sa>SALZ_MAX?'bad':'')}${box('Gesättigte Fette',sv!=null?fmt(sv,1)+' g':'–','/ max. '+fmt(smax)+' g',sv!=null&&sv>smax?'bad':'',sf.cov<.8&&sf.ft>0?`Wert für ${Math.round(sf.cov*100)} % des Fetts`:'')}</div>`;
  /* Vitamine und Mineralstoffe: nur bei genug Daten im Bezugszeitraum */
  const bz=bezug||ks, cov=mikCov(bz), genug=cov!=null&&cov>=MIKRO_MIN, bzT=bezugTxt||'im Zeitraum';
  const covs=MIK.map(k=>M.o[k].kc/M.kcal).sort((a,b)=>a-b), cm=covs[Math.floor(covs.length/2)];
  const row=k=>{ const m=MI[k], x=M.o[k], cv=x.kc/M.kcal, v=x.v/n, ref=refOf(k), pc=v/ref*100;
    return `<div class="mi${cv<.5?' low':''}"><span class="ml">${m[0]}${m[4]?`<sup title="${FN[m[4]][1]}">${FN[m[4]][0]}</sup>`:''}</span><span class="tr" role="img" aria-label="${Math.round(pc)} % der Referenz"><i style="width:${Math.min(100,pc)}%"></i></span>
      <span class="vl">${cv?fmt(v,v<10?1:0):'–'} <small>/ ${fmt(ref,1)} ${m[1]}</small></span><span class="cv">${Math.abs(cv-cm)<.1?'':cv?`Daten für ${Math.round(cv*100)} % der kcal`:'keine Daten'}</span></div>`; };
  const xv=k=>{ const x=M.o[k]; return x.kc/M.kcal>=.5?x.v/n:null; }, o3=xv('o3'), alk=xv('alk');
  const tog=`<button class="mtog" data-mikauf="1" aria-expanded="${mikAuf}"><span class="mt">Vitamine &amp; Mineralstoffe</span><span class="ms">${genug?`Daten für ${Math.round(cov*100)} % der kcal`:'zu wenig Daten'}</span>${CHEV}</button>`;
  const auf=!mikAuf?'':genug?`${cm<.95?`<div class="note">Für etwa ${Math.round(cm*100)} % deiner Kalorien liegen Vitamin- und Mineralstoffwerte vor – der Rest fehlt in den Summen, die echten Werte liegen also eher etwas höher.</div>`:''}
      <div class="mis">${MIK.map(row).join('')}</div>
      ${o3!=null||alk?`<div class="xs">${o3!=null?`<span>Omega-3 <b>${fmt(o3,1)} g</b></span>`:''}${alk?`<span>Alkohol <b>${fmt(alk,1)} g</b></span>`:''}</div>`:''}
      <p class="src">Balken = Anteil am Referenzwert (D-A-CH-Referenzwerte DGE/ÖGE/SGE, 3. Aufl. 2025, Erwachsene 25–65${sex?', '+(sex==='m'?'männlich':'weiblich'):' – Geschlecht im Profil wählen, bis dahin gilt jeweils der höhere Wert'}). Referenzwerte sind eine Orientierung für Gruppen, kein persönlicher Bedarf – ein einzelner Tag darunter heißt nicht Mangel.
        Fehlt ein Wert in den Daten, zählt er nicht als 0. ${Object.values(FN).map(f=>f[0]+' = '+f[1]).join(' · ')}.<br>Nährwerte: ${BLS_SRC}</p>`
    :`<div class="note">${cov==null?'Noch keine Einträge':`Nur für <b>${Math.round(cov*100)} %</b> deiner Kalorien ${bzT}`} liegen Vitamin- und Mineralstoffwerte vor. Sie erscheinen ab <b>70 %</b> – sonst wären die Summen viel zu niedrig und würden einen Mangel vortäuschen.
      Werte haben Lebensmittel aus der Grundliste und dem BLS; Schnell-Einträge, Foto-Schätzungen und Packungswerte meist nicht.</div>`;
  return `<div class="card s12 mikro"><h2>${title}<span class="cap">${cap}</span></h2>${basis}${tog}${auf}</div>`; }

/* ---------- Bausteine ---------- */
function ringSVG(v,max,px,col){ const p=max>0?Math.min(1,v/max):0, R=42, C=2*Math.PI*R;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--surface-3)" stroke-width="9"/><circle cx="50" cy="50" r="${R}" fill="none" stroke="${col||'var(--accent)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C*p).toFixed(1)} ${C.toFixed(1)}"/></svg>`; }
function mbar(k,v,goal){ const p=goal>0?Math.min(100,v/goal*100):0;
  return `<div class="mb"><span class="ml">${NL[k]}</span><span class="tr"><i style="width:${p}%;background:${NC[k]}"></i></span><span class="vl">${fmt(v)} <small>/ ${fmt(goal)} g</small></span></div>`; }
function sbar(sf,max){ const o=sf.v>max, p=max>0?Math.min(100,sf.v/max*100):0;
  return `<div class="mb sub"><span class="ml">davon gesättigt</span><span class="tr"><i style="width:${p}%;background:${o?'var(--bad-ink)':NC.f};opacity:${o?1:.55}"></i></span><span class="vl${o?' bad':''}">${fmt(sf.v,1)} <small>/ max. ${fmt(max)} g</small></span></div>${sf.cov<.8?`<div class="mbc">Gesättigte Fettsäuren sind nur für ${Math.round(sf.cov*100)} % des Fetts bekannt – der echte Wert liegt eher höher.</div>`:''}`; }
const sgn=(v,d=0)=>(v>0?'+':v<0?'−':'')+fmt(Math.abs(v),d);
const nLine=n=>[['p','P'],['kh','KH'],['f','F']].filter(([k])=>n[k]!=null).map(([k,l])=>`<i>${l} ${fmt(n[k],1)}</i>`).join('');


