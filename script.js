/* ==========================
   CONFIG / CONSTANTS
========================== */
const SUPABASE_APIKEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dmxxYnR3cWV0bHRkY3Zpb2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMjM4MzMsImV4cCI6MjA2OTU5OTgzM30.d-leDFpzc6uxDvq47_FC0Fqh0ztaL11Oozm-z6T9N_M';
const SUPABASE_URL =
  'https://bvvlqbtwqetltdcvioie.supabase.co/rest/v1';

// Tester levels / pool config
const LEVELS = [
  { level: 10, label: "Top 100",   min: 1155, max: 20000, users: 100,   pool:  25_000_000 },
  { level: 9,  label: "Sr. Lt & Up", min: 955, max: 1154,  users: 440,   pool:  45_000_000 },
  { level: 8,  label: "Lieutenant",  min: 780, max: 954,   users: 3090,  pool:  85_000_000 },
  { level: 7,  label: "Junior Lt",   min: 630, max: 779,   users: 9570,  pool: 100_000_000 },
  { level: 6,  label: "Starshina",   min: 455, max: 629,   users: 45120, pool: 165_000_000 },
  { level: 5,  label: "Sr. Sgt",     min: 300, max: 454,   users: 23250, pool:  50_000_000 },
  { level: 4,  label: "Sgt",         min: 150, max: 299,   users: 27270, pool:  30_000_000 }
];
const TESTER_TOTAL = 356_000;
const S0_TOTAL = 20_000;
const S1_TOTAL = 1_000;

const YAPPER_S0_POOL = 45_000_000;
const YAPPER_S1_POOL = 30_000_000;

const SHARE_HASHTAG = 'https://x.com/Shinosuka_eth/status/1954921059733602581';

const DEV_DEITIES = new Set(['0xkaiserkarel','e_beriker','corcoder']);

const CHAOS_MS = 6000;
const CHAOS_BTN_COUNT = 3;
const CHAOS_BTN_LIFETIME = 1000;
const POST_SETTLE_PAUSE_MS = 900;

/* ==========================
   SHORTCUTS / HELPERS
========================== */
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function formatU(n){
  if (!n) return '0 $U';
  if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'') + 'M $U';
  if (n >= 1e3) return (n/1e3).toFixed(0) + 'K $U';
  return `${Number(n).toLocaleString()} $U`;
}
function formatXP(n){
  if (!n) return '0 XP';
  return `${Number(n).toLocaleString()} XP`;
}
function formatPct(n, maxDecimals=6){
  if (n == null || isNaN(n)) return '0%';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits:maxDecimals }) + '%';
}
function showToast(msg){
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2200);
}

/* Map mindshare percent to a Top-X%: treat 1% as 100%, so Top = 100 - (mindshare * 100) */
function topPercentFromMindshare(msPercent){
  if (msPercent == null || isNaN(msPercent)) return null;
  const scaled = clamp(msPercent * 100, 0, 100); // 0..1% -> 0..100
  return 100 - scaled;                             // higher ms ⇒ better (lower Top%)
}

/* ==========================
   CONFETTI
========================== */
function launchConfetti(duration = 1800){
  const canvas = $('#confetti-canvas');
  const h = window.innerHeight - 60 - 52;
  const w = window.innerWidth;
  canvas.width = w; canvas.height = h;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const confetti = [];
  const colors = ['#A9ECFD','#FFFFFF','#86d6ee'];
  for(let i=0;i<180;i++){
    confetti.push({
      x: Math.random()*w,
      y: Math.random()*(-h*0.3),
      r: Math.random()*6+3,
      c: colors[(Math.random()*colors.length)|0],
      vx: (Math.random()-0.5)*1.2,
      vy: Math.random()*2+1.5
    });
  }
  let raf;
  const draw=()=>{
    ctx.clearRect(0,0,w,h);
    for(const p of confetti){
      ctx.fillStyle=p.c;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      p.x+=p.vx; p.y+=p.vy;
      if(p.y>h){ p.y=-10; p.x=Math.random()*w; }
    }
    raf=requestAnimationFrame(draw);
  };
  draw();
  setTimeout(()=>{ cancelAnimationFrame(raf); ctx.clearRect(0,0,w,h); canvas.style.display='none'; }, duration);
}

/* ==========================
   SUPABASE FETCHERS
========================== */
async function fetchUserData(username){
  const H = { 'apikey': SUPABASE_APIKEY, 'Authorization': `Bearer ${SUPABASE_APIKEY}` };
  const tryFetch = async url => {
    const r = await fetch(url,{headers:H}); if(!r.ok) return [];
    return r.json();
  };
  let users = await tryFetch(`${SUPABASE_URL}/leaderboard_full_0208?display_name=ilike.${username}`);
  let user = users.find(u => (u.display_name||'').toLowerCase()===username.toLowerCase());
  if(!user){
    users = await tryFetch(`${SUPABASE_URL}/leaderboard_full_0208?username=ilike.${username}`);
    user = users.find(u => (u.username||'').toLowerCase()===username.toLowerCase());
  }
  if(!user){
    users = await tryFetch(`${SUPABASE_URL}/leaderboard_full_0208?display_name=ilike.%${username}%`);
    user = users[0];
  }
  if(!user){
    users = await tryFetch(`${SUPABASE_URL}/leaderboard_full_0208?username=ilike.%${username}%`);
    user = users[0];
  }
  return user || null;
}

async function fetchMindshare(table, username){
  const H = { 'apikey': SUPABASE_APIKEY, 'Authorization': `Bearer ${SUPABASE_APIKEY}` };
  const eqUrl = `${SUPABASE_URL}/${table}?username=eq.${encodeURIComponent(username)}`;
  const ilikeUrl = `${SUPABASE_URL}/${table}?username=ilike.%25${encodeURIComponent(username)}%25`;
  let r = await fetch(eqUrl,{headers:H});
  let data = r.ok ? await r.json() : [];
  if(!data?.length){ r = await fetch(ilikeUrl,{headers:H}); data = r.ok ? await r.json() : []; }
  if(!data?.length) return 0;

  let found = data.find(d => (d.username||'').toLowerCase()===username.toLowerCase()) || data[0];
  let val=null;
  if(found?.jsonInput){
    try{
      const j = typeof found.jsonInput==='string' ? JSON.parse(found.jsonInput) : found.jsonInput;
      if(j?.mindshare != null) val = j.mindshare;
    }catch{}
  }
  if(val==null && found?.mindshare!=null) val=found.mindshare;

  if(val==null) return 0;
  if(typeof val==='string') val = val.replace('%','').trim();
  const num = Number(String(val).replace(',','.'));
  if(Number.isNaN(num)) return 0;

  // S1 stored as fraction → convert to percent; S0 already percent
  return table==='yaps_season_one' ? num*100 : num;
}

/* ==========================
   CALCULATIONS
========================== */
function calcTesterAllocation(level, xp){
  if(Number(level)===10) return 250_000;
  const L = LEVELS.find(l=>l.level===Number(level));
  if(!L || !xp) return 0;
  let score = (xp - L.min) / (L.max - L.min);
  score = clamp(score,0,1);
  const avg = L.pool / L.users;
  return Math.round((0.5 + score*1.0) * avg); // 0.5x .. 1.5x of avg
}

function calcTesterPercentile(level, xp){
  let betterBefore = 0;
  for(const L of LEVELS){ if(L.level>level) betterBefore += L.users; }
  const L = LEVELS.find(l=>l.level===level);
  if(!L){ return null; }
  let within = 0.0;
  if(L.max>L.min && xp){
    const pos = clamp((xp - L.min) / (L.max - L.min), 0, 1);
    within = (1 - pos) * (L.users-1);
  }
  const approxRank = Math.round(betterBefore + within + 1);
  const pct = (approxRank / TESTER_TOTAL) * 100;
  return clamp(pct, 0.0001, 100);
}

function calcPercentileFromRank(rank, total){
  if(!rank || !total) return null;
  return clamp((rank/total)*100, 0.0001, 100);
}

/* ==========================
   CHAOS ENGINE
========================== */
let chaosTimers = [];
function startChaos(){
  $('#arena-overlay').classList.add('show');
  const fx = $('#arena-center-fx');
  fx.classList.remove('play'); void fx.offsetWidth; fx.classList.add('play');

  $$('.bar-fill').forEach(el=> el.classList.add('chaos'));
  spawnChaosButtons(CHAOS_BTN_COUNT);

  return new Promise(res=>{
    chaosTimers.push(setTimeout(()=>{ stopChaos(); res(); }, CHAOS_MS));
  });
}
function stopChaos(){
  chaosTimers.forEach(t=>clearTimeout(t)); chaosTimers = [];
  $('#arena-overlay').classList.remove('show');
  $$('.bar-fill').forEach(el=> el.classList.remove('chaos'));
  $('#battle-actions').innerHTML = '';
}
function spawnChaosButtons(n=2){
  const area = $('#battle-actions');
  const rect = area.getBoundingClientRect();
  for(let i=0;i<n;i++){
    const btn = document.createElement('button');
    btn.className = 'battle-btn pop';
    btn.textContent = 'zkgm';
    const x = Math.random() * (rect.width * 0.85) + rect.width*0.075;
    const y = Math.random() * (rect.height*0.85) + rect.height*0.075;
    btn.style.left = `${x}px`; btn.style.top = `${y}px`;
    btn.onclick = (e)=>{ e.stopPropagation(); btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); };
    area.appendChild(btn);
    setTimeout(()=>{ btn.remove(); }, CHAOS_BTN_LIFETIME);
  }
}

/* ==========================
   RENDER HELPERS
========================== */
function setBarHeight(id, pct){
  const el = document.getElementById(id);
  if(!el) return;
  el.style.setProperty('--fill', clamp(pct,0,100)+'%');
  el.style.height = clamp(pct,0,100)+'%';
}
function setSideDim(sideId, dim=true){
  const el = document.getElementById(sideId);
  if(!el) return;
  el.classList.toggle('dim', !!dim);
}

/* ==========================
   SHARE TWEETS
========================== */
function openTweet(urlText){
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(urlText)}`;
  window.open(url,'_blank');
}

/* ==========================
   BATTLE LOGIC
========================== */
async function runBattle(playerName, opponentName){
  const pName = playerName.replace(/^@/,'').trim();
  const oName = opponentName.replace(/^@/,'').trim();
  if(!pName || !oName){ showToast('Enter both usernames.'); return; }

  if(DEV_DEITIES.has(oName.toLowerCase())){
    const dlg = $('#devs-modal');
    dlg.showModal();
    $('#share-devs').onclick = ()=>{
      const txt = `Just tried to battle @${oName} one of the creators of Union and lost... 😅

Guess you can't beat the dev gods.

Try your luck: union-battle.vercel.app

${SHARE_HASHTAG}`;
      openTweet(txt);
    };
    $('#devs-try-again').onclick = ()=>{ dlg.close(); showScreen('gear'); };
    return;
  }

  showScreen('arena');

  ['op','pl'].forEach(prefix=>{
    setBarHeight(`${prefix}-bar-tester`, 10);
    setBarHeight(`${prefix}-bar-s0`, 10);
    setBarHeight(`${prefix}-bar-s1`, 10);
  });
  setSideDim('opponent-side', false); setSideDim('player-side', false);
  $('#finish-battle').hidden = true;

  const [pBundle, oBundle] = await Promise.all([getBundle(pName), getBundle(oName)]);

  const pHasAny = (pBundle.testerAllocation>0) || (pBundle.s0>0) || (pBundle.s1>0);
  const oHasAny = (oBundle.testerAllocation>0) || (oBundle.s0>0) || (oBundle.s1>0);
  if(!pHasAny && !oHasAny){ showToast('Only Fight Union Maxis'); showScreen('gear'); return; }

  // Headers
  $('#player-handle').textContent = '@'+pBundle.username;
  $('#opponent-handle').textContent = '@'+oBundle.username;
  $('#player-pfp').src = pBundle.pfp || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
  $('#opponent-pfp').src = oBundle.pfp || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';

  // TEXT STATS — Tester shows XP; S1 to 3 decimals
  $('#pl-tester-allocation').textContent = formatXP(pBundle.xp);
  $('#op-tester-allocation').textContent = formatXP(oBundle.xp);
  $('#pl-s0-ms').textContent = formatPct(pBundle.s0);
  $('#op-s0-ms').textContent = formatPct(oBundle.s0);
  $('#pl-s1-ms').textContent = formatPct(pBundle.s1, 3);
  $('#op-s1-ms').textContent = formatPct(oBundle.s1, 3);

  // Percentiles (new rule: 1% -> 100%, Top = 100 - (ms*100))
  const pS0Top = pBundle.s0>0 ? topPercentFromMindshare(pBundle.s0).toFixed(2) : '—';
  const oS0Top = oBundle.s0>0 ? topPercentFromMindshare(oBundle.s0).toFixed(2) : '—';
  const pS1Top = pBundle.s1>0 ? topPercentFromMindshare(pBundle.s1).toFixed(2) : '—';
  const oS1Top = oBundle.s1>0 ? topPercentFromMindshare(oBundle.s1).toFixed(2) : '—';

  $('#pl-tester-percentile').textContent = `Top ${pBundle.testerPct ? pBundle.testerPct.toFixed(2) : '—'}%`;
  $('#op-tester-percentile').textContent = `Top ${oBundle.testerPct ? oBundle.testerPct.toFixed(2) : '—'}%`;
  $('#pl-s0-percentile').textContent = `Top ${pS0Top}%`;
  $('#op-s0-percentile').textContent = `Top ${oS0Top}%`;
  $('#pl-s1-percentile').textContent = `Top ${pS1Top}%`;
  $('#op-s1-percentile').textContent = `Top ${oS1Top}%`;

  // CHAOS → SETTLE
  await startChaos();

  const maxTester = Math.max(pBundle.testerAllocation, oBundle.testerAllocation, 1);
  const maxS0 = Math.max(pBundle.s0, oBundle.s0, 0.000001);
  const maxS1 = Math.max(pBundle.s1, oBundle.s1, 0.000001);

  setBarHeight('pl-bar-tester', (pBundle.testerAllocation/maxTester)*100);
  setBarHeight('op-bar-tester', (oBundle.testerAllocation/maxTester)*100);
  setBarHeight('pl-bar-s0', (pBundle.s0/maxS0)*100);
  setBarHeight('op-bar-s0', (oBundle.s0/maxS0)*100);
  setBarHeight('pl-bar-s1', (pBundle.s1/maxS1)*100);
  setBarHeight('op-bar-s1', (oBundle.s1/maxS1)*100);

  const winnerTester = pBundle.testerAllocation === oBundle.testerAllocation ? 'draw' : (pBundle.testerAllocation > oBundle.testerAllocation ? 'player' : 'opponent');
  const winnerS0     = Math.abs(pBundle.s0 - oBundle.s0) < 1e-8 ? 'draw' : (pBundle.s0 > oBundle.s0 ? 'player' : 'opponent');
  const winnerS1     = Math.abs(pBundle.s1 - oBundle.s1) < 1e-8 ? 'draw' : (pBundle.s1 > oBundle.s1 ? 'player' : 'opponent');
  const rounds = [winnerTester, winnerS0, winnerS1];
  const score = rounds.reduce((s,w)=> s + (w==='player'?1 : w==='opponent'?-1:0), 0);
  const overall = score>0 ? 'player' : score<0 ? 'opponent' : 'draw';

  setTimeout(() => {
    setSideDim('opponent-side', true); // always dim opponent

    const finishBtn = $('#finish-battle');
    finishBtn.hidden = false;
    finishBtn.onclick = ()=>{
      launchConfetti(1800);

      const dlg = $('#victory-modal');
      dlg.showModal();

      // ensure small image is present in the share box
      const card = dlg.querySelector('.modal-card');
      let img = card.querySelector('.share-image');
      if(!img){
        img = document.createElement('img');
        img.className = 'share-image';
        img.src = 'battle.png';
        img.alt = 'Battle';
        img.style.width = '100%';
        img.style.border = '1.5px solid #21262b';
        img.style.borderRadius = '12px';
        img.style.marginTop = '12px';
        card.insertBefore(img, card.querySelector('.modal-actions'));
      }

      const won = overall==='player';
      const wonCount = rounds.filter(r => r==='player').length;

      // NEW top line
      let topLine = card.querySelector('.share-topline');
      if(!topLine){
        topLine = document.createElement('div');
        topLine.className = 'share-topline';
        topLine.style.color = '#A9ECFD';
        topLine.style.fontWeight = '700';
        topLine.style.margin = '6px 0 6px';
        card.querySelector('h3').insertAdjacentElement('afterend', topLine);
      }
      topLine.textContent = `You won ${wonCount}/3 fights!`;

      dlg.querySelector('h3').textContent = won ? 'Congratulations!' : 'Good Fight!';
      dlg.querySelector('.modal-desc').textContent = won
        ? 'You claimed victory in the Union Battle Field. Share the win, then challenge another Maxi.'
        : 'You fought with valor. Share the battle and try again—victory favors the relentless.';

      $('#share-victory').onclick = ()=>{
        const txt = `Just faught against @${oBundle.username} and won in ${wonCount}/3 Battles ⚔️💪

Fight Your Fav Union Maxi: union-battle.vercel.app

"This is our battle, We. Are. Union."

zkgm.

${SHARE_HASHTAG}`;
        openTweet(txt);
      };
      $('#fight-again').onclick = ()=>{ dlg.close(); showScreen('landing'); };
    };
  }, POST_SETTLE_PAUSE_MS);
}

async function getBundle(username){
  const u = await fetchUserData(username).catch(()=>null);
  const xuser = (u?.username || u?.display_name || username);
  let pfp = u?.pfp;
  let xp = u?.total_xp; let level = u?.level; let title = u?.title;
  if(u?.jsonInput){
    try{
      const j = typeof u.jsonInput==='string' ? JSON.parse(u.jsonInput) : u.jsonInput;
      pfp = j.pfp || pfp; xp = j.total_xp || xp; level = j.level || level; title = j.title || title;
    }catch{}
  }

  const [s0, s1] = await Promise.all([
    fetchMindshare('yaps_season_zero', xuser),
    fetchMindshare('yaps_season_one', xuser)
  ]);

  const testerAllocation = (level && xp) ? calcTesterAllocation(Number(level), Number(xp)) : 0;
  const testerPct = (level && xp) ? calcTesterPercentile(Number(level), Number(xp)) : null;

  return {
    username:xuser, pfp, level:Number(level)||null, xp:Number(xp)||0, title:title||'',
    testerAllocation, testerPct,
    s0:Number(s0)||0, s1:Number(s1)||0
  };
}

/* ==========================
   SCREEN SWITCH
========================== */
function showScreen(name){
  $$('.view').forEach(v=> v.hidden = true);
  if(name==='landing') $('#landing').hidden = false;
  if(name==='gear') $('#gear').hidden = false;
  if(name==='arena') $('#arena').hidden = false;
}

/* ==========================
   INIT / EVENTS
========================== */
document.addEventListener('DOMContentLoaded', ()=>{
  $('#start-battle').onclick = ()=> showScreen('gear');

  const plIn = $('#player-username'), opIn = $('#opponent-username');
  [plIn,opIn].forEach(inp=>{
    inp.addEventListener('input', ()=>{ inp.value = inp.value.replace(/^@/,''); });
  });

  $('#begin-battle').onclick = ()=>{
    const p = plIn.value.trim(); const o = opIn.value.trim();
    if(!p || !o){ showToast('Enter both usernames.'); return; }
    runBattle(p,o);
  };

  window.addEventListener('resize', ()=>{
    const canvas = $('#confetti-canvas');
    if(canvas.style.display!=='none'){
      const h = window.innerHeight - 60 - 52;
      const w = window.innerWidth;
      canvas.width = w; canvas.height = h;
    }
  });

  showScreen('landing');
});
