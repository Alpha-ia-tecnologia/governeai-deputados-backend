const XLSX = require('xlsx');
const wb = XLSX.readFile('../Cadastro_Pessoas_Gabinete_Social - atualizado.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Find actual header row (row index 1 typically)
console.log('=== ROW 0 (title) ===');
console.log(data[0]);
console.log('\n=== ROW 1 (headers) ===');
const headers = data[1];
headers.forEach((h, i) => console.log(`  ${i}: "${h}"`));

console.log('\n=== SAMPLE DATA (rows 2-5) ===');
for (let i = 2; i <= 5 && i < data.length; i++) {
    console.log(`\n--- Row ${i} ---`);
    headers.forEach((h, j) => {
        if (data[i][j] !== undefined && data[i][j] !== null && data[i][j] !== '') {
            console.log(`  ${h}: ${data[i][j]}`);
        }
    });
}

// Find articulador column
const artColIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('articulador'));
console.log('\n=== ARTICULADOR COLUMN INDEX ===', artColIdx);
if (artColIdx >= 0) {
    console.log('Column name:', headers[artColIdx]);

    // Extract unique articuladores
    const articuladores = new Set();
    let emptyCount = 0;
    for (let i = 2; i < data.length; i++) {
        const val = data[i][artColIdx];
        if (val && val.toString().trim()) {
            articuladores.add(val.toString().trim().toUpperCase());
        } else {
            emptyCount++;
        }
    }
    console.log('\n=== UNIQUE ARTICULADORES ===');
    console.log('Count:', articuladores.size);
    console.log('Empty/missing:', emptyCount);
    [...articuladores].sort().forEach(a => console.log(`  - ${a}`));
}

console.log('\n=== TOTAL DATA ROWS ===', data.length - 2);
