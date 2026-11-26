import urllib.request
import json
import re
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request("https://huggingface.co/api/datasets/Voxel51/American-Sign-Language-MNIST", headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print("Voxel51 siblings:")
    for s in data.get('siblings', []):
        print("  file:", s.get('rfilename'))

# Also check Mendeley html
req2 = urllib.request.Request("https://data.mendeley.com/datasets/jdyksv2jhh/1", headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req2, timeout=10, context=ctx) as resp2:
        html = resp2.read().decode('utf-8')
        print("\nMendeley HTML length:", len(html))
        # Look for download links
        links = re.findall(r'href=[\'"]([^\'"]*download[^\'"]*)[\'"]', html, re.I)
        print("Mendeley download links:", links)
        files = re.findall(r'https?://[^\s"\'<>]+(?:\.zip|\.tar\.gz|\.csv)', html, re.I)
        print("Mendeley archive links:", files)
        # Look for direct file api or data links
        api_links = re.findall(r'/api/datasets/[^\s"\'<>]+', html)
        print("Mendeley api links in html:", api_links[:5])
except Exception as e:
    print("Mendeley html fetch failed:", e)
