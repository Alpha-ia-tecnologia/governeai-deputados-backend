const https = require('https');

function fetchAdelmoCities(url, year) {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                // Procurar pelo JSON embutido na tag script do Next.js
                // Padrão <script id="__NEXT_DATA__" type="application/json">...</script>
                const match = data.match(/<script id="__NEXT_DATA__".*?>(.*?)<\/script>/);
                if (match && match[1]) {
                    const jsonData = JSON.parse(match[1]);

                    // Navigating the UOL JSON structure
                    // queries -> /eleicoes/[year]/[turn]/[state]/candidatos/[office]/[slug] -> data -> cities
                    let candidateData = null;

                    // Search for the query containing 'cities'
                    for (const query of jsonData.props.pageProps.initialState.queries) {
                        if (query.state && query.state.data && query.state.data.cities) {
                            candidateData = query.state.data;
                            break;
                        }
                    }

                    if (candidateData) {
                        const top20 = candidateData.cities.slice(0, 20);
                        console.log(`\n=== TOP 20 CITIES ${year} ===`);
                        console.log(JSON.stringify(top20.map(c => ({ name: c.name, votes: c.votes })), null, 2));
                    } else {
                        // Alternatively, search specifically via regex if the state structure is different
                        const citiesMatch = data.match(/"cities":(\[.*?\]),"votesByZone"/);
                        if (citiesMatch && citiesMatch[1]) {
                            const parseCities = JSON.parse(citiesMatch[1]);
                            console.log(`\n=== TOP 20 CITIES ${year} ===`);
                            console.log(JSON.stringify(parseCities.slice(0, 20).map(c => ({ name: c.name, votes: c.votes })), null, 2));
                        } else {
                            console.log("Could not find cities array in HTML.");
                        }
                    }
                } else {
                    // Try raw regex fallback
                    const citiesMatch = data.match(/"cities":(\[.*?\]),"votesByZone"/);
                    if (citiesMatch && citiesMatch[1]) {
                        const parseCities = JSON.parse(citiesMatch[1]);
                        console.log(`\n=== TOP 20 CITIES ${year} ===`);
                        console.log(JSON.stringify(parseCities.slice(0, 20).map(c => ({ name: c.name, votes: c.votes })), null, 2));
                    } else {
                        console.log("Regex fallback also failed.");
                    }
                }
            } catch (err) {
                console.error("Error parsing JSON:", err.message);
            }
        });
    }).on('error', err => console.error(err));
}

fetchAdelmoCities('https://noticias.uol.com.br/eleicoes/2022/1turno/ma/candidatos/deputado-estadual/adelmo-soares-40000-psb/', 2022);
fetchAdelmoCities('https://noticias.uol.com.br/eleicoes/2018/1turno/ma/candidatos/deputado-estadual/adelmo-soares-65555-pcdob/', 2018);
