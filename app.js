/* IDK.S ARCADE - app.js */
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>[...r.querySelectorAll(s)];

// storage helpers
const STORE_KEY = 'idk_arcade_v2';
function loadStore(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || {scores:{snake:[],blaster:[],stack:[]}, plays:{snake:0,blaster:0,stack:0}, total:0, muted:false } }catch{ return {scores:{snake:[],blaster:[],stack:[]}, plays:{snake:0,blaster:0,stack:0}, total:0, muted:false } }
}
let store = loadStore();
function saveStore(){ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
function addScore(game, score){
  store.plays[game]=(store.plays[game]||0)+1;
  store.total=(store.total||0)+1;
  const entry = {score, date: new Date().toISOString().slice(0,10), ts: Date.now()};
  store.scores[game].push(entry);
  store.scores[game].sort((a,b)=>b.score-a.score);
  store.scores[game]=store.scores[game].slice(0,5);
  saveStore(); updateHUD();
}
function getBest(game){ return (store.scores[game][0]?.score)||0; }
function updateHUD(){
  ['snake','blaster','stack'].forEach(g=>{
    const b=getBest(g); const el=$('#hs-'+g); if(el) el.textContent=b;
    const p=store.plays[g]||0; const pe=$('#plays-'+g); if(pe) pe.textContent=p;
  });
  $('#totalPlays').textContent = (store.total + 1284).toLocaleString(); // fake offset to feel alive
  renderLeaderboards();
}
function renderLeaderboards(){
  ['snake','blaster','stack'].forEach(g=>{
    const ol=$('#lb-'+g); if(!ol) return;
    const list=store.scores[g];
    if(!list.length){ ol.innerHTML='<li class="empty">No scores yet — go play!</li>'; return; }
    ol.innerHTML = list.map((e,i)=>`<li class="${i===0?'top1':i===1?'top2':''}"><span>#${i+1} — ${e.score.toLocaleString()} pts</span><span style="opacity:.6">${e.date}</span></li>`).join('');
  });
}
updateHUD();

// sound toggle
let muted = store.muted || false;
function setMuted(v){ muted=v; store.muted=v; saveStore(); updateMuteUI(); }
function updateMuteUI(){
  $('#soundToggle')?.classList.toggle('active', !muted);
  $('#soundToggle').textContent = muted ? '🔇' : '♪';
  $('#modalMute').textContent = muted ? '🔇' : '♪';
  $('#modalMute')?.classList.toggle('active', !muted);
}
updateMuteUI();
$('#soundToggle')?.addEventListener('click',()=>{ setMuted(!muted); toast(muted?'Sound off':'Sound on'); });
$('#modalMute')?.addEventListener('click',()=>{ setMuted(!muted); toast(muted?'Sound off':'Sound on'); });
$('#clearScores')?.addEventListener('click',()=>{
  if(confirm('Clear all local high scores?')){ store.scores={snake:[],blaster:[],stack:[]}; store.plays={snake:0,blaster:0,stack:0}; store.total=0; saveStore(); updateHUD(); toast('Scores cleared'); }
});

// cursor glow
const glow = $('#cursorGlow');
let mx=innerWidth/2, my=innerHeight/2;
addEventListener('mousemove',e=>{ mx=e.clientX; my=e.clientY; if(glow) glow.style.transform=`translate(${mx-250}px, ${my-250}px)`; }, {passive:true});

// mobile menu
$('#hamburger')?.addEventListener('click',()=>$('#mobileMenu').classList.toggle('open'));
$$('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>$('#mobileMenu').classList.remove('open')));

// filter
$$('.chip').forEach(c=>c.addEventListener('click',()=>{
  $$('.chip').forEach(x=>x.classList.remove('active')); c.classList.add('active');
  const f=c.dataset.filter;
  $$('.game-card').forEach(card=>{
    if(f==='all') card.style.display='';
    else card.style.display = card.dataset.tags.includes(f) ? '' : 'none';
  });
}));

// toast
let toastTimer;
function toast(msg){
  const t=$('#toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'), 2200);
}

// audio engine (simple)
let audioCtx;
function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }
function beep(freq=440, dur=0.08, type='square', vol=0.12, slide=0){
  if(muted) return;
  ensureAudio();
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=type; o.frequency.value=freq;
  if(slide){ o.frequency.linearRampToValueAtTime(freq+slide, audioCtx.currentTime+dur); }
  g.gain.value=vol;
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime+dur);
}
const SFX={
  eat(){ beep(880,0.08,'square',0.14); setTimeout(()=>beep(1200,0.08,'square',0.10),70); },
  die(){ beep(200,0.3,'sawtooth',0.18,-60); beep(120,0.4,'square',0.12); },
  shoot(){ beep(900,0.07,'square',0.08, 400); },
  hit(){ beep(160,0.12,'square',0.15); },
  explode(){ beep(80,0.35,'sawtooth',0.2, -20); },
  stack(){ beep(600,0.08,'square',0.12, 200); },
  perfect(){ beep(1200,0.12,'square',0.15); setTimeout(()=>beep(1600,0.15,'square',0.12),90); },
  fail(){ beep(180,0.25,'square',0.12); },
};

// random play
$('#randomPlay')?.addEventListener('click',()=>{
  const games=['snake','blaster','stack']; openGame(games[Math.floor(Math.random()*games.length)]);
});

// modal logic
let currentGame=null;
const modal=$('#modal');
function openGame(name){
  currentGame=name;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  $$('.game-view').forEach(v=>v.classList.remove('active'));
  $('#view-'+name)?.classList.add('active');
  const titles={snake:'NEON SERPENT', blaster:'VOID BLASTERS', stack:'STACK FRACTURE'};
  $('#modalGameName').textContent=titles[name];
  $('#modalBest').textContent='BEST '+ getBest(name);
  $('#modalScore').textContent='SCORE 0';
  $('#pauseOverlay').classList.remove('show');
  $('#gameover').classList.remove('show');
  $$('.overlay').forEach(o=>o.classList.remove('hidden'));
  // reset game state but not auto start
  if(name==='snake') snake.reset();
  if(name==='blaster') blaster.reset();
  if(name==='stack') stack.reset();
  // pause other loops
  requestAnimationFrame(()=>{}); // ensure canvas visible
  toast('Press START — good luck');
}
function closeModal(){
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  // pause all loops
  snake.pause(true); blaster.pause(true); stack.pause(true);
  currentGame=null;
}
$('#modalBackdrop')?.addEventListener('click', closeModal);
$('#modalClose')?.addEventListener('click', closeModal);
$('#goMenu')?.addEventListener('click', closeModal);
$('#modalPause')?.addEventListener('click',()=>{
  if(currentGame==='snake') snake.togglePause();
  if(currentGame==='blaster') blaster.togglePause();
  if(currentGame==='stack') stack.togglePause();
});
$('#resumeBtn')?.addEventListener('click',()=>{
  if(currentGame==='snake') snake.togglePause();
  if(currentGame==='blaster') blaster.togglePause();
  if(currentGame==='stack') stack.togglePause();
});
$('#modalRestart')?.addEventListener('click',()=>{
  if(currentGame) startCurrent();
});
$('#goRestart')?.addEventListener('click',()=> startCurrent());

function startCurrent(){
  $('#gameover').classList.remove('show');
  $('#pauseOverlay').classList.remove('show');
  const ov=$('#overlay-'+currentGame);
  if(ov) ov.classList.add('hidden');
  if(currentGame==='snake') snake.start();
  if(currentGame==='blaster') blaster.start();
  if(currentGame==='stack') stack.start();
  ensureAudio();
}

// bind play buttons
$$('[data-play]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.play)));
$$('[data-start]').forEach(b=>b.addEventListener('click',()=>startCurrent()));

// keyboard global
addEventListener('keydown',e=>{
  if(e.key==='Escape' && modal.classList.contains('open')) closeModal();
  if((e.key==='r' || e.key==='R') && modal.classList.contains('open')){
    e.preventDefault(); startCurrent();
  }
  if((e.key==='m' || e.key==='M')) setMuted(!muted);
  if(e.key===' ' && modal.classList.contains('open') && currentGame){
    // don't scroll
    if(e.target.tagName!=='BUTTON') e.preventDefault();
    // if overlay visible, start
    const ov=$('#overlay-'+currentGame);
    if(ov && !ov.classList.contains('hidden')){ startCurrent(); return; }
    // otherwise toggle pause for active game
    if($('#gameover').classList.contains('show')) return;
    if(currentGame==='snake') snake.togglePause();
    if(currentGame==='blaster') blaster.togglePause();
    if(currentGame==='stack') stack.togglePause();
  }
});

// konami
let konamiPos=0;
const konami=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
addEventListener('keydown',e=>{
  if(e.key===konami[konamiPos]) konamiPos++; else konamiPos=0;
  if(konamiPos===konami.length){
    konamiPos=0;
    document.body.style.filter='hue-rotate(180deg)';
    toast('KONAMI MODE: HUE SHIFTED 🌈');
    setTimeout(()=>document.body.style.filter='',5000);
    // reward
    ['snake','blaster','stack'].forEach(g=>{ if(getBest(g)===0) addScore(g, 999); });
  }
});
$('#konamiHint')?.addEventListener('click',e=>{ e.preventDefault(); toast('↑ ↑ ↓ ↓ ← → ← → B A'); });

// hero mini canvas demo (floating particles)
(function heroDemo(){
  const c=$('#heroCanvas'); if(!c) return;
  const ctx=c.getContext('2d');
  let t=0;
  function frame(){
    t+=0.02;
    ctx.clearRect(0,0,c.width,c.height);
    // grid
    ctx.strokeStyle='rgba(255,255,255,.06)';
    ctx.lineWidth=1;
    for(let x=0;x<c.width;x+=28){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,c.height); ctx.stroke(); }
    for(let y=0;y<c.height;y+=28){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y); ctx.stroke(); }
    // floating dots snake-like
    const cx=c.width/2, cy=c.height/2;
    for(let i=0;i<5;i++){
      const a = t + i*0.6;
      const x = cx + Math.cos(a)* (70 + i*14) *0.8;
      const y = cy + Math.sin(a*1.3)* 40 + i*6;
      ctx.fillStyle = i===0? '#fff' : i===1? '#00FFF0' : i===4? '#FF006B' : 'rgba(255,255,255,.6)';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x,y, i===0?6:4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    }
    // food
    const fx = cx + Math.cos(t*0.7)* 90;
    const fy = cy + Math.sin(t*0.9)* 60;
    ctx.fillStyle='#FF006B'; ctx.shadowColor='#FF006B'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(fx,fy,7,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    // score text
    $('#heroScore').textContent = 'SCORE ' + String(Math.floor( (Math.sin(t)+1)*400 )).padStart(2,'0');
    requestAnimationFrame(frame);
  }
  frame();
})();

// ============ GAME: SNAKE ============
const snake = (()=> {
  const canvas=$('#canvas-snake');
  const ctx=canvas.getContext('2d');
  const N=20; // grid 20x20
  const SZ=24; // cell 24px => 480
  let snakeArr, dir, nextDir, food, score, speed, tick, raf, running, paused, dead, particles;
  function rndFood(){
    let p;
    do{ p={x:Math.floor(Math.random()*N), y:Math.floor(Math.random()*N)} } while(snakeArr.some(s=>s.x===p.x && s.y===p.y));
    return p;
  }
  function reset(){
    snakeArr=[{x:9,y:10},{x:8,y:10},{x:7,y:10}];
    dir={x:1,y:0}; nextDir={x:1,y:0};
    food=rndFood(); score=0; speed=110; tick=0; running=false; paused=false; dead=false; particles=[];
    cancelAnimationFrame(raf);
    draw();
    updateScore();
  }
  function start(){
    if(running) return;
    running=true; paused=false; dead=false;
    lastTime=performance.now(); acc=0;
    loop();
  }
  function updateScore(){ $('#modalScore').textContent='SCORE '+ score; $('#modalBest').textContent='BEST '+ getBest('snake'); }
  let lastTime=0, acc=0;
  function loop(now=performance.now()){
    if(!running || paused) return;
    raf=requestAnimationFrame(loop);
    const dt = now - lastTime; lastTime=now;
    acc += dt;
    if(acc >= speed){
      acc=0;
      step();
    }
    draw();
  }
  function step(){
    dir = {...nextDir};
    const head={x:snakeArr[0].x + dir.x, y:snakeArr[0].y + dir.y};
    // wrap
    if(head.x<0) head.x=N-1; if(head.x>=N) head.x=0;
    if(head.y<0) head.y=N-1; if(head.y>=N) head.y=0;
    // self collision
    if(snakeArr.some(s=>s.x===head.x && s.y===head.y)){
      gameOver();
      return;
    }
    snakeArr.unshift(head);
    if(head.x===food.x && head.y===food.y){
      score += 10 + Math.floor(snakeArr.length/5);
      SFX.eat();
      // particles
      for(let i=0;i<10;i++) particles.push({x:food.x*SZ+SZ/2, y:food.y*SZ+SZ/2, vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6, life:12, col: Math.random()>.5? '#00FFF0':'#FF006B'});
      food=rndFood();
      if(score%30===0 && speed>55) speed-=6;
      updateScore();
    } else {
      snakeArr.pop();
    }
  }
  function gameOver(){
    running=false; dead=true;
    SFX.die();
    addScore('snake', score);
    showGameOver(score, `Length ${snakeArr.length}`, getBest('snake'));
    draw();
  }
  function draw(){
    // bg
    ctx.fillStyle='#020208'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // grid
    ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1;
    for(let i=0;i<=N;i++){ ctx.beginPath(); ctx.moveTo(i*SZ,0); ctx.lineTo(i*SZ,N*SZ); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i*SZ); ctx.lineTo(N*SZ,i*SZ); ctx.stroke();}
    // food
    ctx.fillStyle='#FF006B'; ctx.shadowColor='#FF006B'; ctx.shadowBlur=16;
    const fx=food.x*SZ, fy=food.y*SZ;
    ctx.beginPath(); ctx.roundRect(fx+4, fy+4, SZ-8, SZ-8, 6); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(fx+SZ/2-3, fy+SZ/2-3, 3, 0, Math.PI*2); ctx.fill();
    // snake
    snakeArr.forEach((s,i)=>{
      const x=s.x*SZ, y=s.y*SZ;
      if(i===0){
        ctx.fillStyle='#ffffff'; ctx.shadowColor='rgba(255,255,255,.6)'; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.roundRect(x+1, y+1, SZ-2, SZ-2, 7); ctx.fill(); ctx.shadowBlur=0;
        // eyes
        ctx.fillStyle='#000';
        const eyeOff = dir.x!==0 ? 0 : 0;
        ctx.beginPath(); ctx.arc(x+8, y+9, 2.2,0,Math.PI*2); ctx.arc(x+16, y+9, 2.2,0,Math.PI*2); ctx.fill();
        // tongue
        if(tick%20<10){
          ctx.fillStyle='#FF006B'; ctx.fillRect(x+SZ/2-1, y+SZ-2, 2,4);
        }
      } else {
        const t=i/snakeArr.length;
        const hue = 180 + t*60; // cyan to purple
        ctx.fillStyle=`hsl(${hue} 100% 55%)`;
        ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.roundRect(x+3, y+3, SZ-6, SZ-6, 6); ctx.fill(); ctx.shadowBlur=0;
      }
    });
    // particles
    particles.forEach(p=>{
      ctx.globalAlpha = p.life/12;
      ctx.fillStyle=p.col;
      ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; p.life--;
    });
    particles=particles.filter(p=>p.life>0);
    ctx.globalAlpha=1;
    // vignette
    const g=ctx.createRadialGradient(canvas.width/2, canvas.height/2, 200, canvas.width/2, canvas.height/2, 400);
    g.addColorStop(0,'transparent'); g.addColorStop(1,'rgba(0,0,0,.4)');
    ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);
    tick++;
  }
  function setDir(nx,ny){
    if(!running || paused) return;
    // prevent reverse
    if(nx===-dir.x && ny===-dir.y) return;
    nextDir={x:nx,y:ny};
  }
  function togglePause(){
    if(dead || !running) return;
    paused=!paused;
    $('#pauseOverlay').classList.toggle('show', paused);
    $('#modalPause').textContent = paused? '▶' : '⏸';
    if(!paused){ lastTime=performance.now(); loop(); }
  }
  function pause(v){ paused=v; }

  // controls
  addEventListener('keydown',e=>{
    if(currentGame!=='snake') return;
    if(e.key==='ArrowUp' || e.key==='w' || e.key==='W') setDir(0,-1);
    if(e.key==='ArrowDown' || e.key==='s' || e.key==='S') setDir(0,1);
    if(e.key==='ArrowLeft' || e.key==='a' || e.key==='A') setDir(-1,0);
    if(e.key==='ArrowRight' || e.key==='d' || e.key==='D') setDir(1,0);
  });
  // touch dpad
  $$('.dpad button').forEach(b=>b.addEventListener('click',()=>{
    const d=b.dataset.dir;
    if(d==='up') setDir(0,-1);
    if(d==='down') setDir(0,1);
    if(d==='left') setDir(-1,0);
    if(d==='right') setDir(1,0);
  }));
  // swipe
  let sx=0,sy=0;
  canvas.addEventListener('touchstart',e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{passive:true});
  canvas.addEventListener('touchend',e=>{
    if(!sx) return;
    const dx=e.changedTouches[0].clientX - sx;
    const dy=e.changedTouches[0].clientY - sy;
    if(Math.max(Math.abs(dx),Math.abs(dy))<18) return;
    if(Math.abs(dx)>Math.abs(dy)) setDir(dx>0?1:-1,0);
    else setDir(0, dy>0?1:-1);
    sx=0;
  },{passive:true});

  // click to change dir? nah
  reset();
  return {reset,start,togglePause,pause};
})();

// ============ GAME: BLASTER ============
const blaster = (()=> {
  const canvas=$('#canvas-blaster');
  const ctx=canvas.getContext('2d');
  const W=480, H=640;
  let player, bullets, enemies, particles, stars, score, lives, level, killCount, running, paused, raf, lastTime, spawnAcc, shootHeld, shootAcc, shake;

  function reset(){
    player={x:W/2, y:H-56, w:32,h:24, vx:0, speed: 6.5};
    bullets=[]; enemies=[]; particles=[]; stars=[...Array(40)].map(()=>({x:Math.random()*W, y:Math.random()*H, s:Math.random()*1.5+0.5, sp:Math.random()*2+0.6}));
    score=0; lives=3; level=1; killCount=0; running=false; paused=false; spawnAcc=0; shootAcc=0; shootHeld=false; shake=0;
    cancelAnimationFrame(raf);
    draw();
    updateHUDBlaster();
  }
  function updateHUDBlaster(){
    $('#modalScore').textContent='SCORE '+score;
    $('#modalBest').textContent='BEST '+ getBest('blaster');
    $('#modalHint').textContent = `LIVES ${'♥'.repeat(lives)}  •  LVL ${level}  •  KILLS ${killCount}`;
  }
  function start(){
    if(running) return;
    running=true; paused=false;
    lastTime=performance.now();
    loop(lastTime);
  }
  function loop(now){
    if(!running || paused) return;
    raf=requestAnimationFrame(loop);
    const dt = Math.min(32, now - lastTime); lastTime=now;
    update(dt);
    draw();
  }
  function update(dt){
    // stars
    stars.forEach(s=>{ s.y+=s.sp * (dt/16); if(s.y>H) {s.y=-4; s.x=Math.random()*W;} });
    // player movement
    if(keys.ArrowLeft || keys.a || keys.A) player.x -= player.speed * (dt/16);
    if(keys.ArrowRight || keys.d || keys.D) player.x += player.speed * (dt/16);
    player.x=Math.max(14, Math.min(W-14, player.x));
    // auto shoot when held
    if(shootHeld || keys[' '] || keys.Spacebar){
      shootAcc+=dt;
      if(shootAcc> 130){
        shootAcc=0;
        shoot();
      }
    }
    // spawn enemies
    spawnAcc+=dt;
    const interval = Math.max(280, 880 - level*70 - killCount*4);
    if(spawnAcc>interval){
      spawnAcc=0;
      spawnEnemy();
    }
    // bullets
    bullets.forEach(b=> b.y -= b.vy * (dt/16));
    bullets=bullets.filter(b=>b.y>-10);
    // enemies
    enemies.forEach(e=>{
      e.y += e.vy * (dt/16);
      e.x += Math.sin(e.y*0.02 + e.phase)* e.swing * (dt/16);
    });
    // collisions bullet vs enemy
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      for(let j=bullets.length-1;j>=0;j--){
        const b=bullets[j];
        if(Math.abs(e.x-b.x)< (e.w/2+3) && Math.abs(e.y-b.y)< (e.h/2+6)){
          // hit
          bullets.splice(j,1);
          e.hp--;
          SFX.hit();
          // particle hit
          for(let k=0;k<4;k++) particles.push({x:b.x,y:b.y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:14,col:'#00FFF0'});
          if(e.hp<=0){
            enemies.splice(i,1);
            score += e.score;
            killCount++;
            if(killCount%20===0){ level++; SFX.perfect(); shake=10; }
            else SFX.explode();
            // explosion
            for(let k=0;k<12;k++) particles.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:18,col: Math.random()>.5?'#FF006B':'#FACC15'});
            updateHUDBlaster();
            // chance power? ignore
          }
          break;
        }
      }
    }
    // enemies vs player
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      if(e.y>H+40) { enemies.splice(i,1); // leak costs life? only if not killed
        // if escaped, no penalty but show
        continue;
      }
      if(Math.abs(e.x-player.x)< (e.w/2+ player.w/2 -6) && Math.abs(e.y-player.y)< (e.h/2+ player.h/2 -4)){
        enemies.splice(i,1);
        lives--;
        shake=12;
        SFX.die();
        for(let k=0;k<16;k++) particles.push({x:player.x,y:player.y,vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8,life:20,col:'#00FFF0'});
        updateHUDBlaster();
        if(lives<=0){ gameOver(); return; }
      }
    }
    // particles
    particles.forEach(p=>{ p.x+=p.vx*(dt/16); p.y+=p.vy*(dt/16); p.vy+=0.18*(dt/16); p.life--; });
    particles=particles.filter(p=>p.life>0);
    if(shake>0) shake-= dt*0.05;
  }
  function spawnEnemy(){
    const isBoss = killCount>0 && killCount%20===19; // next is boss? spawn stronger
    const x = 30 + Math.random()*(W-60);
    const type = Math.random();
    if(isBoss){
      enemies.push({x:W/2,y:-40,w:56,h:36, vy:0.9, swing:0.6, phase:Math.random()*Math.PI, hp:8, score:150, boss:true});
    } else if(type<0.6){
      enemies.push({x,y:-20,w:28,h:22, vy:1.8 + Math.random()*0.9 + level*0.18, swing:0.4, phase:Math.random()*6, hp:1, score:10});
    } else if(type<0.85){
      enemies.push({x,y:-20,w:34,h:24, vy:1.4 + Math.random()*0.6 + level*0.12, swing:0.9, phase:Math.random()*6, hp:2, score:25});
    } else {
      enemies.push({x,y:-20,w:22,h:18, vy:2.6 + Math.random()*0.8 + level*0.2, swing:0.2, phase:Math.random()*6, hp:1, score:15});
    }
  }
  function shoot(){
    SFX.shoot();
    bullets.push({x:player.x-6, y:player.y-12, vy:9});
    bullets.push({x:player.x+6, y:player.y-12, vy:9});
    // muzzle flash
    particles.push({x:player.x-6,y:player.y-12,vx:0,vy:-2,life:6,col:'#00FFF0'});
    particles.push({x:player.x+6,y:player.y-12,vx:0,vy:-2,life:6,col:'#00FFF0'});
  }
  function draw(){
    ctx.save();
    if(shake>0){ ctx.translate( (Math.random()-0.5)*shake, (Math.random()-0.5)*shake ); }
    // bg
    ctx.fillStyle='#050510'; ctx.fillRect(0,0,W,H);
    // stars
    ctx.fillStyle='rgba(255,255,255,.9)';
    stars.forEach(s=>{
      ctx.globalAlpha = 0.6 + Math.sin(s.y*0.02)*0.4;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha=1;
    // grid horizon
    ctx.strokeStyle='rgba(0,255,240,.06)'; ctx.lineWidth=1;
    for(let y=H-180; y<H; y+=18){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    // player
    ctx.shadowColor='#00FFF0'; ctx.shadowBlur=14;
    ctx.fillStyle='#00FFF0';
    // ship shape
    ctx.beginPath();
    ctx.moveTo(player.x, player.y-14);
    ctx.lineTo(player.x-14, player.y+12);
    ctx.lineTo(player.x-6, player.y+6);
    ctx.lineTo(player.x+6, player.y+6);
    ctx.lineTo(player.x+14, player.y+12);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(player.x, player.y+2, 3,0,Math.PI*2); ctx.fill();
    // engine flame
    const flame = 6 + Math.sin(performance.now()*0.02)*2;
    ctx.fillStyle='#FACC15'; ctx.beginPath(); ctx.moveTo(player.x-5, player.y+8); ctx.lineTo(player.x, player.y+8+flame); ctx.lineTo(player.x+5, player.y+8); ctx.fill();
    ctx.fillStyle='#FF006B'; ctx.beginPath(); ctx.moveTo(player.x-3, player.y+8); ctx.lineTo(player.x, player.y+8+flame*0.6); ctx.lineTo(player.x+3, player.y+8); ctx.fill();

    // bullets
    ctx.fillStyle='#00FFF0'; ctx.shadowColor='#00FFF0'; ctx.shadowBlur=8;
    bullets.forEach(b=>{
      ctx.fillRect(b.x-1.5, b.y-8, 3, 10);
    });
    ctx.shadowBlur=0;
    // enemies
    enemies.forEach(e=>{
      if(e.boss){
        ctx.fillStyle='#FF006B'; ctx.shadowColor='#FF006B'; ctx.shadowBlur=16;
        // boss shape
        ctx.beginPath();
        ctx.moveTo(e.x, e.y+18);
        ctx.lineTo(e.x-26, e.y-14);
        ctx.lineTo(e.x-14, e.y-16);
        ctx.lineTo(e.x, e.y-6);
        ctx.lineTo(e.x+14, e.y-16);
        ctx.lineTo(e.x+26, e.y-14);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur=0;
        ctx.fillStyle='#fff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('BOSS', e.x, e.y-20);
        // hp bar
        ctx.fillStyle='rgba(255,255,255,.15)'; ctx.fillRect(e.x-22, e.y-26, 44,4);
        ctx.fillStyle='#FACC15'; ctx.fillRect(e.x-22, e.y-26, 44*(e.hp/8),4);
      } else {
        const col = e.hp>1 ? '#FACC15' : '#FF006B';
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=10;
        ctx.beginPath();
        if(e.w>30){ // medium
          ctx.moveTo(e.x, e.y+10);
          ctx.lineTo(e.x-14, e.y-8);
          ctx.lineTo(e.x-6, e.y-10);
          ctx.lineTo(e.x+6, e.y-10);
          ctx.lineTo(e.x+14, e.y-8);
          ctx.closePath();
        } else {
          ctx.moveTo(e.x, e.y+8);
          ctx.lineTo(e.x-10, e.y-8);
          ctx.lineTo(e.x+10, e.y-8);
          ctx.closePath();
        }
        ctx.fill(); ctx.shadowBlur=0;
        if(e.hp>1){
          ctx.fillStyle='#fff'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(String(e.hp), e.x, e.y+2);
        }
      }
    });
    // particles
    particles.forEach(p=>{
      ctx.globalAlpha = p.life/20;
      ctx.fillStyle=p.col;
      ctx.beginPath(); ctx.arc(p.x,p.y, 2.5,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;
    // vignette
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgba(0,0,0,.35)'); g.addColorStop(0.3,'transparent'); g.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.restore();
    // HUD bar (lives dots already in modal hint, but also draw)
  }
  function gameOver(){
    running=false;
    SFX.die();
    addScore('blaster', score);
    showGameOver(score, `${killCount} kills • LVL ${level}`, getBest('blaster'));
  }
  // input handling
  const keys={};
  addEventListener('keydown',e=>{
    if(currentGame!=='blaster') return;
    keys[e.key]=true;
    if(e.key===' ' || e.code==='Space'){ e.preventDefault(); shootHeld=true; }
  });
  addEventListener('keyup',e=>{
    keys[e.key]=false;
    if(e.key===' ' || e.code==='Space') shootHeld=false;
  });
  // mouse / touch drag
  let dragging=false;
  function setPlayerFromClient(clientX){
    const rect=canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const x = (clientX - rect.left) * scaleX;
    player.x = Math.max(14, Math.min(W-14, x));
  }
  canvas.addEventListener('pointerdown',e=>{
    if(currentGame!=='blaster' || !running || paused) return;
    dragging=true; shootHeld=true; setPlayerFromClient(e.clientX); canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging) return;
    setPlayerFromClient(e.clientX);
  });
  canvas.addEventListener('pointerup',e=>{
    dragging=false; shootHeld=false;
  });
  canvas.addEventListener('pointerleave',()=>{ dragging=false; shootHeld=false; });
  // also click shoot when not dragging? handled via pointerdown

  function togglePause(){
    if(!running) return;
    paused=!paused;
    $('#pauseOverlay').classList.toggle('show', paused);
    $('#modalPause').textContent = paused? '▶':'⏸';
    if(!paused){ lastTime=performance.now(); loop(lastTime); }
  }
  function pause(v){ paused=v; }

  reset();
  return {reset,start,togglePause,pause};
})();

// ============ GAME: STACK ============
const stack = (()=> {
  const canvas=$('#canvas-stack');
  const ctx=canvas.getContext('2d');
  const W=480, H=640;
  const BLOCK_H=22;
  let blocks, current, dir, speed, score, perfectStreak, running, paused, raf, lastTime, offset, shake, particles, gameOverFlag;

  function reset(){
    blocks=[{x: (W-120)/2, y: H- BLOCK_H*1.2, w:120, color: hsl(190,100,55)}];
    // current moving block starts on top
    current={x:0, y: H - BLOCK_H*1.2 - BLOCK_H, w:120, color: hsl(210,100,60)};
    dir=1; speed=2.8; score=0; perfectStreak=0; shake=0; particles=[]; offset=0; gameOverFlag=false;
    cancelAnimationFrame(raf);
    running=false; paused=false;
    draw();
    updateScoreStack();
  }
  function hsl(h,s,l){ return `hsl(${h} ${s}% ${l}%)`; }
  function hslFor(idx){ return `hsl(${(190 + idx*14)%360} 100% ${58 - (idx%3)*4}%)`; }
  function updateScoreStack(){
    $('#modalScore').textContent='SCORE '+score;
    $('#modalBest').textContent='BEST '+ getBest('stack');
    $('#modalHint').textContent = perfectStreak>=3 ? `🔥 ${perfectStreak} PERFECTS!` : `STACK ${blocks.length} HIGH`;
  }
  function start(){
    if(running) return;
    running=true; paused=false; gameOverFlag=false;
    lastTime=performance.now();
    loop(lastTime);
  }
  function loop(now){
    if(!running || paused || gameOverFlag) return;
    raf=requestAnimationFrame(loop);
    const dt = Math.min(32, now-lastTime); lastTime=now;
    update(dt);
    draw();
  }
  function update(dt){
    if(gameOverFlag) return;
    current.x += dir * speed * (dt/16);
    if(current.x <=0){ current.x=0; dir=1; }
    if(current.x + current.w >= W){ current.x=W-current.w; dir=-1; }
    // particles
    particles.forEach(p=>{ p.x+=p.vx*(dt/16); p.y+=p.vy*(dt/16); p.vy+=0.25*(dt/16); p.life--; });
    particles=particles.filter(p=>p.life>0);
    if(shake>0) shake -= dt*0.06;
  }
  function drop(){
    if(!running || paused || gameOverFlag) return;
    const prev = blocks[blocks.length-1];
    const overlapLeft = Math.max(prev.x, current.x);
    const overlapRight = Math.min(prev.x+prev.w, current.x+current.w);
    const overlap = overlapRight - overlapLeft;
    if(overlap <=0){
      // miss
      // falling block animation
      SFX.fail();
      shake=14;
      // create falling pieces
      const leftW = current.x < prev.x ? current.x+current.w - prev.x : 0; // not needed
      // simple game over
      gameOver();
      // add particle of missed block
      for(let i=0;i<12;i++) particles.push({x:current.x+current.w/2, y:current.y+10, vx:(Math.random()-0.5)*6, vy:Math.random()*-4 -1, life:22, col: current.color});
      return;
    }
    // check perfect (within 4px)
    const isPerfect = Math.abs(prev.x - current.x) < 4 && Math.abs(prev.w - current.w) < 4;
    if(isPerfect){
      perfectStreak++;
      SFX.perfect();
      if(perfectStreak>=8){
        // rainbow fever bonus
        score += 50;
        shake=8;
      } else {
        score += 10 + perfectStreak*2;
      }
      // snap to prev
      current.x = prev.x;
      current.w = prev.w;
    } else {
      perfectStreak=0;
      SFX.stack();
      score += 5;
      // cut
      if(overlap < current.w){
        // create debris for cut part
        const cutX = current.x < prev.x ? current.x : overlapRight;
        const cutW = current.w - overlap;
        for(let i=0;i<8;i++) particles.push({x:cutX+cutW/2, y:current.y+10, vx:(Math.random()-0.5)*5, vy:Math.random()*-2, life:18, col: current.color});
        current.x = overlapLeft;
        current.w = overlap;
      }
    }
    // place block
    const placed = {x: current.x, y: current.y, w: current.w, color: current.color};
    blocks.push(placed);

    // next block
    const nextColor = hslFor(blocks.length);
    current = {x:0, y: current.y - BLOCK_H, w: placed.w, color: nextColor};
    dir = Math.random()>.5?1:-1;
    if(blocks.length%3===0 && speed<6.5) speed+=0.18;

    // camera offset if high
    const topY = current.y;
    if(topY < 120){
      const shift = 120 - topY;
      offset += shift;
      blocks.forEach(b=> b.y += shift);
      current.y += shift;
      particles.forEach(p=> p.y += shift);
    }

    score = blocks.length -1 + (perfectStreak*2);
    // actually compute score as blocks + bonus? keep simple
    // let's keep score as blocks length with perfect bonus already added? Simplify:
    // Score display = blocks.length-1 + bonus accumulated? we already did +=
    // To avoid confusion, set score = max(score, blocks.length-1)
    // but we want increasing: use blocks.length as base + perfect bonus
    // For leaderboard, use blocks length.
    updateScoreStack();
    // win condition? endless

    // check if block too small to continue ( <12 )
    if(current.w < 12){
      // still playable but hard
    }
  }
  function draw(){
    ctx.save();
    if(shake>0) ctx.translate( (Math.random()-0.5)*shake, (Math.random()-0.5)*shake );
    ctx.fillStyle='#080810'; ctx.fillRect(0,0,W,H);
    // sky gradient
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0a0f1e'); g.addColorStop(0.5,'#0f1428'); g.addColorStop(1,'#080810');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // grid
    ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1;
    for(let x=0;x<W;x+=24){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0;y<H;y+=24){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    // horizon glow
    ctx.fillStyle='rgba(250,204,21,.06)'; ctx.fillRect(0, H-80, W, 80);
    // draw blocks
    blocks.forEach((b,i)=>{
      // shadow
      ctx.fillStyle='rgba(0,0,0,.35)';
      ctx.fillRect(b.x+4, b.y+ BLOCK_H-2, b.w-8, 6);
      // block
      ctx.fillStyle=b.color;
      ctx.shadowColor=b.color; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, BLOCK_H, 6); ctx.fill(); ctx.shadowBlur=0;
      // highlight
      ctx.fillStyle='rgba(255,255,255,.22)'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, 6, [6,6,0,0]); ctx.fill();
      // if perfect streak and top block, pulsate
      if(i===blocks.length-1 && perfectStreak>=3){
        ctx.strokeStyle='rgba(255,255,255,.6)'; ctx.lineWidth=1.5; ctx.strokeRect(b.x+1, b.y+1, b.w-2, BLOCK_H-2);
      }
    });
    // current moving block
    if(!gameOverFlag){
      ctx.fillStyle=current.color;
      ctx.shadowColor=current.color; ctx.shadowBlur=14;
      // guide line (ghost) where it would land
      ctx.globalAlpha=0.14;
      ctx.fillRect(current.x, blocks[blocks.length-1].y - BLOCK_H, current.w, BLOCK_H);
      ctx.globalAlpha=1;
      ctx.beginPath(); ctx.roundRect(current.x, current.y, current.w, BLOCK_H, 6); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='rgba(255,255,255,.22)'; ctx.beginPath(); ctx.roundRect(current.x, current.y, current.w, 6, [6,6,0,0]); ctx.fill();
      // side indicators
      ctx.fillStyle='rgba(255,255,255,.08)';
      ctx.fillRect(0, current.y+8, 6, 6);
      ctx.fillRect(W-6, current.y+8, 6,6);
    }
    // particles
    particles.forEach(p=>{
      ctx.globalAlpha = p.life/22;
      ctx.fillStyle=p.col;
      ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;
    // vignette
    const vg=ctx.createLinearGradient(0,0,0,H);
    vg.addColorStop(0,'rgba(0,0,0,.25)'); vg.addColorStop(0.5,'transparent'); vg.addColorStop(1,'rgba(0,0,0,.4)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    // score on canvas small
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='800 18px JetBrains Mono'; ctx.textAlign='left';
    ctx.fillText(String(score).padStart(2,'0'), 14, 26);
    ctx.font='600 10px JetBrains Mono'; ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillText('STACK',14,38);
    ctx.restore();
  }
  function gameOver(){
    gameOverFlag=true; running=false;
    const finalScore = blocks.length -1;
    addScore('stack', finalScore);
    showGameOver(finalScore, perfectStreak>=3? `🔥 ${perfectStreak} perfects!` : `${blocks.length} blocks high`, getBest('stack'));
  }

  function togglePause(){
    if(gameOverFlag || !running) return;
    paused=!paused;
    $('#pauseOverlay').classList.toggle('show', paused);
    $('#modalPause').textContent = paused?'▶':'⏸';
    if(!paused){ lastTime=performance.now(); loop(lastTime); }
  }
  function pause(v){ paused=v; }

  // input: canvas click / space drops
  canvas.addEventListener('pointerdown',e=>{
    if(currentGame!=='stack') return;
    if(!running || paused) return;
    e.preventDefault();
    drop();
  });
  // also space handled globally, but also need key for stack
  addEventListener('keydown',e=>{
    if(currentGame!=='stack') return;
    if(e.code==='Space' || e.key===' '){
      // handled globally via drop? we duplicate to ensure
      // prevent double fire - global will call togglePause if overlay, else drop? Let's make global not auto drop for stack, so we handle here only when running
      // But global space currently toggles pause for stack too. We need to override: if stack running and not paused, space should drop, not pause.
      // The global handler checks overlay and toggles pause; for stack we intercept before.
      // So we prevent global pause when we drop.
      if(running && !paused && !gameOverFlag && !$('#overlay-stack').classList.contains('hidden')){
        // overlay hidden check not needed
      }
    }
  });
  // we override global space for stack: hijack
  const origSpaceHandler = (e)=>{
    if(currentGame==='stack' && running && !paused && !gameOverFlag){
      if(e.code==='Space' || e.key===' '){
        if(!$('#overlay-stack').classList.contains('hidden')) return; // start handled
        e.preventDefault(); e.stopImmediatePropagation(); drop();
      }
    }
  };
  addEventListener('keydown', origSpaceHandler, true);

  reset();
  return {reset,start,togglePause,pause, drop};
})();

// gameover helper
function showGameOver(score, sub, best){
  $('#goScore').textContent = score;
  $('#goSub').textContent = sub || 'Nice run';
  const bestEl=$('#goBest');
  if(score>=best && score>0){
    bestEl.textContent = score>best ? `🎉 NEW BEST! Previous ${best}` : `★ Tied best: ${best}`;
    bestEl.classList.add('show');
  } else {
    if(best>0){ bestEl.textContent=`Best ${best} — keep grinding`; bestEl.classList.add('show'); }
    else bestEl.classList.remove('show');
  }
  $('#gameover').classList.add('show');
  // haptic
  if(navigator.vibrate) navigator.vibrate(40);
}

// close over ESC already handled

// Ensure canvases resize correctly for high DPI? Not needed, but fix blur
function fixDPI(){
  // keep as is, we use 1x
}
