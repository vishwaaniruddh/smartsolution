<?php
// settings.php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $type = isset($_GET['type']) ? $_GET['type'] : '';
        if ($type === 'superadmin') {
            try {
                $stmt = $pdo->query("SELECT * FROM superadmin_settings WHERE id = 1");
                $settings = $stmt->fetch();
                if (!$settings) {
                    $settings = [
                        'software_name' => 'SAR Software Solutions',
                        'logo_url' => null,
                        'title' => 'SAR Multitenant System',
                        'description' => null
                    ];
                }
                echo json_encode(["success" => true, "data" => $settings]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else if ($type === 'tenant') {
            $tenant_id = getTenantId();
            try {
                // Always fetch superadmin settings for fallback
                $stmt_sa = $pdo->query("SELECT * FROM superadmin_settings WHERE id = 1");
                $sa_settings = $stmt_sa->fetch() ?: [
                    'software_name' => 'SAR Software Solutions',
                    'logo_url' => null,
                    'title' => 'SAR Multitenant System',
                    'description' => null
                ];

                $stmt = $pdo->prepare("SELECT * FROM tenant_settings WHERE tenant_id = ?");
                $stmt->execute([$tenant_id]);
                $tenant_settings = $stmt->fetch();
                
                $settings = [];
                if ($tenant_settings) {
                    // Field-level fallback
                    $settings['tenant_id'] = $tenant_settings['tenant_id'];
                    $settings['software_name'] = !empty($tenant_settings['software_name']) ? $tenant_settings['software_name'] : $sa_settings['software_name'];
                    $settings['logo_url'] = !empty($tenant_settings['logo_url']) ? $tenant_settings['logo_url'] : $sa_settings['logo_url'];
                    $settings['title'] = !empty($tenant_settings['title']) ? $tenant_settings['title'] : $sa_settings['title'];
                    $settings['description'] = !empty($tenant_settings['description']) ? $tenant_settings['description'] : $sa_settings['description'];
                    $settings['updated_at'] = $tenant_settings['updated_at'];
                } else {
                    // Full fallback
                    $settings = $sa_settings;
                }
                
                echo json_encode(["success" => true, "data" => $settings]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else {
             http_response_code(400);
             echo json_encode(["success" => false, "error" => "Invalid settings type."]);
        }
        break;

    case 'POST':
        $type = isset($_POST['type']) ? $_POST['type'] : (isset($_GET['type']) ? $_GET['type'] : '');
        $software_name = isset($_POST['software_name']) ? $_POST['software_name'] : '';
        $title = isset($_POST['title']) ? $_POST['title'] : '';
        $description = isset($_POST['description']) ? $_POST['description'] : '';
        
        // Handle File Upload for logo
        $logo_url = null;
        if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
            $file_tmp = $_FILES['logo']['tmp_name'];
            $file_name = $_FILES['logo']['name'];
            $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
            
            $allowed_exts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
            if (in_array($file_ext, $allowed_exts)) {
                $base_upload_dir = __DIR__ . '/../uploads';
                
                if ($type === 'superadmin') {
                    $upload_dir = $base_upload_dir . '/superadmin/settings';
                    $rel_path = 'uploads/superadmin/settings';
                } else {
                    $tenant_id = getTenantId();
                    $upload_dir = $base_upload_dir . '/tenant_' . $tenant_id . '/settings';
                    $rel_path = 'uploads/tenant_' . $tenant_id . '/settings';
                }

                if (!file_exists($upload_dir)) {
                    mkdir($upload_dir, 0777, true);
                }
                
                $new_file_name = uniqid('logo_', true) . '.' . $file_ext;
                $dest_path = $upload_dir . '/' . $new_file_name;
                
                if (move_uploaded_file($file_tmp, $dest_path)) {
                    // Relative path from api/ directory
                    $logo_url = $rel_path . '/' . $new_file_name; 
                }
            } else {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid file type. Allowed: jpg, png, gif, svg, webp"]);
                exit();
            }
        }

        if ($type === 'superadmin') {
            try {
                if ($logo_url) {
                    $stmt = $pdo->prepare("UPDATE superadmin_settings SET software_name = ?, title = ?, description = ?, logo_url = ? WHERE id = 1");
                    $stmt->execute([$software_name, $title, $description, $logo_url]);
                } else {
                    $stmt = $pdo->prepare("UPDATE superadmin_settings SET software_name = ?, title = ?, description = ? WHERE id = 1");
                    $stmt->execute([$software_name, $title, $description]);
                }
                
                if ($stmt->rowCount() === 0) {
                    $check = $pdo->query("SELECT COUNT(*) FROM superadmin_settings WHERE id = 1")->fetchColumn();
                    if ($check == 0) {
                         $insert = "INSERT INTO superadmin_settings (id, software_name, title, description, logo_url) VALUES (1, ?, ?, ?, ?)";
                         $pdo->prepare($insert)->execute([$software_name, $title, $description, $logo_url]);
                    }
                }

                echo json_encode(["success" => true, "message" => "Global settings updated successfully", "logo_url" => $logo_url]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else if ($type === 'tenant') {
            $tenant_id = getTenantId();
            try {
                $check = $pdo->prepare("SELECT COUNT(*) FROM tenant_settings WHERE tenant_id = ?");
                $check->execute([$tenant_id]);
                $exists = $check->fetchColumn() > 0;

                if ($exists) {
                    if ($logo_url) {
                        $stmt = $pdo->prepare("UPDATE tenant_settings SET software_name = ?, title = ?, description = ?, logo_url = ? WHERE tenant_id = ?");
                        $stmt->execute([$software_name, $title, $description, $logo_url, $tenant_id]);
                    } else {
                        $stmt = $pdo->prepare("UPDATE tenant_settings SET software_name = ?, title = ?, description = ? WHERE tenant_id = ?");
                        $stmt->execute([$software_name, $title, $description, $tenant_id]);
                    }
                } else {
                    $stmt = $pdo->prepare("INSERT INTO tenant_settings (tenant_id, software_name, title, description, logo_url) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$tenant_id, $software_name, $title, $description, $logo_url]);
                }

                echo json_encode(["success" => true, "message" => "Tenant settings updated successfully", "logo_url" => $logo_url]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else {
             http_response_code(400);
             echo json_encode(["success" => false, "error" => "Invalid settings type."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
?>
