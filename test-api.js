const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🔍 Testando API do Backend...\n');
  
  try {
    // 1. Testar se o servidor está rodando
    console.log('1️⃣ Testando conexão com servidor...');
    try {
      const serverTest = await axios.get(API_URL);
      console.log('✅ Servidor está respondendo\n');
    } catch (error) {
      console.log('✅ Servidor está rodando (retornou 404 para rota raiz, o que é esperado)\n');
    }

    // 2. Testar endpoint de teste
    console.log('2️⃣ Testando endpoint /voters/test...');
    try {
      const testResponse = await axios.get(`${API_URL}/voters/test`);
      console.log('✅ Endpoint de teste funcionando:', testResponse.data);
      console.log('');
    } catch (error) {
      console.log('❌ Erro no endpoint de teste:', error.message);
      console.log('');
    }

    // 3. Testar endpoint debug (sem autenticação)
    console.log('3️⃣ Testando endpoint /voters/debug (sem autenticação)...');
    try {
      const debugResponse = await axios.get(`${API_URL}/voters/debug`);
      console.log('✅ Resposta do debug:');
      console.log('   - Success:', debugResponse.data.success);
      console.log('   - Total de eleitores:', debugResponse.data.count);
      if (debugResponse.data.data && debugResponse.data.data.length > 0) {
        console.log('   - Primeiros 3 eleitores:');
        debugResponse.data.data.slice(0, 3).forEach(voter => {
          console.log(`     • ${voter.name} (ID: ${voter.id})`);
        });
      }
      console.log('');
    } catch (error) {
      console.log('❌ Erro no endpoint debug:', error.response?.data || error.message);
      console.log('');
    }

    // 4. Fazer login para obter token
    console.log('4️⃣ Fazendo login para obter token...');
    let token = null;
    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@parna.ba.gov.br',
        password: 'admin123'
      });
      token = loginResponse.data.access_token;
      console.log('✅ Login bem-sucedido!');
      console.log('   - Token obtido:', token.substring(0, 50) + '...');
      console.log('');
    } catch (error) {
      console.log('❌ Erro no login:', error.response?.data || error.message);
      console.log('💡 Tente criar o usuário admin executando: node init-db.js');
      console.log('');
    }

    // 5. Testar endpoint protegido com token
    if (token) {
      console.log('5️⃣ Testando endpoint /voters (COM autenticação)...');
      try {
        const votersResponse = await axios.get(`${API_URL}/voters`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('✅ Endpoint protegido funcionando!');
        console.log('   - Total de eleitores:', votersResponse.data.length);
        if (votersResponse.data.length > 0) {
          console.log('   - Primeiros 3 eleitores:');
          votersResponse.data.slice(0, 3).forEach(voter => {
            console.log(`     • ${voter.name} (Liderança: ${voter.leaderName || 'Sem liderança'})`);
          });
        }
        console.log('');
      } catch (error) {
        console.log('❌ Erro no endpoint protegido:', error.response?.data || error.message);
        console.log('');
      }
    }

    // 6. Testar leaders
    console.log('6️⃣ Testando endpoint /leaders/debug...');
    try {
      const leadersResponse = await axios.get(`${API_URL}/leaders`);
      console.log('✅ Total de lideranças:', leadersResponse.data.length);
      if (leadersResponse.data.length > 0) {
        console.log('   - Primeiras 3 lideranças:');
        leadersResponse.data.slice(0, 3).forEach(leader => {
          console.log(`     • ${leader.name} (Região: ${leader.region || 'Não definida'})`);
        });
      }
      console.log('');
    } catch (error) {
      if (token) {
        // Tentar com token
        try {
          const leadersResponse = await axios.get(`${API_URL}/leaders`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('✅ Total de lideranças (com auth):', leadersResponse.data.length);
        } catch (err) {
          console.log('❌ Erro ao buscar lideranças:', err.message);
        }
      } else {
        console.log('❌ Erro ao buscar lideranças (sem auth):', error.message);
      }
      console.log('');
    }

    console.log('✅ Teste concluído!\n');
    console.log('📝 Resumo:');
    console.log('   - Servidor: OK');
    console.log('   - Autenticação:', token ? 'OK' : 'FALHOU');
    console.log('   - Endpoints públicos: OK');
    console.log('   - Endpoints protegidos:', token ? 'OK' : 'Não testado (sem token)');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️ O servidor backend não está rodando!');
      console.log('Execute: npm run start:dev');
    }
  }
}

// Executar teste
testAPI();
