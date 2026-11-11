"use strict";
/* =====================================================================
   HAUSHALTSBUCH – Ausgaben in Sekunden erfassen, Monat im Blick, Verhalten auswerten.
   Konzepte: Fix/variabel getrennt · Umschläge (Budget je Kategorie) · 50/30/20 als Kompass ·
   „erst sparen“ (Sparziel wird reserviert) · jeder Euro hat eine Aufgabe (noch zu verteilen).
   Speicher: localStorage[KEY]. Sammlungen sind {id:{…,upd}} – auf dem Pi führt der Server sie
   pro Eintrag zusammen (Sync-Modus „liste“).
   ===================================================================== */
const KEY='haushalt_v1', APP='haushalt';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const num=v=>{ if(v==null||v==='') return null; const x=parseFloat(String(v).replace(/\s|€/g,'').replace(',','.')); return isNaN(x)?null:x; };
const r2=v=>Math.round((+v||0)*100)/100;
const e0=v=>(Math.round(+v||0)).toLocaleString('de-DE')+' €';
const e2=v=>(+v||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const dz=v=>String(v??'').replace('.',',');
const WD=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'], MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

/* ---------- Datum ---------- */
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date());
const kDate=k=>new Date(k+'T00:00');
const kAdd=(k,n)=>{ const d=kDate(k); d.setDate(d.getDate()+n); return iso(d); };
const kDiff=(a,b)=>Math.round((kDate(a)-kDate(b))/864e5);
const ym=k=>k.slice(0,7);
const mIdx=m=>+m.slice(0,4)*12+ +m.slice(5,7)-1;
const mOf=i=>`${Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`;
const mAdd=(m,n)=>mOf(mIdx(m)+n);
const daysIn=m=>new Date(+m.slice(0,4),+m.slice(5,7),0).getDate();
const mName=m=>MON[+m.slice(5,7)-1]+(m.slice(0,4)!==today().slice(0,4)?' '+m.slice(0,4):'');
function fDay(k){ const t=today(), d=kDate(k); return (k===t?'Heute · ':k===kAdd(t,-1)?'Gestern · ':'')+WD[d.getDay()]+', '+d.getDate()+'. '+MON[d.getMonth()]; }

/* ---------- Zustand ---------- */
const GRP={bedarf:['Bedarf','was sein muss: Wohnen, Essen, Verträge','var(--p)'],wunsch:['Wünsche','Freizeit, Essen gehen, Shopping','var(--kh)'],sparen:['Sparen','Rücklage, Sparplan, Schulden tilgen','var(--accent)']}, GK=Object.keys(GRP);
const DEFCATS=[['wohnen','Wohnen','bedarf','#5B6BD6'],['lebensmittel','Lebensmittel','bedarf','#16A85A'],['mobil','Mobilität','bedarf','#2C7BD6'],['vertraege','Verträge & Versicherung','bedarf','#7D6BB8'],['gesundheit','Gesundheit & Drogerie','bedarf','#2E9BB5'],['uni','Uni & Arbeit','bedarf','#8A6D3B'],
  ['auswaerts','Essen gehen','wunsch','#E0673A'],['freizeit','Freizeit','wunsch','#D99318'],['shopping','Shopping','wunsch','#B4567F'],['abos','Abos','wunsch','#9B59B6'],['reisen','Reisen','wunsch','#1F9E8F'],['sonstiges','Sonstiges','wunsch','#7D8597'],
  ['ruecklage','Rücklage','sparen','#0E7C86'],['sparplan','Sparplan','sparen','#0D7038']];
const DEFSET=()=>({upd:0,einkommen:0,ziel:{bedarf:50,wunsch:30,sparen:20},klein:10});
let D, view='monat', mon=ym(today()), sheet=null, fKat='', fQ='', rng=6;
function normalize(x){
  x=x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  ['tx','cats','fix'].forEach(c=>{ if(!x[c]||typeof x[c]!=='object'||Array.isArray(x[c])) x[c]={}; });
  if(!Object.keys(x.cats).length) DEFCATS.forEach(([id,name,gruppe,farbe],i)=>{ x.cats['c-'+id]={id:'c-'+id,name,gruppe,farbe,budget:0,ord:i,upd:1}; });   // feste Kennungen: auf jedem Gerät gleich, nichts doppelt
  const d=DEFSET(); x.set=x.set&&typeof x.set==='object'?x.set:d;
  Object.keys(d).forEach(k=>{ if(x.set[k]==null) x.set[k]=d[k]; else if(d[k]&&typeof d[k]==='object') Object.keys(d[k]).forEach(j=>{ if(x.set[k][j]===undefined) x.set[k][j]=d[k][j]; }); });
  x.app=APP; x.v=1; x.savedAt=+x.savedAt||0; return x; }
function load(){ let x=null; try{ x=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){} D=normalize(x); }
let sumT=null;
function save(){ D.savedAt=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){ toast('Speichern im Browser nicht möglich'); }
  clearTimeout(sumT); sumT=setTimeout(pushSum,1200); stamp(); }
const live=c=>Object.values(D[c]).filter(x=>x&&!x.del);
function put(c,it){ it.upd=Date.now(); D[c][it.id]=it; return it; }
function rm(c,id){ if(D[c][id]) D[c][id]={id,upd:Date.now(),del:true}; }
function setS(fn){ fn(D.set); D.set.upd=Date.now(); save(); }

/* ---------- Kategorien, Fixkosten, Monat ---------- */
const cat=id=>{ const c=D.cats[id]; return c&&!c.del?c:null; };
const cats=()=>live('cats').sort((a,b)=>GK.indexOf(a.gruppe)-GK.indexOf(b.gruppe)||(a.ord||0)-(b.ord||0)||a.name.localeCompare(b.name,'de'));
const cName=id=>(cat(id)||{name:'Ohne Kategorie'}).name, cCol=id=>(cat(id)||{farbe:'#7D8597'}).farbe;
const grpOf=k=>{ const c=cat(k); return c&&GRP[c.gruppe]?c.gruppe:'wunsch'; };
const txAll=()=>live('tx').filter(t=>t.datum&&+t.betrag>0);
const txM=m=>txAll().filter(t=>ym(t.datum)===m).sort((a,b)=>b.datum.localeCompare(a.datum)||b.upd-a.upd);
/* Fixkosten/Abos: {name,betrag,art,kat,intervall (Monate),tag,ab:'JJJJ-MM',bis}. Fällige Termine eines Monats mit fester Kennung –
   so bucht jedes Gerät dieselbe Buchung (kein Doppel), und eine gelöschte kommt nicht wieder. */
function fixDue(m){ return live('fix').filter(f=>f.ab&&f.ab<=m&&(!f.bis||f.bis>=m)&&(mIdx(m)-mIdx(f.ab))%(+f.intervall||1)===0)
  .map(f=>({id:'x_'+f.id+'_'+m.replace('-',''),f,datum:m+'-'+String(Math.min(Math.max(1,+f.tag||1),daysIn(m))).padStart(2,'0')})); }
function bookFix(){ const t=today(); let n=0;
  [mAdd(ym(t),-1),ym(t)].forEach(m=>fixDue(m).forEach(x=>{ if(x.datum>t||D.tx[x.id]||kDiff(t,x.datum)>35) return;
    put('tx',{id:x.id,datum:x.datum,betrag:r2(x.f.betrag),art:x.f.art==='ein'?'ein':'aus',kat:x.f.kat||'',notiz:x.f.name,fix:x.f.id}); n++; }));
  if(n) save(); return n; }
const fixMon=f=>(+f.betrag||0)/(+f.intervall||1);
function monat(m){ const o={m,ein:0,aus:0,n:0,g:{bedarf:0,wunsch:0,sparen:0},k:{},T:txM(m)};
  o.T.forEach(t=>{ const b=+t.betrag; if(t.art==='ein'){ o.ein+=b; return; } o.aus+=b; o.n++; o.g[grpOf(t.kat)]+=b; o.k[t.kat]=(o.k[t.kat]||0)+b; });
  o.offen=fixDue(m).filter(x=>!D.tx[x.id]).sort((a,b)=>a.datum.localeCompare(b.datum));
  o.offenAus=o.offen.filter(x=>x.f.art!=='ein').reduce((s,x)=>s+ +x.f.betrag,0); o.offenEin=o.offen.filter(x=>x.f.art==='ein').reduce((s,x)=>s+ +x.f.betrag,0);
  o.eink=Math.max(o.ein+o.offenEin,+D.set.einkommen||0);   // geplantes Einkommen gilt, bis mehr eingegangen ist
  o.sparSoll=o.eink*(+D.set.ziel.sparen||0)/100; o.res=Math.max(0,o.sparSoll-o.g.sparen);   // „erst sparen“: was vom Sparziel noch fehlt, ist reserviert
  o.frei=o.eink-o.aus-o.offenAus-o.res;
  const t=today(); o.cur=m===ym(t); o.rest=o.cur?daysIn(m)- +t.slice(8)+1:0; o.proTag=o.cur&&o.rest?o.frei/o.rest:null;
  return o; }
/* Ø-Ausgaben je Kategorie aus den letzten n abgeschlossenen Monaten mit Buchungen */
function avgCat(n){ const cur=ym(today()), M=[]; for(let i=1;i<=12&&M.length<n;i++){ const m=mAdd(cur,-i); if(txM(m).some(t=>t.art!=='ein')) M.push(m); }
  const o={}; M.forEach(m=>{ const k=monat(m).k; Object.keys(k).forEach(c=>o[c]=(o[c]||0)+k[c]); }); Object.keys(o).forEach(c=>o[c]/=M.length); return {o,n:M.length}; }

/* ---------- Schnellzeile: „12,50 Rewe“ · „Rewe 12,50“ · „+450 Nebenjob“ ---------- */
const norm=s=>String(s||'').toLowerCase().trim().replace(/\s+/g,' ');
function parseQuick(s){ s=String(s||'').trim(); let m=/^([+-]?)\s*(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euro)?\s+(.+)$/i.exec(s)||/^([+-]?)\s*(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euro)?()$/i.exec(s), sign, b, note;
  if(m){ sign=m[1]; b=num(m[2]); note=m[3]; } else { m=/^([+-]?)\s*(.+?)\s+(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euro)?$/i.exec(s); if(!m) return null; sign=m[1]; note=m[2]; b=num(m[3]); }
  return b>0?{betrag:r2(b),art:sign==='+'?'ein':'aus',notiz:note.trim().slice(0,60)}:null; }
/* Kategorie raten: gleiche Notiz wie früher → dieselbe Kategorie; sonst Kategoriename im Text */
function guess(notiz,art){ const n=norm(notiz); if(!n) return null;
  const T=txAll().filter(t=>norm(t.notiz)===n&&(t.art||'aus')===art&&cat(t.kat)).sort((a,b)=>b.upd-a.upd); if(T.length) return T[0].kat;
  const c=cats().find(c=>n.includes(norm(c.name))||norm(c.name).split(/[ &]+/).some(w=>w.length>3&&n.includes(w))); return c?c.id:null; }
function addTx(t){ const x=put('tx',{id:uid('t'),datum:t.datum||today(),betrag:r2(t.betrag),art:t.art==='ein'?'ein':'aus',kat:t.art==='ein'?'':(t.kat||''),notiz:(t.notiz||'').trim().slice(0,60)}); save(); return x; }

/* ---------- Bausteine ---------- */
function ringSVG(v,max,col){ const p=max>0?Math.max(0,Math.min(1,v/max)):0, R=42, C=2*Math.PI*R;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--surface-3)" stroke-width="9"/><circle cx="50" cy="50" r="${R}" fill="none" stroke="${col||'var(--accent)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C*p).toFixed(1)} ${C.toFixed(1)}"/></svg>`; }
const txRow=t=>`<button class="tx" data-tx="${esc(t.id)}"><i class="dot" style="background:${t.art==='ein'?'var(--good-ink)':esc(cCol(t.kat))}"></i><span style="min-width:0"><div class="n">${esc(t.notiz||(t.art==='ein'?'Einnahme':cName(t.kat)))}</div><div class="s">${t.art==='ein'?'Einnahme':esc(cName(t.kat))}${t.fix?' · Fixkosten':''}</div></span><span class="b${t.art==='ein'?' ein':''}">${t.art==='ein'?'+':'−'}${e2(t.betrag)}</span></button>`;
const monHead=btn=>`<div class="dayhead"><button class="ibtn" data-mon="-1" aria-label="Voriger Monat">‹</button><div class="dt">${MON[+mon.slice(5,7)-1]}<small>${mon.slice(0,4)}</small></div>${mon===ym(today())?'':'<button class="btn sm" data-mon="0">Heute</button>'}<button class="ibtn" data-mon="1" aria-label="Nächster Monat">›</button>${btn||''}</div>`;

/* ---------- Ansichten ---------- */
function render(){
  document.querySelectorAll('.nav button').forEach(b=>b.dataset.v===view?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  const d=new Date(); $('sub').textContent=WD[d.getDay()]+', '+d.getDate()+'. '+MON[d.getMonth()];
  ({monat:vMonat,buchungen:vBuch,auswertung:vAus,plan:vPlan}[view]||vMonat)($('main')); stamp(); }
function vMonat(el){ const o=monat(mon), z=D.set.ziel, C=cats(), leer=!txAll().length&&!live('fix').length&&!(+D.set.einkommen>0);
  const used=o.aus+o.offenAus+o.res, neg=o.frei<0;
  const env=C.filter(c=>+c.budget>0||o.k[c.id]>0).map(c=>{ const sp=o.k[c.id]||0, b=+c.budget||0, over=b>0&&sp>b+0.005, p=b>0?Math.min(100,sp/b*100):100;
    return `<button class="env" data-fk="${esc(c.id)}"><span class="n"><i class="dot" style="background:${esc(c.farbe)}"></i><span>${esc(c.name)}</span></span><span class="v">${e0(sp)}${b?' / '+e0(b):''}</span>
      <span class="tr"><i style="width:${p}%;background:${over?'var(--bad-ink)':esc(c.farbe)};opacity:${b?1:.35}"></i></span><span class="s${over?' bad':''}">${b?(over?e0(sp-b)+' drüber':e0(b-sp)+' übrig'+(o.cur&&o.rest>1&&b-sp>0?' · '+e2((b-sp)/o.rest)+' pro Tag':'')):'kein Budget gesetzt'}</span></button>`; }).join('');
  const none=o.k['']||Object.keys(o.k).filter(k=>!cat(k)).reduce((s,k)=>s+o.k[k],0);
  el.innerHTML=monHead('<button class="btn pri" data-new="">+ Buchung</button>')
   +`<div class="qrow"><input class="in" id="qa" placeholder="Schnell: 12,50 Rewe   ·   +450 Nebenjob" enterkeyhint="done" autocomplete="off" aria-label="Schnell eintragen: Betrag und Notiz"><button class="btn" data-qadd="1">Eintragen</button></div>
   <div class="grid">
    ${leer?`<div class="card s12 stack"><h2>So startest du</h2><ol class="steps"><li>Unter <b>Plan</b> dein monatliches Einkommen eintragen.</li><li>Dort auch <b>Fixkosten &amp; Abos</b> anlegen (Miete, Handy, Streaming) – sie buchen sich dann von selbst.</li><li>Jede Ausgabe oben eintippen, z. B. „12,50 Rewe“. Beim zweiten Mal kennt das Buch die Kategorie schon.</li></ol></div>`:''}
    <div class="card s5"><div class="sum"><div class="ring">${ringSVG(used,o.eink,neg?'var(--bad-ink)':null)}<div class="rl"><b class="${neg?'bad':''}">${e0(o.frei)}</b><span>${neg?'über dem Einkommen':'noch frei'}</span>${o.proTag!=null&&!neg?`<span class="sp">${e2(o.proTag)} pro Tag</span>`:''}</div></div>
      <div class="kvs" style="flex:1;min-width:190px"><div class="kv"><span>Einkommen${o.ein+o.offenEin<o.eink?' (Plan)':''}</span><b>${e0(o.eink)}</b></div><div class="kv"><span>Ausgegeben · ${o.n} ${o.n===1?'Buchung':'Buchungen'}</span><b>−${e0(o.aus)}</b></div>
        ${o.offenAus?`<div class="kv"><span>Fixkosten, noch fällig</span><b>−${e0(o.offenAus)}</b></div>`:''}${o.res>0.5?`<div class="kv"><span>Fürs Sparen reserviert</span><b>−${e0(o.res)}</b></div>`:''}
        <div class="kv tot"><span>${o.cur?`Frei für die restlichen ${o.rest} ${o.rest===1?'Tag':'Tage'}`:'Am Monatsende übrig'}</span><b>${e0(o.frei)}</b></div></div></div></div>
    <div class="card s7 stack"><h2>Verteilung<span class="cap">Strich = dein Ziel</span></h2>
      ${GK.map(g=>{ const v=o.g[g]+(g==='bedarf'?0:0), pc=o.eink?v/o.eink*100:0; return `<div class="gr"><span class="ml">${GRP[g][0]}</span><span class="tr"><i style="width:${Math.min(100,pc/80*100)}%;background:${GRP[g][2]}"></i><u style="left:${Math.min(100,z[g]/80*100)}%"></u></span><span class="vl"><b>${e0(v)}</b> · ${o.eink?Math.round(pc)+' % vom Einkommen':'–'} · Ziel ${z[g]} %${g==='sparen'&&o.res>0.5?` · es fehlen noch ${e0(o.res)}`:''}</span></div>`; }).join('')}
      ${o.eink?'':'<div class="note">Für die Anteile brauche ich dein Einkommen – unter „Plan“ eintragen oder eine Einnahme buchen („+1200 Gehalt“).</div>'}</div>
    <div class="card s12"><h2>Umschläge<span class="cap">Budget je Kategorie · antippen zeigt die Buchungen</span></h2>${env?`<div class="envs">${env}</div>`:'<div class="empty">Noch keine Ausgaben in diesem Monat. Budgets legst du unter „Plan“ fest.</div>'}${none>0?`<p class="cap" style="margin-top:10px">${e0(none)} ohne Kategorie – unter „Buchungen“ zuordnen.</p>`:''}</div>
    ${o.offen.length?`<div class="card s6"><h2>Noch fällig<span class="cap">bucht sich am Tag von selbst</span></h2><div class="lst" style="margin-top:10px">${o.offen.map(x=>`<div class="tx pl"><i class="dot" style="background:${esc(cCol(x.f.kat))}"></i><span style="min-width:0"><div class="n">${esc(x.f.name)}</div><div class="s">am ${+x.datum.slice(8)}. · ${esc(x.f.art==='ein'?'Einnahme':cName(x.f.kat))}</div></span><span class="b${x.f.art==='ein'?' ein':''}">${x.f.art==='ein'?'+':'−'}${e2(x.f.betrag)}</span></div>`).join('')}</div></div>`:''}
    <div class="card ${o.offen.length?'s6':'s12'}"><h2>Zuletzt<span class="cap">${o.T.length} in ${MON[+mon.slice(5,7)-1]}</span></h2>${o.T.length?`<div class="lst" style="margin-top:10px">${o.T.slice(0,6).map(txRow).join('')}</div>${o.T.length>6?'<button class="btn sm" data-v="buchungen" style="margin-top:10px">Alle Buchungen</button>':''}`:'<div class="empty">Noch nichts gebucht.</div>'}</div>
   </div>`; }
function vBuch(el){ const o=monat(mon), q=norm(fQ), used=[...new Set(o.T.filter(t=>t.art!=='ein').map(t=>t.kat))];
  let T=o.T; if(fKat==='ein') T=T.filter(t=>t.art==='ein'); else if(fKat) T=T.filter(t=>t.art!=='ein'&&t.kat===fKat); if(q) T=T.filter(t=>norm(t.notiz+' '+cName(t.kat)).includes(q));
  const by={}; T.forEach(t=>(by[t.datum]=by[t.datum]||[]).push(t)); const s=T.reduce((a,t)=>a+(t.art==='ein'?+t.betrag:-t.betrag),0);
  el.innerHTML=monHead('<button class="btn pri" data-new="">+ Buchung</button>')
   +`<div class="chips" style="margin-bottom:10px"><button class="chip${!fKat?' on':''}" data-fk="">Alle</button>${o.ein?`<button class="chip${fKat==='ein'?' on':''}" data-fk="ein">Einnahmen</button>`:''}${used.map(k=>`<button class="chip${fKat===k?' on':''}" data-fk="${esc(k)}">${esc(cName(k))}</button>`).join('')}</div>
   <div class="srow" style="margin-bottom:6px"><input class="in" id="fq" type="search" placeholder="Suchen …" value="${esc(fQ)}" autocomplete="off" aria-label="Buchungen durchsuchen"></div>
   <div id="blist">${buchList(by,T,s)}</div>`; }
function buchList(by,T,s){ const K=Object.keys(by).sort().reverse();
  return K.length?`<p class="cap" style="margin:8px 2px 0">${T.length} ${T.length===1?'Buchung':'Buchungen'} · Summe <b style="font-family:var(--mono);color:var(--ink)">${s>0?'+':s<0?'−':''}${e2(Math.abs(s))}</b></p>`+K.map(k=>{ const L=by[k], d=L.reduce((a,t)=>a+(t.art==='ein'?0:+t.betrag),0);
    return `<div class="dh2"><span>${fDay(k)}</span><span>${d?'−'+e2(d):''}</span></div><div class="lst">${L.map(txRow).join('')}</div>`; }).join(''):'<div class="empty">Keine Buchungen für diese Auswahl.</div>'; }
function vAus(el){ const cur=ym(today()), M=[]; for(let i=rng-1;i>=0;i--) M.push(monat(mAdd(cur,-i)));
  const A=M.filter(o=>o.n||o.ein), nA=Math.max(1,A.length), sumAus=A.reduce((s,o)=>s+o.aus,0), sumEin=A.reduce((s,o)=>s+o.eink,0), first=M[0].m+'-01';
  /* Monatsbalken */
  const W=760,H=200,pl=44,pr=10,pt=12,pb=26, mx=Math.max(1,...M.map(o=>Math.max(o.aus,o.eink)))*1.1, bw=(W-pl-pr)/M.length, y=v=>pt+(1-v/mx)*(H-pt-pb);
  let svg=[0,.5,1].map(f=>{ const v=mx/1.1*f; return `<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)"/><text x="${pl-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--faint)" font-family="var(--mono)">${Math.round(v).toLocaleString('de-DE')}</text>`; }).join('');
  M.forEach((o,i)=>{ const x=pl+i*bw; svg+=`<rect x="${x+bw*.14}" y="${y(o.eink)}" width="${bw*.32}" height="${Math.max(0,H-pb-y(o.eink))}" rx="3" fill="var(--surface-3)"><title>${mName(o.m)}: Einkommen ${e0(o.eink)}</title></rect><rect x="${x+bw*.5}" y="${y(o.aus)}" width="${bw*.36}" height="${Math.max(0,H-pb-y(o.aus))}" rx="3" fill="${o.aus>o.eink&&o.eink?'var(--bad-ink)':'var(--accent)'}" opacity="${o.m===cur?.6:1}"><title>${mName(o.m)}: Ausgaben ${e0(o.aus)}</title></rect><text x="${x+bw*.5}" y="${H-8}" text-anchor="middle" font-size="11" fill="var(--faint)">${MON[+o.m.slice(5,7)-1].slice(0,3)}</text>`; });
  /* Kategorien: Ø je Monat, Anteil, letzter abgeschlossener Monat gegen den Schnitt davor */
  const kt={}; A.forEach(o=>Object.keys(o.k).forEach(k=>kt[k]=(kt[k]||0)+o.k[k])); const KL=Object.keys(kt).sort((a,b)=>kt[b]-kt[a]), kmax=Math.max(1,...KL.map(k=>kt[k]));
  const done=A.filter(o=>o.m<cur), last=done[done.length-1], prev=done.slice(0,-1);
  const trend=k=>{ if(!last||!prev.length) return null; const p=prev.reduce((s,o)=>s+(o.k[k]||0),0)/prev.length, l=last.k[k]||0; return p>5?(l-p)/p*100:null; };
  /* Verhalten: nur variable Ausgaben (ohne Fixkosten und ohne Sparen) */
  const V=txAll().filter(t=>t.art!=='ein'&&!t.fix&&grpOf(t.kat)!=='sparen'&&t.datum>=first), vSum=V.reduce((s,t)=>s+ +t.betrag,0);
  const span=V.length?Math.max(1,kDiff(today(),V.reduce((a,t)=>t.datum<a?t.datum:a,today()))+1):1, wd=[0,0,0,0,0,0,0], wn=[0,0,0,0,0,0,0];
  V.forEach(t=>wd[kDate(t.datum).getDay()]+=+t.betrag); for(let i=0;i<span;i++) wn[kDate(kAdd(today(),-i)).getDay()]++;
  const wa=wd.map((v,i)=>wn[i]?v/wn[i]:0), wmax=Math.max(1,...wa), ord=[1,2,3,4,5,6,0], top=ord.reduce((a,i)=>wa[i]>wa[a]?i:a,1);
  const kl=+D.set.klein||10, S=V.filter(t=>+t.betrag<kl), sSum=S.reduce((s,t)=>s+ +t.betrag,0);
  const nt={}; V.forEach(t=>{ const n=norm(t.notiz); if(!n) return; const x=nt[n]=nt[n]||{n:t.notiz,s:0,c:0}; x.s+=+t.betrag; x.c++; }); const NL=Object.values(nt).sort((a,b)=>b.s-a.s).slice(0,6);
  const gs={bedarf:0,wunsch:0,sparen:0}; A.forEach(o=>GK.forEach(g=>gs[g]+=o.g[g]));
  /* Auffälligkeiten in Worten */
  const I=[]; if(V.length>=8){
    if(wa[top]>0) I.push(`Am meisten gibst du <b>${WD[top].toLowerCase()}s</b> aus: im Schnitt ${e2(wa[top])} – ${wa[top]>=2*(vSum/span)?'mehr als doppelt so viel wie':Math.round(wa[top]/(vSum/span)*100-100)+' % mehr als'} an einem Durchschnittstag (${e2(vSum/span)}).`);
    if(S.length>=5) I.push(`Kleine Beträge unter ${e0(kl)}: <b>${S.length}</b> Buchungen, zusammen ${e0(sSum)} – ${Math.round(sSum/Math.max(1,vSum)*100)} % deiner variablen Ausgaben.`);
    const up=KL.map(k=>[k,trend(k)]).filter(x=>x[1]!=null&&x[1]>=25&&(last.k[x[0]]||0)>=20).sort((a,b)=>b[1]-a[1])[0]; if(up) I.push(`<b>${esc(cName(up[0]))}</b> lag im ${mName(last.m)} ${Math.round(up[1])} % über deinem Schnitt der Monate davor (${e0(last.k[up[0]])}).`);
    if(sumEin>0) I.push(`Von deinem Einkommen gingen ${Math.round(gs.wunsch/sumEin*100)} % in Wünsche und ${Math.round(gs.sparen/sumEin*100)} % ins Sparen (Ziel ${D.set.ziel.wunsch} % / ${D.set.ziel.sparen} %).`);
    if(NL[0]&&NL[0].c>=3) I.push(`Am häufigsten: „${esc(NL[0].n)}“ – ${NL[0].c}× für zusammen ${e0(NL[0].s)}.`); }
  el.innerHTML=`<div class="chips" style="margin-bottom:14px">${[3,6,12].map(n=>`<button class="chip${rng===n?' on':''}" data-rng="${n}">${n} Monate</button>`).join('')}</div>
   <div class="grid">
    <div class="card s12"><h2>Monate<span class="cap">grau = Einkommen · farbig = Ausgaben</span></h2><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Einkommen und Ausgaben je Monat">${svg}</svg>
      <div class="kpis" style="margin-top:10px"><div class="kpi"><b>${e0(sumAus/nA)}</b><span>Ø Ausgaben im Monat</span></div><div class="kpi"><b>${e0(vSum/span)}</b><span>Ø variabel pro Tag</span></div><div class="kpi"><b>${sumEin?Math.round(gs.sparen/sumEin*100)+' %':'–'}</b><span>Sparquote</span></div><div class="kpi"><b>${e0((sumEin-sumAus)/nA)}</b><span>Ø übrig im Monat</span></div></div></div>
    <div class="card s12"><h2>Was auffällt</h2>${I.length?`<div class="ins">${I.map(t=>`<div>${t}</div>`).join('')}</div>`:'<div class="empty">Sobald etwa zwei Wochen Ausgaben erfasst sind, steht hier, wann und wofür du am meisten ausgibst.</div>'}</div>
    <div class="card s7"><h2>Kategorien<span class="cap">Ø im Monat · Pfeil = letzter Monat gegen davor</span></h2>${KL.length?KL.slice(0,10).map(k=>{ const tr=trend(k); return `<div class="hb"><span class="ml"><i class="dot" style="background:${esc(cCol(k))}"></i><span>${esc(cName(k))}</span></span><span class="tr"><i style="width:${kt[k]/kmax*100}%;background:${esc(cCol(k))}"></i></span><span class="vl">${e0(kt[k]/nA)} <small>${sumAus?Math.round(kt[k]/sumAus*100)+' %':''}${tr!=null&&Math.abs(tr)>=10?(tr>0?' ↑':' ↓')+Math.abs(Math.round(tr))+' %':''}</small></span></div>`; }).join(''):'<div class="empty">Noch keine Ausgaben.</div>'}</div>
    <div class="card s5"><h2>Wochentage<span class="cap">Ø variable Ausgaben</span></h2>${V.length?ord.map(i=>`<div class="hb" style="grid-template-columns:34px 1fr auto"><span class="ml">${WD[i].slice(0,2)}</span><span class="tr"><i style="width:${wa[i]/wmax*100}%"></i></span><span class="vl">${e2(wa[i])}</span></div>`).join(''):'<div class="empty">Noch keine Ausgaben.</div>'}</div>
    <div class="card s12"><h2>Wofür am meisten<span class="cap">nach Notiz, ohne Fixkosten</span></h2>${NL.length?`<div class="lst" style="margin-top:10px">${NL.map(x=>`<div class="tx pl" style="opacity:1"><i class="dot" style="background:var(--accent)"></i><span style="min-width:0"><div class="n">${esc(x.n)}</div><div class="s">${x.c}× · Ø ${e2(x.s/x.c)}</div></span><span class="b">${e2(x.s)}</span></div>`).join('')}</div>`:'<div class="empty">Notizen wie „Rewe“ oder „Mensa“ machen diese Liste aussagekräftig.</div>'}</div>
   </div>`; }
function vPlan(el){ const s=D.set, z=s.ziel, C=cats(), F=live('fix').sort((a,b)=>fixMon(b)-fixMon(a)), av=avgCat(3), ek=+s.einkommen||0;
  const bud=C.reduce((a,c)=>a+(+c.budget||0),0), rest=ek-bud, fm={}, zs=(+z.bedarf||0)+(+z.wunsch||0)+(+z.sparen||0);
  F.filter(f=>f.art!=='ein'&&(!f.bis||f.bis>=ym(today()))).forEach(f=>fm[f.kat]=(fm[f.kat]||0)+fixMon(f)); const fSum=Object.values(fm).reduce((a,b)=>a+b,0);
  const IV={1:'monatlich',3:'alle 3 Monate',6:'halbjährlich',12:'jährlich'};
  el.innerHTML=`<div class="grid">
    <div class="card s12 stack"><h2>Einkommen &amp; Verteilung</h2>
      <div class="sent">Im Monat kommen netto <input class="in" data-set="einkommen" inputmode="decimal" value="${ek||''}" placeholder="0" style="width:96px" aria-label="Monatliches Nettoeinkommen"> € herein. Davon sollen
        <input class="in" data-ziel="bedarf" inputmode="numeric" value="${z.bedarf}" style="width:56px" aria-label="Anteil Bedarf in Prozent"> % für Bedarf,
        <input class="in" data-ziel="wunsch" inputmode="numeric" value="${z.wunsch}" style="width:56px" aria-label="Anteil Wünsche in Prozent"> % für Wünsche und
        <input class="in" data-ziel="sparen" inputmode="numeric" value="${z.sparen}" style="width:56px" aria-label="Anteil Sparen in Prozent"> % fürs Sparen sein.</div>
      ${zs!==100?`<div class="note warn">Die drei Anteile ergeben ${zs} % statt 100 %.</div>`:''}
      ${ek?`<div class="kvs"><div class="kv"><span>Einkommen</span><b>${e0(ek)}</b></div><div class="kv"><span>In Budgets verplant${fSum?` (davon Fixkosten ${e0(fSum)})`:''}</span><b>−${e0(bud)}</b></div><div class="kv tot"><span>${rest>=0?'Noch zu verteilen':'Zu viel verplant'}</span><b class="${rest<0?'bad':''}" style="${rest<0?'color:var(--bad-ink)':''}">${e0(Math.abs(rest))}</b></div></div>
        <div class="cap">${rest>0.5?'Gib jedem Euro eine Aufgabe: den Rest einem Umschlag oder dem Sparen zuweisen.':rest<-0.5?'Die Budgets übersteigen dein Einkommen – irgendwo kürzen.':'Jeder Euro ist verplant.'} Das Sparziel (${e0(ek*z.sparen/100)}) wird unter „Monat“ zuerst reserviert.</div>`
        :'<div class="cap">50 / 30 / 20 ist ein gängiger Startpunkt. Mit hoher Miete darf Bedarf höher liegen – wichtig ist, dass der Sparanteil zuerst weggeht.</div>'}</div>
    <div class="card s7 stack"><h2>Budgets<span class="cap">Umschlag je Kategorie, pro Monat</span></h2>
      <div>${GK.map(g=>`<div class="glab">${GRP[g][0]} <span style="font-weight:500;text-transform:none;letter-spacing:0">· ${GRP[g][1]}</span></div>${C.filter(c=>c.gruppe===g).map(c=>`<div class="brow"><div style="min-width:0"><div class="n"><i class="dot" style="background:${esc(c.farbe)}"></i><span>${esc(c.name)}</span></div><div class="s">${av.n&&av.o[c.id]?`Ø ${e0(av.o[c.id])} in ${av.n} ${av.n===1?'Monat':'Monaten'}`:'noch keine Ausgaben'}${fm[c.id]?` · Fixkosten ${e0(fm[c.id])}`:''}</div></div><input class="in" data-bud="${esc(c.id)}" inputmode="decimal" value="${+c.budget||''}" placeholder="–" aria-label="Budget für ${esc(c.name)}"><button class="x" data-cedit="${esc(c.id)}" aria-label="${esc(c.name)} bearbeiten">✎</button></div>`).join('')}`).join('')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-cnew="1">+ Kategorie</button>${av.n||fSum?'<button class="btn sm" data-auto="1">Leere Budgets aus Schnitt &amp; Fixkosten vorschlagen</button>':''}</div></div>
    <div class="card s5 stack"><h2>Fixkosten &amp; Abos<span class="cap">${fSum?e0(fSum)+' im Monat · '+e0(fSum*12)+' im Jahr':''}</span></h2>
      ${F.length?`<div class="lst">${F.map(f=>`<button class="tx" data-fedit="${esc(f.id)}"><i class="dot" style="background:${f.art==='ein'?'var(--good-ink)':esc(cCol(f.kat))}"></i><span style="min-width:0"><div class="n">${esc(f.name)}</div><div class="s">${IV[f.intervall]||'monatlich'} am ${+f.tag||1}.${+f.intervall>1?' · '+e2(fixMon(f))+' im Monat':''}${f.bis?' · bis '+mName(f.bis):''}</div></span><span class="b${f.art==='ein'?' ein':''}">${f.art==='ein'?'+':'−'}${e2(f.betrag)}</span></button>`).join('')}</div>`:'<div class="empty">Miete, Handy, Streaming, Versicherungen, Semesterbeitrag: einmal anlegen, dann buchen sie sich am Stichtag von selbst.</div>'}
      <button class="btn sm" data-fnew="1" style="align-self:flex-start">+ Fixkosten oder Abo</button>
      <div class="cap">Jährliche und vierteljährliche Posten werden auf den Monat umgerechnet, damit sie nicht überraschen. Abos jedes Jahr einmal durchgehen: Was hier steht, sparst du mit einer Kündigung dauerhaft.</div>
      <h2 style="margin-top:6px">Auswertung</h2>
      <div class="sent">Als „kleine Beträge“ zählen Ausgaben unter <input class="in" data-set="klein" inputmode="decimal" value="${s.klein}" style="width:60px" aria-label="Grenze für kleine Beträge"> €.</div></div>
   </div>`; }

/* ---------- Blätter ---------- */
function show(){ $('ov').classList.add('show'); }
function closeSheet(){ sheet=null; $('ov').classList.remove('show'); render(); }
function openTx(t,isNew){ sheet={m:'tx',t:{...t},isNew:!!isNew}; drawSheet(); show(); if(isNew&&!(+t.betrag>0)) setTimeout(()=>{ const i=$('tB'); if(i) i.focus(); },50); }
function drawSheet(){ const s=sheet, d=$('dlg'); if(!s) return;
  const head=t=>`<div class="dh"><h3 id="dlgT">${t}</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>`;
  const katSel=(v,id)=>`<select class="in" id="${id}">${GK.map(g=>`<optgroup label="${GRP[g][0]}">${cats().filter(c=>c.gruppe===g).map(c=>`<option value="${esc(c.id)}"${v===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  if(s.m==='tx'){ const t=s.t, ein=t.art==='ein', use={}; txAll().forEach(x=>{ if(x.art!=='ein') use[x.kat]=(use[x.kat]||0)+1; });
    const notes=[...new Set(txAll().sort((a,b)=>b.upd-a.upd).map(x=>x.notiz).filter(Boolean))].slice(0,40);
    d.innerHTML=head(s.isNew?'Neue Buchung':'Buchung')+`<div class="db">
      <div class="seg" role="group" aria-label="Art"><button data-art="aus" aria-pressed="${!ein}">Ausgabe</button><button data-art="ein" aria-pressed="${ein}">Einnahme</button></div>
      <label class="lbl">Betrag (€)<input class="in amtin" id="tB" inputmode="decimal" value="${+t.betrag>0?dz(t.betrag):''}" placeholder="0,00" autocomplete="off"></label>
      ${ein?'':`<div class="lbl">Kategorie</div>${GK.map(g=>`<div class="glab">${GRP[g][0]}</div><div class="cchips">${cats().filter(c=>c.gruppe===g).sort((a,b)=>(use[b.id]||0)-(use[a.id]||0)).map(c=>`<button class="chip${t.kat===c.id?' on':''}" data-kat="${esc(c.id)}"><i class="dot" style="background:${esc(c.farbe)}"></i>${esc(c.name)}</button>`).join('')}</div>`).join('')}`}
      <label class="lbl">Notiz<input class="in" id="tN" value="${esc(t.notiz||'')}" placeholder="${ein?'z. B. Gehalt, BAföG':'z. B. Rewe, Mensa, Kino'}" list="notes" autocomplete="off"></label><datalist id="notes">${notes.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
      <label class="lbl" style="max-width:200px">Datum<input class="in" type="date" id="tD" value="${esc(t.datum||today())}"></label>
      ${t.fix?'<p class="cap">Automatisch aus den Fixkosten gebucht. Betrag hier ändern gilt nur für diesen Monat.</p>':''}</div>
    <div class="df">${s.isNew?'':'<button class="btn dng" data-tdel="1">Löschen</button>'}<span style="flex:1"></span><button class="btn pri" data-tsave="1">${s.isNew?'Eintragen':'Speichern'}</button></div>`; return; }
  if(s.m==='fix'){ const f=s.f;
    d.innerHTML=head(s.isNew?'Fixkosten oder Abo':'Fixkosten bearbeiten')+`<div class="db">
      <div class="seg" role="group" aria-label="Art"><button data-fart="aus" aria-pressed="${f.art!=='ein'}">Ausgabe</button><button data-fart="ein" aria-pressed="${f.art==='ein'}">Einnahme</button></div>
      <div class="form"><label class="lbl w2">Bezeichnung<input class="in" id="fN" value="${esc(f.name||'')}" placeholder="${f.art==='ein'?'z. B. Gehalt, Kindergeld':'z. B. Miete, Spotify'}"></label><label class="lbl w2">Betrag (€)<input class="in mono" id="fB" inputmode="decimal" value="${+f.betrag>0?dz(f.betrag):''}"></label>
        ${f.art==='ein'?'':`<label class="lbl w2">Kategorie${katSel(f.kat,'fK')}</label>`}
        <label class="lbl w2">Wie oft<select class="in" id="fI">${[[1,'monatlich'],[3,'alle 3 Monate'],[6,'halbjährlich'],[12,'jährlich']].map(([a,b])=>`<option value="${a}"${+f.intervall===a?' selected':''}>${b}</option>`).join('')}</select></label>
        <label class="lbl">Am Tag<input class="in mono" id="fT" inputmode="numeric" value="${+f.tag||1}"></label><label class="lbl">Erstmals<input class="in" type="month" id="fA" value="${esc(f.ab||ym(today()))}"></label><label class="lbl w2">Endet (optional)<input class="in" type="month" id="fE" value="${esc(f.bis||'')}"></label></div>
      <p class="cap">Wird am Stichtag automatisch gebucht – auf jedem Gerät nur einmal. Bei „jährlich“ zählt der Monat aus „Erstmals“.</p></div>
    <div class="df">${s.isNew?'':'<button class="btn dng" data-fdel="1">Löschen</button>'}<span style="flex:1"></span><button class="btn pri" data-fsave="1">Speichern</button></div>`; return; }
  if(s.m==='cat'){ const c=s.c;
    d.innerHTML=head(s.isNew?'Neue Kategorie':'Kategorie')+`<div class="db"><div class="form"><label class="lbl w2">Name<input class="in" id="cN" value="${esc(c.name||'')}"></label><label class="lbl">Farbe<input class="in" type="color" id="cF" value="${esc(c.farbe||'#0E7C86')}" style="height:38px;padding:3px"></label><label class="lbl">Budget (€)<input class="in mono" id="cB" inputmode="decimal" value="${+c.budget||''}"></label></div>
      <div class="lbl">Gehört zu</div><div class="opts">${GK.map(g=>`<button class="opt${c.gruppe===g?' on':''}" data-cgr="${g}" aria-pressed="${c.gruppe===g}"><b>${GRP[g][0]}</b><span>${GRP[g][1]}</span></button>`).join('')}</div></div>
    <div class="df">${s.isNew?'':'<button class="btn dng" data-cdel="1">Löschen</button>'}<span style="flex:1"></span><button class="btn pri" data-csave="1">Speichern</button></div>`; return; }
  if(s.m==='data'){ d.innerHTML=head('Daten &amp; Backup')+`<div class="db"><p class="cap">Alles liegt im Browser${window.__PI_SYNC?' und auf dem Raspberry Pi (pro Buchung abgeglichen)':''} – nichts geht ins Internet. Eine JSON-Sicherung kannst du jederzeit wieder einlesen.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-exp="1">JSON-Backup speichern</button><button class="btn" data-imp="1">Backup einlesen</button><button class="btn" data-csv="1">Buchungen als CSV</button></div>
      <div class="note">${txAll().length} Buchungen · ${cats().length} Kategorien · ${live('fix').length} Fixkosten<br>Zuletzt gespeichert: ${D.savedAt?new Date(D.savedAt).toLocaleString('de-DE'):'noch nie'}</div></div>`; return; }
}

/* ---------- Ereignisse ---------- */
function quickAdd(){ const i=$('qa'), p=parseQuick(i.value); if(!p){ toast('So geht es: „12,50 Rewe“ oder „+450 Nebenjob“'); i.focus(); return; }
  const datum=mon===ym(today())?today():mon+'-01', k=p.art==='ein'?'':guess(p.notiz,'aus');
  if(p.art==='aus'&&!k) return openTx({...p,datum,kat:''},true);   // Kategorie noch unbekannt → einmal wählen, danach merkt es sich das Buch
  const t=addTx({...p,datum,kat:k}); i.value=''; render(); const q=$('qa'); if(q&&innerWidth>640) q.focus();
  toast(`${e2(t.betrag)} · ${p.art==='ein'?'Einnahme':cName(k)}`,()=>{ rm('tx',t.id); save(); render(); }); }
document.addEventListener('click',e=>{ const b=e.target.closest('button,[data-v]'); if(!b||b.disabled) return; const ds=b.dataset;
  if(ds.v){ view=ds.v; try{ localStorage.setItem('hb_view',view); }catch(_){} render(); return scrollTo(0,0); }
  if(ds.mon!=null){ mon=ds.mon==='0'?ym(today()):mAdd(mon,+ds.mon); fKat=''; return render(); }
  if(ds.qadd) return quickAdd();
  if(ds.new!=null) return openTx({betrag:0,art:'aus',kat:'',notiz:'',datum:mon===ym(today())?today():mon+'-01'},true);
  if(ds.tx){ const t=D.tx[ds.tx]; if(t&&!t.del) openTx(t,false); return; }
  if(ds.fk!=null){ fKat=ds.fk; view='buchungen'; render(); return scrollTo(0,0); }
  if(ds.rng){ rng=+ds.rng; return render(); }
  if(ds.cnew){ sheet={m:'cat',isNew:true,c:{name:'',gruppe:'wunsch',farbe:'#0E7C86',budget:0}}; drawSheet(); return show(); }
  if(ds.cedit){ const c=cat(ds.cedit); if(!c) return; sheet={m:'cat',c:{...c}}; drawSheet(); return show(); }
  if(ds.fnew){ sheet={m:'fix',isNew:true,f:{name:'',betrag:0,art:'aus',kat:(cats()[0]||{}).id||'',intervall:1,tag:1,ab:ym(today()),bis:''}}; drawSheet(); return show(); }
  if(ds.fedit){ const f=D.fix[ds.fedit]; if(!f||f.del) return; sheet={m:'fix',f:{...f}}; drawSheet(); return show(); }
  if(ds.auto){ const av=avgCat(3), fm={}; live('fix').filter(f=>f.art!=='ein').forEach(f=>fm[f.kat]=(fm[f.kat]||0)+fixMon(f)); let n=0;
    cats().forEach(c=>{ if(+c.budget>0) return; const v=Math.max(av.o[c.id]||0,fm[c.id]||0); if(v<1) return; c.budget=Math.ceil(v/5)*5; put('cats',c); n++; }); save(); render(); return toast(n?`${n} Budgets vorgeschlagen – anpassen, bis nichts mehr zu verteilen ist`:'Alle Kategorien mit Ausgaben haben schon ein Budget'); }
  if(ds.close) return closeSheet();
  if(!sheet) return; const s=sheet;
  if(s.m==='tx'){ const t=s.t, rd=()=>{ const v=num($('tB').value); t.betrag=v>0?v:0; t.notiz=$('tN').value; t.datum=$('tD').value||today(); };
    if(ds.art){ rd(); t.art=ds.art; return drawSheet(); }
    if(ds.kat){ rd(); t.kat=ds.kat; drawSheet(); return; }
    if(ds.tsave){ rd(); if(!(t.betrag>0)){ toast('Bitte einen Betrag eingeben'); return $('tB').focus(); } if(t.betrag>1e6){ toast('Der Betrag ist zu groß'); return; }
      if(t.art!=='ein'&&!cat(t.kat)){ const g=guess(t.notiz,'aus'); if(g) t.kat=g; else return toast('Bitte eine Kategorie wählen'); }
      if(s.isNew) addTx(t); else { put('tx',{...D.tx[t.id],betrag:r2(t.betrag),art:t.art,kat:t.art==='ein'?'':t.kat,notiz:t.notiz.trim().slice(0,60),datum:t.datum}); save(); }
      mon=ym(t.datum); const q=$('qa'); if(q) q.value=''; closeSheet(); return toast(s.isNew?`${e2(t.betrag)} · ${t.art==='ein'?'Einnahme':cName(t.kat)}`:'Gespeichert'); }
    if(ds.tdel){ const id=t.id; rm('tx',id); save(); closeSheet(); return toast('Buchung gelöscht'); } }
  if(s.m==='fix'){ const f=s.f, rd=()=>{ f.name=$('fN').value.trim().slice(0,60); f.betrag=num($('fB').value)||0; if($('fK')) f.kat=$('fK').value; f.intervall=+$('fI').value||1; f.tag=Math.min(31,Math.max(1,Math.round(num($('fT').value)||1))); f.ab=$('fA').value||ym(today()); f.bis=$('fE').value||''; };
    if(ds.fart){ rd(); f.art=ds.fart; return drawSheet(); }
    if(ds.fsave){ rd(); if(!f.name){ toast('Bitte eine Bezeichnung'); return; } if(!(f.betrag>0)){ toast('Bitte einen Betrag'); return; } if(f.bis&&f.bis<f.ab){ toast('„Endet“ liegt vor „Erstmals“'); return; }
      put('fix',{...f,id:f.id||uid('f'),betrag:r2(f.betrag)}); save(); const n=bookFix(); closeSheet(); return toast(n?`Gespeichert – ${n} ${n===1?'Buchung':'Buchungen'} für diesen Monat angelegt`:'Gespeichert'); }
    if(ds.fdel){ if(!confirm(`„${f.name}“ löschen? Schon gebuchte Monate bleiben erhalten.`)) return; rm('fix',f.id); save(); closeSheet(); return toast('Gelöscht'); } }
  if(s.m==='cat'){ const c=s.c, rd=()=>{ c.name=$('cN').value.trim().slice(0,40); c.farbe=$('cF').value; c.budget=Math.max(0,num($('cB').value)||0); };
    if(ds.cgr){ rd(); c.gruppe=ds.cgr; return drawSheet(); }
    if(ds.csave){ rd(); if(!c.name){ toast('Bitte einen Namen'); return; } put('cats',{...c,id:c.id||uid('c'),ord:c.ord??cats().length}); save(); closeSheet(); return toast('Gespeichert'); }
    if(ds.cdel){ const n=txAll().filter(t=>t.kat===c.id).length; if(!confirm(`Kategorie „${c.name}“ löschen?${n?` ${n} Buchungen bleiben erhalten, stehen dann aber ohne Kategorie da.`:''}`)) return; rm('cats',c.id); save(); closeSheet(); return toast('Gelöscht'); } }
  if(s.m==='data'){
    const dl=(txt,name,type)=>{ const u=URL.createObjectURL(new Blob([txt],{type})), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1000); };
    if(ds.exp){ dl(JSON.stringify(D,null,1),'haushaltsbuch_'+today()+'.json','application/json'); return toast('Backup gespeichert'); }
    if(ds.csv){ const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"'; dl('﻿Datum;Art;Betrag;Kategorie;Gruppe;Notiz;Fixkosten\r\n'+txAll().sort((a,b)=>a.datum.localeCompare(b.datum)).map(t=>[t.datum,t.art==='ein'?'Einnahme':'Ausgabe',dz(r2(t.betrag).toFixed(2)),q(t.art==='ein'?'':cName(t.kat)),t.art==='ein'?'':GRP[grpOf(t.kat)][0],q(t.notiz),t.fix?'ja':''].join(';')).join('\r\n'),'buchungen_'+today()+'.csv','text/csv'); return toast('CSV gespeichert'); }
    if(ds.imp) return $('impFile').click(); }
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&sheet) return closeSheet();
  if(e.key==='Enter'&&e.target.id==='qa'){ e.preventDefault(); return quickAdd(); }
  if(e.key==='Enter'&&sheet&&sheet.m==='tx'&&(e.target.id==='tB'||e.target.id==='tN')){ e.preventDefault(); const b=document.querySelector('[data-tsave]'); if(b) b.click(); } });
let fqT; document.addEventListener('input',e=>{ const el=e.target;
  if(el.id==='fq'){ fQ=el.value; clearTimeout(fqT); fqT=setTimeout(()=>{ const f=document.activeElement&&document.activeElement.id==='fq', p=el.selectionStart; render(); if(f){ const n=$('fq'); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(_){} } } },200); return; }
  if(el.id==='tN'&&sheet&&sheet.m==='tx'&&sheet.t.art!=='ein'&&!cat(sheet.t.kat)){ const g=guess(el.value,'aus'); if(g){ sheet.t.kat=g; document.querySelectorAll('#dlg [data-kat]').forEach(c=>c.classList.toggle('on',c.dataset.kat===g)); } } });
document.addEventListener('change',e=>{ const el=e.target, ds=el.dataset;
  if(ds.set){ const v=num(el.value); if(ds.set==='klein'&&!(v>0)) return render(); setS(s=>{ s[ds.set]=Math.max(0,r2(v||0)); }); return render(); }
  if(ds.ziel){ const v=num(el.value); if(v==null||v<0||v>100) return render(); setS(s=>{ s.ziel[ds.ziel]=Math.round(v); }); return render(); }
  if(ds.bud){ const c=cat(ds.bud), v=num(el.value); if(!c) return; c.budget=v>0?r2(v):0; put('cats',c); save(); return render(); }
  if(el.id==='impFile'&&el.files[0]){ const r=new FileReader(); r.onload=()=>{ let x=null; try{ x=JSON.parse(r.result); }catch(_){}
      if(!x||x.app!==APP){ toast('Keine Haushaltsbuch-Daten in der Datei'); return; }
      if(!confirm(`Backup vom ${x.savedAt?new Date(x.savedAt).toLocaleString('de-DE'):'?'} einlesen? Buchungen werden zusammengeführt – nichts geht verloren.`)) return;
      ['tx','cats','fix'].forEach(c=>Object.values(x[c]||{}).forEach(it=>{ const o=D[c][it.id]; if(!o||(+it.upd||0)>(+o.upd||0)) D[c][it.id]=it; }));
      if(x.set&&(+x.set.upd||0)>(+D.set.upd||0)) D.set=x.set; D=normalize(D); save(); sheet=null; $('ov').classList.remove('show'); render(); toast('Backup eingelesen'); };
    r.readAsText(el.files[0]); el.value=''; } });
$('ov').addEventListener('click',e=>{ if(e.target.id==='ov') closeSheet(); });

/* ---------- Dashboard-Kachel, Kleinkram ---------- */
function pushSum(){ if(!window.__PI_SYNC) return; const m=ym(today()), o=monat(m), used=o.aus+o.offenAus+o.res, td=today();
  const E=cats().filter(c=>+c.budget>0&&c.gruppe!=='sparen').map(c=>({c,sp:o.k[c.id]||0})).sort((a,b)=>b.sp/b.c.budget-a.sp/a.c.budget).slice(0,3);
  const s={v:1,savedAt:Date.now(),zahl:{wert:Math.round(o.frei),einheit:'€',label:'frei im '+MON[+m.slice(5,7)-1]},ring:{wert:Math.round(used),von:Math.round(o.eink)||0,label:'verplant'},
    balken:E.map(x=>({l:x.c.name.slice(0,12),wert:Math.round(x.sp),von:Math.round(x.c.budget),einheit:'€',farbe:x.c.farbe})),
    zeilen:o.T.filter(t=>t.art!=='ein').slice(0,4).map(t=>({t:t.notiz||cName(t.kat),sub:Math.round(t.betrag)+' € · '+(t.datum===td?'heute':+t.datum.slice(8)+'.'+ +t.datum.slice(5,7)+'.'),farbe:cCol(t.kat)})),leer:'Noch keine Ausgaben in diesem Monat'};
  if(!s.ring.von) delete s.ring;
  fetch('/api/sum_haushalt',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)}).catch(()=>{}); }
function stamp(){ const el=$('saved'); if(el) el.textContent=D.savedAt?'gespeichert '+new Date(D.savedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'noch nichts gespeichert'; }
let toastT; function toast(m,undo){ const t=$('toast'); t.innerHTML=esc(m)+(undo?' <button id="undoBtn" style="border:0;background:none;color:inherit;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;padding:4px 6px;pointer-events:auto">Rückgängig</button>':''); t.style.pointerEvents=undo?'auto':''; t.classList.add('show'); clearTimeout(toastT);
  if(undo) $('undoBtn').onclick=()=>{ undo(); t.classList.remove('show'); };
  toastT=setTimeout(()=>t.classList.remove('show'),undo?5000:2600); }
function setTheme(th){ document.documentElement.setAttribute('data-theme',th); try{ localStorage.setItem('haushalt_theme',th); }catch(e){} }

(function init(){
  try{ const th=localStorage.getItem('haushalt_theme'); if(th) document.documentElement.setAttribute('data-theme',th); view=localStorage.getItem('hb_view')||'monat'; }catch(e){}
  if(!['monat','buchungen','auswertung','plan'].includes(view)) view='monat';
  load(); if(location.hash!=='#hintergrund') bookFix(); render(); setTimeout(pushSum,1500);
  if(window.__PI_SYNC) $('homeBtn').hidden=false;
  $('themeBtn').onclick=()=>{ const dark=document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches); setTheme(dark?'light':'dark'); };
  $('dataBtn').onclick=()=>{ sheet={m:'data'}; drawSheet(); show(); };
  if(location.hash==='#neu'){ history.replaceState(null,'',location.pathname); view='monat'; mon=ym(today()); render(); openTx({betrag:0,art:'aus',kat:'',notiz:'',datum:today()},true); }
  window.addEventListener('storage',e=>{ if(e.key!==KEY||!e.newValue) return; let x=null; try{ x=JSON.parse(e.newValue); }catch(_){} if(!x) return; D=normalize(x);
    if(!sheet&&!(document.activeElement&&document.activeElement.matches('input,select,textarea')&&document.activeElement.value)) render(); });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&!sheet){ bookFix(); render(); } });
})();
