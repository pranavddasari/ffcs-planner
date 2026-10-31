(() => {
  'use strict';
  const P=Planner,R=FacultyReviews,courses=FFCS_DATA,$=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storageKey='ffcs-local-planner-v2';
  let state={mode:'2',plans:{'1':{},'2':{}},green:[],black:[]};
  let category='',activeId='',draftTheory='',draftLabs={};
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(saved&&['1','2'].includes(saved.mode)&&saved.plans&&typeof saved.plans['1']==='object'&&typeof saved.plans['2']==='object'&&Array.isArray(saved.green)&&Array.isArray(saved.black))state=saved;
  }catch{}
  const prefs=()=>R.preferences({green:state.green,black:state.black});
  const picks=()=>state.plans[state.mode];
  const activeCourse=()=>courses.find(c=>c.id===activeId);
  const selectedName=()=>state.mode==='2'?'evening':'morning';
  const codeFor=c=>c.codes.find(code=>/[LE]$/.test(code))||c.codes[0]||'';
  function save(){
    try{localStorage.setItem(storageKey,JSON.stringify(state));$('saveStatus').textContent='Choices are saved in this browser. Share this HTML file; each person has their own plan.';}
    catch{$('saveStatus').textContent='Browser storage is unavailable. Keep this page open to retain your choices.';}
  }
  function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
  function cleanSavedPlans(){
    for(const mode of ['1','2']){
      const old=state.plans[mode]||{};state.plans[mode]={};
      for(const [id,pick] of Object.entries(old)){
        const course=courses.find(c=>c.id===id);
        if(course&&pick&&typeof pick==='object'&&!P.validate(course,pick,courses,mode,state.plans[mode],prefs()))state.plans[mode][id]=pick;
      }
    }
  }
  function courseLabel(c){return `${codeFor(c)?codeFor(c)+' - ':''}${c.name} [${c.hasLab?'With lab':'No lab'}]`;}
  function renderOptions(){
    const query=P.norm($('courseSearch').value);
    const list=courses.filter(c=>c.category===category&&(!query||P.norm(courseLabel(c)).includes(query))).sort((a,b)=>(codeFor(a)||a.name).localeCompare(codeFor(b)||b.name));
    $('courseOptions').innerHTML=list.length?list.map(c=>{
      const issue=P.courseStatus(c,courses,state.mode,picks(),prefs());
      const rows=P.theoryRows(c,state.mode),slots=[...new Set(rows.map(r=>r.slot))];
      let slotText=slots.map(slot=>{
        const same=rows.filter(r=>r.slot===slot),bad=same.every(r=>P.rowStatus(r,c,courses,state.mode,picks(),prefs()));
        return `<span class="slot-tag ${bad?'slot-unavailable':''}">${esc(slot)}${bad?' ×':''}</span>`;
      }).join('');
      if(!slots.length&&c.missing){
        const known=c.requiredSlot?P.requiredSlot(c,state.mode):state.mode==='2'?c.overviewSlot:'';
        slotText=known?`<span class="slot-tag ${P.conflict(known,c,courses,state.mode,picks())?'slot-unavailable':''}">${esc(known)}</span>`:'';
      }
      return `<button type="button" role="option" aria-selected="${c.id===activeId}" class="course-option ${issue?'unavailable':''}" data-course="${c.id}">${esc(codeFor(c)?codeFor(c)+' - ':'')}${esc(c.name)} <span class="lab-label">[${c.hasLab?'With lab':'No lab'}]</span><span class="slots">${slotText}${issue?`<span class="${rows.length?'slot-unavailable':''}">${esc(issue)}</span>`:''}</span></button>`;
    }).join(''):'<p class="note" style="padding:0 12px 12px">No matching courses.</p>';
  }
  function setMenu(open){
    $('courseMenu').hidden=!open;$('courseTrigger').setAttribute('aria-expanded',String(open));
    if(open){$('courseSearch').value='';renderOptions();$('courseSearch').focus();}
  }
  function changeCategory(value,open=true){
    category=value;activeId='';draftTheory='';draftLabs={};
    $('courseLabel').hidden=!value;$('courseField').hidden=!value;$('allocation').hidden=true;
    $('courseTrigger').innerHTML='-- Choose -- <span aria-hidden="true">▾</span>';
    $('courseSearch').value='';setMenu(Boolean(value&&open));
  }
  function sortedRows(c){
    return P.theoryRows(c,state.mode).slice().sort((a,b)=>{
      return R.sortRank(a.faculty,P.preference(a.faculty,prefs()))-R.sortRank(b.faculty,P.preference(b.faculty,prefs()))||a.faculty.localeCompare(b.faculty)||a.slot.localeCompare(b.slot);
    });
  }
  function labChoice(course,row,blocked){
    if(!course.hasLab)return {html:'—',venue:'—'};
    const labs=P.matchingLabs(course,row).slice().sort((a,b)=>Number(!!P.labIssue(a,course,courses,state.mode,picks()))-Number(!!P.labIssue(b,course,courses,state.mode,picks()))||a.slot.localeCompare(b.slot,undefined,{numeric:true}));
    if(!labs.length)return {html:'No lab supplied',venue:'—'};
    const allowed=labs.filter(l=>!P.labIssue(l,course,courses,state.mode,picks()));
    const selected=labs.find(l=>l.id===draftLabs[row.id]&&!P.labIssue(l,course,courses,state.mode,picks()))||allowed[0];
    if(selected)draftLabs[row.id]=selected.id;else delete draftLabs[row.id];
    const html=`<select data-lab-for="${row.id}" aria-label="Lab slot for ${esc(row.faculty)} (${esc(row.slot)})" ${blocked||!allowed.length?'disabled':''}>${!selected?'<option value="">No allowed lab</option>':''}${labs.map(l=>{const issue=P.labIssue(l,course,courses,state.mode,picks());return `<option value="${l.id}" ${l.id===selected?.id?'selected':''} ${issue?'disabled':''}>${esc(l.slot)}${issue?' — '+esc(issue):''}</option>`;}).join('')}</select>`;
    return {html,venue:selected?`${esc(selected.venue)} / ${selected.type}`:'—'};
  }
  function sourceLabel(review){
    const source=R.source(review.sourceId);
    return `${source?.name||review.sourceId} · ${review.location||''}`;
  }
  function sourceTags(name){
    const p=R.get(name);if(!p)return '';
    const tags=[...new Set(p.tags.map(t=>t.tag))];
    return tags.map(tag=>`<span class="source-tag ${R.tagClass(tag)}">${esc(tag)}</span>`).join('');
  }
  function reviewDropdown(name){
    const p=R.get(name);if(!p)return '<span class="pending">No reviews supplied</span>';
    const highlightIds=new Set(p.priorityPoints.map(point=>`${point.reviewIndex}:${point.pointIndex}`));
    const highlights=p.priorityPoints.map(point=>{
      const review=p.reviews[point.reviewIndex],text=review.points[point.pointIndex];
      return `<li><strong>${esc(point.label)}</strong><div>${esc(text)}</div><small>${esc(sourceLabel(review))}</small></li>`;
    }).join('');
    const fitFacts=p.fit.facts.filter(f=>!highlightIds.has(`${f.reviewIndex}:${f.pointIndex}`));
    const factKinds=[...new Map(fitFacts.map(f=>[f.kind,f.label])).values()];
    return `<details class="faculty-reviews"><summary>Reviews (${p.pointCount} points)</summary><div class="review-panel">${p.blacklisted?'<p class="blacklist-warning"><strong>Blacklisted in a supplied source. Positive reviews cannot override this.</strong></p>':''}${highlights?`<div class="review-priority"><strong>Lab evaluation — read first</strong><ul>${highlights}</ul></div>`:''}${!p.blacklisted?`<p class="fit-label fit-${p.fit.level}"><strong>Review-based fit: ${esc(p.fit.label)}</strong></p>`:''}${p.reviews.map((review,ri)=>{
      const points=review.points.filter((_,pi)=>!highlightIds.has(`${ri}:${pi}`));
      if(!points.length&&!review.listedWithoutRemark)return '';
      return `<section class="review-source"><strong>${esc(sourceLabel(review))}</strong>${P.norm(review.nameAsWritten)!==P.norm(name)?`<small>Name in source: ${esc(review.nameAsWritten)}</small>`:''}${review.subject?`<small>Subject/context: ${esc(review.subject)}</small>`:''}${review.listedWithoutRemark?'<p class="review-small">Listed by the user without an accompanying remark.</p>':''}${points.length?`<ul>${points.map(point=>`<li>${esc(point)}</li>`).join('')}</ul>`:''}${(review.sourceNotes||[]).map(note=>`<p class="review-small">${esc(note.location)}: ${esc(note.text)}</p>`).join('')}</section>`;
    }).join('')}${factKinds.length&&!p.blacklisted?`<section class="review-source"><strong>Preference-related points reported</strong><ul class="review-small">${factKinds.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></section>`:''}</div></details>`;
  }
  function renderReviewSearch(){
    const query=P.norm($('reviewSearch').value);
    if(!query){$('reviewSearchResults').innerHTML='<p class="note">Search by name to see reviews, including teachers outside the current allocation list.</p>';return;}
    const matches=R.data.profiles.filter(p=>[p.name,...p.aliases].some(name=>P.norm(name).includes(query)));
    $('reviewSearchResults').innerHTML=matches.length?matches.slice(0,30).map(p=>`<div class="library-faculty"><strong>${esc(p.name)}</strong>${p.blacklisted?'<span class="source-tag tag-black">Blacklisted</span>':''}${!p.offeredAs.length?'<span class="pending review-small">No current allocation supplied</span>':''}${reviewDropdown(p.name)}</div>`).join('')+(matches.length>30?'<p class="note">More matches found. Type a more specific name.</p>':''):'<p class="note">No matching reviews.</p>';
  }
  function renderAllocation(){
    const c=activeCourse();if(!c){$('allocation').hidden=true;return;}
    $('allocation').hidden=false;$('courseHeading').textContent=courseLabel(c);
    const courseNotes=R.data.courseNotes.filter(n=>n.courseId===c.id);$('courseNote').hidden=!courseNotes.length;$('courseNote').textContent=courseNotes.map(n=>'User note: '+n.text).join(' ');
    const rows=sortedRows(c),committed=picks()[c.id];
    if(!rows.some(r=>r.id===draftTheory&&!P.rowStatus(r,c,courses,state.mode,picks(),prefs())))draftTheory='';
    $('facultyRows').innerHTML=rows.length?rows.map(row=>{
      const issue=P.rowStatus(row,c,courses,state.mode,picks(),prefs()),preference=P.preference(row.faculty,prefs());
      const lab=labChoice(c,row,!!issue),reviewProfile=R.get(row.faculty);
      const fitLevel=reviewProfile?.fit.level;const cautious=['avoid','caution','mixed'].includes(fitLevel);
      const hasSourceBlackTag=reviewProfile?.tags.some(t=>/Blacklisted/i.test(t.tag));
      const showFit=reviewProfile&&!(reviewProfile.blacklisted&&hasSourceBlackTag);
      const showIssue=issue&&!(issue==='Blacklisted teacher'&&reviewProfile?.blacklisted);
      return `<tr class="${issue?'red-row':cautious?'caution-row':preference==='green'?'green-row':''} ${committed?.theory===row.id?'current-row':''}"><td>${esc(row.slot)}</td><td>${esc(row.venue)}</td><td>${esc(row.faculty)}${sourceTags(row.faculty)}${preference==='green'&&!reviewProfile?.tags.length?'<small class="reason" style="color:#28622c">Preferred</small>':''}${showFit?`<small class="fit-summary fit-${fitLevel}">${esc(reviewProfile.fit.label)}</small>`:''}${showIssue?`<span class="reason">${esc(issue)}</span>`:''}</td><td>${row.type}</td><td>${lab.html}</td><td>${lab.venue}</td><td>${reviewDropdown(row.faculty)}</td><td><input type="radio" name="faculty" value="${row.id}" aria-label="Select ${esc(row.faculty)} (${esc(row.slot)})" ${row.id===draftTheory?'checked':''} ${issue?'disabled':''}></td></tr>`;
    }).join(''):`<tr><td colspan="8">${c.missing?'Faculty allocation details were not supplied for this course.':'No '+selectedName()+' theory offerings were supplied for this course.'}</td></tr>`;
    $('confirm').disabled=!draftTheory;
  }
  function chooseCourse(id){
    const c=courses.find(c=>c.id===id);if(!c||c.category!==category)return;
    activeId=id;const pick=picks()[id];draftTheory=pick?.theory||'';draftLabs={};if(pick?.lab)draftLabs[pick.theory]=pick.lab;
    $('courseTrigger').innerHTML=`${esc(courseLabel(c))} <span aria-hidden="true">▾</span>`;
    setMenu(false);message('');renderAllocation();
  }
  const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  function renderTimetable(){
    function headerRow(kind,times){
      let html=`<tr class="${kind}-hours"><th class="day-heading">${kind==='theory'?'THEORY':'LAB'}<br>HOURS</th>`;
      for(let col=0;col<12;col++){
        if(col===6)html+='<th class="lunch-heading" aria-label="Lunch"></th>';
        const t=times[col];html+=`<th>${t?time(t[0])+'<br>to<br>'+time(t[1]):'—'}</th>`;
      }
      return html+'</tr>';
    }
    $('timetableHead').innerHTML=headerRow('theory',P.theoryTimes)+headerRow('lab',P.labTimes);
    const entries=P.entries(courses,state.mode,picks()),events=entries.flatMap(e=>e.events);
    $('timetableBody').innerHTML=P.days.map((day,di)=>{
      let html=`<tr><th class="day-heading" scope="row">${day}</th>`;
      for(let col=0;col<12;col++){
        if(col===6&&di===0)html+='<td class="lunch" rowspan="5">LUNCH</td>';
        if(P.extramural(di,col)){
          if(col===4)html+='<td class="extramural" colspan="2">Extramural</td>';
          continue;
        }
        const theory=P.theoryGrid[di][col],lab=P.labCode(di,col),labels=theory?`${theory} / ${lab}`:lab;
        const occupied=events.filter(e=>e.day===di&&e.col===col),entry=occupied[0];
        html+=`<td class="${entry?entry.reserved?'reserved':'booked':''}" data-cell="${di}-${col}" title="${esc(entry?`${labels}: ${entry.name}${entry.reserved?' (reserved)':''}`:labels+' — free')}"><span class="cell-codes">${labels}</span>${entry?`<span class="cell-course">${esc(entry.name)}${entry.kind==='lab'?' · Lab':''}</span><span class="cell-info">${entry.reserved?'Reserved':esc(entry.faculty)+'<br>'+esc(entry.venue)}</span>`:''}</td>`;
      }
      return html+'</tr>';
    }).join('');
    $('reservedNote').textContent='Compulsory slots: '+courses.filter(c=>c.requiredSlot).sort((a,b)=>a.requiredSlot.localeCompare(b.requiredSlot)).map(c=>`${c.name} (${P.requiredCodes(c,state.mode)})`).join('; ')+'.';
  }
  function renderSelected(){
    const entries=P.entries(courses,state.mode,picks()).sort((a,b)=>Number(!!b.course.requiredSlot)-Number(!!a.course.requiredSlot)||a.slot.localeCompare(b.slot));
    $('selectedRows').innerHTML=entries.map(({course:c,theory,lab,slot})=>`<tr><td>${esc(c.name)}${c.requiredSlot?' <small>(compulsory)</small>':''}</td><td class="${theory?'':'pending'}">${theory?esc(theory.faculty):c.missing?'Details not supplied':'Choose faculty'}</td><td>${esc(slot)}</td><td>${lab?esc(lab.slot):c.hasLab?'Pending':'—'}</td><td>${theory?`<button type="button" data-remove="${c.id}">${c.requiredSlot?'Clear faculty':'Remove'}</button>`:''}</td></tr>`).join('');
    $('reset').disabled=!Object.keys(picks()).length;
  }
  function render(){
    $('session').value=state.mode;
    $('labRule').textContent=`${state.mode==='2'?'Evening theory: labs L1–L30.':'Morning theory: labs L31–L60.'} Red courses or slots are unavailable. Select a teacher and lab, then press OK.`;
    renderOptions();renderAllocation();renderTimetable();renderSelected();
  }
  $('session').addEventListener('change',event=>{
    state.mode=event.target.value;$('category').value='';changeCategory('',false);save();render();
    $('category').focus();try{$('category').showPicker?.();}catch{}
  });
  $('category').addEventListener('change',event=>changeCategory(event.target.value));
  $('courseTrigger').addEventListener('click',()=>setMenu($('courseMenu').hidden));
  $('courseSearch').addEventListener('input',renderOptions);
  $('facultyRows').addEventListener('change',event=>{
    if(event.target.matches('input[name=faculty]')){draftTheory=event.target.value;message('Press OK to add this choice to the timetable.');$('confirm').disabled=false;}
    if(event.target.matches('[data-lab-for]')){
      draftLabs[event.target.dataset.labFor]=event.target.value;
      renderAllocation();message('Press OK to apply the lab selection.');
    }
  });
  $('confirm').addEventListener('click',()=>{
    const c=activeCourse();if(!c)return;
    const pick={theory:draftTheory};if(c.hasLab)pick.lab=draftLabs[draftTheory];
    const issue=P.validate(c,pick,courses,state.mode,picks(),prefs());if(issue){message(issue,true);return;}
    picks()[c.id]=pick;save();render();message(`${c.name} added. Timetable updated.`);
  });
  $('reset').addEventListener('click',()=>{state.plans[state.mode]={};draftTheory='';draftLabs={};save();render();message('Choices cleared. Compulsory slots remain reserved.');});
  $('saveLists').addEventListener('click',()=>{
    const parse=text=>[...new Map(text.split(/[\n,;]+/).map(n=>n.trim()).filter(Boolean).map(n=>[P.norm(n),n])).values()];
    state.green=parse($('greenlist').value);state.black=parse($('blacklist').value);
    const before=Object.values(state.plans).reduce((n,plan)=>n+Object.keys(plan).length,0);cleanSavedPlans();
    const after=Object.values(state.plans).reduce((n,plan)=>n+Object.keys(plan).length,0);
    if(activeCourse()){const pick=picks()[activeId];draftTheory=pick?.theory||'';draftLabs={};if(pick?.lab)draftLabs[pick.theory]=pick.lab;}
    save();render();$('listStatus').textContent=before>after?'Lists saved. Blacklisted choices removed.':'Lists saved.';
  });
  document.addEventListener('click',event=>{
    const option=event.target.closest('[data-course]');if(option){chooseCourse(option.dataset.course);return;}
    const remove=event.target.closest('[data-remove]');if(remove){delete picks()[remove.dataset.remove];if(activeId===remove.dataset.remove){draftTheory='';draftLabs={};}save();render();message('Choice removed. Timetable updated.');return;}
    if(!event.target.closest('.course-field'))setMenu(false);
  });
  document.addEventListener('keydown',event=>{
    if($('courseMenu').hidden)return;
    if(event.key==='Escape'){setMenu(false);$('courseTrigger').focus();}
    if(event.key==='ArrowDown'&&event.target===$('courseSearch')){event.preventDefault();$('courseOptions').querySelector('button')?.focus();}
    if(['ArrowDown','ArrowUp'].includes(event.key)&&event.target.closest('#courseOptions')){
      event.preventDefault();const items=[...$('courseOptions').querySelectorAll('button')],index=items.indexOf(event.target);
      items[(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
    }
  });
  const beforeImport=Object.values(state.plans).reduce((n,plan)=>n+Object.keys(plan||{}).length,0);
  cleanSavedPlans();
  const removed=beforeImport-Object.values(state.plans).reduce((n,plan)=>n+Object.keys(plan).length,0);
  if(removed){$('reviewNotice').hidden=false;$('reviewNotice').textContent=`${removed} saved choice(s) removed because they conflict with the imported blacklist or current slot rules.`;save();}
  $('reviewLibrarySummary').textContent=`All saved faculty reviews (${R.data.profiles.length} teachers)`;
  $('reviewSearch').addEventListener('input',renderReviewSearch);renderReviewSearch();
  $('greenlist').value=state.green.join('\n');$('blacklist').value=state.black.join('\n');render();
})();
