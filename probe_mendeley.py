import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for endpoint in [
    "https://data.mendeley.com/public-api/datasets/jdyksv2jhh/1",
    "https://data.mendeley.com/public-api/datasets/jdyksv2jhh/1/files",
    "https://prod-dcd-datasets-cache-zipfiles.s3.eu-west-1.amazonaws.com/jdyksv2jhh-1.zip",
    "https://data.mendeley.com/datasets/jdyksv2jhh/1/files"
]:
    try:
        req = urllib.request.Request(endpoint, headers=headers)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            print(f"SUCCESS {endpoint}: {resp.status}, len={resp.headers.get('Content-Length')}")
            content = resp.read(1000)
            print("Preview:", content[:200])
    except Exception as e:
        print(f"FAIL {endpoint}: {e}")
