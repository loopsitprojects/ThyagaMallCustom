-- Homepage Trending / Best Sellers product picks (Admin → Homepage Sections)
-- For servers without SSH: import this once in phpMyAdmin (select the database → Import).
-- Equivalent to: php artisan migrate  (migration 2026_11_09_095843_create_home_section_products_table)

CREATE TABLE IF NOT EXISTS `home_section_products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `section` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `home_section_products_section_product_id_unique` (`section`, `product_id`),
  KEY `home_section_products_product_id_foreign` (`product_id`),
  CONSTRAINT `home_section_products_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mark the Laravel migration as run so a later `php artisan migrate` skips it
INSERT INTO `migrations` (`migration`, `batch`)
SELECT next_run.migration, next_run.batch FROM (
  SELECT '2026_11_09_095843_create_home_section_products_table' AS migration, COALESCE(MAX(`batch`), 0) + 1 AS batch FROM `migrations`
) AS next_run
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE `migration` = '2026_11_09_095843_create_home_section_products_table');
