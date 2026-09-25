import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from '../../../routes/appRoutes';
import type { OtpVerificationArgs, SignupFlowArgs } from '../../../routes/appRoutes';
import { useSession } from '../../../session/SessionContext';
import { mockAuthService } from '../../../services/auth/mockAuthService';
import { AuthOtpFields } from '../../../shared/AuthOtpFields';
import type { AuthOtpFieldsHandle } from '../../../shared/AuthOtpFields';
import { LoginFlowBackButton } from '../../../shared/LoginFlowBackButton';
import { LoginFlowOtpIcon } from '../../../shared/LoginFlowOtpIcon';
import { LoginFlowContinueButton } from '../../../shared/LoginFlowContinueButton';
import { SnackBar } from '../../../shared/SnackBar';
import { AuthWebLayout } from '../../../shared/AuthWebLayout';
import mockData from '../../../mocks/mockData.json';
import otpMock from './OtpVerification.mock.json';
import {
  Screen,
  Content,
  Header,
  Title,
  HeaderTrailing,
  IconWrap,
  SentTo,
  Contact,
  FieldsWrap,
  ErrorText,
  Hint,
  ButtonWrap,
  Resend,
  ResendLink,
} from './OtpVerification.styles';

const { otpLength, otpResendSeconds, mockOtp } = mockData.appConstants;

// app_router.dart falls back to these args when none are passed.
const DEFAULT_ARGS = otpMock.defaultArgs as OtpVerificationArgs;

/** Step 2 — OTP verification (login flow). */
export function OtpVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setFromAuth } = useSession();

  const args = (location.state as OtpVerificationArgs | null) ?? DEFAULT_ARGS;
  const contact = args.contactDisplay;
  const rawMobile = args.mobileNumber ?? contact.replace(/\D/g, '').replace(/^91/, '');

  const otpRef = useRef<AuthOtpFieldsHandle>(null);
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(otpResendSeconds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackBar, setSnackBar] = useState<{ id: number; message: string } | null>(null);

  // Flutter `mounted` check after awaits.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Timer.periodic(1s) counting down to 0.
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const startTimer = () => setSeconds(otpResendSeconds);

  const handleChanged = useCallback((value: string) => {
    setOtp(value);
    setError(null);
  }, []);

  const dismissSnackBar = useCallback(() => setSnackBar(null), []);

  const verify = async (code?: string) => {
    const value = code ?? otp;
    if (value.length !== otpLength) return;

    setLoading(true);
    setError(null);

    const result = await mockAuthService.verifyOtp({ mobileNumber: rawMobile, otp: value });
    if (!mounted.current) return;
    setLoading(false);

    if (!result.success) {
      setError(result.message ?? 'Invalid OTP');
      // As in Flutter, clear() reports '' through onChanged, which also resets the error.
      otpRef.current?.clear();
      return;
    }

    switch (args.purpose) {
      case 'mobileLogin':
        // Existing user — verified mock account already carries a profile,
        // so skip straight to the home shell instead of the signup steps.
        if (result.user) setFromAuth(result.user);
        // pushNamedAndRemoveUntil(homePlaceholder, (_) => false)
        navigate(AppRoutes.categoryBrowse, { replace: true });
        return;
      case 'registration': {
        const signupArgs: SignupFlowArgs = { mobileNumber: rawMobile, fullName: '' };
        // pushReplacementNamed(createAccount)
        navigate(AppRoutes.createAccount, { replace: true, state: signupArgs });
        return;
      }
    }
  };

  const resend = async () => {
    await mockAuthService.sendOtp({ mobileNumber: rawMobile });
    if (!mounted.current) return;
    otpRef.current?.clear();
    setError(null);
    startTimer();
    setSnackBar({ id: Date.now(), message: `Verification code resent (use ${mockOtp})` });
  };

  return (
    <AuthWebLayout>
      <Screen>
        <Content>
          <Header>
            <LoginFlowBackButton onPressed={() => navigate(-1)} />
            <Title>Verify your number</Title>
            <HeaderTrailing />
          </Header>
          <IconWrap>
            <LoginFlowOtpIcon />
          </IconWrap>
          <SentTo>We've sent a 6-digit code to</SentTo>
          <Contact>{contact}</Contact>
          <FieldsWrap>
            <AuthOtpFields
              ref={otpRef}
              hasError={error !== null}
              onChanged={handleChanged}
              onCompleted={verify}
            />
          </FieldsWrap>
          {error !== null && <ErrorText>{error}</ErrorText>}
          <Hint>Tap the boxes to enter or paste your code</Hint>
          <ButtonWrap>
            <LoginFlowContinueButton
              label="Enter 6-digit code"
              enabled={otp.length === otpLength}
              loading={loading}
              onPressed={() => verify()}
            />
          </ButtonWrap>
          <Resend>
            Didn't receive the code?{' '}
            {seconds > 0 ? (
              `Resend OTP in 0:${String(seconds).padStart(2, '0')}`
            ) : (
              <ResendLink type="button" onClick={resend}>
                Resend OTP
              </ResendLink>
            )}
          </Resend>
        </Content>
        {snackBar && (
          <SnackBar key={snackBar.id} message={snackBar.message} onDismissed={dismissSnackBar} />
        )}
      </Screen>
    </AuthWebLayout>
  );
}
