import rawCatalog from '../../mocks/fittings_mock_data.json';
import { fittingsCatalogFromJson } from './fittingsModels';
import type { FittingsCatalog } from './fittingsModels';

let cache: FittingsCatalog | null = null;

/**
 * Flutter `FittingsRepository.load()` — parses the bundled mock catalog
 * once and caches it. Kept async so the screen keeps its loading/error states.
 */
export async function loadFittingsCatalog(): Promise<FittingsCatalog> {
  if (cache) return cache;
  cache = fittingsCatalogFromJson(rawCatalog as Record<string, unknown>);
  return cache;
}
