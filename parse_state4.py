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

for tag in re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL):
    if 'window.INITIAL_STATE' in tag:
        idx = tag.find('window.INITIAL_STATE')
        eq_idx = tag.find('=', idx)
        json_str = tag[eq_idx+1:].strip()
        idx_end = json_str.find('\n      window.initialTime')
        if idx_end != -1:
            json_str = json_str[:idx_end].strip()
        d = json.loads(json_str)
        print("dataset:", json.dumps(d.get('dataset'), indent=2))
        print("files:", json.dumps(d.get('files'), indent=2))
