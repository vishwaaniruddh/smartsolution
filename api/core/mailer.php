<?php
// mailer.php
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Returns a configured PHPMailer instance using tenant-specific or global fallback SMTP settings.
 *
 * @param PDO $pdo The database connection
 * @param int|null $tenant_id The tenant ID. If null, tries to use the current session's tenant.
 * @return PHPMailer
 * @throws Exception If no SMTP settings are configured.
 */
function getMailer($pdo, $tenant_id = null) {
    if ($tenant_id === null && function_exists('getTenantId')) {
        try {
            $tenant_id = getTenantId();
        } catch (\Exception $e) {
            // It might fail if not logged in or in a cron context, default to 1 (Admin)
            $tenant_id = 1;
        }
    }
    
    // Fallback to Tenant 1 if still null
    if (!$tenant_id) {
        $tenant_id = 1;
    }

    $stmt = $pdo->prepare("SELECT * FROM smtp_settings WHERE tenant_id = ?");
    $stmt->execute([$tenant_id]);
    $config = $stmt->fetch();

    if (!$config) {
        // Fallback to Tenant 1 settings if a tenant hasn't configured theirs
        $stmt->execute([1]);
        $config = $stmt->fetch();
        
        if (!$config) {
            throw new Exception("SMTP is not configured for this tenant, and no default configuration exists.");
        }
    }

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = $config['host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $config['username'];
    $mail->Password   = $config['password'];
    $mail->Port       = $config['port'];
    
    if ($config['encryption'] === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } elseif ($config['encryption'] === 'tls') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mail->SMTPAutoTLS = false;
        $mail->SMTPSecure = '';
    }

    $mail->setFrom($config['from_email'], $config['from_name']);

    return $mail;
}

/**
 * Logs an email attempt to the database.
 *
 * @param PDO $pdo The database connection
 * @param string $recipient_email The recipient's email address
 * @param string $subject The subject of the email
 * @param string $status 'Success' or 'Failed'
 * @param string|null $error_message Any error message if it failed
 */
function logEmailAttempt($pdo, $recipient_email, $subject, $status, $error_message = null) {
    try {
        $stmt = $pdo->prepare("INSERT INTO email_logs (recipient_email, subject, status, error_message) VALUES (?, ?, ?, ?)");
        $stmt->execute([$recipient_email, $subject, $status, $error_message]);
    } catch (\PDOException $e) {
        // Silently fail if logging fails so it doesn't break the main flow.
        error_log("Failed to log email attempt: " . $e->getMessage());
    }
}
?>
