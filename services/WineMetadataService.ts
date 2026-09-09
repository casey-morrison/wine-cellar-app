import type { CriticScore, PriceQuote, Wine } from '@/types/wine';
import { demoProvider, type WineMetadataProvider } from '@/services/DemoProvider';

/**
 * Facade over wine metadata (critics + retail price).
 * Default: DemoProvider. Inject a real provider when APIs are wired up.
 */
class WineMetadataService {
  private provider: WineMetadataProvider = demoProvider;

  setProvider(provider: WineMetadataProvider) {
    this.provider = provider;
  }

  getCriticScores(wine: Pick<Wine, 'producer' | 'name' | 'vintage'>): Promise<CriticScore[]> {
    return this.provider.getCriticScores(wine);
  }

  getAverageRetailPrice(
    wine: Pick<Wine, 'producer' | 'name' | 'vintage' | 'type'>,
    zipCode: string
  ): Promise<PriceQuote> {
    return this.provider.getAverageRetailPrice(wine, zipCode);
  }
}

export const wineMetadataService = new WineMetadataService();
