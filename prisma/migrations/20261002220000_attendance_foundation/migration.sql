-- CreateTable
CREATE TABLE `att_work_policies` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `work_days` VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
    `check_in_time` VARCHAR(8) NOT NULL DEFAULT '08:00:00',
    `check_out_time` VARCHAR(8) NOT NULL DEFAULT '17:00:00',
    `cutoff_time` VARCHAR(8) NOT NULL DEFAULT '23:59:59',
    `timezone` VARCHAR(40) NOT NULL DEFAULT 'Asia/Jakarta',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `att_work_policies_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `att_holidays` (
    `id` CHAR(36) NOT NULL,
    `holiday_date` DATE NOT NULL,
    `description` VARCHAR(200) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `att_holidays_holiday_date_key`(`holiday_date`),
    INDEX `att_holidays_holiday_date_idx`(`holiday_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `att_daily_records` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `attendance_date` DATE NOT NULL,
    `department_id_snapshot` CHAR(36) NOT NULL,
    `department_name_snapshot` VARCHAR(120) NOT NULL,
    `position_id_snapshot` CHAR(36) NOT NULL,
    `position_name_snapshot` VARCHAR(120) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `delete_reason` VARCHAR(500) NULL,
    `deleted_by_account_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `att_daily_records_attendance_date_deleted_at_idx`(`attendance_date`, `deleted_at`),
    INDEX `att_daily_records_employee_id_attendance_date_deleted_at_idx`(`employee_id`, `attendance_date`, `deleted_at`),
    UNIQUE INDEX `att_daily_records_employee_id_attendance_date_key`(`employee_id`, `attendance_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `att_events` (
    `id` CHAR(36) NOT NULL,
    `daily_record_id` CHAR(36) NOT NULL,
    `event_type` ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL,
    `event_time` DATETIME(3) NOT NULL,
    `client_captured_at` DATETIME(3) NOT NULL,
    `is_outside_schedule` BOOLEAN NOT NULL DEFAULT false,
    `is_late` BOOLEAN NOT NULL DEFAULT false,
    `is_early_departure` BOOLEAN NOT NULL DEFAULT false,
    `reason` VARCHAR(500) NULL,
    `photo_object_id` CHAR(36) NOT NULL,
    `capture_method` ENUM('AUTO', 'MANUAL') NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `accuracy_meters` DECIMAL(8, 2) NOT NULL,
    `location_captured_at` DATETIME(3) NOT NULL,
    `policy_snapshot` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `att_events_event_type_event_time_idx`(`event_type`, `event_time`),
    UNIQUE INDEX `att_events_daily_record_id_event_type_key`(`daily_record_id`, `event_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `att_idempotency_requests` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `payload_hash` CHAR(64) NOT NULL,
    `response_status` INTEGER NOT NULL,
    `response_body` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `att_idempotency_requests_employee_id_created_at_idx`(`employee_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `att_audit_logs` (
    `id` CHAR(36) NOT NULL,
    `actor_account_id` CHAR(36) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity_type` VARCHAR(40) NOT NULL,
    `entity_id` CHAR(36) NULL,
    `reason` VARCHAR(500) NULL,
    `details` JSON NULL,
    `request_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `att_audit_logs_actor_account_id_created_at_idx`(`actor_account_id`, `created_at`),
    INDEX `att_audit_logs_entity_type_entity_id_created_at_idx`(`entity_type`, `entity_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `att_events` ADD CONSTRAINT `att_events_daily_record_id_fkey` FOREIGN KEY (`daily_record_id`) REFERENCES `att_daily_records`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
