import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/AdminShell";
import { EmptyPage } from "./components/EmptyPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EmptyPage title="Home" />} />
        <Route path="/login" element={<EmptyPage title="Login" />} />
        <Route element={<AdminShell />}>
          <Route path="/dashboard" element={<EmptyPage title="Dashboard" />} />
          <Route path="/catalog" element={<EmptyPage title="Products" />} />
          <Route path="/categories" element={<EmptyPage title="Categories" />} />
          <Route path="/product-types" element={<EmptyPage title="Product type" />} />
          <Route path="/subcategories" element={<EmptyPage title="Subcategories" />} />
          <Route path="/product-classes" element={<EmptyPage title="Product class" />} />
          <Route path="/brands" element={<EmptyPage title="Brands" />} />
          <Route path="/product-groups" element={<EmptyPage title="Product groups" />} />
          <Route path="/csv-import" element={<EmptyPage title="Spreadsheet imports" />} />
          <Route path="/racks" element={<EmptyPage title="Racks" />} />
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
