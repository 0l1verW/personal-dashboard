"use strict";
/* =====================================================================
   AUFGABEN 2 – gemeinsame Aufgaben der Familie
   Hauptansicht „Anstehend“: alles Offene als Zeitleiste (Überfällig → Heute → Woche → Später).
   Speicher: localStorage[KEY] = {tasks,lists,log,set}. Sammlungen {id:{…,upd}} führt der Pi pro
   Eintrag zusammen (Sync „liste“). Rechte kommen vom Pi (window.__PI_ROLE): Tool sehen/bearbeiten,
   Sicht eigene/alle, Admin. Der Pi setzt sie auch selbst durch.
   ===================================================================== */
const KEY='aufgaben_v1', APP='aufgaben';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const num=v=>{ if(v==null||v==='') return null; const x=parseFloat(String(v).replace(',','.')); return isNaN(x)?null:x; };
const WD=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'], WK=['So','Mo','Di','Mi','Do','Fr','Sa'];
const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const AUFW=[5,15,30,60,120];
const PRIO=['Normal','Wichtig','Sehr wichtig','Dringend'], pr=t=>Math.max(0,Math.min(3,+(t&&t.prio)||0));
const STAT={neu:'Wunsch',offen:'offen',arbeit:'in Arbeit',erledigt:'erledigt',abgelehnt:'abgelehnt'};
const LCOL=['#E0673A','#2C7BD6','#16A85A','#B4567F','#D99318','#6B7FD7','#2E9BB5','#7D8597'];
const CHK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

/* ---------- Datum ---------- */
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date());
const kDate=k=>new Date(k+'T00:00');
const kAdd=(k,n)=>{ const d=kDate(k); d.setDate(d.getDate()+n); return iso(d); };
const kDiff=(a,b)=>Math.round((kDate(a)-kDate(b))/864e5);
const kMon=(k,n)=>{ const d=kDate(k), day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,last)); return iso(d); };
const wd=k=>kDate(k).getDay();
function fDue(k,z){ const t=today(), d=kDiff(k,t), dt=kDate(k);
  const s=d===0?'heute':d===1?'morgen':d===-1?'gestern':d>1&&d<7?WD[dt.getDay()]:d<0?`seit ${-d} Tagen`:`${WK[dt.getDay()]} ${dt.getDate()}.${dt.getMonth()+1}.`+(dt.getFullYear()!==new Date().getFullYear()?dt.getFullYear():'');
  return s+(z?' '+z:''); }
const fDay=k=>{ const dt=kDate(k); return `${WD[dt.getDay()]}, ${dt.getDate()}. ${MON[dt.getMonth()]}`; };
const fTs=ts=>{ const d=new Date(ts), k=iso(d), t=today(); return (k===t?'heute':k===kAdd(t,-1)?'gestern':d.getDate()+'.'+(d.getMonth()+1)+'.')+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); };
const nextSat=()=>{ let k=today(); for(let i=0;i<7&&wd(k)!==6;i++) k=kAdd(k,1); return k; };
const nextMon=()=>{ let k=kAdd(today(),1); for(let i=0;i<7&&wd(k)!==1;i++) k=kAdd(k,1); return k; };

/* ---------- Personen & Rechte (vom Pi) ---------- */
const DEFP=[{id:'alex',name:'Alex',kz:'alex',farbe:'#5B4BE0',owner:true},{id:'sam',name:'Sam',kz:'sam',farbe:'#E0673A'},{id:'kim',name:'Kim',kz:'kim',farbe:'#2C7BD6'},{id:'robin',name:'Robin',kz:'robin',farbe:'#16A85A'}];
const ROLE=window.__PI_ROLE||null;
let PL=DEFP.slice(), me=null;
try{ const c=JSON.parse(localStorage.getItem('pd_personen')||'null'); if(c&&c.length) PL=c; me=localStorage.getItem('pd_person')||null; }catch(e){}
if(ROLE) me=ROLE.pid||null;
const person=id=>PL.find(p=>p.id===id)||(id?{id,name:id,farbe:'#7D8597'}:null);
const owner=()=>PL.find(p=>p.owner)||PL[0];
const isAdmin=()=>!ROLE||!!ROLE.admin;
const canEdit=()=>!ROLE||(ROLE.tools&&ROLE.tools[APP]==='edit');
const seesAll=()=>!ROLE||ROLE.sicht==='alle';
const admins=()=>ROLE?(ROLE.admins||[]):[owner().id];
const mayEdit=t=>canEdit()&&(isAdmin()||!t||t.von===me||t.erstVon===me);   // Felder ändern, löschen
const canTick=t=>canEdit()&&t.status!=='neu'&&t.status!=='abgelehnt';      // abhaken, Checkliste, Status
const pName=id=>{ const p=person(id); return p?p.name:'–'; };
const av=(id,cls)=>{ const p=person(id); return p?`<span class="av${cls?' '+cls:''}" style="background:${esc(p.farbe||'#7D8597')}" title="${esc(p.name)}" aria-hidden="true">${esc((p.name||'?').charAt(0).toUpperCase())}</span>`:''; };
/* Privat: Aufgabe sieht nur die Person, die sie für sich selbst eingetragen hat – auch kein Admin. Geht nur, wenn sie für sie
   selbst ist und nicht abwechselnd mit anderen. Der Pi filtert (server.py hidden()); hier nur Anzeige und Standardwert. */
const privOk=t=>!!t&&!!t.von&&(!t.fuer||t.fuer===t.von)&&!(((t.wdh||{}).rot)||[]).some(p=>p!==t.von);
const isPriv=t=>!!(t&&t.privat)&&privOk(t);
function loadPersons(){ if(location.protocol==='file:') return;
  fetch('/api/personen').then(r=>r.ok?r.json():null).then(x=>{ if(x&&x.list&&x.list.length){ PL=x.list; try{ localStorage.setItem('pd_personen',JSON.stringify(PL)); }catch(_){} render(); } }).catch(()=>{}); }

/* ---------- Zustand ---------- */
const DEFSET=()=>({upd:0,dring:2});
let D, view='anstehend', sheet=null, qa='', wen='me', curList=null, doneN=60, laterAll=false, newsOpen=false;
function normalize(x){
  x=x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  ['tasks','lists','log'].forEach(c=>{ if(!x[c]||typeof x[c]!=='object'||Array.isArray(x[c])) x[c]={}; });
  const d=DEFSET(); x.set=x.set&&typeof x.set==='object'?x.set:d; Object.keys(d).forEach(k=>{ if(x.set[k]==null) x.set[k]=d[k]; });
  x.app=APP; x.v=1; x.savedAt=+x.savedAt||0; return x; }
function load(){ let x=null; try{ x=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){} D=normalize(x);
  if(!Object.keys(D.lists).length&&isAdmin()){ [['haushalt','Haushalt'],['privat','Privat'],['uni','Uni'],['einkauf','Einkauf']].forEach(([id,name],i)=>put('lists',{id:'l-'+id,name,farbe:LCOL[i]})); } }
let sumT=null, icsT=null;
function save(){ if(!canEdit()) return; D.savedAt=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){ toast('Speichern im Browser nicht möglich'); }
  clearTimeout(sumT); sumT=setTimeout(pushSum,1200); clearTimeout(icsT); icsT=setTimeout(pushIcs,3000); stamp(); }
const live=c=>Object.values(D[c]).filter(x=>x&&!x.del);
function put(c,it){ it.upd=Date.now(); D[c][it.id]=it; return it; }
function rm(c,id){ if(D[c][id]) D[c][id]={id,upd:Date.now(),del:true}; }
function note(task,t,sys){ put('log',{id:uid('g'),task,wer:me,ts:Date.now(),t,sys:!!sys}); }
const logOf=id=>live('log').filter(g=>g.task===id).sort((a,b)=>a.ts-b.ts);
const lists=()=>live('lists').sort((a,b)=>a.name.localeCompare(b.name,'de'));
const list=id=>id&&D.lists[id]&&!D.lists[id].del?D.lists[id]:null;

/* ---------- Gesehen (pro Gerät und Person) ---------- */
let SEEN={};
function seenLoad(){ try{ SEEN=JSON.parse(localStorage.getItem('aufg_seen_'+me)||'null'); }catch(e){ SEEN=null; } if(!SEEN){ SEEN={_0:Date.now()}; seenSave(); } }
function seenSave(){ try{ localStorage.setItem('aufg_seen_'+me,JSON.stringify(SEEN)); }catch(e){} }
function markSeen(id){ SEEN[id]=Date.now(); seenSave(); }
function isNewFor(t){ if(!me||(t.von!==me&&t.fuer!==me)) return false; const s=SEEN[t.id]||SEEN._0||0;
  return logOf(t.id).some(g=>g.wer!==me&&g.ts>s); }

/* ---------- Aufgaben-Logik ---------- */
const open=t=>t.status==='offen'||t.status==='arbeit';
const tasks=()=>live('tasks');
const wishesForMe=()=>tasks().filter(t=>t.status==='neu'&&t.fuer===me);
const newsForMe=()=>tasks().filter(t=>t.status!=='neu'&&isNewFor(t));
function inFilter(t){ if(wen==='alle') return true; if(wen==='me') return t.fuer===me; if(wen==='von') return t.von===me&&t.fuer!==me; return t.fuer===wen; }
const isOver=t=>open(t)&&t.due&&(t.due<today()||(t.due===today()&&t.zeit&&t.zeit<new Date().toTimeString().slice(0,5)));
function sortT(a,b){ return (a.due||'9999').localeCompare(b.due||'9999')||pr(b)-pr(a)||(a.zeit||'99').localeCompare(b.zeit||'99')||a.erst-b.erst; }
function nextDue(t){ const w=t.wdh; if(!w) return null; const n=Math.max(1,+w.n||1), td=today();
  let base=w.basis==='erledigt'||!t.due?td:t.due;
  const step=k=>{ if(w.typ==='tag') return kAdd(k,n); if(w.typ==='monat') return kMon(k,n); if(w.typ==='jahr') return kMon(k,12*n);
    if(w.typ==='woche'){ if(w.tage&&w.tage.length){ let x=kAdd(k,1); for(let i=0;i<8;i++){ if(w.tage.includes(wd(x))) return x; x=kAdd(x,1); } return x; } return kAdd(k,7*n); } return kAdd(k,1); };
  let k=step(base); for(let i=0;i<500&&k<=td&&w.basis!=='erledigt';i++){ if(k===td&&base!==td) break; k=step(k); }
  return k; }
function firstDue(w){ const td=today(); if(w.typ==='woche'&&w.tage&&w.tage.length){ let x=td; for(let i=0;i<8;i++){ if(w.tage.includes(wd(x))) return x; x=kAdd(x,1); } } return td; }
function wdhText(w){ if(!w) return ''; const n=+w.n||1;
  if(w.typ==='woche'&&w.tage&&w.tage.length) return w.tage.length===5&&[1,2,3,4,5].every(x=>w.tage.includes(x))?'werktags':'jeden '+w.tage.slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(x=>WK[x]).join(', ');
  const u={tag:['täglich','Tage'],woche:['wöchentlich','Wochen'],monat:['monatlich','Monate'],jahr:['jährlich','Jahre']}[w.typ]||['',''];
  return (n===1?u[0]:`alle ${n} ${u[1]}`)+(w.basis==='erledigt'?' (ab Erledigung)':'')+(w.rot&&w.rot.length>1?' · abwechselnd':''); }
function complete(t){ const was=JSON.parse(JSON.stringify(t)); let nx=null;
  t.status='erledigt'; t.erledigtVon=me; t.erledigtAm=Date.now(); put('tasks',t); note(t.id,'hat erledigt',true);
  if(t.wdh){ const k=nextDue(t), rot=t.wdh.rot||[], i=rot.indexOf(t.fuer);
    nx=put('tasks',{...JSON.parse(JSON.stringify(t)),id:uid('t'),status:'offen',due:k,erledigtVon:null,erledigtAm:null,erst:Date.now(),
      fuer:rot.length>1?rot[(i+1)%rot.length]:t.fuer,check:(t.check||[]).map(c=>({...c,ok:false}))}); }
  save(); render();
  toast(t.wdh?`Erledigt – nächstes Mal ${fDue(nx.due)}${nx.fuer!==t.fuer?' ('+pName(nx.fuer)+')':''}`:'Erledigt',()=>{ D.tasks[t.id]=was; put('tasks',D.tasks[t.id]); if(nx) rm('tasks',nx.id); note(t.id,'hat wieder geöffnet',true); save(); render(); }); }
function reopen(t){ t.status='offen'; t.erledigtVon=null; t.erledigtAm=null; put('tasks',t); note(t.id,'hat wieder geöffnet',true); save(); render(); }

/* ---------- Schnelleingabe (Deutsch) ---------- */
const WDN={montag:1,dienstag:2,mittwoch:3,donnerstag:4,freitag:5,samstag:6,sonntag:0,mo:1,di:2,mi:3,do:4,fr:5,sa:6,so:0};
const WRE='montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so';
function nextWd(n,strict){ let k=today(); if(strict) k=kAdd(k,1); for(let i=0;i<8;i++){ if(wd(k)===n) return k; k=kAdd(k,1); } return k; }
function parse(raw){ let s=' '+raw.replace(/\s+/g,' ')+' '; const r={};
  const take=(re,fn)=>{ s=s.replace(re,(...m)=>{ const v=fn(...m); return v===false?m[0]:' '; }); };
  take(/\s(täglich|jeden tag)(?=\s)/i,()=>{ r.wdh={typ:'tag',n:1}; });
  take(/\s(werktags)(?=\s)/i,()=>{ r.wdh={typ:'woche',n:1,tage:[1,2,3,4,5]}; });
  take(/\s(wöchentlich|jede woche)(?=\s)/i,()=>{ r.wdh={typ:'woche',n:1}; });
  take(/\s(monatlich|jeden monat)(?=\s)/i,()=>{ r.wdh={typ:'monat',n:1}; });
  take(/\s(jährlich|jedes jahr)(?=\s)/i,()=>{ r.wdh={typ:'jahr',n:1}; });
  take(new RegExp(`\\sjede[nm]?\\s+((?:${WRE})\\.?(?:\\s*(?:,|und|\\+)\\s*(?:${WRE})\\.?)*)(?=\\s)`,'i'),(m,a)=>{ const t=a.toLowerCase().split(/\s*(?:,|und|\+)\s*/).map(x=>WDN[x.replace('.','')]).filter(x=>x!=null); if(!t.length) return false; r.wdh={typ:'woche',n:1,tage:[...new Set(t)]}; });
  take(/\salle\s+(\d{1,3})\s+(tage?n?|wochen?|monate?n?|jahre?n?)(?=\s)/i,(m,n,u)=>{ u=u.toLowerCase(); r.wdh={typ:u.startsWith('tag')?'tag':u.startsWith('woch')?'woche':u.startsWith('mon')?'monat':'jahr',n:+n}; });
  take(/\s(ab erledigung|nach erledigung)(?=\s)/i,()=>{ if(r.wdh) r.wdh.basis='erledigt'; else return false; });
  const art=p=>{ if(p&&/^am/i.test(p)) r.art='am'; };
  take(/\s(am\s+|bis\s+)?(heute)(?=\s)/i,(m,p)=>{ r.due=today(); art(p); });
  take(/\s(gestern)(?=\s)/i,()=>{ r.due=kAdd(today(),-1); });
  take(/\s(am\s+|bis\s+)?(übermorgen)(?=\s)/i,(m,p)=>{ r.due=kAdd(today(),2); art(p); });
  take(/\s(am\s+|bis\s+)?(morgen)(?=\s)/i,(m,p)=>{ r.due=kAdd(today(),1); art(p); });
  take(/\s(nächste woche|naechste woche)(?=\s)/i,()=>{ r.due=nextMon(); });
  take(/\s(am wochenende|wochenende)(?=\s)/i,()=>{ r.due=nextSat(); });
  take(/\s(am\s+|bis\s+)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(?=\s)/,(m,p,d,mo,y)=>{ const yy=y?(+y<100?2000+ +y:+y):new Date().getFullYear(); const dt=new Date(yy,+mo-1,+d); if(dt.getDate()!==+d) return false;
    let k=iso(dt); if(!y&&k<today()) k=iso(new Date(yy+1,+mo-1,+d)); r.due=k; art(p); });
  take(/\sin\s+(\d{1,3})\s+(tagen|tag|wochen|woche|monaten|monat)(?=\s)/i,(m,n,u)=>{ u=u.toLowerCase(); r.due=u.startsWith('tag')?kAdd(today(),+n):u.startsWith('woch')?kAdd(today(),7*n):kMon(today(),+n); });
  take(new RegExp(`\\s(am\\s+|bis\\s+|nächsten\\s+|naechsten\\s+)?(${WRE})\\.?(?=\\s)`,'i'),(m,p,w)=>{ w=w.toLowerCase(); if(r.due) return false; if(w==='so'&&!p) return false; r.due=nextWd(WDN[w],!!(p&&/^n/i.test(p))); art(p); });
  take(/\s(?:um\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s*uhr)?(?=\s)/i,(m,h,mi)=>{ r.zeit=String(h).padStart(2,'0')+':'+mi; });
  take(/\s(?:um\s+)?([01]?\d|2[0-3])\s*uhr(?=\s)/i,(m,h)=>{ r.zeit=String(h).padStart(2,'0')+':00'; });
  take(/\s(!{1,3})(?=\s)/,(m,x)=>{ r.prio=x.length; });
  take(/\s#([\wäöüß-]{1,30})(?=\s)/i,(m,x)=>{ const n=x.toLowerCase(), l=lists().find(l=>l.name.toLowerCase()===n)||lists().find(l=>l.name.toLowerCase().startsWith(n)); r.liste=l?l.id:null; r.neueListe=l?null:x; });
  take(/\s@([\wäöüß-]{1,30})(?=\s)/i,(m,x)=>{ const n=x.toLowerCase(), p=PL.find(p=>(p.kz||'').toLowerCase()===n||p.name.toLowerCase()===n)||PL.find(p=>p.name.toLowerCase().startsWith(n)||(p.kz||'').startsWith(n)); if(!p) return false; r.fuer=p.id; });
  take(/\s(?:für|fuer)\s+([\wäöüß-]{2,30})(?=\s)/i,(m,x)=>{ const n=x.toLowerCase(), p=PL.find(p=>p.name.toLowerCase()===n||(p.kz||'').toLowerCase()===n); if(!p) return false; r.fuer=p.id; });
  take(/\s~\s?(\d{1,3})\s*(min|m|h|std)?(?=\s)/i,(m,n,u)=>{ let v=+n*(u&&/^(h|std)/i.test(u)?60:1); r.aufwand=AUFW.find(a=>a>=v)||120; });
  if(r.wdh&&!r.due) r.due=firstDue(r.wdh);
  r.titel=s.replace(/\s+/g,' ').trim(); return r; }
function chips(r){ const c=[];
  if(r.due) c.push(`<span class="pc">${r.art==='am'?'am':'bis'} ${esc(fDue(r.due,r.zeit))}</span>`); else if(r.zeit) c.push(`<span class="pc">${esc(r.zeit)}</span>`);
  if(r.wdh) c.push(`<span class="pc">↻ ${esc(wdhText(r.wdh))}</span>`);
  if(r.prio) c.push(`<span class="pc pr${pr(r)}">${PRIO[pr(r)].toLowerCase()}</span>`);
  if(r.liste) c.push(`<span class="pc">${esc(list(r.liste).name)}</span>`); else if(r.neueListe) c.push(`<span class="pc">neue Liste „${esc(r.neueListe)}“</span>`);
  if(r.fuer) c.push(`<span class="pc">für ${esc(pName(r.fuer))}${wishRule(r.fuer)?' (als Wunsch)':''}</span>`);
  return c.join(''); }
/* Wunsch: wer kein Admin ist und etwas für einen Admin einträgt, schickt es als Wunsch – der Admin nimmt an oder lehnt ab. */
const wishRule=fuer=>!isAdmin()&&fuer&&fuer!==me&&admins().includes(fuer);
function newTask(r){ const fuer=r.fuer||(wen!=='me'&&wen!=='alle'&&wen!=='von'&&seesAll()?wen:me);
  if(r.neueListe){ const l=put('lists',{id:uid('l'),name:r.neueListe.charAt(0).toUpperCase()+r.neueListe.slice(1),farbe:LCOL[lists().length%LCOL.length]}); r.liste=l.id; }
  const t={id:uid('t'),titel:r.titel||'',notiz:r.notiz||'',von:me,fuer,due:r.due||null,zeit:r.zeit||null,art:r.art||'bis',prio:r.prio||0,liste:r.liste||(view==='listen'&&curList&&curList!=='-'?curList:null),aufwand:r.aufwand||null,
    wdh:r.wdh||null,check:r.check||[],status:wishRule(fuer)?'neu':'offen',erst:Date.now(),erstVon:me};
  t.privat=privOk(t);   // für sich selbst eingetragen → standardmäßig privat (Entscheidung Grill-Runde, Abschnitt 5)
  return t; }
