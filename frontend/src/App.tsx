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

              {/* Out of module — stubs only. */}
              <Route
                path={AppRoutes.homePlaceholder}
                element={<RoutePlaceholder route={AppRoutes.homePlaceholder} />}
              />
              <Route
                path={AppRoutes.search}
                element={<RoutePlaceholder route={AppRoutes.search} />}
              />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;
