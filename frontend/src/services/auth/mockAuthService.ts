import mockData from '../../mocks/mockData.json';
import { AuthResult } from './authModels';
import type { AuthUser } from './authModels';

/**
 * Mirrors Flutter `features/auth/services/mock_auth_service.dart`.
 * Only the calls used by converted screens are ported so far.
 */

const { mockNetworkDelayMs, mockOtp } = mockData.appConstants;
const { guestUser, pendingOtpUserId, registerUserId, otpUserId, otpDefaultFullName } =
  mockData.mockAuth;

let currentUser: AuthUser | null = null;

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, mockNetworkDelayMs));

export const mockAuthService = {
  get currentUser() {
    return currentUser;
  },

  async continueAsGuest(): Promise<AuthResult> {
    await delay();
    currentUser = { ...guestUser };
    return AuthResult.ok(currentUser);
  },

  async sendOtp({ mobileNumber }: { mobileNumber: string }): Promise<AuthResult> {
    await delay();
    if (mobileNumber.trim() === '') {
      return AuthResult.fail('Mobile number is required.');
    }
    return AuthResult.ok({ id: pendingOtpUserId, email: '', mobileNumber });
  },

  async verifyOtp({
    mobileNumber,
    otp,
  }: {
    mobileNumber: string;
    otp: string;
  }): Promise<AuthResult> {
    await delay();
    if (otp !== mockOtp) {
      return AuthResult.fail(`Invalid OTP. Please enter ${mockOtp}.`);
    }
    // Preserve registration details if the user just registered.
    const existing = currentUser;
    currentUser = {
      id: existing?.id === registerUserId ? existing.id : otpUserId,
      email: existing?.email ?? '',
      fullName: existing?.fullName ?? otpDefaultFullName,
      mobileNumber,
      businessName: existing?.businessName,
      role: existing?.role,
    };
    return AuthResult.ok(currentUser);
  },
};
