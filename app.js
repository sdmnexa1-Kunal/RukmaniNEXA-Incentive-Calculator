const $=id=>document.getElementById(id), money=n=>'₹'+Number(n||0).toLocaleString('en-IN'), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let INCENTIVES_LOCAL=INCENTIVES, MONTH_LOCAL=MONTH, STEP_UP_TIERS_LOCAL=STEP_UP_TIERS; const state={sales:[],announcements:[]};
const model=$('model'),variant=$('variant');
async function loadMaster(){
 try{
  if(!window.supabase||window.SUPABASE_URL.startsWith('YOUR_')) return;
  const sb=supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
  const {data:s,error:se}=await sb.from('incentive_schemes')
    .select('id,month_label,step_up_enabled,step_up_tiers')
    .eq('is_published',true).order('published_at',{ascending:false}).limit(1).maybeSingle();
  if(se) throw se;
  if(s){
    const {data:items,error:ie}=await sb.from('incentive_items')
      .select('model,variant,incentive,spot1,spot2,main_incentives,spot_incentives')
      .eq('scheme_id',s.id);
    if(ie) throw ie;
    if(items?.length){
      INCENTIVES_LOCAL=items.map(x=>{
        const mains=Array.isArray(x.main_incentives)&&x.main_incentives.length
          ? x.main_incentives.map(Number) : [Number(x.incentive||0)];
        const spots=Array.isArray(x.spot_incentives)
          ? x.spot_incentives.map(Number)
          : [Number(x.spot1||0),Number(x.spot2||0)].filter(v=>v!==0);
        return {...x,main_incentives:mains,spot_incentives:spots,main:mains.reduce((a,v)=>a+v,0),spot1:spots[0]||0,spot2:spots[1]||0,spotTotal:spots.reduce((a,v)=>a+v,0)};
      });
      MONTH_LOCAL=s.month_label;
      STEP_UP_TIERS_LOCAL=s.step_up_enabled===false ? [] : (Array.isArray(s.step_up_tiers)&&s.step_up_tiers.length?s.step_up_tiers.map(Number):STEP_UP_TIERS_LOCAL);
    }
  }
  const {data:a}=await sb.from('announcements').select('*').eq('is_active',true).order('created_at',{ascending:false});
  state.announcements=a||[]; showAnnouncement();
 }catch(e){console.warn('Master data unavailable; using local data.',e)}
 init();
}
function init(){ $('monthPill').textContent=MONTH_LOCAL; model.innerHTML='<option value="">Select model</option>';[...new Set(INCENTIVES_LOCAL.map(x=>x.model))].forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;model.appendChild(o)});render(); }
function countModel(m){return state.sales.filter(x=>x.model===m).length}
function stepFor(m){if(!STEP_UP_TIERS_LOCAL.length)return 0;const n=countModel(m)+1;return STEP_UP_TIERS_LOCAL[Math.min(n-1,STEP_UP_TIERS_LOCAL.length-1)]}
function totals(){return state.sales.reduce((a,x)=>{a.main+=x.main;a.step+=x.step;a.spot+=x.spotTotal||x.spot1+x.spot2;return a},{main:0,step:0,spot:0})}
function renderTiers(){
 const counts={};state.sales.forEach(x=>counts[x.model]=(counts[x.model]||0)+1);
 const max=Object.values(counts).length?Math.max(...Object.values(counts)):0;
 const has=STEP_UP_TIERS_LOCAL.length>0;
 $('scheme').hidden=!has;
 $('tiers').innerHTML=has?STEP_UP_TIERS_LOCAL.map((v,i)=>`<div class="tier ${max===i+1?'active':''}"><small>${i<4?`${i+1}${i===0?'st':i===1?'nd':i===2?'rd':'th'} car`:'5th+ car'}</small><b>${money(v)}</b></div>`).join(''):'';
 $('nextMilestone').textContent=has?money(STEP_UP_TIERS_LOCAL[Math.min(max,STEP_UP_TIERS_LOCAL.length-1)]):'—';
}
function render(){
 const t=totals(),n=state.sales.length,total=t.main+t.step+t.spot;
 $('grandTotal').textContent=money(total);$('headTotal').textContent=money(total);$('vehicleCount').textContent=n;$('countText').textContent=`${n} ${n===1?'vehicle':'vehicles'}`;$('statusText').textContent=n?'ACTIVE':'START SELLING';
 $('sumMain').textContent=money(t.main);$('sumStep').textContent=money(t.step);$('sumSpot').textContent=money(t.spot);$('sumTotal').textContent=money(total);renderTiers();
 $('emptyTable').style.display=n?'none':'block';$('summary').hidden=!n;
 $('salesBody').innerHTML=state.sales.map((x,i)=>`<tr><td>${i+1}</td><td class="model-name">${esc(x.model)}</td><td class="variant-name">${esc(x.variant)}</td><td>${money(x.main+x.spotTotal)}</td><td class="step">${money(x.step)}</td><td>${money(x.main+x.spotTotal+x.step)}</td><td><button class="delete" data-id="${x.id}">×</button></td></tr>`).join('');
 document.querySelectorAll('.delete').forEach(b=>b.onclick=()=>removeSale(b.dataset.id));
}
model.onchange=()=>{variant.innerHTML='<option value="">Select variant</option>';variant.disabled=!model.value;$('addBtn').disabled=true;$('preview').hidden=true;renderModelVisual(model.value);if(model.value)INCENTIVES_LOCAL.filter(x=>x.model===model.value).forEach(x=>{const o=document.createElement('option');o.value=x.variant;o.textContent=x.variant;variant.appendChild(o)})};
function renderIncentivePreview(x){
 if(!x){$('preview').hidden=true;return}
 const mains=x.main_incentives||[x.main||0],spots=x.spot_incentives||[];
 const parts=[];
 mains.forEach((v,i)=>parts.push(`<span>${mains.length===1?'Main Incentive':'Main '+(i+1)} <b>${money(v)}</b></span>`));
 spots.forEach((v,i)=>parts.push(`<span>Spot ${i+1} <b>${money(v)}</b></span>`));
 $('preview').innerHTML=parts.join('');
 $('preview').hidden=false;
}
variant.onchange=()=>{const x=INCENTIVES_LOCAL.find(x=>x.model===model.value&&x.variant===variant.value);$('addBtn').disabled=!x;renderIncentivePreview(x)};
$('addBtn').onclick=()=>{const x=INCENTIVES_LOCAL.find(x=>x.model===model.value&&x.variant===variant.value);if(!x)return;state.sales.push({...x,step:stepFor(x.model),id:String(Date.now()+Math.random())});resetSelector();render()};
function resetSelector(){model.value='';variant.innerHTML='<option value="">Select variant</option>';variant.disabled=true;$('addBtn').disabled=true;$('preview').hidden=true;renderModelVisual('')}
function removeSale(id){const x=state.sales.find(x=>x.id===id);state.sales=state.sales.filter(x=>x.id!==id);if(x&&STEP_UP_TIERS_LOCAL.length){let n=0;state.sales.forEach(s=>{if(s.model===x.model){n++;s.step=STEP_UP_TIERS_LOCAL[Math.min(n-1,STEP_UP_TIERS_LOCAL.length-1)]}})}render()}
$('resetBtn').onclick=()=>{if(!state.sales.length||confirm('Clear all vehicles for this month?')){state.sales=[];resetSelector();render()}};
const VEHICLE_IMAGES={
  'NEW BALENO':'vehicle-images/Baleno.png',
  'Old BALENO':'vehicle-images/Baleno.png',
  'Fronx':'vehicle-images/Fronx.png',
  'GRAND VITARA':'vehicle-images/GrandVitara.png',
  'XL6':'vehicle-images/XL6.png',
  'INVICTO':'vehicle-images/Invicto.png',
  'JIMNY':'vehicle-images/Jimny.png',
  'E-VITARA':'vehicle-images/eVitara.png'
};
function renderModelVisual(m){
  const el=$('modelVisual');
  if(!m){el.innerHTML='<div class="visual-placeholder"><span>SELECT A MODEL</span><b>Vehicle preview</b></div>';return}
  const src=VEHICLE_IMAGES[m];
  if(src){
    el.innerHTML=`<div class="vehicle-photo"><img src="${src}" alt="${esc(m)} vehicle"><div class="vehicle-photo-overlay"><strong>${esc(m)}</strong><small>Model selected</small></div></div>`;
  }else{
    el.innerHTML=`<div class="vehicle-art"><div class="vehicle-glow"></div><div class="vehicle-shape"></div><div class="vehicle-label">${esc(m)}</div><small>Model selected</small></div>`;
  }
}
function showAnnouncement(){if(!state.announcements.length)return;const now=new Date();const a=state.announcements.find(x=>new Date(x.starts_at)<=now&&(!x.ends_at||new Date(x.ends_at)>=now));if(!a)return;const key='rukmani_seen_'+a.id;let show=true;if(a.display_frequency==='once_per_announcement'&&localStorage.getItem(key))show=false;if(a.display_frequency==='once_per_day'&&localStorage.getItem(key)===new Date().toISOString().slice(0,10))show=false;if(!show)return;$('announcementTitle').textContent=a.title;$('announcementMessage').textContent=a.message||'';if(a.image_url){$('announcementImage').src=a.image_url;$('announcementImage').hidden=false}else $('announcementImage').hidden=true;$('announcementBackdrop').hidden=false;const mark=()=>{if(a.display_frequency==='once_per_announcement')localStorage.setItem(key,'1');if(a.display_frequency==='once_per_day')localStorage.setItem(key,new Date().toISOString().slice(0,10));$('announcementBackdrop').hidden=true};$('closeAnnouncement').onclick=mark;$('closeAnnouncement2').onclick=mark}
loadMaster();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
