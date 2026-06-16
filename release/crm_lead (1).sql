-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 16, 2026 at 12:17 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.5.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `crm_lead`
--

-- --------------------------------------------------------

--
-- Table structure for table `email_logs`
--

CREATE TABLE `email_logs` (
  `id` int(11) NOT NULL,
  `recipient_email` varchar(150) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `status` enum('Success','Failed') NOT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `email_logs`
--

INSERT INTO `email_logs` (`id`, `recipient_email`, `subject`, `status`, `error_message`, `created_at`) VALUES
(1, 'anikiartitilak@gmail.com', 'Welcome to SAR Workforce - Your Account Details', 'Success', NULL, '2026-06-15 06:32:22');

-- --------------------------------------------------------

--
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact` varchar(255) NOT NULL,
  `source` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `agent` varchar(255) DEFAULT 'Unassigned',
  `delegation_status` varchar(50) DEFAULT 'None',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `email` varchar(150) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `is_deleted` tinyint(4) DEFAULT 0,
  `remarks` text DEFAULT NULL,
  `tenant_id` int(11) DEFAULT 1,
  `sales_status` varchar(50) DEFAULT 'Pending',
  `received_payment` decimal(10,2) DEFAULT 0.00,
  `payment_status` varchar(50) DEFAULT 'Unpaid',
  `payment_method` varchar(50) DEFAULT NULL,
  `transaction_reference` varchar(150) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `finalization_remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `name`, `contact`, `source`, `status`, `value`, `agent`, `delegation_status`, `created_at`, `email`, `contact_number`, `is_deleted`, `remarks`, `tenant_id`, `sales_status`, `received_payment`, `payment_status`, `payment_method`, `transaction_reference`, `payment_date`, `finalization_remarks`) VALUES
(1, 'Acme Corp', '', 'Website', 'Closed', 5000.00, 'Alex Lee', 'Accepted', '2026-06-12 04:30:00', 'alice@acme.com', '15550192834', 0, '', 1, 'Sales Done', 2500.00, 'Partially Paid', 'UPI / QR Code', 'UTR-test-123', '0000-00-00', NULL),
(2, 'TechFlow', '', 'Referral', 'Closed', 12500.00, 'Emily Davis', 'Pending', '2026-06-11 09:00:00', 'bob@techflow.io', '+1 (555) 019-5847', 0, NULL, 1, 'Sales Done', 6250.00, 'Partially Paid', 'UPI / QR Code', 'something', '2026-06-15', 'something 2'),
(3, 'Gotham Enterprises', '', 'Partner', 'New', 150000.00, 'Bruce Wayne', 'Accepted', '2026-06-13 06:30:00', 'lucius@gotham.com', '+1 (555) 019-8888', 0, NULL, 2, 'Pending', 0.00, 'Unpaid', NULL, NULL, NULL, NULL),
(4, 'Acme Solutions ', '', 'Cold Call', 'Closed', 250000.00, 'Unassigned', 'None', '2026-06-15 06:01:26', 'lanwan151@gmail.com', '7021889883', 0, 'something', 3, 'Sales Done', 0.00, 'Unpaid', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `lead_activities`
--

CREATE TABLE `lead_activities` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `agent_name` varchar(255) NOT NULL,
  `activity_type` varchar(50) NOT NULL,
  `details` text NOT NULL,
  `logged_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `tenant_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lead_activities`
--

INSERT INTO `lead_activities` (`id`, `lead_id`, `agent_name`, `activity_type`, `details`, `logged_at`, `tenant_id`) VALUES
(1, 1, 'Emily Davis', 'Call', 'Discussed technical requirements and pricing. Client is interested in standard plan.', '2026-06-12 06:00:00', 1),
(2, 1, 'Admin', 'Note', 'Sale finalization updated. Status: Sales Done. Payment Status: Partially Paid. Amount Collected: ₹2500 via UPI / QR Code (Ref: UTR-test-123).', '2026-06-15 22:02:34', 1),
(3, 2, 'Admin', 'Note', 'Sale finalization updated. Status: Sales Done. Payment Status: Partially Paid. Amount Collected: ₹6250 via UPI / QR Code (Ref: something). Remarks: something 2', '2026-06-15 22:03:39', 1);

-- --------------------------------------------------------

--
-- Table structure for table `lead_sources`
--

CREATE TABLE `lead_sources` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `tenant_id` int(11) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lead_sources`
--

INSERT INTO `lead_sources` (`id`, `name`, `tenant_id`, `created_at`) VALUES
(1, 'Website', 1, '2026-06-15 06:00:43'),
(2, 'Referral', 1, '2026-06-15 06:00:43'),
(3, 'Partner', 1, '2026-06-15 06:00:43'),
(4, 'Google', 3, '2026-06-15 06:09:16');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `smtp_settings`
--

CREATE TABLE `smtp_settings` (
  `tenant_id` int(11) NOT NULL,
  `host` varchar(255) NOT NULL,
  `port` int(11) NOT NULL,
  `encryption` varchar(50) NOT NULL DEFAULT 'ssl',
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `from_name` varchar(255) NOT NULL,
  `from_email` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `smtp_settings`
--

INSERT INTO `smtp_settings` (`tenant_id`, `host`, `port`, `encryption`, `username`, `password`, `from_name`, `from_email`, `created_at`, `updated_at`) VALUES
(1, 'smtp.hostinger.com', 465, 'ssl', 'aniruddh@sarsspl.com', 'AVav@@2022', 'SAR Workforce', 'aniruddh@sarsspl.com', '2026-06-15 06:39:41', '2026-06-15 06:39:41');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) DEFAULT NULL,
  `agent_name` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `due_date` date NOT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `tenant_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `lead_id`, `agent_name`, `title`, `due_date`, `status`, `created_at`, `tenant_id`) VALUES
(1, 2, 'Emily Davis', 'Send updated contract proposal', '2026-06-15', 'Pending', '2026-06-13 13:14:52', 1),
(2, 1, 'Emily Davis', 'Follow up on onboarding questions', '2026-06-14', 'Pending', '2026-06-13 13:14:52', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tenants`
--

CREATE TABLE `tenants` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `currency_name` varchar(50) DEFAULT 'Indian Rupee',
  `currency_symbol` varchar(10) DEFAULT '₹'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tenants`
--

INSERT INTO `tenants` (`id`, `name`, `created_at`, `currency_name`, `currency_symbol`) VALUES
(1, 'Tun Tun Pvt Ld', '2026-06-13 13:03:00', 'Indian Rupee', '₹'),
(2, 'Globex Industries', '2026-06-13 13:14:51', 'Indian Rupee', '₹'),
(3, 'SAR Solutions Private Limited', '2026-06-13 13:28:41', 'Indian Rupee', '₹');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `contact` varchar(50) NOT NULL,
  `gender` varchar(20) NOT NULL,
  `address` text NOT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `tenant_id` int(11) DEFAULT 1,
  `is_first_login` tinyint(4) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `contact`, `gender`, `address`, `profile_photo`, `password`, `role`, `created_at`, `tenant_id`, `is_first_login`) VALUES
(1, 'Tony', 'Stark', 'tony@stark.com', '9821519010', 'Male', 'Mumbai wala address', NULL, '$2y$12$AQP67SK.30WwYvJplMyQLOflyUcyhvfPfq8pc4NofeZBXjcOb.rjO', 'Admin', '2026-06-13 13:03:00', 1, 0),
(2, 'Emily', 'Davis', 'emily.davis@crm.com', '+1 (555) 019-2834', 'Female', '123 Sales St, San Francisco, CA', NULL, '$2y$12$AQP67SK.30WwYvJplMyQLOflyUcyhvfPfq8pc4NofeZBXjcOb.rjO', 'Manager', '2026-06-13 13:14:52', 1, 1),
(3, 'Alex', 'Lee', 'alex.lee@crm.com', '+1 (555) 019-5847', 'Male', '456 Tech Ave, San Jose, CA', NULL, '$2y$12$AQP67SK.30WwYvJplMyQLOflyUcyhvfPfq8pc4NofeZBXjcOb.rjO', 'Sales Associate', '2026-06-13 13:14:52', 1, 0),
(4, 'Admin', 'User', 'admin@crm.com', '+1 (555) 019-0000', 'Other', '789 Main Rd, Seattle, WA', NULL, '$2y$12$AQP67SK.30WwYvJplMyQLOflyUcyhvfPfq8pc4NofeZBXjcOb.rjO', 'Admin', '2026-06-13 13:14:52', 1, 0),
(5, 'Bruce', 'Wayne', 'bruce.wayne@globex.com', '+1 (555) 019-9999', 'Male', 'Wayne Manor, Gotham', NULL, '$2y$12$AQP67SK.30WwYvJplMyQLOflyUcyhvfPfq8pc4NofeZBXjcOb.rjO', 'Sales Associate', '2026-06-13 13:14:52', 2, 1),
(6, 'System', 'Superadmin', 'vishwaaniruddh@gmail.com', '7021889883', 'Other', '', NULL, '$2y$12$C3.CVBZKoLsGYWCHI/kSpeSz0MTAfU2wnwKMOySiZr27Vgr84AxJ6', 'Superadmin', '2026-06-13 13:14:52', NULL, 0),
(7, 'Mithun', 'Desai', 'aniruddhvishwa@gmail.com', '7021889883', 'Male', 'Something addresss', NULL, '$2y$12$AQP67SK.30WwYvJplMyQLOflyUcyhvfPfq8pc4NofeZBXjcOb.rjO', 'Admin', '2026-06-13 13:28:42', 3, 0),
(22, 'Arti', 'Vishwakarma', 'anikiartitilak@gmail.com', '8412063884', 'Female', 'something ', 'uploads/user_6a2f9c7250c479.46666099.jpeg', '$2y$12$AQP67SK.30WwYvJplMyQLOflyUcyhvfPfq8pc4NofeZBXjcOb.rjO', 'Sales Associate', '2026-06-15 06:32:18', 3, 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `email_logs`
--
ALTER TABLE `email_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lead_activities`
--
ALTER TABLE `lead_activities`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lead_sources`
--
ALTER TABLE `lead_sources`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `smtp_settings`
--
ALTER TABLE `smtp_settings`
  ADD PRIMARY KEY (`tenant_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tenants`
--
ALTER TABLE `tenants`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `email_logs`
--
ALTER TABLE `email_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `lead_activities`
--
ALTER TABLE `lead_activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `lead_sources`
--
ALTER TABLE `lead_sources`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `smtp_settings`
--
ALTER TABLE `smtp_settings`
  ADD CONSTRAINT `smtp_settings_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
