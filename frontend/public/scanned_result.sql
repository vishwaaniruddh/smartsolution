-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 19, 2026 at 01:26 PM
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
-- Database: `dropbox_sku_copier`
--

-- --------------------------------------------------------

--
-- Table structure for table `scanned_result`
--

CREATE TABLE `scanned_result` (
  `id` bigint(20) NOT NULL,
  `job_id` bigint(20) NOT NULL,
  `file_name` varchar(500) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `scanned_path` varchar(2000) NOT NULL,
  `copied_path` varchar(2000) DEFAULT NULL,
  `doc_type` enum('image','video','other') NOT NULL DEFAULT 'other',
  `file_size` bigint(20) NOT NULL DEFAULT 0,
  `status` enum('pending','queue','success','fail','skipped') NOT NULL DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  `retry_count` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `scanned_result`
--
ALTER TABLE `scanned_result`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_job_status` (`job_id`,`status`),
  ADD KEY `idx_job_id` (`job_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `scanned_result`
--
ALTER TABLE `scanned_result`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `scanned_result`
--
ALTER TABLE `scanned_result`
  ADD CONSTRAINT `scanned_result_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
