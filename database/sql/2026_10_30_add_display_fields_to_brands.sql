-- =====================================================================
-- Thyaga Mall: Brands Management & Top Brands You Love Carousel Fields
-- Date: 2026-10-30
-- Description: Adds website_url, description, sort_order, and is_active to `brands`.
-- =====================================================================

ALTER TABLE `brands`
    ADD COLUMN `website_url` VARCHAR(255) NULL AFTER `logo`,
    ADD COLUMN `description` TEXT NULL AFTER `website_url`,
    ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `is_featured`,
    ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `sort_order`;

-- Seed / update top brands for homepage carousel
INSERT INTO `brands` (`name`, `slug`, `logo`, `website_url`, `description`, `is_featured`, `sort_order`, `is_active`, `created_at`, `updated_at`)
VALUES
    ('Samsung', 'samsung', NULL, NULL, 'Electronics, smartphones & displays', 1, 1, 1, NOW(), NOW()),
    ('Apple', 'apple', NULL, NULL, 'iPhones, iPads, MacBooks & accessories', 1, 2, 1, NOW(), NOW()),
    ('HP', 'hp', NULL, NULL, 'Laptops, printers & computing essentials', 1, 3, 1, NOW(), NOW()),
    ('Xiaomi', 'mi', NULL, NULL, 'Smartphones, wearables & smart home', 1, 4, 1, NOW(), NOW()),
    ('Lenovo', 'lenovo', NULL, NULL, 'Laptops, PCs, tablets & monitors', 1, 5, 1, NOW(), NOW()),
    ('Nike', 'nike', NULL, NULL, 'Sportswear, sneakers & athletic apparel', 1, 6, 1, NOW(), NOW()),
    ('Adidas', 'adidas', NULL, NULL, 'Original athletic wear & lifestyle shoes', 1, 7, 1, NOW(), NOW()),
    ('Tefal', 'tefal', NULL, NULL, 'Non-stick cookware & small kitchen appliances', 1, 8, 1, NOW(), NOW()),
    ('Philips', 'philips', NULL, NULL, 'Personal care, grooming & kitchen appliances', 1, 9, 1, NOW(), NOW()),
    ('LEGO', 'lego', NULL, NULL, 'Creative building brick sets for all ages', 1, 10, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    `is_featured` = VALUES(`is_featured`),
    `sort_order` = VALUES(`sort_order`),
    `is_active` = VALUES(`is_active`),
    `updated_at` = NOW();

