const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Status ${res.statusCode} for ${url}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function getCityVotes(year, candidateNum, targetCities) {
    console.log(`\n=== BUSCANDO VOTOS TSE ${year} (CANDIDATO ${candidateNum}) ===`);

    // Configurações por ano (códigos da eleição do TSE)
    // 2022: Eleição 544. 2018: Eleição 297
    const elecCode = year === 2022 ? '544' : '297';
    const cargoCode = '0008'; // Deputado Estadual

    try {
        // 1. Pegar municípios do MA
        const munUrl = `https://resultados.tse.jus.br/oficial/ele${year}/${elecCode}/config/mun-e000${elecCode}-cm.json`;
        const munData = await fetchJson(munUrl);

        // As cidades estão dentro da UF MA
        const ufMa = munData.abr.find(u => u.cd === 'MA');
        if (!ufMa) throw new Error('Maranhão não encontrado na lista de UFs');

        const cidades = ufMa.mu;
        const results = [];

        // Queremos apenas as cidades exatas ou as top gerais
        // Para ser rápido, vamos iterar em todas do MA, buscar e ordenar, 
        // mas como são 217, faremos lotes de 20 conexões simultâneas
        console.log(`Encontrados ${cidades.length} municípios no MA. Baixando resultados...`);

        const chunks = [];
        for (let i = 0; i < cidades.length; i += 20) chunks.push(cidades.slice(i, i + 20));

        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (city) => {
                const cityCode = city.cd; // Ex: 09210
                // Ex: ma09210-c0008-e000544-v.json
                const url = `https://resultados.tse.jus.br/oficial/ele${year}/${elecCode}/dados-simplificados/ma/ma${cityCode}-c${cargoCode}-e000${elecCode}-v.json`;

                try {
                    const resultData = await fetchJson(url);
                    // resultData.cand tem a lista de candidatos
                    const cand = resultData.cand.find(c => c.n === candidateNum);
                    if (cand) {
                        results.push({ name: city.nm, votes: parseInt(cand.vap, 10) || 0 });
                    }
                } catch (err) {
                    // Ignore 404s for places with no votes or data missing
                }
            }));
        }

        // Order by votes
        results.sort((a, b) => b.votes - a.votes);

        console.log(`\n--- TOP 20 CIDADES PARA ${candidateNum} EM ${year} ---`);
        console.log(JSON.stringify(results.slice(0, 20), null, 2));

        // Also log specific cities we care about if not in top 20
        const topNames = results.slice(0, 20).map(r => r.name);
        for (const tc of targetCities) {
            if (!topNames.includes(tc)) {
                const found = results.find(r => r.name === tc);
                if (found) console.log(`Extra city: ${tc} -> ${found.votes}`);
                else console.log(`Extra city: ${tc} -> 0 (não encontrado)`);
            }
        }
    } catch (e) {
        console.error(`Erro grave em ${year}:`, e.message);
    }
}

async function main() {
    const targetCities = [
        "CAXIAS", "LAGOA GRANDE DO MARANHÃO", "TUNTUM", "CODÓ", "AFONSO CUNHA",
        "SÃO LUÍS", "TIMON", "ALDEIAS ALTAS", "SÃO JOÃO DO SÓTER", "MATÕES",
        "PARNARAMA", "COELHO NETO", "COROATÁ", "PEDREIRAS", "BACABAL"
    ];

    await getCityVotes(2022, '40000', targetCities);
    await getCityVotes(2018, '65555', targetCities);
}

main();
