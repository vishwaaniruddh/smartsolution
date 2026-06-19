<?php
require 'api/core/jwt.php';
$token = jwt_encode(['user_id'=>10, 'tenant_id'=>2, 'role'=>'Admin']);
$opts = [
    'http' => [
        'method' => 'GET',
        'header' => 'Authorization: Bearer ' . $token
    ]
];
$context = stream_context_create($opts);
$result = file_get_contents('http://localhost/lead/api/core/me.php', false, $context);
print_r(json_decode($result)->user->apps);
?>
