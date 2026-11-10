import React from 'react';
import {
  ShoppingBag, Tag, BadgePercent, Star, Store, Home, Sofa, Lamp, CookingPot, Utensils,
  Refrigerator, Laptop, Smartphone, Tablet, Monitor, Tv, Headphones, Speaker, Camera, Printer,
  Watch, Sparkles, SprayCan, Droplet, Brush, Scissors, Flower2, Gem, Crown, Shirt,
  Footprints, Glasses, Backpack, Briefcase, ToyBrick, Puzzle, Baby, BookOpen, Clapperboard, Music,
  Palette, Ticket, PartyPopper, ShoppingBasket, Apple, Coffee, CupSoda, Candy, Cake, Pizza,
  Wine, Gamepad2, Gamepad, Joystick, Disc, Gift, Package, HeartPulse, Pill, Leaf,
  Dumbbell, Bike, Car, Wrench, Plane, Dog,
  type LucideIcon, type LucideProps,
} from 'lucide-react';

// Icons an admin can assign to a category. Keep in sync with config/categories.php ('icons').
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  ShoppingBag, Tag, BadgePercent, Star, Store, Home, Sofa, Lamp, CookingPot, Utensils,
  Refrigerator, Laptop, Smartphone, Tablet, Monitor, Tv, Headphones, Speaker, Camera, Printer,
  Watch, Sparkles, SprayCan, Droplet, Brush, Scissors, Flower2, Gem, Crown, Shirt,
  Footprints, Glasses, Backpack, Briefcase, ToyBrick, Puzzle, Baby, BookOpen, Clapperboard, Music,
  Palette, Ticket, PartyPopper, ShoppingBasket, Apple, Coffee, CupSoda, Candy, Cake, Pizza,
  Wine, Gamepad2, Gamepad, Joystick, Disc, Gift, Package, HeartPulse, Pill, Leaf,
  Dumbbell, Bike, Car, Wrench, Plane, Dog,
};

interface CategoryIconProps extends Omit<LucideProps, 'name'> {
  icon?: string | null;
}

/** Renders a category's stored icon name, or a shopping bag when none/unknown. */
export default function CategoryIcon({ icon, ...props }: CategoryIconProps) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || ShoppingBag;
  return <Icon {...props} />;
}
