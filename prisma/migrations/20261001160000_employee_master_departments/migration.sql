-- CreateTable
CREATE TABLE `emp_departments` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emp_departments_code_key`(`code`),
    UNIQUE INDEX `emp_departments_name_key`(`name`),
    INDEX `emp_departments_status_name_idx`(`status`, `name`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emp_audit_logs` (
    `id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NULL,
    `entity_type` VARCHAR(40) NOT NULL,
    `entity_id` CHAR(36) NULL,
    `action` VARCHAR(80) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `request_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `emp_audit_logs_entity_type_entity_id_created_at_idx`(`entity_type`, `entity_id`, `created_at`),
    INDEX `emp_audit_logs_actor_account_id_created_at_idx`(`actor_account_id`, `created_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
