import { useNavigate } from 'react-router-dom';
import { AppRoutes } from '../../routes/appRoutes';
import type { WebSideMenuTab } from '../../shared/WebSideMenu';
import mock from './adminMenu.mock.json';

export type AdminTab = 'dashboard' | 'productMaster';

const tabRoutes: Record<AdminTab, string> = {
  dashboard: AppRoutes.adminDashboard,
  productMaster: AppRoutes.adminProductMaster,
};

/** `WebSideMenu` props for the admin pages (Dashboard + Product master, no categories). */
export function useAdminMenu(activeTab: AdminTab) {
  const navigate = useNavigate();
  return {
    tabs: mock.tabs as WebSideMenuTab[],
    activeTab,
    showCategories: false,
    onSelectTab: (tab: WebSideMenuTab) =>
      tab.tab === activeTab
        ? window.scrollTo({ top: 0, behavior: 'smooth' })
        : navigate(tabRoutes[tab.tab as AdminTab]),
  };
}
