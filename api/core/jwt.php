<?php
// jwt.php
// A simple, lightweight JWT implementation using native PHP functions

// Change this to a strong secret key in production!
define('JWT_SECRET', 'dhurandhar_setu_super_secret_key_2026!');

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4 === 0 ? strlen($data) : strlen($data) + 4 - (strlen($data) % 4), '=', STR_PAD_RIGHT));
}

function jwt_encode($payload, $expiryInSeconds = 86400) {
    // 86400 = 24 hours
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['exp'] = time() + $expiryInSeconds;
    $payload['iat'] = time();
    $payloadJSON = json_encode($payload);

    $base64UrlHeader = base64url_encode($header);
    $base64UrlPayload = base64url_encode($payloadJSON);

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64url_encode($signature);

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function jwt_decode($jwt) {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return false;
    }

    $header = $parts[0];
    $payload = $parts[1];
    $signature = $parts[2];

    $validSignature = base64url_encode(hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true));

    if (!hash_equals($validSignature, $signature)) {
        return false; // Signature mismatch
    }

    $payloadData = json_decode(base64url_decode($payload), true);
    if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
        return false; // Token expired
    }

    return $payloadData;
}

// Helper to get token from Authorization Header
function getBearerToken() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx or fast CGI
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    
    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}
