import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for filename in ["metadata.json", "samples.json", "data/data_0/train_0.jpg"]:
    url = f"https://huggingface.co/datasets/Voxel51/American-Sign-Language-MNIST/resolve/main/{filename}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            print(f"SUCCESS {filename}: {resp.status}, length: {resp.headers.get('Content-Length')}")
            content = resp.read(500)
            if filename.endswith('.json'):
                print(content.decode('utf-8', errors='ignore'))
    except Exception as e:
        print(f"FAIL {filename}: {e}")
