import { useCallback, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { AppRoutes } from '../../../routes/appRoutes';
import { useSession } from '../../../session/SessionContext';
import { StorefrontHeader } from '../../../shared/StorefrontHeader';
import { StorefrontFooter } from '../../../shared/StorefrontFooter';
import { WebSideMenu } from '../../../shared/WebSideMenu';
import { SnackBar } from '../../../shared/SnackBar';
import data from '../../../mocks/product_master_mock_data.json';
import type { MasterData } from '../../../services/admin/productMasterModels';
import { useAdminMenu } from '../adminMenu';
import * as S from '../AdminDashboard/AdminDashboard.styles';
import { CategoryTab } from './CategoryTab';
import { SubCategoryTab } from './SubCategoryTab';
import { BrandTab } from './BrandTab';
import { ProductGroupTab } from './ProductGroupTab';
import type { MasterTabId } from './masterTab';
import mock from './ProductMaster.mock.json';
import * as P from './ProductMaster.styles';

const seed = {
  categories: data.categories,
  subCategories: data.subCategories,
  brands: data.brands,
  products: data.products,
  groups: data.productGroups,
} as MasterData;

const tabIds = mock._tabs.map((t) => t.id as MasterTabId);
const isTab = (id: string | null): id is MasterTabId => tabIds.includes(id as MasterTabId);

/**
 * Web-only admin Product master: Category, Sub-category, Brand (with
 * category mapping) and Product group tabs, each a searchable, filterable
 * table with create / edit / delete and activate / deactivate. The open tab
 * lives in `?tab=` (Category by default). All edits stay in local state,
 * seeded from `product_master_mock_data.json`.
 */
export function ProductMaster() {
  const { isLoggedIn, user } = useSession();
  const adminMenu = useAdminMenu('productMaster');
  const [params, setParams] = useSearchParams();
  const [master, setMaster] = useState(seed);
  const [snack, setSnack] = useState<{ key: number; message: string } | null>(null);
  const hideSnack = useCallback(() => setSnack(null), []);
  const notify = useCallback((message: string) => setSnack({ key: Date.now(), message }), []);

  if (!isLoggedIn || !user.isAdmin) return <Navigate to={AppRoutes.main} replace />;

  const requested = params.get('tab');
  const active: MasterTabId = isTab(requested) ? requested : 'category';
  const openTab = (id: MasterTabId) =>
    setParams(id === 'category' ? {} : { tab: id }, { replace: true });

  const counts: Record<MasterTabId, number> = {
    category: master.categories.length,
    subCategory: master.subCategories.length,
    brand: master.brands.length,
    productGroup: master.groups.length,
  };

  /** Arrow keys move between tabs (WAI-ARIA tabs pattern). */
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabIds[(tabIds.indexOf(active) + step + tabIds.length) % tabIds.length];
    openTab(next);
    document.getElementById(`master-tab-${next}`)?.focus();
  };

  const tabProps = { data: master, setData: setMaster, notify };

  return (
    <S.Shell>
      <StorefrontHeader />

      <S.ShellBody>
        <WebSideMenu {...adminMenu} />

        <S.Main>
          <S.PageHead>
            <S.HeadText>
              <S.Title>{mock._title}</S.Title>
              <S.Greeting>{mock._subtitle}</S.Greeting>
            </S.HeadText>
          </S.PageHead>

          <P.TabList role="tablist" aria-label={mock._title} onKeyDown={onTabKey}>
            {mock._tabs.map((tab) => {
              const id = tab.id as MasterTabId;
              const selected = id === active;
              return (
                <P.Tab
                  key={id}
                  id={`master-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`master-panel-${id}`}
                  tabIndex={selected ? 0 : -1}
                  $active={selected}
                  onClick={() => openTab(id)}
                >
                  <i className={`pi ${tab.icon}`} aria-hidden />
                  {tab.label}
                  <P.TabCount $active={selected}>{counts[id]}</P.TabCount>
                </P.Tab>
              );
            })}
          </P.TabList>

          <div
            id={`master-panel-${active}`}
            role="tabpanel"
            aria-labelledby={`master-tab-${active}`}
          >
            {active === 'category' && <CategoryTab {...tabProps} />}
            {active === 'subCategory' && <SubCategoryTab {...tabProps} />}
            {active === 'brand' && <BrandTab {...tabProps} />}
            {active === 'productGroup' && <ProductGroupTab {...tabProps} />}
          </div>
        </S.Main>
      </S.ShellBody>

      <StorefrontFooter />

      {snack && (
        <SnackBar
          key={snack.key}
          message={snack.message}
          onDismissed={hideSnack}
          webAlign="center"
        />
      )}
    </S.Shell>
  );
}
