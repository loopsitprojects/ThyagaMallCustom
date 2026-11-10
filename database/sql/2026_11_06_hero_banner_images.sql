-- Homepage hero: 3D banner / image carousel switch + carousel images (Admin → Hero Slides)
-- For servers without SSH: import this once in phpMyAdmin (select the database → Import).
-- Equivalent to: php artisan migrate  (migration 2026_11_06_093748_create_site_settings_and_hero_banner_images_tables)

CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `site_settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hero_banner_images` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `image_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alt_text` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtitle` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cta_text` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mark the Laravel migration as run so a later `php artisan migrate` skips it
INSERT INTO `migrations` (`migration`, `batch`)
SELECT next_run.migration, next_run.batch FROM (
  SELECT '2026_11_06_093748_create_site_settings_and_hero_banner_images_tables' AS migration, COALESCE(MAX(`batch`), 0) + 1 AS batch FROM `migrations`
) AS next_run
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE `migration` = '2026_11_06_093748_create_site_settings_and_hero_banner_images_tables');
