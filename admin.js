import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg = window.WOC_CONFIG || {};
const $ = id => document.getElementById(id);
const status = text => { $('status').textContent = text; };
if (!/^https:\/\//.test(cfg.supabaseUrl || '') || !cfg.supabasePublishableKey) throw Error('Configure config.js first');
const supabase = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
let registeredUnixes = [], candidates = [], randomOrder = [];
function show(value) {
  $('auth-panel').hidden = !!value;
  $('dashboard').hidden = !value;
  if (value) refreshAll();
  else { registeredUnixes = []; candidates = []; randomOrder = []; renderUnixList(); renderCandidates(); }
}
async function callFunction(fn, action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { show(null); throw Error('Please sign in again.'); }
  const response = await fetch(`${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': cfg.supabasePublishableKey, 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(body.error || `Request failed (${response.status})`);
  return body;
}
const call = (action, extra) => callFunction('manage-unixes', action, extra);
const candidateCall = (action, extra) => callFunction('manage-candidates', action, extra);
function renderUnixList() {
  const term = $('unix-search').value.trim().toLowerCase();
  const filtered = registeredUnixes.filter(unix => unix.toLowerCase().includes(term));
  $('unix-list-status').textContent = `${filtered.length} of ${registeredUnixes.length} unixes shown`;
  const tbody = $('unix-list'); tbody.replaceChildren();
  for (const unix of filtered) {
    const tr = document.createElement('tr'), name = document.createElement('td'), action = document.createElement('td'), button = document.createElement('button');
    name.textContent = unix; button.type = 'button'; button.textContent = 'Remove'; button.className = 'danger';
    button.onclick = async () => {
      if (!confirm(`Remove unix ${unix}?`)) return;
      button.disabled = true;
      try { await call('remove', { unix }); await refreshUnixes(); status(`Unix ${unix} removed.`); }
      catch (e) { status(e.message); button.disabled = false; }
    };
    action.appendChild(button); tr.append(name, action); tbody.appendChild(tr);
  }
}
async function refreshUnixes() {
  const data = await call('list'); registeredUnixes = data.unixes || [];
  $('count').textContent = String(data.count ?? registeredUnixes.length);
  renderUnixList();
}
function setSeats(value) {
  const n = Math.max(1, Math.min(100, Math.round(Number(value) || 1)));
  $('seats').value = String(n); $('seats-display').textContent = String(n);
  $('seats-minus').disabled = n <= 1; $('seats-plus').disabled = n >= 100;
  $('seats-feedback').textContent = 'Unsaved changes';
}
function shuffleCandidates() {
  const previous = randomOrder.join('|'), ids = candidates.map(c => c.id);
  for (let attempt = 0; attempt < 8; attempt++) {
    randomOrder = [...ids];
    for (let i = randomOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomOrder[i], randomOrder[j]] = [randomOrder[j], randomOrder[i]];
    }
    if (randomOrder.join('|') !== previous) break;
  }
  if (ids.length > 1 && randomOrder.join('|') === previous) randomOrder.reverse();
  renderCandidates();
}
async function refreshCandidates() {
  const data = await candidateCall('list'); candidates = data.candidates || [];
  $('candidate-total').textContent = String(candidates.length);
  setSeats(data.seats ?? 10); $('seats-feedback').textContent = 'Saved value loaded';
  shuffleCandidates();
}
async function refreshAll() {
  status('Loading…');
  const results = await Promise.allSettled([refreshUnixes(), refreshCandidates()]);
  const errors = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
  status(errors.join(' | '));
}
function resetCandidateForm() {
  $('candidate-form').reset(); $('candidate-id').value = '';
  $('candidate-save').textContent = 'Add candidate'; $('candidate-cancel').hidden = true;
}
function makeButton(text, fn, cls = 'secondary') {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.className = cls; b.onclick = fn; return b;
}
function renderCandidates() {
  const term = $('candidate-search').value.trim().toLowerCase(), order = $('candidate-order').value;
  const items = [...candidates].filter(c => (c.name + ' ' + c.profile).toLowerCase().includes(term));
  if (order === 'alphabetical') items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  else {
    const indices = new Map(randomOrder.map((id, i) => [id, i]));
    items.sort((a, b) => (indices.get(a.id) ?? Infinity) - (indices.get(b.id) ?? Infinity));
  }
  $('reshuffle').hidden = order !== 'random';
  $('candidate-count').textContent = `${items.length} of ${candidates.length} candidates shown`;
  const root = $('candidate-list'); root.replaceChildren();
  if (!items.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'No candidates to display.'; root.append(p); }
  for (const c of items) {
    const card = document.createElement('article'); card.className = 'candidate-card';
    const h = document.createElement('h3'); h.textContent = c.name;
    const p = document.createElement('p'); p.textContent = c.profile;
    const actions = document.createElement('div'); actions.className = 'candidate-actions';
    actions.append(makeButton('Edit', () => {
      $('candidate-id').value = c.id; $('candidate-name').value = c.name; $('candidate-profile').value = c.profile;
      $('candidate-save').textContent = 'Save changes'; $('candidate-cancel').hidden = false; $('candidate-name').focus();
    }));
    actions.append(makeButton('Remove', async () => {
      if (!confirm(`Remove candidate ${c.name}?`)) return;
      try { await candidateCall('remove', { id: c.id }); await refreshCandidates(); status('Candidate removed.'); }
      catch (e) { status(e.message); }
    }, 'danger'));
    card.append(h, p, actions); root.append(card);
  }
}
$('unix-search').addEventListener('input', renderUnixList);
$('candidate-search').addEventListener('input', renderCandidates);
$('candidate-order').addEventListener('change', () => $('candidate-order').value === 'random' ? shuffleCandidates() : renderCandidates());
$('reshuffle').onclick = shuffleCandidates;
$('seats-minus').onclick = () => setSeats(Number($('seats').value) - 1);
$('seats-plus').onclick = () => setSeats(Number($('seats').value) + 1);
$('login-form').addEventListener('submit', async e => {
  e.preventDefault(); status('Signing in…');
  const button = $('login-form').querySelector('button'); button.disabled = true;
  try {
    const response = await fetch(`${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.supabasePublishableKey },
      body: JSON.stringify({ password: $('password').value })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(result.error || `Sign in failed (${response.status})`);
    const { data, error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
    if (error || !data.session) throw Error(error?.message || 'Could not start session');
    $('password').value = ''; status(''); show(data.session);
  } catch (error) { status(error.message); }
  finally { button.disabled = false; }
});
$('signout').onclick = async () => { await supabase.auth.signOut(); show(null); status('Signed out.'); };
$('refresh').onclick = refreshAll;
$('single-form').onsubmit = async e => {
  e.preventDefault();
  try { await call('add', { unixes: [$('single').value.trim()] }); $('single').value = ''; await refreshUnixes(); status('Unix added.'); }
  catch (error) { status(error.message); }
};
$('candidate-form').onsubmit = async e => {
  e.preventDefault(); const id = $('candidate-id').value;
  const name = $('candidate-name').value.trim(), profile = $('candidate-profile').value.trim();
  if (!name || !profile) return;
  try {
    await candidateCall(id ? 'update' : 'add', { ...(id ? { id } : {}), name, profile });
    resetCandidateForm(); await refreshCandidates(); status(id ? 'Candidate updated.' : 'Candidate added.');
  } catch (error) { status(error.message); }
};
$('candidate-cancel').onclick = resetCandidateForm;
$('seats-form').onsubmit = async e => {
  e.preventDefault(); const button = $('seats-save'); button.disabled = true;
  $('seats-feedback').textContent = 'Saving…';
  try { await candidateCall('seats', { seats: Number($('seats').value) }); $('seats-feedback').textContent = 'Saved successfully'; status('Board seat count saved.'); }
  catch (error) { $('seats-feedback').textContent = 'Could not save: ' + error.message; status(error.message); }
  finally { button.disabled = false; }
};
const { data: { session: initial } } = await supabase.auth.getSession(); show(initial);
