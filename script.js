const form = document.getElementById('unix-form');
const input = document.getElementById('unix');
const submit = document.getElementById('submit');
const message = document.getElementById('message');
const loginCard = document.getElementById('login-card');
const successCard = document.getElementById('success-card');
function showMessage(text, error = true) { message.textContent = text; message.className = 'message ' + (error ? 'error' : 'ok'); }
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const unix = input.value.trim();
  if (!unix) return;
  const { supabaseUrl, supabasePublishableKey } = window.WOC_CONFIG || {};
  if (!supabaseUrl || !supabasePublishableKey || supabaseUrl.includes('PASTE_') || supabasePublishableKey.includes('PASTE_')) {
    showMessage('The website is not connected to Supabase yet. Ask the administrator to configure it.'); return;
  }
  submit.disabled = true;
  submit.textContent = 'Checking unix…';
  showMessage('', false);
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/validate-unix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabasePublishableKey },
      body: JSON.stringify({ unix })
    });
    if (response.status === 429) { showMessage('Too many attempts. Please try again later.'); return; }
    if (!response.ok) throw new Error('Validation service unavailable');
    const result = await response.json();
    if (result.valid === true) { loginCard.hidden = true; successCard.hidden = false; input.value = ''; }
    else showMessage('Unix not recognised. Please check it and try again.');
  } catch (_) { showMessage('Unable to check your unix right now. Please try again later.'); }
  finally { submit.disabled = false; submit.innerHTML = 'Access ballot <span aria-hidden="true">→</span>'; }
});
document.getElementById('back').addEventListener('click', () => { successCard.hidden = true; loginCard.hidden = false; showMessage('', false); input.focus(); });
