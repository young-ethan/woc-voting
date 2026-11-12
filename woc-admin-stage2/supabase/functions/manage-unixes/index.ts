import { createClient } from 'npm:@supabase/supabase-js@2';
const url = Deno.env.get('SUPABASE_URL')!;
const publishable = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, serviceKey);
const auth = createClient(url, publishable);
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const respond = (data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const valid=(s:unknown):s is string=>typeof s==='string' && /^[a-z0-9]{4,32}$/.test(s);
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return respond({error:'Method not allowed'},405);
  try{
    const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
    if(!token)return respond({error:'Sign in required'},401);
    const {data:{user},error:authError}=await auth.auth.getUser(token);
    if(authError||!user||!user.email)return respond({error:'Sign in required'},401);
    const allowed=(Deno.env.get('ADMIN_EMAILS')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(!allowed.includes(user.email.toLowerCase()))return respond({error:'Not an approved administrator'},403);
    const body=await req.json();
    if(body.action==='count'){
      const {count,error}=await admin.from('unixes').select('id',{head:true,count:'exact'});if(error)throw error;return respond({count});
    }
    if(body.action==='remove'){
      if(!valid(body.unix))return respond({error:'Invalid unix'},400);
      const {error}=await admin.from('unixes').delete().eq('unix',body.unix);if(error)throw error;return respond({ok:true});
    }
    if(body.action==='add'||body.action==='replace'){
      if(!Array.isArray(body.unixes)||body.unixes.length<1||body.unixes.length>10000||!body.unixes.every(valid))return respond({error:'Provide 1–10,000 valid unixes (4–32 lowercase letters/numbers).'},400);
      const values=[...new Set(body.unixes as string[])];
      if(body.action==='replace'){
        // Prevent accidental partial replacement: use a single SQL transaction via RPC.
        const {error}=await admin.rpc('replace_unixes',{new_unixes:values});if(error)throw error;
      }else{
        for(let i=0;i<values.length;i+=500){const {error}=await admin.from('unixes').upsert(values.slice(i,i+500).map(unix=>({unix})),{onConflict:'unix',ignoreDuplicates:true});if(error)throw error;}
      }
      return respond({count:values.length});
    }
    return respond({error:'Unknown action'},400);
  }catch(e){console.error(e);return respond({error:'Unable to complete request'},500);}
});
