const $=id=>document.getElementById(id);
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const state={sales:[]};
const models=[...new Set(INCENTIVES.map(x=>x.model))];
const model=$('model'), variant=$('variant');

$('monthPill').textContent=MONTH;

models.forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;model.appendChild(o)});

function countModel(m){return state.sales.filter(x=>x.model===m).length}
function stepFor(m){const n=countModel(m)+1;return STEP_UP_TIERS[Math.min(n-1,STEP_UP_TIERS.length-1)]}
function totals(){return state.sales.reduce((a,x)=>{a.main+=x.main;a.step+=x.step;a.spot+=x.spot1+x.spot2;return a},{main:0,step:0,spot:0})}
function renderTiers(){
  const counts={};state.sales.forEach(x=>counts[x.model]=(counts[x.model]||0)+1);
  const max=Object.values(counts).length?Math.max(...Object.values(counts)):0;
  $('tiers').innerHTML=STEP_UP_TIERS.map((v,i)=>`<div class="tier ${max===i+1?'active':''}"><small>${i<4?`${i+1}${i===0?'st':i===1?'nd':i===2?'rd':'th'} car`:'5th+ car'}</small><b>${money(v)}</b></div>`).join('');
  const next=max<5?STEP_UP_TIERS[max]:STEP_UP_TIERS[4];$('nextMilestone').textContent=money(next);
}
function render(){
  const t=totals(), n=state.sales.length;
  $('grandTotal').textContent=money(t.main+t.step+t.spot);$('headTotal').textContent=money(t.main+t.step+t.spot);
  $('vehicleCount').textContent=n;$('countText').textContent=`${n} ${n===1?'vehicle':'vehicles'}`;
  $('statusText').textContent=n?'ACTIVE':'START SELLING';
  $('sumMain').textContent=money(t.main);$('sumStep').textContent=money(t.step);$('sumSpot').textContent=money(t.spot);$('sumTotal').textContent=money(t.main+t.step+t.spot);
  renderTiers();
  $('emptyTable').style.display=n?'none':'block';
  $('summary').hidden=!n;
  $('salesBody').innerHTML=state.sales.map((x,i)=>`<tr>
    <td>${i+1}</td><td class="model-name">${esc(x.model)}</td><td class="variant-name">${esc(x.variant)}</td>
    <td>${money(x.main+x.spot1+x.spot2)}</td><td class="step">${money(x.step)}</td><td>${money(x.main+x.spot1+x.spot2+x.step)}</td>
    <td><button class="delete" data-id="${x.id}" title="Remove sale">♜</button></td>
  </tr>`).join('');
  document.querySelectorAll('.delete').forEach(b=>b.onclick=()=>removeSale(b.dataset.id));
}
model.onchange=()=>{
  variant.innerHTML='<option value="">Select variant</option>';variant.disabled=!model.value;$('addBtn').disabled=true;$('preview').hidden=true;
  if(model.value)INCENTIVES.filter(x=>x.model===model.value).forEach(x=>{const o=document.createElement('option');o.value=x.variant;o.textContent=x.variant;variant.appendChild(o)});
};
variant.onchange=()=>{
  const x=INCENTIVES.find(x=>x.model===model.value&&x.variant===variant.value);
  $('addBtn').disabled=!x;$('preview').hidden=!x;
  if(x){$('pMain').textContent=money(x.main);$('pSpot1').textContent=money(x.spot1);$('pSpot2').textContent=money(x.spot2)}
};
$('addBtn').onclick=()=>{
  const x=INCENTIVES.find(x=>x.model===model.value&&x.variant===variant.value);if(!x)return;
  state.sales.push({...x,step:stepFor(x.model),id:String(Date.now()+Math.random())});resetSelector();render();
};
function resetSelector(){model.value='';variant.innerHTML='<option value="">Select variant</option>';variant.disabled=true;$('addBtn').disabled=true;$('preview').hidden=true}
function removeSale(id){
  const x=state.sales.find(x=>x.id===id);state.sales=state.sales.filter(x=>x.id!==id);
  if(x){let n=0;state.sales.forEach(s=>{if(s.model===x.model){n++;s.step=STEP_UP_TIERS[Math.min(n-1,4)]}})}
  render();
}
$('resetBtn').onclick=()=>{if(!state.sales.length||confirm('Clear all vehicles for this month?')){state.sales=[];resetSelector();render()}};
render();
