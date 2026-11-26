import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def probe(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            print(f"SUCCESS: {url} -> {resp.status}, length: {resp.headers.get('Content-Length')}, type: {resp.headers.get('Content-Type')}")
            return resp.read(500)
    except Exception as e:
        print(f"FAILED: {url} -> {e}")
        return None

print("--- 1. Mendeley ---")
data1 = probe("https://data.mendeley.com/public-api/datasets/jdyksv2jhh/files")
if data1:
    print(data1[:300].decode('utf-8', errors='ignore'))

print("--- 2. Hugging Face Datasets ---")
probe("https://huggingface.co/datasets/grassknoted/asl-alphabet/resolve/main/asl_alphabet_train.zip")
probe("https://huggingface.co/datasets/monet-ai/sign-language-mnist/resolve/main/sign_mnist_train.csv")
probe("https://huggingface.co/api/datasets/Voxel51/American-Sign-Language-MNIST")
probe("https://huggingface.co/datasets/sayakpaul/asl_alphabet/raw/main/README.md")
probe("https://huggingface.co/datasets/keremberke/american-sign-language-detection/raw/main/README.md")
probe("https://raw.githubusercontent.com/ardamavi/Sign-Language-Digits-Dataset/master/README.md")
