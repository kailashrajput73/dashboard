import rawCatalog from '../../mocks/valves_controls_mock_data.json';
import { valvesControlsCatalogFromJson } from './valvesControlsModels';
import type { ValvesControlsCatalog } from './valvesControlsModels';

let cache: ValvesControlsCatalog | null = null;

/**
 * Flutter `ValvesControlsRepository.load()` — parses the bundled mock catalog
 * once and caches it. Kept async so the screen keeps its loading/error states.
 */
export async function loadValvesControlsCatalog(): Promise<ValvesControlsCatalog> {
  if (cache) return cache;
  cache = valvesControlsCatalogFromJson(rawCatalog as Record<string, unknown>);
  return cache;
}
