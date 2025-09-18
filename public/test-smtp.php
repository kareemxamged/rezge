<?php
/**
 * اختبار بسيط لخدمة SMTP
 */

// إعداد CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// التعامل مع طلبات OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

echo json_encode([
    'status' => 'PHP SMTP Service is running',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => phpversion(),
    'smtp_config' => [
        'host' => 'smtp.hostinger.com',
        'port' => 465,
        'secure' => 'SSL',
        'user' => 'manage@kareemamged.com'
    ],
    'phpmailer_available' => class_exists('PHPMailer\PHPMailer\PHPMailer'),
    'composer_autoload' => [
        'main' => file_exists(__DIR__ . '/../vendor/autoload.php'),
        'alt' => file_exists(__DIR__ . '/../../vendor/autoload.php')
    ],
    'mail_function' => function_exists('mail'),
    'message' => 'جاهز لإرسال الإيميلات عبر SMTP!'
]);
?>
