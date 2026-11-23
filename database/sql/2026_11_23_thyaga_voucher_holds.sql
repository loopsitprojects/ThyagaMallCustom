-- Thyāga gift voucher holds (restored after a checkout refresh; released automatically when unused)
-- For servers without SSH: import this once in phpMyAdmin (select the database → Import).
-- Equivalent to: php artisan migrate  (migration 2026_11_23_114320_create_thyaga_voucher_holds_table)

CREATE TABLE IF NOT EXISTS `thyaga_voucher_holds` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `redemption_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `voucher_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'held',
  `order_id` bigint unsigned DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `released_at` timestamp NULL DEFAULT NULL,
  `release_attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `thyaga_voucher_holds_redemption_id_unique` (`redemption_id`),
  KEY `thyaga_voucher_holds_status_expires_at_index` (`status`, `expires_at`),
  KEY `thyaga_voucher_holds_order_id_foreign` (`order_id`),
  CONSTRAINT `thyaga_voucher_holds_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mark the Laravel migration as run so a later `php artisan migrate` skips it
INSERT INTO `migrations` (`migration`, `batch`)
SELECT next_run.migration, next_run.batch FROM (
  SELECT '2026_11_23_114320_create_thyaga_voucher_holds_table' AS migration, COALESCE(MAX(`batch`), 0) + 1 AS batch FROM `migrations`
) AS next_run
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE `migration` = '2026_11_23_114320_create_thyaga_voucher_holds_table');
