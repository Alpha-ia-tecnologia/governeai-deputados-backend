const XLSX = require('xlsx');
const axios = require('axios');
const path = 'C:\\Users\\RonaldoPimentel\\Documents\\governeai-deputados\\Cadastro_Pessoas_Gabinete_Social (1).xlsx';

const API_URL = 'http://localhost:3750';

function decodeJWT(token) {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString());
}

async function getTokenAndUserId() {
    const res = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@governeai.com',
        password: 'admin123',
    });
    const token = res.data.access_token;
    const decoded = decodeJWT(token);
    return { token, userId: decoded.sub };
}

function parseDate(val) {
    if (!val) return undefined;
    if (typeof val === 'string') {
        const parts = val.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return undefined;
    }
    if (typeof val === 'number') {
        const d = new Date((val - 25569) * 86400 * 1000);
        return d.toISOString().split('T')[0];
    }
    return undefined;
}

function formatPhone(val) {
    if (!val) return '';
    return String(val).replace(/\D/g, '');
}

async function main() {
    console.log('=== Importando Cadastro de Pessoas ===\n');

    const { token, userId } = await getTokenAndUserId();
    console.log('Token obtido. User ID:', userId, '\n');

    const wb = XLSX.readFile(path);
    const ws = wb.Sheets['Cadastro de Pessoas'];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header row
    let headerIdx = -1;
    for (let i = 0; i < 10; i++) {
        if (data[i] && data[i][0] === 'Nº') {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx < 0) { console.error('Header row not found!'); return; }

    const headers = data[headerIdx];
    const COL = {};
    headers.forEach((h, i) => { COL[h] = i; });

    const rows = data.slice(headerIdx + 1).filter(r => r[COL['Nome Completo']]);
    console.log(`Total rows to import: ${rows.length}\n`);

    let created = 0, skipped = 0, errors = 0;

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const name = String(r[COL['Nome Completo']] || '').trim();
        if (!name) { skipped++; continue; }

        const phone = formatPhone(r[COL['WhatsApp']]);
        if (!phone) { skipped++; continue; }

        const voter = {
            name,
            phone,
            birthDate: parseDate(r[COL['Data de Nascimento']]),
            neighborhood: String(r[COL['Bairro']] || '').trim() || undefined,
            zona: String(r[COL['Zona']] || '').trim() || undefined,
            localidade: String(r[COL['Localidade']] || '').trim() || undefined,
            tipoSuporte: String(r[COL['Tipo de Suporte']] || '').trim() || undefined,
            articulador: String(r[COL['Articulador']] || '').trim() || undefined,
            idade: r[COL['Idade']] && parseInt(String(r[COL['Idade']])) > 0 ? parseInt(String(r[COL['Idade']])) : undefined,
            notes: String(r[COL['Observação']] || '').trim() || undefined,
            votesCount: 0,
            vereadorId: userId,
        };

        try {
            await axios.post(`${API_URL}/voters`, voter, {
                headers: { Authorization: `Bearer ${token}` },
            });
            created++;
        } catch (err) {
            errors++;
            if (errors <= 3) {
                console.error(`Erro [${name}]:`, err.response?.data?.message || err.message);
            }
        }

        if ((i + 1) % 200 === 0) {
            console.log(`Progresso: ${i + 1}/${rows.length} | criados: ${created} | erros: ${errors}`);
        }
    }

    console.log(`\n=== RESULTADO ===`);
    console.log(`Total: ${rows.length} | Criados: ${created} | Pulados: ${skipped} | Erros: ${errors}`);
}

main().catch(console.error);
