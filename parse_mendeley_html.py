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

# Search for window.__INITIAL_STATE__ or json scripts
matches = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
for m in matches:
    if 'jdyksv2jhh' in m or 'download' in m or 'files' in m:
        print("Found matching script, length:", len(m))
        print(m[:500])
        print("...")
        # look for file download links or s3 urls
        urls = re.findall(r'https?://[^\s"\'\\]+', m)
        for u in urls:
            if 'download' in u or 's3' in u or 'mendeley' in u:
                print("  URL:", u)
