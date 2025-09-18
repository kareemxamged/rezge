<?php
/**
 * خدمة إرسال الإيميلات عبر SMTP مباشر
 * تستخدم PHPMailer مع إعدادات SMTP مخصصة
 */

// إعداد CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// التعامل مع طلبات OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// التحقق من طريقة الطلب
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// قراءة البيانات المرسلة
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// التحقق من البيانات المطلوبة
if (!$data || !isset($data['to']) || !isset($data['subject']) || !isset($data['html'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit();
}

// التحقق من إعدادات SMTP
if (!isset($data['smtp_config']) || !isset($data['smtp_config']['pass'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'SMTP configuration missing']);
    exit();
}

// استخراج البيانات
$to = $data['to'];
$subject = $data['subject'];
$html = $data['html'];
$text = $data['text'] ?? strip_tags($html);
$smtpConfig = $data['smtp_config'];

try {
    // تسجيل محاولة الإرسال
    logEmailAttempt($to, $subject, false, 'Starting SMTP attempt');

    // التحقق من وجود PHPMailer
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        // محاولة تحميل PHPMailer عبر Composer
        if (file_exists(__DIR__ . '/../../vendor/autoload.php')) {
            require_once __DIR__ . '/../../vendor/autoload.php';
        } elseif (file_exists(__DIR__ . '/../vendor/autoload.php')) {
            require_once __DIR__ . '/../vendor/autoload.php';
        } else {
            // استخدام دالة mail() البسيطة كبديل
            $fallbackResult = sendWithMailFunction($to, $subject, $html, $smtpConfig);
            logEmailAttempt($to, $subject, $fallbackResult['success'], $fallbackResult['error'] ?? 'mail() fallback');
            echo json_encode($fallbackResult);
            exit();
        }
    }

    // استخدام PHPMailer
    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\SMTP;
    use PHPMailer\PHPMailer\Exception;

    $mail = new PHPMailer(true);

    // إعدادات SMTP
    $mail->isSMTP();
    $mail->Host = $smtpConfig['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $smtpConfig['user'];
    $mail->Password = $smtpConfig['pass'];
    $mail->SMTPSecure = $smtpConfig['secure'] ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $smtpConfig['port'];

    // إعدادات الإيميل
    $mail->setFrom($smtpConfig['user'], 'رزقي - موقع الزواج الإسلامي');
    $mail->addAddress($to);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $html;
    $mail->AltBody = $text;
    $mail->CharSet = 'UTF-8';

    // إرسال الإيميل
    $mail->send();

    // تسجيل نجاح الإرسال
    logEmailAttempt($to, $subject, true, 'PHPMailer SMTP success');

    echo json_encode([
        'success' => true,
        'message' => 'Email sent successfully via SMTP',
        'method' => 'PHPMailer SMTP',
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    error_log("SMTP Error: " . $e->getMessage());
    
    // محاولة استخدام دالة mail() كبديل
    $fallbackResult = sendWithMailFunction($to, $subject, $html, $smtpConfig);
    
    if ($fallbackResult['success']) {
        echo json_encode($fallbackResult);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'SMTP failed: ' . $e->getMessage(),
            'fallback_error' => $fallbackResult['error']
        ]);
    }
}

/**
 * إرسال إيميل باستخدام دالة mail() البسيطة
 */
function sendWithMailFunction($to, $subject, $html, $smtpConfig) {
    try {
        // إعداد headers
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: ' . $smtpConfig['from'],
            'Reply-To: ' . $smtpConfig['user'],
            'X-Mailer: PHP/' . phpversion()
        ];

        // إرسال الإيميل
        $result = mail($to, $subject, $html, implode("\r\n", $headers));

        if ($result) {
            return [
                'success' => true,
                'message' => 'Email sent successfully via mail() function',
                'method' => 'PHP mail()'
            ];
        } else {
            return [
                'success' => false,
                'error' => 'mail() function failed'
            ];
        }
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'mail() function error: ' . $e->getMessage()
        ];
    }
}

/**
 * تسجيل محاولة الإرسال
 */
function logEmailAttempt($to, $subject, $success, $error = null) {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'to' => $to,
        'subject' => $subject,
        'success' => $success,
        'error' => $error,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    
    $logFile = __DIR__ . '/../../logs/email_smtp.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents($logFile, json_encode($logEntry) . "\n", FILE_APPEND | LOCK_EX);
}
?>
