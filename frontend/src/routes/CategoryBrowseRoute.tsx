import { useLocation } from 'react-router-dom';
import mockData from '../mocks/mockData.json';
import { PipesFittingCategory } from '../pages/catalog/PipesFittingCategory';
import { ElectricalsCategory } from '../pages/catalog/ElectricalsCategory';
import { SanitaryWaresCategory } from '../pages/catalog/SanitaryWaresCategory';
import { FittingsCategory } from '../pages/catalog/FittingsCategory';
import { ValvesControlsCategory } from '../pages/catalog/ValvesControlsCategory';
import catalogMock from '../mocks/catalog_mock_data.json';
import { CategoryComingSoon } from '../pages/catalog/CategoryComingSoon';
import type { CategoryBrowseArgs } from './appRoutes';

/**
 * Flutter `AppRouter` case `AppRoutes.categoryBrowse`: no args defaults to
 * the Pipes & Tubing category, which opens PipesFittingCategory; Electricals &
 * Lights opens ElectricalsCategory; Sanitary Wares opens SanitaryWaresCategory;
 * Fittings opens FittingsCategory; Valves & Controls opens ValvesControlsCategory;
 * any other category shows the web Coming
 * Soon page for now.
 */
export function CategoryBrowseRoute() {
  const args = useLocation().state as CategoryBrowseArgs | null;
  const categoryId = args?.categoryId ?? mockData.catalog.pipesTubingCategoryId;

  if (categoryId === mockData.catalog.pipesTubingCategoryId) {
    return <PipesFittingCategory />;
  }
  if (categoryId === mockData.catalog.electricalsLightsCategoryId) {
    return <ElectricalsCategory />;
  }
  if (categoryId === mockData.catalog.sanitaryWaresCategoryId) {
    return <SanitaryWaresCategory />;
  }
  if (categoryId === mockData.catalog.fittingsCategoryId) {
    return <FittingsCategory />;
  }
  if (categoryId === mockData.catalog.valvesControlsCategoryId) {
    return <ValvesControlsCategory />;
  }
  const category = catalogMock.categories.find((c) => c.id === categoryId);
  return <CategoryComingSoon category={category} />;
}
