# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`oneTapReactNative` — the OneTap365 mobile app (iOS + Android), React Native 0.85 / React 19 / TypeScript. Talks to the OneTap backend (see the sibling `onetap-backend` repo) via RTK Query.

## Commands

```bash
npm start                            # Metro bundler
npm run android                      # dev build, .env.development
npm run ios                          # dev build, .env.development
npm run android:staging              # release build, .env.staging
npm run android:prod                 # release build, .env.production
npm run ios:prod                     # release build, .env.production

npm run lint                         # ESLint
npm run format                       # Prettier
npm test                             # Jest
npm test -- --testPathPattern=MyFile # single test file
```

iOS first-time / after any native dependency change:
```bash
bundle install
bundle exec pod install
```

`prepare` (husky) runs on `npm install` and wires a pre-commit hook that runs `lint-staged` (eslint --fix + prettier on staged files).

## Environment

Env files `.env.development` / `.env.staging` / `.env.production` are read via `react-native-config`, selected by the `ENVFILE=` prefix baked into each npm script. Not checked into the repo — create them locally. Accessed in code only through `src/config/env.ts`, never `react-native-config` directly.

Key vars: `API_URL`, `ENV`, `USE_MOCK_OTP`, `GOOGLE_WEB_CLIENT_ID`. If `API_URL` is unset, `env.ts` falls back to `http://10.0.2.2:3001/api/v1` on Android / `http://localhost:3001/api/v1` on iOS — i.e. the auth-service port directly, not the gateway (:3000). Check this against the backend's actual routing before assuming which one dev builds hit.

## Path aliases

`@/` → `src/`, via `babel-plugin-module-resolver` in `babel.config.js`.

```ts
import { Button } from '@/components/common/Button';
import { useSendOtpMutation } from '@/api/authApi';
```

## Layered architecture

The codebase enforces one-directional data flow through 6 layers (documented in full in `docs/IMPLEMENTATION_PLAN.md`). The rule that matters day to day: **screens never call APIs or storage directly.**

```
screens/       UI only — reads state via hooks, dispatches actions
hooks/         bridges UI ↔ logic (custom hooks + RTK Query auto-generated hooks)
store/ + api/  state — Redux slices (client state) / RTK Query (server state + cache)
api/           server communication — endpoint definitions, all built on baseApi
services/      infrastructure — MMKV/Keychain storage, permissions, native modules
utils/         pure functions, no side effects
```

Concretely: **server data → RTK Query (`src/api/`); client-only data → Redux slice (`src/store/`).**

- `src/api/baseApi.ts` is the single RTK Query instance (`fetchBaseQuery`, attaches bearer token from `secureStorage`, 15s timeout). Every feature API injects into it: `authApi.ts`, `biddingApi.ts`, `chatApi.ts`, `productsApi.ts`, `servicesApi.ts`, `userApi.ts`, `walletApi.ts` — via `baseApi.injectEndpoints({ endpoints: ... })`.
- `src/app/store.ts` wires `authErrorMiddleware`: any RTK Query 401 clears the Keychain token and dispatches `logout()` globally — no per-endpoint 401 handling needed. **Note:** only `authSlice` and `locationSlice` are currently mounted in the store; `cartSlice` and `walletSlice` exist as slice files under `src/store/` but aren't wired into the root reducer yet.
- **Token storage:** `react-native-keychain` via `src/services/secureStorage.ts` (auth token only). `react-native-mmkv` via `src/services/storage.ts` for everything else non-sensitive (user object, onboarding flag).

## Navigation

`RootNavigator` (`src/navigation/RootNavigator.tsx`) is the top-level decision tree, in order:
1. Bootstrap not done or Redux not hydrated → `SplashScreen`
2. First launch (`!hasOnboarded`) → `OnboardingScreen`
3. Not logged in → `AuthNavigator`
4. Logged in → `MainNavigator`

`AuthNavigator` wraps its routes in `SignupProvider` (`src/screens/auth/signup/SignupContext.tsx`). The 4-step signup flow (`SignUpStep1NameScreen` → `...Step4LocationScreen`) accumulates fields into that context and fires a single POST on the last step — don't make earlier steps call the API individually.

## Localization

`src/localization/i18n.ts` + `locales/en.json` / `hi.json` (i18next). Add new UI strings to both locale files, not inline.
