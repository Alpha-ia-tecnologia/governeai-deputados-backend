const XLSX = require('xlsx');
const fs = require('fs');
const path = 'C:\\Users\\RonaldoPimentel\\Documents\\governeai-deputados\\Cadastro_Pessoas_Gabinete_Social (1).xlsx';
const wb = XLSX.readFile(path);

let output = '';

// Sheet: Cadastro de Pessoas
const ws1 = wb.Sheets['Cadastro de Pessoas'];
const data1 = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: '' });
output += '=== CADASTRO DE PESSOAS ===\n';
output += 'Total rows: ' + data1.length + '\n\n';

// Find the header row (the one with "Nº")
let headerIdx = -1;
for (let i = 0; i < 10; i++) {
    if (data1[i] && data1[i][0] === 'Nº') {
        headerIdx = i;
        break;
    }
}
output += 'Header row index: ' + headerIdx + '\n';

if (headerIdx >= 0) {
    const headers = data1[headerIdx];
    output += 'HEADERS (' + headers.length + ' cols):\n';
    headers.forEach((h, i) => {
        output += '  Col ' + i + ': [' + h + ']\n';
    });

    // Sample data
    for (let r = headerIdx + 1; r < Math.min(data1.length, headerIdx + 6); r++) {
        output += '\nRow ' + (r - headerIdx) + ':\n';
        headers.forEach((h, j) => {
            const val = data1[r][j];
            if (val !== undefined && val !== null && val !== '') {
                output += '  ' + h + ': ' + val + '\n';
            }
        });
    }
}

// Sheet: Atendimentos
output += '\n\n=== ATENDIMENTOS ===\n';
const ws2 = wb.Sheets['Atendimentos'];
const data2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '' });
output += 'Total rows: ' + data2.length + '\n';

let headerIdx2 = -1;
for (let i = 0; i < 10; i++) {
    if (data2[i] && data2[i][0] === 'Nº') {
        headerIdx2 = i;
        break;
    }
}
output += 'Header row index: ' + headerIdx2 + '\n';

if (headerIdx2 >= 0) {
    const headers2 = data2[headerIdx2];
    output += 'HEADERS (' + headers2.length + ' cols):\n';
    headers2.forEach((h, i) => {
        output += '  Col ' + i + ': [' + h + ']\n';
    });

    for (let r = headerIdx2 + 1; r < Math.min(data2.length, headerIdx2 + 4); r++) {
        output += '\nRow ' + (r - headerIdx2) + ':\n';
        headers2.forEach((h, j) => {
            const val = data2[r][j];
            if (val !== undefined && val !== null && val !== '') {
                output += '  ' + h + ': ' + val + '\n';
            }
        });
    }
}

fs.writeFileSync('C:\\tmp\\xlsx-output.txt', output, 'utf-8');
console.log('Done');
