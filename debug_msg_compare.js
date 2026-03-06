const axios = require('axios');

async function main() {
    const baseUrl = 'https://evolution-evolution-api.gkgtsp.easypanel.host';
    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';
    const instance = 'gabinete';
    const remoteJid = '559884302769@s.whatsapp.net';

    // Check inbound messages with all possible content fields
    const r = await axios.post(`${baseUrl}/chat/findMessages/${instance}`, {
        where: { key: { remoteJid } },
        limit: 30,
    }, { headers: { apikey: apiKey } });

    const recs = r.data.messages?.records || [];

    // Find inbound messages with TEXT content (messageType=conversation)
    const inbound = recs.filter(m => !m.key?.fromMe && m.messageType === 'conversation');
    console.log('Text inbound messages found:', inbound.length);

    if (inbound.length > 0) {
        const m = inbound[0];
        console.log('\n--- First text inbound message ---');
        console.log('All keys:', Object.keys(m));

        // Print every key-value pair
        for (const key of Object.keys(m)) {
            const val = m[key];
            const str = val === null ? 'null' : JSON.stringify(val);
            console.log(`  ${key}: ${str.substring(0, 200)}`);
        }
    }

    // Also check an OUTBOUND message for comparison
    const outbound = recs.filter(m => m.key?.fromMe && m.messageType === 'conversation');
    if (outbound.length > 0) {
        const m = outbound[0];
        console.log('\n--- First text outbound message ---');
        for (const key of Object.keys(m)) {
            const val = m[key];
            const str = val === null ? 'null' : JSON.stringify(val);
            console.log(`  ${key}: ${str.substring(0, 200)}`);
        }
    }
}

main().catch(e => console.error(e.message));
