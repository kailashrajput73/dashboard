import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from '../../../routes/appRoutes';
import type { CategoryBrowseArgs } from '../../../routes/appRoutes';
import type { HomeCategory } from '../../../services/catalog/catalogModels';
import catalogMock from '../../../mocks/catalog_mock_data.json';
import { HomeDashboard } from '../../home/HomeDashboard';
import { StorefrontHeader } from '../../../shared/StorefrontHeader';
import mock from './MainShell.mock.json';
import {
  Shell,
  ShellBody,
  Sidebar,
  SidebarScroll,
  SidebarLabel,
  NavList,
  NavItem,
  NavIcon,
  CategoryItem,
  CategoryThumb,
  CategoryName,
  CategoryCount,
  AiCard,
  AiIcon,
  AiText,
  AiTitle,
  AiSubtitle,
  Main,
  TabHeader,
  TabTitle,
  TabBody,
  BottomNav,
  BottomNavItem,
  BottomNavIndicator,
  BottomNavLabel,
  Fab,
} from './MainShell.styles';

const tabs = mock.AppBottomNavigation.tabs;
/** Web shows the first five catalog categories only. */
const categories: HomeCategory[] = catalogMock.categories.slice(0, 5);
const sidebar = mock._webSidebar;
/** Web side menu drops Wishlist — it lives in the `StorefrontHeader` instead. */
const sidebarTabs = tabs.filter((tab) => tab.tab !== 'wishlist');
const tabIndex = (tab?: string) =>
  Math.max(
    0,
    tabs.findIndex((t) => t.tab === tab),
  );

/**
 * Flutter `MainShell` — root shell after authentication. Mobile keeps the
 * bottom `NavigationBar` + AI assistant FAB (Home tab only). Web (≥ md) moves
 * Home + Categories into a side menu under the app-wide `StorefrontHeader`
 * (Wishlist opens from the header's heart icon), with the catalog categories
 * listed under them and the FAB as a card at the bottom.
 */
export function MainShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedTab = (location.state as { tab?: string } | null)?.tab;
  const [index, setIndex] = useState(() => tabIndex(requestedTab));

  // Header icons (e.g. Wishlist) open a tab via router state, also while already on this page.
  useEffect(() => {
    if (requestedTab) setIndex(tabIndex(requestedTab));
  }, [requestedTab, location.key]);

  const openCategory = (category: HomeCategory) => {
    const args: CategoryBrowseArgs = { categoryId: category.id };
    navigate(AppRoutes.categoryBrowse, { state: args });
  };
  const openAiAssistant = () => navigate(AppRoutes.aiAssistant);

  const showAi = index === 0;
  const current = tabs[index];

  return (
    <Shell>
      <StorefrontHeader webOnly />

      <ShellBody>
        <Sidebar aria-label="Main menu">
          <SidebarScroll>
            <SidebarLabel>{sidebar.menuLabel}</SidebarLabel>
            <NavList>
              {sidebarTabs.map((tab) => {
                const i = tabs.indexOf(tab);
                return (
                  <li key={tab.tab}>
                    <NavItem
                      type="button"
                      $active={i === index}
                      aria-current={i === index ? 'page' : undefined}
                      onClick={() => setIndex(i)}
                    >
                      <NavIcon $active={i === index}>
                        <i className={`pi ${tab.icon}`} aria-hidden="true" />
                      </NavIcon>
                      {tab.label}
                    </NavItem>
                  </li>
                );
              })}
            </NavList>

            <SidebarLabel>{sidebar.categoriesLabel}</SidebarLabel>
            <NavList>
              {categories.map((category) => (
                <li key={category.id}>
                  <CategoryItem type="button" onClick={() => openCategory(category)}>
                    <CategoryThumb $tint={category.iconBackground}>
                      <img src={category.imageAsset} alt="" loading="lazy" />
                    </CategoryThumb>
                    <CategoryName>{category.name}</CategoryName>
                    <CategoryCount>{category.itemCount}</CategoryCount>
                  </CategoryItem>
                </li>
              ))}
            </NavList>
          </SidebarScroll>

          {showAi && (
            <AiCard type="button" onClick={openAiAssistant}>
              <AiIcon>
                <i className={`pi ${mock.floatingActionButton.icon}`} aria-hidden="true" />
              </AiIcon>
              <AiText>
                <AiTitle>{mock.floatingActionButton.tooltip}</AiTitle>
                <AiSubtitle>{sidebar.aiSubtitle}</AiSubtitle>
              </AiText>
            </AiCard>
          )}
        </Sidebar>

        <Main>
          {index === 0 ? (
            <HomeDashboard categories={categories} onCategoryTap={openCategory} />
          ) : (
            // Tabs 1–2 are not converted yet — Flutter `_TabScaffold` title only.
            <>
              <TabHeader>
                <TabTitle>{current.label}</TabTitle>
              </TabHeader>
              <TabBody>{mock._webTabPlaceholder}</TabBody>
            </>
          )}
        </Main>
      </ShellBody>

      {showAi && (
        <Fab
          type="button"
          title={mock.floatingActionButton.tooltip}
          aria-label={mock.floatingActionButton.tooltip}
          onClick={openAiAssistant}
        >
          <i className={`pi ${mock.floatingActionButton.icon}`} aria-hidden="true" />
        </Fab>
      )}

      <BottomNav aria-label="Main menu">
        {tabs.map((tab, i) => (
          <BottomNavItem
            key={tab.tab}
            type="button"
            $active={i === index}
            aria-current={i === index ? 'page' : undefined}
            onClick={() => setIndex(i)}
          >
            <BottomNavIndicator $active={i === index}>
              <i className={`pi ${tab.icon}`} aria-hidden="true" />
            </BottomNavIndicator>
            <BottomNavLabel>{tab.label}</BottomNavLabel>
          </BottomNavItem>
        ))}
      </BottomNav>
    </Shell>
  );
}
