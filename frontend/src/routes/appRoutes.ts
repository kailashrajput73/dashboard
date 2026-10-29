/** Mirrors Flutter `lib/core/routes/app_routes.dart` (converted modules only). */
export const AppRoutes = {
  splash: '/',
  login: '/login',
  createAccount: '/create-account',
  chooseLocation: '/choose-location',
  chooseProfession: '/choose-profession',
  otpVerification: '/otp-verification',
  /** Post-auth shell (Home + navigation). Flutter keeps both names. */
  homePlaceholder: '/home-placeholder',
  main: '/main',

  search: '/search',
  categories: '/categories',
  profile: '/profile',
  notifications: '/notifications',
  myRewards: '/my-rewards',
  aiAssistant: '/ai-assistant',
  categoryBrowse: '/category-browse',
  /**
   * Web-only path. Flutter pushes `_PipeConfiguratorScreen` with an anonymous
   * `MaterialPageRoute` (no named route), so a URL is needed for the browser.
   */
  pipeConfigurator: '/category-browse/pipe-configurator',
  /** Web-only path for Flutter `_ElectricalConfiguratorScreen` (anonymous route). */
  electricalConfigurator: '/category-browse/electrical-configurator',
  /** Web-only path for Flutter `_SanitaryConfiguratorScreen` (anonymous route). */
  sanitaryConfigurator: '/category-browse/sanitary-configurator',
  /** Web-only path for Flutter `_FittingConfiguratorScreen` (anonymous route). */
  fittingConfigurator: '/category-browse/fitting-configurator',
  /** Web-only path for Flutter `_ValveConfiguratorScreen` (anonymous route). */
  valveConfigurator: '/category-browse/valve-configurator',

  cart: '/cart',
  /** Flutter `AppRoutes.selectAddress` — checkout step 2 (address + delivery option). */
  selectAddress: '/checkout/address',
  /** Flutter `AppRoutes.payment` — step 3; router state is `PaymentArgs`. */
  payment: '/checkout/payment',
  /** Flutter `AppRoutes.orderConfirmation` — step 4; router state is `OrderConfirmationArgs`. */
  orderConfirmation: '/checkout/confirmation',

  /** Web-only admin dashboard — admins land here instead of `/main`. */
  adminDashboard: '/admin/dashboard',
  /** Web-only admin Product master — Category / Sub-category / Brand / Product group tabs (`?tab=`). */
  adminProductMaster: '/admin/product-master',

  /** Web-only company pages linked from `StorefrontFooter` (stubs for now). */
  about: '/about',
  contact: '/contact',
  privacyPolicy: '/privacy-policy',
  terms: '/terms',
  cancellationRefunds: '/cancellation-refunds',
  shippingDelivery: '/shipping-delivery',
} as const;

/** Flutter `OtpPurpose` (passwordReset dropped with screens 7–9). */
export type OtpPurpose = 'registration' | 'mobileLogin';

/** Flutter `OtpVerificationArgs` — passed as router `state`. */
export interface OtpVerificationArgs {
  contactDisplay: string;
  purpose: OtpPurpose;
  /** Raw mobile digits for the signup flow after OTP. */
  mobileNumber?: string;
}

/** Flutter `SignupFlowArgs` — passed as router `state`. */
export interface SignupFlowArgs {
  mobileNumber: string;
  fullName: string;
  email?: string;
  /** Optional referral code entered during signup. */
  referralCode?: string;
  /** True when chooseLocation is opened from Home to change the saved address. */
  isLocationUpdate?: boolean;
}

/** Flutter `CategoryBrowseArgs` — passed as router `state`. */
export interface CategoryBrowseArgs {
  categoryId: string;
}
