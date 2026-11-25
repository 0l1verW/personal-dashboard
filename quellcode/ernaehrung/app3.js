/* ---------- Erfassen (Blatt) ---------- */
function openAdd(zeit,k){ sheet={m:'add',k:k||day,zeit:zeit||(day===today()?nowHM():'12:00'),q:'',tab:'alle',open:null,plate:[]}; drawSheet(); $('ov').classList.add('show'); setTimeout(()=>{ const s=$('q'); if(s&&innerWidth>640) s.focus(); },50); }
function closeSheet(){ if(sheet&&sheet.m==='add'&&sheet.plate.length&&!confirm('Der Teller ist noch nicht eingetragen. Trotzdem schließen?')) return; sheet=null; $('ov').classList.remove('show'); render(); }
const EVK=['kcal','p','kh','f','sfa'];   // direkt änderbare Werte bei Einträgen ohne Lebensmittel (Schnell-Eintrag, Foto)
function drawSheet(){ const s=sheet, d=$('dlg'); if(!s) return;
  if(s.m==='add'){ d.innerHTML=`<div class="dh"><h3 id="dlgT">Eintragen</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><div class="when">für <input class="in" type="date" id="sk" value="${s.k}" aria-label="Datum"> um <input class="in" type="time" id="sz" value="${s.zeit}" aria-label="Uhrzeit"></div>
      <div class="srow"><div class="srch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input class="in" id="q" type="search" placeholder="Lebensmittel, Rezept oder Barcode-Nummer …" value="${esc(s.q)}" autocomplete="off" aria-label="Suchen"></div>${SCAN_OK()?`<button class="ibtn" data-scan="add" aria-label="Barcode fotografieren" title="Barcode fotografieren">${CAM}</button>`:''}</div>
      <div class="chips">${[['alle','Alle'],['zuletzt','Zuletzt'],['eigen','Eigene'],['rezepte','Rezepte']].map(([k,l])=>`<button class="chip${s.tab===k?' on':''}" data-stab="${k}">${l}</button>`).join('')}
        <span style="flex:1"></span><button class="btn sm" data-quick="1">Schnell-Eintrag</button><button class="btn sm" data-fnew="add">+ Neu</button></div>
      <div id="res"></div></div>
    <div class="df" id="plate"></div>`; drawRes(); drawPlate(); return; }
  if(s.m==='quick'){ d.innerHTML=`<div class="dh"><h3 id="dlgT">Schnell-Eintrag</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><p class="cap">Für Mensa, Restaurant oder wenn du nur die Werte kennst.</p><div class="form"><label class="lbl w4">Bezeichnung<input class="in" id="qn" placeholder="z. B. Mensa: Linsencurry"></label>
      ${EVK.map(k=>`<label class="lbl">${NLX[k]} (${k==='kcal'?'kcal':'g'})<input class="in mono" id="q_${k}" inputmode="decimal"${k==='sfa'?' placeholder="optional"':''}></label>`).join('')}<label class="lbl">Menge (g)<input class="in mono" id="q_g" inputmode="decimal" placeholder="optional"></label></div>
      <p class="cap">Mit Menge lässt sich der Eintrag später einfach umrechnen (z. B. halbe Portion).</p></div>
    <div class="df"><button class="btn" data-back="1">Zurück</button><span style="flex:1"></span><button class="btn pri" data-quickgo="1">Auf den Teller</button></div>`; setTimeout(()=>$('qn').focus(),30); return; }
  if(s.m==='food'){ const f=s.id?D.foods[s.id]:(s.copy?food(s.copy):null), j=(f&&f.je100)||{}, por=(f&&f.portionen&&f.portionen[0])||{};
    const row=(k,sub)=>`<div class="nr${sub?' sub':''}"><span>${NLX[k]} (${k==='kcal'?'kcal':'g'})</span><input class="in" id="n_${k}" inputmode="decimal" value="${j[k]!=null?String(j[k]).replace('.',','):''}" aria-label="${NLX[k]} je 100 g"></div>`;
    d.innerHTML=`<div class="dh"><h3 id="dlgT">${s.id?'Lebensmittel bearbeiten':'Neues Lebensmittel'}</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><div class="form"><label class="lbl w2">Name<input class="in" id="fn" value="${esc(f?f.name+(s.copy?'':''):'')}" placeholder="z. B. Haferflocken kernig"></label><label class="lbl">Marke<input class="in" id="fm" value="${esc((f&&f.marke)||'')}"></label>
      <label class="lbl">Barcode (EAN)<span class="srow"><input class="in mono" id="fe" inputmode="numeric" value="${esc((f&&f.ean)||s.ean||'')}">${SCAN_OK()?`<button type="button" class="x" data-scan="food" aria-label="Barcode fotografieren" title="Barcode fotografieren">${CAM}</button>`:''}</span></label></div>
      <label class="sent" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="ffl" ${f&&f.fl?'checked':''} style="width:20px;height:20px;accent-color:var(--accent)"> Getränk (Angaben je 100 ml, zählt zum Trinken)</label>
      <div class="cap">Nährwerte je 100 g bzw. 100 ml – in der Reihenfolge wie auf der Packung:</div>
      <div class="nk"><div class="nr"><span>Nährwert</span><span style="text-align:right">je 100 g</span></div>${row('kcal')}${row('f')}${row('sfa',1)}${row('kh')}${row('zucker',1)}${row('bal')}${row('p')}${row('salz')}</div>
      <div class="form"><label class="lbl w2">Portion (optional)<input class="in" id="pl" value="${esc(por.l||'')}" placeholder="z. B. 1 Riegel"></label><label class="lbl w2">Gramm je Portion<input class="in mono" id="pg" inputmode="decimal" value="${por.g!=null?String(por.g).replace('.',','):''}"></label></div></div>
    <div class="df">${s.back?'<button class="btn" data-back="1">Zurück</button>':''}<span style="flex:1"></span><button class="btn pri" data-fsave="1">Speichern</button></div>`; setTimeout(()=>$('fn').focus(),30); return; }
  if(s.m==='edit'){ const e=D.log[s.id], f=food(e.ref); s.base=null;
    d.innerHTML=`<div class="dh"><h3 id="dlgT">${esc(e.name)}</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><div class="amt" style="border:0;border-radius:12px"><div class="row"><input class="in gin" id="eg" inputmode="decimal" value="${e.g>0?String(e.g).replace('.',','):''}"${f?'':' placeholder="–"'} aria-label="Menge${f?'':' (optional)'}"><span>${unitOf(e)}${f?'':' <span class="cap">(optional)</span>'}</span>
      ${f?(f.portionen||[]).map(p=>`<button class="chip" data-pg="${p.g}">${esc(p.l)} (${fmt(p.g)} ${unitOf(e)})</button>`).join(''):''}</div><div class="live" id="elive"></div></div>
      <label class="sent" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="efl" ${e.fl?'checked':''} style="width:20px;height:20px;accent-color:var(--accent)"> Getränk (Menge in ml, zählt zum Trinken${e.n&&+e.n.alk>0?' – mit Alkohol nicht':''})</label>
      <div class="when">am <input class="in" type="date" id="ek" value="${e.datum}" aria-label="Datum"> um <input class="in" type="time" id="ez" value="${e.zeit}" aria-label="Uhrzeit"></div>
      <label class="lbl">Bezeichnung<input class="in" id="en" value="${esc(e.name)}"></label>
      ${f&&f.quelle==='eigen'?`<div class="fref"><span>Werte kommen aus deinem Lebensmittel „${esc(f.name)}“ (${fmt(f.je100.kcal)} kcal je 100 ${unitOf(f)}).</span><button class="btn sm" data-fedit="${esc(f.id)}">Nährwerte bearbeiten</button></div>`:''}
      ${f?'':`<div class="form">${EVK.map(k=>`<label class="lbl">${NLX[k]} (${k==='kcal'?'kcal':'g'})<input class="in mono" id="ev_${k}" inputmode="decimal" value="${e.n&&e.n[k]!=null?String(e.n[k]).replace('.',','):''}"></label>`).join('')}</div><p class="cap">${e.quelle==='foto'?'Foto-Schätzung':'Schnell-Eintrag'}: Werte direkt korrigieren. Die Menge ist freiwillig – steht eine drin, rechnet eine neue Menge die Werte mit.</p>`}</div>
    <div class="df"><button class="btn dng" data-edel="1">Löschen</button><button class="btn" data-edup="1">Duplizieren</button><span style="flex:1"></span><button class="btn pri" data-esave="1">Speichern</button></div>`; liveEdit(); return; }
  if(s.m==='recipe'){ const r=s.r;
    d.innerHTML=`<div class="dh"><h3 id="dlgT">Rezept</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><div class="form"><label class="lbl w4">Name<input class="in" id="rn" value="${esc(r.name)}" placeholder="z. B. Overnight Oats"></label>
      <label class="lbl w2">Portionen<input class="in mono" id="rp" inputmode="numeric" value="${r.portionen||1}"></label><label class="lbl w2">Gewicht fertig (g, optional)<input class="in mono" id="rg" inputmode="decimal" value="${r.gesamtG||''}" placeholder="${fmt((r.zutaten||[]).reduce((t,z)=>t+(+z.g||0),0))}"></label></div>
      <div class="cap">Gewicht fertig: z. B. nach dem Kochen abwiegen. Leer = Summe der Zutaten.</div>
      <div class="lst">${(r.zutaten||[]).map((z,i)=>`<div class="li"><div><div class="n">${esc(z.name)}</div><div class="s">${fmt(scale(z.n100,z.g).kcal)} kcal</div></div><span style="display:flex;align-items:center;gap:4px"><input class="in mono" style="width:80px;text-align:right" data-zg="${i}" inputmode="decimal" value="${String(z.g).replace('.',',')}" aria-label="Gramm"> g</span><button class="x" data-zrm="${i}" aria-label="Zutat entfernen">×</button></div>`).join('')}</div></div>
    <div class="df">${r.id&&D.recipes[r.id]?'':''}<span style="flex:1"></span><button class="btn pri" data-rsave="1">Rezept speichern</button></div>`; return; }
  if(s.m==='info'){ const f=food(s.id); if(!f){ sheet=null; $('ov').classList.remove('show'); return; } const j=f.je100;
    const tr=(l,k,u,d)=>`<tr><td>${l}</td><td>${j[k]!=null?fmt(j[k],d)+' '+u:'<span class="cap">k. A.</span>'}</td></tr>`;
    d.innerHTML=`<div class="dh"><h3 id="dlgT">${esc(f.name)}</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><table class="nt"><tr class="h"><td>je 100 g</td><td></td></tr>${tr('Energie','kcal','kcal',0)}${tr('Fett','f','g',1)}${tr('davon gesättigt','sfa','g',1)}${tr('Kohlenhydrate','kh','g',1)}${tr('davon Zucker','zucker','g',1)}${tr('Ballaststoffe','bal','g',1)}${tr('Eiweiß','p','g',1)}${tr('Salz','salz','g',2)}${tr('Omega-3','o3','g',2)}${tr('Alkohol','alk','g',1)}
      <tr class="h"><td>Vitamine &amp; Mineralstoffe</td><td></td></tr>${MIK.map(k=>tr(MI[k][0],k,MI[k][1],j[k]<1?3:j[k]<10?2:1)).join('')}</table>
      <p class="src">k. A. = kein Wert in den Daten (nicht 0).${f.quelle==='bls'?' BLS-Code '+esc(f.code)+'. ':f.bls?' Mikros aus BLS '+esc(f.bls)+'. ':' '}${f.quelle==='bls'||f.bls?BLS_SRC:''}</p></div>
    <div class="df"><span style="flex:1"></span><button class="btn" data-fcopy="${esc(f.id)}">Anpassen</button></div>`; return; }
  if(s.m==='health'){ const h=s.h, url=h&&h.token?location.origin+'/api/import_'+h.token:'', l=h&&h.letzte;
    d.innerHTML=`<div class="dh"><h3 id="dlgT">Garmin / Apple Health</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><p class="cap">Das iPhone schickt die aktiven Kalorien des Tages per Kurzbefehl an den Pi – nur im Heim-WLAN. Der Pi geht dafür nicht ins Internet und braucht kein Garmin-Konto.</p>
      ${!h?'<div class="empty">Adresse wird geladen …</div>':h.err?'<div class="note">Die Adresse konnte nicht geladen werden. Dafür muss die Seite vom Pi geöffnet sein und du brauchst Schreibrechte für „Ernährung“.</div>'
      :`<div class="urlbox"><code>${esc(url)}</code><button class="btn sm" data-hcopy="${esc(url)}">Kopieren</button></div>
      <ol class="steps">
        <li><b>Garmin Connect</b> (iPhone): in den Einstellungen unter den verbundenen Apps <b>Apple Health</b> einschalten und „Aktive Energie“ freigeben (auf Wunsch auch „Gewicht“).</li>
        <li><b>Kurzbefehle</b> → neuer Kurzbefehl mit drei Aktionen:<br>1. <b>Health-Messungen suchen</b> – Typ „Aktive Energie“, Filter „Startdatum ist heute“.<br>2. <b>Statistiken berechnen</b> – „Summe“.<br>3. <b>Inhalte von URL abrufen</b> – die Adresse oben, Methode <b>POST</b>, Anfragetext <b>JSON</b> mit den Feldern <code>aktiv</code> = Ergebnis der Summe und <code>datum</code> = „Aktuelles Datum“ (Format ISO 8601).</li>
        <li><b>Automation</b> → „Tageszeit“, z. B. 21:30 und 23:50, „Sofort ausführen“. Du kannst den Kurzbefehl auch jederzeit von Hand starten.</li>
      </ol>
      <div class="note">Jeder Lauf <b>ersetzt</b> den Tageswert – nichts wird doppelt gezählt. Unterwegs (kein Heim-WLAN) passiert einfach nichts. Das Datum kommt vom iPhone, weil der Pi ohne Internet keine verlässliche Uhr hat; fehlt es, gilt das Datum des Pi. Zum Nachtragen geht auch <code>datum</code> = „gestern“. Optional: <code>kg</code> (Gewicht; überschreibt kein von Hand eingetragenes).<br>
        ${l?`Letzter Import: ${new Date(l.ts).toLocaleString('de-DE')} – ${l.aktiv!=null?fmt(l.aktiv)+' kcal':''}${l.kg!=null?' · '+fmt(l.kg,1)+' kg':''} für den ${kDate(l.datum).toLocaleDateString('de-DE')}.`:'Noch kein Import angekommen.'}</div>
      <p class="cap">Wer die Adresse kennt, kann im Heimnetz Sport-Kalorien eintragen – mehr nicht. <button class="btn sm" data-hneu="1">Neue Adresse erzeugen</button></p>`}</div>`; return; }
  if(s.m==='data'){ d.innerHTML=`<div class="dh"><h3 id="dlgT">Daten &amp; Backup</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><p class="cap">Alles liegt im Browser${window.__PI_SYNC?' und auf dem Raspberry Pi (pro Eintrag abgeglichen)':''}. Eine JSON-Sicherung kannst du jederzeit wieder einlesen.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-exp="1">JSON-Backup speichern</button><button class="btn" data-imp="1">Backup einlesen</button></div>
      <div class="note">${live('log').length} Einträge · ${live('foods').length} eigene Lebensmittel · ${live('recipes').length} Rezepte · ${live('weight').length} Gewichtswerte<br>Zuletzt gespeichert: ${D.savedAt?new Date(D.savedAt).toLocaleString('de-DE'):'noch nie'}</div>
      <p class="cap">Die Grundliste enthält gerundete Standardwerte, keine Herstellerangaben. Für Markenprodukte lieber die Packungswerte als eigenes Lebensmittel anlegen.</p>
      <p class="cap">${BLS?`Lebensmitteldatenbank geladen: ${BLS.length.toLocaleString('de-DE')} Einträge aus dem ${BLS_SRC} Die Datei liegt auf dem Pi, es wird nichts aus dem Internet geladen.`:'Die BLS-Datenbank (rund 7.000 Lebensmittel mit Vitaminen und Mineralstoffen) steht zur Verfügung, wenn die Seite vom Pi geöffnet wird.'}</p></div>`; return; }
}
function drawRes(){ const s=sheet, el=$('res'); if(!el) return; const R=search(s.q,s.tab), u=usage();
  if(!R.length){ el.innerHTML=/^\d{8,14}$/.test(s.q.trim())?`<div class="empty">Diese Barcode-Nummer ist noch unbekannt. <button class="btn sm pri" data-fnew="ean">Mit Nummer anlegen</button></div>`
    :`<div class="empty">${s.q?'Nichts gefunden.':s.tab==='zuletzt'?'Noch nichts eingetragen.':'Noch leer.'} <button class="btn sm" data-fnew="add">+ Neues Lebensmittel</button> <button class="btn sm" data-quick="1">Schnell-Eintrag</button></div>`; return; }
  el.innerHTML=`<div class="res">${R.map(f=>{ const op=s.open===f.id, pg=f.portionen&&f.portionen[0];
    return `<div class="rr"><button data-pick="${esc(f.id)}" aria-expanded="${op}"><span class="n">${esc(f.name)}${f.quelle==='eigen'?'<span class="tag own">eigen</span>':f.quelle==='rezept'?'<span class="tag own">Rezept</span>':f.quelle==='bls'?'<span class="tag bls">BLS</span>':''}${u[f.id]?`<span class="tag">${u[f.id].n}×</span>`:''}</span>
      <span class="s">${f.marke?esc(f.marke)+' · ':''}${pg?esc(pg.l)+' = '+fmt(pg.g)+' '+unitOf(f):'je 100 '+unitOf(f)}${isFl(f)?' · Getränk':''}</span><span class="k">${fmt(f.je100.kcal)} kcal<br>/100 ${unitOf(f)}</span></button>
      ${op?`<div class="amt"><div class="row"><input class="in gin" id="gIn" inputmode="decimal" value="${String(s.g).replace('.',',')}" aria-label="Menge in ${unitOf(f)==='ml'?'Millilitern':'Gramm'}"><span>${unitOf(f)}</span>${(f.portionen||[]).map(p=>`<button class="chip" data-pg="${p.g}">${esc(p.l)} (${fmt(p.g)} ${unitOf(f)})</button>`).join('')}${(f.portionen||[]).length?`<button class="chip" data-pg="100">100 ${unitOf(f)}</button>`:''}${isFl(f)?[250,500].filter(v=>!(f.portionen||[]).some(p=>p.g===v)).map(v=>`<button class="chip" data-pg="${v}">${v} ml</button>`).join(''):''}</div>
        <div class="live" id="live"></div><div class="row"><button class="btn pri" data-toplate="1">+ Auf den Teller</button><button class="btn" data-direct="1">Sofort eintragen</button>${f.quelle==='eigen'?`<span class="sp"></span><button class="btn sm" data-fedit="${esc(f.id)}">Bearbeiten</button>`:''}</div></div>`:''}</div>`; }).join('')}</div>`;
  liveAmt(); }
function liveAmt(){ const el=$('live'); if(!el||!sheet.open) return; const f=food(sheet.open), g=num($('gIn').value)||0, n=scale(f.je100,g);
  el.innerHTML=`= <b>${fmt(n.kcal)} kcal</b> · Eiweiß ${fmt(n.p,1)} g · KH ${fmt(n.kh,1)} g · Fett ${fmt(n.f,1)} g${n.sfa!=null?` (gesättigt ${fmt(n.sfa,1)} g)`:''}`; }
/* Eintrag bearbeiten. Mit Lebensmittel: Werte = Lebensmittel × Menge.
   Ohne Lebensmittel (Schnell-Eintrag/Foto): Bezug ist sheet.base = {g, n} – der Stand beim Öffnen bzw. nach der letzten Wert-Änderung.
   mode 'menge': neue Menge rechnet die Felder aus dem Bezug nach (nur wenn Bezug und neue Menge > 0, sonst bleiben die Felder stehen);
   mode 'wert':  Eingaben übernehmen und als neuen Bezug merken; ohne mode: nur lesen. Leere Felder gelten als „kein Wert“. */
function liveEdit(mode){ const e=D.log[sheet.id], f=food(e.ref), g=num($('eg').value)||0; let n;
  if(f) n=scale(f.je100,g);
  else { const b=sheet.base||(sheet.base={g:+e.g||0,n:{...(e.n||{})}}), sc=b.g>0&&g>0;
    n=sc?scaleN(b.n,g/b.g):{...b.n};
    EVK.forEach(k=>{ const i=$('ev_'+k); if(!i) return;
      if(mode==='menge'&&sc){ i.value=n[k]!=null?String(n[k]).replace('.',','):''; return; }
      const v=num(i.value); if(v!=null&&v>=0) n[k]=rK(k,v); else delete n[k]; });
    if(mode==='wert') sheet.base={g,n:{...n}}; }
  $('elive').innerHTML=`= <b>${fmt(n.kcal)} kcal</b> · Eiweiß ${fmt(n.p,1)} g · KH ${fmt(n.kh,1)} g · Fett ${fmt(n.f,1)} g`; return n; }
function scaleN(n,fac){ const o={}; ALLK.forEach(k=>{ if(n&&n[k]!=null) o[k]=rK(k,n[k]*fac); }); return o; }
function drawPlate(){ const el=$('plate'); if(!el) return; const P=sheet.plate, t=sumN(P);
  el.innerHTML=P.length?`<div class="plate">${P.map((p,i)=>`<div class="pi"><span class="n">${esc(p.name)}</span><span class="g">${p.g>0?fmt(p.g)+' '+unitOf(p)+' · ':''}${fmt(p.n.kcal)} kcal</span><button class="x" data-prm="${i}" aria-label="${esc(p.name)} vom Teller nehmen">×</button></div>`).join('')}</div>
    <span class="cap">Teller: <b>${fmt(t.kcal)} kcal</b> · P ${fmt(t.p)} · KH ${fmt(t.kh)} · F ${fmt(t.f)}</span><span style="flex:1"></span>${P.length>1?'<button class="btn" data-prec="1">Als Rezept speichern</button>':''}<button class="btn pri" data-commit="1">Eintragen (${P.length})</button>`
    :'<span class="cap">Lebensmittel antippen, Menge wählen, auf den Teller legen – dann alles zusammen eintragen.</span>'; }
function pickToItem(){ const f=food(sheet.open), g=num($('gIn').value); if(!f||!(g>0)){ toast(isFl(f)?'Menge in ml eintragen':'Menge in Gramm eintragen'); return null; }
  return {ref:f.id,name:f.name,g,n:scale(f.je100,g),quelle:f.quelle,...(isFl(f)?{fl:1}:{})}; }
function commitPlate(){ const s=sheet; if(!s.plate.length) return; const k=$('sk').value||s.k, z=$('sz').value||s.zeit;
  addEntries(s.plate,k,z); const n=s.plate.length; s.plate=[]; sheet=null; $('ov').classList.remove('show'); day=k; render(); toast(`${n} ${n===1?'Eintrag':'Einträge'} gespeichert`); }
function recipeFrom(items,name){ return {id:null,name:name||'',portionen:1,gesamtG:null,zutaten:items.map(it=>{ const f=food(it.ref); return {ref:it.ref,name:it.name,g:it.g,n100:f?{...f.je100}:scaleN(it.n,100/(it.g||100))}; })}; }

/* ---------- Ereignisse ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-v],[data-day],[data-add],[data-ent],[data-blk],[data-bcopy],[data-brec],[data-bdel],[data-dcopy],[data-water],[data-sugg],[data-rng],[data-apply],[data-keep],[data-ftab],[data-fnew],[data-fedit],[data-fdel],[data-fcopy],[data-redit],[data-rdel],[data-phase],[data-close],[data-stab],[data-quick],[data-quickgo],[data-back],[data-pick],[data-pg],[data-toplate],[data-direct],[data-prm],[data-prec],[data-commit],[data-fsave],[data-esave],[data-edel],[data-edup],[data-zrm],[data-rsave],[data-exp],[data-imp],[data-finfo],[data-scan],[data-bmove],[data-burn],[data-burnrm],[data-stil],[data-tp],[data-health],[data-hneu],[data-hcopy],[data-mikauf],[data-tkrm],[data-tkadd],[data-tkstd]');
  if(!t) return; const ds=t.dataset;
  if(ds.v){ view=ds.v; openBlk=null; try{ localStorage.setItem('er_view',view); }catch(_){} render(); return scrollTo(0,0); }
  if(ds.mikauf){ mikAuf=!mikAuf; try{ localStorage.setItem('essen_mikro_auf',mikAuf?'1':'0'); }catch(_){} render(); const b=document.querySelector('[data-mikauf]'); if(b) b.focus({preventScroll:true}); return; }   // Vitamine & Mineralstoffe auf-/zuklappen (nur dieses Gerät)
  if(ds.tkrm){ const v=+ds.tkrm, a=trinkKn().filter(x=>x!==v); if(!a.length){ toast('Mindestens ein Knopf bleibt'); return; } setS(s=>{ s.trinkKn=a; }); render(); return toast(`Knopf ${fMl(v)} entfernt`); }
  if(ds.tkadd){ const i=$('tkIn'), v=Math.round(num(i.value)||0); if(!(v>0&&v<=5000)){ toast('Menge in ml eintragen (1–5000)'); i.focus(); return; }
    const a=trinkKn(); if(a.includes(v)){ toast(`${fMl(v)} gibt es schon`); return; } if(a.length>=TRINK_MAX){ toast(`Höchstens ${TRINK_MAX} Knöpfe`); return; }
    setS(s=>{ s.trinkKn=[...a,v].sort((x,y)=>x-y); }); render(); const n=$('tkIn'); if(n) n.focus({preventScroll:true}); return toast(`Knopf ${fMl(v)} hinzugefügt`); }
  if(ds.tkstd){ setS(s=>{ s.trinkKn=TRINK_STD.slice(); }); render(); return toast('Trink-Knöpfe zurückgesetzt'); }
  if(ds.day!=null){ day=ds.day==='0'?today():kAdd(day,+ds.day); openBlk=null; return render(); }
  if(ds.add!=null) return openAdd(ds.add||undefined);
  if(ds.ent){ sheet={m:'edit',id:ds.ent}; drawSheet(); $('ov').classList.add('show'); return; }
  if(ds.blk){ openBlk=openBlk===ds.blk?null:ds.blk; return render(); }
  const blkE=H=>entriesOn(day).filter(x=>(x.zeit||'').slice(0,2)===H);
  if(ds.bcopy){ const [H,k]=ds.bcopy.split('|'), L=blkE(H); addEntries(L.map(x=>({ref:x.ref,name:x.name,g:x.g,n:x.n,quelle:x.quelle,fl:x.fl})),k,L[0].zeit); openBlk=null; render(); return toast(`${L.length} Einträge nach ${fDay(k).t.toLowerCase()} kopiert`); }
  if(ds.brec){ sheet={m:'recipe',r:recipeFrom(blkE(ds.brec))}; drawSheet(); $('ov').classList.add('show'); return; }
  if(ds.bmove){ const L=blkE(ds.bmove), t=$('bT').value, d=$('bD').value; if(!L.length||!t||!d) return; const sh=hm2m(t)-hm2m(L[0].zeit);
    L.forEach(x=>put('log',{...x,zeit:m2hm(hm2m(x.zeit)+sh),datum:d})); USE=null; save(); openBlk=null; if(d!==day) day=d; render(); return toast(d!==L[0].datum?`${L.length} ${L.length===1?'Eintrag':'Einträge'} verschoben`:'Uhrzeit geändert'); }   // Abstände im Block bleiben erhalten
  if(ds.bdel){ const L=blkE(ds.bdel); if(!confirm(`${L.length} Einträge um ${ds.bdel} Uhr löschen?`)) return; L.forEach(x=>rm('log',x.id)); USE=null; openBlk=null; save(); return render(); }
  if(ds.dcopy){ const [from,to]=ds.dcopy.split('|'), tgt=to||day, L=entriesOn(from); L.forEach(x=>put('log',{id:uid('e'),datum:tgt,zeit:x.zeit,ref:x.ref,name:x.name,g:x.g,n:x.n,quelle:x.quelle,...(x.fl?{fl:1}:{})})); USE=null; save(); day=tgt; render(); return toast(`${L.length} Einträge übernommen`); }
  if(ds.water){ const v=ds.water==='x'?Math.round(num($('wIn').value)||0):+ds.water; if(ds.water==='x'&&!(v>0&&v<=5000)){ toast('Menge in ml eintragen'); $('wIn').focus(); return; } if(v<0){ const W=waterOn(day).sort((a,b)=>b.upd-a.upd); if(W[0]) rm('water',W[0].id); } else put('water',{id:uid('w'),datum:day,zeit:nowHM(),ml:v}); save(); return render(); }
  if(ds.burn){ const v=Math.round(num($('bIn').value)||0); if(!(v>0&&v<10000)){ toast('Verbrannte Kalorien eintragen'); $('bIn').focus(); return; }
    put('burn',{id:uid('b'),datum:day,kcal:v,name:$('bNm').value.trim().slice(0,40)}); save(); render(); return toast(`${fmt(v)} kcal Sport eingetragen`); }
  if(ds.burnrm){ rm('burn',ds.burnrm); save(); return render(); }
  if(ds.sugg){ const [ref,g]=ds.sugg.split('|'), f=food(ref); addEntries([{ref,name:f.name,g:+g,n:scale(f.je100,+g),quelle:f.quelle,fl:isFl(f)}],day,day===today()?nowHM():'12:00'); render(); return toast(`${f.name} eingetragen`); }
  if(ds.rng){ rng=+ds.rng; return render(); }
  if(ds.apply){ const r=recommend(); if(!r) return; setS(s=>{ Object.assign(s.ziele,{kcal:r.kcal,p:r.p,kh:r.kh,f:r.f}); s.checkin={datum:today(),was:'übernommen: '+r.kcal+' kcal'}; }); render(); return toast('Neue Ziele übernommen'); }
  if(ds.keep){ setS(s=>{ s.checkin={datum:today(),was:'Ziele behalten'}; }); render(); return toast('Ziele bleiben – nächster Check-in in einer Woche'); }
  if(ds.ftab){ foodTab=ds.ftab; return render(); }
  if(ds.fnew!=null){ const back=ds.fnew==='add'||ds.fnew==='ean'; const prev=back?sheet:null; sheet={m:'food',back:prev,ean:ds.fnew==='ean'?prev.q.trim():''}; drawSheet(); $('ov').classList.add('show'); return; }
  if(ds.fedit){ const prev=sheet&&(sheet.m==='add'||sheet.m==='edit')?sheet:null; sheet={m:'food',id:ds.fedit,back:prev}; drawSheet(); $('ov').classList.add('show'); return; }   // aus „Eintragen“ oder einem Eintrag heraus: nach dem Speichern dorthin zurück
  if(ds.fcopy){ sheet={m:'food',copy:ds.fcopy}; drawSheet(); $('ov').classList.add('show'); return; }
  if(ds.finfo){ sheet={m:'info',id:ds.finfo}; drawSheet(); $('ov').classList.add('show'); return; }
  if(ds.fdel){ const f=D.foods[ds.fdel]; if(confirm(`„${f.name}“ löschen? Bereits eingetragene Mahlzeiten bleiben erhalten.`)){ rm('foods',f.id); save(); render(); } return; }
  if(ds.redit){ const r=JSON.parse(JSON.stringify(D.recipes[ds.redit])); sheet={m:'recipe',r}; drawSheet(); $('ov').classList.add('show'); return; }
  if(ds.rdel){ const r=D.recipes[ds.rdel]; if(confirm(`Rezept „${r.name}“ löschen?`)){ rm('recipes',r.id); save(); render(); } return; }
  if(ds.phase){ if(D.set.phase.art===ds.phase) return; let k0=G().kcal,k1; setS(s=>{ const o=phDelta(s.phase.art,s.phase.tempo); phaseSwitch(s,ds.phase); k1=shiftGoal(s,o,phDelta(s.phase.art,s.phase.tempo)); }); render(); return toast(`Kalorienziel ${fmt(k0)} → ${fmt(k1)} kcal`); }
  if(ds.stil){ setS(s=>{ s.makro={...(s.makro||{}),stil:ds.stil}; }); return render(); }
  if(ds.tp) return setTempo(+ds.tp);
  if(ds.health||ds.hneu){ if(ds.hneu&&!confirm('Neue Adresse erzeugen? Die alte gilt dann nicht mehr – der Kurzbefehl braucht die neue.')) return;
    const neu=!!ds.hneu; if(!neu){ sheet={m:'health',h:null}; drawSheet(); $('ov').classList.add('show'); }
    fetch('/api/gesundheit',neu?{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'}:{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(j=>{ if(sheet&&sheet.m==='health'){ sheet.h=j; drawSheet(); if(neu) toast('Neue Adresse erzeugt'); } })
      .catch(()=>{ if(sheet&&sheet.m==='health'){ sheet.h={err:1}; drawSheet(); } }); return; }
  if(ds.hcopy){ (navigator.clipboard?navigator.clipboard.writeText(ds.hcopy):Promise.reject()).then(()=>toast('Adresse kopiert')).catch(()=>prompt('Adresse kopieren:',ds.hcopy)); return; }
  if(ds.close) return closeSheet();
  if(ds.scan){ scanFor=ds.scan; zxLoad().catch(()=>{}); $('scanFile').click(); return; }
  if(!sheet) return;
  if(ds.stab){ sheet.tab=ds.stab; sheet.open=null; drawSheet(); return; }
  if(ds.quick){ sheet={m:'quick',back:sheet}; drawSheet(); return; }
  if(ds.back){ sheet=sheet.back; drawSheet(); return; }
  if(ds.quickgo){ const n={}; EVK.forEach(k=>{ const v=num($('q_'+k).value); if(v!=null&&v>=0) n[k]=rK(k,v); }); if(n.kcal==null){ toast('Mindestens die Kalorien eintragen'); $('q_kcal').focus(); return; }
    if(n.sfa!=null&&n.f!=null&&n.sfa>n.f+0.05){ toast('Gesättigte Fettsäuren können nicht über dem Fett liegen'); return; }
    const qg=num($('q_g').value), b=sheet.back; b.plate.push({ref:null,name:$('qn').value.trim().slice(0,60)||'Schnell-Eintrag',g:qg>0&&qg<5000?r1(qg):0,n,quelle:'schnell'}); sheet=b; drawSheet(); return; }
  if(ds.pick){ if(sheet.open===ds.pick){ sheet.open=null; return drawRes(); } sheet.open=ds.pick; sheet.g=defG(food(ds.pick)); drawRes(); const g=$('gIn'); if(g){ g.focus(); g.select(); } return; }
  if(ds.pg){ const g=$('gIn')||$('eg'); g.value=String(+ds.pg).replace('.',','); return sheet.m==='edit'?liveEdit('menge'):liveAmt(); }
  if(ds.toplate||ds.direct){ const it=pickToItem(); if(!it) return; sheet.plate.push(it); sheet.open=null; if(ds.direct) return commitPlate(); sheet.q=''; drawSheet(); const q=$('q'); if(q&&innerWidth>640) q.focus(); return; }
  if(ds.prm!=null){ sheet.plate.splice(+ds.prm,1); return drawPlate(); }
  if(ds.prec){ const items=sheet.plate.filter(p=>p.ref); sheet={m:'recipe',r:recipeFrom(items),back:sheet}; drawSheet(); return; }
  if(ds.commit) return commitPlate();
  if(ds.fsave){ const name=$('fn').value.trim(); if(!name){ toast('Bitte einen Namen eingeben'); return; } const je100={}; [...NUT,'sfa'].forEach(k=>{ const v=num($('n_'+k).value); if(v!=null) je100[k]=v; });
    if(je100.kcal==null){ toast('Mindestens die Kalorien je 100 g eintragen'); return; }
    if(je100.sfa!=null&&je100.f!=null&&je100.sfa>je100.f+0.05){ toast('Gesättigte Fettsäuren können nicht über dem Fett liegen'); return; }
    const src=sheet.id?D.foods[sheet.id]:sheet.copy?food(sheet.copy):null; if(src&&src.je100) MX.forEach(k=>{ if(k!=='sfa'&&src.je100[k]!=null) je100[k]=src.je100[k]; });   // Vitamine & Co. übernehmen
    const pg=num($('pg').value), pl=$('pl').value.trim(), ean=$('fe').value.replace(/\D/g,'');
    if(ean&&live('foods').some(f=>f.ean===ean&&f.id!==sheet.id)){ toast('Diese Barcode-Nummer gehört schon zu einem anderen Lebensmittel'); return; }
    const f=put('foods',{id:sheet.id||uid('f'),...(src&&src.quelle==='bls'?{bls:src.code}:src&&src.bls?{bls:src.bls}:{}),name,marke:$('fm').value.trim(),ean,fl:$('ffl').checked,je100,portionen:pg>0?[{l:pl||'Portion',g:pg}]:[]}); USE=null; save();
    if(sheet.back&&sheet.back.m==='edit'){ const b=sheet.back, e=D.log[b.id];   // aus einem Eintrag heraus bearbeitet: diesen Eintrag gleich mit den neuen Werten neu rechnen
      if(e&&!e.del&&e.ref===f.id&&e.g>0) put('log',{...e,n:scale(je100,e.g)}); USE=null; save(); sheet=b; drawSheet(); return toast('Lebensmittel gespeichert – Eintrag neu berechnet'); }
    if(sheet.back){ const b=sheet.back, neu=!sheet.id; b.q=f.ean||f.name; b.tab='alle'; b.open=f.id; b.g=sheet.id?(b.g||defG(food(f.id))):pg>0?pg:100; sheet=b; drawSheet(); return toast(neu?'Gespeichert – Menge wählen':'Lebensmittel gespeichert'); }   // Suche auf das Lebensmittel setzen, damit es sicher in der Liste steht
    sheet=null; $('ov').classList.remove('show'); foodTab='eigen'; render(); return toast('Lebensmittel gespeichert'); }
  if(ds.esave){ const e=D.log[sheet.id], f=food(e.ref), g=num($('eg').value);
    if(f&&!(g>0)){ toast('Menge eintragen'); $('eg').focus(); return; }
    if(g!=null&&!(g>=0&&g<5000)){ toast('Bitte eine Menge zwischen 0 und 5000 eintragen'); $('eg').focus(); return; }
    const n=liveEdit();
    if(!f&&n.kcal==null){ toast('Mindestens die Kalorien eintragen'); $('ev_kcal').focus(); return; }
    if(!f&&n.sfa!=null&&n.f!=null&&n.sfa>n.f+0.05){ toast('Gesättigte Fettsäuren können nicht über dem Fett liegen'); return; }
    const fl=$('efl').checked; put('log',{...e,name:($('en').value.trim()||e.name).slice(0,60),g:g>0?r1(g):0,n,fl:fl?1:0,datum:$('ek').value||e.datum,zeit:$('ez').value||e.zeit}); USE=null; save(); sheet=null; $('ov').classList.remove('show'); render(); return toast('Gespeichert'); }
  if(ds.edel){ rm('log',sheet.id); USE=null; save(); sheet=null; $('ov').classList.remove('show'); render(); return toast('Eintrag gelöscht'); }
  if(ds.edup){ const e=D.log[sheet.id]; put('log',{...e,id:uid('e'),zeit:day===today()?nowHM():e.zeit,datum:day}); save(); sheet=null; $('ov').classList.remove('show'); render(); return toast('Noch einmal eingetragen'); }
  if(ds.zrm!=null){ sheet.r.zutaten.splice(+ds.zrm,1); return drawSheet(); }
  if(ds.rsave){ const r=sheet.r; r.name=$('rn').value.trim(); if(!r.name){ toast('Bitte einen Namen für das Rezept'); return; } if(!(r.zutaten||[]).length){ toast('Das Rezept hat keine Zutaten'); return; }
    r.portionen=Math.max(1,Math.round(num($('rp').value)||1)); r.gesamtG=num($('rg').value)||null; if(!r.id) r.id=uid('r'); put('recipes',r); USE=null; save();
    if(sheet.back){ sheet=sheet.back; drawSheet(); return toast('Rezept gespeichert – findest du unter „Rezepte“'); }
    sheet=null; $('ov').classList.remove('show'); render(); return toast('Rezept gespeichert'); }
  if(ds.exp){ const b=new Blob([JSON.stringify(D,null,1)],{type:'application/json'}), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download='ernaehrung_'+today()+'.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1000); return toast('Backup gespeichert'); }
  if(ds.imp) return $('impFile').click();
});
function setTempo(v,soon){ let k0=G().kcal,k1; setS(s=>{ const o=phDelta(s.phase.art,s.phase.tempo); s.phase.tempo=v; k1=shiftGoal(s,o,phDelta(s.phase.art,v)); }); soon?renderSoon():render(); if(k1!==k0) toast(`Kalorienziel ${fmt(k0)} → ${fmt(k1)} kcal`); }
/* Foto-Schätzung (Skill „essen-foto“): Code „ESSEN1 [{…},…]“ ins Suchfeld einfügen → alle Teile landen auf dem Teller */
function fotoCode(s){ s=String(s||'').replace(/[“”„]/g,'"'); if(!/^\s*ESSEN1\b/i.test(s)) return null;
  const m=/^\s*ESSEN1\s*(\[[\s\S]*\]|\{[\s\S]*\})\s*$/i.exec(s); if(!m) return [];
  let x; try{ x=JSON.parse(m[1]); }catch(_){ return []; } if(!Array.isArray(x)) x=[x];
  return x.slice(0,20).filter(it=>it&&typeof it==='object'&&+it.kcal>=0).map(it=>{ const n={};
    ALLK.forEach(k=>{ const v=+it[k]; if(it[k]!=null&&it[k]!==''&&isFinite(v)&&v>=0&&v<20000) n[k]=rK(k,v); });
    const ml=+it.ml>0&&+it.ml<5000, g=ml?r1(it.ml):+it.g>0&&+it.g<5000?r1(it.g):0; return {ref:null,name:(String(it.t||it.name||'Foto-Schätzung').trim()||'Foto-Schätzung').slice(0,60),g,n,quelle:'foto',...(ml?{fl:1}:{})}; }); }
let fqT; document.addEventListener('input',e=>{ const el=e.target;
  if(el.id==='q'&&sheet&&sheet.m==='add'){ const F=fotoCode(el.value);
    if(F){ if(!F.length){ sheet.q=el.value; sheet.open=null; if(!sheet.fw){ sheet.fw=1; toast('Der Code ist unvollständig – bitte komplett kopieren und einfügen.',4000); } return; }   // Hinweis nur einmal, nicht bei jedem Tastendruck
      sheet.fw=0; sheet.plate.push(...F); sheet.q=''; sheet.open=null; drawSheet(); const k=F.reduce((t,p)=>t+(+p.n.kcal||0),0);
      return toast(`${F.length} ${F.length===1?'Teil':'Teile'} vom Foto auf dem Teller (${Math.round(k)} kcal) – prüfen, dann „Eintragen“`,4500); }
    sheet.fw=0; }
  if(el.id==='q'&&sheet){ sheet.q=el.value; sheet.open=null; return drawRes(); }
  if(el.id==='gIn') return liveAmt();
  if(el.id==='eg') return liveEdit('menge');
  if(/^ev_/.test(el.id)) return liveEdit('wert');
  if(el.id==='fq'){ fq=el.value; clearTimeout(fqT); fqT=setTimeout(()=>{ const l=$('flist'); if(l) l.innerHTML=blsList(); },150); return; }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&sheet) return closeSheet();
  if(e.key==='Enter'&&(e.target.id==='bIn'||e.target.id==='bNm')){ e.preventDefault(); const b=document.querySelector('[data-burn]'); if(b) b.click(); }
  if(e.key==='Enter'&&e.target.id==='tkIn'){ e.preventDefault(); const b=document.querySelector('[data-tkadd]'); if(b) b.click(); }
  if(e.key==='Enter'&&e.target.id==='wIn'){ e.preventDefault(); const b=document.querySelector('[data-water="x"]'); if(b) b.click(); }
  if(e.key==='Enter'&&e.target.id==='gIn'){ e.preventDefault(); const b=document.querySelector('[data-toplate]'); if(b) b.click(); }
  if(e.key==='Enter'&&e.target.id==='q'&&sheet){ e.preventDefault(); const R=search(sheet.q,sheet.tab); if(R.length===1||(/^\d{8,14}$/.test(sheet.q.trim())&&R.length)){ sheet.open=R[0].id; sheet.g=defG(R[0]); drawRes(); const g=$('gIn'); if(g){ g.focus(); g.select(); } } else if(!R.length&&/^\d{8,14}$/.test(sheet.q.trim())){ const b=document.querySelector('[data-fnew="ean"]'); if(b) b.click(); } }
});
document.addEventListener('change',e=>{ const el=e.target;
  if(el.id==='kgIn'){ const v=num(el.value); if(v==null){ rm('weight','w'+day); } else if(v<25||v>350){ toast('Bitte ein Gewicht in kg eintragen'); return; } else put('weight',{id:'w'+day,datum:day,kg:r1(v*10)/10}); save(); return renderSoon(); }
  if(el.id==='bcIn'){ const v=num(el.value); if(v==null){ rm('mass','m'+day); } else if(v<40||v>200){ toast('Bitte den Bauchumfang in cm eintragen'); return; } else put('mass',{id:'m'+day,datum:day,bauch:r1(v)}); save(); return renderSoon(); }
  if(el.dataset.goal){ const v=num(el.value); if(el.dataset.goal==='sfa'&&(v==null||v<=0)){ setS(s=>{ s.ziele.sfa=0; }); return renderSoon(); } if(v==null||v<0) return render(); setS(s=>{ s.ziele[el.dataset.goal]=Math.round(v); }); return renderSoon(); }
  if(el.dataset.prof==='sport'){ setS(s=>{ s.sport=+el.value; }); return renderSoon(); }
  if(el.dataset.prof){ const k=el.dataset.prof; setS(s=>{ s.profil[k]=k==='sex'?el.value:num(el.value); }); return renderSoon(); }
  if(el.dataset.tempo){ const v=num(el.value); if(v==null||v<0||v>1.5){ toast('Tempo zwischen 0 und 1,5 kg pro Woche'); return render(); } return setTempo(v,true); }
  if(el.dataset.zielkg){ const v=num(el.value); if(v!=null&&(v<25||v>350)){ toast('Bitte ein Zielgewicht in kg'); return render(); } setS(s=>{ s.phase.zielKg=v==null?null:r1(v); }); return renderSoon(); }
  if(el.dataset.pkg){ const v=num(el.value); if(v!=null&&(v<0.8||v>3.5)){ toast('Eiweiß zwischen 0,8 und 3,5 g je kg'); return render(); } setS(s=>{ s.makro={...(s.makro||{}),pkg:v}; }); return renderSoon(); }
  if(el.dataset.mikro){ setS(s=>{ s.mikro=el.checked; }); return render(); }
  if(el.dataset.fast){ setS(s=>{ if(el.dataset.fast==='on') s.fasten.on=el.checked; else { const v=num(el.value); if(v>=8&&v<=23) s.fasten.h=Math.round(v); } }); return el.dataset.fast==='on'?render():renderSoon(); }
  if(el.dataset.zg!=null&&sheet&&sheet.m==='recipe'){ const v=num(el.value); if(v>0) sheet.r.zutaten[+el.dataset.zg].g=v; return drawSheet(); }
  if(el.id==='sk'&&sheet) sheet.k=el.value; if(el.id==='sz'&&sheet) sheet.zeit=el.value;
  if(el.id==='scanFile'&&el.files[0]){ const file=el.files[0], to=scanFor; el.value=''; toast('Barcode wird gelesen …',60000);
    decodeBarcode(file).then(code=>gotCode(code,to)).catch(()=>toast('Der Barcode-Leser ist nur verfügbar, wenn die Seite vom Pi geöffnet wird.')); return; }
  if(el.id==='impFile'&&el.files[0]){ const r=new FileReader(); r.onload=()=>{ let x=null; try{ x=JSON.parse(r.result); }catch(_){}
      if(!x||x.app!==APP){ toast('Keine Ernährungs-Daten in der Datei'); return; }
      if(!confirm(`Backup vom ${x.savedAt?new Date(x.savedAt).toLocaleString('de-DE'):'?'} einlesen? Einträge werden zusammengeführt – nichts geht verloren.`)) return;
      ['log','foods','recipes','weight','water','burn','mass'].forEach(c=>Object.values(x[c]||{}).forEach(it=>{ const o=D[c][it.id]; if(!o||(+it.upd||0)>(+o.upd||0)) D[c][it.id]=it; }));
      if(x.set&&(+x.set.upd||0)>(+D.set.upd||0)) D.set=x.set; D=normalize(D); USE=null; save(); sheet=null; $('ov').classList.remove('show'); render(); toast('Backup eingelesen'); };
    r.readAsText(el.files[0]); el.value=''; }
});
$('ov').addEventListener('click',e=>{ if(e.target.id==='ov') closeSheet(); });
/* Nach einer Eingabe erst neu zeichnen, wenn kein Feld mehr den Fokus hat und kein Finger/Mausknopf unten ist.
   Sonst baut die Seite um, während man ins nächste Feld tippt – am Handy geht dann die Tastatur zu. */
let rPend=false, ptrDown=false;
function renderSoon(){ rPend=true; setTimeout(()=>{ if(!rPend||ptrDown||sheet) return; const a=document.activeElement;
  if(a&&a.matches&&a.matches('#main input,#main select,#main textarea')) return; rPend=false; render(); },60); }
document.addEventListener('focusout',()=>{ if(rPend) renderSoon(); });
document.addEventListener('pointerdown',()=>{ ptrDown=true; },true);
['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>{ ptrDown=false; if(rPend) renderSoon(); },true));

/* ---------- Dashboard-Kachel, Kleinkram ---------- */
function pushSum(){ if(!window.__PI_SYNC) return; const k=today(), t=sumN(entriesOn(k)), g=G(), w=waterSum(k), bud=budget(k);
  const s={v:1,savedAt:Date.now(),zahl:{wert:Math.round(t.kcal),von:bud,einheit:'kcal',label:bud!==g.kcal?'heute (inkl. Sport)':'heute',datum:k},ring:{wert:Math.round(t.kcal),von:bud,label:'kcal'},
    balken:[{l:'P',wert:Math.round(t.p),von:g.p,einheit:'g'},{l:'KH',wert:Math.round(t.kh),von:g.kh,einheit:'g'},{l:'F',wert:Math.round(t.f),von:g.f,einheit:'g'},{l:'H₂O',wert:r1(w/1000),von:r1(g.wasser/1000),einheit:'l',farbe:'#2C7BD6'}],ring2:{wert:r1(w/1000),von:r1(g.wasser/1000),einheit:'l',label:'Wasser',farbe:'#2C7BD6'},
    zeilen:entriesOn(k).slice(-5).reverse().map(e=>({t:e.name,sub:e.zeit+' · '+Math.round(e.n.kcal||0)+' kcal'})),leerHeute:'Heute noch nichts eingetragen'};
  fetch('/api/sum_essen',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)}).catch(()=>{}); }
function stamp(){ const el=$('saved'); if(el) el.textContent=D.savedAt?'gespeichert '+new Date(D.savedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'noch nichts gespeichert'; }
let toastT; function toast(m,ms){ const t=$('toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),ms||2600); }

/* ---------- Barcode per Foto: Erkennung lokal im Browser (ZXing liegt auf dem Pi unter /vendor, kein Internet) ---------- */
const CAM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M16 8v8"/></svg>';
const SCAN_OK=()=>!!window.__PI_SYNC;
let ZXP=null, scanFor=null;
function zxLoad(){ if(window.ZXing) return Promise.resolve(window.ZXing); if(ZXP) return ZXP;
  return ZXP=new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='/vendor/zxing.min.js'; s.onload=()=>window.ZXing?ok(window.ZXing):no(new Error('ZXing fehlt')); s.onerror=e=>{ ZXP=null; no(e); }; document.head.appendChild(s); }); }
function loadImg(file){ return new Promise((ok,no)=>{ const u=URL.createObjectURL(file), i=new Image(); i.onload=()=>{ URL.revokeObjectURL(u); ok(i); }; i.onerror=e=>{ URL.revokeObjectURL(u); no(e); }; i.src=u; }); }
async function decodeBarcode(file){ const Z=await zxLoad(), img=await loadImg(file), W=img.naturalWidth, H=img.naturalHeight;
  const hints=new Map(); hints.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E]); hints.set(Z.DecodeHintType.TRY_HARDER,true);
  const rd=new Z.MultiFormatReader(); rd.setHints(hints);
  const tries=[[1,1400],[1,2200],[.6,1400],[.4,1200]];   // [Bildausschnitt (Mitte), max. Kantenlänge]
  for(const [crop,max] of tries) for(const rot of [0,90]){ await new Promise(r=>setTimeout(r,0));   // Oberfläche zwischendurch atmen lassen
    const cw=W*crop, ch=H*crop, sc=Math.min(1,max/Math.max(cw,ch)), w=Math.round(cw*sc), h=Math.round(ch*sc), cv=document.createElement('canvas'), x=cv.getContext('2d');
    cv.width=rot?h:w; cv.height=rot?w:h; x.fillStyle='#fff'; x.fillRect(0,0,cv.width,cv.height); if(rot){ x.translate(h,0); x.rotate(Math.PI/2); } x.drawImage(img,(W-cw)/2,(H-ch)/2,cw,ch,0,0,w,h);
    try{ const r=rd.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv)))); const t=r.getText(); if(/^\d{8,14}$/.test(t)) return t.length===12?'0'+t:t; }catch(e){} }
  return null; }
function gotCode(code,to){ if(!code){ toast('Kein Barcode erkannt. Tipp: nah ran, scharf, gerade von vorn – oder die Nummer unter dem Strichcode eintippen.',5000); return; }
  if(to==='food'){ const i=$('fe'); if(i){ i.value=code; } toast('Barcode '+code+' übernommen'); return; }
  if(!sheet||sheet.m!=='add') return; sheet.q=code; sheet.tab='alle'; sheet.open=null; drawSheet(); const R=search(code,'alle');
  if(R.length){ sheet.open=R[0].id; sheet.g=defG(R[0]); drawRes(); toast(R[0].name+' gefunden'); } else toast('Barcode '+code+' ist noch unbekannt – einmal mit den Packungswerten anlegen.',4000); }
const hm2m=t=>{ const [h,m]=String(t||'12:00').split(':'); return (+h||0)*60+(+m||0); }, m2hm=x=>{ x=Math.max(0,Math.min(1439,x)); return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0'); };
function setTheme(th){ document.documentElement.setAttribute('data-theme',th); try{ localStorage.setItem('essen_theme',th); }catch(e){} }

(function init(){
  try{ const th=localStorage.getItem('essen_theme'); if(th) document.documentElement.setAttribute('data-theme',th); view=localStorage.getItem('er_view')||'heute'; }catch(e){}
  load(); render(); setTimeout(pushSum,1500); loadBLS();
  if(window.__PI_SYNC) $('homeBtn').hidden=false;
  $('themeBtn').onclick=()=>{ const dark=document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches); setTheme(dark?'light':'dark'); };
  $('dataBtn').onclick=()=>{ sheet={m:'data'}; drawSheet(); $('ov').classList.add('show'); };
  if(location.hash==='#neu'){ history.replaceState(null,'',location.pathname); view='heute'; render(); openAdd(); }
  /* iOS-Kurzbefehl „Barcode scannen“ öffnet …/Ernaehrung.html#ean=<Nummer> → direkt im Hinzufügen-Blatt suchen */
  const eanHash=()=>{ const m=/^#ean=(\d{8,14})$/.exec(location.hash); if(!m) return; history.replaceState(null,'',location.pathname);
    const c=m[1].length===12?'0'+m[1]:m[1]; view='heute'; render(); if(!sheet||sheet.m!=='add') openAdd(); gotCode(c,'add'); };
  eanHash(); window.addEventListener('hashchange',eanHash);
  window.addEventListener('storage',e=>{ if(e.key!==KEY||!e.newValue) return; let x=null; try{ x=JSON.parse(e.newValue); }catch(_){} if(!x) return; D=normalize(x); USE=null;
    if(sheet&&sheet.m==='add'){ drawPlate(); } else if(!sheet) render(); });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&!sheet){ if(day<today()&&day===kAdd(today(),-1)) day=today(); render(); } });
  setInterval(()=>{ if(!sheet&&view==='heute'&&!document.activeElement.matches('input,select,textarea')) render(); },60e3);
})();
