import urllib.request
import json
import re

def get_data(url, yr):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        match = re.search(r'<script id="__NEXT_DATA__".*?>(.*?)</script>', html)
        if not match:
            print("No match for " + str(yr))
            return
            
        data = json.loads(match.group(1))
        queries = data.get('props', {}).get('pageProps', {}).get('initialState', {}).get('queries', [])
        
        cities = []
        for q in queries:
            state_data = q.get('state', {}).get('data', {})
            if 'cities' in state_data:
                cities = state_data['cities']
                break
                
        if cities:
            print("\n=== " + str(yr) + " TOP 20 CITIES ===")
            top20 = cities[:20]
            print(json.dumps([{"name": c["name"], "votes": int(c["votes"])} for c in top20], indent=2))
        else:
            print("Cities not found in JSON for " + str(yr))
            
    except Exception as e:
        print("Error fetching " + str(yr) + ": " + str(e))

get_data('https://noticias.uol.com.br/eleicoes/2022/1turno/ma/candidatos/deputado-estadual/adelmo-soares-40000-psb/', 2022)
get_data('https://noticias.uol.com.br/eleicoes/2018/1turno/ma/candidatos/deputado-estadual/adelmo-soares-65555-pcdob/', 2018)
