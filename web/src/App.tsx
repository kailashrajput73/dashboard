import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/AdminShell";
import { CatalogLegacyRedirect } from "./components/CatalogLegacyRedirect";
import { StartupRedirect } from "./components/StartupRedirect";
import ProductManagementPage from "./pages/ProductManagementPage";
import LoginPage from "./pages/LoginPage";
import RacksPage from "./pages/RacksPage";
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

const legacyCatalogPaths = [
  "/catalog",
  "/categories",
  "/product-types",
  "/subcategories",
  "/product-classes",
  "/brands",
  "/product-groups",
  "/csv-import",
  "/import-products-batch",
  "/import-prices",
  "/import-stock",
] as const;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartupRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AdminShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/product-management" element={<ProductManagementPage />} />
          {legacyCatalogPaths.map((path) => (
            <Route key={path} path={path} element={<CatalogLegacyRedirect />} />
          ))}
          <Route
            path="/import-products"
            element={
              <Navigate
                to="/product-management"
                replace
                state={{ openImport: "pipes-fittings" }}
              />
            }
          />
          <Route
            path="/import-pipes-fittings"
            element={
              <Navigate
                to="/product-management"
                replace
                state={{ openImport: "pipes-fittings" }}
              />
            }
          />
          <Route
            path="/import-pipes-fittings-images"
            element={
              <Navigate
                to="/product-management"
                replace
                state={{ openImport: "pipes-fittings", scrollFamilyImages: true }}
              />
            }
          />
          <Route path="/racks" element={<RacksPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/rfqs" element={<RfqsPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/dispatches" element={<DispatchesPage />} />
          <Route path="/service-requests" element={<ServiceRequestsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/team" element={<TeamPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
