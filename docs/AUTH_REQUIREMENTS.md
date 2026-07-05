# OneTap365 — Auth Module Requirements & Decisions

**Document Type:** Requirements Specification
**Module:** Authentication (Sign Up + Login + Splash + Onboarding)
**Status:** Decisions captured, pending final approvals
**Last Updated:** 2026-04-30

---

## 1. Overview

This document captures every decision made during the planning phase for the OneTap365 Consumer App authentication flow. It is the source of truth before implementation begins.

The authentication module is the **first feature** to be built. Other features (services, marketplace, bidding, wallet, chat) will follow.

---

## 2. App Flow — High Level

```
App Launch
    ↓
Splash Screen (1.5s minimum, hybrid native + JS)
    ↓
Token check
    ↓
    ├─ Token valid → Home Screen
    │
    └─ No token / expired
            ↓
    Onboarding Slides (first launch only)
            ↓
    Welcome Screen [Sign Up] [Login] [Continue with Google]
            ↓
    ┌───────┴────────┐
    ↓                ↓
Sign Up Flow    Login Flow
(3 steps)       (4 steps)
    ↓                ↓
Login Screen    Home Screen
(redirect)
```

---

## 3. Splash Screen

| Aspect               | Decision                                                         |
| -------------------- | ---------------------------------------------------------------- |
| **Logo**             | OneTap365 logo                                                   |
| **Minimum duration** | 1.5 seconds                                                      |
| **Implementation**   | Hybrid — native splash (instant) + JS splash (smooth transition) |
| **Library**          | `react-native-bootsplash`                                        |
| **Background work**  | Token check, MMKV restoration, app initialization                |
| **Behavior**         | Token valid → Home, otherwise → Welcome                          |

---

## 4. Onboarding Slides

| Aspect          | Decision                       |
| --------------- | ------------------------------ |
| **Required**    | Yes (do not skip)              |
| **Slide count** | 4 slides                       |
| **Trigger**     | First app launch only          |
| **Skip button** | Yes                            |
| **Final CTA**   | "Get Started" → Welcome screen |

### Suggested Slide Content

| #   | Title                      | Description                               |
| --- | -------------------------- | ----------------------------------------- |
| 1   | Welcome to OneTap365       | Buy, Sell, Invest — all in one place      |
| 2   | Discover services near you | Plumbers, electricians, cleaners and more |
| 3   | Invest in properties       | Earn returns from real estate bidding     |
| 4   | Sell your products         | Reach thousands of buyers                 |

> **Pending:** Final copy for slides — user to provide or accept default.

---

## 5. Welcome Screen

After onboarding (or for returning logged-out users):

- **[Sign Up]** button → Sign Up flow
- **[Login]** button → Login flow
- **[Continue with Google]** button → Google flow

---

## 6. Sign Up Flow — 4 Steps

> **No OTP in registration.** OTP is only used in login.
> **Location captured at signup** — backend register endpoint already supports `lat, lng, address, city, state, pincode`.

| Step | Field        | Validation Rules                                                     |
| ---- | ------------ | -------------------------------------------------------------------- |
| 1    | **Name**     | Required, min 2 chars, only letters + spaces, auto-capitalize        |
| 2    | **Email**    | Valid email format, lowercase, trimmed                               |
| 3    | **Password** | Min 8 chars, 1 uppercase, 1 number, 1 special char, show/hide toggle |
| 4    | **Location** | Auto GPS — mandatory, reverse geocoded to city/state                 |

### After Submission

- API call to `POST /api/v1/auth/register` with:
  ```json
  {
    "name": "Ravi Kumar",
    "email": "ravi@gmail.com",
    "password": "MyPass1234",
    "address": "123 MG Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "lat": 19.076,
    "lng": 72.8777
  }
  ```
- **Role is NOT sent from client** — server assigns `"user"` by default
- Success → redirect to **Login screen** (backend does NOT return token on register)

### Backend Role Fix (Deferred to v2)

Currently the backend accepts `role` from request body. This is a security risk but acceptable for v1 since the frontend never sends it. Backend hardening (server-side hardcode of `role = "user"`) will be done in v2.

### Why no role from client?

If role is set client-side, an attacker can modify the request and assign themselves `"admin"`. Frontend therefore never sends the field. Role changes happen manually in the database.

---

## 7. Login Flow — 4 Steps

> Phone number is captured at login because the backend register endpoint does not yet accept phone. Once OTP is verified, phone is saved via `PUT /auth/profile`.

| Step | Field        | Validation                                     |
| ---- | ------------ | ---------------------------------------------- |
| 1    | **Email**    | Valid email format                             |
| 2    | **Password** | Required, min 8 chars, show/hide toggle        |
| 3    | **Phone**    | Indian phone (+91, 10 digits, starts with 6-9) |
| 4    | **OTP**      | 4 digits, mock = `1234`, 2-min timer           |

### Order of API Calls

```
Step 1-2: Email + Password (no API call yet)
Step 3:   Phone entered (still no API call — OTP not in backend)
Step 4:   User taps "Send OTP" → mock screen, OTP = 1234
          User enters OTP → verify locally against 1234

Only AFTER OTP verifies successfully:
  ↓
1. POST /api/v1/auth/login
   { email, password }
   → Returns { user, token }
  ↓
2. Save token to Keychain, user to MMKV
  ↓
3. PUT /api/v1/auth/profile
   { phone: "+919876543210" }
   → Saves phone to user record
  ↓
4. Navigate to Home
```

### Important

- **No real backend call until OTP is verified locally**
- OTP send + verify are **fully mocked** on frontend (1234 hardcoded)
- Login API call is **real** and happens only after mock OTP passes
- Phone is added via profile update because register API does not accept it (yet)

---

## 8. OTP Screen

| Aspect              | Decision                                                            |
| ------------------- | ------------------------------------------------------------------- |
| **Length**          | 4 digits                                                            |
| **Mock value**      | `1234` (hardcoded for now)                                          |
| **Timer**           | 2 minutes for resend                                                |
| **Timer mechanism** | Use timestamp (not countdown variable) — survives app backgrounding |
| **Auto-read**       | Yes — `react-native-otp-verify` (Android)                           |
| **Auto-focus**      | Next box on digit entry, previous on backspace                      |
| **Wrong attempts**  | Backend handles rate limiting → no frontend logic                   |
| **Daily limit**     | Backend handles → no frontend logic                                 |
| **Mock scope**      | Only OTP send + verify is mocked. All other APIs are real.          |

### Timer Behavior

```ts
// Save timestamp when OTP sent
const otpSentAt = Date.now();

// Calculate remaining each render
const remaining = Math.max(
  0,
  120 - Math.floor((Date.now() - otpSentAt) / 1000),
);
```

This way, if app goes to background and comes back, time is calculated correctly.

---

## 9. Google Sign In Flow

| Aspect             | Decision                                     |
| ------------------ | -------------------------------------------- |
| **Backend status** | Not ready                                    |
| **Behavior**       | Pending — user to decide: Mock v1 or Skip v1 |

### Why we still need name + email + phone in DB

The user's reason: **lead generation**. Regardless of how user signs in, we want their full profile (name, email, phone, location) in the database.

### Google Flow (when implemented)

```
Click "Continue with Google"
    ↓
Google account picker
    ↓
Returns: { name, email, googleId }
    ↓
Backend check: user exists?
    ├─ Yes → ask for OTP (login flow continued)
    └─ No  → ask for phone + OTP + location → register
    ↓
Home screen
```

---

## 10. Validation UX

### Behavior (per field)

```
Typing:        border: gray/blue,  message: hidden
Blurred bad:   border: red,        message: red error text
Typing again:  border: gray/blue,  message: hidden (cleared)
Blurred good:  border: green,      message: green success text
```

### Implementation

- **Library:** `react-hook-form` + `zod`
- **Mode:** `onBlur` for validation trigger
- **On change:** clear existing error
- **On blur:** revalidate and show red/green message

### Field-Specific Behaviors

| Field    | UX Detail                                           |
| -------- | --------------------------------------------------- |
| Name     | Auto-capitalize (sentence case)                     |
| Email    | Email keyboard, lowercase, trim spaces              |
| Password | Show/hide toggle (eye icon)                         |
| Phone    | Numeric keyboard, max 10 digits, +91 prefix display |
| OTP      | Numeric keyboard, 4 separate boxes, auto-advance    |

### Auto-Focus

- On valid input + Next pressed → next field auto-focuses
- Multi-step form: each step's first field auto-focuses on entry

---

## 11. Step Form Behavior

| Aspect                 | Decision                                              |
| ---------------------- | ----------------------------------------------------- |
| **Back button**        | Yes — works on every step                             |
| **Data preservation**  | Yes — going back preserves all entered data           |
| **Progress indicator** | Yes — "Step X of Y" + progress bar                    |
| **State management**   | React Hook Form with single form context across steps |

---

## 12. Authentication & Security

### Role Management

| Aspect                 | Decision                                |
| ---------------------- | --------------------------------------- |
| **Default role**       | `"user"`                                |
| **Set by**             | Backend only                            |
| **Client sends role?** | **Never**                               |
| **Backend behavior**   | Ignore any `role` field in request body |
| **Admin assignment**   | Manual via database / admin panel       |

### Token Management

| Aspect               | Decision                                               |
| -------------------- | ------------------------------------------------------ |
| **Storage**          | Keychain for token (secure), MMKV for user data (fast) |
| **Expiry**           | Pending — recommended 30 days                          |
| **Refresh token**    | Pending                                                |
| **Persistent login** | Pending — recommended Yes                              |

### Logout

| Aspect           | Decision                                                         |
| ---------------- | ---------------------------------------------------------------- |
| **Location**     | Profile screen                                                   |
| **Action**       | Clear token + user data + cart + location from storage and Redux |
| **Confirmation** | Yes — "Are you sure?" popup                                      |

### Forgot Password

| Aspect             | Decision                                  |
| ------------------ | ----------------------------------------- |
| **UI present**     | Yes (link on Login screen)                |
| **Functional**     | No — implementation deferred              |
| **Click behavior** | Pending — recommend "Coming soon" message |

### Change Password

| Aspect         | Decision                     |
| -------------- | ---------------------------- |
| **UI present** | Yes (in Profile)             |
| **Functional** | No — implementation deferred |

---

## 13. Location

| Aspect                   | Decision                                              |
| ------------------------ | ----------------------------------------------------- |
| **Required**             | Mandatory at login                                    |
| **Source**               | GPS only — no manual entry                            |
| **Permission denied**    | Block app, redirect to settings                       |
| **Reverse geocoding**    | Yes — show city name in UI                            |
| **Manual update button** | Yes — in Profile/Settings                             |
| **Lat/Lng storage**      | Always sent to backend                                |
| **Library**              | `@react-native-community/geolocation` + Geocoding API |

---

## 14. Loading States

| Context                                    | Treatment                         |
| ------------------------------------------ | --------------------------------- |
| **Auth screens** (signup, login, OTP)      | Button spinner (in-button loader) |
| **Home page**                              | Shimmer / skeleton placeholders   |
| **Lists** (services, products, properties) | Shimmer placeholders              |
| **Other content pages**                    | Shimmer placeholders              |

### Library

`react-native-skeleton-placeholder` or custom shimmer component.

---

## 15. Error Handling

| Aspect                  | Decision                                             |
| ----------------------- | ---------------------------------------------------- |
| **Display**             | Toast notifications                                  |
| **Message source**      | Backend response message (not hardcoded client text) |
| **Validation errors**   | Inline (field-level red/green text)                  |
| **Network errors**      | Toast                                                |
| **Server errors (5xx)** | Toast with backend message                           |
| **401 Unauthorized**    | Auto logout + redirect to login                      |

### Toast Library

`react-native-toast-message` or similar.

### Important

- All API error messages come from backend
- Frontend does NOT hardcode error strings
- Backend must return user-friendly `message` field in error responses

---

## 16. Offline Mode

| Aspect        | Decision                                                                |
| ------------- | ----------------------------------------------------------------------- |
| **Pattern**   | Instagram-style                                                         |
| **Behavior**  | Show offline banner at top, cached data still displayed where available |
| **Detection** | `@react-native-community/netinfo`                                       |

---

## 17. UI / UX Polish — Form Inputs

All confirmed and required:

| Feature                               | Required |
| ------------------------------------- | -------- |
| Password show/hide toggle (eye icon)  | Yes      |
| Email keyboard (`@` symbol prominent) | Yes      |
| Phone keyboard (numbers only)         | Yes      |
| Auto-capitalize name field            | Yes      |
| Auto-focus next field on submit       | Yes      |

---

## 18. Tech Stack

### Core

| Purpose          | Library                        |
| ---------------- | ------------------------------ |
| State management | `@reduxjs/toolkit` + RTK Query |
| Forms            | `react-hook-form`              |
| Validation       | `zod`                          |
| Navigation       | `@react-navigation/native` v7  |

### Storage

| Purpose         | Library                 |
| --------------- | ----------------------- |
| Fast key-value  | `react-native-mmkv`     |
| Secure (tokens) | `react-native-keychain` |

### Auth

| Purpose        | Library                                     |
| -------------- | ------------------------------------------- |
| Google Sign In | `@react-native-google-signin/google-signin` |
| OTP auto-read  | `react-native-otp-verify` (Android)         |

### Location

| Purpose   | Library                                       |
| --------- | --------------------------------------------- |
| GPS       | `@react-native-community/geolocation`         |
| Geocoding | `react-native-geocoding` (or Google Maps API) |

### UI / UX

| Purpose        | Library                             |
| -------------- | ----------------------------------- |
| Splash         | `react-native-bootsplash`           |
| Toast          | `react-native-toast-message`        |
| Shimmer        | `react-native-skeleton-placeholder` |
| Icons          | `react-native-vector-icons`         |
| Network status | `@react-native-community/netinfo`   |

### Dev Tools

| Purpose          | Library                       |
| ---------------- | ----------------------------- |
| Pre-commit hooks | `husky` + `lint-staged`       |
| Linting          | ESLint (already configured)   |
| Formatting       | Prettier (already configured) |

---

## 19. Backend API — Status

Auth service runs on **port 3001**. Base path: `/api/v1/auth`.

| #   | Method | Endpoint                  | Status                                                       | Auth |
| --- | ------ | ------------------------- | ------------------------------------------------------------ | ---- |
| 1   | POST   | `/api/v1/auth/register`   | ✅ Ready (real)                                              | No   |
| 2   | POST   | `/api/v1/auth/login`      | ✅ Ready (real)                                              | No   |
| 3   | GET    | `/api/v1/auth/me`         | ✅ Ready (real)                                              | Yes  |
| 4   | PUT    | `/api/v1/auth/profile`    | ✅ Ready (real)                                              | Yes  |
| 5   | POST   | `/api/v1/auth/send-otp`   | ❌ Not built — **MOCK on frontend**                          |
| 6   | POST   | `/api/v1/auth/verify-otp` | ❌ Not built — **MOCK on frontend** (OTP = `1234`)           |
| 7   | POST   | `/api/v1/auth/google`     | ❌ Not built — button shown but disabled / placeholder logic |

### Register Endpoint Details

- Request body: `{ name, email, password, address?, city?, state?, pincode?, lat?, lng? }`
- Frontend sends: name, email, password, address, city, state, pincode, lat, lng
- Frontend **never sends** `role` or `phone` (phone added later via PUT /profile)
- Response: HTTP 201 with `{ user }` — **no token returned**
- Error 409 if email already exists

### Login Endpoint Details

- Request body: `{ email, password }`
- Response: HTTP 200 with `{ user, token }`
- Error 401 on wrong credentials → message: `"Invalid email or password"` (do not say which one is wrong)

### Profile Update (used after first login to add phone)

- Request body: `{ phone, location_address?, location_city?, location_state?, location_pincode?, lat?, lng?, name?, interests? }`
- All fields optional — send only what changed
- Used to attach phone number after OTP verification

### Get Current User (`GET /auth/me`)

- Used on **app launch** to validate token
- 200 → user logged in, navigate to Home
- 401 → token invalid/expired, clear storage, navigate to Login
- Network error → use cached user from MMKV (offline mode), still go Home

### Token Format

- JWT, sent in header: `Authorization: Bearer <token>`
- Stored in **Keychain** (not MMKV)
- Auto-attached to every authenticated request via axios/RTK Query interceptor

### Mock Strategy

- **Mock only** OTP send + verify + Google flow on frontend
- All other APIs hit the real backend
- When OTP backend is ready, mock layer is removed by toggling a single flag (`USE_MOCK_OTP=false`)
- Mock layer must mimic real API response shape so screens never need to change

### Google Sign In — v1 Behavior

- Button is **visible** on the Welcome screen
- Tapping it currently triggers a placeholder action (e.g., disabled state, tooltip "Coming soon", or mock login)
- Logic is built such that wiring the real Google flow only requires:
  1. Add real `GoogleSignin.signIn()` call
  2. Add new RTK Query endpoint hitting `/auth/google`
  3. No changes to navigation, slices, or other screens

---

## 20. Pre-Commit Hooks

| Aspect       | Decision                                |
| ------------ | --------------------------------------- |
| **Required** | Yes                                     |
| **Library**  | `husky` + `lint-staged`                 |
| **Checks**   | ESLint + Prettier (TypeScript optional) |
| **Behavior** | Bad code blocked from being committed   |

### Setup

```
.husky/pre-commit:
  npx lint-staged

package.json:
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
```

---

## 21. App Identity

| Aspect              | Decision                                                                                |
| ------------------- | --------------------------------------------------------------------------------------- |
| **App Name**        | OneTap365                                                                               |
| **Android Package** | `com.onetap365.consumer`                                                                |
| **iOS Bundle ID**   | `com.onetap365.consumer`                                                                |
| **Logo**            | Provided as `img.png` by user — used for splash + app icon                              |
| **App Icons**       | Generated from `img.png` for all required sizes (Android adaptive + iOS multiple sizes) |

---

## 22. Brand Colors — LOCKED

Dark green theme — premium, fintech-style look matches the marketplace + investment positioning.

| Token           | Color                      | Usage                            |
| --------------- | -------------------------- | -------------------------------- |
| `primary`       | `#2BB32A`                  | Buttons, CTAs, active states     |
| `background`    | `#0F2317`                  | Screen background                |
| `card`          | `#132A1C`                  | Card / surface background        |
| `textPrimary`   | `#FFFFFF`                  | Primary text                     |
| `textSecondary` | `rgba(255, 255, 255, 0.7)` | Secondary text                   |
| `success`       | `#10B981`                  | Valid input, success messages    |
| `error`         | `#EF4444`                  | Invalid input, error messages    |
| `warning`       | `#F59E0B`                  | Warnings                         |
| `border`        | `rgba(255, 255, 255, 0.2)` | Default input border             |
| `borderFocus`   | `#2BB32A`                  | Input border when focused        |
| `borderError`   | `#EF4444`                  | Input border on validation error |
| `borderSuccess` | `#10B981`                  | Input border on validation pass  |

These are implemented in [src/theme/colors.ts](../src/theme/colors.ts).

---

## 23. Skipped from v1 (For Later)

| Feature                      | Decision                    |
| ---------------------------- | --------------------------- |
| Dark mode                    | Skip v1                     |
| Multi-language (Hindi etc.)  | Skip v1 — English only      |
| Push notifications           | Pending — recommend skip v1 |
| Forgot password (functional) | Defer to v2                 |
| Change password (functional) | Defer to v2                 |

---

## 24. Folder Structure (Implemented)

```
src/
├── api/           → RTK Query endpoints (8 files)
├── app/           → App.tsx, store.ts
├── assets/        → fonts/, icons/, images/
├── components/    → auth/, bidding/, chat/, common/, marketplace/, services/
├── config/        → constants.ts, env.ts
├── hooks/         → useAppDispatch, useAppSelector, useDebounce, useLocation
├── localization/  → i18n.ts + en.json, hi.json
├── navigation/    → RootNavigator, AuthNavigator, MainNavigator
├── screens/       → auth/, bidding/, chat/, home/, marketplace/, profile/, search/, services/, wallet/
├── services/      → analytics, notifications, secureStorage, storage
├── store/         → authSlice, walletSlice, cartSlice, locationSlice
├── theme/         → colors, typography, spacing, index
├── types/         → 9 type files
└── utils/         → formatters, permissions, validators
```

### Path Aliases

Configured in `tsconfig.json`:

```ts
import { Button } from '@/components/common/Button';
import { User } from '@/types';
import { useSendOtpMutation } from '@/api/authApi';
```

---

## 25. Environment & Distribution — LOCKED

### Strategy

Three environments. Build-time flag determines which `.env` file is loaded.

| Environment     | When Used                   | API URL Source                                                  |
| --------------- | --------------------------- | --------------------------------------------------------------- |
| **development** | Daily local development     | PC's local IP via WiFi (e.g., `http://192.168.1.5:3001/api/v1`) |
| **staging**     | Reserved (not active in v1) | TBD (e.g., ngrok / staging server)                              |
| **production**  | Real launch                 | Cloud-deployed backend URL (TBD before launch)                  |

### Library

`react-native-config` — injects environment variables at build time.

### Env Files

```env
# .env.development
API_URL=http://192.168.1.5:3001/api/v1
USE_MOCK_OTP=true
ENV=development
```

```env
# .env.production
API_URL=https://api.onetap365.com/api/v1
USE_MOCK_OTP=false
ENV=production
```

### Build Commands

```bash
# Development (default)
npm run start
npm run android    # uses .env.development

# Production build
ENVFILE=.env.production npm run android
# or via package.json scripts:
npm run android:prod
```

### Current Development Setup

- Backend runs on PC, port 3001
- Phone (real device) and PC are on **same WiFi**
- App connects to PC's local IP
- WiFi router restart can change PC's IP — recommend setting a **static IP** for the PC in router settings

### Android Cleartext HTTP

Required for development since backend is `http://`:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application android:usesCleartextTraffic="true" ...>
```

To be **removed** before production (HTTPS will be used).

### Production Migration Plan

Before production launch:

1. Deploy backend to cloud (Railway / Render / AWS / DigitalOcean)
2. Set `API_URL` in `.env.production` to cloud URL
3. Enable HTTPS, remove `usesCleartextTraffic`
4. Build with `npm run android:prod`
5. Sign and distribute APK / upload to Play Store

### APK Distribution to Testers (Current Phase)

Since the dev backend runs on the PC, testers can only use the APK while connected to the same WiFi as the PC. For broader testing later, switch to a deployed backend URL.

---

## 26. Implementation Phases (Planned)

Once all decisions are locked:

### Phase 1 — Setup (10 min)

- Install dependencies
- Configure babel for path aliases
- Setup Redux store + RTK Query base
- Setup MMKV + Keychain
- Mock layer for OTP

### Phase 2 — Theme + Common Components (15 min)

- `theme/colors.ts`, typography, spacing
- `Button`, `Input` (with validation states), `Screen`, `Loader`, `Toast`
- Shimmer skeleton component

### Phase 3 — Splash + Onboarding (15 min)

- Native splash setup (bootsplash)
- JS splash component
- Token check logic
- Onboarding slides (4 slides)

### Phase 4 — Sign Up Flow (25 min)

- Welcome screen
- Multi-step form: Name → Email → Password
- Validation schemas (Zod)
- API integration (real)

### Phase 5 — Login + OTP Flow (30 min)

- Login screen: Email + Password
- Location capture (with permission flow)
- Phone screen
- OTP screen (with timer + auto-read)
- Mock OTP verification
- Real login API call after OTP success

### Phase 6 — Home + Wire Everything (15 min)

- Basic Home screen (placeholder)
- Profile screen with logout + Forgot/Change password UI
- AuthNavigator + MainNavigator
- RootNavigator with auth check
- App.tsx with all providers

### Phase 7 — Polish (10 min)

- Pre-commit hooks setup
- Error boundary
- Offline detection banner
- Final QA

**Total: ~2 hours** of focused implementation.

---

## 27. Edge Cases — Industry Standard

Confirmed edge cases that must be handled during implementation. Each item lists the trigger and the required behaviour.

### 27.1 Splash Screen

| #   | Edge Case                           | Behaviour                                                     |
| --- | ----------------------------------- | ------------------------------------------------------------- |
| 1   | App was in background, user reopens | Skip splash, go directly to current screen / Home             |
| 2   | Token is expired                    | After splash, route to Login                                  |
| 3   | Splash too short (< 1.5s)           | Enforce **1.5s minimum** so users don't think the app crashed |

### 27.2 Sign Up

| #   | Edge Case                                | Behaviour                                                                       |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Email already registered                 | Server returns `"email already exists"` → show error toast with backend message |
| 2   | Slow network                             | Show button spinner + disable button until response                             |
| 3   | User on Step 2 wants to edit Step 1 data | Back button preserves all entered data across steps                             |
| 4   | Password visibility                      | **Show/hide toggle (eye icon) on frontend**                                     |
| 5   | App crash mid-signup                     | Progress is **not saved** — acceptable (user re-enters)                         |

### 27.3 Login

| #   | Edge Case                  | Behaviour                                                                                     |
| --- | -------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Wrong password 5 times     | Temporary block via **backend rate limit** (frontend just shows the message)                  |
| 2   | Invalid phone format       | Step does not advance — inline validation error shown                                         |
| 3   | Location permission denied | **Location is mandatory** — block the flow, redirect user to settings to enable. No fallback. |

### 27.4 OTP

| #   | Edge Case                           | Behaviour                                                                        |
| --- | ----------------------------------- | -------------------------------------------------------------------------------- |
| 1   | App backgrounded while entering OTP | Preserve input state on resume                                                   |
| 2   | App closed mid-timer                | Use **timestamp**, not countdown variable — recalculate remaining time on resume |
| 3   | Wrong OTP 3 times                   | Force a fresh OTP request (clear input, disable verify)                          |
| 4   | Auto-fill from SMS (Android)        | Bonus — implement via `react-native-otp-verify`                                  |
| 5   | User pastes from clipboard          | Allow paste, distribute digits across the 4 input boxes                          |

### 27.5 Validation

| #   | Edge Case                                     | Behaviour                             |
| --- | --------------------------------------------- | ------------------------------------- |
| 1   | User types very fast                          | Debounce validation (300ms)           |
| 2   | User backspaces all chars (touched but empty) | Show "Required" error                 |
| 3   | Email contains spaces                         | Auto-trim before validation           |
| 4   | Phone has `+91` or `91` prefix                | Strip prefix, store as 10 digits only |

### 27.6 Location

| #   | Edge Case                                       | Behaviour                                           |
| --- | ----------------------------------------------- | --------------------------------------------------- |
| 1   | Permission denied permanently (don't ask again) | Show "Open settings" CTA, deep-link to app settings |
| 2   | GPS turned off                                  | Show "Please enable GPS" message with retry         |
| 3   | Indoor / no GPS signal                          | 10-second timeout, then prompt user to retry        |
| 4   | Lat/Lng captured                                | Run reverse geocoding to display city name in UI    |

> **Note:** Location is mandatory at login per Section 13. There is no manual entry option — the user must enable GPS to proceed.

### 27.7 Network

| #   | Edge Case        | Behaviour                                                                      |
| --- | ---------------- | ------------------------------------------------------------------------------ |
| 1   | No internet      | Show toast/banner: "Internet connection check karein" (Instagram-style banner) |
| 2   | API timeout      | Show error toast with **Retry** option                                         |
| 3   | 500 server error | Show toast with backend message or fallback: "Server issue, try later"         |

---

## 28. Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-30 | Initial document — captures all decisions from planning chat                                                                                                                                                                                                                                                                      |
| 2026-04-30 | Added Section 27 — Edge Cases (splash, signup, login, OTP, validation, location, network)                                                                                                                                                                                                                                         |
| 2026-04-30 | Backend analysis applied — signup expanded to 4 steps with location, login order changed to email→password→phone→OTP, real endpoints documented, brand colors locked (dark green theme), environment strategy locked (dev/staging/production with `react-native-config`), logo `img.png` confirmed, role hardening deferred to v2 |
