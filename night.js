PIX.bug=['1..11..1','.111111.','11.11.11','11111111','11111111','.11..11.','1.1..1.1','1......1'];
const NKEY='corecare-night',NLEN=240,HOUR=40,NNIGHTS=5;
const CLOCK=['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
const ROOMS={1:'Server rack',2:'Network closet',3:'Storage bay',4:'Hallway'};
let NP={cleared:0};try{NP=Object.assign(NP,JSON.parse(localStorage.getItem(NKEY)))}catch(e){}
let N=null,loop=null,sig='';
const rnd=(a,b)=>a+Math.random()*(b-a);
const interval=()=>rnd(.7,1.3)*(9.5-N.night*1.1)*(N.black?.4:1);
const aggr=()=>N.black?1:.45+.07*N.night;
const present=c=>N.faults.filter(e=>e.cd<=0&&((e.lvl===0&&e.cam===c)||(e.lvl===1&&c===4)));
const atDoor=()=>N.faults.some(e=>e.cd<=0&&e.lvl===2);

function mkOpts(e){
 const f=e.f,s=e.stage,o=[{t:f.steps[s],k:'good'},{t:f.bad[s%2][0],k:'bad',why:f.bad[s%2][1]}];
 const late=f.steps[s+2];
 o.push(late?{t:late,k:'late',why:'Too early. Cheaper, safer steps come first'}:{t:f.bad[(s+1)%2][0],k:'bad',why:f.bad[(s+1)%2][1]});
 e.opts=shuf(o)}
function spawn(e){
 const avoid=N.faults.map(x=>x.f&&x.f.id),pool=FAULTS.filter(f=>!avoid.includes(f.id));
 e.f=pool[Math.floor(Math.random()*pool.length)];e.lvl=0;e.stage=0;e.cam=1+Math.floor(Math.random()*3);e.mt=interval()+rnd(2,6);e.dt=0;e.cd=0;
 N.seen[e.f.id]=e.f;mkOpts(e)}

function renderMenu(){
 N=null;clearInterval(loop);
 const btns=Array.from({length:NNIGHTS},(_,i)=>`<button class="primary" data-act="night" data-n="${i+1}"${i<=NP.cleared?'':' disabled'}>Night ${i+1}</button>`).join('');
 $('#night').innerHTML=`<div class="panel"><h2>Night shift</h2><div class="dialog"><small>Dispatcher</small><p>It is midnight and you are alone in the server office. Faults crawl from the back rooms toward your door. Survive until 6 AM.</p></div><ul class="scroll"><li>Open the monitor and watch the cameras (keys 1 to 4, M). Faults hide in the back rooms and the hallway.</li><li>When you find one, apply the correct next repair step. Two correct steps in the right order purge it. Wrong steps pull it closer.</li><li>If something reaches the door, close the firewall (D) until it leaves.</li><li>The monitor and the firewall drain power. At 0 percent the lights go out and the faults rush in.</li></ul><div class="nights">${btns}</div></div>`}

function startNight(n){
 N={night:n,t:0,power:100,mon:false,cam:1,door:false,black:false,bt:8,fixed:0,seen:{},faults:[],fb:'Shift started. Check the cameras.'};
 const count=n<=1?1:n<=3?2:3;
 for(let i=0;i<count;i++){const e={};N.faults.push(e);spawn(e);e.cd=4+i*rnd(6,12)}
 sig='';
 $('#night').innerHTML=`<div class="panel ns"><div class="nhud"><b id="nClock">12 AM</b><span>Night ${n}</span><span>Power <b id="nPow">100%</b></span><span id="nUse"></span></div><i class="bar"><u id="nPowB"></u></i><div id="nAlert" class="nalert" role="status"></div><div class="camtabs" id="camTabs"></div><div id="feed" class="feed"></div><div class="row"><button class="primary" id="nMon" data-act="mon" aria-pressed="false">Monitor (M)</button><button class="primary" id="nDoor" data-act="door" aria-pressed="false">Firewall door (D)</button></div><p id="nFb" role="status" class="hint"></p></div>`;
 clearInterval(loop);loop=setInterval(tick,100);hud();feed()}

function hud(){
 $('#nClock').textContent=CLOCK[Math.min(6,Math.floor(N.t/HOUR))];
 $('#nPow').textContent=Math.ceil(N.power)+'%';
 const pb=$('#nPowB');pb.style.width=N.power+'%';pb.style.background=N.power<20?'var(--bad)':N.power<45?'var(--warn)':'var(--ok)';
 $('#nUse').textContent='Usage '+(1+(N.mon?1:0)+(N.door?1:0))+'/3';
 const a=$('#nAlert'),d=atDoor();a.textContent=d?'Warning: activity at the office door. Close the firewall.':'';a.classList.toggle('on',d);
 $('#nMon').setAttribute('aria-pressed',N.mon);$('#nDoor').setAttribute('aria-pressed',N.door);
 $('#nFb').textContent=N.fb}

function feed(){
 const ps=N.mon&&!N.black?present(N.cam):[];
 const s=[N.black,N.mon,N.cam,...ps.map(e=>e.f.id+e.stage+e.lvl+e.opts.map(o=>o.used?1:0).join(''))].join('|');
 if(s===sig)return;sig=s;
 $('#camTabs').innerHTML=[1,2,3,4].map(c=>`<button class="${c===N.cam?'on':''}" data-act="cam" data-c="${c}">CAM ${c}</button>`).join('');
 const f=$('#feed');f.classList.toggle('black',N.black);
 if(N.black){f.innerHTML='<div class="dark">Power out. The lights are off.</div>';return}
 if(!N.mon){f.innerHTML='<div class="dark">Monitor is off. Turn it on to check the cameras. It uses power.</div>';return}
 f.innerHTML=`<div class="camhead"><span>CAM ${N.cam}</span><span>${ROOMS[N.cam]}</span></div>`+(ps.length?ps.map(e=>{const i=N.faults.indexOf(e);return `<div class="fault"><div class="fhead">${sp('bug')}<span>${e.f.name}</span></div><p>${e.f.sym}</p><div class="opts">${e.opts.map((o,j)=>`<button class="card${o.used?' wrong':''}" data-act="pick" data-e="${i}" data-o="${j}"${o.used?' disabled':''}>${o.t}</button>`).join('')}</div></div>`}).join(''):'<p class="clear">Room clear. Nothing unusual on this camera.</p>')}

function tick(){
 if(!N)return;
 const dt=.1;N.t+=dt;
 if(N.t>=NLEN){endNight(true);return}
 if(!N.black){
  N.power=Math.max(0,N.power-dt*(.12+(N.mon?.25:0)+(N.door?.45:0)));
  if(N.power<=0){N.black=true;N.mon=false;N.door=false;N.fb='Power out. They are coming.';sig=''}}
 else{N.bt-=dt;if(N.bt<=0){endNight(false,N.faults.find(e=>e.cd<=0)||N.faults[0]);return}}
 for(const e of N.faults){
  if(e.cd>0){e.cd-=dt;continue}
  e.mt-=dt;
  if(e.mt<=0){e.mt=interval();
   if(e.lvl<2){if(Math.random()<aggr()){e.lvl++;if(e.lvl===2){e.dt=0;e.mt=interval()*.8}}}
   else if(N.door){e.lvl=1;e.mt+=3;N.fb=e.f.name+' backed away from the door.'}}
  if(e.lvl===2&&!N.door){e.dt+=dt;if(e.dt>=5){endNight(false,e);return}}else e.dt=0}
 hud();feed()}

function nightPick(i,j){
 const e=N.faults[i],o=e&&e.opts[j];if(!o||o.used||e.cd>0)return;
 N.power=Math.max(0,N.power-1);
 if(o.k==='good'){
  e.stage++;
  if(e.stage>=2){N.fixed++;N.fb='Purged: '+e.f.name+'. It will be back with something new.';spawn(e);e.cd=rnd(6,12)}
  else{e.lvl=Math.max(0,e.lvl-1);mkOpts(e);N.fb='Correct. It backs away. Apply the next step.'}}
 else{o.used=true;e.lvl++;if(e.lvl>=2){e.lvl=2;e.mt=interval()*.8;e.dt=0}N.fb='Wrong: '+o.why+'. It moves closer.'}
 sig='';hud();feed()}

function endNight(won,e){
 clearInterval(loop);const n=N.night,fixed=N.fixed,seen=Object.values(N.seen);
 if(won)NP.cleared=Math.max(NP.cleared,n);
 try{localStorage.setItem(NKEY,JSON.stringify(NP))}catch(x){}
 const all=won&&n===NNIGHTS?'<div class="banner">You survived all five nights. Master of the night shift.</div>':'';
 const head=won?`<h2>6 AM. Night ${n} survived</h2><p class="good">Faults purged: ${fixed}.</p>`:`<h2>Breach</h2><p class="bad">${e.f.name} reached the office${N.black?' while the power was out':''}. Incident report below.</p>`;
 const det=seen.map(f=>`<details${!won&&e&&e.f.id===f.id?' open':''}><summary>${f.name}</summary><ol class="scroll">${f.steps.map(s=>`<li>${s}</li>`).join('')}</ol></details>`).join('');
 $('#night').innerHTML=`<div class="panel nend">${all}${head}<h2>Guide entries from tonight</h2>${det}<div class="row">${won&&n<NNIGHTS?`<button class="primary" data-act="night" data-n="${n+1}">Next night</button>`:''}<button class="${won?'ghost':'primary'}" data-act="night" data-n="${n}">Retry night ${n}</button><button class="ghost" data-act="menu">Menu</button></div></div>`;
 N=null}

$('#night').addEventListener('click',e=>{
 const b=e.target.closest('[data-act]');if(!b)return;
 const a=b.dataset.act;
 if(a==='night')startNight(+b.dataset.n);
 if(a==='menu')renderMenu();
 if(!N)return;
 if(a==='cam'){N.cam=+b.dataset.c;sig='';feed()}
 if(a==='mon'&&!N.black){N.mon=!N.mon;sig='';hud();feed()}
 if(a==='door'&&!N.black){N.door=!N.door;hud()}
 if(a==='pick')nightPick(+b.dataset.e,+b.dataset.o)});
document.addEventListener('keydown',e=>{
 if(!N||$('#night').hidden)return;
 const k=e.key.toLowerCase();
 if('1234'.includes(k)&&k){N.cam=+k;sig='';feed()}
 if(k==='m'&&!N.black){N.mon=!N.mon;sig='';hud();feed()}
 if(k==='d'&&!N.black){N.door=!N.door;hud()}});
document.querySelector('.tabs').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 document.querySelectorAll('.tabs button').forEach(x=>x.setAttribute('aria-pressed',x===b));
 $('#app').hidden=b.dataset.t!=='app';$('#night').hidden=b.dataset.t!=='night';
 if(b.dataset.t==='night')renderMenu();else{clearInterval(loop);N=null}});
renderMenu();