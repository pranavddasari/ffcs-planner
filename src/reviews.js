function createReviewStore(data){
  const normalize=name=>String(name).normalize('NFKD').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const byName=new Map(),sources=new Map(data.sources.map(s=>[s.id,s]));
  for(const profile of data.profiles)for(const name of [profile.name,...profile.aliases,...profile.offeredAs]){
    const key=normalize(name),existing=byName.get(key);
    if(existing&&existing.id!==profile.id)throw new Error('Ambiguous review alias: '+name);
    byName.set(key,profile);
  }
  const get=name=>byName.get(normalize(name));
  const blackNames=data.profiles.filter(p=>p.blacklisted).flatMap(p=>[p.name,...p.aliases,...p.offeredAs]);
  const greenNames=data.profiles.filter(p=>!p.blacklisted&&(p.hasSourceGreenTag||p.fit.level==='good')).flatMap(p=>[p.name,...p.aliases,...p.offeredAs]);
  function preferences(manual){
    return {black:[...blackNames,...manual.black],green:[...greenNames,...manual.green]};
  }
  function sortRank(name,manualPreference){
    const p=get(name);if(manualPreference==='black'||p?.blacklisted)return 100;
    const level=p?.fit.level;
    if(level==='avoid')return 80;
    if(level==='caution')return 65;
    if(level==='mixed')return 55;
    if(level==='good')return 0;
    if(level==='potential')return 10;
    if(manualPreference==='green')return 15;
    return 30;
  }
  const tagClass=tag=>/Blacklisted/i.test(tag)?'tag-black':/Green|Best in Marks/.test(tag)?'tag-green':/Average/.test(tag)?'tag-average':/Chill/.test(tag)?'tag-chill':'tag-neutral';
  return {data,get,preferences,sortRank,tagClass,source:id=>sources.get(id),isBlacklisted:name=>!!get(name)?.blacklisted};
}
const FacultyReviews=typeof FFCS_REVIEWS!=='undefined'?createReviewStore(FFCS_REVIEWS):null;
if(typeof module!=='undefined')module.exports={createReviewStore};
