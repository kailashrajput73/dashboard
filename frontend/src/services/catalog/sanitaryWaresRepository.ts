import rawCatalog from '../../mocks/sanitary_wares_mock_data.json';
import { sanitaryWaresCatalogFromJson } from './sanitaryWaresModels';
import type { SanitaryWaresCatalog } from './sanitaryWaresModels';

let cache: SanitaryWaresCatalog | null = null;

/**
 * Flutter `SanitaryWaresRepository.load()` — parses the bundled mock catalog
 * once and caches it. Kept async so the screen keeps its loading/error states.
 */
export async function loadSanitaryWaresCatalog(): Promise<SanitaryWaresCatalog> {
  if (cache) return cache;
  cache = sanitaryWaresCatalogFromJson(rawCatalog as Record<string, unknown>);
  return cache;
}
