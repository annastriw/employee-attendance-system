-- AlterTable
ALTER TABLE `emp_employees` ADD COLUMN `account_email` VARCHAR(254) NULL;

-- CreateTable
CREATE TABLE `emp_employee_history` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `before` JSON NOT NULL,
    `after` JSON NOT NULL,
    `request_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `emp_employee_history_employee_id_created_at_idx`(`employee_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emp_email_changes` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NOT NULL,
    `expected_email` VARCHAR(254) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
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

    INDEX `emp_email_changes_status_next_attempt_at_lease_until_idx`(`status`, `next_attempt_at`, `lease_until`),
    INDEX `emp_email_changes_employee_id_created_at_idx`(`employee_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_email_changes` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NOT NULL,
    `payload_hash` CHAR(64) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auth_email_changes_account_id_created_at_idx`(`account_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `emp_employee_history` ADD CONSTRAINT `emp_employee_history_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `emp_employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `emp_email_changes` ADD CONSTRAINT `emp_email_changes_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `emp_employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_email_changes` ADD CONSTRAINT `auth_email_changes_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `auth_accounts`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Initialize the read projection without changing the immutable T12 operation.
UPDATE emp_employees e
JOIN emp_provisioning p ON p.employee_id = e.id
SET e.account_email = p.email
WHERE e.ready = TRUE AND p.status = 'COMPLETED';
