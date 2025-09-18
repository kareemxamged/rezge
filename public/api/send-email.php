<?php
// API بسيط لإرسال الإيميلات باستخدام PHP
// يمكن استخدامه كبديل للخدمات المعقدة

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['to']) || !isset($input['subject']) || !isset($input['verificationUrl'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit();
}

$to = filter_var($input['to'], FILTER_VALIDATE_EMAIL);
$subject = $input['subject'];
$verificationUrl = $input['verificationUrl'];
$userData = $input['userData'] ?? ['first_name' => '', 'last_name' => ''];

if (!$to) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit();
}

// SMTP Configuration - يجب تحديث هذه الإعدادات
$smtpConfig = [
    'host' => 'smtp.hostinger.com',
    'port' => 465,
    'username' => 'manage@kareemamged.com',
    'password' => '', // يجب إضافة كلمة المرور الصحيحة
    'from_email' => 'manage@kareemamged.com',
    'from_name' => 'رزجة - موقع الزواج الإسلامي'
];

// Generate email HTML
$emailHTML = generateEmailHTML($verificationUrl, $userData);

// Try to send email using PHP mail() function first
$headers = [
    'MIME-Version: 1.0',
    'Content-type: text/html; charset=UTF-8',
    'From: ' . $smtpConfig['from_name'] . ' <' . $smtpConfig['from_email'] . '>',
    'Reply-To: ' . $smtpConfig['from_email'],
    'X-Mailer: PHP/' . phpversion()
];

$success = mail($to, $subject, $emailHTML, implode("\r\n", $headers));

if ($success) {
    echo json_encode(['success' => true, 'message' => 'Email sent successfully']);
} else {
    // If mail() fails, try alternative method or return error
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email']);
}

function generateEmailHTML($verificationUrl, $userData) {
    $firstName = htmlspecialchars($userData['first_name'] ?? '');
    $lastName = htmlspecialchars($userData['last_name'] ?? '');
    
    return "
<!DOCTYPE html>
<html dir=\"rtl\" lang=\"ar\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>تأكيد إنشاء حسابك في رزجة</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Amiri', serif; }
    </style>
</head>
<body style=\"margin: 0; padding: 0; font-family: 'Amiri', serif; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 40px 20px; min-height: 100vh;\">
    <div style=\"max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;\">
        <div style=\"background: linear-gradient(135deg, #1e40af 0%, #059669 100%); padding: 40px 30px; text-align: center;\">
            <h1 style=\"color: white; font-size: 32px; margin: 0; font-weight: bold;\">رزجة</h1>
            <p style=\"color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;\">موقع الزواج الإسلامي الشرعي</p>
        </div>
        
        <div style=\"padding: 40px 30px;\">
            <h2 style=\"color: #1e40af; font-size: 24px; margin: 0 0 20px 0; text-align: center;\">مرحباً بك في رزجة!</h2>
            
            <p style=\"color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;\">
                أهلاً وسهلاً {$firstName} {$lastName}،<br><br>
                نشكرك على انضمامك إلى موقع رزجة للزواج الإسلامي الشرعي. لإكمال إنشاء حسابك، يرجى النقر على الرابط أدناه لتعيين كلمة المرور:
            </p>
            
            <div style=\"text-align: center; margin: 30px 0;\">
                <a href=\"{$verificationUrl}\" style=\"display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(30, 64, 175, 0.3);\">تأكيد الحساب وتعيين كلمة المرور</a>
            </div>
            
            <div style=\"background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0; border-right: 4px solid #1e40af;\">
                <h3 style=\"color: #1e40af; font-size: 18px; margin: 0 0 10px 0;\">معلومات مهمة:</h3>
                <ul style=\"color: #374151; margin: 0; padding-right: 20px; line-height: 1.6;\">
                    <li>هذا الرابط صالح لمدة 24 ساعة فقط</li>
                    <li>لا تشارك هذا الرابط مع أي شخص آخر</li>
                    <li>إذا لم تطلب إنشاء حساب، يرجى تجاهل هذا الإيميل</li>
                </ul>
            </div>
            
            <div style=\"background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; padding: 15px; margin: 20px 0; text-align: center;\">
                <p style=\"color: #92400e; font-size: 14px; margin: 0; font-weight: bold;\">إذا لم تستطع النقر على الرابط، انسخ والصق الرابط التالي في متصفحك:</p>
                <p style=\"color: #1e40af; font-size: 12px; word-break: break-all; margin: 10px 0 0 0; background: white; padding: 10px; border-radius: 5px;\">{$verificationUrl}</p>
            </div>
        </div>
        
        <div style=\"background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;\">
            <p style=\"color: #6b7280; font-size: 14px; margin: 0;\">© 2025 رزجة - موقع الزواج الإسلامي الشرعي</p>
            <p style=\"color: #6b7280; font-size: 12px; margin: 5px 0 0 0;\">هذا الإيميل تم إرساله تلقائياً، يرجى عدم الرد عليه</p>
        </div>
    </div>
</body>
</html>
    ";
}
?>
