-- CreateTable
CREATE TABLE `auth_accounts` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `employee_id` CHAR(36) NULL,
    `password_hash` VARCHAR(60) NOT NULL,
    `role` ENUM('ADMIN_HRD', 'EMPLOYEE') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'INACTIVE',
    `must_change_password` BOOLEAN NOT NULL DEFAULT true,
    `password_changed_at` DATETIME(3) NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auth_accounts_email_key`(`email`),
    UNIQUE INDEX `auth_accounts_employee_id_key`(`employee_id`),
    INDEX `auth_accounts_role_status_idx`(`role`, `status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_sessions` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `refresh_token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `auth_sessions_refresh_token_hash_key`(`refresh_token_hash`),
    INDEX `auth_sessions_account_id_revoked_at_idx`(`account_id`, `revoked_at`),
    INDEX `auth_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_audit_logs` (
    `id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NULL,
    `target_account_id` CHAR(36) NULL,
    `action` VARCHAR(80) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `request_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auth_audit_logs_target_account_id_created_at_idx`(`target_account_id`, `created_at`),
    INDEX `auth_audit_logs_actor_account_id_created_at_idx`(`actor_account_id`, `created_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `auth_accounts`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
