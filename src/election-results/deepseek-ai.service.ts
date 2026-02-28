import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ElectionData {
    candidateName: string;
    party: string;
    totalVotes: number;
    year: number;
    municipalities?: { name: string; votes: number }[];
}

interface ScenarioParams {
    baseYear: number;
    targetYear: number;
    scenario: string;
    adjustments?: Record<string, number>;
}

@Injectable()
export class DeepseekAiService {
    private readonly logger = new Logger(DeepseekAiService.name);
    private readonly apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    private readonly apiKey = process.env.DEEPSEEK_API_KEY || '';
    private readonly model = 'deepseek-chat';

    private async callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.7,
                    max_tokens: 4000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 60000,
                }
            );

            return response.data.choices[0]?.message?.content || 'Sem resposta da IA.';
        } catch (error) {
            this.logger.error('Erro ao chamar DeepSeek:', error?.response?.data || error.message);
            throw new Error('Falha na comunicação com a IA. Tente novamente.');
        }
    }

    // ==================== ANÁLISE ELEITORAL ====================

    async analyzeElection(data: {
        candidate: ElectionData;
        competitors: ElectionData[];
        year: number;
        state: string;
    }): Promise<{ analysis: string; strengths: string[]; weaknesses: string[]; opportunities: string[] }> {
        const systemPrompt = `Você é um analista político sênior especializado em eleições brasileiras, com foco em eleições para Deputado Estadual no Maranhão. Responda sempre em português brasileiro, de forma objetiva e analítica. Use dados concretos quando possível.`;

        const competitorsInfo = data.competitors
            .slice(0, 10)
            .map((c, i) => `${i + 1}. ${c.candidateName} (${c.party}) - ${c.totalVotes.toLocaleString('pt-BR')} votos`)
            .join('\n');

        const userPrompt = `Analise o desempenho eleitoral do candidato a Deputado Estadual:

**Candidato**: ${data.candidate.candidateName} (${data.candidate.party})
**Eleição**: ${data.year} - ${data.state}
**Total de Votos**: ${data.candidate.totalVotes.toLocaleString('pt-BR')}

**Principais concorrentes**:
${competitorsInfo}

Forneça uma análise detalhada incluindo:
1. **Análise Geral**: Avaliação do desempenho do candidato
2. **Pontos Fortes** (liste 3-5): Fatores que contribuíram para o resultado
3. **Pontos Fracos** (liste 3-5): Aspectos que podem ser melhorados
4. **Oportunidades** (liste 3-5): Estratégias para melhorar nas próximas eleições

Responda em formato JSON:
{
  "analysis": "texto da análise geral",
  "strengths": ["ponto forte 1", "ponto forte 2", ...],
  "weaknesses": ["ponto fraco 1", "ponto fraco 2", ...],
  "opportunities": ["oportunidade 1", "oportunidade 2", ...]
}`;

        const response = await this.callDeepSeek(systemPrompt, userPrompt);

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            this.logger.warn('Falha ao parsear JSON da IA, retornando texto puro');
        }

        return {
            analysis: response,
            strengths: [],
            weaknesses: [],
            opportunities: [],
        };
    }

    // ==================== COMPARATIVO ENTRE ELEIÇÕES ====================

    async compareElections(data: {
        candidate: string;
        election2018: { party: string; votes: number; result: string; municipalities: number };
        election2022: { party: string; votes: number; result: string; municipalities: number };
    }): Promise<{ comparison: string; evolution: string; recommendations: string[] }> {
        const systemPrompt = `Você é um consultor político estratégico com vasta experiência em eleições estaduais do Maranhão. Analise a evolução eleitoral de candidatos entre ciclos eleitorais. Responda em português.`;

        const userPrompt = `Compare o desempenho eleitoral de ${data.candidate} entre as eleições de 2018 e 2022:

**Eleição 2018**:
- Partido: ${data.election2018.party}
- Votos: ${data.election2018.votes.toLocaleString('pt-BR')}
- Resultado: ${data.election2018.result}
- Municípios com votos: ${data.election2018.municipalities}

**Eleição 2022**:
- Partido: ${data.election2022.party}
- Votos: ${data.election2022.votes.toLocaleString('pt-BR')}
- Resultado: ${data.election2022.result}
- Municípios com votos: ${data.election2022.municipalities}

**Variação**: ${data.election2022.votes - data.election2018.votes > 0 ? '+' : ''}${(data.election2022.votes - data.election2018.votes).toLocaleString('pt-BR')} votos (${(((data.election2022.votes - data.election2018.votes) / data.election2018.votes) * 100).toFixed(1)}%)

Forneça em formato JSON:
{
  "comparison": "análise comparativa detalhada entre as duas eleições",
  "evolution": "tendência e evolução do candidato",
  "recommendations": ["recomendação 1", "recomendação 2", ...]
}`;

        const response = await this.callDeepSeek(systemPrompt, userPrompt);

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) {
            this.logger.warn('Falha ao parsear JSON da comparação');
        }

        return { comparison: response, evolution: '', recommendations: [] };
    }

    // ==================== SIMULAÇÃO DE CENÁRIOS ====================

    async simulateScenario(params: {
        candidate: string;
        party: string;
        currentVotes: number;
        scenario: string;
        scenarioDetails: string;
        topCities: { name: string; votes: number }[];
    }): Promise<{
        projectedVotes: number;
        confidenceLevel: string;
        analysis: string;
        cityProjections: { city: string; currentVotes: number; projectedVotes: number; change: string }[];
        strategies: string[];
    }> {
        const systemPrompt = `Você é um estrategista eleitoral com expertise em simulação de cenários políticos para eleições estaduais no Maranhão. Utilize dados realistas e projeções baseadas em padrões históricos eleitorais. Responda em português.`;

        const citiesInfo = params.topCities
            .map(c => `- ${c.name}: ${c.votes.toLocaleString('pt-BR')} votos`)
            .join('\n');

        const userPrompt = `Simule o seguinte cenário eleitoral para a próxima eleição de Deputado Estadual no Maranhão:

**Candidato**: ${params.candidate} (${params.party})
**Votos na última eleição**: ${params.currentVotes.toLocaleString('pt-BR')}

**Cenário**: ${params.scenario}
**Detalhes**: ${params.scenarioDetails}

**Principais municípios (última eleição)**:
${citiesInfo}

Projete os resultados considerando o cenário descrito. Retorne em JSON:
{
  "projectedVotes": número_total_projetado,
  "confidenceLevel": "Alta|Média|Baixa",
  "analysis": "análise detalhada do cenário e suas implicações",
  "cityProjections": [
    {"city": "nome", "currentVotes": votos_atuais, "projectedVotes": votos_projetados, "change": "+X%"}
  ],
  "strategies": ["estratégia 1", "estratégia 2", ...]
}`;

        const response = await this.callDeepSeek(systemPrompt, userPrompt);

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) {
            this.logger.warn('Falha ao parsear cenário');
        }

        return {
            projectedVotes: params.currentVotes,
            confidenceLevel: 'Baixa',
            analysis: response,
            cityProjections: [],
            strategies: [],
        };
    }

    // ==================== CHAT LIVRE ====================

    async chat(message: string, context: {
        candidateName: string;
        party: string;
        state: string;
        electionHistory: { year: number; votes: number; result: string }[];
    }): Promise<string> {
        const historyInfo = context.electionHistory
            .map(e => `- ${e.year}: ${e.votes.toLocaleString('pt-BR')} votos (${e.result})`)
            .join('\n');

        const systemPrompt = `Você é o assistente de inteligência eleitoral do Governe AI, especializado em análise política para Deputados Estaduais do Maranhão. 

Contexto do candidato:
- Nome: ${context.candidateName}
- Partido atual: ${context.party}
- Estado: ${context.state}
- Histórico eleitoral:
${historyInfo}

Responda de forma direta, analítica e com insights acionáveis. Use dados quando possível. Responda em português.`;

        return this.callDeepSeek(systemPrompt, message);
    }
}
