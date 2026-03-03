const https = require('https');

function fetchCities(url, year) {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const startStr = '<script id="__NEXT_DATA__" type="application/json">';
            const startIdx = data.indexOf(startStr);
            if (startIdx === -1) {
                console.log(`Could not find NEXT_DATA for ${year}`);
                return;
            }
            const endIdx = data.indexOf('</script>', startIdx);
            const jsonStr = data.substring(startIdx + startStr.length, endIdx);

            try {
                const parsed = JSON.parse(jsonStr);
                const queries = parsed.props.pageProps.initialState.queries;
                let found = false;
                for (const q of queries) {
                    if (q.state && q.state.data && q.state.data.cities) {
                        const top20 = q.state.data.cities.slice(0, 20);
                        console.log(`\n=== TOP 20 CITIES ${year} ===`);
                        console.log(JSON.stringify(top20.map(c => ({ name: c.name, votes: c.votes })), null, 2));
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    console.log(`Cities array not found inside JSON for ${year}`);
                }
            } catch (e) {
                console.error(`JSON Parse error for ${year}:`, e.message);
            }
        });
    }).on('error', e => console.error(e));
}

fetchCities('https://noticias.uol.com.br/eleicoes/2022/1turno/ma/candidatos/deputado-estadual/adelmo-soares-40000-psb/', 2022);
fetchCities('https://noticias.uol.com.br/eleicoes/2018/1turno/ma/candidatos/deputado-estadual/adelmo-soares-65555-pcdob/', 2018);
