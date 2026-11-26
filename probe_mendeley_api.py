import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for endpoint in [
    "https://data.mendeley.com/api/datasets-v2/datasets/jdyksv2jhh/files",
    "https://data.mendeley.com/api/datasets-v2/datasets/jdyksv2jhh/1/files",
    "https://data.mendeley.com/api/datasets-v2/datasets/jdyksv2jhh/root_folder",
    "https://data.mendeley.com/api/datasets-v2/datasets/jdyksv2jhh/1/root_folder",
    "https://data.mendeley.com/api/datasets-v2/datasets/jdyksv2jhh/archive",
    "https://data.mendeley.com/api/datasets-v2/datasets/jdyksv2jhh/1/archive"
]:
    try:
        req = urllib.request.Request(endpoint, headers=headers)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            print(f"SUCCESS {endpoint}: {resp.status}")
            data = resp.read(2000)
            print("Content:", data[:500].decode('utf-8', errors='ignore'))
    except Exception as e:
        print(f"FAIL {endpoint}: {e}")
