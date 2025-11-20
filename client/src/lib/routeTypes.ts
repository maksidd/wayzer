import type { TFunction, i18n as I18nInstance } from "i18next";
import type { LucideIcon } from "lucide-react";
import {
  Bike,
  Car,
  Circle,
  CircleDot,
  Landmark,
  Mountain,
  PartyPopper,
  PersonStanding,
  Plane,
  Ship,
  Squirrel,
  Train,
  TreePine,
  Users,
  Utensils,
  Wind,
  Flower2,
} from "lucide-react";

export const ROUTE_TYPES_NAMESPACE = "pages:trips.routeTypes";
const FALLBACK_ALIAS = "other";

export const transportIcons: Record<string, LucideIcon> = {
  car: Car,
  plane: Plane,
  bike: Bike,
  walk: PersonStanding,
  scooter: Bike,
  monowheel: CircleDot,
  motorcycle: Wind,
  public_transport: Train,
  train: Train,
  boat: Ship,
  sea: Ship,
  mountains: Mountain,
  sights: Landmark,
  fest: Users,
  picnic: Utensils,
  camping: TreePine,
  party: PartyPopper,
  retreat: Flower2,
  pets: Squirrel,
  other: Circle,
};

export const getRouteTypeIcon = (alias?: string | null): LucideIcon => {
  if (alias && transportIcons[alias]) {
    return transportIcons[alias];
  }
  return transportIcons[FALLBACK_ALIAS];
};

export const resolveRouteTypeName = (
  alias: string | null | undefined,
  t: TFunction,
  i18n: I18nInstance,
) => {
  const safeAlias = alias || FALLBACK_ALIAS;
  const nameKey = `${ROUTE_TYPES_NAMESPACE}.${safeAlias}.name`;
  if (i18n.exists(nameKey)) {
    return t(nameKey);
  }
  const fallbackKey = `${ROUTE_TYPES_NAMESPACE}.${FALLBACK_ALIAS}.name`;
  if (i18n.exists(fallbackKey)) {
    return t(fallbackKey);
  }
  return safeAlias;
};

export const resolveRouteTypeDescription = (
  alias: string | null | undefined,
  t: TFunction,
  i18n: I18nInstance,
) => {
  const safeAlias = alias || FALLBACK_ALIAS;
  const descriptionKey = `${ROUTE_TYPES_NAMESPACE}.${safeAlias}.description`;
  if (i18n.exists(descriptionKey)) {
    return t(descriptionKey);
  }
  return resolveRouteTypeName(safeAlias, t, i18n);
};

