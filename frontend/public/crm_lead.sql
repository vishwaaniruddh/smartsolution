-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 13, 2026 at 04:08 PM
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
  `tenant_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `name`, `contact`, `source`, `status`, `value`, `agent`, `delegation_status`, `created_at`, `email`, `contact_number`, `is_deleted`, `remarks`, `tenant_id`) VALUES
(1, 'Acme Corp', '', 'Website', 'New', 5000.00, 'Emily Davis', 'Accepted', '2026-06-12 04:30:00', 'alice@acme.com', '+1 (555) 019-2834', 0, NULL, 1),
(2, 'TechFlow', '', 'Referral', 'Contacted', 12500.00, 'Emily Davis', 'Pending', '2026-06-11 09:00:00', 'bob@techflow.io', '+1 (555) 019-5847', 0, NULL, 1),
(3, 'Gotham Enterprises', '', 'Partner', 'New', 150000.00, 'Bruce Wayne', 'Accepted', '2026-06-13 06:30:00', 'lucius@gotham.com', '+1 (555) 019-8888', 0, NULL, 2);

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
(1, 1, 'Emily Davis', 'Call', 'Discussed technical requirements and pricing. Client is interested in standard plan.', '2026-06-12 06:00:00', 1);

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tenants`
--

INSERT INTO `tenants` (`id`, `name`, `created_at`) VALUES
(1, 'Tun Tun Pvt Ld', '2026-06-13 13:03:00'),
(2, 'Globex Industries', '2026-06-13 13:14:51'),
(3, 'SAR Solutions Private Limited', '2026-06-13 13:28:41');

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
(1, 'Tony', 'Stark', 'tony@stark.com', '9821519010', 'Male', 'Mumbai wala address', NULL, '$2y$12$rZrgRuzky..2yMRN5ct3YuRFSIXA3Dukd6LDhBUptyDipPmKc6fAi', 'Admin', '2026-06-13 13:03:00', 1, 1),
(2, 'Emily', 'Davis', 'emily.davis@crm.com', '+1 (555) 019-2834', 'Female', '123 Sales St, San Francisco, CA', NULL, '$2y$10$v2iV13d.TjWpW1F2j6Jj1eXqW8/oU8tU7lZlqR1kC4g0H4YwK2M2u', 'Manager', '2026-06-13 13:14:52', 1, 1),
(3, 'Alex', 'Lee', 'alex.lee@crm.com', '+1 (555) 019-5847', 'Male', '456 Tech Ave, San Jose, CA', NULL, '$2y$10$v2iV13d.TjWpW1F2j6Jj1eXqW8/oU8tU7lZlqR1kC4g0H4YwK2M2u', 'Sales Associate', '2026-06-13 13:14:52', 1, 1),
(4, 'Admin', 'User', 'admin@crm.com', '+1 (555) 019-0000', 'Other', '789 Main Rd, Seattle, WA', NULL, '$2y$10$v2iV13d.TjWpW1F2j6Jj1eXqW8/oU8tU7lZlqR1kC4g0H4YwK2M2u', 'Admin', '2026-06-13 13:14:52', 1, 1),
(5, 'Bruce', 'Wayne', 'bruce.wayne@globex.com', '+1 (555) 019-9999', 'Male', 'Wayne Manor, Gotham', NULL, '$2y$10$v2iV13d.TjWpW1F2j6Jj1eXqW8/oU8tU7lZlqR1kC4g0H4YwK2M2u', 'Sales Associate', '2026-06-13 13:14:52', 2, 1),
(6, 'System', 'Superadmin', 'vishwaaniruddh@gmail.com', '', 'Other', '', NULL, '$2y$12$C3.CVBZKoLsGYWCHI/kSpeSz0MTAfU2wnwKMOySiZr27Vgr84AxJ6', 'Superadmin', '2026-06-13 13:14:52', NULL, 0),
(7, 'Mithun', 'Desai', 'aniruddhvishwa@gmail.com', '7021889883', 'Male', 'Something addresss', NULL, '$2y$12$FWzJ1ZN6tKyiq5QoIzdTIuIwoSGdgqAwGHaYNIcj0TTwSWArXWKva', 'Admin', '2026-06-13 13:28:42', 3, 0);

--
-- Indexes for dumped tables
--

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
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `lead_activities`
--
ALTER TABLE `lead_activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
