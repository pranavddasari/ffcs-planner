/* Plain JavaScript: runs from a file URL, with no libraries. */
const Planner = (() => {
  const days=['MON','TUE','WED','THU','FRI'];
  const theoryGrid=[
    ['A1','F1','D1','TB1','TG1','', 'A2','F2','D2','TB2','TG2',''],
    ['B1','G1','E1','TC1','TAA1','', 'B2','G2','E2','TC2','TAA2',''],
    ['C1','A1','F1','TD1','','', 'C2','A2','F2','TD2','TBB2',''],
    ['D1','B1','G1','TE1','TCC1','', 'D2','B2','G2','TE2','TCC2',''],
    ['E1','C1','TA1','TF1','TDD1','', 'E2','C2','TA2','TF2','TDD2','']
  ];
  const theoryTimes=[[480,530],[535,585],[590,640],[645,695],[700,750],null,[840,890],[895,945],[950,1000],[1005,1055],[1060,1110],null];
  const labTimes=[[480,530],[530,580],[590,640],[640,690],[700,750],[750,800],[840,890],[890,940],[950,1000],[1000,1050],[1060,1110],[1110,1160]];
  const norm=name=>String(name).normalize('NFKD').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const codes=slot=>String(slot||'').split('+').filter(Boolean);
  const isTheory=row=>row&&['TH','ETH'].includes(row.type);
  const isLab=row=>row&&['LO','ELA'].includes(row.type);
  const labCode=(day,col)=>'L'+(day*6+(col<6?col+1:col-5+30));
  const extramural=(day,col)=>day===2&&(col===4||col===5);
  const preference=(name,prefs)=>prefs.black.some(n=>norm(n)===norm(name))?'black':prefs.green.some(n=>norm(n)===norm(name))?'green':'neutral';
  function meetings(slot){
    const result=[];
    for(const code of codes(slot)){
      if(/^L\d+$/.test(code)){
        const n=Number(code.slice(1));if(n<1||n>60)continue;
        const day=Math.floor(((n-1)%30)/6),col=(n-1)%6+(n>30?6:0);
        result.push({code,day,col,start:labTimes[col][0],end:labTimes[col][1],kind:'lab'});
      }else{
        theoryGrid.forEach((row,day)=>row.forEach((label,col)=>{
          if(label===code&&theoryTimes[col])result.push({code,day,col,start:theoryTimes[col][0],end:theoryTimes[col][1],kind:'theory'});
        }));
      }
    }
    return result;
  }
  const overlaps=(a,b)=>a.day===b.day&&a.start<b.end&&b.start<a.end;
  const theoryRows=(course,mode)=>course.sections.filter(r=>isTheory(r)&&codes(r.slot).some(s=>new RegExp(`^[A-G]${mode}$`).test(s)));
  function requiredSlot(course,mode){return course.requiredSlot?.replace(/2$/,mode)||'';}
  function requiredCodes(course,mode){
    const slot=requiredSlot(course,mode);
    const row=theoryRows(course,mode).find(r=>codes(r.slot).includes(slot));
    return row?.slot||slot;
  }
  function entries(courses,mode,picks){
    const result=[];
    for(const c of courses){
      const pick=picks[c.id],theory=c.sections.find(r=>r.id===pick?.theory&&isTheory(r)),lab=c.sections.find(r=>r.id===pick?.lab&&isLab(r));
      if(!c.requiredSlot&&!theory)continue;
      const slot=theory?.slot||requiredCodes(c,mode);
      const events=meetings(slot).map(m=>({...m,courseId:c.id,name:c.name,faculty:theory?.faculty||'',venue:theory?.venue||'',reserved:!theory}));
      if(lab)events.push(...meetings(lab.slot).map(m=>({...m,courseId:c.id,name:c.name,faculty:lab.faculty,venue:lab.venue,reserved:false})));
      result.push({course:c,theory,lab,slot,events});
    }
    return result;
  }
  function conflict(slot,course,courses,mode,picks){
    const wanted=meetings(slot);
    for(const entry of entries(courses,mode,picks)){
      if(entry.course.id===course.id)continue;
      if(wanted.some(a=>entry.events.some(b=>overlaps(a,b))))return `Clashes with ${entry.course.name}`;
    }
    return '';
  }
  function labIssue(row,course,courses,mode,picks){
    if(!row||!isLab(row))return 'Lab details not supplied';
    const tokens=codes(row.slot),lo=mode==='2'?1:31,hi=mode==='2'?30:60;
    if(!tokens.length||tokens.some(s=>!/^L\d+$/.test(s)||Number(s.slice(1))<lo||Number(s.slice(1))>hi))return `Only L${lo}–L${hi} labs allowed`;
    if(meetings(row.slot).some(m=>extramural(m.day,m.col)))return 'Extramural period';
    return conflict(row.slot,course,courses,mode,picks);
  }
  const matchingLabs=(course,row)=>course.sections.filter(l=>isLab(l)&&norm(l.faculty)===norm(row.faculty));
  function rowStatus(row,course,courses,mode,picks,prefs){
    if(preference(row.faculty,prefs)==='black')return 'Blacklisted teacher';
    const clash=conflict(row.slot,course,courses,mode,picks);if(clash)return clash;
    if(course.hasLab){
      const labs=matchingLabs(course,row);
      if(!labs.length)return 'No lab supplied for this teacher';
      if(labs.every(l=>labIssue(l,course,courses,mode,picks)))return `No available L${mode==='2'?'1–L30':'31–L60'} lab for this teacher`;
    }
    return '';
  }
  function courseStatus(course,courses,mode,picks,prefs){
    const rows=theoryRows(course,mode);
    if(!rows.length){
      if(course.missing){
        const clash=course.overviewSlot&&conflict(course.overviewSlot,course,courses,mode,picks);
        return clash||'Allocation details not supplied';
      }
      return `No ${mode==='2'?'evening':'morning'} offering supplied`;
    }
    return rows.every(r=>rowStatus(r,course,courses,mode,picks,prefs))?rowStatus(rows[0],course,courses,mode,picks,prefs):'';
  }
  function validate(course,pick,courses,mode,picks,prefs){
    const row=theoryRows(course,mode).find(r=>r.id===pick.theory);
    if(!row)return 'Select one teacher';
    const issue=rowStatus(row,course,courses,mode,picks,prefs);if(issue)return issue;
    if(course.hasLab){
      const lab=matchingLabs(course,row).find(l=>l.id===pick.lab);
      if(!lab)return 'Select a lab slot';
      const labProblem=labIssue(lab,course,courses,mode,picks);if(labProblem)return labProblem;
      if(meetings(row.slot).some(a=>meetings(lab.slot).some(b=>overlaps(a,b))))return 'Theory and lab overlap';
    }
    return '';
  }
  return {days,theoryGrid,theoryTimes,labTimes,norm,codes,isTheory,isLab,labCode,extramural,preference,meetings,overlaps,theoryRows,requiredSlot,requiredCodes,entries,conflict,labIssue,matchingLabs,rowStatus,courseStatus,validate};
})();
if(typeof module!=='undefined')module.exports=Planner;
