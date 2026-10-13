/* IDK.S ARCADE v2.1 — 5 games */
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>[...r.querySelectorAll(s)];

// storage
const STORE_KEY = 'idk_arcade_v3';
function loadStore(){
  try{
    const v = JSON.parse(localStorage.getItem(STORE_KEY));
    if(v) return v;
    // migrate v2
    const v2 = JSON.parse(localStorage.getItem('idk_arcade_v2'));
    if(v2){
      v2.scores.daggerfall = v2.scores.daggerfall||[];
      v2.scores.papers = v2.scores.papers||[];
      v2.plays.daggerfall = v2.plays.daggerfall||0;
      v2.plays.papers = v2.plays.papers||0;
      return v2;
    }
  }catch{}
  return {scores:{snake:[],blaster:[],stack:[],daggerfall:[],papers:[]}, plays:{snake:0,blaster:0,stack:0,daggerfall:0,papers:0}, total:0, muted:false}
}
let store = loadStore();
function saveStore(){ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
function addScore(game, score){
  store.plays[game]=(store.plays[game]||0)+1;
  store.total=(store.total||0)+1;
  const entry={score, date:new Date().toISOString().slice(0,10), ts:Date.now()};
  store.scores[game].push(entry);
  store.scores[game].sort((a,b)=>b.score-a.score);
  store.scores[game]=store.scores[game].slice(0,5);
  saveStore(); updateHUD();
}
function getBest(game){ return (store.scores[game]?.[0]?.score)||0; }
function updateHUD(){
  ['snake','blaster','stack','daggerfall','papers'].forEach(g=>{
    const b=getBest(g); const el=$('#hs-'+g); if(el) el.textContent=b;
    const p=store.plays[g]||0; const pe=$('#plays-'+g); if(pe) pe.textContent=p;
  });
  $('#totalPlays').textContent=(store.total+1284+ Math.floor(Math.random()*12)).toLocaleString();
  renderLeaderboards();
}
function renderLeaderboards(){
  ['snake','blaster','stack','daggerfall','papers'].forEach(g=>{
    const ol=$('#lb-'+g); if(!ol) return;
    const list=store.scores[g]||[];
    if(!list.length){ ol.innerHTML='<li class="empty">No scores yet — go play!</li>'; return; }
    ol.innerHTML=list.map((e,i)=>`<li class="${i===0?'top1':i===1?'top2':''}"><span>#${i+1} — ${e.score.toLocaleString()} pts</span><span style="opacity:.6">${e.date}</span></li>`).join('');
  });
}
updateHUD();

let muted = store.muted||false;
function setMuted(v){ muted=v; store.muted=v; saveStore(); updateMuteUI(); }
function updateMuteUI(){
  $('#soundToggle')?.classList.toggle('active',!muted);
  $('#soundToggle').textContent=muted?'🔇':'♪';
  $('#modalMute').textContent=muted?'🔇':'♪';
  $('#modalMute')?.classList.toggle('active',!muted);
}
updateMuteUI();
$('#soundToggle')?.addEventListener('click',()=>{ setMuted(!muted); toast(muted?'Sound off':'Sound on'); });
$('#modalMute')?.addEventListener('click',()=>{ setMuted(!muted); toast(muted?'Sound off':'Sound on'); });
$('#clearScores')?.addEventListener('click',()=>{
  if(confirm('Clear all local high scores?')){ store.scores={snake:[],blaster:[],stack:[],daggerfall:[],papers:[]}; store.plays={snake:0,blaster:0,stack:0,daggerfall:0,papers:0}; store.total=0; saveStore(); updateHUD(); toast('Scores cleared'); }
});

const glow=$('#cursorGlow');
addEventListener('mousemove',e=>{ if(glow) glow.style.transform=`translate(${e.clientX-250}px, ${e.clientY-250}px)`; }, {passive:true});
$('#hamburger')?.addEventListener('click',()=>$('#mobileMenu').classList.toggle('open'));
$$('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>$('#mobileMenu').classList.remove('open')));
$$('.chip').forEach(c=>c.addEventListener('click',()=>{
  $$('.chip').forEach(x=>x.classList.remove('active')); c.classList.add('active');
  const f=c.dataset.filter;
  $$('.game-card').forEach(card=>{
    if(f==='all') card.style.display='';
    else card.style.display=card.dataset.tags.includes(f)?'':'none';
  });
}));
let toastTimer;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2200); }

let audioCtx;
function ensureAudio(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }
function beep(freq=440,dur=0.08,type='square',vol=0.12,slide=0){
  if(muted) return; ensureAudio();
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=type; o.frequency.value=freq;
  if(slide) o.frequency.linearRampToValueAtTime(freq+slide, audioCtx.currentTime+dur);
  g.gain.value=vol; g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+dur);
  o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+dur);
}
const SFX={
  eat(){ beep(880,0.08,'square',0.14); setTimeout(()=>beep(1200,0.08,'square',0.10),70); },
  die(){ beep(200,0.3,'sawtooth',0.18,-60); beep(120,0.4,'square',0.12); },
  shoot(){ beep(900,0.07,'square',0.08,400); },
  hit(){ beep(160,0.12,'square',0.15); },
  explode(){ beep(80,0.35,'sawtooth',0.2,-20); },
  stack(){ beep(600,0.08,'square',0.12,200); },
  perfect(){ beep(1200,0.12,'square',0.15); setTimeout(()=>beep(1600,0.15,'square',0.12),90); },
  fail(){ beep(180,0.25,'square',0.12); },
  coin(){ beep(1200,0.08,'square',0.12,300); },
  stamp(){ beep(220,0.12,'square',0.16); beep(140,0.14,'square',0.12); },
  key(){ beep(800,0.1,'sine',0.14,400); setTimeout(()=>beep(1000,0.1,'sine',0.12),80); },
};

$('#randomPlay')?.addEventListener('click',()=>{
  const games=['snake','blaster','stack','daggerfall','papers']; openGame(games[Math.floor(Math.random()*games.length)]);
});

let currentGame=null;
const modal=$('#modal');
function openGame(name){
  currentGame=name;
  modal.classList.add('open');
  modal.classList.toggle('wide', name==='daggerfall'||name==='papers');
  $('.modal-inner')?.classList.toggle('wide', name==='daggerfall'||name==='papers');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  $$('.game-view').forEach(v=>v.classList.remove('active'));
  $('#view-'+name)?.classList.add('active');
  const titles={snake:'NEON SERPENT', blaster:'VOID BLASTERS', stack:'STACK FRACTURE', daggerfall:'DAGGERFALL UNDAUNTED', papers:'PAPERS, PLEASE — ARSTOTZKA'};
  $('#modalGameName').textContent=titles[name];
  $('#modalBest').textContent='BEST '+getBest(name);
  $('#modalScore').textContent='SCORE 0';
  $('#pauseOverlay').classList.remove('show');
  $('#gameover').classList.remove('show');
  $$('.overlay').forEach(o=>{ if(o.closest('#view-'+name)) o.classList.remove('hidden'); });
  // only show overlay for current game, hide others? keep them hidden but not needed
  $$('.game-view:not(#view-'+name+') .overlay').forEach(o=>o.classList.remove('hidden'));
  if(name==='snake') snake.reset();
  if(name==='blaster') blaster.reset();
  if(name==='stack') stack.reset();
  if(name==='daggerfall') daggerfall.reset();
  if(name==='papers') papers.reset();
  toast('Press START — good luck');
  const hints={
    snake:'TIP: Wrap the walls to trap yourself — or escape',
    blaster:'TIP: Hold SPACE for auto-fire • Boss every 20 kills',
    stack:'TIP: 8 perfects = rainbow fever +50',
    daggerfall:'TIP: Find the GOLD KEY then BLUE stairs • Shift to sprint • M for map',
    papers:'TIP: Obristan needs a permit. Check expiry & photo. A=Approve D=Deny'
  };
  $('#modalHint').textContent=hints[name]||'';
}
function closeModal(){
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  snake.pause(true); blaster.pause(true); stack.pause(true); daggerfall.pause(true); papers.pause(true);
  currentGame=null;
}
$('#modalBackdrop')?.addEventListener('click',closeModal);
$('#modalClose')?.addEventListener('click',closeModal);
$('#goMenu')?.addEventListener('click',closeModal);
$('#modalPause')?.addEventListener('click',()=>{
  if(!currentGame) return;
  if(currentGame==='snake') snake.togglePause();
  if(currentGame==='blaster') blaster.togglePause();
  if(currentGame==='stack') stack.togglePause();
  if(currentGame==='daggerfall') daggerfall.togglePause();
  if(currentGame==='papers') papers.togglePause();
});
$('#resumeBtn')?.addEventListener('click',()=>{
  if(!currentGame) return;
  if(currentGame==='snake') snake.togglePause();
  if(currentGame==='blaster') blaster.togglePause();
  if(currentGame==='stack') stack.togglePause();
  if(currentGame==='daggerfall') daggerfall.togglePause();
  if(currentGame==='papers') papers.togglePause();
});
$('#modalRestart')?.addEventListener('click',()=>{ if(currentGame) startCurrent(); });
$('#goRestart')?.addEventListener('click',()=> startCurrent());
function startCurrent(){
  $('#gameover').classList.remove('show');
  $('#pauseOverlay').classList.remove('show');
  const ov=$('#overlay-'+currentGame);
  if(ov) ov.classList.add('hidden');
  if(currentGame==='snake') snake.start();
  if(currentGame==='blaster') blaster.start();
  if(currentGame==='stack') stack.start();
  if(currentGame==='daggerfall') daggerfall.start();
  if(currentGame==='papers') papers.start();
  ensureAudio();
}
$$('[data-play]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.play)));
$$('[data-start]').forEach(b=>b.addEventListener('click',()=>startCurrent()));

addEventListener('keydown',e=>{
  if(e.key==='Escape' && modal.classList.contains('open')) closeModal();
  if((e.key==='r'||e.key==='R') && modal.classList.contains('open')){ e.preventDefault(); startCurrent(); }
  if(e.key==='m'||e.key==='M'){ // mute but also daggerfall map uses M, handle there
    if(currentGame!=='daggerfall' || !daggerfall.isRunning()) setMuted(!muted);
  }
  if(e.key===' ' && modal.classList.contains('open') && currentGame){
    if(e.target.tagName==='BUTTON') return;
    const ov=$('#overlay-'+currentGame);
    if(ov && !ov.classList.contains('hidden')){ e.preventDefault(); startCurrent(); return; }
    if($('#gameover').classList.contains('show')) return;
    // stack handles space via its own handler, but also blaster toggle etc
    if(currentGame==='snake') { e.preventDefault(); snake.togglePause(); }
    else if(currentGame==='blaster') { /* space is shoot, not pause for blaster - let blaster handle */ }
    else if(currentGame==='stack') { /* handled by stack */ }
    else if(currentGame==='daggerfall') { /* shoot */ }
    else if(currentGame==='papers') { /* not used */ }
  }
});
let konamiPos=0;
const konami=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
addEventListener('keydown',e=>{
  if(e.key===konami[konamiPos]) konamiPos++; else konamiPos=0;
  if(konamiPos===konami.length){
    konamiPos=0; document.body.style.filter='hue-rotate(180deg)'; toast('KONAMI MODE: HUE SHIFTED 🌈'); setTimeout(()=>document.body.style.filter='',5000);
    ['snake','blaster','stack','daggerfall','papers'].forEach(g=>{ if(getBest(g)===0) addScore(g,999); });
  }
});
$('#konamiHint')?.addEventListener('click',e=>{ e.preventDefault(); toast('↑ ↑ ↓ ↓ ← → ← → B A'); });

(function heroDemo(){
  const c=$('#heroCanvas'); if(!c) return; const ctx=c.getContext('2d'); let t=0;
  function frame(){
    t+=0.02; ctx.clearRect(0,0,c.width,c.height);
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
    for(let x=0;x<c.width;x+=28){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,c.height); ctx.stroke(); }
    for(let y=0;y<c.height;y+=28){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y); ctx.stroke(); }
    const cx=c.width/2, cy=c.height/2;
    for(let i=0;i<5;i++){
      const a=t+i*0.6; const x=cx+Math.cos(a)*(70+i*14)*0.8; const y=cy+Math.sin(a*1.3)*40+i*6;
      ctx.fillStyle=i===0?'#fff':i===1?'#00FFF0':i===4?'#FF006B':'rgba(255,255,255,.6)';
      ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(x,y,i===0?6:4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    }
    const fx=cx+Math.cos(t*0.7)*90; const fy=cy+Math.sin(t*0.9)*60;
    ctx.fillStyle='#FF006B'; ctx.shadowColor='#FF006B'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(fx,fy,7,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    $('#heroScore').textContent='SCORE '+String(Math.floor((Math.sin(t)+1)*400)).padStart(2,'0');
    requestAnimationFrame(frame);
  } frame();
})();

// SNAKE
const snake = (()=> {
  const canvas=$('#canvas-snake'); const ctx=canvas.getContext('2d');
  const N=20, SZ=24;
  let snakeArr, dir, nextDir, food, score, speed, tick, raf, running, paused, dead, particles;
  function rndFood(){ let p; do{ p={x:Math.floor(Math.random()*N), y:Math.floor(Math.random()*N)} } while(snakeArr.some(s=>s.x===p.x&&s.y===p.y)); return p; }
  function reset(){ snakeArr=[{x:9,y:10},{x:8,y:10},{x:7,y:10}]; dir={x:1,y:0}; nextDir={x:1,y:0}; food=rndFood(); score=0; speed=110; tick=0; running=false; paused=false; dead=false; particles=[]; cancelAnimationFrame(raf); draw(); updateScore(); }
  function start(){ if(running) return; running=true; paused=false; dead=false; lastTime=performance.now(); acc=0; loop(); }
  function updateScore(){ $('#modalScore').textContent='SCORE '+score; $('#modalBest').textContent='BEST '+getBest('snake'); }
  let lastTime=0, acc=0;
  function loop(now=performance.now()){ if(!running||paused) return; raf=requestAnimationFrame(loop); const dt=now-lastTime; lastTime=now; acc+=dt; if(acc>=speed){ acc=0; step(); } draw(); }
  function step(){
    dir={...nextDir};
    const head={x:snakeArr[0].x+dir.x, y:snakeArr[0].y+dir.y};
    if(head.x<0) head.x=N-1; if(head.x>=N) head.x=0; if(head.y<0) head.y=N-1; if(head.y>=N) head.y=0;
    if(snakeArr.some(s=>s.x===head.x&&s.y===head.y)){ gameOver(); return; }
    snakeArr.unshift(head);
    if(head.x===food.x&&head.y===food.y){
      score+=10+Math.floor(snakeArr.length/5); SFX.eat();
      for(let i=0;i<10;i++) particles.push({x:food.x*SZ+SZ/2,y:food.y*SZ+SZ/2,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:12,col:Math.random()>.5?'#00FFF0':'#FF006B'});
      food=rndFood(); if(score%30===0&&speed>55) speed-=6; updateScore();
    } else snakeArr.pop();
  }
  function gameOver(){ running=false; dead=true; SFX.die(); addScore('snake',score); showGameOver(score,`Length ${snakeArr.length}`,getBest('snake')); draw(); }
  function draw(){
    ctx.fillStyle='#020208'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1;
    for(let i=0;i<=N;i++){ ctx.beginPath(); ctx.moveTo(i*SZ,0); ctx.lineTo(i*SZ,N*SZ); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i*SZ); ctx.lineTo(N*SZ,i*SZ); ctx.stroke(); }
    ctx.fillStyle='#FF006B'; ctx.shadowColor='#FF006B'; ctx.shadowBlur=16;
    const fx=food.x*SZ, fy=food.y*SZ; ctx.beginPath(); ctx.roundRect(fx+4,fy+4,SZ-8,SZ-8,6); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(fx+SZ/2-3,fy+SZ/2-3,3,0,Math.PI*2); ctx.fill();
    snakeArr.forEach((s,i)=>{
      const x=s.x*SZ, y=s.y*SZ;
      if(i===0){
        ctx.fillStyle='#ffffff'; ctx.shadowColor='rgba(255,255,255,.6)'; ctx.shadowBlur=12; ctx.beginPath(); ctx.roundRect(x+1,y+1,SZ-2,SZ-2,7); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(x+8,y+9,2.2,0,Math.PI*2); ctx.arc(x+16,y+9,2.2,0,Math.PI*2); ctx.fill();
        if(tick%20<10){ ctx.fillStyle='#FF006B'; ctx.fillRect(x+SZ/2-1,y+SZ-2,2,4); }
      } else {
        const t=i/snakeArr.length; const hue=180+t*60; ctx.fillStyle=`hsl(${hue} 100% 55%)`; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=8; ctx.beginPath(); ctx.roundRect(x+3,y+3,SZ-6,SZ-6,6); ctx.fill(); ctx.shadowBlur=0;
      }
    });
    particles.forEach(p=>{ ctx.globalAlpha=p.life/12; ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; p.life--; });
    particles=particles.filter(p=>p.life>0); ctx.globalAlpha=1;
    const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,200,canvas.width/2,canvas.height/2,400); g.addColorStop(0,'transparent'); g.addColorStop(1,'rgba(0,0,0,.4)'); ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height); tick++;
  }
  function setDir(nx,ny){ if(!running||paused) return; if(nx===-dir.x&&ny===-dir.y) return; nextDir={x:nx,y:ny}; }
  function togglePause(){ if(dead||!running) return; paused=!paused; $('#pauseOverlay').classList.toggle('show',paused); $('#modalPause').textContent=paused?'▶':'⏸'; if(!paused){ lastTime=performance.now(); loop(); } }
  function pause(v){ paused=v; }
  addEventListener('keydown',e=>{ if(currentGame!=='snake') return; if(e.key==='ArrowUp'||e.key==='w'||e.key==='W') setDir(0,-1); if(e.key==='ArrowDown'||e.key==='s'||e.key==='S') setDir(0,1); if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') setDir(-1,0); if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') setDir(1,0); });
  $$('.dpad button').forEach(b=>b.addEventListener('click',()=>{ const d=b.dataset.dir; if(d==='up') setDir(0,-1); if(d==='down') setDir(0,1); if(d==='left') setDir(-1,0); if(d==='right') setDir(1,0); }));
  let sx=0,sy=0; canvas.addEventListener('touchstart',e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{passive:true});
  canvas.addEventListener('touchend',e=>{ if(!sx) return; const dx=e.changedTouches[0].clientX-sx; const dy=e.changedTouches[0].clientY-sy; if(Math.max(Math.abs(dx),Math.abs(dy))<18) return; if(Math.abs(dx)>Math.abs(dy)) setDir(dx>0?1:-1,0); else setDir(0,dy>0?1:-1); sx=0; },{passive:true});
  reset(); return {reset,start,togglePause,pause};
})();

// BLASTER
const blaster = (()=> {
  const canvas=$('#canvas-blaster'); const ctx=canvas.getContext('2d'); const W=480,H=640;
  let player,bullets,enemies,particles,stars,score,lives,level,killCount,running,paused,raf,lastTime,spawnAcc,shootHeld,shootAcc,shake;
  function reset(){
    player={x:W/2,y:H-56,w:32,h:24,vx:0,speed:6.5}; bullets=[]; enemies=[]; particles=[]; stars=[...Array(40)].map(()=>({x:Math.random()*W,y:Math.random()*H,s:Math.random()*1.5+0.5,sp:Math.random()*2+0.6}));
    score=0; lives=3; level=1; killCount=0; running=false; paused=false; spawnAcc=0; shootAcc=0; shootHeld=false; shake=0; cancelAnimationFrame(raf); draw(); updateHUDBlaster();
  }
  function updateHUDBlaster(){ $('#modalScore').textContent='SCORE '+score; $('#modalBest').textContent='BEST '+getBest('blaster'); $('#modalHint').textContent=`LIVES ${'♥'.repeat(lives)} • LVL ${level} • KILLS ${killCount}`; }
  function start(){ if(running) return; running=true; paused=false; lastTime=performance.now(); loop(lastTime); }
  function loop(now){ if(!running||paused) return; raf=requestAnimationFrame(loop); const dt=Math.min(32,now-lastTime); lastTime=now; update(dt); draw(); }
  function update(dt){
    stars.forEach(s=>{ s.y+=s.sp*(dt/16); if(s.y>H){ s.y=-4; s.x=Math.random()*W; } });
    if(keys.ArrowLeft||keys.a||keys.A) player.x-=player.speed*(dt/16);
    if(keys.ArrowRight||keys.d||keys.D) player.x+=player.speed*(dt/16);
    player.x=Math.max(14,Math.min(W-14,player.x));
    if(shootHeld||keys[' ']||keys.Spacebar){ shootAcc+=dt; if(shootAcc>130){ shootAcc=0; shoot(); } }
    spawnAcc+=dt; const interval=Math.max(280,880-level*70-killCount*4); if(spawnAcc>interval){ spawnAcc=0; spawnEnemy(); }
    bullets.forEach(b=> b.y-=b.vy*(dt/16)); bullets=bullets.filter(b=>b.y>-10);
    enemies.forEach(e=>{ e.y+=e.vy*(dt/16); e.x+=Math.sin(e.y*0.02+e.phase)*e.swing*(dt/16); });
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      for(let j=bullets.length-1;j>=0;j--){
        const b=bullets[j];
        if(Math.abs(e.x-b.x)<(e.w/2+3)&&Math.abs(e.y-b.y)<(e.h/2+6)){
          bullets.splice(j,1); e.hp--; SFX.hit();
          for(let k=0;k<4;k++) particles.push({x:b.x,y:b.y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:14,col:'#00FFF0'});
          if(e.hp<=0){
            enemies.splice(i,1); score+=e.score; killCount++; if(killCount%20===0){ level++; SFX.perfect(); shake=10; } else SFX.explode();
            for(let k=0;k<12;k++) particles.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:18,col:Math.random()>.5?'#FF006B':'#FACC15'});
            updateHUDBlaster();
          } break;
        }
      }
    }
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      if(e.y>H+40){ enemies.splice(i,1); continue; }
      if(Math.abs(e.x-player.x)<(e.w/2+player.w/2-6)&&Math.abs(e.y-player.y)<(e.h/2+player.h/2-4)){
        enemies.splice(i,1); lives--; shake=12; SFX.die();
        for(let k=0;k<16;k++) particles.push({x:player.x,y:player.y,vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8,life:20,col:'#00FFF0'});
        updateHUDBlaster(); if(lives<=0){ gameOver(); return; }
      }
    }
    particles.forEach(p=>{ p.x+=p.vx*(dt/16); p.y+=p.vy*(dt/16); p.vy+=0.18*(dt/16); p.life--; });
    particles=particles.filter(p=>p.life>0); if(shake>0) shake-=dt*0.05;
  }
  function spawnEnemy(){
    const isBoss=killCount>0&&killCount%20===19; const x=30+Math.random()*(W-60); const type=Math.random();
    if(isBoss){ enemies.push({x:W/2,y:-40,w:56,h:36,vy:0.9,swing:0.6,phase:Math.random()*Math.PI,hp:8,score:150,boss:true}); }
    else if(type<0.6){ enemies.push({x,y:-20,w:28,h:22,vy:1.8+Math.random()*0.9+level*0.18,swing:0.4,phase:Math.random()*6,hp:1,score:10}); }
    else if(type<0.85){ enemies.push({x,y:-20,w:34,h:24,vy:1.4+Math.random()*0.6+level*0.12,swing:0.9,phase:Math.random()*6,hp:2,score:25}); }
    else { enemies.push({x,y:-20,w:22,h:18,vy:2.6+Math.random()*0.8+level*0.2,swing:0.2,phase:Math.random()*6,hp:1,score:15}); }
  }
  function shoot(){ SFX.shoot(); bullets.push({x:player.x-6,y:player.y-12,vy:9}); bullets.push({x:player.x+6,y:player.y-12,vy:9}); particles.push({x:player.x-6,y:player.y-12,vx:0,vy:-2,life:6,col:'#00FFF0'}); particles.push({x:player.x+6,y:player.y-12,vx:0,vy:-2,life:6,col:'#00FFF0'}); }
  function draw(){
    ctx.save(); if(shake>0) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
    ctx.fillStyle='#050510'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.9)'; stars.forEach(s=>{ ctx.globalAlpha=0.6+Math.sin(s.y*0.02)*0.4; ctx.fillRect(s.x,s.y,s.s,s.s); }); ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(0,255,240,.06)'; ctx.lineWidth=1; for(let y=H-180;y<H;y+=18){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.shadowColor='#00FFF0'; ctx.shadowBlur=14; ctx.fillStyle='#00FFF0';
    ctx.beginPath(); ctx.moveTo(player.x,player.y-14); ctx.lineTo(player.x-14,player.y+12); ctx.lineTo(player.x-6,player.y+6); ctx.lineTo(player.x+6,player.y+6); ctx.lineTo(player.x+14,player.y+12); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(player.x,player.y+2,3,0,Math.PI*2); ctx.fill();
    const flame=6+Math.sin(performance.now()*0.02)*2;
    ctx.fillStyle='#FACC15'; ctx.beginPath(); ctx.moveTo(player.x-5,player.y+8); ctx.lineTo(player.x,player.y+8+flame); ctx.lineTo(player.x+5,player.y+8); ctx.fill();
    ctx.fillStyle='#FF006B'; ctx.beginPath(); ctx.moveTo(player.x-3,player.y+8); ctx.lineTo(player.x,player.y+8+flame*0.6); ctx.lineTo(player.x+3,player.y+8); ctx.fill();
    ctx.fillStyle='#00FFF0'; ctx.shadowColor='#00FFF0'; ctx.shadowBlur=8; bullets.forEach(b=> ctx.fillRect(b.x-1.5,b.y-8,3,10)); ctx.shadowBlur=0;
    enemies.forEach(e=>{
      if(e.boss){
        ctx.fillStyle='#FF006B'; ctx.shadowColor='#FF006B'; ctx.shadowBlur=16;
        ctx.beginPath(); ctx.moveTo(e.x,e.y+18); ctx.lineTo(e.x-26,e.y-14); ctx.lineTo(e.x-14,e.y-16); ctx.lineTo(e.x,e.y-6); ctx.lineTo(e.x+14,e.y-16); ctx.lineTo(e.x+26,e.y-14); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle='#fff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('BOSS',e.x,e.y-20);
        ctx.fillStyle='rgba(255,255,255,.15)'; ctx.fillRect(e.x-22,e.y-26,44,4); ctx.fillStyle='#FACC15'; ctx.fillRect(e.x-22,e.y-26,44*(e.hp/8),4);
      } else {
        const col=e.hp>1?'#FACC15':'#FF006B'; ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=10; ctx.beginPath();
        if(e.w>30){ ctx.moveTo(e.x,e.y+10); ctx.lineTo(e.x-14,e.y-8); ctx.lineTo(e.x-6,e.y-10); ctx.lineTo(e.x+6,e.y-10); ctx.lineTo(e.x+14,e.y-8); ctx.closePath(); }
        else { ctx.moveTo(e.x,e.y+8); ctx.lineTo(e.x-10,e.y-8); ctx.lineTo(e.x+10,e.y-8); ctx.closePath(); }
        ctx.fill(); ctx.shadowBlur=0; if(e.hp>1){ ctx.fillStyle='#fff'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(String(e.hp),e.x,e.y+2); }
      }
    });
    particles.forEach(p=>{ ctx.globalAlpha=p.life/20; ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,2.5,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1;
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba(0,0,0,.35)'); g.addColorStop(0.3,'transparent'); g.addColorStop(1,'rgba(0,0,0,.55)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); ctx.restore();
  }
  function gameOver(){ running=false; SFX.die(); addScore('blaster',score); showGameOver(score,`${killCount} kills • LVL ${level}`,getBest('blaster')); }
  const keys={};
  addEventListener('keydown',e=>{ if(currentGame!=='blaster') return; keys[e.key]=true; if(e.key===' '||e.code==='Space'){ e.preventDefault(); shootHeld=true; } });
  addEventListener('keyup',e=>{ keys[e.key]=false; if(e.key===' '||e.code==='Space') shootHeld=false; });
  let dragging=false;
  function setPlayerFromClient(clientX){ const rect=canvas.getBoundingClientRect(); const scaleX=W/rect.width; const x=(clientX-rect.left)*scaleX; player.x=Math.max(14,Math.min(W-14,x)); }
  canvas.addEventListener('pointerdown',e=>{ if(currentGame!=='blaster'||!running||paused) return; dragging=true; shootHeld=true; setPlayerFromClient(e.clientX); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove',e=>{ if(!dragging) return; setPlayerFromClient(e.clientX); });
  canvas.addEventListener('pointerup',e=>{ dragging=false; shootHeld=false; });
  canvas.addEventListener('pointerleave',()=>{ dragging=false; shootHeld=false; });
  function togglePause(){ if(!running) return; paused=!paused; $('#pauseOverlay').classList.toggle('show',paused); $('#modalPause').textContent=paused?'▶':'⏸'; if(!paused){ lastTime=performance.now(); loop(lastTime); } }
  function pause(v){ paused=v; }
  reset(); return {reset,start,togglePause,pause};
})();

// STACK — fixed scoring
const stack = (()=> {
  const canvas=$('#canvas-stack'); const ctx=canvas.getContext('2d'); const W=480,H=640; const BLOCK_H=22;
  let blocks,current,dir,speed,score,perfectStreak,running,paused,raf,lastTime,offset,shake,particles,gameOverFlag;
  function reset(){
    blocks=[{x:(W-120)/2,y:H-BLOCK_H*1.2,w:120,color:`hsl(190 100% 55%)`}];
    current={x:0,y:H-BLOCK_H*1.2-BLOCK_H,w:120,color:`hsl(210 100% 60%)`};
    dir=1; speed=2.8; score=0; perfectStreak=0; shake=0; particles=[]; offset=0; gameOverFlag=false; cancelAnimationFrame(raf); running=false; paused=false; draw(); updateScoreStack();
  }
  function hslFor(idx){ return `hsl(${(190+idx*14)%360} 100% ${58-(idx%3)*4}%)`; }
  function updateScoreStack(){ $('#modalScore').textContent='SCORE '+score; $('#modalBest').textContent='BEST '+getBest('stack'); $('#modalHint').textContent=perfectStreak>=3?`🔥 ${perfectStreak} PERFECTS!`:`STACK ${blocks.length} HIGH`; }
  function start(){ if(running) return; running=true; paused=false; gameOverFlag=false; lastTime=performance.now(); loop(lastTime); }
  function loop(now){ if(!running||paused||gameOverFlag) return; raf=requestAnimationFrame(loop); const dt=Math.min(32,now-lastTime); lastTime=now; update(dt); draw(); }
  function update(dt){
    if(gameOverFlag) return; current.x+=dir*speed*(dt/16);
    if(current.x<=0){ current.x=0; dir=1; } if(current.x+current.w>=W){ current.x=W-current.w; dir=-1; }
    particles.forEach(p=>{ p.x+=p.vx*(dt/16); p.y+=p.vy*(dt/16); p.vy+=0.25*(dt/16); p.life--; });
    particles=particles.filter(p=>p.life>0); if(shake>0) shake-=dt*0.06;
  }
  function drop(){
    if(!running||paused||gameOverFlag) return;
    const prev=blocks[blocks.length-1];
    const overlapLeft=Math.max(prev.x,current.x); const overlapRight=Math.min(prev.x+prev.w,current.x+current.w); const overlap=overlapRight-overlapLeft;
    if(overlap<=0){ SFX.fail(); shake=14; for(let i=0;i<12;i++) particles.push({x:current.x+current.w/2,y:current.y+10,vx:(Math.random()-0.5)*6,vy:Math.random()*-4-1,life:22,col:current.color}); gameOver(); return; }
    const isPerfect=Math.abs(prev.x-current.x)<4 && Math.abs(prev.w-current.w)<4;
    if(isPerfect){
      perfectStreak++; SFX.perfect(); score+= (perfectStreak>=8?50:10+perfectStreak*2);
      current.x=prev.x; current.w=prev.w;
    } else {
      perfectStreak=0; SFX.stack(); score+=5;
      if(overlap<current.w){
        const cutX=current.x<prev.x?current.x:overlapRight; const cutW=current.w-overlap;
        for(let i=0;i<8;i++) particles.push({x:cutX+cutW/2,y:current.y+10,vx:(Math.random()-0.5)*5,vy:Math.random()*-2,life:18,col:current.color});
        current.x=overlapLeft; current.w=overlap;
      }
    }
    const placed={x:current.x,y:current.y,w:current.w,color:current.color}; blocks.push(placed);
    const nextColor=hslFor(blocks.length); current={x:0,y:current.y-BLOCK_H,w:placed.w,color:nextColor}; dir=Math.random()>.5?1:-1;
    if(blocks.length%3===0&&speed<6.5) speed+=0.18;
    if(current.y<120){ const shift=120-current.y; offset+=shift; blocks.forEach(b=> b.y+=shift); current.y+=shift; particles.forEach(p=> p.y+=shift); }
    updateScoreStack();
  }
  function draw(){
    ctx.save(); if(shake>0) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
    ctx.fillStyle='#080810'; ctx.fillRect(0,0,W,H);
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0a0f1e'); g.addColorStop(0.5,'#0f1428'); g.addColorStop(1,'#080810'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1; for(let x=0;x<W;x+=24){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); } for(let y=0;y<H;y+=24){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.fillStyle='rgba(250,204,21,.06)'; ctx.fillRect(0,H-80,W,80);
    blocks.forEach((b,i)=>{
      ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(b.x+4,b.y+BLOCK_H-2,b.w-8,6);
      ctx.fillStyle=b.color; ctx.shadowColor=b.color; ctx.shadowBlur=10; ctx.beginPath(); ctx.roundRect(b.x,b.y,b.w,BLOCK_H,6); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='rgba(255,255,255,.22)'; ctx.beginPath(); ctx.roundRect(b.x,b.y,b.w,6,[6,6,0,0]); ctx.fill();
      if(i===blocks.length-1&&perfectStreak>=3){ ctx.strokeStyle='rgba(255,255,255,.6)'; ctx.lineWidth=1.5; ctx.strokeRect(b.x+1,b.y+1,b.w-2,BLOCK_H-2); }
    });
    if(!gameOverFlag){
      ctx.fillStyle=current.color; ctx.shadowColor=current.color; ctx.shadowBlur=14;
      ctx.globalAlpha=0.14; ctx.fillRect(current.x,blocks[blocks.length-1].y-BLOCK_H,current.w,BLOCK_H); ctx.globalAlpha=1;
      ctx.beginPath(); ctx.roundRect(current.x,current.y,current.w,BLOCK_H,6); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='rgba(255,255,255,.22)'; ctx.beginPath(); ctx.roundRect(current.x,current.y,current.w,6,[6,6,0,0]); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(0,current.y+8,6,6); ctx.fillRect(W-6,current.y+8,6,6);
    }
    particles.forEach(p=>{ ctx.globalAlpha=p.life/22; ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1;
    const vg=ctx.createLinearGradient(0,0,0,H); vg.addColorStop(0,'rgba(0,0,0,.25)'); vg.addColorStop(0.5,'transparent'); vg.addColorStop(1,'rgba(0,0,0,.4)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='800 18px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(String(score).padStart(2,'0'),14,26);
    ctx.font='600 10px JetBrains Mono'; ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillText('STACK',14,38); ctx.restore();
  }
  function gameOver(){ gameOverFlag=true; running=false; const finalScore=score||blocks.length-1; addScore('stack',finalScore); showGameOver(finalScore,perfectStreak>=3?`🔥 ${perfectStreak} perfects!`:`${blocks.length} blocks high`,getBest('stack')); }
  function togglePause(){ if(gameOverFlag||!running) return; paused=!paused; $('#pauseOverlay').classList.toggle('show',paused); $('#modalPause').textContent=paused?'▶':'⏸'; if(!paused){ lastTime=performance.now(); loop(lastTime); } }
  function pause(v){ paused=v; }
  canvas.addEventListener('pointerdown',e=>{ if(currentGame!=='stack') return; if(!running||paused) return; e.preventDefault(); drop(); });
  const handler=(e)=>{ if(currentGame==='stack'&&running&&!paused&&!gameOverFlag){ if(e.code==='Space'||e.key===' '){ if(!$('#overlay-stack').classList.contains('hidden')) return; e.preventDefault(); e.stopImmediatePropagation(); drop(); } } };
  addEventListener('keydown',handler,true);
  reset(); return {reset,start,togglePause,pause,drop};
})();

// DAGGERFALL — UNDAUNTED (raycaster)
const daggerfall = (()=> {
  const canvas=$('#canvas-daggerfall'); const ctx=canvas.getContext('2d');
  const W=640, H=400;
  // map 12x12 1=wall 0=empty 2=door 3=stairs
  const MAP_W=12, MAP_H=12;
  const rawMap=[
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,0,1,1,0,1],
    [1,0,1,0,0,0,1,0,0,1,0,1],
    [1,0,1,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,1,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,0,1,0,1],
    [1,0,1,1,0,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,3,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
  ];
  let map, player, enemies, particles, keys, gold, score, running, paused, raf, lastTime, showMap, killCount, hasKey, level, shake;
  const FOV=Math.PI/2.8;
  function reset(){
    map=rawMap.map(r=>r.slice());
    // place key at random empty
    const empties=[]; for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++) if(map[y][x]===0) empties.push([x,y]);
    const keyPos=empties[Math.floor(Math.random()*empties.length)];
    map[keyPos[1]][keyPos[0]]=4; // key
    player={x:1.5,y:1.5,angle:0.8, hp:5, maxHp:5};
    enemies=[];
    // 4 eye cubes
    for(let i=0;i<4;i++){
      let p; do{ p=empties[Math.floor(Math.random()*empties.length)]; } while((Math.abs(p[0]-1.5)<2&&Math.abs(p[1]-1.5)<2)|| map[p[1]][p[0]]!==0);
      enemies.push({x:p[0]+0.5,y:p[1]+0.5, hp:2, alive:true, seen:false});
    }
    particles=[]; keys=0; hasKey=false; gold=0; score=0; killCount=0; level=1; shake=0; showMap=false; running=false; paused=false; cancelAnimationFrame(raf); draw(); updateHUDDF();
  }
  function updateHUDDF(){
    $('#modalScore').textContent='SCORE '+(score+killCount*80+gold*5);
    $('#modalBest').textContent='BEST '+getBest('daggerfall');
    $('#df-health').textContent='♥'.repeat(player.hp)+'♡'.repeat(player.maxHp-player.hp);
    $('#df-key').textContent=(hasKey?'🔑 1/1':'🔑 0/1');
    $('#df-gold').textContent='🪙 '+gold;
    $('#modalHint').textContent= hasKey? 'Find BLUE STAIRS!' : 'Find the GOLD KEY • KILL EYES • '+killCount+'/4 eyes down';
  }
  function start(){ if(running) return; running=true; paused=false; lastTime=performance.now(); loop(lastTime); }
  function isRunning(){ return running && !paused; }
  function loop(now){
    if(!running||paused) return;
    raf=requestAnimationFrame(loop);
    const dt=Math.min(32, now-lastTime)/16; lastTime=now;
    update(dt);
    draw();
  }
  const input={w:false,a:false,s:false,d:false, q:false,e:false, shift:false};
  addEventListener('keydown',e=>{
    if(currentGame!=='daggerfall') return;
    if(e.key==='w'||e.key==='W') input.w=true;
    if(e.key==='s'||e.key==='S') input.s=true;
    if(e.key==='a'||e.key==='A') input.a=true;
    if(e.key==='d'||e.key==='D') input.d=true;
    if(e.key==='q'||e.key==='Q') input.q=true;
    if(e.key==='e'||e.key==='E') input.e=true;
    if(e.key==='Shift') input.shift=true;
    if(e.key==='m'||e.key==='M'){ showMap=!showMap; toast(showMap?'Map ON':'Map OFF'); }
    if(e.code==='Space'){ e.preventDefault(); shoot(); }
    if(e.key==='F'||e.key==='f'){ showMap=!showMap; }
  });
  addEventListener('keyup',e=>{
    if(e.key==='w'||e.key==='W') input.w=false;
    if(e.key==='s'||e.key==='S') input.s=false;
    if(e.key==='a'||e.key==='A') input.a=false;
    if(e.key==='d'||e.key==='D') input.d=false;
    if(e.key==='q'||e.key==='Q') input.q=false;
    if(e.key==='e'||e.key==='E') input.e=false;
    if(e.key==='Shift') input.shift=false;
  });
  // mouse drag to look
  let dragging=false, lastX=0;
  canvas.addEventListener('pointerdown',e=>{
    if(currentGame!=='daggerfall'||!running) return;
    if(!$('#overlay-daggerfall').classList.contains('hidden')){
      // clicking overlay shouldn't matter
    } else {
      dragging=true; lastX=e.clientX; canvas.setPointerCapture(e.pointerId);
      // also shoot on click
      shoot();
    }
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging||paused) return;
    const dx=e.clientX-lastX; lastX=e.clientX;
    player.angle+= dx*0.006;
  });
  canvas.addEventListener('pointerup',()=> dragging=false);
  canvas.addEventListener('pointerleave',()=> dragging=false);
  // also click to shoot when running
  canvas.addEventListener('click',()=>{
    if(currentGame!=='daggerfall'||!running||paused) return;
    if($('#overlay-daggerfall').classList.contains('hidden')) shoot();
  });

  function canMove(nx,ny){
    const mx=Math.floor(nx), my=Math.floor(ny);
    if(mx<0||my<0||mx>=MAP_W||my>=MAP_H) return false;
    const v=map[my][mx];
    if(v===1) return false;
    if(v===2) return false; // door closed? we have no doors now
    return true;
  }
  function update(dt){
    const speed= (input.shift?0.09:0.055)*dt;
    const rot= 0.045*dt;
    if(input.q) player.angle-= rot;
    if(input.e) player.angle+= rot;
    // strafe + forward
    let moveX=0, moveY=0;
    if(input.w){ moveX+= Math.cos(player.angle)*speed; moveY+= Math.sin(player.angle)*speed; }
    if(input.s){ moveX-= Math.cos(player.angle)*speed; moveY-= Math.sin(player.angle)*speed; }
    if(input.a){ moveX+= Math.cos(player.angle-Math.PI/2)*speed*0.7; moveY+= Math.sin(player.angle-Math.PI/2)*speed*0.7; }
    if(input.d){ moveX+= Math.cos(player.angle+Math.PI/2)*speed*0.7; moveY+= Math.sin(player.angle+Math.PI/2)*speed*0.7; }
    const nx=player.x+moveX, ny=player.y+moveY;
    if(canMove(nx,player.y)) player.x=nx;
    if(canMove(player.x,ny)) player.y=ny;
    // check key pickup
    const mx=Math.floor(player.x), my=Math.floor(player.y);
    if(map[my][mx]===4){
      map[my][mx]=0; hasKey=true; gold+=25; score+=100; SFX.key(); updateHUDDF();
      // spawn extra gold particles
      for(let i=0;i<8;i++) particles.push({x:player.x,y:player.y, vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2, life:18, col:'#FACC15'});
      toast('GOLD KEY ACQUIRED!');
    }
    if(map[my][mx]===3){
      if(hasKey){
        // win level
        score+= 250 + killCount*80 + gold*2 + Math.max(0, 100 - Math.floor(performance.now()/100)%100);
        SFX.perfect();
        running=false;
        addScore('daggerfall', score+killCount*80+gold*5);
        showGameOver(score+killCount*80+gold*5, `Escaped! ${killCount}/4 eyes • ${gold} gold`, getBest('daggerfall'));
        return;
      } else {
        // need key, bounce back a bit
        // push player back
        player.x-= Math.cos(player.angle)*0.12;
        player.y-= Math.sin(player.angle)*0.12;
        if(Math.random()<0.02) toast('NEED GOLD KEY!');
      }
    }
    // enemy AI: move slowly toward player if in LOS
    enemies.forEach(en=>{
      if(!en.alive) return;
      const dx=player.x-en.x, dy=player.y-en.y;
      const dist=Math.hypot(dx,dy);
      if(dist<6){
        // check line of sight (simple ray)
        let hitWall=false;
        const steps=Math.floor(dist*8);
        for(let i=1;i<steps;i++){
          const t=i/steps; const rx=en.x+dx*t, ry=en.y+dy*t;
          if(map[Math.floor(ry)][Math.floor(rx)]===1){ hitWall=true; break; }
        }
        if(!hitWall){
          en.seen=true;
          if(dist>1.0){
            const sp=0.015*dt;
            const nx=en.x+ (dx/dist)*sp, ny=en.y+ (dy/dist)*sp;
            if(canMove(nx,ny)|| canMove(nx,en.y)|| canMove(en.x,ny)){
              if(canMove(nx,en.y)) en.x=nx; if(canMove(en.x,ny)) en.y=ny;
            }
          } else {
            // touch player -> damage with cooldown
            en.cooldown=(en.cooldown||0)-dt;
            if((en.cooldown||0)<=0){
              player.hp--; en.cooldown=60; shake=10; SFX.die(); updateHUDDF();
              for(let i=0;i<10;i++) particles.push({x:player.x,y:player.y,vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2, life:14, col:'#FF006B'});
              if(player.hp<=0){
                running=false; SFX.die();
                addScore('daggerfall', score+killCount*40+gold*5);
                showGameOver(score+killCount*40+gold*5, `Killed by eye • ${killCount}/4 eyes`, getBest('daggerfall'));
              }
            }
          }
        }
      }
    });
    particles.forEach(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.life--; });
    particles=particles.filter(p=>p.life>0);
    if(shake>0) shake-=dt*0.5;
  }
  function shoot(){
    if(!running||paused) return;
    SFX.shoot(); shake=4;
    // raycast forward to find first enemy hit within angle tolerance
    // brute: check all enemies, if angle diff small and distance < 6 and LOS not blocked, hit
    let hit=null, hitDist=999;
    enemies.forEach(en=>{
      if(!en.alive) return;
      const dx=en.x-player.x, dy=en.y-player.y;
      const dist=Math.hypot(dx,dy);
      if(dist>7) return;
      let angleTo=Math.atan2(dy,dx);
      let diff=Math.atan2(Math.sin(angleTo-player.angle), Math.cos(angleTo-player.angle));
      if(Math.abs(diff) < 0.28){ // ~16 deg cone
        // LOS check
        let blocked=false;
        const steps=Math.floor(dist*8);
        for(let i=1;i<steps;i++){ const t=i/steps; const rx=player.x+dx*t, ry=player.y+dy*t; if(map[Math.floor(ry)][Math.floor(rx)]===1){ blocked=true; break; } }
        if(!blocked && dist<hitDist){ hit=en; hitDist=dist; }
      }
    });
    if(hit){
      hit.hp--; SFX.hit();
      for(let i=0;i<6;i++) particles.push({x:hit.x,y:hit.y,vx:(Math.random()-0.5)*0.1, vy:(Math.random()-0.5)*0.1, life:12, col:'#b48cff'});
      if(hit.hp<=0){
        hit.alive=false; killCount++; gold+=10; score+=80; updateHUDDF(); SFX.explode();
        for(let i=0;i<14;i++) particles.push({x:hit.x,y:hit.y,vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2, life:16, col: Math.random()>.5?'#b48cff':'#00FFF0'});
        toast('EYE VANQUISHED! '+killCount+'/4');
      }
    } else {
      // miss puff
      const mx=player.x+Math.cos(player.angle)*0.6, my=player.y+Math.sin(player.angle)*0.6;
      particles.push({x:mx,y:my,vx:Math.cos(player.angle)*0.05, vy:Math.sin(player.angle)*0.05, life:8, col:'#fff'});
    }
  }
  function draw(){
    // raycaster render
    ctx.save();
    if(shake>0) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
    // ceiling / floor
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#1a1230'); grad.addColorStop(0.48,'#1a1230'); grad.addColorStop(0.5,'#2a1a1a'); grad.addColorStop(1,'#0a0808');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    // walls by raycasting
    const numRays=W; // 1 per pixel
    for(let x=0;x<numRays;x++){
      const cameraX= 2*x/numRays -1;
      const rayAngle= player.angle + Math.atan(cameraX * Math.tan(FOV/2));
      // DDA
      let mapX=Math.floor(player.x), mapY=Math.floor(player.y);
      let rayDirX=Math.cos(rayAngle), rayDirY=Math.sin(rayAngle);
      let deltaDistX=Math.abs(1/rayDirX), deltaDistY=Math.abs(1/rayDirY);
      let stepX, stepY, sideDistX, sideDistY;
      if(rayDirX<0){ stepX=-1; sideDistX=(player.x-mapX)*deltaDistX; } else { stepX=1; sideDistX=(mapX+1-player.x)*deltaDistX; }
      if(rayDirY<0){ stepY=-1; sideDistY=(player.y-mapY)*deltaDistY; } else { stepY=1; sideDistY=(mapY+1-player.y)*deltaDistY; }
      let hit=0, side=0;
      let maxSteps=20;
      while(hit===0 && maxSteps-->0){
        if(sideDistX<sideDistY){ sideDistX+=deltaDistX; mapX+=stepX; side=0; }
        else { sideDistY+=deltaDistY; mapY+=stepY; side=1; }
        if(mapY>=0&&mapY<MAP_H&&mapX>=0&&mapX<MAP_W){
          const v=map[mapY][mapX];
          if(v===1||v===3||v===4) hit=v;
        } else hit=1;
      }
      let perpDist;
      if(side===0) perpDist=(mapX - player.x + (1-stepX)/2)/rayDirX;
      else perpDist=(mapY - player.y + (1-stepY)/2)/rayDirY;
      perpDist=Math.max(0.2, perpDist);
      // fix fisheye via cos
      perpDist*= Math.cos(rayAngle - player.angle);
      const lineH=Math.floor(H / perpDist);
      const drawStart=Math.max(0, -lineH/2 + H/2);
      const drawEnd=Math.min(H-1, lineH/2 + H/2);
      // wall shading
      let col;
      if(hit===4) col= side? '#FACC15' : '#ffe27a'; // key gold
      else if(hit===3) col= side? '#22c55e' : '#4ade80'; // stairs green-blue
      else {
        // checker pattern for stone
        const isDark = (mapX+mapY)%2===0;
        if(side===0) col= isDark? '#6b5a8a' : '#8a6fc0';
        else col= isDark? '#4a3a62' : '#6b5290';
        // distance shade
        const shade=Math.min(1, 1.2 / (perpDist*0.7));
        // apply shade by mixing
        // we'll just adjust brightness via overlay later
      }
      // draw column
      const stripeW= W/numRays;
      // apply distance fog: dim with distance
      const fog=Math.min(0.75, perpDist/8);
      // base wall
      ctx.fillStyle=col;
      // small texture lines every 4
      ctx.fillRect(x*stripeW, drawStart, Math.ceil(stripeW)+0.5, drawEnd-drawStart);
      // add vertical stripe for mortar
      if(mapX%2===0 && x%4===0){
        ctx.fillStyle='rgba(0,0,0,.08)';
        ctx.fillRect(x*stripeW, drawStart, 1, drawEnd-drawStart);
      }
      // fog overlay
      ctx.fillStyle=`rgba(0,0,0,${fog*0.6})`;
      ctx.fillRect(x*stripeW, drawStart, Math.ceil(stripeW)+0.5, drawEnd-drawStart);
      // floor shading
      // floor already via gradient, but add floor texture under wall
      // we could draw floor lines per column: simple darkening
    }
    // sprites (enemies, key, stairs) - sort by distance
    const sprites=[];
    enemies.forEach(en=>{
      if(!en.alive) return;
      const dx=en.x-player.x, dy=en.y-player.y;
      const dist=Math.hypot(dx,dy);
      let angleTo=Math.atan2(dy,dx)-player.angle;
      while(angleTo>Math.PI) angleTo-=2*Math.PI; while(angleTo<-Math.PI) angleTo+=2*Math.PI;
      sprites.push({x:en.x,y:en.y, dist, angle:angleTo, type:'enemy', obj:en});
    });
    // key sprite
    for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++) if(map[y][x]===4){
      const dx=x+0.5-player.x, dy=y+0.5-player.y; const dist=Math.hypot(dx,dy);
      let angleTo=Math.atan2(dy,dx)-player.angle; while(angleTo>Math.PI) angleTo-=2*Math.PI; while(angleTo<-Math.PI) angleTo+=2*Math.PI;
      sprites.push({x:x+0.5,y:y+0.5,dist,angle:angleTo,type:'key'});
    }
    // stairs
    for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++) if(map[y][x]===3){
      const dx=x+0.5-player.x, dy=y+0.5-player.y; const dist=Math.hypot(dx,dy);
      let angleTo=Math.atan2(dy,dx)-player.angle; while(angleTo>Math.PI) angleTo-=2*Math.PI; while(angleTo<-Math.PI) angleTo+=2*Math.PI;
      sprites.push({x:x+0.5,y:y+0.5,dist,angle:angleTo,type:'stairs'});
    }
    sprites.sort((a,b)=>b.dist-a.dist);
    sprites.forEach(s=>{
      if(Math.abs(s.angle) > FOV/2 + 0.4) return;
      // check occlusion by walls: ray to sprite
      let blocked=false;
      const steps=Math.floor(s.dist*8);
      for(let i=1;i<steps;i++){
        const t=i/steps; const rx=player.x+(s.x-player.x)*t, ry=player.y+(s.y-player.y)*t;
        const mx=Math.floor(rx), my=Math.floor(ry);
        if(map[my]?.[mx]===1){ blocked=true; break; }
      }
      if(blocked) return;
      const size= Math.floor(H / s.dist * 0.6);
      const screenX= W/2 + Math.tan(s.angle) * (W/2) / Math.tan(FOV/2);
      const y= H/2 - size/2;
      // draw sprite
      if(s.type==='enemy'){
        const bob=Math.sin(performance.now()*0.004 + s.x*2)*4;
        // eye cube
        ctx.fillStyle=s.obj.hp===1?'#ff3b6b':'#b48cff';
        ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.roundRect(screenX-size/2, y+bob, size, size, 6); ctx.fill(); ctx.shadowBlur=0;
        // eye
        ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(screenX, y+size/2+bob, size*0.18,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(screenX+size*0.06, y+size/2+bob-size*0.05, size*0.07,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff0000'; ctx.beginPath(); ctx.arc(screenX, y+size/2+bob, size*0.07,0,Math.PI*2); ctx.fill();
        // health ticks
        ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(screenX-size/2, y+bob-6, size, 4);
        ctx.fillStyle='#22c55e'; ctx.fillRect(screenX-size/2, y+bob-6, size*(s.obj.hp/2),4);
      } else if(s.type==='key'){
        const bob=Math.sin(performance.now()*0.003)*6;
        ctx.fillStyle='#FACC15'; ctx.shadowColor='#FACC15'; ctx.shadowBlur=14;
        ctx.font=`${size*0.9}px serif`; ctx.textAlign='center'; ctx.fillText('🔑', screenX, y+size*0.8+bob); ctx.shadowBlur=0;
      } else if(s.type==='stairs'){
        ctx.fillStyle='#22c55e'; ctx.globalAlpha=0.9;
        ctx.fillRect(screenX-size/2, y+size*0.3, size, size*0.4);
        ctx.fillStyle='#fff'; ctx.font=`700 ${size*0.2}px JetBrains Mono`; ctx.textAlign='center'; ctx.fillText('EXIT', screenX, y+size*0.55);
        ctx.globalAlpha=1;
      }
    });
    // particles in world projected? simpler: just draw as screen overlay for hit effects
    particles.forEach(p=>{
      const dx=p.x-player.x, dy=p.y-player.y; const dist=Math.hypot(dx,dy); if(dist>8) return;
      let angleTo=Math.atan2(dy,dx)-player.angle; while(angleTo>Math.PI) angleTo-=2*Math.PI; while(angleTo<-Math.PI) angleTo+=2*Math.PI;
      if(Math.abs(angleTo)>FOV/2) return;
      const screenX= W/2 + Math.tan(angleTo)*(W/2)/Math.tan(FOV/2);
      const y= H/2 - (H/dist)*0.6/2;
      ctx.globalAlpha=p.life/18; ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(screenX, y, 3,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    });
    // crosshair
    ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(W/2-10, H/2); ctx.lineTo(W/2-4, H/2); ctx.moveTo(W/2+4, H/2); ctx.lineTo(W/2+10, H/2); ctx.moveTo(W/2, H/2-10); ctx.lineTo(W/2, H/2-4); ctx.moveTo(W/2, H/2+4); ctx.lineTo(W/2, H/2+10); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(W/2,H/2,1.5,0,Math.PI*2); ctx.fill();
    // minimap
    if(showMap){
      const ms=9, pad=8;
      ctx.fillStyle='rgba(0,0,0,.65)'; ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(W- MAP_W*ms - pad*2, pad, MAP_W*ms+pad*2, MAP_H*ms+pad*2, 8); ctx.fill(); ctx.stroke();
      for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++){
        const v=map[y][x]; let col;
        if(v===1) col='#6b5a8a';
        else if(v===3) col='#22c55e';
        else if(v===4) col='#FACC15';
        else col='rgba(255,255,255,.06)';
        ctx.fillStyle=col;
        ctx.fillRect(W- MAP_W*ms - pad + x*ms, pad+ y*ms, ms-1, ms-1);
      }
      // enemies
      enemies.filter(e=>e.alive).forEach(en=>{
        ctx.fillStyle='#ff3b6b'; ctx.beginPath(); ctx.arc(W- MAP_W*ms - pad + en.x*ms, pad+ en.y*ms, 3,0,Math.PI*2); ctx.fill();
      });
      // player
      ctx.fillStyle='#00FFF0'; ctx.beginPath(); ctx.arc(W- MAP_W*ms - pad + player.x*ms, pad+ player.y*ms, 4,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#00FFF0'; ctx.beginPath(); ctx.moveTo(W- MAP_W*ms - pad + player.x*ms, pad+ player.y*ms);
      ctx.lineTo(W- MAP_W*ms - pad + (player.x+Math.cos(player.angle)*1.2)*ms, pad+ (player.y+Math.sin(player.angle)*1.2)*ms); ctx.stroke();
    } else {
      ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(W-110,8,102,18);
      ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('M for MAP', W-59,19);
    }
    // vignette
    const vg=ctx.createRadialGradient(W/2,H/2, 180, W/2,H/2, 400);
    vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,.5)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  function togglePause(){ if(!running) return; paused=!paused; $('#pauseOverlay').classList.toggle('show',paused); $('#modalPause').textContent=paused?'▶':'⏸'; if(!paused){ lastTime=performance.now(); loop(lastTime); } }
  function pause(v){ paused=v; }
  reset();
  return {reset,start,togglePause,pause,isRunning};
})();

// PAPERS PLEASE
const papers = (()=> {
  const nations=['Arstotzka','Antegria','Impor','Kolechia','Obristan','Republia'];
  const cities={Arstotzka:['Orvech Vonor','East Grestin'], Antegria:['St. Marmero','Glorian'], Impor:['Enkyo','Haihan'], Kolechia:['Yurko City','Vedor'], Obristan:['Skal','Lorndaz'], Republia:['True Glorian','Lesrenadi']};
  const names=["Mikhail Abramov","Anya Petrova","Jorji Costava","Ivan Harkov","Katrina Polov","Dimitri Vladov","Sergei Nevsky","Elisa Winter","Georgi Orlov","Tomas Karov","Nadia Krov","Viktor Lunik","Oleg Barov","Sofia Densk","Alexei Morin","Irina Volsk","Yuri Gurov","Mila Anton","Pavel Dorin","Erik Balik"];
  const today=new Date('1982-11-23');
  let score, citations, timeLeft, totalTime, running, paused, raf, lastTime, current, wanted, day, entrantCount;
  const elFace=$('#pp-face'), elName=$('#pp-entrant-name'), elNation=$('#pp-entrant-nation'), elSays=$('#pp-entrant-says'), elPassport=$('#pp-passport'), elPermit=$('#pp-permit'), elRules=$('#pp-rulelist'), elWanted=$('#pp-wanted'), elDay=$('#pp-day'), elTime=$('#pp-time'), elScore=$('#pp-score'), elCitations=$('#pp-citations'), elTimerBar=$('#pp-timer-bar'), elFeedback=$('#pp-feedback');

  function rand(a){ return a[Math.floor(Math.random()*a.length)]; }
  function randomDate(start,end){ const d=new Date(start.getTime()+Math.random()*(end.getTime()-start.getTime())); return d.toISOString().slice(0,10); }
  function isExpired(dateStr){ return new Date(dateStr) <= today; }

  function generateEntrant(){
    const nation=rand(nations);
    const name=rand(names);
    const sex=Math.random()>.5?'M':'F';
    const dob=randomDate(new Date('1950-01-01'), new Date('1980-01-01'));
    const passExp=randomDate(new Date('1981-01-01'), new Date('1985-12-31'));
    const id=`${Math.floor(100000+Math.random()*900000)}`;
    const issuing=rand(cities[nation]||['Grestin']);
    let hasPermit = nation==='Obristan' ? Math.random()>.3 : Math.random()>.8; // most Obristan should have permit, others rarely
    let permitExp= hasPermit ? randomDate(new Date('1982-06-01'), new Date('1983-06-01')) : null;
    let permitName=name, permitNation=nation;
    let purpose=rand(['visit','transit','work','immigrate']);
    let hasWorkPass= purpose==='work' ? Math.random()>.4 : false;
    let photoMatch= Math.random()>.15;
    let idMatch= Math.random()>.1;
    let nameMatch= Math.random()>.08; // mismatch permit name
    if(!nameMatch && hasPermit) permitName=rand(names);
    if(Math.random()>.92){ permitNation=rand(nations.filter(n=>n!==nation)); } // nation mismatch
    // flaws: 50% valid, 50% with one flaw
    const shouldBeValid = Math.random()>.5;
    // we will introduce flaws depending on shouldBeValid
    let flaws=[];
    if(!shouldBeValid){
      const flawType=rand(['expired_pass','missing_permit','expired_permit','photo','name_mismatch','wanted']);
      if(flawType==='expired_pass'){
        // force expired
        passExpFixed:for(let attempt=0;attempt<5;attempt++){
          const d=randomDate(new Date('1980-01-01'), new Date('1982-11-22'));
          if(new Date(d)<=today) { flaws.push('expired_pass'); currentFlaw='expired'; break; }
        }
        // hack: set passExp to expired
        // we need to set variable, not const
      }
      // Instead we override later based on flaw
    }
    // Actually we will build entrant then optionally corrupt one field if shouldBeValid==false
    let entrant={
      name, nation, sex, dob, passExp, issuing, id, purpose, hasPermit, permitExp, permitName, permitNation, hasWorkPass, photoMatch, idMatch: idMatch? id : String(Math.floor(100000+Math.random()*900000)), nameMatch, wanted:false, says: rand(['I am visiting for a few days.','I want to work.','Just passing through.','Visiting family.','Business.','I have all documents.'])
    };
    // wanted check
    entrant.wanted = wanted.includes(name);
    // introduce flaw if needed
    if(!shouldBeValid){
      const flaw=rand(['expired_pass','missing_permit','expired_permit','photo','name_mismatch','id_mismatch','nation_mismatch']);
      if(flaw==='expired_pass') entrant.passExp=randomDate(new Date('1980-01-01'), new Date('1982-11-22'));
      else if(flaw==='missing_permit' && nation==='Obristan') entrant.hasPermit=false;
      else if(flaw==='missing_permit') entrant.hasPermit=false; // but not required then wouldn't be invalid; ensure we make Obristan missing
      else if(flaw==='expired_permit' && entrant.hasPermit) entrant.permitExp=randomDate(new Date('1981-01-01'), new Date('1982-11-22'));
      else if(flaw==='photo') entrant.photoMatch=false;
      else if(flaw==='name_mismatch' && entrant.hasPermit) entrant.permitName=rand(names.filter(n=>n!==name));
      else if(flaw==='id_mismatch') entrant.idMatch= String(Math.floor(100000+Math.random()*900000));
      else if(flaw==='nation_mismatch' && entrant.hasPermit) entrant.permitNation=rand(nations.filter(n=>n!==nation));
      else {
        // fallback flaw: expired
        entrant.passExp=randomDate(new Date('1980-01-01'), new Date('1982-11-22'));
      }
      // if flaw didn't actually make invalid under current rules, force expired
      if(isValid(entrant)) entrant.passExp=randomDate(new Date('1980-01-01'), new Date('1982-11-22'));
    } else {
      // ensure valid: fix possible invalid states
      if(isExpired(entrant.passExp)) entrant.passExp=randomDate(new Date('1983-01-01'), new Date('1985-01-01'));
      if(nation==='Obristan' && !entrant.hasPermit){ entrant.hasPermit=true; entrant.permitExp=randomDate(new Date('1983-01-01'), new Date('1983-12-31')); entrant.permitName=name; entrant.permitNation=nation; }
      if(entrant.hasPermit && isExpired(entrant.permitExp)) entrant.permitExp=randomDate(new Date('1983-01-01'), new Date('1984-01-01'));
      entrant.photoMatch=true;
      if(entrant.hasPermit){ entrant.permitName=name; entrant.permitNation=nation; }
      entrant.wanted=false; // valid entrant not wanted
      if(wanted.includes(name)) entrant.name=rand(names.filter(n=>!wanted.includes(n))); // avoid wanted for valid
    }
    // ensure Obristan without permit after corruption is correctly flagged as invalid
    return entrant;
  }

  function isValid(e){
    // rules evolving by day (now based on score)
    // Day1: passport not expired
    if(isExpired(e.passExp)) return false;
    // Photo mismatch is always invalid
    if(!e.photoMatch) return false;
    // Wanted is always invalid (deny)
    if(e.wanted) return false;
    // Obristan needs permit from day1 onward ( упростим )
    if(e.nation==='Obristan'){
      if(!e.hasPermit) return false;
      if(isExpired(e.permitExp)) return false;
      if(e.permitName!==e.name) return false;
      if(e.permitNation!==e.nation) return false;
    } else {
      // if they have a permit but nation mismatch, that's okay? but if they present one with mismatch, it's invalid to have mismatched permit?
      // We'll not require permit for others, but if they present a mismatched one, flag
      if(e.hasPermit){
        if(e.permitName!==e.name || e.permitNation!==e.nation) return false;
        if(isExpired(e.permitExp)) return false;
      }
    }
    // Work purpose needs work pass (we simplified as not checking separate doc, but we treat as permit check? keep simple)
    // ID mismatch (passport ID vs typed id) - for simplicity, if idMatch !== id then invalid
    if(e.idMatch!==e.id) return false;
    return true;
  }

  function renderEntrant(){
    current=generateEntrant();
    // face emoji based on match? photo mismatch shows different emoji
    elFace.textContent= current.photoMatch ? (current.sex==='M'?'👨':'👩') : '👤';
    elFace.style.filter= current.photoMatch ? '' : 'grayscale(1) contrast(1.2)';
    elName.textContent=current.name + (current.wanted?'  ⚠️ WANTED':'' );
    elName.style.color= current.wanted? '#dc2626':'#2b2216';
    elNation.textContent=current.nation+' • '+current.sex+' • '+current.purpose.toUpperCase();
    elSays.textContent='“'+current.says+'”';
    // passport doc
    const passBad=[];
    if(isExpired(current.passExp)) passBad.push('expiry');
    if(!current.photoMatch) passBad.push('photo');
    if(current.idMatch!==current.id) passBad.push('id');
    if(current.wanted) passBad.push('wanted');

    elPassport.innerHTML=`
      <h5><span>🛂</span> PASSPORT — ${current.nation.toUpperCase()} <div class="photo">${current.photoMatch? (current.sex==='M'?'👨':'👩'):'❓'}</div></h5>
      <div class="field ${passBad.includes('wanted')?'bad':''}"><span>Name</span><b class="${current.wanted?'bad':''}">${current.name}</b></div>
      <div class="field"><span>Nation</span><b>${current.nation}</b></div>
      <div class="field"><span>Sex</span><b>${current.sex}</b><span>DOB</span><b>${current.dob}</b></div>
      <div class="field ${passBad.includes('expiry')?'bad':''}"><span>Expires</span><b class="${passBad.includes('expiry')?'bad':''}">${current.passExp}</b></div>
      <div class="field ${passBad.includes('id')?'bad':''}"><span>Passport #</span><b class="${passBad.includes('id')?'bad':''}">${current.id}</b></div>
      <div class="field"><span>Issuing City</span><b>${current.issuing}</b></div>
      <div class="stamp" id="pp-stamp-pass"></div>
    `;
    // permit
    if(current.hasPermit){
      const permitBad=[];
      if(isExpired(current.permitExp)) permitBad.push('expiry');
      if(current.permitName!==current.name) permitBad.push('name');
      if(current.permitNation!==current.nation) permitBad.push('nation');
      elPermit.classList.remove('hidden');
      elPermit.innerHTML=`
        <h5><span>📄</span> ENTRY PERMIT <div class="photo" style="font-size:10px;">VISA</div></h5>
        <div class="field ${permitBad.includes('name')?'bad':''}"><span>Name</span><b class="${permitBad.includes('name')?'bad':''}">${current.permitName}</b></div>
        <div class="field ${permitBad.includes('nation')?'bad':''}"><span>Nation</span><b class="${permitBad.includes('nation')?'bad':''}">${current.permitNation}</b></div>
        <div class="field ${permitBad.includes('expiry')?'bad':''}"><span>Expires</span><b class="${permitBad.includes('expiry')?'bad':''}">${current.permitExp}</b></div>
        <div class="field"><span>Purpose</span><b>${current.purpose.toUpperCase()}</b></div>
        <div class="field"><span>Permit #</span><b>${Math.floor(100000+Math.random()*900000)}</b></div>
        <div class="stamp" id="pp-stamp-permit"></div>
      `;
    } else {
      elPermit.classList.add('hidden');
      elPermit.innerHTML='';
    }
    // highlight handling
    $$('.doc .field').forEach(f=> f.addEventListener('click',()=>{
      f.classList.toggle('highlight'); SFX.hit();
    }));
    updatePapersHUD();
  }

  function updatePapersHUD(){
    elScore.textContent='SCORE '+score;
    $('#modalScore').textContent='SCORE '+score;
    $('#modalBest').textContent='BEST '+getBest('papers');
    elCitations.textContent='CITATIONS '+citations+'/3';
    elDay.textContent=`DAY ${day} — ARSTOTZKA BORDER`;
    // time
    const mins=8+Math.floor((totalTime-timeLeft)/60);
    const secs=Math.floor((totalTime-timeLeft)%60);
    const displayMins=String(mins).padStart(2,'0');
    const displaySecs=String(secs).padStart(2,'0');
    elTime.textContent=displayMins+':'+displaySecs;
    elTimerBar.style.width=(timeLeft/totalTime*100)+'%';
    if(timeLeft/totalTime<0.25) elTimerBar.style.background='var(--pink)';
    else if(timeLeft/totalTime<0.5) elTimerBar.style.background='var(--yellow)';
    else elTimerBar.style.background='var(--green)';
    const rules=[
      'Passport required',
      'Expiry > 1982-11-23',
      'Obristan needs Entry Permit',
      'Permit must match name/nation',
      'Photo must match entrant',
      'WANTED criminals DENY'
    ];
    // show first 3 + extra based on day
    const showCount= Math.min(rules.length, 3+ Math.floor(day/2));
    $('#pp-rulelist').innerHTML=rules.slice(0,showCount).map(r=>`<li>${r}</li>`).join('');
    if(wanted.length){
      elWanted.classList.add('show');
      elWanted.innerHTML='<b>WANTED:</b> '+wanted.join(', ');
    } else elWanted.classList.remove('show');
  }

  function reset(){
    score=0; citations=0; totalTime=75; timeLeft=totalTime; day=1; entrantCount=0;
    wanted=[rand(names), rand(names)];
    // pick wanted not too common
    cancelAnimationFrame(raf); running=false; paused=false;
    $('#modalScore').textContent='SCORE 0';
    updatePapersHUD();
    // clear feedback
    elFeedback.classList.remove('show');
  }
  function start(){
    if(running) return;
    running=true; paused=false;
    renderEntrant();
    lastTime=performance.now();
    loop(lastTime);
  }
  function loop(now){
    if(!running||paused) return;
    raf=requestAnimationFrame(loop);
    const dt=(now-lastTime)/1000; lastTime=now;
    if(!paused){
      timeLeft-=dt;
      if(timeLeft<=0){
        timeLeft=0; updatePapersHUD();
        endShift(true);
        return;
      }
      updatePapersHUD();
    }
  }
  function decide(approve){
    if(!running||paused) return;
    const valid=isValid(current);
    const correct = (approve===valid);
    const stampEl = $('#pp-stamp-pass') || $('#pp-stamp-permit');
    // show stamp animation
    const stamp = document.createElement('div');
    stamp.className='stamp '+(approve?'approved':'denied');
    stamp.textContent=approve?'APPROVED':'DENIED';
    stamp.style.position='absolute'; stamp.style.right='10px'; stamp.style.bottom='10px'; stamp.style.width='64px'; stamp.style.height='64px'; stamp.style.borderRadius='50%'; stamp.style.border='3px solid'; stamp.style.display='grid'; stamp.style.placeItems='center'; stamp.style.fontWeight='900'; stamp.style.fontSize='11px'; stamp.style.transform='rotate(-14deg)'; stamp.style.zIndex='2';
    stamp.style.borderColor=approve?'#16a34a':'#dc2626'; stamp.style.color=approve?'#16a34a':'#dc2626'; stamp.style.background=approve?'rgba(22,163,74,.08)':'rgba(220,38,38,.08)';
    elPassport.appendChild(stamp);
    if(current.hasPermit && elPermit && !elPermit.classList.contains('hidden')){
      const s2=stamp.cloneNode(true); elPermit.appendChild(s2);
    }

    SFX.stamp();
    if(correct){
      score+=25; entrantCount++; elFeedback.textContent='✓ CORRECT'; elFeedback.style.background='rgba(22,163,74,.9)'; elFeedback.classList.add('show');
      // bonus for fast? already
      if(entrantCount%5===0){ day++; if(day<=6) { // evolve wanted
        wanted=[rand(names), rand(names)];
        toast('NEW RULES — Day '+day);
      } score+=20; }
    } else {
      citations++; score=Math.max(0, score-10); elFeedback.textContent='✕ WRONG — '+ (valid? 'Should APPROVE' : 'Should DENY'); elFeedback.style.background='rgba(220,38,38,.9)'; elFeedback.classList.add('show');
      if(navigator.vibrate) navigator.vibrate(80);
      SFX.fail();
      if(citations>=3){
        setTimeout(()=> endShift(false), 600);
        return;
      }
    }
    updatePapersHUD();
    setTimeout(()=>{ elFeedback.classList.remove('show'); // next entrant
      // slide out animation simulated by re-render
      renderEntrant();
    }, 700);
  }
  function endShift(timeUp){
    running=false; cancelAnimationFrame(raf);
    const final=score;
    addScore('papers', final);
    const sub = citations>=3 ? `3 citations — shift failed` : `Shift complete — ${entrantCount} entrants • Day ${day}`;
    showGameOver(final, sub, getBest('papers'));
  }
  function togglePause(){ if(!running) return; paused=!paused; $('#pauseOverlay').classList.toggle('show',paused); $('#modalPause').textContent=paused?'▶':'⏸'; if(!paused){ lastTime=performance.now(); loop(lastTime); } }
  function pause(v){ paused=v; }

  $('#pp-approve')?.addEventListener('click',()=> decide(true));
  $('#pp-deny')?.addEventListener('click',()=> decide(false));
  addEventListener('keydown',e=>{
    if(currentGame!=='papers'||!running||paused) return;
    if(e.key==='a'||e.key==='A'){ e.preventDefault(); decide(true); }
    if(e.key==='d'||e.key==='D'){ e.preventDefault(); decide(false); }
  });

  reset();
  return {reset,start,togglePause,pause};
})();

function showGameOver(score, sub, best){
  $('#goScore').textContent=score;
  $('#goSub').textContent=sub||'Nice run';
  const bestEl=$('#goBest');
  if(score>=best && score>0){
    bestEl.textContent= score>best? `🎉 NEW BEST! Previous ${best}` : `★ Tied best: ${best}`;
    bestEl.classList.add('show');
  } else {
    if(best>0){ bestEl.textContent=`Best ${best} — keep grinding`; bestEl.classList.add('show'); }
    else bestEl.classList.remove('show');
  }
  $('#gameover').classList.add('show');
  if(navigator.vibrate) navigator.vibrate(40);
}
