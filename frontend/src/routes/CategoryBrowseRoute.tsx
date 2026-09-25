import { useLocation } from 'react-router-dom';
import mockData from '../mocks/mockData.json';
import { PipesFittingCategory } from '../pages/catalog/PipesFittingCategory';
import { RoutePlaceholder } from '../shared/RoutePlaceholder';
import { AppRoutes } from './appRoutes';
import type { CategoryBrowseArgs } from './appRoutes';

/**
 * Flutter `AppRouter` case `AppRoutes.categoryBrowse`: no args defaults to
 * the Pipes & Tubing category, which opens PipesFittingCategory; any other
 * category opens CategoryBrowseScreen (not converted yet → placeholder).
 */
export function CategoryBrowseRoute() {
  const args = useLocation().state as CategoryBrowseArgs | null;
  const categoryId = args?.categoryId ?? mockData.catalog.pipesTubingCategoryId;

  if (categoryId === mockData.catalog.pipesTubingCategoryId) {
    return <PipesFittingCategory />;
  }
  return <RoutePlaceholder route={AppRoutes.categoryBrowse} />;
}
