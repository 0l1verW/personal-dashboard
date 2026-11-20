"use strict";
/* =====================================================================
   TRAINING – Krafttraining mit Satz- und Pausen-Timer, Vorlagen, Verlauf, Fortschritt
   Speicher: localStorage[KEY]. Sammlungen {id:{…,upd}} – auf dem Pi pro Eintrag zusammengeführt (Sync „liste“).
   Offline zuerst: jede Aktion wird sofort lokal gespeichert, der Pi gleicht später ab.
   Alle Zeiten sind Zeitstempel (ms) – der Timer stimmt auch nach dem Sperren des Handys.
   ===================================================================== */
const KEY='training_v1', APP='training';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const num=v=>{ if(v==null||v==='') return null; const x=parseFloat(String(v).replace(',','.')); return isNaN(x)?null:x; };
const rk=v=>Math.round((+v||0)*100)/100;
const fmt=(v,d=0)=>v==null||isNaN(v)?'–':(+v).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:d});
const fkg=v=>v==null?'–':fmt(v,2);
const WD=['So','Mo','Di','Mi','Do','Fr','Sa'], WDL=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'], MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const GRUPPEN=['Brust','Rücken','Schultern','Beine','Arme','Bauch','Ganzkörper','Sonstiges'];

/* ---------- Datum & Zeit ---------- */
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date());
const kDate=k=>new Date(k+'T00:00');
const kAdd=(k,n)=>{ const d=kDate(k); d.setDate(d.getDate()+n); return iso(d); };
const kDiff=(a,b)=>Math.round((kDate(a)-kDate(b))/864e5);
const weekStart=k=>kAdd(k,-((kDate(k).getDay()+6)%7));
const fClock=sec=>{ sec=Math.max(0,Math.floor(sec)); const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), s=sec%60; return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0'); };
const fDauer=ms=>{ const m=Math.max(0,Math.round(ms/6e4)), h=Math.floor(m/60); return h?`${h} h ${String(m%60).padStart(2,'0')} min`:`${m} min`; };
const fHM=ms=>{ const d=new Date(ms); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };
function fTag(k){ const d=kDate(k), t=today(); return k===t?'Heute':k===kAdd(t,-1)?'Gestern':WD[d.getDay()]+' '+d.getDate()+'.'+(d.getMonth()+1)+'.'+(d.getFullYear()!==new Date().getFullYear()?String(d.getFullYear()).slice(2):''); }

/* ---------- Startausstattung (feste Kennungen, upd:1 – zwei Geräte legen nichts doppelt an) ---------- */
const STARTUEB=[['u-bank','Bankdrücken','Brust'],['u-schraeg','Schrägbankdrücken (Kurzhantel)','Brust'],['u-schulter','Schulterdrücken','Schultern'],['u-seit','Seitheben','Schultern'],
  ['u-trizeps','Trizepsdrücken am Kabel','Arme'],['u-klimm','Klimmzüge','Rücken'],['u-rudern','Rudern (Langhantel)','Rücken'],['u-latzug','Latzug','Rücken'],['u-face','Face Pulls','Schultern'],
  ['u-bizeps','Bizepscurls','Arme'],['u-kniebeuge','Kniebeugen','Beine'],['u-rdl','Rumänisches Kreuzheben','Beine'],['u-beinpresse','Beinpresse','Beine'],['u-beinbeuger','Beinbeuger','Beine'],
  ['u-waden','Wadenheben','Beine'],['u-plank','Plank','Bauch']];
const STARTVOR=[['v-push','Push',['u-bank','u-schraeg','u-schulter','u-seit','u-trizeps']],['v-pull','Pull',['u-klimm','u-rudern','u-latzug','u-face','u-bizeps']],
  ['v-beine','Beine',['u-kniebeuge','u-rdl','u-beinpresse','u-beinbeuger','u-waden']]];

/* ---------- Zustand ---------- */
const DEFSET=()=>({upd:0,wochenziel:3,schritt:2.5});   // wochenziel: Trainings pro Woche (Ring auf der Kachel) · schritt: kg je ±-Tipp
let D, view='start', tId=null, progU=null, sheet=null, noteOpen={};
function normalize(x){
  x=x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  ['uebungen','vorlagen','trainings'].forEach(c=>{ if(!x[c]||typeof x[c]!=='object'||Array.isArray(x[c])) x[c]={}; });
  if(!Object.keys(x.uebungen).length&&!Object.keys(x.vorlagen).length){   // erster Start: Startausstattung
    STARTUEB.forEach(([id,name,gruppe])=>x.uebungen[id]={id,name,gruppe,upd:1});
    STARTVOR.forEach(([id,name,u],i)=>x.vorlagen[id]={id,name,uebungen:u.slice(),ord:i,upd:1}); }
  const d=DEFSET(); x.set=x.set&&typeof x.set==='object'&&!Array.isArray(x.set)?x.set:d;
  Object.keys(d).forEach(k=>{ if(x.set[k]==null) x.set[k]=d[k]; });
  Object.values(x.trainings).forEach(trN);
  x.app=APP; x.v=1; x.savedAt=+x.savedAt||0; return x; }
function trN(t){ if(!t||t.del) return t;   // Training: fehlende Felder mit Standardwert (keine Daten gehen verloren)
  if(!Array.isArray(t.saetze)) t.saetze=[]; if(!Array.isArray(t.reihe)) t.reihe=[]; if(!t.uebNotiz||typeof t.uebNotiz!=='object') t.uebNotiz={};
  if(!t.namen||typeof t.namen!=='object') t.namen={}; if(t.notiz==null) t.notiz=''; if(!t.name) t.name='Training';
  t.saetze.forEach(s=>{ if(s.uebung&&!t.reihe.includes(s.uebung)) t.reihe.push(s.uebung); });
  return t; }
function load(){ let x=null; try{ x=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){} D=normalize(x); }
let sumT=null;
function save(){ D.savedAt=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){ toast('Speichern im Browser nicht möglich'); }
  clearTimeout(sumT); sumT=setTimeout(pushSum,1200); stamp(); }
const live=c=>Object.values(D[c]).filter(x=>x&&!x.del);
function put(c,it){ it.upd=Date.now(); D[c][it.id]=it; return it; }
function rm(c,id){ const o=D[c][id]; if(o) D[c][id]=c==='uebungen'?{...o,del:true,upd:Date.now()}:{id,upd:Date.now(),del:true}; }   // Übungen behalten ihren Namen (für den Verlauf)
function setS(fn){ fn(D.set); D.set.upd=Date.now(); save(); }

/* ---------- Übungen & Vorlagen ---------- */
const UE=id=>{ const u=D.uebungen[id]; return u&&!u.del?u:null; };
function uName(id,t){ const u=D.uebungen[id]; return (u&&u.name)||(t&&t.namen&&t.namen[id])||'Übung'; }
const uebungen=()=>live('uebungen').sort((a,b)=>a.name.localeCompare(b.name,'de'));
const vorlagen=()=>live('vorlagen').sort((a,b)=>(a.ord??99)-(b.ord??99)||a.name.localeCompare(b.name,'de'));
const norm=s=>String(s||'').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');

/* ---------- Trainings ---------- */
const trainings=()=>live('trainings').map(trN).sort((a,b)=>b.start-a.start);
const laufend=()=>trainings().find(t=>!t.ende)||null;
const satzVon=(t,u)=>t.saetze.filter(s=>s.uebung===u);
/* letztes anderes Training mit dieser Übung (vor `vor`) */
function vorher(u,vor,ohne){ for(const t of trainings()){ if(t.id===ohne||!(t.start<vor)) continue; const S=satzVon(t,u); if(S.length) return {t,S}; } return null; }
/* Vorschlag für den nächsten Satz: der vorige Satz dieses Trainings, sonst der gleiche Satz vom letzten Mal */
function vorschlag(t,u){ const S=satzVon(t,u); if(S.length){ const s=S[S.length-1]; return {kg:s.kg,wdh:s.wdh}; }
  const p=vorher(u,t.start,t.id); if(p){ const s=p.S[0]; return {kg:s.kg,wdh:s.wdh}; } return {kg:null,wdh:null}; }
const satzTxt=s=>(s.kg>0?fkg(s.kg)+' × ':'')+(s.wdh??'–')+(s.kg>0?'':' Wdh.');
const satzListe=S=>S.map(satzTxt).join(' · ');
/* geschätztes Maximalgewicht (1RM) nach Epley; bei 1 Wiederholung das Gewicht selbst */
const e1=s=>!(s.kg>0)||!(s.wdh>0)?0:s.wdh===1?+s.kg:+s.kg*(1+s.wdh/30);
const vol=S=>S.reduce((a,s)=>a+(s.kg>0&&s.wdh>0?s.kg*s.wdh:0),0);
/* Bestwerte: welche Sätze eines Trainings sind neu (schwerer als alles davor bzw. höheres 1RM)? Nur, wenn es die Übung vorher schon gab. */
function prOf(t){ const out={}, base={};
  trainings().forEach(o=>{ if(o.id===t.id||!(o.start<t.start)) return; o.saetze.forEach(s=>{ if(!(s.kg>0&&s.wdh>0)) return; const b=base[s.uebung]=base[s.uebung]||{kg:0,e1:0,n:0}; b.kg=Math.max(b.kg,+s.kg); b.e1=Math.max(b.e1,e1(s)); b.n++; }); });
  t.saetze.forEach((s,i)=>{ if(!(s.kg>0&&s.wdh>0)) return; const b=base[s.uebung]=base[s.uebung]||{kg:0,e1:0,n:0};
    if(b.n){ if(+s.kg>b.kg+1e-9) out[i]='kg'; else if(e1(s)>b.e1+0.05) out[i]='e1'; }
    b.kg=Math.max(b.kg,+s.kg); b.e1=Math.max(b.e1,e1(s)); b.n++; });
  return out; }
/* Verlauf je Übung (älteste zuerst) */
function verlaufU(u){ return trainings().slice().reverse().map(t=>{ const S=satzVon(t,u); if(!S.length) return null;
  const W=S.filter(s=>s.kg>0&&s.wdh>0); return {t,S,top:W.length?Math.max(...W.map(s=>+s.kg)):0,e1:W.length?Math.max(...W.map(e1)):0,vol:vol(S),wdh:S.reduce((a,s)=>a+(+s.wdh||0),0)}; }).filter(Boolean); }
const dauer=t=>(t.ende||Date.now())-t.start;
const wocheN=()=>{ const ws=weekStart(today()); return trainings().filter(t=>t.datum>=ws&&(t.saetze.length||!t.ende)).length; };

/* ---------- Timer: Satz starten → Satzzeit → fertig → kg/Wdh → Pause läuft bis zum nächsten Satz ----------
   lauf = {phase: null|'satz'|'eingabe'|'pause', seit: ms, uebung, satzSek?, pauseSeit?}
   Die Pause zählt ab „fertig“ (das Eintragen gehört schon zur Pause) und wird beim nächsten Satz am vorigen Satz gespeichert. */
function neuesTraining(vid){ const v=vid?D.vorlagen[vid]:null, now=Date.now();
  const reihe=v&&!v.del?(v.uebungen||[]).filter(id=>UE(id)):[], namen={}; reihe.forEach(id=>namen[id]=uName(id));
  const t=put('trainings',{id:uid('t'),datum:today(),start:now,ende:null,name:v&&!v.del?v.name:'Training',vorlage:v&&!v.del?v.id:null,notiz:'',uebNotiz:{},reihe,namen,saetze:[],lauf:{phase:null,seit:now,uebung:reihe[0]||null}});
  save(); return t; }
function letzterSatz(t){ return t.saetze.length?t.saetze[t.saetze.length-1]:null; }
function satzStart(t,u){ const now=Date.now(), L=t.lauf||{};
  if(L.phase==='pause'){ const s=letzterSatz(t); if(s) s.pauseSek=Math.round((now-L.seit)/1000); }
  t.lauf={phase:'satz',seit:now,uebung:u,pauseSeit:L.phase==='pause'?L.seit:null}; put('trainings',t); save(); }
function satzFertig(t){ const now=Date.now(), L=t.lauf; if(!L||L.phase!=='satz') return;
  t.lauf={phase:'eingabe',seit:now,uebung:L.uebung,satzSek:Math.round((now-L.seit)/1000)}; put('trainings',t); save(); }
function satzAbbrechen(t){ const L=t.lauf; if(!L) return; const s=letzterSatz(t);
  if(L.pauseSeit&&s) s.pauseSek=null;
  t.lauf=L.pauseSeit?{phase:'pause',seit:L.pauseSeit,uebung:L.uebung}:{phase:null,seit:Date.now(),uebung:L.uebung}; put('trainings',t); save(); }
/* Satz speichern – mit Timer (aus „eingabe“) oder ohne (direkt eingetragen). Gibt den Index des Satzes zurück. */
function satzSpeichern(t,u,kg,wdh,notiz){ const L=t.lauf||{}, now=Date.now(), mitTimer=L.phase==='eingabe'&&L.uebung===u;
  if(!mitTimer&&L.phase==='pause'){ const s=letzterSatz(t); if(s&&s.pauseSek==null) s.pauseSek=null; }
  const s={uebung:u,nr:satzVon(t,u).length+1,kg:kg==null?0:rk(kg),wdh:wdh==null?null:Math.round(wdh),satzSek:mitTimer?L.satzSek:null,pauseSek:null,t:now};
  if(notiz) s.notiz=notiz;
  t.saetze.push(s); if(!t.reihe.includes(u)) t.reihe.push(u); t.namen[u]=uName(u,t);
  if(!t.ende) t.lauf={phase:'pause',seit:mitTimer?L.seit:now,uebung:u};
  put('trainings',t); save(); return t.saetze.length-1; }
function renum(t,u){ let n=0; t.saetze.forEach(s=>{ if(s.uebung===u) s.nr=++n; }); }
function beenden(t){ const now=Date.now(); t.ende=now; t.lauf=null; if(!t.saetze.length){ rm('trainings',t.id); save(); return false; } put('trainings',t); save(); return true; }

/* ---------- Dashboard-Kachel (Vorschau-Vertrag v1) ---------- */
function kachel(){ const T=trainings(), run=T.find(t=>!t.ende), last=T.find(t=>t.ende&&t.saetze.length), n=wocheN(), ziel=+D.set.wochenziel||0;
  const nx=kDate(kAdd(weekStart(today()),7)).getTime(), Z=[];
  if(run) Z.push({t:'Läuft: '+run.name,sub:'seit '+fHM(run.start)+' · '+run.saetze.length+' Sätze'});
  T.filter(t=>t.ende&&t.saetze.length).slice(0,run?2:3).forEach((t,i)=>Z.push({t:(i||run?'':'Zuletzt: ')+t.name,sub:fTag(t.datum)+' · '+fDauer(dauer(t))+' · '+t.saetze.length+' Sätze'}));
  const L=run?[{l:'Weiter',hash:'#laeuft',titel:'Zum laufenden Training'}]:vorlagen().slice(0,4).map(v=>({l:v.name,hash:'#start='+v.id,titel:'Training „'+v.name+'“ starten'}));
  return {v:1,savedAt:Date.now(),bis:nx,zahl:{wert:n,einheit:n===1?'Training':'Trainings',label:'diese Woche'+(ziel?' · Ziel '+ziel:'')},
    ...(ziel?{ring:{wert:n,von:ziel,label:'Woche'}}:{}),zeilen:Z,links:L,leer:last?'Diese Woche noch kein Training':'Noch kein Training eingetragen'}; }
function pushSum(){ if(!window.__PI_SYNC) return; try{ fetch('/api/sum_training',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(kachel())}).catch(()=>{}); }catch(e){} }
window.__dashSum=()=>kachel();
