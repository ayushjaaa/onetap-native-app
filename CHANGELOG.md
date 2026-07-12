# Changelog

All notable changes to the OneTap native app (`oneTapReactNative`) are
documented here.

## [0.0.4] - 2026-07-13

### Fixed

- Forgot password was three fully disconnected mock screens with no backend
  integration at all: `ForgotPasswordPhoneScreen` never called an API,
  `ForgotPasswordOtpScreen` checked the entered code against a hardcoded
  `MOCK_OTP` instead of verifying anything, and `ForgotPasswordResetScreen`'s
  submit handler never called a reset API — it just showed a success toast
  without ever changing the password. All three now call the real backend
  phone+OTP endpoints (`sendForgotPasswordOtp`, `verifyForgotPasswordOtp`,
  `resetPassword`), and the reset token is carried from the OTP step through
  to the reset call.
- `ForgotPasswordOtpScreen` displayed stale "4-digit code" copy and a "1234"
  hint left over from the mock, while the real OTP length (`OTP_LENGTH`) is
  6 digits — copy now matches the real length.

### Changed

- The manual signup wizard (`SignUpStep4LocationScreen`) now collects a
  required phone number, since the backend requires `phone` at registration
  as of this same release (needed for phone-based password recovery).
  Google-flow signups are unaffected — they already collect phone separately.
