-- AlterTable
ALTER TABLE `att_idempotency_requests` ADD COLUMN `claim_token` CHAR(36) NULL,
    ADD COLUMN `lease_until` DATETIME(3) NULL,
    ADD COLUMN `state` ENUM('PENDING', 'SUCCEEDED', 'REJECTED', 'RETRYABLE') NOT NULL DEFAULT 'SUCCEEDED',
    MODIFY `response_status` INTEGER NOT NULL DEFAULT 0,
    MODIFY `response_body` JSON NULL;

-- AlterTable
ALTER TABLE `media_objects` ADD COLUMN `bound_at` DATETIME(3) NULL,
    ADD COLUMN `bound_event_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `att_outbox` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `photo_object_id` CHAR(36) NOT NULL,
    `owner_employee_id` CHAR(36) NOT NULL,
    `purpose` ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL,
    `actor_account_id` CHAR(36) NOT NULL,
    `request_id` CHAR(36) NOT NULL,
    `state` ENUM('PENDING', 'PROCESSING', 'DELIVERED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `next_attempt_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `claim_token` CHAR(36) NULL,
    `lease_until` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `att_outbox_event_id_key`(`event_id`),
    INDEX `att_outbox_state_next_attempt_at_lease_until_idx`(`state`, `next_attempt_at`, `lease_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `att_events_photo_object_id_key` ON `att_events`(`photo_object_id`);

-- CreateIndex
CREATE UNIQUE INDEX `media_objects_bound_event_id_key` ON `media_objects`(`bound_event_id`);
