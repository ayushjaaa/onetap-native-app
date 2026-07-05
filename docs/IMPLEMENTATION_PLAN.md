# OneTap365 — Implementation Plan & Logic

**Document Type:** Production-grade implementation roadmap
**Module:** Authentication (Phase 1 of full app)
**Companion Doc:** [AUTH_REQUIREMENTS.md](./AUTH_REQUIREMENTS.md)
**Last Updated:** 2026-05-05

---

## 1. Core Principle — Separation of Concerns

The fundamental rule of this implementation: **UI and API logic must never mix.**

A screen file does **not** know:

- Which HTTP method is used
- Where the data is cached
- How errors are normalized
- How tokens are attached

A screen file **only** knows:

- What hook to call (e.g. `useLoginMutation`)
- What to render based on `isLoading`, `error`, `data`
- What to do on user action (e.g. dispatch to navigate)

This separation means:

- Backend changes → only `api/*.ts` changes
- UI redesign → only `screens/*.tsx` changes
- New auth method (Google) → just add a new endpoint, screens unchanged
- Feature additions → never break existing code

---

## 2. Layer Architecture

The app has **6 distinct layers**, each with one job. Data flows in one direction.

```
┌─────────────────────────────────────────────────┐
│  LAYER 1: SCREENS (UI only)                     │
│  - Render components, handle user interaction   │
│  - Read state via hooks, dispatch actions       │
│  - NO direct API calls, NO storage access       │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  LAYER 2: HOOKS (Bridge UI ↔ Logic)             │
│  - Custom hooks (useAppDispatch, useLocation)   │
│  - RTK Query auto-generated hooks               │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  LAYER 3: STATE (Redux + RTK Query)             │
│  - Slices for client state                      │
│  - RTK Query cache for server state             │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  LAYER 4: API (Server communication)            │
│  - baseApi config (URL, headers, auth)          │
│  - Endpoint definitions                         │
│  - Mock layer (toggleable)                      │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  LAYER 5: SERVICES (Infrastructure)             │
│  - Storage (MMKV, Keychain)                     │
│  - Permissions (Location, Camera)               │
│  - Native modules (Splash, Push)                │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  LAYER 6: UTILS (Pure functions)                │
│  - Formatters, validators, transformers         │
│  - No side effects, no state                    │
└─────────────────────────────────────────────────┘
```

**Why this matters:**
A screen never imports `axios`, `MMKV`, or `Keychain` directly. It always goes through the layers above. This makes every layer **independently testable and replaceable**.

---

## 3. Data Flow Examples

### 3.1 User Logs In — Step by Step

```
1. USER ACTION
   LoginScreen.tsx → user taps "Login" button
       ↓
2. HOOK CALL
   const [login, { isLoading }] = useLoginMutation()
   await login({ email, password }).unwrap()
       ↓
3. RTK QUERY ENDPOINT
   api/authApi.ts → builds POST request
       ↓
4. BASE API
   api/baseApi.ts → adds auth header (none for login), URL, JSON encoding
       ↓
5. NETWORK
   POST http://192.168.1.5:3001/api/v1/auth/login
       ↓
6. RESPONSE
   { user, token } returned
       ↓
7. CACHE UPDATE
   RTK Query stores response in cache
       ↓
8. SIDE EFFECT (in screen)
   dispatch(setCredentials({ user, token }))
       ↓
9. AUTH SLICE
   store/authSlice.ts → updates Redux state
       ↓
10. STORAGE PERSISTENCE (middleware or thunk)
    services/secureStorage.ts → save token to Keychain
    services/storage.ts → save user to MMKV
       ↓
11. NAVIGATION
    isLoggedIn becomes true → RootNavigator re-renders
    AuthNavigator unmounts, MainNavigator mounts
    User sees Home screen
```

**Notice:** The screen file (Step 1, 8, 11) only orchestrates. It doesn't know HTTP, doesn't know storage, doesn't know navigation internals.

### 3.2 App Reopens — Auto Login Check

```
1. APP LAUNCH
   index.js → App.tsx mounts
       ↓
2. PROVIDERS WRAP
   <Provider store={store}>
     <NavigationContainer>
       <RootNavigator />
       ↓
3. NATIVE SPLASH
   react-native-bootsplash shows logo (no JS yet)
       ↓
4. JS LOADS, RootNavigator mounts
   useBootstrap() hook runs
       ↓
5. READ TOKEN
   secureStorage.getToken() → Keychain
       ↓
6. IF TOKEN EXISTS
   Call useGetMeQuery() (RTK Query)
       ├─ 200 → setCredentials, navigate to Home
       ├─ 401 → clearCredentials, show Login
       └─ network error → use cached MMKV user → Home (offline)
       ↓
7. IF NO TOKEN
   Show Welcome / Onboarding
       ↓
8. HIDE SPLASH
   BootSplash.hide() with fade
```

---

## 4. File-by-File Responsibilities

### 4.1 Screens (UI Layer)

**Rule:** Pure UI. Hooks for data. Dispatch for actions. No fetch, no storage.

| File                                         | Renders            | Calls                                             |
| -------------------------------------------- | ------------------ | ------------------------------------------------- |
| `screens/SplashScreen.tsx`                   | Logo, loader       | `useGetMeQuery`                                   |
| `screens/OnboardingScreen.tsx`               | 4 slides           | `markOnboardingDone` action                       |
| `screens/auth/WelcomeScreen.tsx`             | 3 buttons          | navigation                                        |
| `screens/auth/SignUpStep1NameScreen.tsx`     | Name input         | form context                                      |
| `screens/auth/SignUpStep2EmailScreen.tsx`    | Email input        | form context                                      |
| `screens/auth/SignUpStep3PasswordScreen.tsx` | Password input     | form context                                      |
| `screens/auth/SignUpStep4LocationScreen.tsx` | Location capture   | `useLocation`, `useRegisterMutation`              |
| `screens/auth/LoginScreen.tsx`               | Email + Password   | form, navigation                                  |
| `screens/auth/PhoneScreen.tsx`               | Phone input        | form, navigation                                  |
| `screens/auth/OtpScreen.tsx`                 | 4 OTP boxes, timer | `useVerifyOtpMutation` (mock), `useLoginMutation` |
| `screens/home/HomeScreen.tsx`                | Welcome text       | `useGetMeQuery`                                   |

### 4.2 Components (Reusable UI)

| File                                      | Purpose                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `components/common/Button.tsx`            | Primary/secondary button with loader                             |
| `components/common/Input.tsx`             | Text input with red/green validation states + show/hide password |
| `components/common/Screen.tsx`            | SafeArea wrapper with theme background                           |
| `components/common/Loader.tsx`            | Centered activity indicator                                      |
| `components/common/Toast.tsx`             | Toast component (with backend message support)                   |
| `components/common/StepIndicator.tsx`     | "Step 2 of 4" progress bar                                       |
| `components/common/Shimmer.tsx`           | Skeleton placeholder                                             |
| `components/common/ErrorBoundary.tsx`     | Catches JS errors                                                |
| `components/common/OfflineBanner.tsx`     | Top banner when no internet                                      |
| `components/auth/PhoneInput.tsx`          | +91 prefix + 10-digit input                                      |
| `components/auth/OtpInput.tsx`            | 4 boxes with auto-advance                                        |
| `components/auth/PasswordInput.tsx`       | Wraps Input with show/hide eye icon                              |
| `components/auth/PasswordStrengthBar.tsx` | Visual strength meter                                            |
| `components/auth/SocialButton.tsx`        | Google sign-in button                                            |

### 4.3 API Layer (RTK Query)

| File             | Endpoints                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `api/baseApi.ts` | Base config, prepareHeaders for token, error handling                                                             |
| `api/authApi.ts` | `register`, `login`, `getMe`, `updateProfile`, `sendOtp` (mock), `verifyOtp` (mock), `googleSignIn` (placeholder) |

### 4.4 Store (Redux Slices)

| File                     | State                                         |
| ------------------------ | --------------------------------------------- |
| `store/authSlice.ts`     | `{ user, token, isLoggedIn, hasOnboarded }`   |
| `store/locationSlice.ts` | `{ lat, lng, city, state, address, pincode }` |
| `store/cartSlice.ts`     | `{ items, total }` (for v2)                   |
| `store/walletSlice.ts`   | `{ biddingBalance, postCredits }` (for v2)    |

### 4.5 Services (Infrastructure)

| File                          | Wraps                                                 |
| ----------------------------- | ----------------------------------------------------- |
| `services/storage.ts`         | MMKV — `setItem`, `getItem`, `removeItem`, `clearAll` |
| `services/secureStorage.ts`   | Keychain — `saveToken`, `getToken`, `clearToken`      |
| `services/locationService.ts` | Geolocation API + reverse geocoding                   |
| `services/notifications.ts`   | FCM (deferred to v2)                                  |
| `services/analytics.ts`       | Analytics wrapper (deferred to v2)                    |

### 4.6 Hooks (Custom Logic)

| File                        | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `hooks/useAppDispatch.ts`   | Typed `useDispatch`                            |
| `hooks/useAppSelector.ts`   | Typed `useSelector`                            |
| `hooks/useDebounce.ts`      | Debounce values for search                     |
| `hooks/useLocation.ts`      | Request permission + get GPS + reverse geocode |
| `hooks/useBootstrap.ts`     | App launch logic (token check, splash hide)    |
| `hooks/useOtpTimer.ts`      | Timestamp-based OTP timer                      |
| `hooks/useToast.ts`         | Show toast with backend message                |
| `hooks/useNetworkStatus.ts` | Online/offline detection                       |

### 4.7 Utils (Pure Functions)

| File                   | Functions                                       |
| ---------------------- | ----------------------------------------------- |
| `utils/formatters.ts`  | `formatPhone`, `formatCurrency`, `formatDate`   |
| `utils/validators.ts`  | `isValidEmail`, `isValidPhone`, `isValidAadhar` |
| `utils/permissions.ts` | `requestLocationPermission`, `openSettings`     |
| `utils/schemas.ts`     | Zod validation schemas (signup, login)          |
| `utils/errorMapper.ts` | Normalize API errors to user-friendly messages  |

### 4.8 Navigation

| File                           | Defines                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `navigation/RootNavigator.tsx` | Switches Auth ↔ Main based on `isLoggedIn`                        |
| `navigation/AuthNavigator.tsx` | Splash, Onboarding, Welcome, SignUp steps, Login, OTP             |
| `navigation/MainNavigator.tsx` | Bottom tabs: Home, Services, Marketplace, Bidding, Profile        |
| `navigation/types.ts`          | `AuthStackParamList`, `MainTabParamList` for type-safe navigation |

### 4.9 Theme

| File                  | Exports                       |
| --------------------- | ----------------------------- |
| `theme/colors.ts`     | Dark green palette (locked)   |
| `theme/typography.ts` | Font sizes, weights, families |
| `theme/spacing.ts`    | xs, sm, md, lg, xl scale      |
| `theme/index.ts`      | Re-export everything          |

### 4.10 Config

| File                  | Contains                                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| `config/env.ts`       | Typed wrapper around `react-native-config`                                       |
| `config/constants.ts` | `MIN_BID_WALLET=20000`, `OTP_LENGTH=4`, `OTP_TIMER_SECONDS=120`, `MOCK_OTP=1234` |

---

## 5. Storage Strategy — Where Each Piece of Data Lives

| Data                              | Storage                        | Lifetime                    | Reason                                             |
| --------------------------------- | ------------------------------ | --------------------------- | -------------------------------------------------- |
| JWT token                         | **Keychain**                   | Until logout/expire         | Hardware-encrypted; account access = high security |
| User profile                      | **MMKV** + Redux               | Until logout                | Fast read on app open; not sensitive               |
| `isLoggedIn` flag                 | Redux (mirrors token presence) | Session                     | Drives navigator switch                            |
| `hasOnboarded` flag               | **MMKV**                       | Forever                     | Don't show onboarding twice                        |
| Current location                  | **MMKV** + Redux               | Until manual update         | Sent on every relevant API call                    |
| Form input                        | **React state**                | Per screen                  | Doesn't need to persist                            |
| Server lists (products, services) | **RTK Query cache**            | TTL-based                   | Auto-refetch on stale                              |
| Cart items                        | **MMKV** + Redux               | Until checkout              | Persists across sessions                           |
| Password                          | **Nowhere**                    | One-time send               | Storing = security violation                       |
| Aadhaar number                    | **Nowhere**                    | One-time send during verify | Legal — ₹1 cr penalty                              |
| OTP entered                       | **React state**                | Until verify                | Single-use credential                              |

---

## 6. Auth Flow — Detailed Logic

### 6.1 Sign Up Flow

```
WelcomeScreen
   └─ tap "Sign Up"
   ↓
SignUpStep1Name
   ├─ user types name
   ├─ on blur: Zod validates → red/green
   ├─ tap "Next" → form context stores name
   ↓
SignUpStep2Email
   ├─ user types email
   ├─ on blur: Zod validates email format
   ├─ tap "Next" → form stores email
   ↓
SignUpStep3Password
   ├─ user types password (with show/hide eye)
   ├─ password strength bar updates live
   ├─ on blur: Zod validates rules
   ├─ tap "Next" → form stores password
   ↓
SignUpStep4Location
   ├─ on screen mount: useLocation hook runs
   ├─ permission flow:
   │    ├─ granted → get GPS → reverse geocode
   │    └─ denied → show "Open Settings" CTA, BLOCK progress
   ├─ display: "Detected: Mumbai, Maharashtra"
   ├─ tap "Create Account" → useRegisterMutation
   ↓
API: POST /auth/register
   { name, email, password, lat, lng, address, city, state, pincode }
   ↓
   ├─ 201 success → toast "Account created" → navigate to Login
   └─ 409 conflict → toast "Email already exists" → stay on screen
```

**State management:**

- Multi-step form uses **single React Hook Form context** spanning all 4 screens
- Form data lives in form state, NOT Redux (avoids re-renders, persistence not needed)
- `navigation.goBack()` preserves form state automatically

### 6.2 Login Flow

```
WelcomeScreen
   └─ tap "Login"
   ↓
LoginScreen (Email + Password)
   ├─ user fills both fields
   ├─ on submit: validates client-side, NO API call yet
   ├─ navigate to Phone screen with form data
   ↓
PhoneScreen
   ├─ user enters 10-digit phone
   ├─ on submit: NO API call (OTP backend not ready)
   ├─ generate mock OTP timer timestamp
   ├─ navigate to OTP screen with phone + previous form data
   ↓
OtpScreen
   ├─ 4 OTP input boxes (auto-advance)
   ├─ react-native-otp-verify auto-fills if SMS detected (mock won't trigger this)
   ├─ timer based on timestamp (background-safe)
   ├─ user enters OTP
   ├─ on complete: useVerifyOtpMutation (mock — checks against 1234)
   │    ├─ wrong → show error, increment attempt counter, allow retry
   │    └─ correct → proceed
   ↓
ON OTP SUCCESS: Real API calls begin
   ↓
1. POST /auth/login { email, password }
   ├─ 401 → toast "Invalid credentials" → back to Login
   └─ 200 → { user, token }
       ↓
2. saveToken(token) → Keychain
   saveUser(user) → MMKV
   dispatch(setCredentials({ user, token }))
       ↓
3. PUT /auth/profile { phone: "+91XXXXXXXXXX" }
   ├─ success → user object updated
   └─ failure → log warning, don't block (phone can be added later)
       ↓
4. RootNavigator detects isLoggedIn=true → MainNavigator mounts
   User sees Home
```

### 6.3 App Bootstrap (Splash Logic)

```
App.tsx mounts
   ↓
Native bootsplash visible (logo)
   ↓
useBootstrap() hook fires:
   ├─ secureStorage.getToken()
   │    ├─ exists → call /auth/me
   │    │    ├─ 200 → dispatch setCredentials(user)
   │    │    ├─ 401 → secureStorage.clearToken()
   │    │    │        storage.removeItem('user')
   │    │    │        dispatch(logout())
   │    │    └─ network err → load cached user from MMKV
   │    │                     dispatch(setCredentials(cachedUser))
   │    │                     show offline banner
   │    └─ none → noop, will show Welcome/Onboarding
   ↓
   ├─ storage.getItem('hasOnboarded')
   │    └─ false → show Onboarding first time
   ↓
   ├─ Wait for max(1500ms, work done) — UX guarantee
   ↓
   └─ BootSplash.hide({ fade: true })
      RootNavigator decides screen based on auth + onboarding state
```

---

## 7. Error Handling Strategy

### 7.1 Error Sources

1. **Validation errors** — Zod, shown inline (red/green messages)
2. **API errors** — RTK Query, mapped to user-friendly toasts
3. **JS runtime errors** — caught by ErrorBoundary, logged
4. **Network errors** — detected by NetInfo, OfflineBanner shown

### 7.2 Error Mapper (Single Source of Truth)

`utils/errorMapper.ts` normalizes every API error to:

```ts
{
  status: number,           // HTTP status
  message: string,          // User-friendly (from backend or fallback)
  isNetworkError: boolean,
  isAuthError: boolean,     // 401 specifically
}
```

### 7.3 Per-Screen Error Display

- **Inline** for validation (red text under input)
- **Toast** for API errors with backend message
- **Full screen** only for catastrophic errors (ErrorBoundary)

### 7.4 Auto-Logout on 401

- A custom RTK Query middleware listens for 401 responses
- On 401: dispatches `logout()` action
- Auth slice clears state → navigator swaps → user sees Login

---

## 8. Mock Layer Design (OTP)

```ts
// api/authApi.ts
const USE_MOCK_OTP = Config.USE_MOCK_OTP === 'true';

sendOtp: builder.mutation<SendOtpResponse, SendOtpRequest>({
  queryFn: async (arg) => {
    if (USE_MOCK_OTP) {
      // Mock: pretend OTP sent
      await delay(800); // simulate network
      return { data: { success: true, message: 'OTP sent' } };
    }
    // Real call (when backend ready)
    return baseQuery({ url: '/auth/send-otp', method: 'POST', body: arg });
  },
}),

verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
  queryFn: async (arg) => {
    if (USE_MOCK_OTP) {
      await delay(500);
      if (arg.otp === '1234') {
        return { data: { success: true, verified: true } };
      }
      return {
        error: {
          status: 400,
          data: { message: 'Invalid OTP. Try 1234 (mock).' },
        },
      };
    }
    return baseQuery({ url: '/auth/verify-otp', method: 'POST', body: arg });
  },
}),
```

**Why `queryFn` instead of `query`?**

- Allows custom logic (mock branching) without changing call site
- Same hook name (`useVerifyOtpMutation`) regardless of mock or real
- Switch is one env variable change

---

## 9. Environment Configuration

### 9.1 Env Files

```
.env.development   → API_URL, USE_MOCK_OTP=true,  ENV=development
.env.staging       → API_URL, USE_MOCK_OTP=true,  ENV=staging
.env.production    → API_URL, USE_MOCK_OTP=false, ENV=production
```

### 9.2 Build Scripts (`package.json`)

```json
"scripts": {
  "android": "ENVFILE=.env.development react-native run-android",
  "android:staging": "ENVFILE=.env.staging react-native run-android --variant=release",
  "android:prod": "ENVFILE=.env.production react-native run-android --variant=release",
  "ios": "ENVFILE=.env.development react-native run-ios",
  "ios:prod": "ENVFILE=.env.production react-native run-ios --configuration Release"
}
```

### 9.3 Type-Safe Access

```ts
// config/env.ts
import Config from 'react-native-config';

export const env = {
  API_URL: Config.API_URL || 'http://localhost:3001/api/v1',
  USE_MOCK_OTP: Config.USE_MOCK_OTP === 'true',
  ENV: Config.ENV as 'development' | 'staging' | 'production',
};
```

---

## 10. Edge Case Handling Reference

(Already documented in detail in [AUTH_REQUIREMENTS.md §27](./AUTH_REQUIREMENTS.md#27-edge-cases--industry-standard))

This implementation plan handles each one as follows:

| Category                            | Where Handled                              |
| ----------------------------------- | ------------------------------------------ |
| Splash background → skip            | `useBootstrap` checks app state            |
| Token expired → login               | RTK Query middleware on 401                |
| Email exists → toast                | `errorMapper` extracts backend message     |
| Slow network → button spinner       | `Button` component reads `isLoading`       |
| Back button preserves data          | React Hook Form context in nav stack       |
| Wrong password → backend rate limit | Backend returns 429, mapped to toast       |
| Location denied → settings          | `useLocation` hook returns rejection state |
| OTP background → state preserve     | `useOtpTimer` uses timestamp               |
| OTP wrong 3x → fresh request        | Counter in OtpScreen state, force resend   |
| Auto-fill SMS                       | `react-native-otp-verify` listener         |
| Clipboard paste                     | Custom OtpInput handles paste split        |
| Fast typing → debounce              | `useDebounce` hook                         |
| Empty touched → required            | Zod schema + RHF touched state             |
| Trim email                          | Zod transform                              |
| Strip +91                           | `formatPhone` util                         |
| GPS off → message                   | `useLocation` returns specific error       |
| No internet → banner                | `useNetworkStatus` + OfflineBanner         |
| API timeout → retry                 | RTK Query auto-retry + manual button       |
| 500 error → toast                   | `errorMapper` maps to backend message      |

---

## 11. Production Readiness Checklist

- ✅ All API calls go through RTK Query (no axios scattered)
- ✅ All storage operations through service layer (no direct MMKV calls in screens)
- ✅ All sensitive data in Keychain (token, refresh token)
- ✅ All forms use React Hook Form + Zod
- ✅ All errors normalized via errorMapper
- ✅ All screens wrapped in ErrorBoundary
- ✅ All API URLs from env (no hardcoded URLs)
- ✅ All colors from theme (no hex in components)
- ✅ All strings in i18n (English only v1, but ready for translation)
- ✅ All navigation typed (AuthStackParamList etc.)
- ✅ Pre-commit hooks active (lint + format)
- ✅ Android cleartext only in dev
- ✅ Logo (img.png) wired into native splash + app icon

---

## 12. Folder Structure — Final Layout

```
src/
├── api/
│   ├── baseApi.ts          ← URL, headers, token injection, error wrapper
│   └── authApi.ts          ← register, login, getMe, updateProfile, sendOtp, verifyOtp, google
├── app/
│   ├── App.tsx             ← Providers + RootNavigator
│   └── store.ts            ← Redux store config
├── assets/
│   └── icons/
│       └── img.png         ← App logo (provided by user)
├── components/
│   ├── auth/
│   │   ├── PhoneInput.tsx
│   │   ├── OtpInput.tsx
│   │   ├── PasswordInput.tsx
│   │   ├── PasswordStrengthBar.tsx
│   │   └── SocialButton.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Screen.tsx
│       ├── Loader.tsx
│       ├── Toast.tsx
│       ├── StepIndicator.tsx
│       ├── Shimmer.tsx
│       ├── ErrorBoundary.tsx
│       └── OfflineBanner.tsx
├── config/
│   ├── env.ts
│   └── constants.ts
├── hooks/
│   ├── useAppDispatch.ts
│   ├── useAppSelector.ts
│   ├── useBootstrap.ts
│   ├── useLocation.ts
│   ├── useOtpTimer.ts
│   ├── useToast.ts
│   ├── useNetworkStatus.ts
│   └── useDebounce.ts
├── navigation/
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   ├── MainNavigator.tsx
│   └── types.ts
├── screens/
│   ├── SplashScreen.tsx
│   ├── OnboardingScreen.tsx
│   ├── auth/
│   │   ├── WelcomeScreen.tsx
│   │   ├── SignUpStep1NameScreen.tsx
│   │   ├── SignUpStep2EmailScreen.tsx
│   │   ├── SignUpStep3PasswordScreen.tsx
│   │   ├── SignUpStep4LocationScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── PhoneScreen.tsx
│   │   └── OtpScreen.tsx
│   └── home/
│       └── HomeScreen.tsx
├── services/
│   ├── storage.ts          ← MMKV wrapper
│   ├── secureStorage.ts    ← Keychain wrapper
│   ├── locationService.ts  ← GPS + reverse geocoding
│   ├── notifications.ts    ← deferred to v2
│   └── analytics.ts        ← deferred to v2
├── store/
│   ├── authSlice.ts
│   ├── locationSlice.ts
│   ├── cartSlice.ts        ← v2
│   └── walletSlice.ts      ← v2
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── index.ts
├── types/
│   ├── auth.types.ts
│   ├── api.types.ts
│   ├── navigation.types.ts
│   └── index.ts
└── utils/
    ├── formatters.ts
    ├── validators.ts
    ├── permissions.ts
    ├── schemas.ts          ← Zod schemas
    └── errorMapper.ts
```

---

## 13. Phased Execution Plan

The implementation is split into **8 phases**. Each phase produces a working, testable artifact. No phase leaves the app in a broken state.

| Phase | Goal                     | Time | Verifiable Output                                   |
| ----- | ------------------------ | ---- | --------------------------------------------------- |
| 1     | Dependencies + tooling   | 25m  | App builds, paths work, env loads                   |
| 2     | Theme + foundation utils | 20m  | Colors visible, schemas testable                    |
| 3     | Storage + API base       | 25m  | MMKV writes, Keychain stores, baseApi connects      |
| 4     | Common components        | 30m  | Button, Input visible on storybook screen           |
| 5     | Splash + Onboarding      | 25m  | App opens with logo, slides work                    |
| 6     | Sign Up flow             | 45m  | Can register account end-to-end (real API)          |
| 7     | Login + OTP flow         | 45m  | Can log in end-to-end (mock OTP)                    |
| 8     | Home + polish            | 30m  | Logged in users see Home, logout works, hooks green |

**Total: ~4 hours** of focused implementation.

Each phase is detailed in [PHASES.md](./PHASES.md) (will be created when execution begins).

---

## 14. Why This Plan Will Not Break in Future

### Adding a new feature (e.g., Reviews)

- Add `api/reviewsApi.ts` (one file)
- Add `screens/reviews/*` (UI only)
- Maybe a `slice` if there's client state
- **No existing file changes required**

### Switching to a different backend

- Update `.env.production` → done
- All endpoints in one folder, all URLs in one config

### Adding a new auth method (e.g., Apple Sign-In)

- Add new endpoint in `authApi.ts`
- Add new button on Welcome screen
- **No changes to navigation, slices, or storage**

### Migrating from REST to GraphQL

- Replace `baseApi.ts` with GraphQL config
- All endpoint files use the same query/mutation builder pattern
- Screens unchanged

### Adding refresh tokens

- Add interceptor in `baseApi.ts` to handle 401 with refresh
- Add `refreshToken` method in `secureStorage.ts`
- **No screen changes**

### Adding analytics

- Wrap `services/analytics.ts`
- Add tracking calls in key screens (5 minutes)
- **No business logic changes**

---

## 15. Document Summary

This plan delivers:

1. **Strict separation** between UI, state, API, storage, and infrastructure
2. **Type-safety** end-to-end (TypeScript + Zod + typed navigation)
3. **Production patterns** (Keychain for secrets, MMKV for fast access, RTK Query for caching)
4. **Mock-friendly** architecture (env flag toggles OTP mock, screens unchanged)
5. **Edge case coverage** for every documented scenario
6. **Future extensibility** without rewrites

The next step is execution per Section 13's phases.
