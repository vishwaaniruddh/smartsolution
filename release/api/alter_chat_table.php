<?php
require 'core/db.php';
try {
    $pdo->exec("ALTER TABLE chat_messages ADD COLUMN attachment_path VARCHAR(255) DEFAULT NULL");
    $pdo->exec("ALTER TABLE chat_messages ADD COLUMN attachment_name VARCHAR(255) DEFAULT NULL");
    echo "Columns added successfully";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
