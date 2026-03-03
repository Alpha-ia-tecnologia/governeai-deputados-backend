const fs = require('fs');
const https = require('https');
const readline = require('readline');
const { execSync } = require('child_process');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error('Failed to download file: ' + response.statusCode));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

function parseCSV(filePath, candidateNumber, year, encoding) {
    return new Promise((resolve, reject) => {
        const results = {};
        let totalStateVotes = 0;

        // Use PowerShell to read the file with Latin1/ISO-8859-1 decoding if necessary
        // or just use node's readline since we only need the number columns which are ascii, 
        // and city names which we can map or handle later.
        const fileStream = fs.createReadStream(filePath, { encoding: 'latin1' });
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let headers = [];
        let isFirstLine = true;

        const numberIndex = year === 2022 ? 16 : 16;
        // 2022 mapping: NM_MUNICIPIO (14), NR_CANDIDATO (16), QT_VOTOS_NOMINAIS (21)
        // Let's actually find the indices dynamically for safety

        rl.on('line', (line) => {
            // Split by semicolon, respecting quotes (basic split since TSE CSV format has no newlines inside fields, and no semicolons inside data unless quoted).
            const fields = line.split(';');
            const cleanFields = fields.map(f => f.replace(/^"|"$/g, ''));

            if (isFirstLine) {
                headers = cleanFields;
                isFirstLine = false;
                return;
            }

            const cityIdx = headers.indexOf('NM_MUNICIPIO');
            const candIdx = headers.indexOf('NR_CANDIDATO');
            const votesIdx = headers.indexOf('QT_VOTOS_NOMINAIS');
            const cargoIdx = headers.indexOf('CD_CARGO');

            if (cityIdx === -1 || candIdx === -1 || votesIdx === -1) return;

            // cargo 7=Dep Estadual
            if (cleanFields[cargoIdx] !== '7') return;

            if (cleanFields[candIdx] === candidateNumber) {
                const city = cleanFields[cityIdx];
                const votes = parseInt(cleanFields[votesIdx], 10) || 0;

                results[city] = (results[city] || 0) + votes;
                totalStateVotes += votes;
            }
        });

        rl.on('close', () => {
            // Sort and get top 20
            const sorted = Object.entries(results)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([name, votes]) => ({ name, votes }));

            resolve({ total: totalStateVotes, top20: sorted });
        });

        rl.on('error', reject);
    });
}

async function main() {
    console.log("Starting TSE Data fetcher...");

    // 2022 Data
    console.log("Fetching 2022 data...");
    const zip2022 = 'votacao_candidato_munzona_2022_MA.zip';
    await downloadFile('https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022_MA.zip', zip2022);
    execSync(`tar -xf ${zip2022}`);
    const res2022 = await parseCSV('votacao_candidato_munzona_2022_MA.csv', '40000', 2022);
    console.log("\n=== 2022 (Adelmo 40000) ===");
    console.log(`TOTAL VOTOS: ${res2022.total}`);
    console.log("TOP 20 CITIES:");
    console.log(JSON.stringify(res2022.top20, null, 2));

    // 2018 Data
    console.log("\nFetching 2018 data...");
    const zip2018 = 'votacao_candidato_munzona_2018_MA.zip';
    await downloadFile('https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2018_MA.zip', zip2018);
    execSync(`tar -xf ${zip2018}`);
    const res2018 = await parseCSV('votacao_candidato_munzona_2018_MA.csv', '65555', 2018);
    console.log("\n=== 2018 (Adelmo 65555) ===");
    console.log(`TOTAL VOTOS: ${res2018.total}`);
    console.log("TOP 20 CITIES:");
    console.log(JSON.stringify(res2018.top20, null, 2));
}

main().catch(console.error);
