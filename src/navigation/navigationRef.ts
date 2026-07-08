import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainStackParamList } from '@/types/navigation.types';

// Lets code outside the component tree (the notification-toast poller, which
// runs from a hook mounted once near the root, not from a specific screen)
// navigate without needing a `navigation` prop.
export const navigationRef = createNavigationContainerRef<MainStackParamList>();

export function navigateFromOutsideScreen<
  RouteName extends keyof MainStackParamList,
>(name: RouteName, params: MainStackParamList[RouteName]): void {
  if (navigationRef.isReady()) {
    // react-navigation's overloaded `.navigate()` signature doesn't resolve cleanly
    // through a generic RouteName here — the exported function signature above is
    // what keeps call sites type-safe, this cast is just for the pass-through call.
    (navigationRef.navigate as (name: string, params: unknown) => void)(
      name,
      params,
    );
  }
}
