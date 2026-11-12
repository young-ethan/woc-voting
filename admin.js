import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg = window.WOC_CONFIG || {};
const $ = id => document.getElementById(id);
const status = text => { $('status').textContent = text; };
if (!/^https:\/\//.test(cfg.supabaseUrl || '') || !cfg.supabasePublishableKey) throw new Error('Configure config.js first');
const supabase = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
let session = null;
let registeredUnixes = [];
function show(value){session=value;$('auth-panel').hidden=!!value;$('dashboard').hidden=!value;if(value)refresh();else{registeredUnixes=[];renderUnixList();}}
async function call(action,extra={}) {
  const {data:{session:current}}=await supabase.auth.getSession();
  if(!current){show(null);throw Error('Please sign in again.');}
  const response=await fetch(`${cfg.supabaseUrl.replace(/\/$/,'')}/functions/v1/manage-unixes`,{
    method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabasePublishableKey,'Authorization':`Bearer ${current.access_token}`},body:JSON.stringify({action,...extra})
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||`Request failed (${response.status})`);
  return body;
}
function renderUnixList(){
  const term=$('unix-search').value.trim().toLowerCase();
  const filtered=registeredUnixes.filter(unix=>unix.toLowerCase().includes(term));
  $('unix-list-status').textContent=`${filtered.length} of ${registeredUnixes.length} unixes shown`;
  const tbody=$('unix-list');tbody.replaceChildren();
  for(const unix of filtered){
    const tr=document.createElement('tr'),name=document.createElement('td'),action=document.createElement('td'),button=document.createElement('button');
    name.textContent=unix;button.type='button';button.textContent='Remove';button.className='danger';
    button.onclick=async()=>{if(!confirm(`Remove unix ${unix}?`))return;button.disabled=true;try{await call('remove',{unix});await refresh();status(`Unix ${unix} removed.`);}catch(e){status(e.message);button.disabled=false;}};
    action.appendChild(button);tr.append(name,action);tbody.appendChild(tr);
  }
}
async function refresh(){try{const data=await call('list');registeredUnixes=data.unixes||[];$('count').textContent=`${data.count??registeredUnixes.length} registered unixes`;renderUnixList();status('');}catch(e){status(e.message);$('unix-list-status').textContent='Unable to load registered unixes.';}}
$('unix-search').addEventListener('input',renderUnixList);
$('login-form').addEventListener('submit',async e=>{e.preventDefault();status('Signing in…');const {data,error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){status(error.message);return;}$('password').value='';show(data.session);});
$('signout').onclick=async()=>{await supabase.auth.signOut();show(null);status('Signed out.');};
$('refresh').onclick=refresh;
$('single-form').onsubmit=async e=>{e.preventDefault();try{await call('add',{unixes:[$('single').value.trim()]});$('single').value='';await refresh();status('Unix added.');}catch(e){status(e.message);}};
const {data:{session:initial}}=await supabase.auth.getSession();show(initial);
