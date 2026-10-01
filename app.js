const $ = id => document.getElementById(id);
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

let INCENTIVES_LOCAL = Array.isArray(window.INCENTIVES) ? window.INCENTIVES : INCENTIVES;
const state = { sales: [], announcements: [] };
const model = $('model'), variant = $('variant'), bookingDate = $('bookingDate');

const OCT_SCHEME = {
  period(date) {
    return date.getDate() <= 10
      ? { name:'PRE-NAVRATRI BONANZA', range:'1–10 October 2026', short:'PRE-NAVRATRI • 1–10 OCT', booking:[0,1500,3000,5000,1500] }
      : { name:'NAVRATRI BOOKING BONANZA', range:'11–31 October 2026', short:'NAVRATRI • 11–31 OCT', booking:[0,750,1500,2500,750] };
  },
  models: {
    'NEW BALENO': { cng:[500,750,1000,1500], petrol:[1250,1500,2500,3000] },
    'Fronx': { cng:[500,750,1000,1500], petrol:[1250,1500,2500,3000], turbo:[5000] },
    'XL6': { all:[3000] }, 'JIMNY': { all:[5000] }, 'INVICTO': { all:[10000] }, 'E-VITARA': { all:[7000] }
  },
  exchange: { 'NEW BALENO':750, 'Fronx':500, 'XL6':1000, 'JIMNY':1000, 'INVICTO':3000, 'E-VITARA':2500 },
  ew:300,
  gna:[[40000,50000,1200],[50000,60000,2000],[60000,Infinity,4000]],
  gvStep:{petrol:[5000,6000],cng:[2000,3000]},
  gvHigh:4000,
  gvStrongHybrid:5000,
  minCars:4,
  zeroGVReduction:.25
};

function selectedPeriod(){
  const d = new Date(`${bookingDate.value || '2026-10-01'}T12:00:00`);
  return OCT_SCHEME.period(d);
}
function updateSchemeUI(){
  const s=selectedPeriod();
  $('schemeBadge').innerHTML=`${s.name}<span>${s.range}</span>`;
  $('promoPeriod').textContent=s.short;
  $('monthPill').textContent='October 2026';
}
function fuelType(x){
  const v=(x.variant||'').toUpperCase();
  if(x.model==='NEW BALENO'||x.model==='Fronx'||x.model==='GRAND VITARA') return v.includes('CNG')?'cng':(v.includes('TURBO')?'turbo':'petrol');
  return 'all';
}
function groupKey(x){
  if(x.model==='NEW BALENO') return `NEW BALENO-${fuelType(x)}`;
  if(x.model==='Fronx') return `Fronx-${fuelType(x)}`;
  return x.model;
}
function groupCount(x){ return state.sales.filter(s=>groupKey(s)===groupKey(x)).length; }
function groupPosition(x){
  const idx=state.sales.findIndex(s=>s.id===x.id);
  if(idx<0) return groupCount(x);
  return state.sales.slice(0,idx).filter(s=>groupKey(s)===groupKey(x)).length;
}
function gvCount(){ return state.sales.filter(s=>s.model==='GRAND VITARA').length; }
function gvPosition(x){
  const idx=state.sales.findIndex(s=>s.id===x.id);
  if(idx<0) return gvCount();
  return state.sales.slice(0,idx).filter(s=>s.model==='GRAND VITARA').length;
}
function isGVHigh(x){
  if(x.model!=='GRAND VITARA') return false;
  const v=(x.variant||'').toUpperCase();
  return /ZETA|ALPHA|DELTA\+/.test(v) && !v.includes('SIGMA');
}
function isGVStrongHybrid(x){
  return x.model==='GRAND VITARA' && /STRONG HYBRID|STRONGHYBRID|HYBRID/.test((x.variant||'').toUpperCase());
}
function modelIncentive(x){
  if(x.model==='GRAND VITARA') return 0;
  const rule=OCT_SCHEME.models[x.model];
  if(!rule) return Number(x.main||0);
  const arr=rule[fuelType(x)]||rule.all||[0];
  const position=groupPosition(x);
  return arr[Math.min(position,arr.length-1)]||0;
}
function gvStep(x){
  if(x.model!=='GRAND VITARA') return 0;
  const arr=OCT_SCHEME.gvStep[fuelType(x)]||OCT_SCHEME.gvStep.petrol;
  const position=gvPosition(x);
  return arr[position===0?0:1]||0;
}
function gvAdditional(x){
  if(x.model!=='GRAND VITARA') return 0;
  return isGVStrongHybrid(x) ? OCT_SCHEME.gvStrongHybrid : (isGVHigh(x) ? OCT_SCHEME.gvHigh : 0);
}
function exchangeBonus(x){ return OCT_SCHEME.exchange[x.model]||0; }
function gnaBonus(value){
  const n=Number(value||0),row=OCT_SCHEME.gna.find(r=>n>=r[0]&&n<r[1]);
  return row?row[2]:0;
}
function bookingBonus(count){
  const a=selectedPeriod().booking;
  if(count<2) return 0;
  if(count>=5) return count*a[4];
  return a[count-1]||0;
}
function vehicleCalc(x){
  const base=modelIncentive(x), step=gvStep(x), gvAdd=gvAdditional(x);
  const ex=x.exchange?exchangeBonus(x):0, ew=x.ew?OCT_SCHEME.ew:0, gna=x.gnaValue?gnaBonus(x.gnaValue):0;
  return {base,step,gvAdd,ex,ew,gna,total:base+step+gvAdd+ex+ew+gna};
}
function grossTotals(){
  if(state.sales.length<OCT_SCHEME.minCars) return {modelTotal:0,stepTotal:0,gvAdditional:0,allied:0,booking:0,gross:0,locked:true};
  let modelTotal=0,stepTotal=0,gvAdditional=0,allied=0;
  state.sales.forEach(x=>{const c=vehicleCalc(x);modelTotal+=c.base;stepTotal+=c.step;gvAdditional+=c.gvAdd;allied+=c.ex+c.ew+c.gna;});
  const booking=bookingBonus(state.sales.length);
  return {modelTotal,stepTotal,gvAdditional,allied,booking,gross:modelTotal+stepTotal+gvAdditional+allied+booking,locked:false};
}
function renderTiers(){
  $('scheme').hidden=false;
  if(state.sales.length<OCT_SCHEME.minCars){
    $('tiers').innerHTML=`<div class="tier"><small>Qualification lock</small><b>${OCT_SCHEME.minCars-state.sales.length} more vehicle${OCT_SCHEME.minCars-state.sales.length===1?'':'s'}</b></div>`;
  } else {
    const groups={};
    state.sales.forEach(x=>groups[groupKey(x)]=(groups[groupKey(x)]||0)+1);
    $('tiers').innerHTML=Object.entries(groups).map(([k,n])=>{
      const sum=state.sales.filter(x=>groupKey(x)===k).reduce((a,x)=>a+vehicleCalc(x).step,0);
      return `<div class="tier active"><small>${esc(k.replace('NEW BALENO-','Baleno ').replace('Fronx-','Fronx '))} • ${n} car${n>1?'s':''}</small><b>${money(sum)}</b></div>`;
    }).join('');
  }
  if(state.sales.length<OCT_SCHEME.minCars){
    const left=OCT_SCHEME.minCars-state.sales.length;
    $('nextMilestone').textContent=`${left} car${left===1?'':'s'} to unlock`;
  } else {
    $('nextMilestone').textContent=money(bookingBonus(state.sales.length+1)-bookingBonus(state.sales.length));
  }
}
function render(){
  const t=grossTotals(), eligible=!t.locked, deduction=eligible&&gvCount()===0;
  const finalTotal=eligible?Math.round(t.gross*(deduction?OCT_SCHEME.zeroGVReduction:1)):0;
  $('grandTotal').textContent=money(finalTotal);
  $('headTotal').textContent=money(finalTotal);
  $('vehicleCount').textContent=state.sales.length;
  $('countText').textContent=`${state.sales.length} ${state.sales.length===1?'vehicle':'vehicles'}`;
  $('statusText').textContent=state.sales.length<OCT_SCHEME.minCars?'ADD 4 VEHICLES':(deduction?'25% DEDUCTION':'QUALIFIED');
  $('sumMain').textContent=money(t.modelTotal+t.gvAdditional);
  $('sumStep').textContent=money(t.stepTotal);
  $('sumAllied').textContent=money(t.allied);
  $('sumBooking').textContent=money(t.booking);
  $('sumTotal').textContent=money(finalTotal);
  $('emptyTable').style.display=state.sales.length?'none':'block';
  $('summary').hidden=!state.sales.length;

  const dl=$('deductionLine');
  if(!state.sales.length){ dl.hidden=true; }
  else if(!eligible){
    dl.hidden=false;
    dl.textContent=`Calculation locked until ${OCT_SCHEME.minCars} vehicles are added. ${OCT_SCHEME.minCars-state.sales.length} more required.`;
  } else if(deduction){
    dl.hidden=false;
    dl.innerHTML=`<b>25% deduction:</b> minimum 4 vehicles achieved, but ZERO Grand Vitara retail is present. Final potential is 75% of gross potential.`;
  } else {
    dl.hidden=false;
    dl.textContent='Minimum 4 vehicles achieved and at least 1 Grand Vitara added — no 25% deduction.';
  }

  renderTiers();
  $('salesBody').innerHTML=state.sales.map((x,i)=>{
    const c=vehicleCalc(x),locked=!eligible;
    return `<tr><td>${i+1}</td><td class="model-name">${esc(x.model)}</td><td class="variant-name">${esc(x.variant)}</td><td>${x.exchange?'Yes':'No'}</td><td>${x.ew?'Yes':'No'}</td><td>${x.gnaValue?money(x.gnaValue):'₹0'}</td><td>${locked?'—':money(c.base+c.gvAdd+c.ex+c.ew+c.gna)}</td><td class="step">${locked?'—':money(c.step)}</td><td>${locked?'Locked':money(c.total)}</td><td><button class="delete" data-id="${x.id}">×</button></td></tr>`;
  }).join('');
  document.querySelectorAll('.delete').forEach(b=>b.onclick=()=>removeSale(b.dataset.id));
}
function renderPreview(x){
  if(!x){$('preview').hidden=true;return;}
  const temp={...x,exchange:$('exchange').value==='Yes',ew:$('ew').value==='Yes',gnaValue:Number($('gna').value||0),id:'__preview__'};
  const g=gnaBonus($('gna').value),ex=temp.exchange?exchangeBonus(x):0,ew=temp.ew?OCT_SCHEME.ew:0;
  if(state.sales.length<OCT_SCHEME.minCars){
    $('preview').innerHTML=`<span>Qualification <b>${OCT_SCHEME.minCars-state.sales.length} more vehicle${OCT_SCHEME.minCars-state.sales.length===1?'':'s'} required</b></span><span>Incentive calculation <b>LOCKED</b></span>`;
  } else {
    const c=vehicleCalc(temp);
    $('preview').innerHTML=`<span>Model <b>${money(c.base)}</b></span><span>GV Additional <b>${money(c.gvAdd)}</b></span><span>Step-Up <b>${money(c.step)}</b></span><span>Exchange <b>${money(ex)}</b></span><span>EW <b>${money(ew)}</b></span><span>GNA <b>${money(g)}</b></span>`;
  }
  $('preview').hidden=false;
}
function renderModelVisual(m){
  const el=$('modelVisual');
  if(!m){el.innerHTML='<div class="visual-placeholder"><span>SELECT A MODEL</span><b>Vehicle preview</b></div>';return;}
  const src=({'NEW BALENO':'vehicle-images/Baleno.png','Old BALENO':'vehicle-images/Baleno.png','Fronx':'vehicle-images/Fronx.png','GRAND VITARA':'vehicle-images/GrandVitara.png','XL6':'vehicle-images/XL6.png','INVICTO':'vehicle-images/Invicto.png','JIMNY':'vehicle-images/Jimny.png','E-VITARA':'vehicle-images/eVitara.png'})[m];
  el.innerHTML=src?`<div class="vehicle-photo"><img src="${src}" alt="${esc(m)} vehicle"><div class="vehicle-photo-overlay"><strong>${esc(m)}</strong><small>Model selected</small></div></div>`:`<div class="vehicle-art"><div class="vehicle-shape"></div><div class="vehicle-label">${esc(m)}</div><small>Model selected</small></div>`;
}
function resetSelector(){
  model.value='';variant.innerHTML='<option value="">Select variant</option>';variant.disabled=true;$('addBtn').disabled=true;$('preview').hidden=true;
  $('exchange').value='No';$('ew').value='No';$('gna').value='0';renderModelVisual('');
}
function removeSale(id){state.sales=state.sales.filter(x=>x.id!==id);render();}
async function loadMaster(){
  if(window.supabase&&window.SUPABASE_URL&&!window.SUPABASE_URL.startsWith('YOUR_')){
    const sb=supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
    try{
      const {data:s,error:se}=await sb.from('incentive_schemes').select('id,month_label,is_published,step_up_enabled,step_up_tiers').eq('is_published',true).order('published_at',{ascending:false}).limit(1).maybeSingle();
      if(!se&&s){
        const {data:items,error:ie}=await sb.from('incentive_items').select('model,variant,incentive,spot1,spot2,main_incentives,spot_incentives').eq('scheme_id',s.id);
        if(!ie&&items?.length) INCENTIVES_LOCAL=items.map(x=>({...x,main:Number(x.incentive||x.main||0)}));
      }
    }catch(e){console.warn('Published model data unavailable; October RM scheme remains active.',e)}
    try{
      const {data:a,error:ae}=await sb.from('announcements').select('*').eq('is_active',true).order('created_at',{ascending:false});
      if(!ae) state.announcements=a||[];
    }catch(e){state.announcements=[]}
  }
  init();showAnnouncement();
}
function init(){
  updateSchemeUI();
  model.innerHTML='<option value="">Select model</option>';
  [...new Set(INCENTIVES_LOCAL.map(x=>x.model))].forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;model.appendChild(o);});
  render();
}
model.onchange=()=>{
  variant.innerHTML='<option value="">Select variant</option>';variant.disabled=!model.value;$('addBtn').disabled=true;
  if(model.value) INCENTIVES_LOCAL.filter(x=>x.model===model.value).forEach(x=>{const o=document.createElement('option');o.value=x.variant;o.textContent=x.variant;variant.appendChild(o);});
  renderModelVisual(model.value);renderPreview(INCENTIVES_LOCAL.find(x=>x.model===model.value&&x.variant===variant.value));
};
variant.onchange=()=>{const x=INCENTIVES_LOCAL.find(x=>x.model===model.value&&x.variant===variant.value);$('addBtn').disabled=!x;renderPreview(x);};
['exchange','ew','gna'].forEach(id=>$(id).onchange=()=>renderPreview(INCENTIVES_LOCAL.find(x=>x.model===model.value&&x.variant===variant.value)));
bookingDate.onchange=()=>{updateSchemeUI();render();};
$('addBtn').onclick=()=>{
  const x=INCENTIVES_LOCAL.find(x=>x.model===model.value&&x.variant===variant.value);if(!x)return;
  state.sales.push({...x,exchange:$('exchange').value==='Yes',ew:$('ew').value==='Yes',gnaValue:Number($('gna').value||0),id:String(Date.now()+Math.random())});
  resetSelector();render();
};
$('resetBtn').onclick=()=>{if(!state.sales.length||confirm('Clear all vehicles from this opportunity?')){state.sales=[];resetSelector();render();}};
function showAnnouncement(){return;}
loadMaster();