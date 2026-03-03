const https = require('https');

function probe(url) {
    return new Promise((resolve) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, url, data: d.substring(0, 300) }));
        }).on('error', e => resolve({ status: 'ERR', url, data: e.message }));
    });
}

async function main() {
    // city code from config: cd=09210 (Caxias), cdi=210300 (IBGE)
    // Election 2022 = 544
    const patterns = [
        // Pattern 1: dados-simplificados with cd
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/ma/ma09210-c0008-e000544-v.json',
        // Pattern 2: dados with cd
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados/ma/ma09210-c0008-e000544-v.json',
        // Pattern 3: without leading zero
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/ma/ma9210-c0008-e000544-v.json',
        // Pattern 4: with IBGE code (cdi)
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/ma/ma210300-c0008-e000544-v.json',
        // Pattern 5: different cargo code format
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/ma/ma09210-c008-e000544-v.json',
        // Pattern 6: r.json instead of v.json
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/ma/ma09210-c0008-e000544-r.json',
        // Pattern 7: dados with r.json
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados/ma/ma09210-c0008-e000544-r.json',
        // Pattern 8: state level file that may list all candidates
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados/ma/ma-c0008-e000544-r.json',
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/ma/ma-c0008-e000544-r.json',
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/ma/ma-c0008-e000544-v.json',
        // Pattern 9: with zone number
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados/ma/ma09210-z0001-c0008-e000544-v.json',
        'https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/ma/ma09210-z0001-c0008-e000544-v.json',
        // Pattern 10: candidatura API
        'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/2022/MA/2040602022/8/candidatos',
        // Pattern 11: try download the bulk CSV
        'https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip',
        // Pattern 12: older URL format
        'https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022_MA.zip',
    ];

    for (const url of patterns) {
        const result = await probe(url);
        const shortUrl = url.split('tse.jus.br')[1];
        if (result.status === 200) {
            console.log(`OK  ${shortUrl}`);
            console.log(`    ${result.data.substring(0, 150)}`);
        } else {
            console.log(`${result.status} ${shortUrl}`);
        }
    }
}

main();
