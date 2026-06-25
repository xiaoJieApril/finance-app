import {
  BookOpen,
  Car,
  Coffee,
  Gamepad2,
  Heart,
  LayoutGrid,
  Monitor,
  Plane,
  ShoppingBag,
  Utensils,
  Wallet,
} from 'lucide-react-native';

export const CATEGORY_ICONS = [
  { id: 'utensils', component: Utensils },
  { id: 'heart', component: Heart },
  { id: 'book', component: BookOpen },
  { id: 'car', component: Car },
  { id: 'wallet', component: Wallet },
  { id: 'gamepad', component: Gamepad2 },
  { id: 'shopping', component: ShoppingBag },
  { id: 'coffee', component: Coffee },
  { id: 'plane', component: Plane },
  { id: 'monitor', component: Monitor },
] as const;

export const DEFAULT_CATEGORY_ICON = 'utensils';

export function renderCategoryIcon(iconId?: string | null, size = 22, color = '#64748b') {
  const target = CATEGORY_ICONS.find((item) => item.id === iconId);
  const IconComponent = target?.component ?? LayoutGrid;

  return <IconComponent size={size} color={color} />;
}
