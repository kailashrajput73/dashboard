import rawCatalog from '../../mocks/pipes_fitting_mock_data.json';
import { pipesFittingCatalogFromJson } from './pipesFittingModels';
import type { PipesFittingCatalog } from './pipesFittingModels';

let cache: PipesFittingCatalog | null = null;

/**
 * Flutter `PipesFittingRepository.load()` — parses the bundled mock catalog
 * once and caches it. Kept async so the screen keeps its loading/error states.
 */
export async function loadPipesFittingCatalog(): Promise<PipesFittingCatalog> {
  if (cache) return cache;
  cache = pipesFittingCatalogFromJson(rawCatalog as Record<string, unknown>);
  return cache;
}
