import urllib.request
import re
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request("https://data.mendeley.com/datasets/jdyksv2jhh/1", headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
    html = resp.read().decode('utf-8')

m = re.search(r'window\.INITIAL_STATE\s*=\s*({.*?});</script>', html, re.DOTALL)
if m:
    state = json.loads(m.group(1))
    print("INITIAL_STATE keys:", state.keys())
    files = state.get('files', {})
    print("files key:", files)
    dataset = state.get('dataset', {})
    print("dataset keys:", dataset.keys() if dataset else None)
    if 'view' in dataset:
        print("dataset.view files:", dataset['view'].get('files'))
        print("dataset.view direct_download_url:", dataset['view'].get('direct_download_url'))
