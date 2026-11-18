window.WOC_RESULTS = {
  calculate(raw) {
    const candidates = [...(raw.candidates || [])].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
    const seats = Number(raw.seats)||0, completed=Number(raw.completed)||0;
    for (const c of candidates) c.outcome='Not selected';
    const ties=[];
    if(completed>0 && seats>0){
      if(seats>=candidates.length){for(const c of candidates)c.outcome='Selected';}
      else {
        const cutoff=candidates[seats-1].total;
        const above=candidates.filter(c=>c.total>cutoff);
        const at=candidates.filter(c=>c.total===cutoff);
        const slots=seats-above.length;
        for(const c of above)c.outcome='Selected';
        if(slots>=at.length){for(const c of at)c.outcome='Selected';}
        else if(at.length===2 && slots===1){
          const pair=(raw.pairs||[]).find(t=>(t.a===at[0].id&&t.b===at[1].id)||(t.b===at[0].id&&t.a===at[1].id));
          if(pair){
            const first=pair.a===at[0].id?pair.aPreferred:pair.bPreferred;
            const second=pair.a===at[0].id?pair.bPreferred:pair.aPreferred;
            ties.push({names:at.map(c=>c.name),first,second,equal:pair.equal});
            if(first!==second){at[first>second?0:1].outcome='Selected';}
            else {for(const c of at)c.outcome='Pending decision';}
          } else {for(const c of at)c.outcome='Pending decision';}
        } else {
          for(const c of at)c.outcome='Pending decision';
          ties.push({names:at.map(c=>c.name),multiple:true});
        }
      }
    }
    return {candidates,ties,seats,completed};
  },
  render(target,raw){
    target.replaceChildren();
    const result=this.calculate(raw);
    const intro=document.createElement('p');
    intro.textContent=`${result.completed} completed ballots · ${result.seats} board seats. Only completed ballots are counted.`;
    target.append(intro);
    if(!result.completed){const p=document.createElement('p');p.textContent='No completed ballots were received. No candidates can be selected automatically.';target.append(p);return;}
    const wrapper=document.createElement('div');wrapper.style.overflowX='auto';
    const table=document.createElement('table');table.style.width='100%';
    table.innerHTML='<thead><tr><th>Rank</th><th>Candidate</th><th>Average leaves</th><th>Total leaves</th><th>Result</th></tr></thead>';
    const tbody=document.createElement('tbody');
    result.candidates.forEach((c,i)=>{
      const tr=document.createElement('tr');
      for(const v of [String(i+1),c.name,(Number(c.total)/result.completed).toFixed(2),String(c.total),c.outcome]){
        const td=document.createElement('td');td.textContent=v;td.style.padding='10px 8px';td.style.borderBottom='1px solid #e0e9e1';tr.append(td);
      }
      tbody.append(tr);
    });table.append(tbody);wrapper.append(table);target.append(wrapper);
    for(const t of result.ties){const note=document.createElement('p');
      note.textContent=t.multiple?`Unresolved cutoff tie among ${t.names.join(', ')}. Human decision required.`:
        `Head-to-head: ${t.names[0]} ${t.first}, ${t.names[1]} ${t.second}, equal ratings ${t.equal}. ${t.first===t.second?'Tie unresolved; human decision required.':'Head-to-head decides the final seat.'}`;
      target.append(note);
    }
  }
};
