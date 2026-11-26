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
        print("Slice around 4724:")
        print(repr(json_str[4700:4800]))
        # parse only up to end of object
        valid_json = json_str[:4723].strip()
        try:
            d = json.loads(valid_json)
            print("Parsed initial state! Keys:", d.keys())
            print(json.dumps(d, indent=2)[:1000])
        except Exception as e:
            print("Failed:", e)
