/* ---------- Kleinkram ---------- */
function stamp(){ $('saved').textContent=D.savedAt?'Gespeichert '+fHM(D.savedAt):'Noch nichts gespeichert'; }
let toastT=null;
function toast(m,ms,gold){ const t=$('toast'); t.textContent=m; t.classList.toggle('gold',!!gold); t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),ms||2600); }
/* Uhren: nur Text austauschen, nicht neu zeichnen (Eingaben und Fokus bleiben) */
function tick(){ const now=Date.now();
  document.querySelectorAll('[data-tick]').forEach(e=>{ const v=fClock((now-+e.dataset.tick)/1000); if(e.textContent!==v) e.textContent=v; });
  document.querySelectorAll('[data-dauer]').forEach(e=>{ const v=fDauer(now-+e.dataset.dauer); if(e.textContent!==v) e.textContent=v; }); }
setInterval(tick,500);
const curT=()=>tId&&D.trainings[tId]&&!D.trainings[tId].del?trN(D.trainings[tId]):null;
/* Zweimal tippen statt Bestätigungsdialog */
function armed(b,txt){ if(b.dataset.arm) return true; b.dataset.arm='1'; const o=b.textContent; b.textContent=txt||'Wirklich?'; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.arm; b.textContent=o; } },3000); return false; }
function show(v){ view=v; if(v!=='fortschritt') progU=null; render(); scrollTo(0,0); }
function oeffne(id){ tId=id; view='training'; render(); scrollTo(0,0); }
function starte(vid){ const run=laufend(); if(run){ toast('Es läuft schon ein Training – erst beenden'); return oeffne(run.id); }
  const t=neuesTraining(vid||null); oeffne(t.id); }
function prToast(t,i){ const p=prOf(t)[i]; if(!p) return; const s=t.saetze[i];
  toast((p==='kg'?'Neues Bestgewicht: ':'Neues bestes 1RM: ')+uName(s.uebung,t)+' '+(p==='kg'?fkg(s.kg)+' kg':'≈ '+fmt(e1(s),1)+' kg'),3500,true); }
const wert=id=>{ const e=$(id); return e?num(e.value):null; };
function holeSatz(pre){ const kg=wert(pre+'Kg'), wdh=wert(pre+'Wdh'), n=$(pre+'Notiz');
  if(wdh==null||wdh<=0){ toast('Bitte Wiederholungen eintragen'); const e=$(pre+'Wdh'); if(e) e.focus(); return null; }
  if(kg!=null&&kg<0){ toast('Gewicht kann nicht negativ sein'); return null; }
  return {kg,wdh,notiz:n?n.value.trim():''}; }
function zeigeUebung(u){ requestAnimationFrame(()=>{ const e=document.getElementById('u-'+u); if(e) e.scrollIntoView({block:'nearest',behavior:'smooth'}); }); }
function nimmUebung(t,u){ if(!t.reihe.includes(u)) t.reihe.push(u); t.namen[u]=uName(u);
  if(!t.ende&&t.lauf&&(!t.lauf.uebung||!t.reihe.includes(t.lauf.uebung))) t.lauf.uebung=u;
  put('trainings',t); save(); closeSheet(); render(); zeigeUebung(u); }
function uSpeichern(name,gruppe,id){ name=name.trim(); if(!name){ toast('Bitte einen Namen eingeben'); return null; }
  const dup=uebungen().find(u=>norm(u.name)===norm(name)&&u.id!==id); if(dup){ toast('„'+dup.name+'“ gibt es schon'); return null; }
  const o=id&&D.uebungen[id]?D.uebungen[id]:{id:uid('u')}; return put('uebungen',{...o,name,gruppe:GRUPPEN.includes(gruppe)?gruppe:'Sonstiges',del:undefined}); }

/* ---------- Klicks ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('button,[data-v]'); if(!b) { if(e.target===$('ov')) closeSheet(); return; }
  const ds=b.dataset, t=curT();
  if(b.closest('.nav')&&ds.v){ show(ds.v); return; }
  if('v' in ds&&!b.closest('.nav')){ show(ds.v); return; }
  if('start' in ds){ closeSheet(); starte(ds.start); return; }
  if(ds.open){ oeffne(ds.open); return; }
  if('prog' in ds){ progU=ds.prog||null; view='fortschritt'; render(); scrollTo(0,0); return; }
  if(ds.close){ closeSheet(); return; }
  if(ds.ziel!=null){ setS(s=>s.wochenziel=+ds.ziel); render(); return; }
  if(ds.schritt!=null){ setS(s=>s.schritt=+ds.schritt); render(); return; }
  if(ds.step){ const [id,dir]=ds.step.split('|'), inp=$(id); if(!inp) return; const kg=/Kg$/.test(id), st=kg?(+D.set.schritt||2.5):1;
    let v=num(inp.value); if(v==null) v=0; v=dir==='+'?v+st:v-st; v=Math.max(0,kg?Math.round(v/st)*st:Math.round(v)); v=rk(v);
    inp.value=String(v).replace('.',','); return; }
  if(b.id==='dataBtn'){ openSheet({m:'data'}); return; }
  if(ds.exp){ exportJSON(); return; }
  if(ds.imp){ $('impFile').click(); return; }
  /* Timer */
  if(t&&ds.go){ satzStart(t,ds.go); render(); return; }
  if(t&&ds.fertig){ satzFertig(t); render(); const k=$('eWdh'); if(k&&!matchMedia('(pointer:coarse)').matches) k.focus(); return; }
  if(t&&ds.abbr){ satzAbbrechen(t); render(); return; }
  if(t&&ds.ssave){ const L=t.lauf; if(!L||L.phase!=='eingabe') return; const x=holeSatz('e'); if(!x) return;
    const i=satzSpeichern(t,L.uebung,x.kg,x.wdh,x.notiz); render(); prToast(t,i); return; }
  if(t&&ds.sverw){ const L=t.lauf; if(!L) return; t.lauf={phase:letzterSatz(t)?'pause':null,seit:L.seit,uebung:L.uebung}; put('trainings',t); save(); render(); return; }
  if(t&&ds.cur){ if(t.ende||!t.lauf||t.lauf.phase==='satz'||t.lauf.phase==='eingabe') return; t.lauf.uebung=ds.cur; put('trainings',t); save(); render(); return; }
  if(t&&ds.tend){ const L=t.lauf||{}; if(L.phase==='satz'||L.phase==='eingabe'){ if(!armed(b,L.phase==='satz'?'Satz läuft – trotzdem?':'Satz nicht gespeichert – trotzdem?')) return; }
    const n=t.saetze.length, ok=beenden(t); if(!ok){ tId=null; show('start'); toast('Leeres Training verworfen'); return; }
    render(); scrollTo(0,0); toast('Training beendet · '+n+' '+(n===1?'Satz':'Sätze')+' · '+fDauer(dauer(t))); return; }
  if(t&&ds.tdel){ if(!armed(b,'Wirklich löschen?')) return; rm('trainings',t.id); save(); tId=null; show('verlauf'); toast('Training gelöscht'); return; }
  if(t&&ds.unote){ const u=ds.unote; noteOpen[u]=!noteOpen[u]||!!t.uebNotiz[u]; render(); const i=document.querySelector(`[data-unotein="${CSS.escape(u)}"]`); if(i) i.focus(); return; }
  if(t&&ds.urm){ const u=ds.urm; if(satzVon(t,u).length) return; t.reihe=t.reihe.filter(x=>x!==u); delete t.uebNotiz[u];
    if(t.lauf&&t.lauf.uebung===u) t.lauf.uebung=t.reihe[0]||null; put('trainings',t); save(); render(); return; }
  if(t&&ds.uadd){ openSheet({m:'uadd',t:t.id,q:''}); const q=$('uq'); if(q&&!matchMedia('(pointer:coarse)').matches) q.focus(); return; }
  if(t&&ds.upick){ nimmUebung(t,ds.upick); return; }
  if(t&&ds.unew){ const u=uSpeichern(sheet.q||'',($('ugr')||{}).value); if(!u) return; save(); nimmUebung(t,u.id); toast('„'+u.name+'“ angelegt'); return; }
  if(t&&ds.sadd){ openSheet({m:'satz',t:t.id,u:ds.sadd}); return; }
  if(t&&ds.sedit!=null){ openSheet({m:'satz',t:t.id,i:+ds.sedit}); return; }
  if(t&&ds.sok&&sheet&&sheet.m==='satz'){ const x=holeSatz('s'); if(!x) return;
    if(sheet.i!=null){ const s=t.saetze[sheet.i]; if(!s) return closeSheet(); s.kg=x.kg==null?0:rk(x.kg); s.wdh=Math.round(x.wdh); if(x.notiz) s.notiz=x.notiz; else delete s.notiz;
      put('trainings',t); save(); closeSheet(); render(); return; }
    const L=t.lauf, keep=L&&(L.phase==='satz'||L.phase==='eingabe')?{...L}:null;
    const i=satzSpeichern(t,sheet.u,x.kg,x.wdh,x.notiz); if(keep){ t.lauf=keep; put('trainings',t); save(); }
    closeSheet(); render(); prToast(t,i); return; }
  if(t&&ds.sdel&&sheet&&sheet.m==='satz'&&sheet.i!=null){ if(!armed(b,'Wirklich löschen?')) return; const s=t.saetze[sheet.i]; if(!s) return closeSheet();
    t.saetze.splice(sheet.i,1); renum(t,s.uebung); put('trainings',t); save(); closeSheet(); render(); toast('Satz gelöscht'); return; }
  if(t&&ds.tedit){ openSheet({m:'tedit',t:t.id}); return; }
  if(t&&ds.tsave){ const n=$('tn').value.trim()||'Training', d=$('td').value||t.datum, st=$('ts').value, en=$('te')?$('te').value:null;
    const at=(k,hm)=>new Date(k+'T'+(hm||'00:00')).getTime(); let s=st?at(d,st):t.start, x=t.ende;
    if(t.ende&&en){ x=at(d,en); if(x<s) x+=864e5; }
    if(!t.ende&&s>Date.now()){ toast('Ein laufendes Training kann nicht in der Zukunft beginnen'); return; }
    Object.assign(t,{name:n,datum:d,start:s,ende:x}); put('trainings',t); save(); closeSheet(); render(); return; }
  if(t&&ds.tvorl){ const v0=t.vorlage&&D.vorlagen[t.vorlage]&&!D.vorlagen[t.vorlage].del?D.vorlagen[t.vorlage]:null;
    openSheet({m:'vedit',v:{id:v0?v0.id:'',name:v0?v0.name:t.name,uebungen:t.reihe.filter(id=>UE(id))}}); return; }
  /* Vorlagen */
  if('vedit' in ds){ const v=ds.vedit&&D.vorlagen[ds.vedit]; openSheet({m:'vedit',v:v?{id:v.id,name:v.name,uebungen:(v.uebungen||[]).filter(id=>UE(id))}:{id:'',name:'',uebungen:[]}}); return; }
  if(sheet&&sheet.m==='vedit'){ const v=sheet.v; v.name=$('vn')?$('vn').value:v.name;
    if(ds.vmv){ const [i,d]=ds.vmv.split('|').map(Number), j=i+d; if(j<0||j>=v.uebungen.length) return; [v.uebungen[i],v.uebungen[j]]=[v.uebungen[j],v.uebungen[i]]; drawSheet(); return; }
    if(ds.vrm!=null){ v.uebungen.splice(+ds.vrm,1); drawSheet(); return; }
    if(ds.vsave){ const name=v.name.trim(); if(!name){ toast('Bitte einen Namen eingeben'); $('vn').focus(); return; }
      const o=v.id&&D.vorlagen[v.id]&&!D.vorlagen[v.id].del?D.vorlagen[v.id]:{id:uid('v'),ord:vorlagen().reduce((a,x)=>Math.max(a,x.ord??0),-1)+1};
      put('vorlagen',{...o,name,uebungen:v.uebungen.slice()}); save(); closeSheet(); render(); toast('Vorlage „'+name+'“ gespeichert'); return; }
    if(ds.vdel){ if(!armed(b,'Wirklich löschen?')) return; rm('vorlagen',v.id); save(); closeSheet(); render(); toast('Vorlage gelöscht'); return; } }
  /* Übungen */
  if('uedit' in ds){ openSheet({m:'uedit',id:ds.uedit||null}); if(!ds.uedit&&!matchMedia('(pointer:coarse)').matches) $('un').focus(); return; }
  if(sheet&&sheet.m==='uedit'){
    if(ds.usave){ const u=uSpeichern($('un').value,$('ug').value,sheet.id); if(!u) return; save(); closeSheet(); render(); return; }
    if(ds.udel){ if(!armed(b,'Wirklich löschen?')) return; const id=sheet.id; rm('uebungen',id);
      live('vorlagen').forEach(v=>{ if((v.uebungen||[]).includes(id)) put('vorlagen',{...v,uebungen:v.uebungen.filter(x=>x!==id)}); });
      save(); closeSheet(); render(); toast('Übung gelöscht – der Verlauf bleibt'); return; } }
});
/* Eingaben */
document.addEventListener('input',e=>{ const el=e.target;
  if(el.id==='uq'&&sheet&&sheet.m==='uadd'){ sheet.q=el.value; $('ures').innerHTML=uaddRes(sheet); return; } });
document.addEventListener('change',e=>{ const el=e.target, t=curT();
  if(el.id==='vadd'&&sheet&&sheet.m==='vedit'&&el.value){ sheet.v.name=$('vn').value; sheet.v.uebungen.push(el.value); drawSheet(); return; }
  if(t&&el.dataset.unotein){ const u=el.dataset.unotein, v=el.value.trim(); if(v) t.uebNotiz[u]=v; else { delete t.uebNotiz[u]; noteOpen[u]=false; } put('trainings',t); save(); return; }
  if(t&&el.dataset.tnotiz){ t.notiz=el.value.trim(); put('trainings',t); save(); return; }
  if(el.id==='impFile'&&el.files&&el.files[0]){ const f=el.files[0]; el.value=''; f.text().then(importJSON).catch(()=>toast('Datei nicht lesbar')); } });
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&sheet){ closeSheet(); return; }
  if(e.key==='Enter'&&e.target.matches('input.in')){
    if(sheet&&sheet.m==='uadd'&&e.target.id==='uq'){ const f=document.querySelector('#ures [data-upick],#ures [data-unew]'); if(f){ e.preventDefault(); f.click(); } return; }
    const ok=sheet?document.querySelector('#dlg [data-sok],#dlg [data-usave],#dlg [data-vsave],#dlg [data-tsave]'):(e.target.closest('.tim')?document.querySelector('[data-ssave]'):null);
    if(ok){ e.preventDefault(); e.target.blur(); ok.click(); } } });

/* ---------- Sicherung ---------- */
function exportJSON(){ const b=new Blob([JSON.stringify(D,null,1)],{type:'application/json'}), a=document.createElement('a');
  a.href=URL.createObjectURL(b); a.download='training-'+today()+'.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); toast('Backup gespeichert'); }
/* Einlesen = zusammenführen: pro Eintrag gewinnt der neuere Stand, nichts wird gelöscht, was nicht als gelöscht markiert ist */
function importJSON(txt){ let x; try{ x=JSON.parse(txt); }catch(e){ toast('Keine gültige JSON-Datei'); return; }
  if(!x||typeof x!=='object'||!(x.trainings||x.uebungen||x.vorlagen)){ toast('Das ist kein Training-Backup'); return; }
  let n=0; ['uebungen','vorlagen','trainings'].forEach(c=>{ const src=x[c]; if(!src||typeof src!=='object') return;
    Object.values(src).forEach(it=>{ if(!it||!it.id) return; const o=D[c][it.id]; if(!o||(+it.upd||0)>(+o.upd||0)){ D[c][it.id]=c==='trainings'?trN(it):it; n++; } }); });
  if(x.set&&(+x.set.upd||0)>(+D.set.upd||0)){ D.set=x.set; n++; }
  D=normalize(D); save(); closeSheet(); render(); toast(n?n+' Einträge übernommen':'Nichts Neues im Backup'); }

/* ---------- Kachel-Links: #start=<Vorlage>, #neu, #laeuft ---------- */
function hashGo(){ const h=location.hash; if(!h||h==='#hintergrund') return; let m;
  if((m=/^#start=(.+)$/.exec(h))){ history.replaceState(null,'',location.pathname); const id=decodeURIComponent(m[1]); const v=D.vorlagen[id];
    if(laufend()){ toast('Es läuft schon ein Training'); oeffne(laufend().id); return; }
    if(!v||v.del){ toast('Vorlage nicht gefunden'); show('start'); return; } starte(id); return; }
  if(h==='#neu'){ history.replaceState(null,'',location.pathname); starte(null); return; }
  if(h==='#laeuft'){ history.replaceState(null,'',location.pathname); const r=laufend(); if(r) oeffne(r.id); else show('start'); } }

function setTheme(th){ document.documentElement.setAttribute('data-theme',th); try{ localStorage.setItem('training_theme',th); }catch(e){} }

(function init(){
  try{ const th=localStorage.getItem('training_theme'); if(th) document.documentElement.setAttribute('data-theme',th); }catch(e){}
  load();
  if(location.hash!=='#hintergrund'){ const r=laufend(); if(r){ view='training'; tId=r.id; } }
  render(); hashGo(); setTimeout(pushSum,1500);
  if(window.__PI_SYNC){ $('homeBtn').hidden=false; $('piFoot').textContent=' und auf dem Pi'; }
  $('themeBtn').onclick=()=>{ const dark=document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches); setTheme(dark?'light':'dark'); };
  window.addEventListener('hashchange',hashGo);
  let rzT=null, rzW=innerWidth; window.addEventListener('resize',()=>{ if(innerWidth===rzW) return; rzW=innerWidth; clearTimeout(rzT); rzT=setTimeout(()=>{ if(view==='fortschritt'&&progU&&!sheet) render(); },200); });
  /* Neue Daten vom Pi oder aus einem anderen Tab: neu zeichnen, getippte Werte behalten */
  window.addEventListener('storage',e=>{ if(e.key!==KEY||!e.newValue) return; let x=null; try{ x=JSON.parse(e.newValue); }catch(_){} if(!x) return; D=normalize(x);
    if(sheet){ if(sheet.m==='data') drawSheet(); return; }
    const keep={}; document.querySelectorAll('#main input[id],#main textarea[data-tnotiz]').forEach(i=>keep[i.id||'tnotiz']=i.value); const f=document.activeElement&&document.activeElement.id;
    render(); Object.keys(keep).forEach(k=>{ const i=k==='tnotiz'?document.querySelector('[data-tnotiz]'):$(k); if(i) i.value=keep[k]; }); if(f&&$(f)) $(f).focus(); });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ tick(); if(!sheet&&!document.activeElement.matches('input,textarea,select')) render(); } });
})();
