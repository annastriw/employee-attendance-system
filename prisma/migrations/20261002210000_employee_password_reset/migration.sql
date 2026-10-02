-- CreateTable
CREATE TABLE `auth_password_resets` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NOT NULL,
    `payload_hash` CHAR(64) NOT NULL,
    `claimed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auth_password_resets_account_id_created_at_idx`(`account_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_password_resets` ADD CONSTRAINT `auth_password_resets_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `auth_accounts`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
