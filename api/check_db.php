<?php
require 'core/db.php';
$stmt = $pdo->query('DESCRIBE chat_messages');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
