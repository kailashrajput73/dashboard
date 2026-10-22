import { Navigate } from "react-router-dom";

/** Former catalog / taxonomy / import routes — functionality lives on `/product-management`. */
export function CatalogLegacyRedirect() {
  return <Navigate to="/product-management" replace />;
}
