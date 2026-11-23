-- Adds the mall.thyaga.lk main categories this store is missing: Gift, Wellness, Gifts, Sports Nutrition, Sports and Gaming
-- For servers without SSH: import in phpMyAdmin (select the database → Import). Safe to run more than once.
-- Equivalent to: php artisan db:seed --class=ThyagaCategorySeeder
-- Existing categories keep their admin edits: only a missing image is filled in and the category is switched on.

INSERT INTO `categories` (`parent_id`, `name`, `slug`, `image`, `icon`, `description`, `subtitle`, `color_from`, `color_to`, `sort_order`, `is_featured`, `show_in_menu`, `is_active`, `created_at`, `updated_at`)
SELECT NULL, 'Gift', 'gift', 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=400&q=80', 'Gift', NULL, 'Wrapped With Love', '#f472b6', '#9d174d', 7, 0, 0, 1, NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'gift');
UPDATE `categories` SET `is_active` = 1, `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=400&q=80') WHERE `slug` = 'gift';

INSERT INTO `categories` (`parent_id`, `name`, `slug`, `image`, `icon`, `description`, `subtitle`, `color_from`, `color_to`, `sort_order`, `is_featured`, `show_in_menu`, `is_active`, `created_at`, `updated_at`)
SELECT NULL, 'Wellness', 'wellness', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80', 'HeartPulse', NULL, 'Live Well', '#fb7185', '#e11d48', 8, 0, 0, 1, NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'wellness');
UPDATE `categories` SET `is_active` = 1, `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80') WHERE `slug` = 'wellness';

INSERT INTO `categories` (`parent_id`, `name`, `slug`, `image`, `icon`, `description`, `subtitle`, `color_from`, `color_to`, `sort_order`, `is_featured`, `show_in_menu`, `is_active`, `created_at`, `updated_at`)
SELECT NULL, 'Gifts', 'gifts', 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=400&q=80', 'PartyPopper', NULL, 'For Every Occasion', '#fb923c', '#c2410c', 9, 0, 0, 1, NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'gifts');
UPDATE `categories` SET `is_active` = 1, `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=400&q=80') WHERE `slug` = 'gifts';

INSERT INTO `categories` (`parent_id`, `name`, `slug`, `image`, `icon`, `description`, `subtitle`, `color_from`, `color_to`, `sort_order`, `is_featured`, `show_in_menu`, `is_active`, `created_at`, `updated_at`)
SELECT NULL, 'Sports Nutrition', 'sports-nutrition', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=400&q=80', 'Dumbbell', NULL, 'Fuel Your Fitness', '#a78bfa', '#36135d', 10, 0, 0, 1, NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'sports-nutrition');
UPDATE `categories` SET `is_active` = 1, `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=400&q=80') WHERE `slug` = 'sports-nutrition';

INSERT INTO `categories` (`parent_id`, `name`, `slug`, `image`, `icon`, `description`, `subtitle`, `color_from`, `color_to`, `sort_order`, `is_featured`, `show_in_menu`, `is_active`, `created_at`, `updated_at`)
SELECT NULL, 'Sports and Gaming', 'sports-and-gaming', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', 'Gamepad2', NULL, 'Play More', '#818cf8', '#4338ca', 11, 0, 0, 1, NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `slug` = 'sports-and-gaming');
UPDATE `categories` SET `is_active` = 1, `image` = COALESCE(NULLIF(`image`, ''), 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80') WHERE `slug` = 'sports-and-gaming';
