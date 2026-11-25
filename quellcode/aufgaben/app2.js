/* ---------- Bausteine ---------- */
const IC={rep:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
  cl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
  msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'};
/* Eine Zeile. o.date: Datum anzeigen (in Gruppen ohne Tagesbezug), o.status: Status-Pille */
function row(t,o){ o=o||{}; const done=t.status==='erledigt'||t.status==='abgelehnt', ov=isOver(t), m=[], l=list(t.liste), cm=logOf(t.id).filter(g=>!g.sys).length, ck=t.check||[];
  if(t.status==='neu') m.push(`<span class="pill neu">Wunsch${t.fuer!==me?' an '+esc(pName(t.fuer)):''} – wartet</span>`);
  else if(t.status==='arbeit') m.push('<span class="pill arbeit">in Arbeit</span>');
  else if(o.status&&t.status==='abgelehnt') m.push('<span class="pill abgelehnt">abgelehnt</span>');
  if(done&&t.erledigtVon) m.push(`<span>${av(t.erledigtVon,'s')} ${esc(pName(t.erledigtVon))} · ${esc(fTs(t.erledigtAm))}</span>`);
  if(!done&&t.due&&o.date) m.push(`<span class="${ov?'bad':t.due===today()?'warn':''}">${t.art==='am'?'am ':''}${esc(fDue(t.due,t.zeit))}</span>`);
  else if(!done&&t.zeit) m.push(`<span class="${ov?'bad':''}">${IC.clock}${esc(t.zeit)}</span>`);
  if(pr(t)&&!done) m.push(`<span class="pr${pr(t)}">${'!'.repeat(pr(t))} ${PRIO[pr(t)].toLowerCase()}</span>`);
  if(t.fuer&&t.fuer!==me&&t.status!=='neu') m.push(`<span>${av(t.fuer,'s')} ${esc(pName(t.fuer))}</span>`);
  if(t.von&&t.von!==me&&t.fuer===me) m.push(`<span>von ${esc(pName(t.von))}</span>`);
  if(isPriv(t)) m.push(`<span class="lk" title="Privat – nur du siehst diese Aufgabe">${IC.lock}privat</span>`);
  if(l) m.push(`<span><i class="dot" style="background:${esc(l.farbe)}"></i>${esc(l.name)}</span>`);
  if(t.wdh) m.push(`<span title="${esc(wdhText(t.wdh))}">${IC.rep}${esc(wdhText(t.wdh))}</span>`);
  if(ck.length) m.push(`<span>${IC.cl}${ck.filter(c=>c.ok).length}/${ck.length}</span>`);
  if(cm) m.push(`<span>${IC.msg}${cm}</span>`);
  const tk=canTick(t)||(done&&canEdit()&&t.status==='erledigt');
  return `<div class="task${done?' done':''}${!done&&pr(t)?' p'+pr(t):''}">
    <button class="ck" data-done="${t.id}" aria-pressed="${t.status==='erledigt'}" aria-label="${t.status==='erledigt'?'Wieder öffnen':'Erledigt'}: ${esc(t.titel)}"${tk?'':' disabled'}><i>${CHK}</i></button>
    <button class="tb" data-open="${t.id}"><span class="tt">${esc(t.titel)}${isNewFor(t)?'<span class="nw">neu</span>':''}</span>${m.length?`<span class="tm">${m.join('')}</span>`:''}</button></div>`; }
function sec(title,L,o){ o=o||{}; if(!L.length) return '';
  const max=o.max&&!o.all?o.max:L.length;
  return `<section class="sec${o.cls?' '+o.cls:''}"${o.id?` id="${o.id}"`:''}><h2>${title}${o.small?`<small>${o.small}</small>`:''}<span class="n">${L.length}</span></h2><div class="tasks">${L.slice(0,max).map(t=>row(t,o)).join('')}${L.length>max?`<button class="more" data-more="${o.more}">${L.length-max} weitere anzeigen</button>`:''}</div></section>`; }
function qaBox(ph){ if(!canEdit()) return ''; return `<div class="qa"><svg class="plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
  <input id="qa" placeholder="${esc(ph)}" value="${esc(qa)}" autocomplete="off" enterkeyhint="done" aria-label="Neue Aufgabe – Kürzel wie morgen, fr, 14 Uhr, !, #liste, @person">
  <button class="btn pri sm" data-new="1" aria-label="Hinzufügen"><span class="lg">Hinzufügen</span><span class="sh">+</span></button></div><div class="pv" id="pv">${qaPreview()}</div>`; }
function qaPreview(){ if(!qa.trim()) return `<span class="pc hint">Kürzel: morgen · fr · 12.11. · 14 Uhr · jeden Mo · ! / !! / !!! wichtig · #liste · @person</span>`; return chips(parse(qa)); }
function wenBar(withVon){ const O=[['me','Für mich']]; if(withVon) O.push(['von','Von mir']);
  if(seesAll()){ O.push(['alle','Alle']); PL.filter(p=>p.id!==me).forEach(p=>O.push([p.id,av(p.id)+esc(p.name)])); }
  return `<div class="chips" role="group" aria-label="Wessen Aufgaben">${O.map(([k,l])=>`<button class="chip" data-wen="${esc(k)}" aria-pressed="${wen===k}">${l}</button>`).join('')}</div>`; }

/* ---------- Ansichten ---------- */
function render(){
  if(!D) return;
  document.querySelectorAll('.nav button').forEach(b=>b.dataset.v===view?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  const d=new Date(); $('sub').textContent=WD[d.getDay()]+', '+d.getDate()+'. '+MON[d.getMonth()]+(ROLE&&ROLE.ro?' · nur ansehen':'');
  const p=person(me); $('whoBtn').innerHTML=p?`${av(me)}<span class="nm">${esc(p.name)}</span>`:'<span class="nm">Wer bist du?</span>';
  const nb=wishesForMe().length+newsForMe().length, b=$('inBadge'); b.hidden=!nb; b.textContent=nb;
  $('main').classList.toggle('wide',view==='anstehend');
  ({anstehend:vAnstehend,listen:vListen,erledigt:vErledigt}[view]||vAnstehend)($('main'));
  stamp(); }

function vAnstehend(el){ const td=today(), W=wishesForMe(), N=newsForMe();
  const L=tasks().filter(t=>(open(t)||(t.status==='neu'&&!(t.fuer===me)))&&inFilter(t)).sort(sortT);
  let h=qaBox(innerWidth<560||innerWidth>=1024?'Neue Aufgabe …':'Neue Aufgabe … z. B. Müll rausbringen morgen #haushalt');
  if(W.length) h+=`<section class="sec"><h2>Wünsche an dich<span class="n">${W.length}</span></h2>${W.sort((a,b)=>a.erst-b.erst).map(wishCard).join('')}</section>`;
  if(N.length) h+=`<div class="banner"><b>${N.length} ${N.length===1?'Aufgabe hat':'Aufgaben haben'} Neuigkeiten</b><button class="btn sm" data-news="1">${newsOpen?'Ausblenden':'Ansehen'}</button></div>${newsOpen?`<div class="tasks" style="margin-top:8px">${N.map(t=>row(t,{date:1})).join('')}</div>`:''}`;
  h+=`<div class="bar">${wenBar(true)}</div>`;
  // 7-Tage-Leiste
  const cnt={}, over=L.filter(t=>t.due&&t.due<td); L.forEach(t=>{ if(t.due) cnt[t.due]=(cnt[t.due]||0)+1; });
  h+=`<div class="week" role="group" aria-label="Die nächsten 7 Tage">${[0,1,2,3,4,5,6].map(i=>{ const k=kAdd(td,i), n=cnt[k]||0;
    return `<button class="wd${i===0?' td':''}${wd(k)%6===0?' we':''}" data-day="${k}" aria-label="${esc(fDay(k))}: ${n} offen"><span>${i===0?'Heute':WK[wd(k)]}</span><b>${kDate(k).getDate()}</b><span class="n${n?'':' z'}">${n||'·'}</span></button>`; }).join('')}</div>`;
  if(over.length) h+=`<div class="over">${over.length} überfällig</div>`;
  // Zeitleiste (am PC rechte Spalte)
  const side=h; h='';
  const g=(f)=>L.filter(f);
  h+=sec('Überfällig',g(t=>t.due&&t.due<td),{cls:'bad',date:1,id:'d-over'});
  h+=sec('Heute',g(t=>t.due===td),{cls:'today',id:'d-'+td,small:fDay(td).split(',')[1]});
  h+=sec('Morgen',g(t=>t.due===kAdd(td,1)),{id:'d-'+kAdd(td,1),small:WD[wd(kAdd(td,1))]});
  for(let i=2;i<7;i++){ const k=kAdd(td,i); h+=sec(WD[wd(k)],g(t=>t.due===k),{id:'d-'+k,small:kDate(k).getDate()+'. '+MON[kDate(k).getMonth()]}); }
  h+=sec('Nächste Woche',g(t=>t.due&&t.due>=kAdd(td,7)&&t.due<=kAdd(td,13)),{date:1});
  h+=sec('Später',g(t=>t.due&&t.due>kAdd(td,13)),{date:1,max:8,all:laterAll,more:'later'});
  h+=sec('Ohne Datum',g(t=>!t.due),{});
  if(!L.length) h+=`<div class="card" style="margin-top:14px"><div class="empty">${wen==='me'?'Für dich ist nichts offen.':'Hier ist nichts offen.'}${canEdit()?' Oben eine neue Aufgabe eintragen.':''}</div></div>`;
  el.innerHTML=`<div class="cols"><div class="side">${side}</div><div class="flow">${h}</div></div>`; }
function wishCard(t){ const ck=t.check||[];
  return `<div class="wish"><div class="wh">${av(t.von)}<div style="min-width:0;flex:1"><div class="wt">${esc(t.titel)}</div><div class="ws">von ${esc(pName(t.von))} · ${esc(fTs(t.erst))}${t.due?' · '+(t.art==='am'?'am ':'bis ')+esc(fDue(t.due,t.zeit)):''}${pr(t)?' · '+PRIO[pr(t)].toLowerCase():''}${ck.length?' · '+ck.length+' Punkte':''}</div></div></div>
    ${t.notiz?`<div class="wn">${esc(t.notiz)}</div>`:''}
    ${canEdit()?`<div class="wa"><button class="btn pri" data-acc="${t.id}">Annehmen</button><input class="in" type="date" id="wd_${t.id}" value="${t.due||''}" aria-label="Frist für ${esc(t.titel)}">
      <span style="flex:1"></span><button class="btn" data-open="${t.id}" data-ask="1">Rückfrage</button><button class="btn dng" data-rej="${t.id}">Ablehnen</button></div>`:''}</div>`; }

function vListen(el){ const V=tasks().filter(t=>inFilter(t)||wen==='alle');
  if(curList){ const l=curList==='-'?{id:'-',name:'Ohne Liste',farbe:'#7D8597'}:list(curList); if(!l){ curList=null; return vListen(el); }
    const X=V.filter(t=>curList==='-'?!list(t.liste):t.liste===l.id), O=X.filter(t=>open(t)||t.status==='neu').sort(sortT), E=X.filter(t=>t.status==='erledigt').sort((a,b)=>(b.erledigtAm||0)-(a.erledigtAm||0));
    el.innerHTML=`<div class="lhead"><button class="btn sm" data-list="">← Listen</button><i class="dot" style="width:12px;height:12px;background:${esc(l.farbe)}"></i><h2>${esc(l.name)}</h2></div>
      <div style="margin-top:12px">${qaBox('Neu in „'+l.name+'“ …')}</div><div class="bar">${wenBar(false)}</div>
      ${sec('Offen',O,{date:1})||'<div class="card" style="margin-top:14px"><div class="empty">Nichts offen in dieser Liste.</div></div>'}
      ${sec('Erledigt',E,{max:5,all:laterAll,more:'later',status:1})}`; return; }
  const card=(id,name,farbe,X)=>{ const O=X.filter(open).sort(sortT), nx=O.find(t=>t.due);
    return `<button class="lc" data-list="${esc(id)}" style="--lc:${esc(farbe)}"><b>${esc(name)}</b><span class="c">${O.length} offen${nx?' · nächste '+esc(fDue(nx.due)):''}</span></button>`; };
  const none=V.filter(t=>!list(t.liste));
  el.innerHTML=`<div class="bar">${wenBar(false)}</div><div class="lists">${lists().map(l=>card(l.id,l.name,l.farbe,V.filter(t=>t.liste===l.id))).join('')}
    ${none.length?card('-','Ohne Liste','#7D8597',none):''}${canEdit()?'<button class="lc" data-ladd2="1" style="--lc:var(--border-strong);align-items:center;justify-content:center"><b>+ Neue Liste</b></button>':''}</div>`; }

function vErledigt(el){ const T=tasks().filter(t=>(t.status==='erledigt'||t.status==='abgelehnt')&&(wen==='alle'||inFilter(t)||(wen==='me'&&t.erledigtVon===me))).sort((a,b)=>(b.erledigtAm||b.upd)-(a.erledigtAm||a.upd));
  const by={}; T.slice(0,doneN).forEach(t=>{ const k=iso(new Date(t.erledigtAm||t.upd)); (by[k]=by[k]||[]).push(t); });
  const d7=T.filter(t=>t.status==='erledigt'&&t.erledigtAm>Date.now()-7*864e5), cnt={}; d7.forEach(t=>cnt[t.erledigtVon]=(cnt[t.erledigtVon]||0)+1);
  el.innerHTML=`<div class="bar">${wenBar(true)}</div>
    ${d7.length?`<div class="card" style="margin-top:10px"><div class="lt" style="margin-bottom:8px">Letzte 7 Tage · ${d7.length} erledigt</div><div class="stats">${Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([p,n])=>`<span>${av(p,'s')} ${esc(pName(p))} <b>${n}</b></span>`).join('')}</div></div>`:''}
    ${Object.keys(by).map(k=>sec(k===today()?'Heute':k===kAdd(today(),-1)?'Gestern':fDay(k),by[k],{status:1})).join('')||'<div class="card" style="margin-top:14px"><div class="empty">Noch nichts erledigt.</div></div>'}
    ${T.length>doneN?`<button class="btn" data-more-done="1" style="margin-top:12px">Ältere anzeigen</button>`:''}`; }
