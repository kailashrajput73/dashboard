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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartupRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<EmptyPage title="Register" />} />
        <Route element={<AdminShell />}>
          <Route path="/dashboard" element={<EmptyPage title="Dashboard" />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/product-types" element={<ProductTypesPage />} />
          <Route path="/subcategories" element={<SubcategoriesPage />} />
          <Route path="/product-classes" element={<ProductClassesPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/product-groups" element={<ProductGroupsPage />} />
          <Route path="/csv-import" element={<SpreadsheetImportsPage />} />
          <Route path="/import-products-batch" element={<EmptyPage title="Import products (batch sheet)" />} />
          <Route path="/racks" element={<RacksPage />} />
          <Route path="/purchases" element={<EmptyPage title="Purchases" />} />
          <Route path="/inventory" element={<EmptyPage title="Inventory" />} />
          <Route path="/rfqs" element={<EmptyPage title="RFQs" />} />
          <Route path="/partners" element={<EmptyPage title="Partners" />} />
          <Route path="/dispatches" element={<EmptyPage title="Dispatch" />} />
          <Route path="/money-config" element={<EmptyPage title="Money config" />} />
          <Route path="/settings" element={<EmptyPage title="Settings" />} />
          <Route path="/team" element={<EmptyPage title="Team" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
