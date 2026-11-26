import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {'User-Agent': 'Mozilla/5.0'}

url = "https://huggingface.co/api/datasets?search=sign-language&limit=15"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    for item in data:
        print(item.get('id'), "downloads:", item.get('downloads', 0))
