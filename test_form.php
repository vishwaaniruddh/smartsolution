<?php
require 'api/core/jwt.php';
$token = jwt_encode(['user_id'=>10, 'tenant_id'=>2, 'role'=>'Admin']);

$ch = curl_init('http://localhost/lead/api/core/users.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'id' => 20,
    'first_name' => 'Bruce',
    'last_name' => 'Wayne',
    'email' => 'bruce.wayne@globex.com',
    'contact' => '1234567890',
    'role' => 'Sales Associate',
    'assigned_apps' => '["crm", "hrms"]'
]);

$response = curl_exec($ch);
curl_close($ch);
echo $response;
?>
