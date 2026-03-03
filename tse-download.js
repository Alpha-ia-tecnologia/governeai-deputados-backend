const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

function download(url, dest) {
    return new Promise((resolve, reject) => {
        console.log('Downloading:', url.split('/').pop());
        const file = fs.createWriteStream(dest);
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                file.close();
                return download(res.headers.location, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error('Status ' + res.statusCode));
            }
            const total = parseInt(res.headers['content-length'], 10);
            let downloaded = 0;
            res.pipe(file);
            res.on('data', (chunk) => {
                downloaded += chunk.length;
                if (total) process.stdout.write('\r  ' + (downloaded / 1024 / 1024).toFixed(1) + 'MB / ' + (total / 1024 / 1024).toFixed(1) + 'MB');
            });
            file.on('finish', () => { file.close(); console.log('\n  Done.'); resolve(); });
        }).on('error', reject);
    });
}

async function processCSV(csvPath, year, candidateNum) {
    console.log('\nProcessing ' + csvPath + ' for candidate ' + candidateNum + '...');
    const results = {};

    const rl = readline.createInterface({
        input: fs.createReadStream(csvPath, { encoding: 'latin1' }),
        crlfDelay: Infinity
    });

    let header = null;
    let nmMunIdx, nrCandIdx, qtVotosIdx, sgUfIdx;

    for await (const line of rl) {
        const cols = line.split(';').map(c => c.replace(/"/g, ''));

        if (!header) {
            header = cols;
            nmMunIdx = cols.indexOf('NM_MUNICIPIO');
            nrCandIdx = cols.indexOf('NR_VOTAVEL');
            if (nrCandIdx === -1) nrCandIdx = cols.indexOf('NR_CANDIDATO');
            qtVotosIdx = cols.indexOf('QT_VOTOS');
            if (qtVotosIdx === -1) qtVotosIdx = cols.indexOf('QT_VOTOS_NOMINAIS');
            sgUfIdx = cols.indexOf('SG_UF');
            console.log('  Column indices:', { nmMunIdx, nrCandIdx, qtVotosIdx, sgUfIdx });
            console.log('  Header sample:', cols.slice(0, 10).join(', '));
            continue;
        }

        if (cols[nrCandIdx] === candidateNum) {
            const city = cols[nmMunIdx];
            const votes = parseInt(cols[qtVotosIdx], 10) || 0;
            results[city] = (results[city] || 0) + votes;
        }
    }

    const sorted = Object.entries(results)
        .map(([name, votes]) => ({ name, votes }))
        .sort((a, b) => b.votes - a.votes);

    const totalVotes = sorted.reduce((s, c) => s + c.votes, 0);
    console.log('\n=== ' + year + ' - Candidate ' + candidateNum + ' ===');
    console.log('Total cities: ' + sorted.length + ', Total votes: ' + totalVotes);
    sorted.slice(0, 20).forEach((c, i) => console.log('  ' + (i + 1) + '. ' + c.name + ': ' + c.votes));

    fs.writeFileSync('adelmo_cities_' + year + '.json', JSON.stringify(sorted, null, 2));
    console.log('Full results saved to adelmo_cities_' + year + '.json');
    return sorted;
}

async function main() {
    const tmpDir = path.join(__dirname, 'tse_data');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // 2022 - votacao por secao MA
    const zip2022 = path.join(tmpDir, 'votacao_secao_2022_MA.zip');
    if (!fs.existsSync(zip2022)) {
        await download('https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2022_MA.zip', zip2022);
    } else {
        console.log('2022 ZIP already exists, skipping download');
    }

    const extract2022 = path.join(tmpDir, 'secao_2022');
    if (!fs.existsSync(extract2022)) {
        fs.mkdirSync(extract2022, { recursive: true });
        console.log('Extracting 2022...');
        execSync('powershell -Command "Expand-Archive -Path \'' + zip2022 + '\' -DestinationPath \'' + extract2022 + '\' -Force"', { stdio: 'inherit' });
    }

    const files2022 = fs.readdirSync(extract2022);
    console.log('Files in 2022:', files2022);
    const csv2022 = files2022.find(f => f.endsWith('.csv'));
    if (csv2022) {
        await processCSV(path.join(extract2022, csv2022), 2022, '40000');
    }

    // 2018 - votacao por secao MA
    const zip2018 = path.join(tmpDir, 'votacao_secao_2018_MA.zip');
    if (!fs.existsSync(zip2018)) {
        await download('https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2018_MA.zip', zip2018);
    } else {
        console.log('2018 ZIP already exists, skipping download');
    }

    const extract2018 = path.join(tmpDir, 'secao_2018');
    if (!fs.existsSync(extract2018)) {
        fs.mkdirSync(extract2018, { recursive: true });
        console.log('Extracting 2018...');
        execSync('powershell -Command "Expand-Archive -Path \'' + zip2018 + '\' -DestinationPath \'' + extract2018 + '\' -Force"', { stdio: 'inherit' });
    }

    const files2018 = fs.readdirSync(extract2018);
    console.log('Files in 2018:', files2018);
    const csv2018 = files2018.find(f => f.endsWith('.csv'));
    if (csv2018) {
        await processCSV(path.join(extract2018, csv2018), 2018, '65555');
    }
}

main().catch(console.error);
