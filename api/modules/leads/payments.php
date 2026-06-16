<?php
// payments.php
require_once __DIR__ . '/../../core/db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Retrieve payments for a specific lead
        $lead_id = isset($_GET['lead_id']) ? intval($_GET['lead_id']) : null;
        if ($lead_id === null) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing lead_id parameter"]);
            break;
        }

        try {
            $tenant_id = getTenantId();
            $stmt = $pdo->prepare("SELECT * FROM lead_payments WHERE lead_id = ? AND tenant_id = ? ORDER BY payment_date DESC, id DESC");
            $stmt->execute([$lead_id, $tenant_id]);
            $payments = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $payments]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Add a new payment installment
        $data = json_decode(file_get_contents("php://input"), true);
        if (
            isset($data['lead_id']) && 
            isset($data['amount']) && 
            isset($data['payment_method']) && 
            isset($data['transaction_reference']) && 
            isset($data['payment_date'])
        ) {
            $lead_id = intval($data['lead_id']);
            $amount = floatval($data['amount']);
            $payment_method = trim($data['payment_method']);
            $transaction_reference = trim($data['transaction_reference']);
            $payment_date = trim($data['payment_date']);
            $remarks = isset($data['remarks']) ? trim($data['remarks']) : '';
            $agent_name = isset($data['agent_name']) ? trim($data['agent_name']) : 'System';

            if ($amount <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Payment amount must be greater than zero."]);
                break;
            }

            try {
                $tenant_id = getTenantId();

                // Fetch lead details
                $stmt = $pdo->prepare("SELECT * FROM leads WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$lead_id, $tenant_id]);
                $lead = $stmt->fetch();

                if (!$lead) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Lead not found."]);
                    break;
                }

                $lead_value = floatval($lead['value']);

                // Calculate current sum of payments
                $stmt = $pdo->prepare("SELECT SUM(amount) FROM lead_payments WHERE lead_id = ?");
                $stmt->execute([$lead_id]);
                $current_paid = floatval($stmt->fetchColumn() ?: 0);

                $outstanding = $lead_value - $current_paid;

                // Let's add a small decimal tolerance for comparison
                if ($amount > ($outstanding + 0.01)) {
                    http_response_code(400);
                    echo json_encode([
                        "success" => false, 
                        "error" => "Payment amount (" . $amount . ") exceeds outstanding balance (" . $outstanding . ")."
                    ]);
                    break;
                }

                // Insert payment record
                $stmt = $pdo->prepare("INSERT INTO lead_payments (lead_id, amount, payment_method, transaction_reference, payment_date, remarks, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $lead_id,
                    $amount,
                    $payment_method,
                    $transaction_reference,
                    $payment_date,
                    $remarks ?: null,
                    $tenant_id
                ]);
                $payment_id = $pdo->lastInsertId();

                // Recalculate total payments
                $stmt = $pdo->prepare("SELECT SUM(amount) FROM lead_payments WHERE lead_id = ?");
                $stmt->execute([$lead_id]);
                $total_paid = floatval($stmt->fetchColumn() ?: 0);

                // Auto determine payment status
                if ($total_paid >= $lead_value) {
                    $payment_status = 'Fully Paid';
                } elseif ($total_paid > 0) {
                    $payment_status = 'Partially Paid';
                } else {
                    $payment_status = 'Unpaid';
                }

                // Update leads table with aggregate payment details
                $stmt = $pdo->prepare("UPDATE leads SET received_payment = ?, payment_status = ?, payment_method = ?, transaction_reference = ?, payment_date = ?, finalization_remarks = ? WHERE id = ? AND tenant_id = ?");
                $stmt->execute([
                    $total_paid,
                    $payment_status,
                    $payment_method,
                    $transaction_reference,
                    $payment_date,
                    $remarks ?: null,
                    $lead_id,
                    $tenant_id
                ]);

                // Log an activity for this payment installment
                $currency_symbol = isset($data['currency_symbol']) ? $data['currency_symbol'] : '₹';
                $activity_details = "Recorded installment of " . $currency_symbol . number_format($amount, 2) . " via " . $payment_method . " (Ref: " . $transaction_reference . "). Total collected: " . $currency_symbol . number_format($total_paid, 2) . " / " . $currency_symbol . number_format($lead_value, 2) . ". Outstanding balance: " . $currency_symbol . number_format(($lead_value - $total_paid), 2) . ".";
                if ($remarks) {
                    $activity_details .= " Remarks: " . $remarks;
                }

                $stmt = $pdo->prepare("INSERT INTO lead_activities (lead_id, agent_name, activity_type, details, tenant_id) VALUES (?, ?, 'Note', ?, ?)");
                $stmt->execute([
                    $lead_id,
                    $agent_name,
                    $activity_details,
                    $tenant_id
                ]);

                echo json_encode([
                    "success" => true, 
                    "message" => "Payment recorded successfully", 
                    "payment_id" => $payment_id,
                    "total_paid" => $total_paid,
                    "payment_status" => $payment_status
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing required fields"]);
        }
        break;

    case 'DELETE':
        // Delete a payment installment
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if ($id === null) {
            $json = json_decode(file_get_contents("php://input"), true);
            $id = isset($json['id']) ? intval($json['id']) : null;
        }

        if ($id === null) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing payment ID"]);
            break;
        }

        try {
            $tenant_id = getTenantId();

            // Fetch payment to check existence and find lead_id
            $stmt = $pdo->prepare("SELECT * FROM lead_payments WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);
            $payment = $stmt->fetch();

            if (!$payment) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Payment record not found."]);
                break;
            }

            $lead_id = intval($payment['lead_id']);
            $amount = floatval($payment['amount']);

            // Fetch lead
            $stmt = $pdo->prepare("SELECT * FROM leads WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$lead_id, $tenant_id]);
            $lead = $stmt->fetch();

            if (!$lead) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Associated lead not found."]);
                break;
            }

            $lead_value = floatval($lead['value']);

            // Delete payment record
            $stmt = $pdo->prepare("DELETE FROM lead_payments WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$id, $tenant_id]);

            // Recalculate remaining payments
            $stmt = $pdo->prepare("SELECT SUM(amount) FROM lead_payments WHERE lead_id = ?");
            $stmt->execute([$lead_id]);
            $total_paid = floatval($stmt->fetchColumn() ?: 0);

            // Fetch the latest payment to populate active columns
            $stmt = $pdo->prepare("SELECT * FROM lead_payments WHERE lead_id = ? ORDER BY payment_date DESC, id DESC LIMIT 1");
            $stmt->execute([$lead_id]);
            $latest_payment = $stmt->fetch();

            if ($total_paid >= $lead_value) {
                $payment_status = 'Fully Paid';
            } elseif ($total_paid > 0) {
                $payment_status = 'Partially Paid';
            } else {
                $payment_status = 'Unpaid';
            }

            // Sync leads table columns
            if ($latest_payment) {
                $stmt = $pdo->prepare("UPDATE leads SET received_payment = ?, payment_status = ?, payment_method = ?, transaction_reference = ?, payment_date = ?, finalization_remarks = ? WHERE id = ? AND tenant_id = ?");
                $stmt->execute([
                    $total_paid,
                    $payment_status,
                    $latest_payment['payment_method'],
                    $latest_payment['transaction_reference'],
                    $latest_payment['payment_date'],
                    $latest_payment['remarks'] ?: null,
                    $lead_id,
                    $tenant_id
                ]);
            } else {
                $stmt = $pdo->prepare("UPDATE leads SET received_payment = 0.00, payment_status = 'Unpaid', payment_method = NULL, transaction_reference = NULL, payment_date = NULL, finalization_remarks = NULL WHERE id = ? AND tenant_id = ?");
                $stmt->execute([$lead_id, $tenant_id]);
            }

            // Log an activity for deletion
            $agent_name = isset($_GET['agent_name']) ? trim($_GET['agent_name']) : 'System';
            $activity_details = "Deleted payment installment of amount " . number_format($amount, 2) . ". New total paid: " . number_format($total_paid, 2) . " / " . number_format($lead_value, 2) . ".";

            $stmt = $pdo->prepare("INSERT INTO lead_activities (lead_id, agent_name, activity_type, details, tenant_id) VALUES (?, ?, 'Note', ?, ?)");
            $stmt->execute([
                $lead_id,
                $agent_name,
                $activity_details,
                $tenant_id
            ]);

            echo json_encode([
                "success" => true, 
                "message" => "Payment deleted successfully", 
                "total_paid" => $total_paid,
                "payment_status" => $payment_status
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
?>
