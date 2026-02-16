import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.deepseek.com';
    private readonly model = 'deepseek-chat';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
        if (!this.apiKey) {
            this.logger.warn('DEEPSEEK_API_KEY não configurada!');
        }
    }

    private async chat(messages: ChatMessage[], maxTokens = 1024): Promise<string> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: this.model,
                    messages,
                    max_tokens: maxTokens,
                    temperature: 0.7,
                    stream: false,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                },
            );

            return response.data.choices?.[0]?.message?.content || 'Sem resposta da IA.';
        } catch (error: any) {
            this.logger.error(`Erro DeepSeek API: ${error.message}`);
            throw new Error(`Erro ao consultar IA: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async analyzeProjection(data: {
        candidateName: string;
        candidateParty: string;
        candidateNumber: string;
        currentVotes: number;
        projectedVotes: number;
        currentRanking: number;
        projectedRanking: number;
        rankingChange: number;
        goalVotes: number;
        goalProgress: number;
        scenarioName: string;
        cityResults: { city: string; currentVotes: number; projectedVotes: number; difference: number; percentChange: number }[];
    }): Promise<string> {
        const systemPrompt = `Você é um consultor político especialista em estratégias eleitorais no Maranhão.
Analise os dados de projeção eleitoral fornecidos e gere uma análise estratégica CONCISA e PRÁTICA.
Responda SEMPRE em português brasileiro.
Use no máximo 4 parágrafos. Seja direto e objetivo.
Inclua: diagnóstico da situação, pontos fortes, pontos fracos e recomendações práticas de ação.`;

        const gainCities = data.cityResults.filter(c => c.difference > 0).sort((a, b) => b.difference - a.difference);
        const lossCities = data.cityResults.filter(c => c.difference < 0).sort((a, b) => a.difference - b.difference);

        const userMessage = `Analise a projeção eleitoral do candidato a Deputado Estadual:

**Candidato:** ${data.candidateName} (${data.candidateParty} - ${data.candidateNumber})
**Cenário Aplicado:** ${data.scenarioName}

**Votos:** ${data.currentVotes.toLocaleString()} atuais → ${data.projectedVotes.toLocaleString()} projetados (${data.projectedVotes > data.currentVotes ? '+' : ''}${(data.projectedVotes - data.currentVotes).toLocaleString()})
**Ranking:** ${data.currentRanking}º atual → ${data.projectedRanking}º projetado (${data.rankingChange > 0 ? 'subiu' : data.rankingChange < 0 ? 'caiu' : 'manteve'} ${Math.abs(data.rankingChange)} posições)
**Meta Top 5:** ${data.goalProgress.toFixed(0)}% atingida (necessário: ${data.goalVotes.toLocaleString()} votos)

**Cidades com maior crescimento:** ${gainCities.slice(0, 5).map(c => `${c.city} (+${c.difference})`).join(', ') || 'Nenhuma'}
**Cidades com perda:** ${lossCities.slice(0, 5).map(c => `${c.city} (${c.difference})`).join(', ') || 'Nenhuma'}

Gere uma análise estratégica prática para a campanha.`;

        return this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ], 800);
    }

    async chatWithContext(
        message: string,
        candidateContext: {
            name: string;
            party: string;
            number: string;
            totalVotes: number;
            ranking: number;
            topCities: { city: string; votes: number }[];
        },
        conversationHistory: ChatMessage[] = [],
    ): Promise<string> {
        const systemPrompt = `Você é o assistente de IA do Governe AI, especialista em política e eleições do Maranhão.
Você está ajudando a analisar dados do candidato a Deputado Estadual ${candidateContext.name} (${candidateContext.party} - ${candidateContext.number}).

Dados do candidato:
- Total de votos: ${candidateContext.totalVotes.toLocaleString()}
- Ranking: ${candidateContext.ranking}º lugar
- Principais cidades: ${candidateContext.topCities.map(c => `${c.city} (${c.votes.toLocaleString()} votos)`).join(', ')}

Responda SEMPRE em português brasileiro de forma clara e direta.
Se o usuário perguntar sobre outros candidatos ou dados que você não tem, diga claramente.
Seja conciso e prático nas respostas. Use no máximo 3 parágrafos.`;

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-10), // últimas 10 msgs para contexto
            { role: 'user', content: message },
        ];

        return this.chat(messages, 600);
    }
}
