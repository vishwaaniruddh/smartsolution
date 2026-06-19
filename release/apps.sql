-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 19, 2026 at 02:46 PM
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
-- Table structure for table `apps`
--

CREATE TABLE `apps` (
  `id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `seq_id` int(11) NOT NULL,
  `weight` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `apps`
--

INSERT INTO `apps` (`id`, `name`, `description`, `category`, `is_active`, `created_at`, `seq_id`, `weight`) VALUES
('accounting', 'Double-Entry Financial Ledger', 'Cohesive bookkeeping accounts, custom invoicing, vendor logs, cashflow forecasts, financial statement generator, and tax reports.', 'Finance', 1, '2026-06-19 07:32:48', 1, 4),
('crm', 'Lead & Sales Intelligence (CRM)', 'Enterprise pipeline management, lead assignment trackers, activity logger, and real-time revenue analytics dashboard.', 'Sales & Marketing', 1, '2026-06-19 07:32:48', 2, 1),
('hrms', 'Human Resource Management (HRMS)', 'Complete employee directory, shift scheduling, real-time clock-in trackers, leave planner, payroll ledger, and task sheets.', 'Human Resources', 1, '2026-06-19 07:32:48', 3, 2),
('inventory', 'Smart Inventory & Warehouse Control', 'Multi-warehouse stock logs, barcode/RFID cataloging, automated purchase ordering, supply logs, and courier trackers.', 'Logistics', 1, '2026-06-19 07:32:48', 4, 3),
('servicedesk', 'Service Desk & Ticketing', 'Internal support ticketing system with SLA tracking, agent queues, priority escalation, comment threads, and resolution analytics.', 'Operations & IT', 1, '2026-06-19 07:32:48', 5, 5);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `apps`
--
ALTER TABLE `apps`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `seq_id` (`seq_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `apps`
--
ALTER TABLE `apps`
  MODIFY `seq_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
