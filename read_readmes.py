import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Read README of Marxulia
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request("https://huggingface.co/datasets/Marxulia/asl_sign_languages_alphabets_v03/raw/main/README.md", headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
        print("Marxulia README:")
        print(resp.read().decode('utf-8')[:1500])
except Exception as e:
    print("Marxulia README error:", e)

# Read README of Voxel51
req2 = urllib.request.Request("https://huggingface.co/datasets/Voxel51/American-Sign-Language-MNIST/raw/main/README.md", headers=headers)
try:
    with urllib.request.urlopen(req2, timeout=10, context=ctx) as resp:
        print("\nVoxel51 README:")
        print(resp.read().decode('utf-8')[:1500])
except Exception as e:
    print("Voxel51 README error:", e)
