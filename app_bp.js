// Paste your Apps Script Web App URL here (ends in /exec)
const API_URL = 'https://script.google.com/macros/s/AKfycbzC2PV8-Kow3epN3VYXYzXFHiRsRakgHdmXmCFU1koF3Yq9s4aX4-chnsjthAzUH6XHFg/exec';

const $ = id => document.getElementById(id);
const esc = s => { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; };
const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2);

// streak graphic: 7 boys + the question mark
(function () {
  const row = $('streakRow');
  for (let i = 0; i < 7; i++) { const d = document.createElement('div'); d.className = 'boy-icon'; d.textContent = '♂'; row.appendChild(d); }
  const q = document.createElement('div'); q.className = 'boy-icon query'; q.textContent = '?'; row.appendChild(q);
})();

function setClosed(closed) {
  $('closedBanner').style.display = closed ? 'block' : 'none';
  $('submitBtn').disabled = closed;
  $('submitBtn').textContent = closed ? 'BETTING CLOSED' : 'SUBMIT SLIP';
}

async function checkStatus() {
  try {
    const res = await fetch(API_URL + '?t=' + Date.now(), { redirect: 'follow' });
    const data = await res.json();
    if (data.ok) setClosed(data.status !== 'open');
  } catch (e) { /* page still works; the server enforces open/closed on submit anyway */ }
}

async function postBet(bet) {
  // text/plain keeps this a "simple" request, so the browser skips the CORS preflight Apps Script can't answer
  const res = await fetch(API_URL, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(bet)
  });
  return res.json();
}

// combo leg preview
function refreshComboPreview() {
  $('cGenderVal').textContent = $('fGender').value;
  $('cTimeVal').textContent = $('fTime').value;
  $('cHairVal').textContent = $('fHair').value;
}
['fGender', 'fTime', 'fHair'].forEach(id => $(id).addEventListener('change', refreshComboPreview));
refreshComboPreview();

function receipt(bet) {
  const p = bet.picks;
  const line = (label, val, stake) => `<div class="payout-row"><span>${label}: <b>${esc(val || '—')}</b></span><span>${stake > 0 ? money(stake) : 'for fun'}</span></div>`;
  const total = Object.values(p).reduce((s, x) => s + x.stake, 0) + (bet.combo ? bet.combo.stake : 0);
  $('receipt').innerHTML = `<div class="results-card"><h4>Slip received for ${esc(bet.name)}</h4>
    ${line('Gender', p.gender.value, p.gender.stake)}
    ${line('Date', p.date.value, p.date.stake)}
    ${line('Weight', p.weight.value ? p.weight.value + ' lb' : '', p.weight.stake)}
    ${line('Time of day', p.time.value, p.time.stake)}
    ${line('Hair', p.hair.value, p.hair.stake)}
    ${bet.combo ? line('Combo (' + bet.combo.legs.join(' + ') + ')', 'stacked', bet.combo.stake) : ''}
    <div class="payout-row win"><span>Total staked</span><b>${money(total)} CAD</b></div>
    <div class="payout-row"><span>Screenshot this as your receipt.</span><span></span></div></div>`;
}

$('submitBtn').addEventListener('click', async () => {
  const msg = $('statusMsg');
  const fail = t => { msg.textContent = t; msg.className = 'status-msg err'; };
  const name = $('fName').value.trim();
  if (!name) return fail('Enter your name first.');
  const num = id => Number($(id).value) || 0;
  const picks = {
    gender: { value: $('fGender').value, stake: num('sGender') },
    date: { value: $('fDate').value, stake: num('sDate') },
    weight: { value: $('fWeight').value.trim(), stake: num('sWeight') },
    time: { value: $('fTime').value, stake: num('sTime') },
    hair: { value: $('fHair').value, stake: num('sHair') }
  };
  const legs = [];
  if ($('cGender').checked) legs.push('gender');
  if ($('cTime').checked) legs.push('time');
  if ($('cHair').checked) legs.push('hair');
  const comboStake = num('sCombo');
  if (comboStake > 0 && legs.length < 2) return fail('A combo needs at least 2 legs ticked.');
  const bet = { name, picks, combo: comboStake > 0 ? { legs, stake: comboStake } : null };

  $('submitBtn').disabled = true; $('submitBtn').textContent = 'SAVING…';
  let ok = false;
  try {
    const res = await postBet(bet);
    if (!res.ok) throw new Error(res.error || 'save failed');
    ok = true;
    msg.textContent = 'Saved. Good luck, ' + name + '.'; msg.className = 'status-msg ok';
    receipt(bet);
  } catch (e) {
    fail(String(e.message || e) + ' (your slip was NOT saved)');
  }
  $('submitBtn').disabled = false; $('submitBtn').textContent = 'SUBMIT SLIP';
  if (!ok) $('receipt').innerHTML = '';
  checkStatus();
});

if (API_URL.indexOf('PASTE_') === 0) {
  $('statusMsg').textContent = 'Setup incomplete: API_URL has not been set in app.js yet.';
  $('statusMsg').className = 'status-msg err';
} else {
  checkStatus();
}