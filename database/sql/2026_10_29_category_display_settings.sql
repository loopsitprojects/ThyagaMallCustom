-- Category display settings (Admin -> Categories)
-- For servers without SSH: import ONCE in phpMyAdmin (select the database -> Import).
-- Equivalent to: php artisan migrate  (migration 2026_10_29_054429_add_display_settings_to_categories_table)
-- Skip this file if that migration already ran (the ALTER TABLE would fail on existing columns).

ALTER TABLE `categories`
  ADD COLUMN `subtitle` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `description`,
  ADD COLUMN `color_from` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `subtitle`,
  ADD COLUMN `color_to` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `color_from`,
  ADD COLUMN `show_in_menu` tinyint(1) NOT NULL DEFAULT 0 AFTER `is_featured`;

-- Previous storefront look, only filling blanks so existing admin edits are kept
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Sofa'), `color_from` = '#2dd4bf', `color_to` = '#0d9488', `subtitle` = 'Make it a Home', `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80'), `show_in_menu` = 1 WHERE `slug` = 'home';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 2, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Laptop'), `color_from` = '#60a5fa', `color_to` = '#2563eb', `subtitle` = 'Latest Gadgets', `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'), `show_in_menu` = 1 WHERE `slug` = 'electronics';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 3, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Sparkles'), `color_from` = '#f9a8d4', `color_to` = '#db2777', `subtitle` = 'Feel Your Best', `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80'), `show_in_menu` = 1 WHERE `slug` = 'beauty';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 4, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Shirt'), `color_from` = '#c084fc', `color_to` = '#7c3aed', `subtitle` = 'Trendy Styles', `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=400&q=80'), `show_in_menu` = 1 WHERE `slug` = 'fashion';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 5, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'ToyBrick'), `color_from` = '#fcd34d', `color_to` = '#f59e0b', `subtitle` = 'Play & Learn', `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?auto=format&fit=crop&w=400&q=80'), `show_in_menu` = 0 WHERE `slug` = 'toys';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 6, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'ShoppingBasket'), `color_from` = '#4ade80', `color_to` = '#16a34a', `subtitle` = 'Daily Essentials', `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'), `show_in_menu` = 1 WHERE `slug` = 'food';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 7, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Gamepad2'), `color_from` = '#818cf8', `color_to` = '#4338ca', `subtitle` = 'Play More', `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=400&q=80'), `show_in_menu` = 0 WHERE `slug` = 'gaming';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 8, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Gift'), `color_from` = '#fb923c', `color_to` = '#c2410c', `subtitle` = 'For Every Occasion', `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80'), `show_in_menu` = 0 WHERE `slug` = 'gifts';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 9, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'HeartPulse'), `color_from` = '#fb7185', `color_to` = '#e11d48', `subtitle` = 'Live Well', `show_in_menu` = 0 WHERE `slug` = 'wellness';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 10, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Dumbbell'), `color_from` = '#a78bfa', `color_to` = '#36135d', `subtitle` = 'Fuel Your Fitness', `show_in_menu` = 0 WHERE `slug` = 'sports-nutrition';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'CookingPot'), `show_in_menu` = 0 WHERE `slug` = 'kitchen';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 2, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Lamp'), `show_in_menu` = 0 WHERE `slug` = 'living';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Headphones'), `show_in_menu` = 0 WHERE `slug` = 'accessories-electronics';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 2, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Refrigerator'), `show_in_menu` = 0 WHERE `slug` = 'appliances';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'SprayCan'), `show_in_menu` = 0 WHERE `slug` = 'perfumes';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 2, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Droplet'), `show_in_menu` = 0 WHERE `slug` = 'personalcare';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Footprints'), `show_in_menu` = 0 WHERE `slug` = 'footwear';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 2, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Glasses'), `show_in_menu` = 0 WHERE `slug` = 'lifestyle';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'BookOpen'), `show_in_menu` = 0 WHERE `slug` = 'books';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 2, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Clapperboard'), `show_in_menu` = 0 WHERE `slug` = 'entertainment';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Candy'), `show_in_menu` = 0 WHERE `slug` = 'confectionery';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 2, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'CupSoda'), `show_in_menu` = 0 WHERE `slug` = 'beverages';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Gamepad'), `show_in_menu` = 0 WHERE `slug` = 'playstation';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 2, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Joystick'), `show_in_menu` = 0 WHERE `slug` = 'nintendo';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Disc'), `show_in_menu` = 0 WHERE `slug` = 'ps5-games';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 2, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Disc'), `show_in_menu` = 0 WHERE `slug` = 'ps4-games';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Package'), `show_in_menu` = 0 WHERE `slug` = 'hamper';
UPDATE `categories` SET `sort_order` = IF(`sort_order` = 0, 1, `sort_order`), `icon` = COALESCE(NULLIF(`icon`, ''), 'Pill'), `show_in_menu` = 0 WHERE `slug` = 'sports-supplements';

-- Mark the Laravel migration as run so a later `php artisan migrate` skips it
INSERT INTO `migrations` (`migration`, `batch`)
SELECT next_run.migration, next_run.batch FROM (
  SELECT '2026_10_29_054429_add_display_settings_to_categories_table' AS migration, COALESCE(MAX(`batch`), 0) + 1 AS batch FROM `migrations`
) AS next_run
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE `migration` = '2026_10_29_054429_add_display_settings_to_categories_table');
