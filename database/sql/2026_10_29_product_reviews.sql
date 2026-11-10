-- Customer product reviews (Admin -> Reviews)
-- For servers without SSH: import ONCE in phpMyAdmin (select the database -> Import).
-- Equivalent to: php artisan migrate  (migration 2026_10_29_061252_add_customer_fields_to_reviews_table)
-- Skip this file if that migration already ran (the ALTER TABLE would fail on existing columns).

ALTER TABLE `reviews`
  ADD COLUMN `user_id` bigint unsigned NULL AFTER `product_id`,
  ADD COLUMN `title` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `rating`,
  ADD COLUMN `is_verified_purchase` tinyint(1) NOT NULL DEFAULT 0 AFTER `is_approved`,
  ADD CONSTRAINT `reviews_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD UNIQUE KEY `reviews_product_id_user_id_unique` (`product_id`, `user_id`);

-- New products start unrated; ratings now come only from approved customer reviews
ALTER TABLE `products` MODIFY `rating_avg` decimal(3,2) NOT NULL DEFAULT 0.00;

-- The previous ratings were placeholder seed values with no reviews behind them
UPDATE `products` SET `rating_avg` = 0, `reviews_count` = 0;

-- Mark the Laravel migration as run so a later `php artisan migrate` skips it
INSERT INTO `migrations` (`migration`, `batch`)
SELECT next_run.migration, next_run.batch FROM (
  SELECT '2026_10_29_061252_add_customer_fields_to_reviews_table' AS migration, COALESCE(MAX(`batch`), 0) + 1 AS batch FROM `migrations`
) AS next_run
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE `migration` = '2026_10_29_061252_add_customer_fields_to_reviews_table');
