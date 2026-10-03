const $ = id => document.getElementById(id);
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

const state = { sales: [], announcements: [] };
const model = $('model');
const variant = $('variant');
const bookingDate = $('bookingDate');

/* October 2026 RM scheme — potential earning calculator only. */
const OCT_SCHEME = {
  minCars: 4,
  zeroGVReduction: 0.25,
  ew: 300,
  bookingSpot: 600,
  financeSpot: 1200,
  bookingSpotModels: ['NEW BALENO', 'Fronx', 'GRAND VITARA', 'XL6'],
  gna: [
    { min: 40000, max: 50000, label: '₹40,000–₹50,000', incentive: 1200 },
    { min: 50000, max: 60000, label: '₹50,000–₹60,000', incentive: 2000 },
    { min: 60000, max: Infinity, label: '₹60,000+', incentive: 4000 }
  ],
  nonGV: {
    'NEW BALENO': { cng: [500, 750, 1000, 1500], petrol: [1250, 1500, 2500, 3000] },
    'Fronx': { cng: [500, 750, 1000, 1500], petrol: [1250, 1500, 2500, 3000], turbo: [5000] },
    'XL6': { all: [3000] },
    'JIMNY': { all: [5000] },
    'INVICTO': { all: [10000] },
    'E-VITARA': { all: [7000] }
  },
  exchange: { 'NEW BALENO': 750, 'Fronx': 500, 'XL6': 1000, 'JIMNY': 1000, 'INVICTO': 3000, 'E-VITARA': 2500 },
  gvStep: { petrol: [5000, 6000], cng: [2000, 3000] },
  gvHigh: 4000,
  gvStrongHybrid: 5000,
  booking: {
    pre: [0, 1500, 3000, 5000, 1500],
    navratri: [0, 750, 1500, 2500, 750]
  }
};

const ALLOWED_MODELS = ['NEW BALENO', 'Fronx', 'GRAND VITARA', 'XL6', 'JIMNY', 'INVICTO', 'E-VITARA'];

function selectedPeriod() {
  const raw = bookingDate.value || '2026-10-01';
  const d = new Date(`${raw}T12:00:00`);
  if (d.getDate() <= 10) return { key: 'pre', name: 'PRE-NAVRATRI BONANZA', range: '1–10 October 2026', short: 'PRE-NAVRATRI • 1–10 OCT', booking: OCT_SCHEME.booking.pre };
  return { key: 'navratri', name: 'NAVRATRI BOOKING BONANZA', range: '11–31 October 2026', short: 'NAVRATRI • 11–31 OCT', booking: OCT_SCHEME.booking.navratri };
}

function updateSchemeUI() {
  const s = selectedPeriod();
  $('schemeBadge').innerHTML = `${s.name}<span>${s.range}</span>`;
  $('promoPeriod').textContent = s.short;
  $('monthPill').textContent = 'October 2026';
}

function fuelType(x) {
  const v = String(x.variant || '').toUpperCase();
  if (x.model === 'NEW BALENO' || x.model === 'Fronx' || x.model === 'GRAND VITARA') {
    if (v.includes('CNG')) return 'cng';
    if (v.includes('TURBO')) return 'turbo';
    return 'petrol';
  }
  return 'all';
}
function groupKey(x) {
  if (x.model === 'NEW BALENO') return `NEW BALENO-${fuelType(x)}`;
  if (x.model === 'Fronx') return `Fronx-${fuelType(x)}`;
  return x.model;
}
function groupPosition(x) {
  const index = state.sales.findIndex(s => s.id === x.id);
  if (index < 0) return state.sales.filter(s => groupKey(s) === groupKey(x)).length;
  return state.sales.slice(0, index).filter(s => groupKey(s) === groupKey(x)).length;
}
function gvPosition(x) {
  const fuel = fuelType(x);
  const index = state.sales.findIndex(s => s.id === x.id);
  const isSameGVFuel = s => s.model === 'GRAND VITARA' && fuelType(s) === fuel;
  if (index < 0) return state.sales.filter(isSameGVFuel).length;
  return state.sales.slice(0, index).filter(isSameGVFuel).length;
}
function gvCount() { return state.sales.filter(s => s.model === 'GRAND VITARA').length; }
function isGVHigh(x) {
  if (x.model !== 'GRAND VITARA') return false;
  const v = String(x.variant || '').toUpperCase();
  /* High Variant Incentive is only for the sunroof (O) variants. */
  return v.includes('(O)');
}
function isGVStrongHybrid(x) {
  if (x.model !== 'GRAND VITARA') return false;
  const v = String(x.variant || '').toUpperCase();
  return v.includes('STRONG HYBRID') || v.includes('DELTA+') || v.includes('ZETA+') || v.includes('ALPHA+');
}
function modelIncentive(x) {
  if (x.model === 'GRAND VITARA') return 0;
  const rule = OCT_SCHEME.nonGV[x.model];
  if (!rule) return 0;
  const arr = rule[fuelType(x)] || rule.all || [0];
  const position = groupPosition(x);
  return arr[Math.min(position, arr.length - 1)] || 0;
}
function gvStep(x) {
  if (x.model !== 'GRAND VITARA') return 0;
  /* Step-Up is based on the vehicle's fuel type and the GV count:
     Petrol: 1st GV ₹5,000; 2nd onward ₹6,000 each.
     CNG: 1st GV ₹2,000; 2nd onward ₹3,000 each. */
  const arr = OCT_SCHEME.gvStep[fuelType(x)] || OCT_SCHEME.gvStep.petrol;
  return arr[gvPosition(x) === 0 ? 0 : 1] || 0;
}
function gvAdditional(x) {
  if (x.model !== 'GRAND VITARA') return 0;
  /* Additional GV incentives stack independently:
     (O) Sunroof +₹4,000 and (+) Strong Hybrid +₹5,000.
     Therefore (+)(O) receives both = +₹9,000. */
  const strongHybrid = isGVStrongHybrid(x) ? OCT_SCHEME.gvStrongHybrid : 0;
  const highVariant = isGVHigh(x) ? OCT_SCHEME.gvHigh : 0;
  return strongHybrid + highVariant;
}
function exchangeBonus(x) {
  /* October exchange incentive: Fronx Turbo ₹1,000; other Fronx variants ₹500. */
  if (x.model === 'Fronx') return fuelType(x) === 'turbo' ? 1000 : 500;
  return OCT_SCHEME.exchange[x.model] || 0;
}
function gnaInfo(value) {
  const n = Number(value || 0);
  return OCT_SCHEME.gna.find(row => n >= row.min && n < row.max) || null;
}
function bookingBonus(count) {
  if (count < 2) return 0;
  const values = selectedPeriod().booking;
  if (count >= 5) return count * values[4];
  return values[count - 1] || 0;
}
function bookingSpotEligible(x) {
  /* Creative says Petrol Models Only. CNG is excluded; XL6 is petrol-only,
     and Fronx Turbo is also petrol-powered. */
  return OCT_SCHEME.bookingSpotModels.includes(x.model) && fuelType(x) !== 'cng';
}
function financeSpotBonus(x) {
  return x.finance === 'Mahindra Finance' || x.finance === 'Chola Finance' ? OCT_SCHEME.financeSpot : 0;
}
function bookingSpotBonus(x) {
  return bookingSpotEligible(x) ? OCT_SCHEME.bookingSpot : 0;
}
function spotDescription(x) {
  const parts = [];
  if (bookingSpotBonus(x)) parts.push('Booking Spot ₹600');
  if (financeSpotBonus(x)) parts.push(`${x.finance} ₹1,200`);
  return parts.join(' + ') || '—';
}
function vehicleCalc(x) {
  const base = modelIncentive(x), step = gvStep(x), gvAdd = gvAdditional(x);
  const exchange = x.exchange ? exchangeBonus(x) : 0;
  const ew = x.ew ? OCT_SCHEME.ew : 0;
  const gna = gnaInfo(x.gnaValue)?.incentive || 0;
  const bookingSpot = bookingSpotBonus(x);
  const financeSpot = financeSpotBonus(x);
  return { base, step, gvAdd, exchange, ew, gna, bookingSpot, financeSpot, total: base + step + gvAdd + exchange + ew + gna + bookingSpot + financeSpot };
}

function qualification() {
  const totalCars = state.sales.length;
  const gvCars = gvCount();
  if (totalCars < OCT_SCHEME.minCars) return { eligible: false, deduction: false, locked: true, message: `${OCT_SCHEME.minCars - totalCars} more vehicle${OCT_SCHEME.minCars - totalCars === 1 ? '' : 's'} required to unlock calculation.` };
  if (gvCars === 0) return { eligible: true, deduction: true, locked: false, message: '4+ vehicles achieved, but ZERO Grand Vitara retail is present. 25% deduction applies.' };
  return { eligible: true, deduction: false, locked: false, message: `Qualification fulfilled: ${totalCars} vehicles including ${gvCars} Grand Vitara. No 25% deduction.` };
}

function grossTotals() {
  const q = qualification();
  let modelTotal = 0, stepTotal = 0, gvAdditional = 0, allied = 0, bookingSpotTotal = 0, financeSpotTotal = 0;
  state.sales.forEach(x => {
    const c = vehicleCalc(x);
    modelTotal += c.base;
    stepTotal += c.step;
    gvAdditional += c.gvAdd;
    allied += c.exchange + c.ew + c.gna;
    bookingSpotTotal += c.bookingSpot;
    financeSpotTotal += c.financeSpot;
  });
  const spotTotal = bookingSpotTotal + financeSpotTotal;
  if (q.locked) return { modelTotal: 0, stepTotal: 0, gvAdditional: 0, allied: 0, bookingSpotTotal, financeSpotTotal, booking: 0, qualifyingGross: 0, gross: spotTotal, locked: true };
  const booking = bookingBonus(state.sales.length);
  const qualifyingGross = modelTotal + stepTotal + gvAdditional + allied + booking;
  return { modelTotal, stepTotal, gvAdditional, allied, bookingSpotTotal, financeSpotTotal, booking, qualifyingGross, gross: qualifyingGross + spotTotal, locked: false };
}

function renderTiers() {
  $('scheme').hidden = false;
  const q = qualification();
  if (q.locked) {
    $('tiers').innerHTML = `<div class="tier"><small>Qualification lock</small><b>${OCT_SCHEME.minCars - state.sales.length} more vehicle${OCT_SCHEME.minCars - state.sales.length === 1 ? '' : 's'}</b></div>`;
    $('nextMilestone').textContent = `${OCT_SCHEME.minCars - state.sales.length} more vehicle${OCT_SCHEME.minCars - state.sales.length === 1 ? '' : 's'}`;
    return;
  }
  const groups = {};
  state.sales.forEach(x => groups[groupKey(x)] = (groups[groupKey(x)] || 0) + 1);
  $('tiers').innerHTML = Object.entries(groups).map(([key, count]) => {
    const step = state.sales.filter(x => groupKey(x) === key).reduce((sum, x) => sum + vehicleCalc(x).step, 0);
    return `<div class="tier active"><small>${esc(key.replace('NEW BALENO-', 'Baleno ').replace('Fronx-', 'Fronx '))} • ${count} car${count > 1 ? 's' : ''}</small><b>${money(step)}</b></div>`;
  }).join('');
  $('nextMilestone').textContent = money(bookingBonus(state.sales.length + 1) - bookingBonus(state.sales.length));
}

function render() {
  const q = qualification(), t = grossTotals();
  const deductionAmount = q.deduction ? t.qualifyingGross * OCT_SCHEME.zeroGVReduction : 0;
  const qualifiedFinal = q.eligible ? Math.round(t.qualifyingGross - deductionAmount) : 0;
  const finalTotal = qualifiedFinal + t.bookingSpotTotal + t.financeSpotTotal;
  $('grandTotal').textContent = money(finalTotal);
  $('headTotal').textContent = money(finalTotal);
  $('vehicleCount').textContent = state.sales.length;
  $('countText').textContent = `${state.sales.length} ${state.sales.length === 1 ? 'vehicle' : 'vehicles'}`;
  $('statusText').textContent = q.locked ? `ADD ${OCT_SCHEME.minCars} VEHICLES` : (q.deduction ? '25% DEDUCTION' : 'QUALIFIED');
  $('sumMain').textContent = money(t.modelTotal + t.gvAdditional);
  $('sumStep').textContent = money(t.stepTotal);
  $('sumAllied').textContent = money(t.allied);
  $('sumBookingSpot').textContent = money(t.bookingSpotTotal);
  $('sumFinanceSpot').textContent = money(t.financeSpotTotal);
  $('sumBooking').textContent = money(t.booking);
  $('sumTotal').textContent = money(finalTotal);
  const bookingTop = $('sumBookingTop');
  if (bookingTop) bookingTop.textContent = money(t.booking);
  const bookingPeriodText = $('bookingPeriodText');
  if (bookingPeriodText) bookingPeriodText.textContent = selectedPeriod().short;
  $('emptyTable').style.display = state.sales.length ? 'none' : 'block';
  $('summary').hidden = !state.sales.length;

  const dl = $('deductionLine');
  if (!state.sales.length) dl.hidden = true;
  else {
    dl.hidden = false;
    dl.textContent = q.deduction
      ? `QUALIFYING INCENTIVES ${money(t.qualifyingGross)} → ZERO GV DEDUCTION (25%) -${money(deductionAmount)} → PLUS SPOT INCENTIVES ${money(t.bookingSpotTotal + t.financeSpotTotal)} → FINAL POTENTIAL ${money(finalTotal)}`
      : (state.sales.length < OCT_SCHEME.minCars ? `QUALIFICATION LOCKED: ${money(t.bookingSpotTotal + t.financeSpotTotal)} SPOT INCENTIVES SHOWN SEPARATELY (NOT SUBJECT TO 4-CAR QUALIFICATION)` : q.message);
  }
  const deductionSummary = $('deductionSummary');
  if (deductionSummary) {
    deductionSummary.hidden = !q.deduction || !state.sales.length;
    deductionSummary.textContent = q.deduction
      ? `NO GRAND VITARA: 25% deduction applied after total = -${money(deductionAmount)}`
      : '';
  }

  renderTiers();
  $('salesBody').innerHTML = state.sales.map((x, i) => {
    const c = vehicleCalc(x), locked = q.locked, gna = gnaInfo(x.gnaValue);
    return `<tr><td>${i + 1}</td><td class="model-name">${esc(x.model)}</td><td class="variant-name">${esc(x.variant)}</td><td>${x.exchange ? 'Yes' : 'No'}</td><td>${x.ew ? 'Yes' : 'No'}</td><td>${gna ? esc(gna.label) : '₹0'}</td><td class="spot-cell">${esc(spotDescription(x))}</td><td>${locked ? 'Qualification locked' : money(c.base + c.gvAdd + c.exchange + c.ew + c.gna + c.bookingSpot + c.financeSpot)}</td><td class="step">${locked ? 'Qualification locked' : money(c.step)}</td><td>${locked ? money(c.bookingSpot + c.financeSpot) + ' spot only' : money(c.total)}</td><td><button class="delete" data-id="${x.id}">×</button></td></tr>`;
  }).join('');
  document.querySelectorAll('.delete').forEach(btn => btn.onclick = () => removeSale(btn.dataset.id));
}

function renderPreview(x) {
  if (!x) { $('preview').hidden = true; return; }
  const temp = { ...x, exchange: $('exchange').value === 'Yes', ew: $('ew').value === 'Yes', gnaValue: Number($('gna').value || 0), bookingSpot: bookingSpotEligible(x), finance: $('financeSpot').value, id: '__preview__' };
  const q = qualification(), c = vehicleCalc(temp), gna = gnaInfo(temp.gnaValue);
  if (q.locked) $('preview').innerHTML = `<span>Qualification <b>${OCT_SCHEME.minCars - state.sales.length} more vehicle${OCT_SCHEME.minCars - state.sales.length === 1 ? '' : 's'} required</b></span><span>Incentive calculation <b>LOCKED</b></span>`;
  else $('preview').innerHTML = `<span>Model <b>${money(c.base)}</b></span><span>GV Additional <b>${money(c.gvAdd)}</b></span><span>Step-Up <b>${money(c.step)}</b></span><span>Exchange <b>${money(c.exchange)}</b></span><span>EW <b>${money(c.ew)}</b></span><span>GNA <b>${money(gna?.incentive || 0)}</b></span><span>Booking Spot <b>${money(c.bookingSpot)}</b></span><span>Finance Spot <b>${money(c.financeSpot)}</b></span>`;
  $('preview').hidden = false;
}

function renderModelVisual(m) {
  const el = $('modelVisual');
  if (!m) { el.innerHTML = '<div class="visual-placeholder"><span>SELECT A MODEL</span><b>Vehicle preview</b></div>'; return; }
  const src = ({ 'NEW BALENO': 'vehicle-images/Baleno.png', 'Fronx': 'vehicle-images/Fronx.png', 'GRAND VITARA': 'vehicle-images/GrandVitara.png', 'XL6': 'vehicle-images/XL6.png', 'INVICTO': 'vehicle-images/Invicto.png', 'JIMNY': 'vehicle-images/Jimny.png', 'E-VITARA': 'vehicle-images/eVitara.png' })[m];
  el.innerHTML = src ? `<div class="vehicle-photo"><img src="${src}" alt="${esc(m)} vehicle"><div class="vehicle-photo-overlay"><strong>${esc(m)}</strong><small>Model selected</small></div></div>` : `<div class="vehicle-art"><div class="vehicle-shape"></div><div class="vehicle-label">${esc(m)}</div><small>Model selected</small></div>`;
}
function resetSelector() {
  model.value = ''; variant.innerHTML = '<option value="">Select variant</option>'; variant.disabled = true; $('addBtn').disabled = true; $('preview').hidden = true;
  $('exchange').value = 'No'; $('ew').value = 'No'; $('gna').value = '0'; $('financeSpot').value = 'No'; renderModelVisual('');
}
function removeSale(id) { state.sales = state.sales.filter(s => s.id !== id); render(); }

function init() {
  updateSchemeUI();
  model.innerHTML = '<option value="">Select model</option>';
  const source = Array.isArray(window.INCENTIVES) ? window.INCENTIVES : [];
  ALLOWED_MODELS.forEach(m => {
    if (!source.some(x => x.model === m)) return;
    const option = document.createElement('option'); option.value = m; option.textContent = m === 'E-VITARA' ? 'eVitara' : m; model.appendChild(option);
  });
  render();
}

model.onchange = () => {
  variant.innerHTML = '<option value="">Select variant</option>'; variant.disabled = !model.value; $('addBtn').disabled = true;
  const source = Array.isArray(window.INCENTIVES) ? window.INCENTIVES : [];
  if (model.value) source.filter(x => x.model === model.value).forEach(x => { const option = document.createElement('option'); option.value = x.variant; option.textContent = x.variant; variant.appendChild(option); });
  const sourceVariant = source.find(item => item.model === model.value);
  const modelEligible = OCT_SCHEME.bookingSpotModels.includes(model.value);
  const petrolEligible = sourceVariant ? fuelType(sourceVariant) !== 'cng' : false;
  const spotEligible = modelEligible && petrolEligible;
  renderModelVisual(model.value); renderPreview(null);
};
variant.onchange = () => {
  const source = Array.isArray(window.INCENTIVES) ? window.INCENTIVES : [];
  const x = source.find(item => item.model === model.value && item.variant === variant.value);
  const spotEligible = x ? bookingSpotEligible(x) : false;
  $('addBtn').disabled = !x; renderPreview(x);
};
['exchange', 'ew', 'gna', 'financeSpot'].forEach(id => $(id).onchange = () => {
  const source = Array.isArray(window.INCENTIVES) ? window.INCENTIVES : [];
  const x = source.find(item => item.model === model.value && item.variant === variant.value); renderPreview(x);
});
function applyBookingDate(){ if(!bookingDate.value) return; updateSchemeUI(); render(); }
bookingDate.addEventListener('change', applyBookingDate);
bookingDate.addEventListener('input', applyBookingDate);
$('addBtn').onclick = () => {
  const source = Array.isArray(window.INCENTIVES) ? window.INCENTIVES : [];
  const x = source.find(item => item.model === model.value && item.variant === variant.value); if (!x) return;
  state.sales.push({ model: x.model, variant: x.variant, exchange: $('exchange').value === 'Yes', ew: $('ew').value === 'Yes', gnaValue: Number($('gna').value || 0), bookingSpot: bookingSpotEligible(x), finance: $('financeSpot').value, id: String(Date.now() + Math.random()) });
  resetSelector(); render();
};
$('resetBtn').onclick = () => { if (!state.sales.length || confirm('Clear all vehicles from this opportunity?')) { state.sales = []; resetSelector(); render(); } };
function showAnnouncement() { return; }
init();
