const state = { sales: [] };

const modelEl = document.getElementById('model');
const variantEl = document.getElementById('variant');
const addBtn = document.getElementById('addBtn');
const preview = document.getElementById('preview');

const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');

const models = [...new Set(INCENTIVES.map(x => x.model))];

models.forEach(model => {
  const o = document.createElement('option');
  o.value = model; o.textContent = model;
  modelEl.appendChild(o);
});

modelEl.addEventListener('change', () => {
  variantEl.innerHTML = '<option value="">Select variant</option>';
  variantEl.disabled = !modelEl.value;
  addBtn.disabled = true;
  preview.hidden = true;

  if (!modelEl.value) return;

  INCENTIVES.filter(x => x.model === modelEl.value).forEach(item => {
    const o = document.createElement('option');
    o.value = item.variant; o.textContent = item.variant;
    variantEl.appendChild(o);
  });
});

variantEl.addEventListener('change', () => {
  const item = getSelected();
  const valid = !!item;
  addBtn.disabled = !valid;
  preview.hidden = !valid;
  if (valid) {
    document.getElementById('pMain').textContent = money(item.main);
    document.getElementById('pStep').textContent = money(item.stepUp);
    document.getElementById('pSpot1').textContent = money(item.spot1);
    document.getElementById('pSpot2').textContent = money(item.spot2);
    document.getElementById('pTotal').textContent = money(item.main + item.stepUp + item.spot1 + item.spot2);
  }
});

function getSelected() {
  return INCENTIVES.find(x => x.model === modelEl.value && x.variant === variantEl.value);
}

addBtn.addEventListener('click', () => {
  const item = getSelected();
  if (!item) return;
  state.sales.push({...item, id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()});
  render();
  modelEl.value = '';
  variantEl.innerHTML = '<option value="">Select model first</option>';
  variantEl.disabled = true;
  addBtn.disabled = true;
  preview.hidden = true;
});

function removeSale(id) {
  state.sales = state.sales.filter(x => x.id !== id);
  render();
}

function render() {
  const total = state.sales.reduce((sum, x) => sum + x.main + x.stepUp + x.spot1 + x.spot2, 0);
  document.getElementById('grandTotal').textContent = money(total);
  document.getElementById('vehicleCount').textContent = state.sales.length;
  document.getElementById('countLabel').textContent = state.sales.length;

  const list = document.getElementById('salesList');
  if (!state.sales.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">—</div><div>No vehicles added yet this month</div></div>';
    document.getElementById('breakdownSection').hidden = true;
    return;
  }

  list.innerHTML = state.sales.map((x, i) => {
    const vTotal = x.main + x.stepUp + x.spot1 + x.spot2;
    return `<div class="sale">
      <div><div class="sale-model">${escapeHtml(x.model)}</div>
      <div class="sale-variant">${escapeHtml(x.variant)}</div></div>
      <div class="sale-right"><div class="sale-amount">${money(vTotal)}</div>
      <button class="remove" onclick="removeSale('${x.id}')">Remove</button></div>
    </div>`;
  }).join('');

  const main = state.sales.reduce((s,x)=>s+x.main,0);
  const step = state.sales.reduce((s,x)=>s+x.stepUp,0);
  const s1 = state.sales.reduce((s,x)=>s+x.spot1,0);
  const s2 = state.sales.reduce((s,x)=>s+x.spot2,0);

  document.getElementById('breakdown').innerHTML = `
    <div><span>Main incentive</span><strong>${money(main)}</strong></div>
    <div><span>Step-up incentive</span><strong>${money(step)}</strong></div>
    <div><span>Spot incentive 1</span><strong>${money(s1)}</strong></div>
    <div><span>Spot incentive 2</span><strong>${money(s2)}</strong></div>
    <div class="gold"><span>Total incentive</span><strong>${money(total)}</strong></div>`;
  document.getElementById('breakdownSection').hidden = false;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

render();
