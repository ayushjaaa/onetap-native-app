import { useAppSelector } from './useAppSelector';

/**
 * The location to use for browsing (Home trending feed, category feeds):
 * the temporary "browsing location" override if one is set (see
 * locationSlice.ts's browsingLocation), otherwise the real GPS location.
 * Never affects the real location used for posting listings / seller
 * address — that's still read directly from state.location elsewhere.
 */
export interface EffectiveLocation {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  hasLocation: boolean;
  isOverride: boolean;
  // The radius (km) to search within — realLocationRadiusKm when browsing
  // the real GPS location, browsingLocationRadiusKm when a browsing-city
  // override is active. These are two independent user preferences (see
  // locationSlice.ts); this hook just picks the one matching current mode.
  radiusKm: number;
}

export const useEffectiveLocation = (): EffectiveLocation => {
  const location = useAppSelector(state => state.location);
  const override = location.browsingLocation;

  const source = override ?? location;
  const hasLocation = source.latitude != null && source.longitude != null;

  return {
    latitude: source.latitude,
    longitude: source.longitude,
    city: source.city,
    state: source.state,
    hasLocation,
    isOverride: override != null,
    radiusKm: override
      ? location.browsingLocationRadiusKm
      : location.realLocationRadiusKm,
  };
};
