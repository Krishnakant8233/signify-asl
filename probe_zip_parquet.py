import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {'User-Agent': 'Mozilla/5.0'}

for url in [
    "https://huggingface.co/datasets/A-Z-E/aslKaggleSet/resolve/main/sign-language-recognition-project.zip",
    "https://huggingface.co/datasets/Marxulia/asl_sign_languages_alphabets_v03/resolve/main/data/train-00000-of-00001.parquet"
]:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            print(f"SUCCESS: {url}")
            print(f"  status: {resp.status}, length: {resp.headers.get('Content-Length')}, type: {resp.headers.get('Content-Type')}")
    except Exception as e:
        print(f"FAIL: {url} -> {e}")
