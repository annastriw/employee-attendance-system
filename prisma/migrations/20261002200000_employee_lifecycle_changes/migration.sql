-- CreateTable
CREATE TABLE `emp_lifecycle_changes` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NOT NULL,
    `expected_status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL,
    `target_status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL,
    `payload_hash` CHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `next_attempt_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lease_until` DATETIME(3) NULL,
    `lease_token` CHAR(36) NULL,
    `error_code` VARCHAR(40) NULL,
    `request_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `emp_lifecycle_changes_status_next_attempt_at_lease_until_idx`(`status`, `next_attempt_at`, `lease_until`),
    INDEX `emp_lifecycle_changes_employee_id_created_at_idx`(`employee_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `emp_lifecycle_changes` ADD CONSTRAINT `emp_lifecycle_changes_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `emp_employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
