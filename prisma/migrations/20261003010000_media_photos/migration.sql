-- CreateTable
CREATE TABLE `media_objects` (
    `id` CHAR(36) NOT NULL,
    `owner_employee_id` CHAR(36) NOT NULL,
    `owner_account_id` CHAR(36) NOT NULL,
    `purpose` ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL,
    `status` ENUM('PENDING', 'READY', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `idempotency_key` CHAR(36) NOT NULL,
    `request_hash` CHAR(64) NOT NULL,
    `checksum_sha256` CHAR(64) NOT NULL,
    `bucket` VARCHAR(63) NOT NULL,
    `object_key` VARCHAR(256) NOT NULL,
    `byte_size` INTEGER UNSIGNED NOT NULL,
    `width` INTEGER UNSIGNED NOT NULL,
    `height` INTEGER UNSIGNED NOT NULL,
    `claim_token` CHAR(36) NULL,
    `lease_until` DATETIME(3) NULL,
    `ready_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `media_objects_status_lease_until_idx`(`status`, `lease_until`),
    UNIQUE INDEX `media_objects_owner_employee_id_idempotency_key_key`(`owner_employee_id`, `idempotency_key`),
    UNIQUE INDEX `media_objects_bucket_object_key_key`(`bucket`, `object_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_audit_logs` (
    `id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity_id` CHAR(36) NOT NULL,
    `request_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `media_audit_logs_entity_id_created_at_idx`(`entity_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
