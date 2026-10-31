import json
from pathlib import Path
root=Path(__file__).resolve().parent/'src'
output=root.parent/'index.html'
template=(root/'template.html').read_text()
parts={'/* STYLES */':(root/'style.css').read_text(),'/* DATA */':'const FFCS_DATA = '+json.dumps(json.loads((root/'data.json').read_text()),ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';', '/* REVIEWS_DATA */':'const FFCS_REVIEWS = '+json.dumps(json.loads((root/'reviews.json').read_text()),ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';', '/* LOGIC */':(root/'logic.js').read_text(), '/* REVIEWS_LOGIC */':(root/'reviews.js').read_text(),'/* APP */':(root/'app.js').read_text()}
for marker,content in parts.items():
 assert template.count(marker)==1,marker
 template=template.replace(marker,content)
assert 'fetch(' not in template
assert 'type="module"' not in template
output.write_text(template)
print(output)
