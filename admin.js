let sb=null,parsedItems=[];
const $=id=>document.getElementById(id),status=(id,t)=>$(id).textContent=t;
function configured(){return window.supabase&&window.SUPABASE_URL&&!window.SUPABASE_URL.startsWith('YOUR_')&&window.SUPABASE_PUBLISHABLE_KEY&&!window.SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_')}
async function boot(){if(!configured()){status('loginStatus','First configure supabase-config.js with your Project URL and Publishable key.');return}sb=supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);const {data:{session}}=await sb.auth.getSession();if(session)showPanel()}
$('loginBtn').onclick=async()=>{if(!configured())return status('loginStatus','Supabase is not configured yet.');const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return status('loginStatus','Login failed: '+error.message);showPanel()};
$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
async function showPanel(){$('loginCard').hidden=true;$('panel').hidden=false;loadStatus()}
function num(v){const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
function normal(s){return String(s??'').trim().toLowerCase().replace(/\s+/g,' ')}
function parseExcelFile(f){
 return f.arrayBuffer().then(buf=>{
  const wb=XLSX.read(buf,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});
  let header=-1,map=[];
  for(let i=0;i<Math.min(rows.length,40);i++){const r=rows[i].map(normal);if(r.includes('model')&&r.includes('variant')){header=i;map=r;break}}
  if(header<0)throw Error('Could not find Model and Variant columns.');
  const modelCol=map.indexOf('model'),variantCol=map.indexOf('variant');
  const mainCols=map.map((h,i)=>({h,i})).filter(x=>x.i!==modelCol&&x.i!==variantCol&&x.h&&x.h.includes('incentive')&&!x.h.includes('spot')&&!x.h.includes('step')&&!x.h.includes('total'));
  const spotCols=map.map((h,i)=>({h,i})).filter(x=>x.i!==modelCol&&x.i!==variantCol&&x.h&&x.h.includes('spot'));
  if(!mainCols.length&&!spotCols.length)throw Error('No Main Incentive or Spot Incentive columns found.');
  let model='',items=[];
  for(const row of rows.slice(header+1)){
   if(row[modelCol]!=null&&String(row[modelCol]).trim())model=String(row[modelCol]).trim();
   const variant=row[variantCol]!=null?String(row[variantCol]).trim():'';
   if(!variant)continue;
   const mains=mainCols.map(x=>num(row[x.i])),spots=spotCols.map(x=>num(row[x.i]));
   items.push({model,variant,main_incentives:mains,spot_incentives:spots,incentive:mains[0]||0,spot1:spots[0]||0,spot2:spots[1]||0});
  }
  if(!items.length)throw Error('No variant rows found.');
  return {items,mainCount:mainCols.length,spotCount:spotCols.length,mainHeaders:mainCols.map(x=>x.h),spotHeaders:spotCols.map(x=>x.h)};
 })
}
function showPreview(p){$('excelPreview').textContent=`Detected ${p.items.length} variants\nMain incentive columns: ${p.mainCount}\nSpot incentive columns: ${p.spotCount}\n\nMain: ${p.mainHeaders.join(' | ')||'None'}\nSpot: ${p.spotHeaders.join(' | ')||'None'}`}
$('excel').addEventListener('change',async()=>{const f=$('excel').files[0];if(!f){parsedItems=[];return}try{const p=await parseExcelFile(f);parsedItems=p.items;showPreview(p);status('publishStatus','Excel ready to publish.')}catch(e){parsedItems=[];status('publishStatus','Error: '+e.message)}});
$('publishBtn').onclick=async()=>{
 const month=$('month').value.trim(),f=$('excel').files[0];
 if(!f||!month)return status('publishStatus','Select an Excel file and enter the month label.');
 try{
  if(!parsedItems.length){const p=await parseExcelFile(f);parsedItems=p.items;showPreview(p)}
  const enabled=$('stepEnabled').checked,tiers=enabled?[1,2,3,4,5].map(i=>num($('step'+i).value)):[];
  if(enabled&&!tiers.some(v=>v>0))return status('publishStatus','Step-Up is enabled, but all tiers are zero. Turn it off or enter tier values.');
  status('publishStatus',`Publishing ${parsedItems.length} variants…`);
  const {data:id,error}=await sb.rpc('publish_incentive_scheme_v2',{p_month:month,p_items:parsedItems,p_step_up_enabled:enabled,p_step_up_tiers:tiers});
  if(error)throw error;
  status('publishStatus',`✅ Published ${month}\n${parsedItems.length} variants\nMain incentive columns: ${parsedItems[0].main_incentives.length}\nSpot incentive columns: ${parsedItems[0].spot_incentives.length}\nStep-Up: ${enabled?'ON':'OFF'}\nScheme ID: ${id}`);
  loadStatus();
 }catch(e){status('publishStatus','Error: '+e.message)}
};
$('announceBtn').onclick=async()=>{try{const title=$('aTitle').value.trim(),message=$('aMessage').value.trim();if(!title)throw Error('Enter a title.');const starts_at=$('aStart').value?new Date($('aStart').value).toISOString():new Date().toISOString();const ends_at=$('aEnd').value?new Date($('aEnd').value).toISOString():null;const {error}=await sb.from('announcements').insert({title,message,image_url:$('aImage').value.trim()||null,starts_at,ends_at,display_frequency:$('aFreq').value,is_active:true});if(error)throw error;status('announceStatus','✅ Announcement published.');loadStatus()}catch(e){status('announceStatus','Error: '+e.message)}};
async function loadStatus(){const {data:s,error:se}=await sb.from('incentive_schemes').select('month_label,published_at').eq('is_published',true).order('published_at',{ascending:false}).limit(1).maybeSingle();const {data:a,error:ae}=await sb.from('announcements').select('title,is_active,starts_at,ends_at').order('created_at',{ascending:false}).limit(10);if(se||ae){$('currentStatus').textContent='Unable to load status. Check your admin role and Supabase policies.';return}$('currentStatus').textContent=`Published scheme: ${s?.month_label||'None'}\nPublished: ${s?.published_at?new Date(s.published_at).toLocaleString('en-IN'):'—'}\n\nRecent announcements:\n${(a||[]).map(x=>`• ${x.title} — ${x.is_active?'enabled':'disabled'}`).join('\n')||'None'}`}
boot();
