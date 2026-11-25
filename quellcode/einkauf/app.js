"use strict";
/* =====================================================================
   EINKAUFSLISTE – eine gemeinsame Liste für die Familie
   Eintippen („2 Milch, Brot (Vollkorn), 500 g Hack“) → landet im passenden Laden-Bereich.
   Im Laden der Reihe nach abhaken; Gekauftes rutscht nach unten („Im Wagen“) und lässt sich aufräumen.
   Was oft gekauft wird, steht als Vorschlag bereit. An jedem Eintrag: wer ihn eingetragen bzw. gekauft hat.
   Speicher: localStorage[KEY] = {items, arts, set}. Sammlungen {id:{…,upd}} führt der Pi pro Eintrag zusammen
   (Sync „liste“). Läuft auch ohne Pi (lokal, Artefakt).
   ===================================================================== */
const KEY='einkauf_v1', APP='einkauf', THEME='launcher_theme';   // Hell/Dunkel: gemeinsamer Schlüssel mit Dashboard und Tools
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const norm=s=>String(s||'').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
const CHK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const H=36e5, D_GEKAUFT=24*H, D_WEG=7*24*H;   // Gekauftes: 24 Std. „Im Wagen“ sichtbar, nach 7 Tagen räumt die App selbst auf

/* ---------- Laden-Bereiche und Zuordnung ---------- */
const BER=[['obst','Obst & Gemüse'],['brot','Brot & Backwaren'],['kuehl','Kühlregal'],['fleisch','Fleisch & Fisch'],['tk','Tiefkühl'],['vorrat','Vorrat & Konserven'],
  ['frueh','Frühstück & Süßes'],['getr','Getränke'],['drog','Drogerie & Haushalt'],['sonst','Sonstiges']];
const BL=Object.fromEntries(BER);
/* Stichwörter (normalisiert). „=wort“ zählt nur als ganzes Wort. Gewinnt das Stichwort, das am weitesten hinten endet –
   bei deutschen Zusammensetzungen bestimmt der letzte Teil: Apfel|saft → Getränke, Tomaten|mark → Vorrat. */
const KW={obst:'apfel aepfel banane birne orange mandarine clementine zitrone limette traube erdbeer heidelbeer himbeer beeren kiwi mango ananas melone avocado tomate gurke paprika salat karotte moehre zwiebel knoblauch kartoffel brokkoli blumenkohl zucchini aubergine spinat pilz champignon lauch porree kohl ingwer petersilie basilikum schnittlauch kraeuter obst gemuese rucola radieschen sellerie kuerbis fenchel spargel',
  brot:'brot broetchen toast baguette croissant laugen brezel semmel kuchen wrap tortilla zwieback',
  kuehl:'milch joghurt jogurt quark skyr kaese butter sahne schmand frischkaese mozzarella feta parmesan gouda =ei eier margarine wurst schinken salami aufschnitt hummus tofu pudding kefir buttermilch wuerstchen fleischwurst',
  fleisch:'haehnchen huhn pute rind rinder schwein hack hackfleisch steak schnitzel fleisch fisch lachs garnelen forelle bratwurst gulasch',
  tk:'tiefkuehl =tk pizza =eis eiscreme pommes fischstaebchen kroketten',
  vorrat:'nudeln spaghetti penne pasta reis mehl zucker salz oel essig dose konserve bohnen linsen kichererbsen tomatenmark bruehe gewuerz pfeffer paprikapulver senf ketchup mayo mayonnaise sosse sauce couscous bulgur backpulver hefe thunfisch mais oliven kokosmilch',
  frueh:'muesli haferflocken cornflakes marmelade konfituere honig nutella schokolade kekse chips gummibaerchen suessigkeiten kaffee =tee kakao nuesse mandeln riegel erdnussbutter cracker knaeckebrot',
  getr:'wasser sprudel mineralwasser saft cola limo limonade bier wein sekt schorle getraenk eistee mate sirup radler',
  drog:'klopapier toilettenpapier kuechenrolle taschentuecher spuelmittel spueli waschmittel weichspueler zahnpasta zahnbuerste shampoo duschgel seife deo muellbeutel muelltueten schwamm tabs reiniger windeln creme rasierer alufolie frischhaltefolie backpapier batterie batterien kerzen pflaster'};
const KWL=[]; Object.entries(KW).forEach(([b,s])=>s.split(' ').forEach(w=>{ const whole=w[0]==='='; KWL.push({b,w:whole?w.slice(1):w,whole}); }));
/* Mehrwort-Stichwörter */
['passierte tomaten','gehackte tomaten','creme fraiche'].forEach(w=>KWL.push({b:w==='creme fraiche'?'kuehl':'vorrat',w,whole:false}));
function guessBer(name){ const a=D&&D.arts[artId(name)]; if(a&&!a.del&&BL[a.ber]) return a.ber;
  const n=' '+norm(name)+' '; let best=null;
  KWL.forEach(k=>{ let i, end;
    if(k.whole){ i=n.lastIndexOf(' '+k.w+' '); if(i<0) return; end=i+1+k.w.length; }
    else { i=n.lastIndexOf(k.w); if(i<0) return; end=i+k.w.length; }
    if(!best||end>best.end||(end===best.end&&k.w.length>best.len)) best={end,len:k.w.length,b:k.b}; });
  return best?best.b:'sonst'; }

/* ---------- Personen (vom Pi) ---------- */
const DEFP=[{id:'alex',name:'Alex',farbe:'#5B4BE0',owner:true},{id:'sam',name:'Sam',farbe:'#E0673A'},{id:'kim',name:'Kim',farbe:'#2C7BD6'},{id:'robin',name:'Robin',farbe:'#16A85A'}];
const ROLE=window.__PI_ROLE||null;
let PL=DEFP.slice(), me=null;
try{ const c=JSON.parse(localStorage.getItem('pd_personen')||'null'); if(c&&c.length) PL=c; me=localStorage.getItem('pd_person')||null; }catch(e){}
if(ROLE) me=ROLE.pid||null;
const person=id=>PL.find(p=>p.id===id)||(id?{id,name:id,farbe:'#7D8597'}:null);
const pName=id=>{ const p=person(id); return p?p.name:'–'; };
const av=(id,cls)=>{ const p=person(id); return p?`<span class="av${cls?' '+cls:''}" style="background:${esc(p.farbe||'#7D8597')}" title="${esc(p.name)}" aria-hidden="true">${esc((p.name||'?').charAt(0).toUpperCase())}</span>`:''; };
const canEdit=()=>!ROLE||(ROLE.tools&&ROLE.tools[APP]==='edit');
function loadPersons(){ if(location.protocol==='file:'||!window.__PI_SYNC) return;
  fetch('/api/personen').then(r=>r.ok?r.json():null).then(x=>{ if(x&&x.list&&x.list.length){ PL=x.list; try{ localStorage.setItem('pd_personen',JSON.stringify(PL)); }catch(_){} render(); } }).catch(()=>{}); }

/* ---------- Zustand ---------- */
let D, sheet=null, qa='', lastAdd=[];
const DEFSET=()=>({upd:0,order:BER.map(b=>b[0])});
function normalize(x){ x=x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  ['items','arts'].forEach(c=>{ if(!x[c]||typeof x[c]!=='object'||Array.isArray(x[c])) x[c]={}; });
  const d=DEFSET(); x.set=x.set&&typeof x.set==='object'?x.set:d;
  if(!Array.isArray(x.set.order)) x.set.order=d.order;
  x.set.order=x.set.order.filter(k=>BL[k]); BER.forEach(([k])=>{ if(!x.set.order.includes(k)) x.set.order.push(k); });   // neue Bereiche hinten anfügen
  if(x.set.upd==null) x.set.upd=0;
  Object.values(x.items).forEach(it=>{ if(it&&!it.del){ if(!BL[it.ber]) it.ber='sonst'; if(it.status!=='gekauft') it.status='offen'; } });
  x.app=APP; x.v=1; x.savedAt=+x.savedAt||0; return x; }
function load(){ let x=null; try{ x=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){} D=normalize(x); }
let sumT=null;
function save(){ if(!canEdit()) return; D.savedAt=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){ toast('Speichern im Browser nicht möglich'); }
  clearTimeout(sumT); sumT=setTimeout(pushSum,1200); stamp(); }
const live=c=>Object.values(D[c]).filter(x=>x&&!x.del);
function put(c,it){ it.upd=Date.now(); D[c][it.id]=it; return it; }
function rm(c,id){ if(D[c][id]) D[c][id]={id,upd:Date.now(),del:true}; }
const artId=name=>'a-'+norm(name).replace(/ /g,'-').slice(0,60);
const offen=()=>live('items').filter(i=>i.status==='offen');
const imWagen=()=>live('items').filter(i=>i.status==='gekauft'&&Date.now()-(+i.gekauftAm||0)<D_GEKAUFT).sort((a,b)=>b.gekauftAm-a.gekauftAm);
const gekaufte=()=>live('items').filter(i=>i.status==='gekauft');
const ord=k=>{ const i=D.set.order.indexOf(k); return i<0?99:i; };

/* ---------- Schnelleingabe ----------
   Mehrere Artikel mit Komma, Semikolon oder Zeilenumbruch. Menge vorn oder hinten („2 Milch“, „Milch 2x“, „500 g Hack“),
   Notiz in Klammern oder nach „ – “ („Brot (Vollkorn)“, „Käse – der würzige“). */
const UNIT='x|×|stk|stück|stueck|g|gr|kg|ml|l|liter|pck|packung|packungen|pk|dose|dosen|fl|flasche|flaschen|bund|becher|glas|gläser|netz|beutel|tüte|tüten|kiste|kisten|rolle|rollen|tafel|tafeln|scheiben|kopf';
const RE_VORN=new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})?\\.?\\s+(.+)$`,'i'), RE_HINTEN=new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})?\\.?$`,'i');
const mengeTxt=(n,u)=>{ n=String(n).replace('.',','); if(!u) return n; return /^(x|×)$/i.test(u)?n+'×':n+' '+u; };
function parseOne(s){ s=s.replace(/\s+/g,' ').trim(); if(!s) return null; let notiz='', menge='';
  s=s.replace(/\(([^)]*)\)/g,(m,x)=>{ notiz=(notiz?notiz+', ':'')+x.trim(); return ' '; }).replace(/\s+/g,' ').trim();
  const d=/^(.+?)\s+[–—-]\s+(.+)$/.exec(s); if(d){ s=d[1].trim(); notiz=(notiz?notiz+', ':'')+d[2].trim(); }
  let m=RE_VORN.exec(s); if(m){ menge=mengeTxt(m[1],m[2]); s=m[3]; }
  else if((m=RE_HINTEN.exec(s))){ menge=mengeTxt(m[2],m[3]); s=m[1]; }
  s=s.trim(); if(!s) return null;
  return {name:s.charAt(0).toUpperCase()+s.slice(1),menge,notiz}; }
const parseAll=raw=>String(raw||'').split(/[,;\n]+/).map(parseOne).filter(Boolean);
function qaPreview(){ const L=parseAll(qa);
  if(!L.length) return '<span class="pc hint">z. B. 2 Milch, Brot (Vollkorn), 500 g Hack – mehrere mit Komma</span>';
  return L.map(r=>`<span class="pc">${esc(r.name)}${r.menge?' · '+esc(r.menge):''} <i>→ ${esc(BL[guessBer(r.name)])}</i></span>`).join(''); }

/* ---------- Ändern ---------- */
function addItems(L){ if(!canEdit()||!L.length) return; const added=[], dup=[];
  L.forEach(r=>{ const ex=offen().find(i=>norm(i.name)===norm(r.name));
    if(ex){ if(r.menge||r.notiz||(r.ber&&r.ber!==ex.ber)){ if(r.menge) ex.menge=r.menge; if(r.notiz) ex.notiz=r.notiz; if(r.ber&&BL[r.ber]) ex.ber=r.ber; put('items',ex); added.push(ex.id); } else dup.push(ex); return; }   // steht schon drauf
    const ber=r.ber&&BL[r.ber]?r.ber:guessBer(r.name);
    const it=put('items',{id:uid('i'),name:r.name,menge:r.menge||'',notiz:r.notiz||'',ber,von:me||'',erst:Date.now(),status:'offen'});
    const aid=artId(r.name), a=D.arts[aid]&&!D.arts[aid].del?D.arts[aid]:{id:aid,n:0,last:0};
    put('arts',{...a,name:r.name,ber}); added.push(it.id); });
  save(); lastAdd=added.concat(dup.map(i=>i.id)); render();
  if(dup.length&&!added.length) toast(dup.length===1?`„${dup[0].name}“ steht schon drauf`:`${dup.length} Artikel stehen schon drauf`);
  else toast(added.length===1?`„${D.items[added[0]].name}“ eingetragen`:`${added.length} Artikel eingetragen`,()=>{ added.forEach(id=>{ if(D.items[id]&&D.items[id].erst>Date.now()-6e4) rm('items',id); }); save(); render(); }); }
function tick(id){ const it=D.items[id]; if(!it||it.del||!canEdit()) return; const was=JSON.parse(JSON.stringify(it));
  if(it.status==='gekauft'){ it.status='offen'; it.gekauftVon=null; it.gekauftAm=null; delete it.bestellt; put('items',it); artCount(it,-1); save(); render(); return; }
  it.status='gekauft'; it.gekauftVon=me||''; it.gekauftAm=Date.now(); put('items',it); artCount(it,1); save(); render();
  toast(`${it.name} im Wagen`,()=>{ D.items[id]=was; put('items',D.items[id]); artCount(was,-1); save(); render(); }); }
function artCount(it,d){ const aid=artId(it.name), a=D.arts[aid]&&!D.arts[aid].del?D.arts[aid]:{id:aid,name:it.name,ber:it.ber,n:0};
  put('arts',{...a,n:Math.max(0,(+a.n||0)+d),last:d>0?Date.now():a.last||0}); }
/* ---------- CSV-Export für eine Online-Bestellung (z. B. REWE über einen KI-Assistenten, Skill „rewe-bestellung“) ----------
   Eine Zeile je offenem Artikel in Laden-Reihenfolge. Spalten:
   nr · artikel · anzahl (Packungen/Stück, mind. 1) · gesamtmenge + einheit (nur bei g/kg/ml/l: gewünschte Menge insgesamt)
   · menge_original (wie eingetippt) · notiz (Wünsche, die beim Produkt gelten: Bio, laktosefrei, Marke …)
   · suchbegriff (artikel + notiz, für die Shop-Suche) · bereich · eingetragen_von. Komma-getrennt, UTF-8, Felder bei Bedarf in "…". */
const MASS={g:'g',gr:'g',kg:'kg',ml:'ml',l:'l',liter:'l'};
function mengeTeile(m){ m=String(m||'').trim(); if(!m) return {anzahl:1,wert:'',einheit:''};
  const x=/^(\d+(?:[.,]\d+)?)\s*(?:(x|×)|([a-zäöüß.]+))?$/i.exec(m); if(!x) return {anzahl:1,wert:'',einheit:''};
  const n=parseFloat(x[1].replace(',','.')), u=(x[3]||'').toLowerCase().replace(/\.$/,'');
  if(MASS[u]) return {anzahl:1,wert:String(n).replace('.',','),einheit:MASS[u]};
  return {anzahl:Math.max(1,Math.round(n)),wert:'',einheit:''}; }
const csvF=v=>{ v=String(v??''); return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
const ladenSort=L=>L.sort((a,b)=>ord(a.ber)-ord(b.ber)||(a.erst||0)-(b.erst||0));
function csvExport(liste){ const O=ladenSort((liste||offen()).slice());
  const L=[['nr','artikel','anzahl','gesamtmenge','einheit','menge_original','notiz','suchbegriff','bereich','eingetragen_von']];
  O.forEach((i,k)=>{ const m=mengeTeile(i.menge); L.push([k+1,i.name,m.anzahl,m.wert,m.einheit,i.menge||'',i.notiz||'',(i.name+' '+(i.notiz||'')).trim(),BL[i.ber],pName(i.von)]); });
  return L.map(r=>r.map(csvF).join(',')).join('\n')+'\n'; }
const csvName=()=>{ const d=new Date(); return 'einkauf-rewe-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'.csv'; };
/* Auswahl im Export-Blatt: beim Öffnen sind alle offenen Artikel gewählt. Abgewählte (z. B. im Shop-Warenkorb wieder entfernt)
   kommen nicht in die CSV und werden beim Abhaken ausgelassen. Was erst nach dem Öffnen eingetragen wird, bleibt außen vor. */
const expAlle=()=>sheet&&sheet.m==='exp'?ladenSort(offen().filter(i=>sheet.ids.includes(i.id))):ladenSort(offen());
const expWahl=()=>sheet&&sheet.m==='exp'?expAlle().filter(i=>sheet.sel.has(i.id)):expAlle();
const expCsv=()=>csvExport(expWahl());
function openExp(){ const O=offen(); openSheet({m:'exp',ids:O.map(i=>i.id),sel:new Set(O.map(i=>i.id))}); }
function expBtnTxt(n,t){ return !n?'Nichts ausgewählt':n===t?(t===1?'Als bestellt abhaken':`Alle ${t} als bestellt abhaken`):`${n} von ${t} als bestellt abhaken`; }
function expUpdate(){ const A=expAlle(), W=expWahl(), ta=$('csvTa'), b=document.querySelector('[data-bestellt]'), z=$('expN'), all=document.querySelector('[data-selall]');
  if(ta) ta.value=expCsv();
  if(z) z.textContent=`${W.length} von ${A.length}`;
  if(b){ b.textContent=expBtnTxt(W.length,A.length); b.disabled=!W.length; }
  if(all) all.textContent=W.length===A.length?'Keine':'Alle';
  ['csvdl','csvcp'].forEach(k=>{ const x=document.querySelector(`[data-${k}]`); if(x) x.disabled=!W.length; }); }
function csvDownload(){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([expCsv()],{type:'text/csv;charset=utf-8'})); a.download=csvName();
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); toast('CSV gespeichert'); }
/* Kopieren: auf dem Pi (http) gibt es die Zwischenablage-Schnittstelle nicht – dann über das markierte Textfeld */
function csvCopy(){ const t=expCsv(), ta=$('csvTa');
  const alt=()=>{ if(!ta) return toast('Kopieren nicht möglich'); ta.focus(); ta.select(); ta.setSelectionRange(0,t.length); let ok=false; try{ ok=document.execCommand('copy'); }catch(_){} toast(ok?'CSV kopiert':'Text ist markiert – jetzt kopieren'); };
  if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(t).then(()=>toast('CSV kopiert')).catch(alt); else alt(); }
/* Nach der Bestellung: die ausgewählten Artikel als bestellt abhaken (mit Rückgängig) */
function alleBestellt(liste){ const O=(liste||offen()).filter(i=>i&&!i.del&&i.status==='offen'); if(!O.length) return; const was=O.map(i=>JSON.parse(JSON.stringify(i))), now=Date.now();
  O.forEach(i=>{ i.status='gekauft'; i.gekauftVon=me||''; i.gekauftAm=now; i.bestellt=1; put('items',i); artCount(i,1); }); save(); closeSheet();
  toast(`${O.length} Artikel als bestellt abgehakt`,()=>{ was.forEach(w=>{ D.items[w.id]=w; put('items',D.items[w.id]); artCount(w,-1); }); save(); render(); }); }
function aufraeumen(){ const G=gekaufte(); G.forEach(i=>rm('items',i.id)); save(); render(); toast(G.length===1?'1 gekaufter Artikel entfernt':`${G.length} gekaufte Artikel entfernt`); }
/* Oft gekauft: zuerst, was am häufigsten gekauft wurde; ohne Verlauf ein paar übliche Artikel */
const START=['Milch','Brot','Eier','Butter','Bananen','Äpfel','Käse','Joghurt','Nudeln','Klopapier'];
function oft(){ const on=new Set(offen().map(i=>norm(i.name)));
  const A=live('arts').filter(a=>(+a.n||0)>0&&!on.has(norm(a.name))).sort((a,b)=>(b.n-a.n)||(b.last-a.last)).slice(0,14).map(a=>a.name);
  return A.length>=4?A:A.concat(START.filter(n=>!on.has(norm(n))&&!A.some(x=>norm(x)===norm(n)))).slice(0,12); }

/* ---------- Ansicht ---------- */
const fT=ts=>{ const d=new Date(ts), t=new Date(); const heute=d.toDateString()===t.toDateString(), gestern=new Date(t-864e5).toDateString()===d.toDateString();
  return (heute?'heute':gestern?'gestern':d.getDate()+'.'+(d.getMonth()+1)+'.')+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); };
function row(it){ const done=it.status==='gekauft', ed=canEdit(), m=[];
  if(it.notiz) m.push(`<span class="no">${esc(it.notiz)}</span>`);
  if(done) m.push(`<span>${av(it.gekauftVon,'s')}${it.bestellt?'bestellt':'gekauft'} von ${esc(it.gekauftVon===me?'dir':pName(it.gekauftVon))}</span>`);
  else if(it.von&&it.von!==me) m.push(`<span>${av(it.von,'s')}von ${esc(pName(it.von))}</span>`);
  return `<div class="it${done?' done':''}${lastAdd.includes(it.id)?' flash':''}">
    <button class="ck" data-tick="${it.id}" aria-pressed="${done}" aria-label="${done?'Zurück auf die Liste':'Gekauft'}: ${esc(it.name)}"${ed?'':' disabled'}><i>${CHK}</i></button>
    <button class="ib" data-edit="${it.id}"${ed?'':' disabled'}><span class="nm">${esc(it.name)}${it.menge?`<span class="mg">${esc(it.menge)}</span>`:''}</span>${m.length?`<span class="mt">${m.join('')}</span>`:''}</button></div>`; }
function render(){ if(!D) return; const O=offen(), W=imWagen(), G=gekaufte(), ed=canEdit();
  $('sub').textContent=O.length?`${O.length} ${O.length===1?'Artikel':'Artikel'} offen`+(W.length?` · ${W.length} im Wagen`:''):(W.length?`${W.length} im Wagen`:'alles erledigt')+(ROLE&&ROLE.ro?' · nur ansehen':'');
  $('meAv').innerHTML=me?av(me):'';
  let h='';
  if(ed) h+=`<div class="qwrap"><div class="qa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    <input id="qa" value="${esc(qa)}" placeholder="Was fehlt? z. B. 2 Milch, Brot" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" aria-label="Artikel eintragen – mehrere mit Komma, Menge vorn oder hinten, Notiz in Klammern">
    <button class="btn pri sm" data-add="1">Eintragen</button></div><div class="pv" id="pv">${qaPreview()}</div></div>`;
  const F=ed?oft():[];
  if(F.length) h+=`<div class="oft"><div class="lt">Oft gekauft</div><div class="chips" role="group" aria-label="Oft gekauft – antippen zum Eintragen">${F.map(n=>`<button class="chip" data-oft="${esc(n)}"><b>+</b> ${esc(n)}</button>`).join('')}</div></div>`;
  const by={}; O.forEach(i=>(by[i.ber]=by[i.ber]||[]).push(i));
  Object.keys(by).sort((a,b)=>ord(a)-ord(b)).forEach(b=>{ const L=by[b].sort((x,y)=>(x.erst||0)-(y.erst||0));
    h+=`<section class="sec"><h2>${esc(BL[b])}<span class="n">${L.length}</span></h2><div class="list">${L.map(row).join('')}</div></section>`; });
  if(!O.length) h+=`<div class="card" style="margin-top:16px"><div class="empty">${W.length?'Alles im Wagen.':'Die Liste ist leer.'}${ed?' Oben eintippen, was fehlt – mehrere Artikel mit Komma.':''}</div></div>`;
  if(W.length) h+=`<section class="sec wagen"><h2>Im Wagen<span class="n">${W.length}</span></h2><div class="list">${W.map(row).join('')}</div></section>`;
  if((G.length||O.length)&&ed) h+=`<div class="row2">${O.length?'<button class="btn sm" data-exp="1">Export für Online-Bestellung</button>':''}${G.length?`<button class="btn sm" data-clear="1">Gekaufte entfernen (${G.length})</button>`:''}</div>`;
  const a=document.activeElement, keep=a&&a.id==='qa', pos=keep?a.selectionStart:0;
  $('main').innerHTML=h; lastAdd=[];
  if(keep){ const q=$('qa'); if(q){ q.focus(); try{ q.setSelectionRange(pos,pos); }catch(_){} } }
  stamp(); }

/* ---------- Blätter ---------- */
function openSheet(s){ sheet=s; drawSheet(); $('ov').classList.add('show'); }
function closeSheet(){ sheet=null; $('ov').classList.remove('show'); render(); }
function drawSheet(){ const s=sheet, d=$('dlg'); if(!s) return;
  if(s.m==='edit'){ const neu=!s.id, it=neu?s.neu:D.items[s.id]; if(!it||it.del) return closeSheet(); const b=s.ber||it.ber;
    d.innerHTML=`<div class="dh"><h3 id="dlgT">${neu?'Neuer Artikel':esc(it.name)}</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db">
      <div class="fs"><label class="lt" for="eN">Artikel</label><input class="in" id="eN" value="${esc(it.name)}"></div>
      <div class="two"><div class="fs"><label class="lt" for="eM">Menge</label><input class="in" id="eM" value="${esc(it.menge)}" placeholder="z. B. 2×"></div>
        <div class="fs"><label class="lt" for="eT">Notiz</label><input class="in" id="eT" value="${esc(it.notiz)}" placeholder="z. B. laktosefrei"></div></div>
      <div class="fs"><span class="lt">Bereich im Laden</span><div class="fl">${D.set.order.map(k=>`<button class="opt" data-ber="${k}" aria-pressed="${b===k}">${esc(BL[k])}</button>`).join('')}</div></div>
      ${neu?`<p class="note">Der Bereich wird gemerkt und gilt künftig auch, wenn „${esc(it.name)}“ wieder eingetragen wird.</p>`:`<p class="note">${s.dup?'Steht schon auf der Liste. ':''}Eingetragen von ${esc(it.von===me?'dir':pName(it.von))} · ${esc(fT(it.erst||it.upd))}${it.status==='gekauft'?`<br>Gekauft von ${esc(it.gekauftVon===me?'dir':pName(it.gekauftVon))} · ${esc(fT(it.gekauftAm))}`:''}<br>Der Bereich gilt künftig auch, wenn „${esc(it.name)}“ wieder eingetragen wird.</p>`}
    </div>
    <div class="df">${neu?'':'<button class="btn dng" data-del="1">Löschen</button>'}<span class="sp"></span>${!neu&&it.status==='gekauft'?'<button class="btn" data-back="1">Wieder auf die Liste</button>':''}<button class="btn pri" data-save="1">${neu?'Eintragen':'Speichern'}</button></div>`;
    if(neu||s.dup) setTimeout(()=>{ const m=$('eM'); if(m&&innerWidth>640&&!m.value){ m.focus(); } },60); return; }
  if(s.m==='exp'){ const A=expAlle(), W=expWahl(), t=expCsv(), leer=!W.length?' disabled':'';
    d.innerHTML=`<div class="dh"><h3 id="dlgT">Export für Online-Bestellung</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><p class="note">Die ausgewählten Artikel als CSV – in Laden-Reihenfolge, mit Anzahl, Menge und Notiz. Datei oder Text an Claude geben und sagen: <b>„Bestell das bei REWE“</b>. Der Assistent legt alles in den Warenkorb, fragt bei ähnlichen Artikeln im Angebot nach und schickt die Bestellung nicht selbst ab.</p>
      <div class="fs"><div class="lrow"><span class="lt" id="expL">Artikel · <span id="expN">${W.length} von ${A.length}</span></span><button class="btn sm" data-selall="1">${W.length===A.length?'Keine':'Alle'}</button></div>
        ${A.length?`<div class="sl" role="group" aria-labelledby="expL">${A.map(i=>`<label><input type="checkbox" data-sel="${esc(i.id)}"${s.sel.has(i.id)?' checked':''}><span class="tx">${esc(i.name)}${i.menge?`<span class="mg">${esc(i.menge)}</span>`:''}${i.notiz?`<span class="no">${esc(i.notiz)}</span>`:''}</span></label>`).join('')}</div>`:'<p class="note">Keine offenen Artikel mehr.</p>'}</div>
      <div class="fl"><button class="btn pri" data-csvdl="1"${leer}>CSV herunterladen</button><button class="btn" data-csvcp="1"${leer}>CSV kopieren</button></div>
      <div class="fs"><label class="lt" for="csvTa">Inhalt</label><textarea class="in csv" id="csvTa" readonly rows="7" spellcheck="false">${esc(t)}</textarea></div>
      <p class="note">Nach der Bestellung: Häkchen bei allem entfernen, was nicht bestellt wurde (z. B. aus dem Warenkorb genommen), dann abhaken. Die abgehakten Artikel landen unter „Im Wagen“ und zählen für „Oft gekauft“, der Rest bleibt auf der Liste.</p></div>
    <div class="df"><span class="sp"></span><button class="btn" data-bestellt="1"${leer}>${expBtnTxt(W.length,A.length)}</button></div>`; return; }
  if(s.m==='set'){ const O=D.set.order;
    d.innerHTML=`<div class="dh"><h3 id="dlgT">Reihenfolge im Laden</h3><button class="x" data-close="1" aria-label="Schließen">×</button></div>
    <div class="db"><p class="note">So, wie du durch deinen Laden gehst – die Liste ist in dieser Reihenfolge sortiert. Gilt für die ganze Familie.</p>
      <div class="ord">${O.map((k,i)=>`<div class="or"><span class="nr">${i+1}</span><span class="tx">${esc(BL[k])}</span><button class="x" data-up="${i}" aria-label="${esc(BL[k])} nach oben"${i?'':' disabled'}>↑</button><button class="x" data-dn="${i}" aria-label="${esc(BL[k])} nach unten"${i<O.length-1?'':' disabled'}>↓</button></div>`).join('')}</div>
      <div><button class="btn sm" data-ordreset="1">Standard-Reihenfolge</button></div>
      <p class="note">Abgehakte Artikel bleiben 24 Stunden unter „Im Wagen“ und lassen sich dort zurückholen. Nach 7 Tagen räumt die Liste sie selbst weg. Was oft gekauft wird, erscheint oben als Vorschlag.</p></div>`; return; }
}
function saveEdit(){ const n=$('eN').value.trim(); if(!n){ toast('Bitte einen Namen eingeben'); return; }
  if(!sheet.id){ const b=sheet.ber||sheet.neu.ber; sheet=null; $('ov').classList.remove('show'); qa='';
    addItems([{name:n.charAt(0).toUpperCase()+n.slice(1),menge:$('eM').value.trim(),notiz:$('eT').value.trim(),ber:b}]); return; }
  const it=D.items[sheet.id]; if(!it) return;
  const b=sheet.ber||it.ber; it.name=n.charAt(0).toUpperCase()+n.slice(1); it.menge=$('eM').value.trim(); it.notiz=$('eT').value.trim(); it.ber=b; put('items',it);
  const aid=artId(it.name), a=D.arts[aid]&&!D.arts[aid].del?D.arts[aid]:{id:aid,n:0,last:0}; put('arts',{...a,name:it.name,ber:b});   // Bereich merken
  save(); closeSheet(); toast('Gespeichert'); }

/* ---------- Ereignisse ---------- */
document.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||b.disabled) return; const ds=b.dataset;
  if(ds.add){ const L=parseAll(qa); if(!L.length){ toast('Bitte eintippen, was fehlt'); const q=$('qa'); if(q) q.focus(); return; }
    if(L.length===1){ const r=L[0], ex=offen().find(i=>norm(i.name)===norm(r.name)); if(document.activeElement) document.activeElement.blur();   // ein Artikel: gleich die Details zeigen
      if(ex){ qa=''; openSheet({m:'edit',id:ex.id,dup:1}); if(r.menge) $('eM').value=r.menge; if(r.notiz) $('eT').value=r.notiz; return; }
      return openSheet({m:'edit',id:null,neu:{name:r.name,menge:r.menge||'',notiz:r.notiz||'',ber:guessBer(r.name),von:me||''}}); }
    qa=''; addItems(L); const q=$('qa'); if(q&&innerWidth>640) q.focus(); return; }
  if(ds.oft) return addItems([{name:ds.oft,menge:'',notiz:''}]);
  if(ds.tick) return tick(ds.tick);
  if(ds.edit) return openSheet({m:'edit',id:ds.edit});
  if(ds.clear) return aufraeumen();
  if(ds.exp) return openExp();
  if(ds.csvdl) return csvDownload();
  if(ds.csvcp) return csvCopy();
  if(ds.bestellt){ const W=expWahl(), A=expAlle(); if(!W.length) return toast('Nichts ausgewählt');
    if(!confirm(W.length===A.length?(W.length===1?`„${W[0].name}“ als bestellt abhaken?`:`Alle ${W.length} Artikel als bestellt abhaken?`)
      :`${W.length} von ${A.length} Artikeln als bestellt abhaken? Die ${A.length-W.length} abgewählten bleiben auf der Liste.`)) return;
    return alleBestellt(W); }
  if(ds.selall&&sheet&&sheet.m==='exp'){ const A=expAlle(), alle=A.every(i=>sheet.sel.has(i.id));
    sheet.sel=new Set(alle?[]:A.map(i=>i.id)); document.querySelectorAll('[data-sel]').forEach(c=>{ c.checked=sheet.sel.has(c.dataset.sel); }); return expUpdate(); }
  if(ds.close) return closeSheet();
  if(!sheet) return;
  if(sheet.m==='edit'){
    if(ds.ber){ const keep={n:$('eN').value,m:$('eM').value,t:$('eT').value}; sheet.ber=ds.ber; drawSheet(); $('eN').value=keep.n; $('eM').value=keep.m; $('eT').value=keep.t; return; }
    if(ds.save) return saveEdit();
    if(ds.del&&sheet.id){ const it=D.items[sheet.id]; rm('items',sheet.id); save(); closeSheet(); return toast(`„${it.name}“ gelöscht`); }
    if(ds.back){ const id=sheet.id; closeSheet(); return tick(id); }
  }
  if(sheet.m==='set'){ const O=D.set.order;
    if(ds.up!=null||ds.dn!=null){ const i=+(ds.up!=null?ds.up:ds.dn), j=ds.up!=null?i-1:i+1; if(j<0||j>=O.length) return; [O[i],O[j]]=[O[j],O[i]]; D.set.upd=Date.now(); save(); drawSheet();
      const f=document.querySelector(`[data-${ds.up!=null?'up':'dn'}="${j}"]`); if(f&&!f.disabled) f.focus(); return; }
    if(ds.ordreset){ D.set.order=BER.map(x=>x[0]); D.set.upd=Date.now(); save(); drawSheet(); return toast('Standard-Reihenfolge'); }
  }
});
document.addEventListener('input',e=>{ if(e.target.id==='qa'){ qa=e.target.value; const p=$('pv'); if(p) p.innerHTML=qaPreview(); } });
document.addEventListener('change',e=>{ const c=e.target; if(!c.dataset||c.dataset.sel==null||!sheet||sheet.m!=='exp') return;
  if(c.checked) sheet.sel.add(c.dataset.sel); else sheet.sel.delete(c.dataset.sel); expUpdate(); });
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&sheet) return closeSheet();
  if(e.key==='Enter'&&e.target.id==='qa'){ e.preventDefault(); const b=document.querySelector('[data-add]'); if(b) b.click(); }
  if(e.key==='Enter'&&sheet&&sheet.m==='edit'&&/^e[NMT]$/.test(e.target.id)){ e.preventDefault(); saveEdit(); }
});
$('ov').addEventListener('click',e=>{ if(e.target.id==='ov') closeSheet(); });

/* ---------- Dashboard-Kachel ---------- */
function sumObj(){ const O=offen().sort((a,b)=>ord(a.ber)-ord(b.ber)||(a.erst||0)-(b.erst||0));
  return {v:1,savedAt:Date.now(),zahl:{wert:O.length,label:O.length===1?'Artikel auf der Liste':'Artikel auf der Liste'},
    zeilen:O.slice(0,6).map(i=>({t:i.name+(i.menge?' · '+i.menge:''),sub:[BL[i.ber],i.notiz,i.von&&i.von!==me?'von '+pName(i.von):''].filter(Boolean).join(' · ')})),
    leer:'Die Einkaufsliste ist leer'}; }
window.__dashSum=()=>{ try{ return D?sumObj():null; }catch(e){ return null; } };
function pushSum(){ if(!window.__PI_SYNC||!D) return; fetch('/api/sum_einkauf',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(sumObj())}).catch(()=>{}); }

/* ---------- Kleinkram ---------- */
function stamp(){ const el=$('saved'); if(el) el.textContent=D.savedAt?'gespeichert '+new Date(D.savedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+(window.__PI_SYNC?' · für alle auf dem Pi':' · nur auf diesem Gerät'):''; }
let toastT; function toast(m,undo){ const t=$('toast'); t.innerHTML=esc(m)+(undo?'<button id="undoBtn">Rückgängig</button>':''); t.classList.add('show'); clearTimeout(toastT);
  if(undo) $('undoBtn').onclick=()=>{ undo(); t.classList.remove('show'); };
  toastT=setTimeout(()=>t.classList.remove('show'),undo?5000:2600); }
function setTheme(th){ document.documentElement.setAttribute('data-theme',th); try{ localStorage.setItem(THEME,th); }catch(e){} }
function cleanup(){ if(!canEdit()) return; const alt=gekaufte().filter(i=>Date.now()-(+i.gekauftAm||0)>D_WEG); if(!alt.length) return; alt.forEach(i=>rm('items',i.id)); save(); }

(function init(){
  try{ const th=localStorage.getItem(THEME); if(th) document.documentElement.setAttribute('data-theme',th); }catch(e){}
  if(!me&&!ROLE) me=(PL.find(p=>p.owner)||PL[0]).id;
  load(); cleanup(); render(); loadPersons(); setTimeout(pushSum,1500);
  if(window.__PI_SYNC) $('homeBtn').hidden=false;
  $('themeBtn').onclick=()=>{ const dark=document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches); setTheme(dark?'light':'dark'); };
  $('setBtn').onclick=()=>openSheet({m:'set'});
  if(location.hash==='#neu'){ history.replaceState(null,'',location.pathname); setTimeout(()=>{ const q=$('qa'); if(q) q.focus(); },100); }
  /* Änderungen anderer Geräte (sync.js meldet sie als storage-Ereignis): neu zeichnen, außer es ist gerade ein Blatt offen */
  window.addEventListener('storage',e=>{ if(e.key!==KEY||!e.newValue) return; let x=null; try{ x=JSON.parse(e.newValue); }catch(_){} if(!x) return; D=normalize(x);
    if(!sheet) render(); else if(sheet.m==='set') drawSheet();
    else if(sheet.m==='exp'){ const L=document.querySelectorAll('[data-sel]'), A=expAlle();   // Liste nur neu zeichnen, wenn sich Artikel geändert haben
      if(L.length!==A.length||A.some((i,k)=>L[k].dataset.sel!==i.id)){ const db=document.querySelector('.db'), y=db?db.scrollTop:0; drawSheet(); const n=document.querySelector('.db'); if(n) n.scrollTop=y; } else expUpdate(); } });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&!sheet) render(); });
})();
