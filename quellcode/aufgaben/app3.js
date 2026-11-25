/* ---------- Detailblatt ---------- */
const WDH=[['','nie'],['tag','täglich'],['werktags','werktags'],['woche','wöchentlich'],['woche2','alle 2 Wochen'],['monat','monatlich'],['jahr','jährlich']];
function wdhKey(w){ if(!w) return ''; const n=+w.n||1, T=w.tage||[];
  if(w.typ==='tag'&&n===1) return 'tag';
  if(w.typ==='woche'&&n===1&&T.length===5&&[1,2,3,4,5].every(x=>T.includes(x))) return 'werktags';
  if(w.typ==='woche'&&n===1&&T.length<=1) return 'woche';
  if(w.typ==='woche'&&n===2&&!T.length) return 'woche2';
  if(w.typ==='monat'&&n===1) return 'monat'; if(w.typ==='jahr'&&n===1) return 'jahr'; return 'eigen'; }
function wdhFrom(k,t){ const old=t.wdh||{};
  const M={tag:{typ:'tag',n:1},werktags:{typ:'woche',n:1,tage:[1,2,3,4,5]},woche:{typ:'woche',n:1,tage:t.due?[wd(t.due)]:[]},woche2:{typ:'woche',n:2},monat:{typ:'monat',n:1},jahr:{typ:'jahr',n:1}};
  return M[k]?{...M[k],basis:old.basis||'termin',rot:old.rot||[]}:null; }
function openTask(id,ask){ const t=D.tasks[id]; if(!t||t.del) return; sheet={m:'task',id,t:JSON.parse(JSON.stringify(t)),dirty:false}; markSeen(id); drawSheet(); show(); render();
  if(ask) setTimeout(()=>{ const c=$('cmt'); if(c){ c.focus(); c.scrollIntoView({block:'center'}); } },60); }
function openNew(r){ if(!canEdit()) return; const fromQa=!r; if(document.activeElement&&document.activeElement.id==='qa') document.activeElement.blur();   // Hinzufügen öffnet immer gleich die Details, Kürzel aus der Eingabe sind schon gesetzt
  const t=newTask(r||parse(qa)); sheet={m:'task',id:null,t,dirty:false,isNew:true,fromQa}; drawSheet(); show(); setTimeout(()=>{ const i=$('tTit'); if(i&&!i.value) i.focus(); },60); }
function show(){ $('ov').classList.add('show'); }
function closeSheet(force){ if(!force&&sheet&&sheet.m==='task'&&sheet.dirty&&!confirm(sheet.isNew?'Die neue Aufgabe verwerfen?':'Änderungen verwerfen?')) return; if(sheet&&sheet.m==='who'&&!me) return;
  sheet=null; $('ov').classList.remove('show'); render(); }
function drawSheet(){ const s=sheet, d=$('dlg'); if(!s) return;
  if(s.m==='task'){ const t=s.t, live_=s.id?D.tasks[s.id]:null, ed=s.isNew||mayEdit(live_), L=s.id?logOf(s.id):[], wk=wdhKey(t.wdh), dis=ed?'':' disabled';
    const td=today(), Q=[['heute',td],['morgen',kAdd(td,1)],['Wochenende',nextSat()],['nächste Woche',nextMon()]];
    const isWish=t.status==='neu', mayAcc=isWish&&s.id&&t.fuer===me&&canEdit();
    const privSw=ed&&(s.isNew||t.von===me)&&privOk({...t,von:t.von||me});   // nur die Person selbst stellt eigene Aufgaben auf privat
    d.innerHTML=`<div class="dh"><h3 id="dlgT">${s.isNew?'Neue Aufgabe':isWish?'Wunsch':'Aufgabe'}</h3>${s.id&&t.status!=='offen'?`<span class="pill ${t.status}">${STAT[t.status]}</span>`:''}<button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db">
      <input class="in ttl" id="tTit" value="${esc(t.titel)}" placeholder="Was ist zu tun?" aria-label="Titel"${dis}>
      ${!ed?`<p class="note">Von ${esc(pName(t.von))} eingetragen${canTick(t)?' – du kannst abhaken, die Checkliste abhaken und kommentieren.':canEdit()?' – du kannst kommentieren.':'.'}</p>`:''}
      ${s.isNew&&wishRule(t.fuer)?`<p class="note">Geht als <b>Wunsch</b> an ${esc(pName(t.fuer))} – er/sie nimmt ihn an oder lehnt ab.</p>`:''}
      <div class="fs"><span class="lt">Wann</span><div class="fl">${Q.map(([l,k])=>`<button class="opt" data-dq="${k}" aria-pressed="${t.due===k}"${dis}>${l}</button>`).join('')}<button class="opt" data-dq="x" aria-pressed="${!t.due}"${dis}>ohne Datum</button></div>
        <div class="fl"><input class="in" type="date" id="tDue" value="${t.due||''}" aria-label="Datum"${dis}><input class="in" type="time" id="tZeit" value="${t.zeit||''}" aria-label="Uhrzeit (optional)"${dis} style="max-width:140px"></div>
        ${t.due?`<label class="sw"><input type="checkbox" id="tArt"${t.art==='am'?' checked':''}${dis}> Fester Termin (genau an diesem Tag, nicht „bis“)</label>`:''}</div>
      <div class="fs"><span class="lt">Für</span><div class="fl">${PL.map(p=>`<button class="opt" data-fuer="${esc(p.id)}" aria-pressed="${t.fuer===p.id}"${dis}>${av(p.id)}${esc(p.id===me?'mich':p.name)}</button>`).join('')}</div>
        ${privSw?`<label class="sw"><input type="checkbox" id="tPriv"${t.privat?' checked':''}> Privat</label><span class="pnote">Nur du siehst diese Aufgabe – auch Admins nicht.</span>`:''}</div>
      <div class="fs"><span class="lt">Liste</span><div class="fl"><button class="opt" data-lis="" aria-pressed="${!list(t.liste)}"${dis}>keine</button>${lists().map(l=>`<button class="opt" data-lis="${l.id}" aria-pressed="${t.liste===l.id}"${dis}><i class="dot" style="background:${esc(l.farbe)}"></i>${esc(l.name)}</button>`).join('')}${ed?'<button class="opt" data-lisnew="1">+ neu</button>':''}</div></div>
      <div class="fs"><span class="lt">Wichtigkeit</span><div class="fl">${PRIO.map((l,i)=>`<button class="opt pro pr${i}" data-prio="${i}" aria-pressed="${pr(t)===i}"${dis}>${i?'<b>'+'!'.repeat(i)+'</b> ':''}${l}</button>`).join('')}</div></div>
      <div class="fs"><span class="lt">Wiederholen</span><div class="fl"><select class="in" id="wTyp" aria-label="Wiederholen"${dis} style="max-width:240px">${WDH.map(([k,l])=>`<option value="${k}"${wk===k?' selected':''}>${l}</option>`).join('')}${wk==='eigen'?`<option value="eigen" selected>${esc(wdhText(t.wdh))}</option>`:''}</select></div>
        ${t.wdh?`<label class="sw"><input type="checkbox" id="wBas"${t.wdh.basis==='erledigt'?' checked':''}${dis}> Ab Erledigung zählen (statt ab Termin)</label>
          <div class="fl"><span class="cap" style="font-size:13px;color:var(--muted)">Abwechselnd:</span>${PL.map(p=>`<button class="opt" data-rot="${esc(p.id)}" aria-pressed="${(t.wdh.rot||[]).includes(p.id)}"${dis}>${av(p.id)}${esc(p.name)}</button>`).join('')}</div>
          ${(t.wdh.rot||[]).length>1?`<span style="font-size:12.5px;color:var(--muted)">Reihenfolge: ${t.wdh.rot.map(pName).join(' → ')}. Nach dem Abhaken ist die nächste Person dran.</span>`:''}`:''}</div>
      <div class="fs"><span class="lt">Checkliste ${(t.check||[]).length?`<span style="font-family:var(--mono)">${t.check.filter(c=>c.ok).length}/${t.check.length}</span>`:''}</span>
        ${(t.check||[]).length?`<div class="cl">${t.check.map((c,i)=>`<div class="cli${c.ok?' ok':''}"><button class="ck" data-cli="${i}" aria-pressed="${!!c.ok}" aria-label="Punkt abhaken"${s.isNew||canTick(live_||t)?'':' disabled'}><i>${CHK}</i></button><input class="in" data-clt="${i}" value="${esc(c.t)}" aria-label="Punkt"${ed?'':' readonly'}>${ed?`<button class="x" data-clx="${i}" aria-label="Punkt entfernen">×</button>`:''}</div>`).join('')}</div>`:''}
        ${ed?'<div class="fl"><input class="in" id="clNew" placeholder="Punkt hinzufügen …" enterkeyhint="enter"><button class="btn sm" data-cladd="1">+</button></div>':''}</div>
      <div class="fs"><span class="lt">Notiz</span><textarea class="in" id="tNot" placeholder="optional"${dis}>${esc(t.notiz)}</textarea></div>
      ${s.id?`<div class="fs"><span class="lt">Verlauf &amp; Kommentare</span><div class="log">${L.map(g=>g.sys?`<div class="lg sys">${esc(pName(g.wer))} ${esc(g.t)} · ${esc(fTs(g.ts))}</div>`:`<div class="lg">${av(g.wer,'s')}<div style="min-width:0"><div class="bx">${esc(g.t)}</div><div class="mt">${esc(pName(g.wer))} · ${esc(fTs(g.ts))}</div></div></div>`).join('')}</div>
        ${canEdit()?`<div class="fl"><textarea class="in" id="cmt" rows="2" placeholder="${mayAcc?'Rückfrage an '+esc(pName(t.von))+' …':'Kommentar …'}" style="min-height:44px"></textarea><button class="btn sm" data-cmt="1">Senden</button></div>`:''}</div>`:''}
      ${t.status==='abgelehnt'&&t.grund?`<div class="note">Abgelehnt: ${esc(t.grund)}</div>`:''}
    </div>
    <div class="df">${s.id&&ed?`<button class="btn dng" data-tdel="1">Löschen</button>`:''}
      ${mayAcc?`<button class="btn" data-rej="${t.id}">Ablehnen</button><button class="btn" data-acc="${t.id}">Annehmen</button>`:''}
      ${s.id&&open(t)&&canTick(t)?`<button class="btn" data-arb="1">${t.status==='arbeit'?'Pausieren':'In Arbeit'}</button>`:''}
      ${s.id&&(t.status==='erledigt'||t.status==='abgelehnt')&&canEdit()&&(ed||t.status==='erledigt')?`<button class="btn" data-reopen="1">Wieder öffnen</button>`:''}
      <span class="sp"></span>${s.id&&open(t)&&canTick(t)?`<button class="btn" data-done="${t.id}">Erledigt</button>`:''}${ed?`<button class="btn pri" data-tsave="1">${s.isNew?(wishRule(t.fuer)?'Wunsch senden':'Eintragen'):'Speichern'}</button>`:''}</div>`; return; }
  if(s.m==='who'){ d.innerHTML=`<div class="dh"><h3 id="dlgT">Wer bist du?</h3>${me?'<button class="x" data-close="1" aria-label="Schließen">×</button>':''}</div>
    <div class="db"><p style="color:var(--muted);font-size:14px">Lokal geöffnet – das Gerät merkt sich die Person.</p>
      <div class="fl">${PL.map(p=>`<button class="opt" data-me="${esc(p.id)}" aria-pressed="${p.id===me}">${av(p.id)}${esc(p.name)}</button>`).join('')}</div></div>`; return; }
  if(s.m==='set'){ const host=location.origin, onPi=!!window.__PI_SYNC, A=isAdmin();
    d.innerHTML=`<div class="dh"><h3 id="dlgT">Einstellungen</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db">
      <div class="fs"><span class="lt">Angemeldet</span><div class="fl">${av(me)} <b>${esc(pName(me))}</b>${ROLE&&ROLE.ro?' <span class="pill">nur ansehen</span>':''}<span style="flex:1"></span><button class="btn sm" data-who="1">Person wechseln</button></div>
        ${ROLE?`<p style="font-size:13px;color:var(--muted)">${seesAll()?'Du siehst alle Aufgaben der Familie, außer den privaten der anderen.':'Du siehst Aufgaben, die du eingetragen hast oder die für dich sind.'}${!A&&canEdit()?' Aufgaben, die du für '+admins().map(pName).join(' / ')+' einträgst, kommen dort als Wunsch an.':''} Was du für dich selbst einträgst, ist privat (Schloss): das siehst nur du, auch Admins nicht.</p>`:''}</div>
      <div class="fs"><span class="lt">Listen</span>${A?lists().map(l=>`<div class="lrow"><input type="color" value="${esc(l.farbe)}" data-lcol="${l.id}" aria-label="Farbe von ${esc(l.name)}"><input class="in" value="${esc(l.name)}" data-lname="${l.id}" aria-label="Name der Liste"><button class="x" data-ldel="${l.id}" aria-label="${esc(l.name)} löschen">×</button></div>`).join('')
          :`<div class="fl">${lists().map(l=>`<span class="opt"><i class="dot" style="background:${esc(l.farbe)}"></i>${esc(l.name)}</span>`).join('')}</div>`}
        ${canEdit()?'<div class="fl"><input class="in" id="lNew" placeholder="Neue Liste …"><button class="btn sm" data-ladd="1">+</button></div>':''}</div>
      <div class="fs"><span class="lt">Darstellung</span><div class="fl"><button class="opt" data-th="light" aria-pressed="${document.documentElement.getAttribute('data-theme')==='light'}">Hell</button><button class="opt" data-th="dark" aria-pressed="${document.documentElement.getAttribute('data-theme')==='dark'}">Dunkel</button></div></div>
      <div class="fs"><span class="lt">Kalender-Abo (Erinnerungen aufs Handy)</span>
        ${onPi?`<div class="urls">${(A?[['Alle Aufgaben','aufgaben'],...PL.map(p=>['Nur für '+p.name,'aufgaben-'+p.id])]:[['Meine Aufgaben','aufgaben-'+me]]).map(([l,f])=>`<div class="url"><div style="min-width:0;flex:1"><div style="font-size:12.5px;color:var(--muted)">${esc(l)}</div><code>${esc(host.replace(/^https?:\/\//,''))}/${f}.ics</code></div><button class="btn sm" data-copy="${esc(host+'/'+f+'.ics')}">Kopieren</button></div>`).join('')}</div>
        <p style="font-size:12.5px;color:var(--muted)">iPhone/iPad: Einstellungen → Apps → Kalender → Kalender-Accounts → Account hinzufügen → Andere → Kalenderabo hinzufügen → Adresse einfügen. Offene Aufgaben mit Datum erscheinen mit Erinnerung (mit Uhrzeit 30 Min vorher, sonst 9 Uhr). Nur im Heimnetz.</p>`
        :'<p style="font-size:13px;color:var(--muted)">Das Kalender-Abo gibt es, wenn die Seite vom Pi geöffnet wird.</p>'}</div>
      ${A?`<div class="fs"><span class="lt">Daten</span><div class="fl"><button class="btn" data-exp="1">JSON-Backup speichern</button><button class="btn" data-imp="1">Backup einlesen</button></div>
        <p style="font-size:12.5px;color:var(--muted)">${tasks().filter(open).length} offen · ${tasks().filter(t=>t.status==='erledigt').length} erledigt · ${tasks().filter(t=>t.status==='neu').length} Wünsche · zuletzt gespeichert ${D.savedAt?new Date(D.savedAt).toLocaleString('de-DE'):'noch nie'}</p></div>`:''}
    </div>`; return; }
}
function readForm(){ const s=sheet; if(!s||s.m!=='task') return; const t=s.t, v=id=>{ const e=$(id); return e?e.value:null; };
  if(!(s.isNew||mayEdit(D.tasks[s.id]))) return;
  t.titel=(v('tTit')||'').trim(); t.notiz=v('tNot')||''; t.due=v('tDue')||null; t.zeit=v('tZeit')||null;
  const a=$('tArt'); t.art=a&&a.checked?'am':'bis';
  if(t.wdh){ const b=$('wBas'); if(b) t.wdh.basis=b.checked?'erledigt':'termin'; }
  const pv=$('tPriv'); if(pv) t.privat=pv.checked&&privOk(t); else if(!privOk(t)) t.privat=false;
  (t.check||[]).forEach((c,i)=>{ const e=document.querySelector(`[data-clt="${i}"]`); if(e) c.t=e.value; }); }
function saveTask(){ readForm(); const s=sheet, t=s.t; if(!t.titel){ toast('Bitte einen Titel eingeben'); return; }
  if(t.wdh&&!t.due) t.due=firstDue(t.wdh); t.check=(t.check||[]).filter(c=>c.t.trim());
  if(!privOk(t)) t.privat=false;
  if(s.isNew){ t.status=wishRule(t.fuer)?'neu':'offen'; put('tasks',t); if(s.fromQa) qa=''; note(t.id,t.status==='neu'?'hat sich das gewünscht':'hat eingetragen',true); }
  else { const o=D.tasks[s.id], ch=[]; [['titel','Titel'],['notiz','Notiz'],['due','Datum'],['zeit','Uhrzeit'],['prio','Wichtig'],['fuer','Für'],['liste','Liste']].forEach(([k,l])=>{ if(String(o[k]??'')!==String(t[k]??'')) ch.push(l); });
    if(JSON.stringify(o.wdh)!==JSON.stringify(t.wdh)) ch.push('Wiederholung'); if(JSON.stringify(o.check)!==JSON.stringify(t.check)) ch.push('Checkliste');
    if(!!o.privat!==!!t.privat) ch.push('Privat');
    ['status','erledigtVon','erledigtAm'].forEach(k=>t[k]=o[k]);   // Status kann sich inzwischen (Sync) geändert haben
    put('tasks',t); if(ch.length) note(t.id,'hat '+ch.join(', ')+' geändert',true); }
  save(); sheet.dirty=false; closeSheet(true); toast(s.isNew?(t.status==='neu'?`Wunsch an ${pName(t.fuer)} geschickt`:'Eingetragen'+(isPriv(t)?' (privat)':'')):'Gespeichert'); }
const liveTask=()=>sheet&&sheet.id?D.tasks[sheet.id]:null;
function scrollToDay(k){ const el=$('d-'+k); if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  if(canEdit()) openNew({titel:'',due:k}); else toast('An diesem Tag ist nichts offen'); }
function goWho(){ if(window.__PI_SYNC){ location.href='/anmelden?z='+encodeURIComponent(location.pathname); return; } sheet={m:'who'}; drawSheet(); show(); }

/* ---------- Ereignisse ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('button,[data-v]'); if(!b||b.disabled) return; const ds=b.dataset;
  if(ds.v){ view=ds.v; curList=null; laterAll=false; if(sheet) closeSheet(true); try{ localStorage.setItem('aufg_view2',view); }catch(_){} render(); return scrollTo(0,0); }
  if(ds.new||ds.qadd){ openNew(); return; }
  if(ds.wen){ wen=ds.wen; try{ localStorage.setItem('aufg_wen',wen); }catch(_){} return render(); }
  if(ds.day) return scrollToDay(ds.day);
  if(ds.news){ newsOpen=!newsOpen; return render(); }
  if(ds.more){ laterAll=true; return render(); }
  if(ds.moreDone){ doneN+=100; return render(); }
  if(ds.list!=null){ curList=ds.list||null; laterAll=false; render(); return scrollTo(0,0); }
  if(ds.ladd2){ const n=prompt('Name der neuen Liste:',''); if(n&&n.trim()){ const l=put('lists',{id:uid('l'),name:n.trim(),farbe:LCOL[lists().length%LCOL.length]}); save(); curList=l.id; render(); } return; }
  if(ds.done){ const t=D.tasks[ds.done]; if(!t) return; if(sheet&&sheet.id===t.id){ sheet.dirty=false; closeSheet(true); } if(t.status==='erledigt') return reopen(t); if(!canTick(t)) return; return complete(t); }
  if(ds.open){ return openTask(ds.open,!!ds.ask); }
  if(ds.acc){ const t=D.tasks[ds.acc], dIn=$('wd_'+t.id); if(dIn&&dIn.value) t.due=dIn.value; if(sheet&&sheet.id===t.id){ readForm(); t.due=sheet.t.due; }
    t.status='offen'; put('tasks',t); note(t.id,'hat angenommen'+(t.due?' (bis '+fDue(t.due)+')':''),true); save(); if(sheet){ sheet.dirty=false; closeSheet(true); } render(); return toast('Angenommen'); }
  if(ds.rej){ const t=D.tasks[ds.rej], g=prompt(`„${t.titel}“ ablehnen – kurzer Grund für ${pName(t.von)} (optional):`,''); if(g===null) return;
    t.status='abgelehnt'; t.grund=g.trim(); put('tasks',t); note(t.id,'hat abgelehnt'+(t.grund?': '+t.grund:''),true); save(); if(sheet){ sheet.dirty=false; closeSheet(true); } render(); return toast('Abgelehnt'); }
  if(ds.close) return closeSheet();
  if(ds.who) return goWho();
  if(ds.me){ me=ds.me; try{ localStorage.setItem('pd_person',me); }catch(_){} seenLoad(); wen='me'; sheet=null; $('ov').classList.remove('show'); render(); return toast('Hallo '+pName(me)); }
  if(!sheet) return;
  const s=sheet;
  if(s.m==='task'){ const t=s.t;
    if(ds.dq){ readForm(); t.due=ds.dq==='x'?null:ds.dq; if(ds.dq==='x'){ t.zeit=null; t.art='bis'; } s.dirty=true; return drawSheet(); }
    if(ds.prio!=null){ readForm(); t.prio=+ds.prio; s.dirty=true; return drawSheet(); }
    if(ds.fuer){ readForm(); t.fuer=ds.fuer; if(t.wdh&&t.wdh.rot&&t.wdh.rot.length&&!t.wdh.rot.includes(t.fuer)) t.wdh.rot.unshift(t.fuer);
      if(!privOk(t)) t.privat=false; else if(s.isNew) t.privat=true;   // für jemand anderen → nie privat; zurück an sich selbst → wieder privat
      s.dirty=true; return drawSheet(); }
    if(ds.lis!=null){ readForm(); t.liste=ds.lis||null; s.dirty=true; return drawSheet(); }
    if(ds.lisnew){ const n=prompt('Name der neuen Liste:',''); if(n&&n.trim()){ readForm(); const l=put('lists',{id:uid('l'),name:n.trim(),farbe:LCOL[lists().length%LCOL.length]}); save(); t.liste=l.id; s.dirty=true; drawSheet(); } return; }
    if(ds.rot){ readForm(); const a=t.wdh.rot=t.wdh.rot||[]; a.includes(ds.rot)?a.splice(a.indexOf(ds.rot),1):a.push(ds.rot); if(a.length&&!a.includes(t.fuer)) a.unshift(t.fuer); if(!privOk(t)) t.privat=false; s.dirty=true; return drawSheet(); }
    if(ds.cli!=null){ readForm(); const c=t.check[+ds.cli]; c.ok=!c.ok;
      const lt=liveTask(); if(lt&&lt.check&&lt.check[+ds.cli]&&lt.check[+ds.cli].t===c.t){ lt.check[+ds.cli].ok=c.ok; put('tasks',lt); save(); } else s.dirty=true; return drawSheet(); }
    if(ds.clx!=null){ readForm(); t.check.splice(+ds.clx,1); s.dirty=true; return drawSheet(); }
    if(ds.cladd){ readForm(); const v=$('clNew').value.trim(); if(!v) return; (t.check=t.check||[]).push({id:uid('c'),t:v,ok:false}); s.dirty=true; drawSheet(); const n=$('clNew'); if(n) n.focus(); return; }
    if(ds.cmt){ const v=$('cmt').value.trim(); if(!v) return; readForm(); note(s.id,v); markSeen(s.id); save(); drawSheet(); return; }
    if(ds.tsave) return saveTask();
    if(ds.tdel){ if(!confirm(`„${t.titel}“ löschen?`)) return; rm('tasks',s.id); save(); s.dirty=false; closeSheet(true); return toast('Gelöscht'); }
    if(ds.arb){ const lt=liveTask(); lt.status=lt.status==='arbeit'?'offen':'arbeit'; put('tasks',lt); note(lt.id,lt.status==='arbeit'?'hat angefangen':'hat pausiert',true); save(); readForm(); s.t.status=lt.status; return drawSheet(); }
    if(ds.reopen){ const lt=liveTask(); reopen(lt); s.t.status='offen'; return drawSheet(); }
  }
  if(s.m==='set'){
    if(ds.ladd){ const v=$('lNew').value.trim(); if(!v) return; put('lists',{id:uid('l'),name:v,farbe:LCOL[lists().length%LCOL.length]}); save(); return drawSheet(); }
    if(ds.ldel){ const l=D.lists[ds.ldel], n=tasks().filter(t=>t.liste===l.id).length; if(!confirm(`Liste „${l.name}“ löschen?${n?` ${n} Aufgaben bleiben erhalten, nur ohne Liste.`:''}`)) return; rm('lists',l.id); save(); return drawSheet(); }
    if(ds.th){ setTheme(ds.th); return drawSheet(); }
    if(ds.copy){ (navigator.clipboard?navigator.clipboard.writeText(ds.copy):Promise.reject()).then(()=>toast('Adresse kopiert')).catch(()=>prompt('Adresse kopieren:',ds.copy)); return; }
    if(ds.exp){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,1)],{type:'application/json'})); a.download='aufgaben-backup-'+today()+'.json'; a.click(); return; }
    if(ds.imp){ $('impFile').click(); return; }
  }
});
document.addEventListener('input',e=>{ const el=e.target;
  if(el.id==='qa'){ qa=el.value; const p=$('pv'); if(p) p.innerHTML=qaPreview(); return; }
  if(sheet&&sheet.m==='task'&&el.closest('#dlg')&&el.id!=='cmt'&&el.id!=='clNew') sheet.dirty=true;
});
document.addEventListener('change',e=>{ const el=e.target;
  if(sheet&&sheet.m==='task'){
    if(el.id==='wTyp'){ readForm(); const t=sheet.t; if(el.value!=='eigen') t.wdh=el.value?wdhFrom(el.value,t):null; if(t.wdh&&!t.due) t.due=firstDue(t.wdh); sheet.dirty=true; return drawSheet(); }
    if(el.id==='tDue'||el.id==='tArt'||el.id==='tPrio'||el.id==='wBas'||el.id==='tPriv'){ readForm(); sheet.dirty=true; if(el.id==='tDue') drawSheet(); return; }
  }
  if(sheet&&sheet.m==='set'){
    if(el.dataset.lname){ const l=D.lists[el.dataset.lname], v=el.value.trim(); if(v){ l.name=v; put('lists',l); save(); } return; }
    if(el.dataset.lcol){ const l=D.lists[el.dataset.lcol]; l.farbe=el.value; put('lists',l); save(); return; }
  }
  if(el.id==='impFile'&&el.files[0]){ const r=new FileReader(); r.onload=()=>{ let x=null; try{ x=JSON.parse(r.result); }catch(_){}
      if(!x||x.app!==APP){ toast('Keine Aufgaben-Daten in der Datei'); return; }
      if(!confirm(`Backup vom ${x.savedAt?new Date(x.savedAt).toLocaleString('de-DE'):'?'} einlesen? Einträge werden zusammengeführt – nichts geht verloren.`)) return;
      ['tasks','lists','log'].forEach(c=>Object.values(x[c]||{}).forEach(it=>{ const o=D[c][it.id]; if(!o||(+it.upd||0)>(+o.upd||0)) D[c][it.id]=it; }));
      if(x.set&&(+x.set.upd||0)>(+D.set.upd||0)) D.set=x.set; D=normalize(D); save(); sheet=null; $('ov').classList.remove('show'); render(); toast('Backup eingelesen'); };
    r.readAsText(el.files[0]); el.value=''; }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&sheet) return closeSheet();
  if(e.key==='Enter'&&e.target.id==='qa'){ e.preventDefault(); openNew(); }
  if(e.key==='Enter'&&e.target.id==='tTit'&&sheet&&sheet.isNew){ e.preventDefault(); saveTask(); }
  if(e.key==='Enter'&&e.target.id==='clNew'){ e.preventDefault(); const b=document.querySelector('[data-cladd]'); if(b) b.click(); }
  if(e.key==='Enter'&&e.target.id==='lNew'){ e.preventDefault(); const b=document.querySelector('[data-ladd]'); if(b) b.click(); }
  if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&e.target.id==='cmt'){ e.preventDefault(); const b=document.querySelector('[data-cmt]'); if(b) b.click(); }
});
$('ov').addEventListener('click',e=>{ if(e.target.id==='ov') closeSheet(); });

/* ---------- Dashboard-Kachel (je Person) & Kalender-Abo (Admins) ---------- */
const dueTs=t=>{ const d=kDate(t.due); if(t.zeit){ const [h,m]=t.zeit.split(':'); d.setHours(+h,+m); } else d.setHours(23,59); return d.getTime(); };
function pushSum(){ if(!window.__PI_SYNC||!me) return; const td=today(), O=tasks().filter(t=>open(t)&&t.fuer===me).sort(sortT);
  const s={v:1,savedAt:Date.now(),zaehler:{heute:O.filter(t=>t.due===td).length,ueberfaellig:O.filter(t=>t.due&&t.due<td).length,neu:wishesForMe().length+newsForMe().length},
    zeilen:O.filter(t=>t.due||t.prio).slice(0,6).map(t=>{ const l=list(t.liste); return {id:t.id,ab:canTick(t)?1:undefined,t:t.titel,due:t.due?dueTs(t):undefined,sub:[t.von!==me?'von '+pName(t.von):'',l?l.name:'',pr(t)?PRIO[pr(t)].toLowerCase():''].filter(Boolean).join(' · ')||undefined,ton:t.due&&t.due<td||pr(t)>=3?'bad':pr(t)?'warn':''}; }),
    termine:O.filter(t=>t.due&&t.due>=kAdd(td,-1)).slice(0,80).map(t=>({id:t.id,ab:canTick(t)?1:undefined,t:t.titel,datum:t.due,due:dueTs(t),ton:pr(t)>=3?'bad':pr(t)?'warn':''})),
    leer:'Für dich ist nichts offen'};
  fetch('/api/sum_aufgaben',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)}).catch(()=>{}); }
/* Dashboard: Aufgabe auf der Kachel abhaken. Das Dashboard lädt diese Seite unsichtbar und ruft __dashAct auf –
   so gelten dieselben Regeln wie hier (Wiederholung, Abwechseln, Verlauf, Rechte). */
let dashUndo=null;
window.__dashAct=function(kind,id){ if(!D) return {ok:false,error:'noch nicht geladen'};
  if(kind==='undo'){ const u=dashUndo; dashUndo=null; if(!u) return {ok:false,error:'nichts rückgängig zu machen'}; u(); return {ok:true}; }
  if(kind!=='done') return {ok:false,error:'unbekannt'};
  const t=D.tasks[id]; if(!t||t.del) return {ok:false,error:'Aufgabe nicht gefunden'};
  if(!open(t)||!canTick(t)) return {ok:false,error:'Diese Aufgabe kannst du nicht abhaken'};
  let cap=null; const ot=toast; toast=(m,u)=>{ cap={m,u}; };
  try{ complete(t); } finally { toast=ot; }
  dashUndo=cap&&cap.u||null; return {ok:true,text:cap?cap.m:'Erledigt',undo:!!dashUndo}; };
function icsText(name,L){ const e=v=>String(v||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
  const fold=l=>{ const o=[]; while(l.length>70){ o.push(l.slice(0,70)); l=' '+l.slice(70); } o.push(l); return o.join('\r\n'); };
  const d8=k=>k.replace(/-/g,''), now=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const X=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Personal Dashboard//Aufgaben//DE','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+e(name),'X-PUBLISHED-TTL:PT1H','REFRESH-INTERVAL;VALUE=DURATION:PT1H'];
  L.forEach(t=>{ const sum=(pr(t)?'!'.repeat(pr(t))+' ':'')+t.titel+(t.fuer!==owner().id?' ('+pName(t.fuer)+')':''), desc=[t.notiz,t.von&&t.von!==t.fuer?'von '+pName(t.von):'',t.wdh?'wiederholt sich: '+wdhText(t.wdh):'',(t.check||[]).length?'Checkliste: '+t.check.map(c=>(c.ok?'✓ ':'○ ')+c.t).join(', '):''].filter(Boolean).join('\n');
    X.push('BEGIN:VEVENT','UID:'+t.id+'@personal-dashboard','DTSTAMP:'+now);
    if(t.zeit){ const st=d8(t.due)+'T'+t.zeit.replace(':','')+'00', en=new Date(kDate(t.due).getTime()); const [h,m]=t.zeit.split(':'); en.setHours(+h,+m+30); X.push('DTSTART:'+st,'DTEND:'+d8(iso(en))+'T'+String(en.getHours()).padStart(2,'0')+String(en.getMinutes()).padStart(2,'0')+'00'); }
    else X.push('DTSTART;VALUE=DATE:'+d8(t.due),'DTEND;VALUE=DATE:'+d8(kAdd(t.due,1)));
    X.push('SUMMARY:'+e(sum)); if(desc) X.push('DESCRIPTION:'+e(desc));
    X.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+e(t.titel),'TRIGGER:'+(t.zeit?'-PT30M':'PT9H'),'END:VALARM','END:VEVENT'); });
  X.push('END:VCALENDAR'); return X.map(fold).join('\r\n')+'\r\n'; }
let lastIcs={};
/* Kalender-Abos: private Aufgaben nur im eigenen Kalender, nie in „Alle Aufgaben“ (die Adressen sind im Heimnetz ohne Anmeldung abrufbar) */
function pushIcs(){ if(!window.__PI_SYNC||!isAdmin()) return; const O=tasks().filter(t=>open(t)&&t.due).sort(sortT);
  [['aufgaben','Aufgaben',O.filter(t=>!isPriv(t))],...PL.map(p=>['aufgaben-'+p.id,'Aufgaben '+p.name,O.filter(t=>t.fuer===p.id&&(!isPriv(t)||p.id===me))])].forEach(([f,n,L])=>{
    const body=icsText(n,L), sig=body.replace(/DTSTAMP:\d+T\d+Z?/g,''); if(lastIcs[f]===sig) return; lastIcs[f]=sig;
    fetch('/api/ics_'+f,{method:'PUT',headers:{'Content-Type':'text/calendar'},body}).catch(()=>{ delete lastIcs[f]; }); }); }

/* ---------- Kleinkram ---------- */
function stamp(){ const el=$('saved'); if(el) el.textContent=D.savedAt?'gespeichert '+new Date(D.savedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):''; }
let toastT; function toast(m,undo){ const t=$('toast'); t.innerHTML=esc(m)+(undo?'<button id="undoBtn">Rückgängig</button>':''); t.classList.add('show'); clearTimeout(toastT);
  if(undo) $('undoBtn').onclick=()=>{ undo(); t.classList.remove('show'); };
  toastT=setTimeout(()=>t.classList.remove('show'),undo?5000:2600); }
function setTheme(th){ document.documentElement.setAttribute('data-theme',th); try{ localStorage.setItem('aufg_theme',th); }catch(e){} }

(function init(){
  try{ const th=localStorage.getItem('aufg_theme'); if(th) document.documentElement.setAttribute('data-theme',th); view=localStorage.getItem('aufg_view2')||'anstehend'; wen=localStorage.getItem('aufg_wen')||'me'; }catch(e){}
  if(!['anstehend','listen','erledigt'].includes(view)) view='anstehend';
  if(!seesAll()&&!['me','von'].includes(wen)) wen='me';
  load(); if(!me&&!ROLE) me=localStorage.getItem('pd_person')||(location.protocol==='file:'?owner().id:null);
  if(me) seenLoad(); else SEEN={_0:Date.now()};
  render(); setTimeout(()=>{ pushSum(); pushIcs(); },1500); loadPersons();
  if(!me){ if(window.__PI_SYNC) return goWho(); sheet={m:'who'}; drawSheet(); show(); }
  if(window.__PI_SYNC) $('homeBtn').hidden=false;
  $('themeBtn').onclick=()=>{ const dark=document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches); setTheme(dark?'light':'dark'); };
  $('setBtn').onclick=()=>{ sheet={m:'set'}; drawSheet(); show(); };
  $('whoBtn').onclick=goWho;
  if(location.hash==='#neu'){ history.replaceState(null,'',location.pathname); view='anstehend'; render(); setTimeout(()=>{ const q=$('qa'); if(q) q.focus(); },100); }
  window.addEventListener('storage',e=>{ if(e.key!==KEY||!e.newValue) return; let x=null; try{ x=JSON.parse(e.newValue); }catch(_){} if(!x) return; D=normalize(x);
    if(!sheet&&!(document.activeElement&&document.activeElement.id==='qa'&&qa)) render(); else { const b=$('inBadge'), n=wishesForMe().length+newsForMe().length; if(b){ b.hidden=!n; b.textContent=n; } } });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&!sheet) render(); });
  setInterval(()=>{ if(!sheet&&!(document.activeElement&&document.activeElement.matches('input,select,textarea'))) render(); },60e3);
})();
