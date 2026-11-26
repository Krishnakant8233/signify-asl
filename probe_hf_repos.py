import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {'User-Agent': 'Mozilla/5.0'}

for repo in ["Marxulia/asl_sign_languages_alphabets_v03", "A-Z-E/aslKaggleSet"]:
    try:
        url = f"https://huggingface.co/api/datasets/{repo}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"Repo {repo}:")
            for s in data.get('siblings', [])[:10]:
                print("  file:", s.get('rfilename'))
    except Exception as e:
        print(f"Repo {repo} error:", e)
