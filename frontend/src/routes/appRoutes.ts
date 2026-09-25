/** Mirrors Flutter `lib/core/routes/app_routes.dart` (converted modules only). */
export const AppRoutes = {
  splash: '/',
  login: '/login',
  createAccount: '/create-account',
  chooseLocation: '/choose-location',
  chooseProfession: '/choose-profession',
  otpVerification: '/otp-verification',
  homePlaceholder: '/home-placeholder',

  search: '/search',
  categoryBrowse: '/category-browse',
  /**
   * Web-only path. Flutter pushes `_PipeConfiguratorScreen` with an anonymous
   * `MaterialPageRoute` (no named route), so a URL is needed for the browser.
   */
  pipeConfigurator: '/category-browse/pipe-configurator',
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
  /** Optional referral code entered during signup. */
  referralCode?: string;
  /** True when chooseLocation is opened from Home to change the saved address. */
  isLocationUpdate?: boolean;
}

/** Flutter `CategoryBrowseArgs` — passed as router `state`. */
export interface CategoryBrowseArgs {
  categoryId: string;
}
