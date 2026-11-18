const $=id=>document.getElementById(id);
const cfg=window.WOC_CONFIG||{};
const TOKEN_KEY='woc_voter_ballot_session';
let token=sessionStorage.getItem(TOKEN_KEY),currentCandidate=null,selected=false;
const descriptions=['No confidence in this candidate','Low confidence in this candidate','Neutral on this candidate','Confident in this candidate','High confidence in this candidate'];
function screen(id){for(const name of ['login-card','ballot-card','complete-card','closed-card'])$(name).hidden=name!==id;}
function message(text){$('message').textContent=text;}
async function api(action,extra={},useToken=true){
 if(!/^https:\/\//.test(cfg.supabaseUrl||'')||!cfg.supabasePublishableKey)throw Error('Website connection is not configured.');
 const headers={'Content-Type':'application/json','apikey':cfg.supabasePublishableKey};
 if(useToken&&token)headers.Authorization=`Bearer ${token}`;
 const response=await fetch(`${cfg.supabaseUrl.replace(/\/$/,'')}/functions/v1/ballot-api`,{method:'POST',headers,body:JSON.stringify({action,...extra})});
 const body=await response.json().catch(()=>({}));
 if(!response.ok){const err=new Error(body.error||`Request failed (${response.status})`);err.status=response.status;throw err;}
 return body;
}
function ratingView(){const n=Number($('rating-slider').value);$('leaf-number').textContent=`${n} ${n===1?'Leaf':'Leaves'}`;$('rating-description').textContent=descriptions[n-1];document.querySelectorAll('.sapling .leaf').forEach((leaf,i)=>{leaf.style.opacity=i<n?'1':'.12'});$('rating-submit').disabled=!selected;}
function renderBallot(ballot){
 if(!ballot||ballot.state==='closed'||ballot.state==='unavailable'){screen('closed-card');return;}
 if(ballot.state==='complete'){token=null;sessionStorage.removeItem(TOKEN_KEY);screen('complete-card');return;}
 if(ballot.state!=='ready'||!ballot.candidate){screen('closed-card');return;}
 currentCandidate=ballot.candidate;$('candidate-name').textContent=currentCandidate.name;$('candidate-profile').textContent=currentCandidate.profile;
 $('ballot-progress-label').textContent=`Candidate ${ballot.index} of ${ballot.total}`;
 $('ballot-progress-fill').style.width=`${(ballot.index-1)/ballot.total*100}%`;
 $('rating-slider').value='3';selected=false;$('ballot-message').textContent='';ratingView();screen('ballot-card');
}
$('unix-form').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('submit');button.disabled=true;button.textContent='Checking unix…';message('');
 try{const result=await api('login',{unix:$('unix').value.trim().toLowerCase()},false);token=result.token;sessionStorage.setItem(TOKEN_KEY,token);$('unix').value='';renderBallot(result.ballot);}
 catch(err){message(err.message);}finally{button.disabled=false;button.textContent='Access ballot →';}
});
$('rating-slider').addEventListener('input',()=>{selected=true;ratingView();});
$('rating-submit').addEventListener('click',async()=>{
 if(!selected||!currentCandidate)return;
 const button=$('rating-submit');button.disabled=true;button.textContent='Saving rating…';$('ballot-message').textContent='';
 try{const result=await api('submit',{candidateId:currentCandidate.id,leaves:Number($('rating-slider').value)});renderBallot(result.ballot);}
 catch(err){$('ballot-message').textContent=err.message;if(err.status===401){token=null;sessionStorage.removeItem(TOKEN_KEY);screen('login-card');message('Session expired. Enter your unix to resume.');}else if(err.status===409){try{renderBallot((await api('next')).ballot);}catch{}}}
 finally{button.textContent='Submit Rating & Continue →';button.disabled=!selected;}
});
$('finish').onclick=()=>screen('login-card');$('closed-back').onclick=()=>screen('login-card');
if(token){api('next').then(r=>renderBallot(r.ballot)).catch(()=>{token=null;sessionStorage.removeItem(TOKEN_KEY);screen('login-card');});}
