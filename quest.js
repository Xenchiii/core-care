const $=s=>document.querySelector(s),KEY='corecare-quest',MAXHP=4;
const PIX={
heart:['.11..11.','11111111','11111111','11111111','.111111.','..1111..','...11...','........'],
star:['...11...','...11...','11111111','.111111.','..1111..','.111111.','.11..11.','11....11'],
hero:['..1111..','.111111.','.1.11.1.','.111111.','..1111..','.111111.','1.1111.1','..1..1..']};
const sp=(k,c)=>`<svg class="px ${c||''}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${PIX[k].map((r,y)=>[...r].map((ch,x)=>ch==='1'?`<rect x="${x}" y="${y}" width="1" height="1"/>`:'').join('')).join('')}</svg>`;
const shuf=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
let P={xp:0,done:{}};try{P=Object.assign(P,JSON.parse(localStorage.getItem(KEY)))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(P))}catch(e){}};

const REGIONS=[['Training Grounds',[]],['Power Plains',['Power']],['Screen Marsh',['Display']],['Boot Keep',['Boot']],['Speed Peaks',['Performance']],['Net Bridge',['Network']],['Disk Vault',['Storage']],['Code Forest',['Software']],['Shield Fortress',['Security']],['Port Village',['Peripherals']]];
const mk=(f,region)=>({id:f.id,region,title:f.name,intro:'Someone at the desk reports: "'+f.sym+'" Read the scroll of fixes, then prove you can work through it.',learn:f.steps,seq:f.steps.slice(0,5),ordered:true,bad:f.bad,fault:true});
const QUESTS=[
{id:'method',region:'Training Grounds',title:'The Technician\'s Method',intro:'Every repair follows the same road. Learn it before you touch a machine.',learn:METHOD,seq:METHOD,ordered:true,bad:METHOD_BAD},
{id:'safety',region:'Training Grounds',title:'Safety First',intro:'A careless technician becomes the next fault. Learn the rules that keep you and the hardware safe.',learn:SAFETY,seq:SAFETY,ordered:false,bad:SAFETY_BAD},
{id:'upkeep',region:'Training Grounds',title:'The Upkeep Rounds',intro:'Most faults never happen if the routine chores are done on time. Learn the schedule.',learn:TASKS.map(t=>t[0]+', every '+t[1]+' days. '+t[2]),seq:TASKS.slice(0,5).map(t=>t[0]),ordered:false,bad:UPKEEP_BAD,pickNote:true}
].concat(REGIONS.slice(1).flatMap(r=>FAULTS.filter(f=>r[1].includes(f.cat)).map(f=>mk(f,r[0]))));
const TITLES=[[0,'Apprentice'],[250,'Technician'],[600,'Specialist'],[1100,'Master Technician']];
const rank=()=>TITLES.filter(t=>P.xp>=t[0]).pop()[1];
const firstOpen=()=>QUESTS.findIndex(q=>!P.done[q.id]);
const unlocked=i=>firstOpen()===-1||i<=firstOpen();
const starRow=n=>`<span class="stars" aria-label="${n} of 3 stars">${[0,1,2].map(i=>sp('star',i<n?'':'off')).join('')}</span>`;
let Q=null;

function renderMap(){
 Q=null;
 const cleared=Object.keys(P.done).length,total=QUESTS.length;
 const hero=`<div class="hero">${sp('hero')}<div><b>${rank()}</b><small>${P.xp} XP. ${cleared} of ${total} quests cleared.</small><i class="bar"><u style="width:${cleared/total*100}%"></u></i></div></div>`;
 const done=cleared===total?'<div class="banner">Every quest is cleared. You know the full guide. Replay any quest to practise.</div>':'';
 const regions=REGIONS.map(r=>{
  const nodes=QUESTS.map((q,i)=>[q,i]).filter(([q])=>q.region===r[0]).map(([q,i])=>{
   const d=P.done[q.id],ok=unlocked(i);
   return `<button class="node ${d?'done':ok?'open':''}" data-act="open" data-i="${i}"${ok?'':' disabled'}><b>${q.title}</b><small>${d?starRow(d):ok?'New quest':'Locked'}</small></button>`}).join('');
  return `<section class="region"><h2>${r[0]}</h2><div class="nodes">${nodes}</div></section>`}).join('');
 $('#app').innerHTML=hero+done+regions}

function hearts(){return `<span class="hearts" aria-label="${Q.hp} of ${MAXHP} hearts">${Array.from({length:MAXHP},(_,i)=>sp('heart',i<Q.hp?'':'off')).join('')}</span>`}
function renderQuest(){
 const q=Q.q,back='<button class="ghost" data-act="map">Back to map</button>';
 let h='';
 if(Q.phase==='brief')h=`<small>${q.region}</small><h2>${q.title}</h2><div class="dialog"><small>Dispatcher</small><p>${q.intro}</p></div><div class="row"><button class="primary" data-act="scroll">Read the scroll</button>${back}</div>`;
 if(Q.phase==='scroll'){
  const n=q.seq.length,note=q.fault?`The first ${n} lines glow green. You will be tested on them, and the rest are your fallback steps.`:q.ordered?'You will be tested on the order of these steps.':q.pickNote?'You will be asked to pick the five routine chores from a list that includes traps.':'You will be asked to pick the safe actions and avoid the traps.';
  h=`<small>${q.region}</small><h2>${q.title}</h2><p class="hint">Scroll of fixes. ${note}</p><ol class="scroll">${q.learn.map((s,i)=>`<li${q.fault&&i<n?' class="core"':''}>${s}</li>`).join('')}</ol><div class="row"><button class="primary" data-act="trial">Begin the trial</button>${back}</div>`}
 if(Q.phase==='trial'){
  const n=q.seq.length;
  const slots=q.ordered?`<ol class="seq">${q.seq.map((s,i)=>`<li class="${i<Q.p?'filled':''}">${i<Q.p?Q.found[i]:'Step '+(i+1)}</li>`).join('')}</ol>`:`<ol class="seq">${q.seq.map((s,i)=>`<li class="${i<Q.p?'filled':''}">${i<Q.p?Q.found[i]:'Correct action '+(i+1)}</li>`).join('')}</ol>`;
  h=`<div class="trialbar"><b>${q.title}</b>${hearts()}</div><p class="hint">${q.ordered?'Tap the actions in the order a technician should do them.':'Tap every correct action, in any order.'} Wrong moves cost a heart.</p>${slots}<div class="hand">${Q.hand.map((c,j)=>`<button class="card${c.done?c.k==='bad'?' wrong':' used':''}" data-act="card" data-j="${j}"${c.done?' disabled':''}>${c.t}</button>`).join('')}</div><p id="fb" role="status" class="${Q.cls}">${Q.fb}</p>`}
 if(Q.phase==='win'){
  const rest=q.fault?q.learn.slice(q.seq.length):[];
  const next=Q.i+1<QUESTS.length;
  h=`<div class="result"><h2>Quest cleared</h2>${starRow(Q.stars)}<p class="good">${Q.gain?'You earned '+Q.gain+' XP.':'Practice run complete.'} Rank: ${rank()}.</p>${rest.length?`<div class="dialog"><small>Fallback steps if the fix still fails</small><ol class="scroll">${rest.map(s=>`<li>${s}</li>`).join('')}</ol></div>`:''}<div class="row">${next?'<button class="primary" data-act="nextq">Next quest</button>':''}<button class="ghost" data-act="scroll">Reread scroll</button>${back}</div></div>`}
 if(Q.phase==='lose')h=`<div class="result"><h2>Quest failed</h2><p class="bad">You ran out of hearts. Reread the scroll and try again.</p><div class="row"><button class="primary" data-act="scroll">Reread scroll</button>${back}</div></div>`;
 $('#app').innerHTML=`<div class="panel">${h}</div>`}

function openQuest(i){Q={i,q:QUESTS[i],phase:'brief',hp:MAXHP,p:0,found:[],hand:[],fb:'',cls:'',gain:0,stars:0};renderQuest()}
function beginTrial(){
 const q=Q.q;Q.phase='trial';Q.hp=MAXHP;Q.p=0;Q.found=[];Q.fb='';Q.cls='';
 Q.hand=shuf(q.seq.map(t=>({t,k:'good'})).concat(q.bad.map(b=>({t:b[0],k:'bad',why:b[1]}))));
 renderQuest()}
function win(){
 const q=Q.q;Q.stars=Q.hp>=4?3:Q.hp>=3?2:1;
 const first=!P.done[q.id];
 Q.gain=first?40+q.seq.length*5+Q.stars*10:0;
 P.xp+=Q.gain;if(first||Q.stars>P.done[q.id])P.done[q.id]=Q.stars;
 save();Q.phase='win'}
function pick(j){
 const q=Q.q,c=Q.hand[j];if(!c||c.done)return;
 let ok=false;
 if(c.k==='bad'){c.done=true;Q.hp--;Q.fb='Bad practice: '+c.why+'.';Q.cls='bad'}
 else if(!q.ordered||q.seq.indexOf(c.t)===Q.p)ok=true;
 else{Q.hp--;Q.fb='Right idea, wrong order. Do the cheaper, safer step first, then escalate.';Q.cls='warn'}
 if(ok){c.done=true;Q.found.push(c.t);Q.p++;Q.fb='Correct.';Q.cls='good'}
 if(Q.p===q.seq.length)win();else if(Q.hp<=0)Q.phase='lose';
 renderQuest()}

$('#app').addEventListener('click',e=>{
 const b=e.target.closest('[data-act]');if(!b)return;
 const a=b.dataset.act;
 if(a==='open')openQuest(+b.dataset.i);
 if(a==='map')renderMap();
 if(a==='scroll'){Q.phase='scroll';renderQuest()}
 if(a==='trial')beginTrial();
 if(a==='card')pick(+b.dataset.j);
 if(a==='nextq')openQuest(Q.i+1)});
renderMap();