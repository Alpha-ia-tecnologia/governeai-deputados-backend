import { Injectable, Logger } from '@nestjs/common';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1100; // 1.1 segundos entre requisições (Nominatim pede 1/s)

  // Cache simples em memória para evitar requisições duplicadas
  private cache: Map<string, GeocodingResult> = new Map();

  async geocodeAddress(
    street: string,
    number: string,
    neighborhood: string,
    city: string,
    state: string,
    cep?: string,
  ): Promise<GeocodingResult | null> {
    try {
      // Monta o endereço completo para busca
      const addressParts = [
        number ? `${street}, ${number}` : street,
        neighborhood,
        city,
        state,
        'Brasil',
      ].filter(Boolean);

      const fullAddress = addressParts.join(', ');
      const cacheKey = fullAddress.toLowerCase().trim();

      // Verifica cache
      if (this.cache.has(cacheKey)) {
        this.logger.log(`Cache hit for: ${fullAddress}`);
        return this.cache.get(cacheKey);
      }

      // Respeita rate limit do Nominatim
      await this.respectRateLimit();

      // Primeira tentativa: endereço completo
      let result = await this.searchNominatim(fullAddress);

      // Se não encontrou, tenta apenas com bairro + cidade + estado
      if (!result && neighborhood && city) {
        const fallbackAddress = [neighborhood, city, state, 'Brasil'].filter(Boolean).join(', ');
        this.logger.log(`Tentando fallback: ${fallbackAddress}`);
        await this.respectRateLimit();
        result = await this.searchNominatim(fallbackAddress);
      }

      // Se ainda não encontrou e tem CEP, tenta com CEP
      if (!result && cep) {
        const cepAddress = `${cep}, Brasil`;
        this.logger.log(`Tentando com CEP: ${cepAddress}`);
        await this.respectRateLimit();
        result = await this.searchNominatim(cepAddress);
      }

      // Se ainda não encontrou, tenta apenas cidade + estado
      if (!result && city) {
        const cityAddress = [city, state, 'Brasil'].filter(Boolean).join(', ');
        this.logger.log(`Tentando apenas cidade: ${cityAddress}`);
        await this.respectRateLimit();
        result = await this.searchNominatim(cityAddress);
      }

      if (result) {
        // Armazena no cache
        this.cache.set(cacheKey, result);
        this.logger.log(`Geocodificação bem-sucedida: ${fullAddress} -> (${result.latitude}, ${result.longitude})`);
      } else {
        this.logger.warn(`Não foi possível geocodificar: ${fullAddress}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Erro na geocodificação: ${error.message}`);
      return null;
    }
  }

  private async searchNominatim(query: string): Promise<GeocodingResult | null> {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        countrycodes: 'br',
      });

      const url = `${this.NOMINATIM_URL}?${params.toString()}`;

      this.logger.log(`Buscando no Nominatim: ${query}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GovernEAI/1.0 (contact@governeai.com.br)', // Identificação obrigatória pelo Nominatim
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim retornou status ${response.status}`);
      }

      const data: NominatimResponse[] = await response.json();

      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Erro ao buscar no Nominatim: ${error.message}`);
      return null;
    }
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      this.logger.log(`Rate limit: aguardando ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  // Método para buscar coordenadas de uma cidade (para centralizar o mapa)
  async geocodeCity(city: string, state: string): Promise<GeocodingResult | null> {
    const cityAddress = [city, state, 'Brasil'].filter(Boolean).join(', ');
    const cacheKey = `city:${cityAddress.toLowerCase().trim()}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    await this.respectRateLimit();
    const result = await this.searchNominatim(cityAddress);

    if (result) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  // Limpa o cache (útil para testes ou quando necessário)
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cache de geocodificação limpo');
  }
}
