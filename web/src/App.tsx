import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/AdminShell";
import { EmptyPage } from "./components/EmptyPage";
import { StartupRedirect } from "./components/StartupRedirect";
import CategoriesPage from "./pages/CategoriesPage";
import BrandsPage from "./pages/BrandsPage";
import ProductTypesPage from "./pages/ProductTypesPage";
import ProductClassesPage from "./pages/ProductClassesPage";
import CatalogPage from "./pages/CatalogPage";
import LoginPage from "./pages/LoginPage";
import SubcategoriesPage from "./pages/SubcategoriesPage";
import ProductGroupsPage from "./pages/ProductGroupsPage";
import RacksPage from "./pages/RacksPage";
import SpreadsheetImportsPage from "./pages/SpreadsheetImportsPage";
import CatalogImportPage from "./pages/CatalogImportPage";
import PurchasesPage from "./pages/PurchasesPage";
import InventoryPage from "./pages/InventoryPage";
import PartnersPage from "./pages/PartnersPage";
import RfqsPage from "./pages/RfqsPage";
import DispatchesPage from "./pages/DispatchesPage";
import ServiceRequestsPage from "./pages/ServiceRequestsPage";
import TeamPage from "./pages/TeamPage";
import SettingsPage from "./pages/SettingsPage";
import DashboardPage from "./pages/DashboardPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartupRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AdminShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/product-types" element={<ProductTypesPage />} />
          <Route path="/subcategories" element={<SubcategoriesPage />} />
          <Route path="/product-classes" element={<ProductClassesPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/product-groups" element={<ProductGroupsPage />} />
          <Route path="/csv-import" element={<SpreadsheetImportsPage />} />
          <Route path="/import-products" element={<CatalogImportPage kind="master" />} />
          <Route path="/import-products-batch" element={<CatalogImportPage kind="master" batch />} />
          <Route path="/import-prices" element={<CatalogImportPage kind="pricing" />} />
          <Route path="/import-stock" element={<CatalogImportPage kind="stock" />} />
          <Route path="/racks" element={<RacksPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/rfqs" element={<RfqsPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/dispatches" element={<DispatchesPage />} />
          <Route path="/service-requests" element={<ServiceRequestsPage />} />
          <Route path="/money-config" element={<EmptyPage title="Money config" />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/team" element={<TeamPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
