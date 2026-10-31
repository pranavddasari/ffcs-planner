from pathlib import Path
import json,re
p=Path(__file__).resolve().parent.parent/'src'/'reviews.json'
data=json.loads(p.read_text())
data['preferences']={
 'blacklist':'exclude whenever any source explicitly blacklists the teacher',
 'predictability':'high priority; should be predictable and keep commitments',
 'fairness':'high priority',
 'labAssessmentFormat':'DA-based preferred; avoid tests in every lab; surface assessment-format remarks first',
 'labMarking':'lenient preferred',
 'theoryMarkingOrder':['moderate','lenient','strict'],
 'classAverage':'moderate; neither very high nor very low',
 'assignmentWorkload':'acceptable; no penalty for workload alone',
 'method':'Qualitative fit from explicit review statements; no numerical scores or invented frequency assumptions.'}
data['classificationRule']='Any explicit blacklist overrides every green tag or positive review. Review-based fit follows the user preferences and retains source tags unchanged.'
def flat(text):return re.sub(r'\s+',' ',text.lower().replace('’',"'").replace('–','-'))
def has(pattern,t):return bool(re.search(pattern,t,re.I))
for profile in data['profiles']:
 facts=[];priority=[]
 def add(kind,label,review,index):
  fact={'kind':kind,'label':label,'reviewIndex':review,'pointIndex':index}
  if fact not in facts:facts.append(fact)
 for ri,review in enumerate(profile['reviews']):
  for pi,point in enumerate(review['points']):
   text=flat(point);lab=has(r'\blab(?:s|fat|fats)?\b',text)
   # Frequency must be explicitly reported; a strict lab is not assumed to test every week.
   frequency=None
   if lab and has(r'\b(?:assessment|assessments|test|tests)\b',text):
    if has(r'\ball\s+lab\s+assignments?\s+as\s+tests?\b',text):frequency='assignments-as-tests'
    elif has(r'\b(?:every|each)\s+alternate\s+lab\b',text):frequency='alternate'
    elif has(r'\b(?:every|each|all)\b.{0,30}\blab\b.{0,45}\b(?:assessment|assessments|test|tests)\b|\b(?:assessment|test)s?\b.{0,30}\b(?:every|each)\s+lab\b',text):frequency='every'
    elif has(r'on.the.spot|on the spot',text):frequency='on-spot'
    elif has(r'\b2\s+assessments\b',text):frequency='two-reported'
    else:frequency='unspecified'
    labels={'assignments-as-tests':'All lab assignments treated as tests; frequency unspecified','alternate':'Assessments in alternate labs reported','every':'Tests/assessments in every lab reported','on-spot':'On-the-spot lab assessment reported; frequency unspecified','two-reported':'Two lab assessments reported','unspecified':'Lab assessments mentioned; frequency unspecified'}
    priority.append({'kind':frequency,'label':labels[frequency],'reviewIndex':ri,'pointIndex':pi})
    add('lab_assessment_'+frequency,labels[frequency],ri,pi)
   if has(r'\blab\s+da(?:s|\W*s)?\b',text):
    priority.append({'kind':'da-based','label':'Lab DAs reported (your preferred format)','reviewIndex':ri,'pointIndex':pi})
    add('lab_da','Lab DAs reported',ri,pi)
   marking=has(r'mark|correct|evaluat|grading|grades|checking|score',text)
   strict=has(r'(?:very\s+)?strict|not (?:very )?lenient|not at all lenient|not give|doesn.t give|less marks|no free marks|cut.*marks',text)
   lenient=has(r'lenient|linient|lininient|liberal|free marks|lots of marks|full marks|gives marks easily|marks blindly|easy to score',text) and not has(r'not (?:very |at all )?(?:lenient|linient)',text)
   medium=has(r'\bmoderate\b|\bdecent\b|\bavg\.? marks\b|\baverage marks\b|\bfair(?:ly)?\b|according to (?:your |the |her |his )?performance|(?:as|what|much) (?:we|you|u) deserve|what you have written',text)
   if lab and marking:
    if lenient:add('lab_lenient','Lenient lab marking reported',ri,pi)
    elif medium:add('lab_moderate','Fair/moderate lab marking reported',ri,pi)
    if strict:add('lab_strict','Strict lab marking reported',ri,pi)
   if lab and has(r'easy\s+(?:s|a)(?:\s|\b)|(?:s|a)\s+grade.*lab|lab.*(?:full|100)|lab.*good to score|lab.*gives.*marks',text):add('lab_lenient','Easy lab scoring/high lab grades reported',ri,pi)
   # General correction comments do not establish which component they describe.
   if marking and not lab:
    if medium:add('marking_moderate','Fair/moderate marking reported (component may be unspecified)',ri,pi)
    if lenient:add('marking_lenient','Lenient marking reported (component may be unspecified)',ri,pi)
    if strict:add('marking_strict','Strict marking reported (component may be unspecified)',ri,pi)
   if has(r'\btheory\b|\bcat(?:s)?\b',text) and marking:
    if medium:add('theory_moderate','Fair/moderate theory marking reported',ri,pi)
    if lenient:add('theory_lenient','Lenient theory marking reported',ri,pi)
    if strict:add('theory_strict','Strict theory marking reported',ri,pi)
   fair=has(r'non[ -]?biased|\bunbiased\b|not biased|\bfair(?:ly)?\b|according to (?:your |the |her |his )?performance|(?:as|what|much) (?:we|you|u) deserve',text)
   if fair:add('fair','Fair/performance-based marking reported',ri,pi)
   if has(r'\bpartial(?:ity)?\b|\bfavou?rs?\b|\bbiased\b',text) and not fair and not has(r'partial (?:mark|credit)',text):add('unfair','Favouritism/partiality reported',ri,pi)
   if has(r'\bmoody\b|\bmood\b|\bunpredictable\b|\binconsistent\b|not consistent|random marks|loses.*(?:paper|answersheet)',text):add('unpredictable','Unpredictability or mood-dependent marking reported',ri,pi)
   elif has(r'\bconsistent\b|keeps? (?:his |her )?(?:word|promise)|true to (?:his|her) word',text):add('predictable','Predictability/keeping commitments reported',ri,pi)
   avg=has(r'\bclass\s*(?:average|avg)\b|\b(?:average|avg)\b.{0,25}(?:high|low)',text) and not has(r'\bavg\s*(?:in\s*)?teaching',text)
   if avg:
    if has(r'not too high not too low|neither.*high.*low|never too high nor tooo? low|proper class average|super average',text):add('average_moderate','Moderate class average reported',ri,pi)
    elif has(r'not high|not too high',text):add('average_not_high','Class average reported as not high; exact level unclear',ri,pi)
    elif has(r'high',text):add('average_high','High class average reported',ri,pi)
    elif has(r'low',text):add('average_low','Low class average reported',ri,pi)
 kinds={f['kind'] for f in facts}
 if profile['blacklisted']:
  level='black';label='Blacklisted';reasons=['An explicit source blacklist takes priority over every positive remark.']
 elif 'lab_assessment_assignments-as-tests' in kinds:
  level='avoid';label='Avoid: lab assignments treated as tests';reasons=['The review reports assignments treated as tests rather than DA-based evaluation; frequency is unspecified.']
 elif 'lab_assessment_every' in kinds or 'lab_assessment_alternate' in kinds:
  level='avoid';label='Avoid: frequent lab tests';reasons=['Recurring lab assessments conflict with your preferred DA-based evaluation.']
 elif kinds.intersection({'unpredictable','unfair'}):
  level='caution';label='Caution: predictability / fairness';reasons=['Reviews include unpredictability or favouritism concerns.']
 elif 'lab_assessment_on-spot' in kinds:
  level='caution';label='Check lab assessment format';reasons=['An on-the-spot lab assessment is reported; the frequency is not specified.']
 elif 'lab_strict' in kinds:
  level='caution';label='Caution: strict lab marking';reasons=['At least one review reports strict lab marking.']
 elif kinds.intersection({'average_high','average_low'}) and 'average_moderate' not in kinds:
  level='mixed';label='Check class average';reasons=['The reported class average is high or low rather than clearly moderate.']
 elif 'theory_strict' in kinds and not kinds.intersection({'theory_moderate','theory_lenient','marking_moderate'}):
  level='mixed';label='Check theory marking';reasons=['Strict theory marking is reported.']
 else:
  good=kinds.intersection({'lab_lenient','theory_moderate','marking_moderate','fair','predictable','average_moderate','lab_da'})
  if len(good)>=2:level='good';label='Potentially good fit';reasons=['Multiple explicit review points match your preferences; unmentioned traits remain unknown.']
  elif good or 'theory_lenient' in kinds:level='potential';label='Some matching evidence';reasons=['Some preferences are supported; other priorities are not established by these reviews.']
  else:level='unknown';label='Fit not established';reasons=['The supplied remarks do not establish your key preferences.']
 profile['fit']={'level':level,'label':label,'reasons':reasons,'facts':facts}
 order={'assignments-as-tests':0,'every':0,'alternate':1,'on-spot':2,'unspecified':3,'two-reported':4,'da-based':5}
 profile['priorityPoints']=sorted(priority,key=lambda x:order[x['kind']])
for category in data['categories']:
 category['priority']='high' if category['id'] in ['consistency','fairness','lab_difficulty','lab_marking'] else 'preferred' if category['id'] in ['theory_marking','relative_grading'] else 'acceptable workload; no penalty' if category['id']=='assignments' else 'not specified'
p.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
print('Profile fit counts:')
from collections import Counter
print(Counter(p['fit']['level'] for p in data['profiles']))
for profile in data['profiles']:
 if profile['priorityPoints']:print(profile['name'],profile['fit']['label'],[p['label'] for p in profile['priorityPoints']])
