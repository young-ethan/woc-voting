import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg = window.WOC_CONFIG || {};
const $ = id => document.getElementById(id);
const status = (text) => { $('status').textContent = text; };
if (!/^https:\/\//.test(cfg.supabaseUrl || '') || !cfg.supabasePublishableKey) throw new Error('Configure config.js first');
const supabase = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
let session = null;
function show(sessionValue){session=sessionValue;$('auth-panel').hidden=!!session;$('dashboard').hidden=!session;if(session) refresh();}
async function call(action, extra={}) {
  const {data:{session:current}} = await supabase.auth.getSession();
  if (!current) {show(null);throw Error('Please sign in again.');}
  const response = await fetch(`${cfg.supabaseUrl.replace(/\/$/,'')}/functions/v1/manage-unixes`,{
    method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabasePublishableKey,'Authorization':`Bearer ${current.access_token}`},body:JSON.stringify({action,...extra})
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw Error(body.error || `Request failed (${response.status})`);
  return body;
}
async function refresh(){try{const data=await call('count');$('count').textContent=`${data.count} registered unixes`;status('');}catch(e){status(e.message);}}
$('login-form').addEventListener('submit',async e=>{e.preventDefault();status('Signing in…');const {data,error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){status(error.message);return;}show(data.session);});
$('signout').onclick=async()=>{await supabase.auth.signOut();show(null);status('Signed out.');};
$('refresh').onclick=refresh;
function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';}else field+=c;}
  if(quoted)throw Error('CSV has an unclosed quote.');if(field||row.length){row.push(field);rows.push(row);}
  const first=rows[0]?.map(x=>x.trim().toLowerCase())||[];
  const column=first.indexOf('unix');
  if(column>=0)return rows.slice(1).map(r=>r[column]||'');
  if(rows.some(r=>r.length>1))throw Error('CSV needs a unix column header, or just one column.');
  return rows.map(r=>r[0]||'');
}
async function selected(){let values=$('pasted').value.split(/[\r\n,]+/).map(x=>x.trim()).filter(Boolean);const file=$('csv').files[0];if(file)values.push(...parseCSV(await file.text()).map(x=>x.trim()).filter(Boolean));values=[...new Set(values)];if(values.some(x=>!/^[a-z0-9]{4,32}$/.test(x)))throw Error('Unixes must contain 4–32 lowercase letters or numbers.');if(values.length>10000)throw Error('Import up to 10,000 unixes at once.');return values;}
async function importValues(replace){try{const values=await selected();if(!values.length)throw Error('Paste unixes or choose a CSV first.');if(replace&&!confirm(`REPLACE ALL existing unixes with ${values.length} new unixes? This cannot be undone.`))return;status('Saving…');const result=await call(replace?'replace':'add',{unixes:values});status(`Saved ${result.count} unixes.`);await refresh();}catch(e){status(e.message);}}
$('add').onclick=()=>importValues(false);$('replace').onclick=()=>importValues(true);
$('single-form').onsubmit=async e=>{e.preventDefault();try{await call('add',{unixes:[$('single').value.trim()]});$('single').value='';await refresh();status('Unix added.');}catch(e){status(e.message);}};
$('remove-form').onsubmit=async e=>{e.preventDefault();try{const unix=$('remove').value.trim();if(!confirm(`Remove unix ${unix}?`))return;await call('remove',{unix});$('remove').value='';await refresh();status('Unix removed.');}catch(e){status(e.message);}};
const {data:{session:initial}}=await supabase.auth.getSession();show(initial);
