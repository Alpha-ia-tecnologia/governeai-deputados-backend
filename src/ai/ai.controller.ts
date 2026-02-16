import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('analyze')
    async analyzeProjection(@Body() body: {
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
    }) {
        try {
            const analysis = await this.aiService.analyzeProjection(body);
            return { success: true, analysis };
        } catch (error: any) {
            throw new HttpException(
                { success: false, error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('chat')
    async chat(@Body() body: {
        message: string;
        candidateContext: {
            name: string;
            party: string;
            number: string;
            totalVotes: number;
            ranking: number;
            topCities: { city: string; votes: number }[];
        };
        conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
    }) {
        try {
            const response = await this.aiService.chatWithContext(
                body.message,
                body.candidateContext,
                body.conversationHistory || [],
            );
            return { success: true, response };
        } catch (error: any) {
            throw new HttpException(
                { success: false, error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
