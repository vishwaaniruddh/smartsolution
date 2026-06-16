<?php
// validation.php - Shared input validation utilities

/**
 * Validates email format.
 * 
 * @param string|null $email The email address to validate.
 * @param bool $required Whether the field is mandatory.
 * @return bool True if valid, false otherwise.
 */
function isValidEmail($email, $required = false) {
    if ($email === null || $email === '') {
        return !$required;
    }
    $email = trim($email);
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validates contact number format (between 7 and 15 digits).
 * 
 * @param string|null $phone The contact number to validate.
 * @param bool $required Whether the field is mandatory.
 * @return bool True if valid, false otherwise.
 */
function isValidPhone($phone, $required = false) {
    if ($phone === null || $phone === '') {
        return !$required;
    }
    $phone = trim($phone);
    $digitsOnly = preg_replace('/\D/', '', $phone);
    $digitCount = strlen($digitsOnly);
    if ($digitCount >= 7 && $digitCount <= 15) {
        return preg_match('/^\+?[0-9\s\-()]+$/', $phone) === 1;
    }
    return false;
}
?>
