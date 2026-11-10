-- Store pickup option at checkout: orders.delivery_method ("delivery" or "pickup")
-- For servers without SSH: import this once in phpMyAdmin (select the database → Import).
-- Equivalent to: php artisan migrate  (migration 2026_11_10_140208_add_delivery_method_to_orders_table)
-- Safe to run more than once.

SET @column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'delivery_method'
);

SET @add_column := IF(@column_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `delivery_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''delivery'' AFTER `shipping_postal_code`',
  'SELECT 1'
);

PREPARE add_column_statement FROM @add_column;
EXECUTE add_column_statement;
DEALLOCATE PREPARE add_column_statement;

-- Mark the Laravel migration as run so a later `php artisan migrate` skips it
INSERT INTO `migrations` (`migration`, `batch`)
SELECT next_run.migration, next_run.batch FROM (
  SELECT '2026_11_10_140208_add_delivery_method_to_orders_table' AS migration, COALESCE(MAX(`batch`), 0) + 1 AS batch FROM `migrations`
) AS next_run
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE `migration` = '2026_11_10_140208_add_delivery_method_to_orders_table');
