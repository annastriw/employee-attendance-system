-- CreateTable
CREATE TABLE `emp_employees` (
    `id` CHAR(36) NOT NULL,
    `nik` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `department_id` CHAR(36) NOT NULL,
    `position_id` CHAR(36) NOT NULL,
    `start_date` DATE NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'INACTIVE',
    `ready` BOOLEAN NOT NULL DEFAULT false,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emp_employees_nik_key`(`nik`),
    INDEX `emp_employees_status_name_idx`(`status`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emp_provisioning` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NOT NULL,
    `request_id` CHAR(36) NULL,
    `payload_hash` CHAR(64) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `desired_status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `phase` ENUM('PREPARE', 'PUBLISH', 'FINALIZE') NOT NULL DEFAULT 'PREPARE',
    `auth_account_id` CHAR(36) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `next_attempt_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lease_until` DATETIME(3) NULL,
    `lease_token` CHAR(36) NULL,
    `error_code` VARCHAR(40) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emp_provisioning_employee_id_key`(`employee_id`),
    INDEX `emp_provisioning_status_next_attempt_at_lease_until_idx`(`status`, `next_attempt_at`, `lease_until`),
    INDEX `emp_provisioning_actor_account_id_created_at_idx`(`actor_account_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_provisioning` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NOT NULL,
    `payload_hash` CHAR(64) NOT NULL,
    `finalized` BOOLEAN NOT NULL DEFAULT false,
    `credential_envelope` VARCHAR(512) NULL,
    `credential_claimed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auth_provisioning_account_id_key`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `emp_employees` ADD CONSTRAINT `emp_employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `emp_departments`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `emp_employees` ADD CONSTRAINT `emp_employees_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `emp_positions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `emp_provisioning` ADD CONSTRAINT `emp_provisioning_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `emp_employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_provisioning` ADD CONSTRAINT `auth_provisioning_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `auth_accounts`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
