/* ---------- Ansichten ---------- */
const ICO={back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  srch:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>'};
function render(){ const run=laufend();
  if(view==='training'&&(!tId||!D.trainings[tId]||D.trainings[tId].del)){ view=run?'start':'verlauf'; tId=null; }
  const nv=view==='training'?(run&&run.id===tId?'start':'verlauf'):view;
  document.querySelectorAll('.nav button').forEach(b=>{ b.dataset.v===nv?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');
    let d=b.querySelector('.run'); if(b.dataset.v==='start'&&run&&!d){ d=document.createElement('i'); d.className='run'; d.title='Training läuft'; b.appendChild(d); } else if(d&&!(b.dataset.v==='start'&&run)) d.remove(); });
  $('sub').textContent=run?'läuft seit '+fHM(run.start)+' · '+run.name:WDL[new Date().getDay()]+', '+new Date().getDate()+'. '+MON[new Date().getMonth()];
  ({start:vStart,training:vTraining,verlauf:vVerlauf,fortschritt:vFort,uebungen:vUeb}[view]||vStart)($('main'));
  stamp(); tick(); }

/* Start: Vorlagen mit einem Tipp starten – läuft ein Training, steht hier der Trainingsbildschirm */
function vStart(el){ const run=laufend(); if(run){ tId=run.id; return vTraining(el,run); }
  const T=trainings(), ws=weekStart(today()), W=T.filter(t=>t.datum>=ws&&t.saetze.length), last=T.find(t=>t.ende&&t.saetze.length), ziel=+D.set.wochenziel||0;
  const offen=T.filter(t=>!t.ende);
  const zuletzt=vid=>{ const t=T.find(x=>x.vorlage===vid&&x.saetze.length); return t?'zuletzt '+fTag(t.datum):'noch nie'; };
  el.innerHTML=`<div class="head"><div class="tt">Neues Training<small>Vorlage antippen – oder leer starten und Übungen spontan hinzufügen</small></div></div>
    <div class="stack">
    <div class="card"><div class="vgrid" style="margin-top:0">${vorlagen().map(v=>`<button class="vk" data-start="${esc(v.id)}"><b>${esc(v.name)}</b><span>${(v.uebungen||[]).filter(id=>UE(id)).map(id=>esc(uName(id))).join(' · ')||'noch ohne Übungen'}</span><em>Starten › <span style="color:var(--muted);font-weight:500">${zuletzt(v.id)}</span></em></button>`).join('')}
      <button class="vk leer" data-start=""><b>Leeres Training</b><span>Übungen spontan hinzufügen</span><em>Starten ›</em></button></div></div>
    <div class="card"><h2>Diese Woche<span class="cap">ab ${fTag(ws)}</span></h2><div class="kpis" style="margin-top:12px">
      <div class="kpi"><b>${W.length}${ziel?` <small style="font-size:13px;color:var(--muted)">/ ${ziel}</small>`:''}</b><span>Trainings</span></div>
      <div class="kpi"><b>${W.reduce((a,t)=>a+t.saetze.length,0)}</b><span>Sätze</span></div>
      <div class="kpi"><b>${fDauer(W.reduce((a,t)=>a+dauer(t),0))}</b><span>Zeit</span></div></div></div>
    ${last?`<div class="card"><h2>Zuletzt<span class="cap">${fTag(last.datum)} · ${fDauer(dauer(last))}</span></h2><div class="lst" style="margin-top:10px">${trRow(last)}</div></div>`:''}
    </div>`; }
function trRow(t){ const U=t.reihe.filter(u=>satzVon(t,u).length), v=vol(t.saetze);
  return `<button class="li${t.ende?'':' run'}" data-open="${esc(t.id)}"><span class="n">${esc(t.name)}</span><span class="k">${fTag(t.datum)} · ${fHM(t.start)}</span>
    <span class="s">${t.saetze.length} ${t.saetze.length===1?'Satz':'Sätze'} · ${U.length} ${U.length===1?'Übung':'Übungen'}${v?' · '+fmt(v)+' kg bewegt':''}${t.ende?' · '+fDauer(dauer(t)):''}${t.notiz?' · „'+esc(t.notiz.slice(0,60))+(t.notiz.length>60?'…':'')+'“':''}</span></button>`; }

/* Trainingsbildschirm: Timer oben, darunter die Übungen mit „letztes Mal“ und den Sätzen */
function vTraining(el,t){ t=t||trN(D.trainings[tId]); if(!t) return vStart(el); tId=t.id;
  const run=!t.ende, L=t.lauf||{}, pr=prOf(t), cur=L.uebung&&t.reihe.includes(L.uebung)?L.uebung:t.reihe[0];
  const head=`<div class="head">${run?'':`<button class="ibtn" data-v="verlauf" aria-label="Zurück zum Verlauf">${ICO.back}</button>`}
    <div class="tt"><button class="tname" data-tedit="1" style="border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left">${esc(t.name)}</button>
      <small>${fTag(t.datum)} · ${fHM(t.start)}${run?` · läuft <span data-dauer="${t.start}">${fDauer(dauer(t))}</span>`:` – ${fHM(t.ende)} · ${fDauer(dauer(t))}`}</small></div>
    ${run?'<button class="btn pri" data-tend="1">Beenden</button>':''}</div>`;
  const cards=t.reihe.map(u=>{ const S=satzVon(t,u), p=vorher(u,t.start,t.id), no=t.uebNotiz[u]||'', isCur=run&&u===cur;
    const rows=t.saetze.map((s,i)=>s.uebung!==u?'':`<button class="sr2" data-sedit="${i}"><span class="n">${s.nr}</span><span class="w">${satzTxt(s)}${pr[i]?`<span class="pr" title="${pr[i]==='kg'?'Bestes Gewicht':'Bestes geschätztes 1RM'}">${pr[i]==='kg'?'Bestwert':'1RM ↑'}</span>`:''}${s.notiz?` <small>· ${esc(s.notiz)}</small>`:''}</span><span class="t">${s.satzSek!=null?fClock(s.satzSek):''}${s.pauseSek!=null?(s.satzSek!=null?' · ':'')+'P '+fClock(s.pauseSek):''}</span></button>`).join('');
    return `<div class="card uk${isCur?' cur':''}" id="u-${esc(u)}"><div class="uh"><button class="us" data-cur="${esc(u)}"${run?'':' tabindex="-1"'}><b>${esc(uName(u,t))}</b>
        <span class="lm">${p?`Letztes Mal <i>(${fTag(p.t.datum)})</i>: ${satzListe(p.S)}`:'Zum ersten Mal'}</span></button>
      <button class="x" data-unote="${esc(u)}" aria-label="Notiz zu ${esc(uName(u,t))}" title="Notiz zur Übung">${ICO.note}</button>
      ${S.length?'':`<button class="x" data-urm="${esc(u)}" aria-label="${esc(uName(u,t))} aus dem Training nehmen" title="Aus dem Training nehmen">×</button>`}</div>
      ${noteOpen[u]||no?`<div class="unote"><input class="in" data-unotein="${esc(u)}" value="${esc(no)}" placeholder="z. B. Schulter zwickt" aria-label="Notiz zu ${esc(uName(u,t))}"></div>`:''}
      ${rows?`<div class="sl">${rows}</div>`:''}
      <div class="uadd">${run&&u!==cur&&!(L.phase==='satz'||L.phase==='eingabe')?`<button class="btn sm" data-cur="${esc(u)}">Als Nächstes</button>`:''}<button class="btn sm" data-sadd="${esc(u)}">+ Satz eintragen</button></div></div>`; }).join('');
  el.innerHTML=head+(run?timer(t,cur):'')+(cards||'<div class="card empty" style="margin-bottom:12px">Noch keine Übung. Füge unten die erste hinzu.</div>')
    +`<div class="tfoot"><button class="btn" data-uadd="1" style="align-self:flex-start">+ Übung hinzufügen</button>
      <div class="card stack"><label class="lbl">Wie war's? (Notiz zum Training)<textarea class="in" data-tnotiz="1" placeholder="z. B. müde, schlecht geschlafen – oder: lief richtig gut">${esc(t.notiz)}</textarea></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${t.reihe.length?'<button class="btn" data-tvorl="1">Als Vorlage speichern</button>':''}<span style="flex:1"></span><button class="btn dng" data-tdel="1">Training löschen</button></div></div></div>`; }
function timer(t,u){ const L=t.lauf||{}, ph=L.phase;
  if(!u) return `<div class="tim"><div class="tl"><span class="ph">Bereit</span><span class="un">Füge eine Übung hinzu, dann geht es los.</span></div><div class="acts"><button class="btn pri go" data-uadd="1">+ Übung hinzufügen</button></div></div>`;
  const n=satzVon(t,u).length+1, nm=esc(uName(u,t));
  if(ph==='satz') return `<div class="tim" aria-live="polite"><div class="tl"><div style="min-width:0"><div class="ph">Satz ${satzVon(t,u).length+1} läuft</div><div class="un">${nm}</div></div><span class="clk" data-tick="${L.seit}">${fClock((Date.now()-L.seit)/1000)}</span></div>
      <div class="acts"><button class="btn pri go" data-fertig="1">Fertig</button><button class="btn" data-abbr="1">Abbrechen</button></div></div>`;
  if(ph==='eingabe'){ const v=vorschlag(t,u), p=vorher(u,t.start,t.id), ps=p&&p.S[n-1];
    return `<div class="tim pause" aria-live="polite"><div class="tl"><div style="min-width:0"><div class="ph">Satz ${n} · fertig nach ${fClock(L.satzSek||0)}</div><div class="un">${nm}${ps?` <span class="cap">· letztes Mal ${satzTxt(ps)}</span>`:''}</div></div>
        <div style="text-align:right;margin-left:auto"><div class="cap">Pause</div><span class="clk sm" data-tick="${L.seit}">${fClock((Date.now()-L.seit)/1000)}</span></div></div>
      <div class="ent">${stepper('eKg','kg',v.kg,'Gewicht (kg)')}${stepper('eWdh','wdh',v.wdh,'Wiederholungen')}</div>
      <input class="in" id="eNotiz" placeholder="Notiz zum Satz (optional)" aria-label="Notiz zum Satz">
      <div class="acts"><button class="btn pri go" data-ssave="1">Speichern</button><button class="btn" data-sverw="1">Verwerfen</button></div></div>`; }
  if(ph==='pause') return `<div class="tim pause" aria-live="polite"><div class="tl"><div style="min-width:0"><div class="ph">Pause</div><div class="un">Als Nächstes: Satz ${n} · ${nm}</div></div><span class="clk" data-tick="${L.seit}">${fClock((Date.now()-L.seit)/1000)}</span></div>
      <div class="acts"><button class="btn pri go" data-go="${esc(u)}">Satz ${n} starten</button></div></div>`;
  return `<div class="tim"><div class="tl"><div style="min-width:0"><div class="ph">Bereit</div><div class="un">Als Erstes: ${nm}</div></div></div>
      <div class="acts"><button class="btn pri go" data-go="${esc(u)}">Satz ${n} starten</button></div></div>`; }
function stepper(id,k,v,label){ return `<div><div class="stepl">${label}</div><div class="step"><button type="button" data-step="${id}|-" aria-label="${label} weniger">−</button>
  <input class="in" id="${id}" inputmode="${k==='kg'?'decimal':'numeric'}" value="${v==null?'':String(v).replace('.',',')}" placeholder="${k==='kg'?'0':'–'}" aria-label="${label}"><button type="button" data-step="${id}|+" aria-label="${label} mehr">+</button></div></div>`; }

/* Verlauf: Trainings nach Wochen */
function vVerlauf(el){ const T=trainings(); if(!T.length){ el.innerHTML='<div class="card empty">Noch keine Trainings. Unter „Training“ eine Vorlage starten.</div>'; return; }
  const by={}, ord=[]; T.forEach(t=>{ const w=weekStart(t.datum); if(!by[w]){ by[w]=[]; ord.push(w); } by[w].push(t); });
  el.innerHTML=`<div class="head"><div class="tt">Verlauf<small>${T.length} ${T.length===1?'Training':'Trainings'} · antippen zum Ansehen und Bearbeiten</small></div></div>`
    +ord.map(w=>{ const L=by[w], ms=L.reduce((a,t)=>a+dauer(t),0); return `<div class="wh"><span>${w===weekStart(today())?'Diese Woche':'Woche ab '+fTag(w)}</span><span>${L.length} · ${fDauer(ms)}</span></div><div class="lst">${L.map(trRow).join('')}</div>`; }).join(''); }

/* Fortschritt je Übung: bestes Gewicht, geschätztes 1RM, Volumen */
function vFort(el){ if(progU) return vFortU(el,progU);
  const rows=uebungen().map(u=>({u,V:verlaufU(u.id)})).filter(x=>x.V.length).sort((a,b)=>b.V[b.V.length-1].t.start-a.V[a.V.length-1].t.start);
  const nie=uebungen().filter(u=>!rows.some(r=>r.u.id===u.id));
  el.innerHTML=`<div class="head"><div class="tt">Fortschritt<small>je Übung · 1RM = geschätztes Maximalgewicht für eine Wiederholung (Epley)</small></div></div>`
    +(rows.length?`<div class="lst">${rows.map(({u,V})=>{ const l=V[V.length-1], bk=Math.max(...V.map(x=>x.top)), be=Math.max(...V.map(x=>x.e1));
      return `<button class="li" data-prog="${esc(u.id)}"><span class="n">${esc(u.name)}</span><span class="k">${bk?fkg(bk)+' kg':l.wdh+' Wdh.'}</span><span class="s">zuletzt ${fTag(l.t.datum)}: ${satzListe(l.S)}${be?' · 1RM ≈ '+fmt(be)+' kg':''} · ${V.length} ${V.length===1?'Training':'Trainings'}</span></button>`; }).join('')}</div>`
      :'<div class="card empty">Noch keine Sätze eingetragen.</div>')
    +(nie.length?`<p class="cap" style="margin-top:12px">Noch nie trainiert: ${nie.map(u=>esc(u.name)).join(', ')}</p>`:''); }
function vFortU(el,id){ const V=verlaufU(id), nm=uName(id); if(!V.length){ progU=null; return vFort(el); }
  const bk=Math.max(...V.map(x=>x.top)), be=Math.max(...V.map(x=>x.e1)), n=V.reduce((a,x)=>a+x.S.length,0), bv=Math.max(...V.map(x=>x.vol));
  let svg='';
  const P=V.filter(x=>x.e1>0);
  if(P.length>=2){ const W=Math.round(Math.max(300,Math.min(640,(el.clientWidth||640)-34))),H=W<480?200:220,pl=44,pr=12,pt=14,pb=28, t0=P[0].t.start, t1=P[P.length-1].t.start, sp=Math.max(1,t1-t0);
    const vals=P.flatMap(x=>[x.e1,x.top]), lo=Math.floor(Math.min(...vals)*0.95/5)*5, hi=Math.ceil(Math.max(...vals)*1.03/5)*5||5, X=x=>pl+(x-t0)/sp*(W-pl-pr), Y=v=>pt+(1-(v-lo)/((hi-lo)||1))*(H-pt-pb);
    svg=[lo,(lo+hi)/2,hi].map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--border)"/><text x="${pl-6}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="var(--faint)" font-family="var(--mono)">${fmt(v)}</text>`).join('')
      +P.map(x=>`<circle cx="${X(x.t.start).toFixed(1)}" cy="${Y(x.top).toFixed(1)}" r="3.5" fill="var(--muted)" opacity=".6"><title>${fTag(x.t.datum)}: schwerster Satz ${fkg(x.top)} kg</title></circle>`).join('')
      +`<path d="${P.map((x,i)=>(i?'L':'M')+X(x.t.start).toFixed(1)+' '+Y(x.e1).toFixed(1)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`
      +P.map(x=>`<circle cx="${X(x.t.start).toFixed(1)}" cy="${Y(x.e1).toFixed(1)}" r="3" fill="var(--accent)"><title>${fTag(x.t.datum)}: 1RM ≈ ${fmt(x.e1,1)} kg</title></circle>`).join('')
      +`<text x="${pl}" y="${H-8}" font-size="11" fill="var(--faint)" font-family="var(--mono)">${fTag(P[0].t.datum)}</text><text x="${W-pr}" y="${H-8}" text-anchor="end" font-size="11" fill="var(--faint)" font-family="var(--mono)">${fTag(P[P.length-1].t.datum)}</text>`;
    svg=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf ${esc(nm)}">${svg}</svg><p class="cap" style="margin-top:6px">Linie: geschätztes 1RM · Punkte: schwerster Satz</p>`; }
  el.innerHTML=`<div class="head"><button class="ibtn" data-prog="" aria-label="Zurück zur Übersicht">${ICO.back}</button><div class="tt">${esc(nm)}<small>${V.length} ${V.length===1?'Training':'Trainings'} · ${n} Sätze</small></div></div>
    <div class="stack"><div class="pk"><div class="kpi"><b>${bk?fkg(bk)+' kg':'–'}</b><span>bestes Gewicht</span></div><div class="kpi"><b>${be?'≈ '+fmt(be)+' kg':'–'}</b><span>bestes 1RM (geschätzt)</span></div>
      <div class="kpi"><b>${bv?fmt(bv)+' kg':'–'}</b><span>meistes Volumen</span></div><div class="kpi"><b>${Math.max(...V.map(x=>Math.max(...x.S.map(s=>+s.wdh||0))))}</b><span>meiste Wdh. in einem Satz</span></div></div>
    ${svg?`<div class="card">${svg}</div>`:''}
    <div class="card"><h2>Alle Trainings</h2><div class="hist" style="margin-top:8px">${V.slice().reverse().map(x=>`<div class="hr2"><span class="d">${fTag(x.t.datum)}</span><span class="s">${satzListe(x.S)}${x.t.uebNotiz[id]?` <span class="cap">· ${esc(x.t.uebNotiz[id])}</span>`:''}</span><span class="e">${x.e1?'1RM '+fmt(x.e1):''}${x.vol?'<br>'+fmt(x.vol)+' kg':''}</span></div>`).join('')}</div></div></div>`; }

/* Übungen und Vorlagen verwalten */
function vUeb(el){ const V=vorlagen(), U=uebungen();
  const byG={}; U.forEach(u=>{ const g=GRUPPEN.includes(u.gruppe)?u.gruppe:'Sonstiges'; (byG[g]=byG[g]||[]).push(u); });
  el.innerHTML=`<div class="stack">
    <div class="card"><h2>Vorlagen<button class="btn sm" data-vedit="">+ Vorlage</button></h2>
      ${V.length?`<div class="lst" style="margin-top:10px">${V.map(v=>`<div class="orow"><span class="n">${esc(v.name)}<br><span class="cap" style="font-weight:400">${(v.uebungen||[]).filter(id=>UE(id)).length} Übungen: ${(v.uebungen||[]).filter(id=>UE(id)).map(id=>esc(uName(id))).join(', ')||'–'}</span></span>
        <button class="btn sm" data-vedit="${esc(v.id)}">Bearbeiten</button><button class="btn sm pri" data-start="${esc(v.id)}">Starten</button></div>`).join('')}</div>`:'<div class="empty">Noch keine Vorlage.</div>'}</div>
    <div class="card"><h2>Übungen<button class="btn sm" data-uedit="">+ Übung</button></h2>
      ${GRUPPEN.filter(g=>byG[g]).map(g=>`<div class="grp">${g}</div><div class="lst">${byG[g].map(u=>{ const V2=verlaufU(u.id); return `<button class="li" data-uedit="${esc(u.id)}"><span class="n">${esc(u.name)}</span><span class="k">${V2.length?V2.length+'×':''}</span></button>`; }).join('')}</div>`).join('')||'<div class="empty">Noch keine Übungen.</div>'}</div>
    <div class="card stack"><h2>Einstellungen</h2>
      <label class="lbl">Ziel: Trainings pro Woche (für die Dashboard-Kachel)<span style="display:flex;gap:8px;align-items:center">${[0,1,2,3,4,5,6].map(n=>`<button class="chip${+D.set.wochenziel===n?' on':''}" data-ziel="${n}">${n||'keins'}</button>`).join('')}</span></label>
      <label class="lbl">Schritt der ±-Knöpfe beim Gewicht<span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${[1,1.25,2.5,5].map(n=>`<button class="chip${+D.set.schritt===n?' on':''}" data-schritt="${n}">${fmt(n,2)} kg</button>`).join('')}</span></label></div>
  </div>`; }

/* ---------- Blätter (Dialoge) ---------- */
function uaddRes(s){ const t=D.trainings[s.t], q=norm(s.q||'').trim(), have=new Set(t?t.reihe:[]);
  const L=uebungen().filter(u=>!have.has(u.id)&&(!q||norm(u.name).includes(q))), exact=uebungen().some(u=>norm(u.name)===q);
  return (q&&!exact?`<div class="form"><label class="lbl">Muskelgruppe<select class="in" id="ugr">${GRUPPEN.map(g=>`<option${g==='Sonstiges'?' selected':''}>${g}</option>`).join('')}</select></label><span style="align-self:end;min-width:0"><button class="btn pri" data-unew="1" style="width:100%;white-space:normal">„${esc(s.q.trim())}“ anlegen</button></span></div>`:'')
    +`<div class="lst" id="ulist">${L.map(u=>`<button class="li" data-upick="${esc(u.id)}"><span class="n">${esc(u.name)}</span><span class="k">${esc(u.gruppe||'')}</span></button>`).join('')||'<div class="empty" style="padding:12px">Keine passende Übung.</div>'}</div>`; }
function openSheet(s){ sheet=s; drawSheet(); $('ov').classList.add('show'); }
function closeSheet(){ sheet=null; $('ov').classList.remove('show'); }
function drawSheet(){ const s=sheet, d=$('dlg'); if(!s) return; const X='<button class="x" data-close="1" aria-label="Schließen">×</button>';
  if(s.m==='uadd'){
    d.innerHTML=`<div class="dh"><h3 id="dlgT">Übung hinzufügen</h3>${X}</div><div class="db">
      <div class="srch">${ICO.srch}<input class="in" id="uq" type="search" placeholder="Suchen oder neue Übung eintippen" value="${esc(s.q||'')}" autocomplete="off" aria-label="Übung suchen"></div>
      <div id="ures" class="stack" style="gap:12px">${uaddRes(s)}</div></div>`;
    return; }
  if(s.m==='satz'){ const t=D.trainings[s.t], ed=s.i!=null, x=ed?t.saetze[s.i]:null, u=ed?x.uebung:s.u, v=ed?{kg:x.kg,wdh:x.wdh}:vorschlag(t,u);
    d.innerHTML=`<div class="dh"><h3 id="dlgT">${esc(uName(u,t))} · Satz ${ed?x.nr:satzVon(t,u).length+1}</h3>${X}</div><div class="db">
      <div class="form">${stepper('sKg','kg',v.kg,'Gewicht (kg)')}${stepper('sWdh','wdh',v.wdh,'Wiederholungen')}</div>
      <label class="lbl">Notiz (optional)<input class="in" id="sNotiz" value="${esc(ed&&x.notiz||'')}" placeholder="z. B. sauber, letzte Wdh. mit Hilfe"></label>
      ${ed&&(x.satzSek!=null||x.pauseSek!=null)?`<p class="cap">${x.satzSek!=null?'Satzzeit '+fClock(x.satzSek):''}${x.pauseSek!=null?(x.satzSek!=null?' · ':'')+'Pause danach '+fClock(x.pauseSek):''}</p>`:''}
      ${ed?'':'<p class="cap">Ohne Timer: Satz- und Pausenzeit bleiben leer.</p>'}</div>
      <div class="df">${ed?'<button class="btn dng" data-sdel="1">Löschen</button>':''}<span style="flex:1"></span><button class="btn pri" data-sok="1">Speichern</button></div>`; return; }
  if(s.m==='uedit'){ const u=s.id?D.uebungen[s.id]:null;
    d.innerHTML=`<div class="dh"><h3 id="dlgT">${u?'Übung bearbeiten':'Neue Übung'}</h3>${X}</div><div class="db"><div class="form">
      <label class="lbl w2">Name<input class="in" id="un" value="${esc(u?u.name:'')}" placeholder="z. B. Bankdrücken"></label>
      <label class="lbl w2">Muskelgruppe<select class="in" id="ug">${GRUPPEN.map(g=>`<option${(u?u.gruppe:'Sonstiges')===g?' selected':''}>${g}</option>`).join('')}</select></label></div>
      ${u?`<p class="cap">${verlaufU(u.id).length} Trainings mit dieser Übung. Löschen entfernt sie aus der Auswahl und aus Vorlagen; der Verlauf bleibt.</p>`:''}</div>
      <div class="df">${u?'<button class="btn dng" data-udel="1">Löschen</button>':''}<span style="flex:1"></span><button class="btn pri" data-usave="1">Speichern</button></div>`; return; }
  if(s.m==='vedit'){ const v=s.v;
    d.innerHTML=`<div class="dh"><h3 id="dlgT">${v.id&&D.vorlagen[v.id]?'Vorlage bearbeiten':'Neue Vorlage'}</h3>${X}</div><div class="db">
      <label class="lbl">Name<input class="in" id="vn" value="${esc(v.name)}" placeholder="z. B. Push"></label>
      <div class="lst">${v.uebungen.map((id,i)=>`<div class="orow"><span class="n">${esc(uName(id))}</span><button class="x" data-vmv="${i}|-1" ${i?'':'disabled'} aria-label="Nach oben">${ICO.up}</button><button class="x" data-vmv="${i}|1" ${i<v.uebungen.length-1?'':'disabled'} aria-label="Nach unten">${ICO.down}</button><button class="x" data-vrm="${i}" aria-label="${esc(uName(id))} entfernen">×</button></div>`).join('')||'<div class="empty" style="padding:12px">Noch keine Übungen.</div>'}</div>
      <div style="display:flex;gap:8px"><select class="in" id="vadd" aria-label="Übung wählen"><option value="">Übung hinzufügen …</option>${uebungen().filter(u=>!v.uebungen.includes(u.id)).map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</select></div></div>
      <div class="df">${v.id&&D.vorlagen[v.id]?'<button class="btn dng" data-vdel="1">Löschen</button>':''}<span style="flex:1"></span><button class="btn pri" data-vsave="1">Speichern</button></div>`; return; }
  if(s.m==='tedit'){ const t=D.trainings[s.t];
    d.innerHTML=`<div class="dh"><h3 id="dlgT">Training</h3>${X}</div><div class="db"><div class="form">
      <label class="lbl w2">Name<input class="in" id="tn" value="${esc(t.name)}"></label>
      <label class="lbl">Datum<input class="in" type="date" id="td" value="${t.datum}"></label><label class="lbl">Beginn<input class="in" type="time" id="ts" value="${fHM(t.start)}"></label>
      ${t.ende?`<label class="lbl">Ende<input class="in" type="time" id="te" value="${fHM(t.ende)}"></label>`:''}</div></div>
      <div class="df"><span style="flex:1"></span><button class="btn pri" data-tsave="1">Speichern</button></div>`; return; }
  if(s.m==='data'){ d.innerHTML=`<div class="dh"><h3 id="dlgT">Daten &amp; Backup</h3>${X}</div><div class="db">
      <p class="cap">Alles liegt im Browser${window.__PI_SYNC?' und auf dem Raspberry Pi (pro Eintrag abgeglichen)':''}. Eine JSON-Sicherung kannst du jederzeit wieder einlesen – Einträge werden zusammengeführt.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-exp="1">JSON-Backup speichern</button><button class="btn" data-imp="1">Backup einlesen</button></div>
      <div class="note">${trainings().length} Trainings · ${trainings().reduce((a,t)=>a+t.saetze.length,0)} Sätze · ${uebungen().length} Übungen · ${vorlagen().length} Vorlagen<br>Zuletzt gespeichert: ${D.savedAt?new Date(D.savedAt).toLocaleString('de-DE'):'noch nie'}</div>
      <p class="cap">Offline: Ist das Netz weg (z. B. im Gym ohne VPN), läuft alles weiter und wird später abgeglichen. Die Seite muss dafür einmal geladen sein. Timer zählen weiter, auch wenn das Handy gesperrt ist – einen Ton gibt es nicht.</p></div>`; return; }
}
