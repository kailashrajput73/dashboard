import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme, GlobalStyle } from './theme';
import { SessionProvider } from './session/SessionContext';
import { CartProvider } from './session/CartContext';
import { AppRoutes } from './routes/appRoutes';
import { CategoryBrowseRoute } from './routes/CategoryBrowseRoute';
import { Splash } from './pages/auth/Splash';
import { Login } from './pages/auth/Login';
import { OtpVerification } from './pages/auth/OtpVerification';
import { CreateAccount } from './pages/auth/CreateAccount';
import { ChooseLocation } from './pages/auth/ChooseLocation';
import { ChooseProfession } from './pages/auth/ChooseProfession';
import { PipeConfigurator } from './pages/catalog/PipeConfigurator';
import { ElectricalConfigurator } from './pages/catalog/ElectricalConfigurator';
import { SanitaryConfigurator } from './pages/catalog/SanitaryConfigurator';
import { FittingConfigurator } from './pages/catalog/FittingConfigurator';
import { ValveConfigurator } from './pages/catalog/ValveConfigurator';
import { Cart } from './pages/cart/Cart';
import { Checkout } from './pages/checkout/Checkout';
import { Payment } from './pages/checkout/Payment';
import { OrderConfirmation } from './pages/checkout/OrderConfirmation';
import { MainShell } from './pages/shell/MainShell';
import { MyRewards } from './pages/rewards/MyRewards';
import { Profile } from './pages/profile/Profile';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProductMaster } from './pages/admin/ProductMaster';
import { RoutePlaceholder } from './shared/RoutePlaceholder';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <SessionProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path={AppRoutes.splash} element={<Splash />} />
              <Route path={AppRoutes.login} element={<Login />} />
              <Route path={AppRoutes.otpVerification} element={<OtpVerification />} />
              <Route path={AppRoutes.createAccount} element={<CreateAccount />} />
              <Route path={AppRoutes.chooseLocation} element={<ChooseLocation />} />
              <Route path={AppRoutes.chooseProfession} element={<ChooseProfession />} />

              {/* Pipes & Tubing module */}
              <Route path={AppRoutes.categoryBrowse} element={<CategoryBrowseRoute />} />
              <Route path={AppRoutes.pipeConfigurator} element={<PipeConfigurator />} />

              {/* Electricals & Lights module */}
              <Route path={AppRoutes.electricalConfigurator} element={<ElectricalConfigurator />} />

              {/* Sanitary Wares module */}
              <Route path={AppRoutes.sanitaryConfigurator} element={<SanitaryConfigurator />} />

              {/* Fittings module */}
              <Route path={AppRoutes.fittingConfigurator} element={<FittingConfigurator />} />

              {/* Valves & Controls module */}
              <Route path={AppRoutes.valveConfigurator} element={<ValveConfigurator />} />

              {/* Cart / checkout */}
              <Route path={AppRoutes.cart} element={<Cart />} />
              <Route path={AppRoutes.selectAddress} element={<Checkout />} />
              <Route path={AppRoutes.payment} element={<Payment />} />
              <Route path={AppRoutes.orderConfirmation} element={<OrderConfirmation />} />

              {/* Post-auth shell (Home + side menu / bottom nav) */}
              <Route path={AppRoutes.homePlaceholder} element={<MainShell />} />
              <Route path={AppRoutes.main} element={<MainShell />} />

              <Route path={AppRoutes.myRewards} element={<MyRewards />} />
              <Route path={AppRoutes.profile} element={<Profile />} />

              {/* Admin (web-only) */}
              <Route path={AppRoutes.adminDashboard} element={<AdminDashboard />} />
              <Route path={AppRoutes.adminProductMaster} element={<ProductMaster />} />

              {/* Out of module — stubs only. */}
              {[
                AppRoutes.search,
                AppRoutes.categories,
                AppRoutes.notifications,
                AppRoutes.aiAssistant,
                AppRoutes.about,
                AppRoutes.contact,
                AppRoutes.privacyPolicy,
                AppRoutes.terms,
                AppRoutes.cancellationRefunds,
                AppRoutes.shippingDelivery,
              ].map((route) => (
                <Route key={route} path={route} element={<RoutePlaceholder route={route} />} />
              ))}
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;
