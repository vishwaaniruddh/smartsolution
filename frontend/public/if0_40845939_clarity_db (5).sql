-- phpMyAdmin SQL Dump
-- version 4.9.0.1
-- https://www.phpmyadmin.net/
--
-- Host: sql109.infinityfree.com
-- Generation Time: Jun 23, 2026 at 01:27 AM
-- Server version: 11.4.12-MariaDB
-- PHP Version: 7.2.22

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `if0_40845939_clarity_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `api_access_log`
--

CREATE TABLE `api_access_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `endpoint` varchar(255) NOT NULL,
  `method` varchar(10) NOT NULL,
  `params` text DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text DEFAULT NULL,
  `response_code` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assets`
--

CREATE TABLE `assets` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `serial_number` varchar(100) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `status` enum('in_stock','dispatched','assigned','in_use','returned','under_repair','scrapped','lost') DEFAULT 'in_stock',
  `working_condition` enum('working','not_working') DEFAULT 'working',
  `current_holder_type` enum('warehouse','company','user') DEFAULT 'warehouse',
  `current_holder_id` int(11) DEFAULT NULL,
  `source_warehouse_id` int(11) DEFAULT NULL COMMENT 'Original warehouse where asset was first added',
  `warranty_expiry` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `banks`
--

CREATE TABLE `banks` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` tinyint(1) DEFAULT 1 COMMENT '0=inactive, 1=active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bulk_upload_logs`
--

CREATE TABLE `bulk_upload_logs` (
  `id` int(11) NOT NULL,
  `upload_type` varchar(50) NOT NULL COMMENT 'Type of upload: sites, delegations, etc.',
  `original_filename` varchar(255) NOT NULL,
  `total_rows` int(11) NOT NULL DEFAULT 0,
  `success_count` int(11) NOT NULL DEFAULT 0,
  `error_count` int(11) NOT NULL DEFAULT 0,
  `success_file` varchar(255) DEFAULT NULL COMMENT 'Path to success records Excel file',
  `error_file` varchar(255) DEFAULT NULL COMMENT 'Path to error records Excel file',
  `success_data` longtext DEFAULT NULL COMMENT 'JSON of successful records',
  `error_data` longtext DEFAULT NULL COMMENT 'JSON of error records with messages',
  `uploaded_by` int(11) NOT NULL,
  `company_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cities`
--

CREATE TABLE `cities` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `state_id` int(11) NOT NULL,
  `country_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('ADV','CONTRACTOR') NOT NULL,
  `status` enum('ACTIVE','INACTIVE','SUSPENDED') DEFAULT 'ACTIVE',
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company_access_log`
--

CREATE TABLE `company_access_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `target_company_id` int(11) NOT NULL,
  `access_result` enum('GRANTED','DENIED') NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company_permissions`
--

CREATE TABLE `company_permissions` (
  `id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `granted_by` int(11) NOT NULL,
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoked_by` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `configuration_audit_log`
--

CREATE TABLE `configuration_audit_log` (
  `id` int(11) NOT NULL,
  `action_type` enum('lock_acquired','lock_released','lock_expired','configured','unbound','ip_created','ip_updated','ip_deleted','bulk_upload') NOT NULL COMMENT 'Type of configuration action',
  `user_id` int(11) NOT NULL COMMENT 'User ID who performed the action',
  `router_serial_number` varchar(100) DEFAULT NULL COMMENT 'Router serial number (if applicable)',
  `ip_master_id` int(11) DEFAULT NULL COMMENT 'Reference to ip_master (if applicable)',
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional context in JSON format'
) ;

-- --------------------------------------------------------

--
-- Table structure for table `countries`
--

CREATE TABLE `countries` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `couriers`
--

CREATE TABLE `couriers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` tinyint(1) DEFAULT 1 COMMENT '0=inactive, 1=active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'India',
  `postal_code` varchar(20) DEFAULT NULL,
  `country_id` int(11) DEFAULT NULL,
  `state_id` int(11) DEFAULT NULL,
  `city_id` int(11) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1 COMMENT '0=inactive, 1=active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `delegation_history`
--

CREATE TABLE `delegation_history` (
  `id` int(11) NOT NULL,
  `delegation_id` int(11) NOT NULL,
  `action` enum('created','accepted','rejected','reassigned') NOT NULL,
  `performed_by` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `performed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `discrepancies`
--

CREATE TABLE `discrepancies` (
  `id` int(11) NOT NULL,
  `dispatch_id` int(11) NOT NULL,
  `pending_receive_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `asset_id` int(11) DEFAULT NULL,
  `expected_quantity` int(11) NOT NULL,
  `received_quantity` int(11) NOT NULL,
  `discrepancy_type` enum('shortage','damage','wrong_item','excess') NOT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('open','resolved','written_off') DEFAULT 'open',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dispatches`
--

CREATE TABLE `dispatches` (
  `id` int(11) NOT NULL,
  `dispatch_number` varchar(50) NOT NULL,
  `sender_type` enum('warehouse','company','user') DEFAULT 'warehouse',
  `sender_id` int(11) DEFAULT NULL,
  `from_company_id` int(11) NOT NULL,
  `from_warehouse_id` int(11) NOT NULL,
  `to_company_id` int(11) DEFAULT NULL,
  `to_user_id` int(11) DEFAULT NULL,
  `to_warehouse_id` int(11) DEFAULT NULL,
  `site_id` int(11) DEFAULT NULL,
  `material_request_id` int(11) DEFAULT NULL,
  `dispatch_date` date NOT NULL,
  `status` enum('pending','in_transit','delivered','cancelled') DEFAULT 'pending',
  `acknowledgment_status` enum('pending','acknowledged') DEFAULT 'pending',
  `receive_status` enum('pending','accepted','rejected','partial') DEFAULT 'pending',
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `acknowledged_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `courier_id` int(11) DEFAULT NULL,
  `pod_number` varchar(100) DEFAULT NULL,
  `contact_person_name` varchar(255) DEFAULT NULL,
  `contact_person_phone` varchar(50) DEFAULT NULL,
  `lr_copy_path` varchar(500) DEFAULT NULL,
  `pod_receipt_path` varchar(500) DEFAULT NULL,
  `acknowledgment_notes` text DEFAULT NULL,
  `acknowledgment_condition` enum('good','minor_damage','damaged','missing') DEFAULT 'good',
  `acknowledgment_proof` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_chain`
--

CREATE TABLE `dispatch_chain` (
  `id` int(11) NOT NULL,
  `asset_id` int(11) DEFAULT NULL COMMENT 'For serializable items',
  `product_id` int(11) NOT NULL,
  `dispatch_id` int(11) NOT NULL,
  `sequence_number` int(11) NOT NULL COMMENT 'Order in the chain for this item',
  `from_entity_type` enum('warehouse','company','user') NOT NULL,
  `from_entity_id` int(11) NOT NULL,
  `to_entity_type` enum('warehouse','company','user') NOT NULL,
  `to_entity_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  `dispatch_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `acceptance_date` timestamp NULL DEFAULT NULL,
  `status` enum('dispatched','accepted','rejected') NOT NULL DEFAULT 'dispatched',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_items`
--

CREATE TABLE `dispatch_items` (
  `id` int(11) NOT NULL,
  `dispatch_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `asset_id` int(11) DEFAULT NULL COMMENT 'For serializable items, references specific asset',
  `quantity` int(11) DEFAULT 1 COMMENT 'For non-serializable items, quantity dispatched',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_configurations`
--

CREATE TABLE `email_configurations` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('smtp','imap') NOT NULL,
  `host` varchar(255) NOT NULL,
  `port` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password_encrypted` text NOT NULL,
  `encryption` enum('none','ssl','tls') DEFAULT 'tls',
  `is_default` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `company_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_configuration_audit_log`
--

CREATE TABLE `email_configuration_audit_log` (
  `id` int(11) NOT NULL,
  `configuration_id` int(11) NOT NULL,
  `action` enum('created','updated','deleted','connection_tested') NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `email_logs`
--

CREATE TABLE `email_logs` (
  `id` int(11) NOT NULL,
  `queue_id` int(11) DEFAULT NULL,
  `to_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `status` enum('sent','failed','bounced') NOT NULL,
  `delivery_status` varchar(100) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `template_id` int(11) DEFAULT NULL,
  `trigger_id` int(11) DEFAULT NULL,
  `company_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_placeholders`
--

CREATE TABLE `email_placeholders` (
  `id` int(11) NOT NULL,
  `module_name` varchar(50) NOT NULL,
  `placeholder_key` varchar(100) NOT NULL,
  `placeholder_label` varchar(100) NOT NULL,
  `data_source` varchar(100) NOT NULL,
  `data_path` varchar(255) NOT NULL,
  `data_type` enum('string','number','date','boolean') DEFAULT 'string',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_queue`
--

CREATE TABLE `email_queue` (
  `id` int(11) NOT NULL,
  `to_email` varchar(255) NOT NULL,
  `cc_email` text DEFAULT NULL,
  `bcc_email` text DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `body_text` text DEFAULT NULL,
  `body_html` text DEFAULT NULL,
  `template_id` int(11) DEFAULT NULL,
  `trigger_id` int(11) DEFAULT NULL,
  `priority` enum('low','normal','high') DEFAULT 'normal',
  `status` enum('pending','processing','sent','failed') DEFAULT 'pending',
  `attempts` int(11) DEFAULT 0,
  `max_attempts` int(11) DEFAULT 3,
  `error_message` text DEFAULT NULL,
  `scheduled_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `sent_at` timestamp NULL DEFAULT NULL,
  `company_id` int(11) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_templates`
--

CREATE TABLE `email_templates` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body_text` text DEFAULT NULL,
  `body_html` text DEFAULT NULL,
  `module_name` varchar(50) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `placeholders` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `email_triggers`
--

CREATE TABLE `email_triggers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `module_name` varchar(50) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `template_id` int(11) NOT NULL,
  `recipient_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `engineer_assignments`
--

CREATE TABLE `engineer_assignments` (
  `id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `delegation_id` int(11) NOT NULL COMMENT 'Reference to accepted delegation',
  `engineer_id` int(11) NOT NULL COMMENT 'User ID of engineer',
  `assigned_by` int(11) NOT NULL COMMENT 'User ID who assigned',
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('assigned','in_progress','completed') DEFAULT 'assigned',
  `feasibility_status` enum('pending_eta','eta_submitted','ada_submitted','feasibility_completed','pending_contractor_review','contractor_approved','contractor_rejected','adv_approved','adv_rejected') DEFAULT 'pending_eta' COMMENT 'Feasibility workflow status including approval workflow',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feasibility_ada`
--

CREATE TABLE `feasibility_ada` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `ada_datetime` datetime NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `submitted_by` int(11) NOT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feasibility_checks`
--

CREATE TABLE `feasibility_checks` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `no_of_atm` int(11) DEFAULT 0,
  `atm_id_1` varchar(100) DEFAULT NULL,
  `atm_id_2` varchar(100) DEFAULT NULL,
  `atm_id_3` varchar(100) DEFAULT NULL,
  `atm_1_status` varchar(50) DEFAULT NULL,
  `atm_2_status` varchar(50) DEFAULT NULL,
  `atm_3_status` varchar(50) DEFAULT NULL,
  `operator` varchar(100) DEFAULT NULL,
  `signal_status` varchar(50) DEFAULT NULL,
  `operator_2` varchar(100) DEFAULT NULL,
  `signal_status_2` varchar(50) DEFAULT NULL,
  `backroom_network_remark` text DEFAULT NULL,
  `ups_available` varchar(10) DEFAULT NULL,
  `no_of_ups` int(11) DEFAULT NULL,
  `ups_battery_backup` varchar(50) DEFAULT NULL,
  `ups_working_1` varchar(50) DEFAULT NULL,
  `ups_working_2` varchar(50) DEFAULT NULL,
  `ups_working_3` varchar(50) DEFAULT NULL,
  `power_socket_availability` varchar(50) DEFAULT NULL,
  `power_socket_availability_ups` varchar(50) DEFAULT NULL,
  `earthing` varchar(50) DEFAULT NULL,
  `earthing_voltage` varchar(50) DEFAULT NULL,
  `power_fluctuation_en` varchar(50) DEFAULT NULL,
  `power_fluctuation_pe` varchar(50) DEFAULT NULL,
  `power_fluctuation_pn` varchar(50) DEFAULT NULL,
  `frequent_power_cut` varchar(10) DEFAULT NULL,
  `frequent_power_cut_from` time DEFAULT NULL,
  `frequent_power_cut_to` time DEFAULT NULL,
  `frequent_power_cut_remark` text DEFAULT NULL,
  `em_lock_available` varchar(10) DEFAULT NULL,
  `em_lock_password` varchar(100) DEFAULT NULL,
  `password_received` varchar(10) DEFAULT NULL,
  `backroom_key_name` varchar(100) DEFAULT NULL,
  `backroom_key_number` varchar(50) DEFAULT NULL,
  `backroom_key_status` varchar(50) DEFAULT NULL,
  `antenna_routing_detail` text DEFAULT NULL,
  `router_antenna_position` varchar(100) DEFAULT NULL,
  `router_position` varchar(100) DEFAULT NULL,
  `nearest_shop_name` varchar(200) DEFAULT NULL,
  `nearest_shop_number` varchar(50) DEFAULT NULL,
  `nearest_shop_distance` varchar(50) DEFAULT NULL,
  `backroom_disturbing_material` varchar(10) DEFAULT NULL,
  `backroom_disturbing_material_remark` text DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `backroom_network_snap` varchar(500) DEFAULT NULL,
  `router_antenna_snap` varchar(500) DEFAULT NULL,
  `antenna_routing_snap` varchar(500) DEFAULT NULL,
  `ups_available_snap` varchar(500) DEFAULT NULL,
  `no_of_ups_snap` varchar(500) DEFAULT NULL,
  `ups_working_snap` varchar(500) DEFAULT NULL,
  `power_socket_availability_snap` varchar(500) DEFAULT NULL,
  `earthing_snap` varchar(500) DEFAULT NULL,
  `power_fluctuation_snap` varchar(500) DEFAULT NULL,
  `remarks_snap` varchar(500) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `approval_status` enum('pending_contractor_review','contractor_approved','contractor_rejected','adv_approved','adv_rejected') DEFAULT 'pending_contractor_review',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feasibility_eta`
--

CREATE TABLE `feasibility_eta` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `eta_datetime` datetime NOT NULL,
  `submitted_by` int(11) NOT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_current` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feasibility_reviews`
--

CREATE TABLE `feasibility_reviews` (
  `id` int(11) NOT NULL,
  `feasibility_id` int(11) NOT NULL COMMENT 'Reference to feasibility_checks',
  `reviewer_id` int(11) NOT NULL COMMENT 'User ID of the reviewer',
  `reviewer_role` enum('contractor_admin','contractor_manager','adv') NOT NULL COMMENT 'Role of the reviewer',
  `review_type` enum('approval','rejection') NOT NULL COMMENT 'Type of review action',
  `rejection_type` enum('overall','section_specific') DEFAULT NULL COMMENT 'Type of rejection (null if approval)',
  `rejected_sections` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of section names that were rejected'
) ;

-- --------------------------------------------------------

--
-- Table structure for table `installations`
--

CREATE TABLE `installations` (
  `id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL COMMENT 'Reference to sites table',
  `feasibility_id` int(11) NOT NULL COMMENT 'Reference to feasibility_checks table',
  `initiated_by` int(11) NOT NULL COMMENT 'ADV user who initiated installation',
  `initiated_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'When installation was initiated',
  `contractor_id` int(11) DEFAULT NULL COMMENT 'Contractor company ID for installation',
  `delegated_by` int(11) DEFAULT NULL COMMENT 'ADV user who delegated to contractor',
  `delegated_at` timestamp NULL DEFAULT NULL COMMENT 'When installation was delegated to contractor',
  `assigned_engineer_id` int(11) DEFAULT NULL COMMENT 'Engineer assigned to perform installation',
  `assigned_by` int(11) DEFAULT NULL COMMENT 'Contractor user who assigned the engineer',
  `assigned_at` timestamp NULL DEFAULT NULL COMMENT 'When engineer was assigned',
  `eta_date` date DEFAULT NULL COMMENT 'Estimated Time of Arrival date',
  `eta_submitted_at` timestamp NULL DEFAULT NULL COMMENT 'When ETA was submitted',
  `ada_date` date DEFAULT NULL COMMENT 'Actual Date of Arrival',
  `ada_submitted_at` timestamp NULL DEFAULT NULL COMMENT 'When ADA was submitted',
  `atm_id` varchar(100) NOT NULL COMMENT 'Primary ATM ID',
  `atm_id_2` varchar(100) DEFAULT NULL,
  `atm_id_3` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `lho` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `atm_working_1` varchar(50) DEFAULT NULL,
  `atm_working_2` varchar(50) DEFAULT NULL,
  `atm_working_3` varchar(50) DEFAULT NULL,
  `vendor_name` varchar(200) DEFAULT NULL,
  `engineer_name` varchar(200) DEFAULT NULL,
  `engineer_number` varchar(50) DEFAULT NULL,
  `router_serial` varchar(100) DEFAULT NULL,
  `router_make` varchar(100) DEFAULT NULL,
  `router_model` varchar(100) DEFAULT NULL,
  `router_fixed` enum('yes','no') DEFAULT NULL,
  `router_fixed_remarks` text DEFAULT NULL,
  `router_fixed_snaps` text DEFAULT NULL,
  `router_status` enum('working','notWorking') DEFAULT NULL,
  `router_status_remarks` text DEFAULT NULL,
  `router_status_snaps` text DEFAULT NULL,
  `adaptor_installed` enum('yes','no') DEFAULT NULL,
  `adaptor_snaps` text DEFAULT NULL,
  `adaptor_status` enum('working','notWorking') DEFAULT NULL,
  `adaptor_status_remarks` text DEFAULT NULL,
  `adaptor_status_snaps` text DEFAULT NULL,
  `lan_cable_installed` enum('yes','no') DEFAULT NULL,
  `lan_cable_install_remark` text DEFAULT NULL,
  `lan_cable_install_snap` text DEFAULT NULL,
  `lan_cable_status` enum('working','notWorking') DEFAULT NULL,
  `lan_cable_status_not_working_reasons` text DEFAULT NULL,
  `lan_cable_status_remark` text DEFAULT NULL,
  `lan_cable_status_snap` text DEFAULT NULL,
  `antenna_installed` enum('yes','no') DEFAULT NULL,
  `antenna_remarks` text DEFAULT NULL,
  `antenna_snaps` text DEFAULT NULL,
  `antenna_status` enum('working','notWorking') DEFAULT NULL,
  `antenna_status_remarks` text DEFAULT NULL,
  `antenna_status_snaps` text DEFAULT NULL,
  `gps_installed` enum('yes','no') DEFAULT NULL,
  `gps_remarks` text DEFAULT NULL,
  `gps_snaps` text DEFAULT NULL,
  `gps_status` enum('working','notWorking') DEFAULT NULL,
  `gps_status_remarks` text DEFAULT NULL,
  `gps_status_snaps` text DEFAULT NULL,
  `wifi_installed` enum('yes','no') DEFAULT NULL,
  `wifi_remarks` text DEFAULT NULL,
  `wifi_snaps` text DEFAULT NULL,
  `wifi_status` enum('working','notWorking') DEFAULT NULL,
  `wifi_status_remarks` text DEFAULT NULL,
  `wifi_status_snaps` text DEFAULT NULL,
  `airtel_sim_installed` enum('yes','no') DEFAULT NULL,
  `airtel_sim_remarks` text DEFAULT NULL,
  `airtel_sim_snaps` text DEFAULT NULL,
  `airtel_sim_status` enum('working','notWorking') DEFAULT NULL,
  `airtel_sim_status_remarks` text DEFAULT NULL,
  `airtel_sim_status_snaps` text DEFAULT NULL,
  `vodafone_sim_installed` enum('yes','no') DEFAULT NULL,
  `vodafone_sim_remarks` text DEFAULT NULL,
  `vodafone_sim_snaps` text DEFAULT NULL,
  `vodafone_sim_status` enum('working','notWorking') DEFAULT NULL,
  `vodafone_sim_status_remarks` text DEFAULT NULL,
  `vodafone_sim_status_snaps` text DEFAULT NULL,
  `jio_sim_installed` enum('yes','no') DEFAULT NULL,
  `jio_sim_remarks` text DEFAULT NULL,
  `jio_sim_snaps` text DEFAULT NULL,
  `jio_sim_status` enum('working','notWorking') DEFAULT NULL,
  `jio_sim_status_remarks` text DEFAULT NULL,
  `jio_sim_status_snaps` text DEFAULT NULL,
  `signature_image` varchar(500) DEFAULT NULL,
  `vendor_stamp` varchar(500) DEFAULT NULL,
  `status` enum('pending_assignment','pending_eta','pending_ada','pending_materials','materials_received','in_progress','submitted','pending_contractor_review','contractor_approved','contractor_rejected','adv_approved','adv_rejected') DEFAULT 'pending_assignment' COMMENT 'Installation workflow status',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `submitted_by` int(11) DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_checkpoints`
--

CREATE TABLE `installation_checkpoints` (
  `id` int(11) NOT NULL,
  `installation_id` int(11) NOT NULL COMMENT 'Reference to installations table',
  `section` varchar(50) NOT NULL COMMENT 'Section identifier (router_fixed, router_status, adaptor, etc.)',
  `contractor_status` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT 'Contractor review status',
  `contractor_reviewer_id` int(11) DEFAULT NULL COMMENT 'Contractor reviewer user ID',
  `contractor_reviewed_at` timestamp NULL DEFAULT NULL COMMENT 'When contractor reviewed',
  `adv_status` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT 'ADV review status',
  `adv_reviewer_id` int(11) DEFAULT NULL COMMENT 'ADV reviewer user ID',
  `adv_reviewed_at` timestamp NULL DEFAULT NULL COMMENT 'When ADV reviewed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_material_receipts`
--

CREATE TABLE `installation_material_receipts` (
  `id` int(11) NOT NULL,
  `installation_id` int(11) NOT NULL COMMENT 'Reference to installations table',
  `confirmed_by` int(11) NOT NULL COMMENT 'Engineer who confirmed material receipt',
  `confirmed_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'When materials were confirmed received',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_notifications`
--

CREATE TABLE `installation_notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT 'User to notify',
  `notification_type` enum('installation_initiated','section_rejected','adv_rejected','contractor_rejected','adv_approved','contractor_approved') NOT NULL COMMENT 'Type of notification',
  `installation_id` int(11) NOT NULL COMMENT 'Reference to installations table',
  `site_id` int(11) DEFAULT NULL COMMENT 'Reference to sites table',
  `section` varchar(50) DEFAULT NULL COMMENT 'Section identifier (for rejection notifications)',
  `title` varchar(255) NOT NULL COMMENT 'Notification title',
  `message` text DEFAULT NULL COMMENT 'Notification message',
  `is_read` tinyint(1) DEFAULT 0 COMMENT 'Whether notification has been read',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_section_remarks`
--

CREATE TABLE `installation_section_remarks` (
  `id` int(11) NOT NULL,
  `installation_id` int(11) NOT NULL COMMENT 'Reference to installations table',
  `section` varchar(50) NOT NULL COMMENT 'Section identifier',
  `reviewer_id` int(11) NOT NULL COMMENT 'User who performed the review',
  `reviewer_level` enum('contractor','adv') NOT NULL COMMENT 'Level of reviewer',
  `review_type` enum('approval','rejection') NOT NULL COMMENT 'Type of review action',
  `remark` text DEFAULT NULL COMMENT 'Review remarks (required for rejections, min 10 chars)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_audit_log`
--

CREATE TABLE `inventory_audit_log` (
  `id` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL COMMENT 'stock_entry, dispatch, transfer, status_change, repair, etc.',
  `entity_type` varchar(50) NOT NULL COMMENT 'asset, stock, dispatch, transfer, repair',
  `entity_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `from_location_type` varchar(50) DEFAULT NULL COMMENT 'warehouse, company, user',
  `from_location_id` int(11) DEFAULT NULL,
  `to_location_type` varchar(50) DEFAULT NULL COMMENT 'warehouse, company, user',
  `to_location_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Previous state before action'
) ;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_counters`
--

CREATE TABLE `inventory_counters` (
  `id` int(11) NOT NULL,
  `entity_type` enum('warehouse','company','user') NOT NULL,
  `entity_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 0,
  `pending_out` int(11) DEFAULT 0 COMMENT 'Quantity in pending outgoing dispatches',
  `pending_in` int(11) DEFAULT 0 COMMENT 'Quantity in pending incoming receives',
  `last_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_notifications`
--

CREATE TABLE `inventory_notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `notification_type` enum('pending_receive','accepted','rejected','overdue','discrepancy') NOT NULL,
  `dispatch_id` int(11) DEFAULT NULL,
  `pending_receive_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ip_locks`
--

CREATE TABLE `ip_locks` (
  `id` int(11) NOT NULL,
  `ip_master_id` int(11) NOT NULL COMMENT 'Reference to ip_master table',
  `router_serial_number` varchar(100) NOT NULL COMMENT 'Serial number of router being configured',
  `locked_by` int(11) NOT NULL COMMENT 'User ID who acquired the lock',
  `locked_at` datetime DEFAULT current_timestamp() COMMENT 'When the lock was acquired',
  `expires_at` datetime NOT NULL COMMENT 'When the lock expires (locked_at + 20 minutes)',
  `status` enum('active','released','expired') DEFAULT 'active' COMMENT 'Current lock status',
  `released_at` datetime DEFAULT NULL COMMENT 'When the lock was released (if applicable)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IP Locks table for temporary locking during 20-minute configuration process';

-- --------------------------------------------------------

--
-- Table structure for table `ip_master`
--

CREATE TABLE `ip_master` (
  `id` int(11) NOT NULL,
  `network_ip` varchar(15) NOT NULL COMMENT 'Network IP address',
  `router_ip` varchar(15) NOT NULL COMMENT 'Router IP address',
  `site_ip` varchar(15) NOT NULL COMMENT 'Site IP address',
  `subnet_mask` varchar(15) NOT NULL COMMENT 'Subnet mask',
  `status` enum('available','locked','configured') DEFAULT 'available' COMMENT 'Current status of IP combination',
  `created_by` int(11) DEFAULT NULL COMMENT 'User ID who created this record',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IP Master table storing unique IP address combinations for router configuration';

-- --------------------------------------------------------

--
-- Table structure for table `ip_restrictions`
--

CREATE TABLE `ip_restrictions` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `restriction_type` enum('WHITELIST','BLACKLIST') NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lhos`
--

CREATE TABLE `lhos` (
  `id` int(11) NOT NULL,
  `lho_name` varchar(255) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lho_managers`
--

CREATE TABLE `lho_managers` (
  `id` int(11) NOT NULL,
  `lho_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `login_attempts`
--

CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL,
  `identifier` varchar(255) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `success` tinyint(1) DEFAULT 0,
  `failure_reason` varchar(100) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_masters`
--

CREATE TABLE `material_masters` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `company_id` int(11) NOT NULL COMMENT 'Company isolation',
  `created_by` int(11) NOT NULL COMMENT 'User who created',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT 'Soft delete timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_master_items`
--

CREATE TABLE `material_master_items` (
  `id` int(11) NOT NULL,
  `material_master_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL COMMENT 'Required quantity for this product',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_requests`
--

CREATE TABLE `material_requests` (
  `id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `material_master_id` int(11) NOT NULL,
  `status` enum('requested','approved','rejected','dispatched','received') DEFAULT 'requested',
  `company_id` int(11) NOT NULL COMMENT 'Company isolation',
  `requested_by` int(11) NOT NULL COMMENT 'User who created the request',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `approved_by` int(11) DEFAULT NULL COMMENT 'User who approved',
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_by` int(11) DEFAULT NULL COMMENT 'User who rejected',
  `rejected_at` timestamp NULL DEFAULT NULL,
  `dispatched_at` timestamp NULL DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `received_by` int(11) DEFAULT NULL COMMENT 'Engineer who confirmed receipt',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_request_items`
--

CREATE TABLE `material_request_items` (
  `id` int(11) NOT NULL,
  `material_request_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity_requested` int(11) NOT NULL COMMENT 'Quantity requested from material master',
  `quantity_dispatched` int(11) DEFAULT 0 COMMENT 'Quantity actually dispatched',
  `quantity_received` int(11) DEFAULT 0 COMMENT 'Quantity confirmed received',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(11) NOT NULL,
  `migration` varchar(255) NOT NULL,
  `executed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notes`
--

CREATE TABLE `notes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT '',
  `content` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_history`
--

CREATE TABLE `password_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pending_receives`
--

CREATE TABLE `pending_receives` (
  `id` int(11) NOT NULL,
  `dispatch_id` int(11) NOT NULL,
  `recipient_type` enum('warehouse','company','user') NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `status` enum('pending','accepted','rejected','partial') DEFAULT 'pending',
  `rejection_reason` text DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `accepted_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pending_receive_items`
--

CREATE TABLE `pending_receive_items` (
  `id` int(11) NOT NULL,
  `pending_receive_id` int(11) NOT NULL,
  `dispatch_item_id` int(11) NOT NULL,
  `expected_quantity` int(11) NOT NULL,
  `received_quantity` int(11) DEFAULT 0,
  `status` enum('pending','accepted','rejected','partial') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `module` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `is_adv_only` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permission_audit_log`
--

CREATE TABLE `permission_audit_log` (
  `id` int(11) NOT NULL,
  `company_id` int(11) DEFAULT NULL,
  `permission_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `unit_of_measure` varchar(50) NOT NULL,
  `inventory_type` enum('INTERNAL','SITE') NOT NULL,
  `is_serializable` tinyint(1) DEFAULT 0,
  `is_repairable` tinyint(1) DEFAULT 0,
  `low_stock_threshold` int(11) DEFAULT 0,
  `status` enum('active','inactive') DEFAULT 'active',
  `description` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_categories`
--

CREATE TABLE `product_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `profile_revisions`
--

CREATE TABLE `profile_revisions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `changed_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `push_subscriptions`
--

CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh_key` text NOT NULL,
  `auth_key` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_id` varchar(64) NOT NULL COMMENT 'Unique token identifier (jti claim)',
  `token_hash` varchar(255) NOT NULL COMMENT 'SHA-256 hash of the token',
  `expires_at` datetime NOT NULL COMMENT 'Token expiration timestamp',
  `revoked_at` datetime DEFAULT NULL COMMENT 'When token was revoked (NULL if active)',
  `created_at` datetime DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'Client IP at token creation',
  `user_agent` varchar(255) DEFAULT NULL COMMENT 'Client user agent at token creation'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores JWT refresh tokens for revocation tracking';

-- --------------------------------------------------------

--
-- Table structure for table `repairs`
--

CREATE TABLE `repairs` (
  `id` int(11) NOT NULL,
  `asset_id` int(11) NOT NULL,
  `repair_vendor` varchar(150) DEFAULT NULL,
  `estimated_cost` decimal(10,2) DEFAULT NULL,
  `actual_cost` decimal(10,2) DEFAULT NULL,
  `send_date` date NOT NULL,
  `expected_return_date` date DEFAULT NULL,
  `actual_return_date` date DEFAULT NULL,
  `status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `repair_notes` text DEFAULT NULL COMMENT 'Notes about the repair work',
  `diagnosis` text DEFAULT NULL COMMENT 'Initial diagnosis of the issue',
  `resolution` text DEFAULT NULL COMMENT 'Description of repair work done',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `level` int(11) NOT NULL DEFAULT 1,
  `company_type` enum('ADV','CONTRACTOR','BOTH') NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `router_ip_bindings`
--

CREATE TABLE `router_ip_bindings` (
  `id` int(11) NOT NULL,
  `router_serial_number` varchar(100) NOT NULL COMMENT 'Serial number of the configured router',
  `ip_master_id` int(11) NOT NULL COMMENT 'Reference to ip_master table',
  `configured_by` int(11) NOT NULL COMMENT 'User ID who performed the configuration',
  `configured_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'When the configuration was completed',
  `notes` text DEFAULT NULL COMMENT 'Optional notes about the configuration',
  `status` enum('active','unbound') DEFAULT 'active' COMMENT 'Binding status',
  `unbound_by` int(11) DEFAULT NULL COMMENT 'User ID who unbound the IP',
  `unbound_at` timestamp NULL DEFAULT NULL COMMENT 'When the IP was unbound',
  `unbind_reason` text DEFAULT NULL COMMENT 'Reason for unbinding'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Router IP Bindings table for permanent router-to-IP associations';

-- --------------------------------------------------------

--
-- Table structure for table `security_events`
--

CREATE TABLE `security_events` (
  `id` int(11) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `severity` enum('INFO','WARNING','CRITICAL') DEFAULT 'INFO',
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `settings_audit`
--

CREATE TABLE `settings_audit` (
  `id` int(11) NOT NULL,
  `setting_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `action` enum('CREATE','UPDATE','DELETE','RESET') NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `session_id` varchar(128) DEFAULT NULL,
  `request_method` varchar(10) DEFAULT NULL,
  `request_uri` text DEFAULT NULL,
  `integrity_hash` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sites`
--

CREATE TABLE `sites` (
  `id` int(11) NOT NULL,
  `site_name` varchar(255) NOT NULL,
  `lho` varchar(100) NOT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `country` varchar(100) NOT NULL,
  `zone` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `company_id` int(11) NOT NULL COMMENT 'ADV company that owns the site',
  `status` enum('active','inactive','deleted') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) NOT NULL,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site_delegations`
--

CREATE TABLE `site_delegations` (
  `id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `contractor_id` int(11) NOT NULL COMMENT 'Company ID of contractor',
  `delegated_by` int(11) NOT NULL COMMENT 'User ID who delegated',
  `delegated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `rejection_notes` text DEFAULT NULL,
  `responded_by` int(11) DEFAULT NULL,
  `responded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `states`
--

CREATE TABLE `states` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `country_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock`
--

CREATE TABLE `stock` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 0,
  `reserved_quantity` int(11) DEFAULT 0,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_alerts`
--

CREATE TABLE `stock_alerts` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `alert_type` enum('low_stock','overdue_repair') NOT NULL,
  `current_value` int(11) DEFAULT NULL COMMENT 'Current stock quantity or days overdue',
  `threshold_value` int(11) DEFAULT NULL COMMENT 'Threshold that triggered the alert',
  `status` enum('active','cleared') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `cleared_at` timestamp NULL DEFAULT NULL,
  `cleared_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_thresholds`
--

CREATE TABLE `stock_thresholds` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL COMMENT 'NULL means applies to all warehouses for this product',
  `threshold_quantity` int(11) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `category` varchar(50) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `default_value` text DEFAULT NULL,
  `data_type` enum('string','integer','boolean','json') DEFAULT 'string',
  `description` text DEFAULT NULL,
  `validation_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `token_blacklist`
--

CREATE TABLE `token_blacklist` (
  `id` int(11) NOT NULL,
  `token_jti` varchar(64) NOT NULL COMMENT 'Token ID (jti claim) of blacklisted token',
  `expires_at` datetime NOT NULL COMMENT 'When the token would naturally expire',
  `created_at` datetime DEFAULT current_timestamp() COMMENT 'When token was blacklisted'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores blacklisted JWT access tokens for immediate invalidation';

-- --------------------------------------------------------

--
-- Table structure for table `transfers`
--

CREATE TABLE `transfers` (
  `id` int(11) NOT NULL,
  `transfer_number` varchar(50) NOT NULL,
  `from_warehouse_id` int(11) NOT NULL,
  `to_warehouse_id` int(11) NOT NULL,
  `transfer_date` date NOT NULL,
  `status` enum('pending','in_transit','completed','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transfer_items`
--

CREATE TABLE `transfer_items` (
  `id` int(11) NOT NULL,
  `transfer_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `asset_id` int(11) DEFAULT NULL COMMENT 'For serializable items, references specific asset',
  `quantity` int(11) DEFAULT 1 COMMENT 'For non-serializable items, quantity transferred',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `sex` enum('male','female','other') DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `company_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `status` tinyint(1) DEFAULT 1 COMMENT '0=inactive, 1=active, 2=locked',
  `last_login` timestamp NULL DEFAULT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `password_changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_2fa`
--

CREATE TABLE `user_2fa` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `secret_key` varchar(255) DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT 0,
  `backup_codes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `user_audit_log`
--

CREATE TABLE `user_audit_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `company_id` int(11) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `zones`
--

CREATE TABLE `zones` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `api_access_log`
--
ALTER TABLE `api_access_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_endpoint` (`endpoint`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `assets`
--
ALTER TABLE `assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_serial_number` (`serial_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_warehouse_id` (`warehouse_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_working_condition` (`working_condition`),
  ADD KEY `idx_current_holder` (`current_holder_type`,`current_holder_id`),
  ADD KEY `idx_source_warehouse_id` (`source_warehouse_id`);

--
-- Indexes for table `banks`
--
ALTER TABLE `banks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_bank_name` (`name`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `bulk_upload_logs`
--
ALTER TABLE `bulk_upload_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_upload_type` (`upload_type`),
  ADD KEY `idx_uploaded_by` (`uploaded_by`),
  ADD KEY `idx_company_id` (`company_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `cities`
--
ALTER TABLE `cities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_city_state` (`name`,`state_id`),
  ADD KEY `idx_state` (`state_id`),
  ADD KEY `idx_zone` (`zone_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_country` (`country_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `company_access_log`
--
ALTER TABLE `company_access_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_target_company_id` (`target_company_id`),
  ADD KEY `idx_access_result` (`access_result`),
  ADD KEY `idx_timestamp` (`timestamp`);

--
-- Indexes for table `company_permissions`
--
ALTER TABLE `company_permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `permission_id` (`permission_id`),
  ADD KEY `granted_by` (`granted_by`),
  ADD KEY `revoked_by` (`revoked_by`),
  ADD KEY `idx_company_permission` (`company_id`,`permission_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `countries`
--
ALTER TABLE `countries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_country_name` (`name`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `couriers`
--
ALTER TABLE `couriers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_courier_name` (`name`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_customer_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_country_id` (`country_id`),
  ADD KEY `idx_state_id` (`state_id`),
  ADD KEY `idx_city_id` (`city_id`);

--
-- Indexes for table `delegation_history`
--
ALTER TABLE `delegation_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_delegation` (`delegation_id`);

--
-- Indexes for table `discrepancies`
--
ALTER TABLE `discrepancies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `asset_id` (`asset_id`),
  ADD KEY `resolved_by` (`resolved_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_dispatch` (`dispatch_id`),
  ADD KEY `idx_pending_receive` (`pending_receive_id`),
  ADD KEY `idx_product` (`product_id`);

--
-- Indexes for table `dispatch_chain`
--
ALTER TABLE `dispatch_chain`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_asset` (`asset_id`),
  ADD KEY `idx_product_entity` (`product_id`,`to_entity_type`,`to_entity_id`),
  ADD KEY `idx_dispatch` (`dispatch_id`),
  ADD KEY `idx_from_entity` (`from_entity_type`,`from_entity_id`),
  ADD KEY `idx_to_entity` (`to_entity_type`,`to_entity_id`),
  ADD KEY `idx_sequence` (`asset_id`,`sequence_number`);

--
-- Indexes for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dispatch_id` (`dispatch_id`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_asset_id` (`asset_id`);

--
-- Indexes for table `email_configurations`
--
ALTER TABLE `email_configurations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_company_type` (`company_id`,`type`),
  ADD KEY `idx_active_default` (`is_active`,`is_default`);

--
-- Indexes for table `email_logs`
--
ALTER TABLE `email_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `queue_id` (`queue_id`),
  ADD KEY `trigger_id` (`trigger_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_company_status` (`company_id`,`status`),
  ADD KEY `idx_sent_at` (`sent_at`),
  ADD KEY `idx_template_trigger` (`template_id`,`trigger_id`),
  ADD KEY `idx_email_logs_audit` (`company_id`,`sent_at`,`status`);

--
-- Indexes for table `email_placeholders`
--
ALTER TABLE `email_placeholders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_placeholder` (`module_name`,`placeholder_key`),
  ADD KEY `idx_module_active` (`module_name`,`is_active`);

--
-- Indexes for table `email_queue`
--
ALTER TABLE `email_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `template_id` (`template_id`),
  ADD KEY `trigger_id` (`trigger_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_status_priority` (`status`,`priority`),
  ADD KEY `idx_scheduled_status` (`scheduled_at`,`status`),
  ADD KEY `idx_company_status` (`company_id`,`status`),
  ADD KEY `idx_email_queue_processing` (`status`,`attempts`,`scheduled_at`);

--
-- Indexes for table `engineer_assignments`
--
ALTER TABLE `engineer_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_site` (`site_id`),
  ADD KEY `idx_delegation` (`delegation_id`),
  ADD KEY `idx_engineer` (`engineer_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `feasibility_ada`
--
ALTER TABLE `feasibility_ada`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_assignment_ada` (`assignment_id`),
  ADD KEY `idx_assignment` (`assignment_id`);

--
-- Indexes for table `feasibility_checks`
--
ALTER TABLE `feasibility_checks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_assignment_check` (`assignment_id`),
  ADD KEY `idx_site` (`site_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_approval_status` (`approval_status`);

--
-- Indexes for table `feasibility_eta`
--
ALTER TABLE `feasibility_eta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assignment` (`assignment_id`),
  ADD KEY `idx_current` (`is_current`);

--
-- Indexes for table `installations`
--
ALTER TABLE `installations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_site_installation` (`site_id`),
  ADD KEY `idx_feasibility` (`feasibility_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_initiated_by` (`initiated_by`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `fk_installations_delegated_by` (`delegated_by`),
  ADD KEY `idx_contractor` (`contractor_id`),
  ADD KEY `fk_installations_assigned_by` (`assigned_by`),
  ADD KEY `idx_assigned_engineer` (`assigned_engineer_id`),
  ADD KEY `idx_eta_date` (`eta_date`),
  ADD KEY `idx_ada_date` (`ada_date`);

--
-- Indexes for table `installation_checkpoints`
--
ALTER TABLE `installation_checkpoints`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_installation_section` (`installation_id`,`section`),
  ADD KEY `idx_installation` (`installation_id`),
  ADD KEY `idx_section` (`section`),
  ADD KEY `idx_contractor_status` (`contractor_status`),
  ADD KEY `idx_adv_status` (`adv_status`);

--
-- Indexes for table `installation_material_receipts`
--
ALTER TABLE `installation_material_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_installation_receipt` (`installation_id`),
  ADD KEY `idx_installation` (`installation_id`),
  ADD KEY `idx_confirmed_by` (`confirmed_by`);

--
-- Indexes for table `installation_notifications`
--
ALTER TABLE `installation_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_unread` (`user_id`,`is_read`),
  ADD KEY `idx_notification_type` (`notification_type`),
  ADD KEY `idx_installation` (`installation_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `installation_section_remarks`
--
ALTER TABLE `installation_section_remarks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_installation` (`installation_id`),
  ADD KEY `idx_section` (`section`),
  ADD KEY `idx_reviewer` (`reviewer_id`),
  ADD KEY `idx_reviewer_level` (`reviewer_level`),
  ADD KEY `idx_review_type` (`review_type`);

--
-- Indexes for table `inventory_counters`
--
ALTER TABLE `inventory_counters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_counter` (`entity_type`,`entity_id`,`product_id`),
  ADD KEY `idx_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_product` (`product_id`);

--
-- Indexes for table `inventory_notifications`
--
ALTER TABLE `inventory_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `dispatch_id` (`dispatch_id`),
  ADD KEY `pending_receive_id` (`pending_receive_id`),
  ADD KEY `idx_user_unread` (`user_id`,`is_read`),
  ADD KEY `idx_notification_type` (`notification_type`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `ip_locks`
--
ALTER TABLE `ip_locks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `locked_by` (`locked_by`),
  ADD KEY `idx_status_expires` (`status`,`expires_at`),
  ADD KEY `idx_ip_master_status` (`ip_master_id`,`status`),
  ADD KEY `idx_router_serial` (`router_serial_number`);

--
-- Indexes for table `ip_master`
--
ALTER TABLE `ip_master`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_ip_combination` (`network_ip`,`router_ip`,`site_ip`,`subnet_mask`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `ip_restrictions`
--
ALTER TABLE `ip_restrictions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_ip` (`ip_address`),
  ADD KEY `idx_restriction_type` (`restriction_type`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `lhos`
--
ALTER TABLE `lhos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_lho_name` (`lho_name`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `lho_managers`
--
ALTER TABLE `lho_managers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_lho_user` (`lho_id`,`user_id`),
  ADD KEY `idx_lho_id` (`lho_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_by` (`created_by`);

--
-- Indexes for table `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_identifier` (`identifier`),
  ADD KEY `idx_ip_address` (`ip_address`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_success` (`success`);

--
-- Indexes for table `material_masters`
--
ALTER TABLE `material_masters`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_company_id` (`company_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_deleted_at` (`deleted_at`),
  ADD KEY `idx_company_status` (`company_id`,`status`,`deleted_at`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `material_master_items`
--
ALTER TABLE `material_master_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_master_product` (`material_master_id`,`product_id`),
  ADD KEY `idx_material_master_id` (`material_master_id`),
  ADD KEY `idx_product_id` (`product_id`);

--
-- Indexes for table `material_requests`
--
ALTER TABLE `material_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_site_id` (`site_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_company_id` (`company_id`),
  ADD KEY `idx_material_master_id` (`material_master_id`),
  ADD KEY `idx_requested_by` (`requested_by`),
  ADD KEY `idx_site_status` (`site_id`,`status`),
  ADD KEY `idx_company_status` (`company_id`,`status`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `received_by` (`received_by`),
  ADD KEY `idx_rejected_by` (`rejected_by`);

--
-- Indexes for table `material_request_items`
--
ALTER TABLE `material_request_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_request_product` (`material_request_id`,`product_id`),
  ADD KEY `idx_material_request_id` (`material_request_id`),
  ADD KEY `idx_product_id` (`product_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_migration` (`migration`);

--
-- Indexes for table `notes`
--
ALTER TABLE `notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_updated_at` (`updated_at`);

--
-- Indexes for table `password_history`
--
ALTER TABLE `password_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `pending_receives`
--
ALTER TABLE `pending_receives`
  ADD PRIMARY KEY (`id`),
  ADD KEY `accepted_by` (`accepted_by`),
  ADD KEY `idx_recipient` (`recipient_type`,`recipient_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_dispatch` (`dispatch_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `pending_receive_items`
--
ALTER TABLE `pending_receive_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pending_receive` (`pending_receive_id`),
  ADD KEY `idx_dispatch_item` (`dispatch_item_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `unique_module_action` (`module`,`action`),
  ADD KEY `idx_module` (`module`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_adv_only` (`is_adv_only`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_inventory_type` (`inventory_type`),
  ADD KEY `idx_is_serializable` (`is_serializable`),
  ADD KEY `idx_is_repairable` (`is_repairable`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_parent_id` (`parent_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_company` (`user_id`,`company_id`),
  ADD KEY `idx_endpoint_hash` (`endpoint`(255)),
  ADD KEY `idx_updated_at` (`updated_at`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_token_id` (`token_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_token_id` (`token_id`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_revoked_at` (`revoked_at`);

--
-- Indexes for table `repairs`
--
ALTER TABLE `repairs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_asset_id` (`asset_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_send_date` (`send_date`),
  ADD KEY `idx_expected_return_date` (`expected_return_date`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_name_company_type` (`name`,`company_type`),
  ADD KEY `idx_company_type` (`company_type`),
  ADD KEY `idx_level` (`level`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indexes for table `router_ip_bindings`
--
ALTER TABLE `router_ip_bindings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_active_router` (`router_serial_number`,`status`),
  ADD KEY `configured_by` (`configured_by`),
  ADD KEY `unbound_by` (`unbound_by`),
  ADD KEY `idx_router_serial` (`router_serial_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_ip_master` (`ip_master_id`);

--
-- Indexes for table `settings_audit`
--
ALTER TABLE `settings_audit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_setting_timestamp` (`setting_id`,`timestamp`),
  ADD KEY `idx_user_timestamp` (`user_id`,`timestamp`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_integrity` (`integrity_hash`);

--
-- Indexes for table `sites`
--
ALTER TABLE `sites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_site_lho_company` (`site_name`,`lho`,`company_id`),
  ADD KEY `idx_lho` (`lho`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_company` (`company_id`);

--
-- Indexes for table `site_delegations`
--
ALTER TABLE `site_delegations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_site` (`site_id`),
  ADD KEY `idx_contractor` (`contractor_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_delegated_at` (`delegated_at`);

--
-- Indexes for table `states`
--
ALTER TABLE `states`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_state_country` (`name`,`country_id`),
  ADD KEY `idx_country` (`country_id`),
  ADD KEY `idx_zone` (`zone_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `stock`
--
ALTER TABLE `stock`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_product_warehouse` (`product_id`,`warehouse_id`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_warehouse_id` (`warehouse_id`);

--
-- Indexes for table `stock_alerts`
--
ALTER TABLE `stock_alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cleared_by` (`cleared_by`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_warehouse_id` (`warehouse_id`),
  ADD KEY `idx_alert_type` (`alert_type`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `stock_thresholds`
--
ALTER TABLE `stock_thresholds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_threshold` (`product_id`,`warehouse_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_warehouse_id` (`warehouse_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tasks_user_id` (`user_id`),
  ADD KEY `idx_tasks_user_created` (`user_id`,`created_at`);

--
-- Indexes for table `token_blacklist`
--
ALTER TABLE `token_blacklist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_token_jti` (`token_jti`),
  ADD KEY `idx_token_jti` (`token_jti`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `transfers`
--
ALTER TABLE `transfers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_transfer_number` (`transfer_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_from_warehouse_id` (`from_warehouse_id`),
  ADD KEY `idx_to_warehouse_id` (`to_warehouse_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_transfer_date` (`transfer_date`);

--
-- Indexes for table `transfer_items`
--
ALTER TABLE `transfer_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_transfer_id` (`transfer_id`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_asset_id` (`asset_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_company_id` (`company_id`),
  ADD KEY `idx_role_id` (`role_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_token` (`session_token`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_session_token` (`session_token`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_warehouse_name_company` (`name`,`company_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_company_id` (`company_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `zones`
--
ALTER TABLE `zones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_zone_name` (`name`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `api_access_log`
--
ALTER TABLE `api_access_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assets`
--
ALTER TABLE `assets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `banks`
--
ALTER TABLE `banks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bulk_upload_logs`
--
ALTER TABLE `bulk_upload_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cities`
--
ALTER TABLE `cities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_access_log`
--
ALTER TABLE `company_access_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_permissions`
--
ALTER TABLE `company_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `configuration_audit_log`
--
ALTER TABLE `configuration_audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `countries`
--
ALTER TABLE `countries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `couriers`
--
ALTER TABLE `couriers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `delegation_history`
--
ALTER TABLE `delegation_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `discrepancies`
--
ALTER TABLE `discrepancies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatches`
--
ALTER TABLE `dispatches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_chain`
--
ALTER TABLE `dispatch_chain`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_configurations`
--
ALTER TABLE `email_configurations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_configuration_audit_log`
--
ALTER TABLE `email_configuration_audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_logs`
--
ALTER TABLE `email_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_placeholders`
--
ALTER TABLE `email_placeholders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_queue`
--
ALTER TABLE `email_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_templates`
--
ALTER TABLE `email_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_triggers`
--
ALTER TABLE `email_triggers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `engineer_assignments`
--
ALTER TABLE `engineer_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feasibility_ada`
--
ALTER TABLE `feasibility_ada`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feasibility_checks`
--
ALTER TABLE `feasibility_checks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feasibility_eta`
--
ALTER TABLE `feasibility_eta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feasibility_reviews`
--
ALTER TABLE `feasibility_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installations`
--
ALTER TABLE `installations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installation_checkpoints`
--
ALTER TABLE `installation_checkpoints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installation_material_receipts`
--
ALTER TABLE `installation_material_receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installation_notifications`
--
ALTER TABLE `installation_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installation_section_remarks`
--
ALTER TABLE `installation_section_remarks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_audit_log`
--
ALTER TABLE `inventory_audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_counters`
--
ALTER TABLE `inventory_counters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_notifications`
--
ALTER TABLE `inventory_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ip_locks`
--
ALTER TABLE `ip_locks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ip_master`
--
ALTER TABLE `ip_master`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ip_restrictions`
--
ALTER TABLE `ip_restrictions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lhos`
--
ALTER TABLE `lhos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lho_managers`
--
ALTER TABLE `lho_managers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_masters`
--
ALTER TABLE `material_masters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_master_items`
--
ALTER TABLE `material_master_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_requests`
--
ALTER TABLE `material_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_request_items`
--
ALTER TABLE `material_request_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notes`
--
ALTER TABLE `notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_history`
--
ALTER TABLE `password_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pending_receives`
--
ALTER TABLE `pending_receives`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pending_receive_items`
--
ALTER TABLE `pending_receive_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permission_audit_log`
--
ALTER TABLE `permission_audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_categories`
--
ALTER TABLE `product_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `profile_revisions`
--
ALTER TABLE `profile_revisions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `repairs`
--
ALTER TABLE `repairs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `router_ip_bindings`
--
ALTER TABLE `router_ip_bindings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `security_events`
--
ALTER TABLE `security_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `settings_audit`
--
ALTER TABLE `settings_audit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sites`
--
ALTER TABLE `sites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `site_delegations`
--
ALTER TABLE `site_delegations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `states`
--
ALTER TABLE `states`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock`
--
ALTER TABLE `stock`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_alerts`
--
ALTER TABLE `stock_alerts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_thresholds`
--
ALTER TABLE `stock_thresholds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `token_blacklist`
--
ALTER TABLE `token_blacklist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transfers`
--
ALTER TABLE `transfers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transfer_items`
--
ALTER TABLE `transfer_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_2fa`
--
ALTER TABLE `user_2fa`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_audit_log`
--
ALTER TABLE `user_audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `warehouses`
--
ALTER TABLE `warehouses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `zones`
--
ALTER TABLE `zones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `api_access_log`
--
ALTER TABLE `api_access_log`
  ADD CONSTRAINT `api_access_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `assets`
--
ALTER TABLE `assets`
  ADD CONSTRAINT `assets_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `assets_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `assets_ibfk_3` FOREIGN KEY (`source_warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `assets_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `assets_ibfk_5` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `banks`
--
ALTER TABLE `banks`
  ADD CONSTRAINT `banks_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `banks_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bulk_upload_logs`
--
ALTER TABLE `bulk_upload_logs`
  ADD CONSTRAINT `bulk_upload_logs_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cities`
--
ALTER TABLE `cities`
  ADD CONSTRAINT `cities_ibfk_1` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`),
  ADD CONSTRAINT `cities_ibfk_2` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `cities_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `cities_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cities_country` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`);

--
-- Constraints for table `company_access_log`
--
ALTER TABLE `company_access_log`
  ADD CONSTRAINT `company_access_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `company_access_log_ibfk_2` FOREIGN KEY (`target_company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `company_permissions`
--
ALTER TABLE `company_permissions`
  ADD CONSTRAINT `company_permissions_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `company_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `company_permissions_ibfk_3` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `company_permissions_ibfk_4` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `countries`
--
ALTER TABLE `countries`
  ADD CONSTRAINT `countries_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `countries_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `couriers`
--
ALTER TABLE `couriers`
  ADD CONSTRAINT `couriers_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `couriers_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `customers_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `discrepancies`
--
ALTER TABLE `discrepancies`
  ADD CONSTRAINT `discrepancies_ibfk_1` FOREIGN KEY (`dispatch_id`) REFERENCES `dispatches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `discrepancies_ibfk_2` FOREIGN KEY (`pending_receive_id`) REFERENCES `pending_receives` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `discrepancies_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `discrepancies_ibfk_4` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `discrepancies_ibfk_5` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `dispatch_chain`
--
ALTER TABLE `dispatch_chain`
  ADD CONSTRAINT `dispatch_chain_ibfk_1` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `dispatch_chain_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `dispatch_chain_ibfk_3` FOREIGN KEY (`dispatch_id`) REFERENCES `dispatches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `dispatch_items`
--
ALTER TABLE `dispatch_items`
  ADD CONSTRAINT `dispatch_items_ibfk_1` FOREIGN KEY (`dispatch_id`) REFERENCES `dispatches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `dispatch_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `dispatch_items_ibfk_3` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `email_configurations`
--
ALTER TABLE `email_configurations`
  ADD CONSTRAINT `email_configurations_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `email_configurations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `email_logs`
--
ALTER TABLE `email_logs`
  ADD CONSTRAINT `email_logs_ibfk_1` FOREIGN KEY (`queue_id`) REFERENCES `email_queue` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `email_logs_ibfk_2` FOREIGN KEY (`template_id`) REFERENCES `email_templates` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `email_logs_ibfk_3` FOREIGN KEY (`trigger_id`) REFERENCES `email_triggers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `email_logs_ibfk_4` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `email_logs_ibfk_5` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `email_queue`
--
ALTER TABLE `email_queue`
  ADD CONSTRAINT `email_queue_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `email_templates` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `email_queue_ibfk_2` FOREIGN KEY (`trigger_id`) REFERENCES `email_triggers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `email_queue_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `email_queue_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `installations`
--
ALTER TABLE `installations`
  ADD CONSTRAINT `fk_installations_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_installations_assigned_engineer` FOREIGN KEY (`assigned_engineer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_installations_contractor` FOREIGN KEY (`contractor_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_installations_delegated_by` FOREIGN KEY (`delegated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `inventory_counters`
--
ALTER TABLE `inventory_counters`
  ADD CONSTRAINT `inventory_counters_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
