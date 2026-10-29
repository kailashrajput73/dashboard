import rawCatalog from '../../mocks/electricals_mock_data.json';
import { electricalsCatalogFromJson } from './electricalsModels';
import type { ElectricalsCatalog } from './electricalsModels';

let cache: ElectricalsCatalog | null = null;

/**
 * Flutter `ElectricalsRepository.load()` — parses the bundled mock catalog
 * once and caches it. Kept async so the screen keeps its loading/error states.
 */
export async function loadElectricalsCatalog(): Promise<ElectricalsCatalog> {
  if (cache) return cache;
  cache = electricalsCatalogFromJson(rawCatalog as Record<string, unknown>);
  return cache;
}
