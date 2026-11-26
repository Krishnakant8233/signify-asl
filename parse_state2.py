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
        if json_str.endswith(';'):
            json_str = json_str[:-1]
        try:
            data = json.loads(json_str)
            print("INITIAL_STATE loaded successfully! Keys:", list(data.keys()))
            for k, v in data.items():
                if isinstance(v, dict):
                    print(f"  {k} -> dict with keys: {list(v.keys())[:10]}")
                elif isinstance(v, list):
                    print(f"  {k} -> list of len {len(v)}")
        except Exception as e:
            print("Failed to parse json:", e)
