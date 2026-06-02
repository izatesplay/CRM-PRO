<?php
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * =========================================================================
 *                   سامانه یکپارچه اتصال به دیتابیس CRM (API Bridge)
 * =========================================================================
 * این اسکریپت به عنوان پل ارتباطی بین اپلیکیشن فرانت‌اند (React) و دیتابیس MySQL عمل می‌کند.
 * کاملاً خودکفا (Self-Contained) بوده و فاقد وابستگی‌های خارجی است تا به سادگی روی هاست‌های cPanel بارگذاری شود.
 * 
 * راهنمای راه‌اندازی در cPanel:
 * ۱. یک دیتابیس جدید در بخش "MySQL Databases" سی‌پنل بسازید.
 * ۲. یک کاربر تعریف کرده و آن را با دسترسیِ کامل (ALL PRIVILEGES) به دیتابیس متصل کنید.
 * ۳. ثابت‌های زیر را با مشخصات دیتابیس خود جایگزین نمایید.
 * ۴. بقیه کارها (ایجاد خودکار جداول و سید دیتای اولیه) به طور خودکار در اولین اجرا انجام می‌شود!
 */

// ۱. تنظیم مشخصات اتصال به دیتابیس
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'izates_crm_db');

// ۲. پشتیبانی محلی از هدرهای CORS جهت اتصال روان فرانت‌اند
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// مدیریت درخواست‌های Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// بستن نمایش خطاهای خام PHP جهت عدم شکستگی ساختار پاسخ‌های JSON هماهنگ سیستم
error_reporting(0);
ini_set('display_errors', 0);

// ۳. اتصال به سرور دیتابیس و بررسی وجود پایگاه داده
$mysqli = @new mysqli(DB_HOST, DB_USER, DB_PASS);
if ($mysqli->connect_error) {
    send_response(500, [
        'status' => 'error',
        'message' => 'اتصال به سرور MySQL برقرار نشد: ' . $mysqli->connect_error
    ]);
}

// ساخت خودکار پایگاه داده در صورت عدم وجود (در لوکال یا هاست‌های مجاز)
$db_create_query = "CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci";
if (!$mysqli->query($db_create_query)) {
    // اگر دسترسی ساخت پایگاه جدید در سی‌پنل محدود بود، هشدار مناسب می‌دهیم
    send_response(500, [
        'status' => 'error',
        'message' => 'خطا در ایجاد خودکار پایگاه داده. لطفاً ابتدا دیتابیسی با نام ' . DB_NAME . ' در سی‌پنل ساخته و مجدداً تلاش کنید.'
    ]);
}

// انتخاب تفصیلی پایگاه داده
if (!$mysqli->select_db(DB_NAME)) {
    send_response(500, [
        'status' => 'error',
        'message' => 'امکان انتخاب پایگاه داده ' . DB_NAME . ' وجود ندارد: ' . $mysqli->error
    ]);
}

// تنظیم دقیق کاراکترهای یونیکد جهت پشتیبانی کامل از حروف فارسی (نیم‌فاصله‌، ی و ک)
$mysqli->set_charset("utf8mb4");

// ۴. ساخت خودکار ساختار جداول (CREATE TABLE IF NOT EXISTS) مبتنی بر مستندات types.ts
$queries = [
    // جدول کاربران سامانه
    "CREATE TABLE IF NOT EXISTS `users` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `username` VARCHAR(150) NOT NULL UNIQUE,
        `full_name` VARCHAR(255) NOT NULL,
        `email` VARCHAR(255) NULL,
        `role` VARCHAR(100) NOT NULL,
        `password` VARCHAR(255) NULL,
        `approved` TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci",

    // جدول گزینه‌های اطلاعات پایه‌ای و دسته‌بندی‌ها
    "CREATE TABLE IF NOT EXISTS `dropdowns` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `category` VARCHAR(50) NOT NULL,
        `label` VARCHAR(255) NOT NULL,
        `color` VARCHAR(50) NOT NULL,
        `parent_id` VARCHAR(100) NULL,
        `sort_order` INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci",

    // جدول تعاریف فیلدهای اطلاعاتی سفارشی مشتریان
    "CREATE TABLE IF NOT EXISTS `custom_fields` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `key_name` VARCHAR(100) NOT NULL,
        `label` VARCHAR(255) NOT NULL,
        `type` VARCHAR(50) NOT NULL,
        `enabled` TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci",

    // جدول جامع لیدها و فرصت‌های معاملاتی مالی
    "CREATE TABLE IF NOT EXISTS `leads` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `full_name` VARCHAR(255) NOT NULL,
        `mobile` VARCHAR(100) NOT NULL,
        `referral` VARCHAR(100) NULL,
        `lead_source` VARCHAR(100) NULL,
        `service` VARCHAR(100) NULL,
        `sub_service` VARCHAR(100) NULL,
        `lead_status` VARCHAR(100) NULL,
        `request_challenge` TEXT NULL,
        `sms_text` TEXT NULL,
        `module_type` VARCHAR(50) NOT NULL DEFAULT 'lead',
        `opportunity_status` VARCHAR(100) NULL,
        `consultant` VARCHAR(100) NULL,
        `price` DECIMAL(15, 2) NULL,
        `payment_type` VARCHAR(100) NULL,
        `payment_method` VARCHAR(100) NULL,
        `converted_at` VARCHAR(100) NULL,
        `created_at` VARCHAR(100) NOT NULL,
        `is_starred` TINYINT(1) DEFAULT 0,
        `industry` VARCHAR(255) NULL,
        `telephone` VARCHAR(100) NULL,
        `consultation_topic` VARCHAR(255) NULL,
        `province` VARCHAR(255) NULL,
        `service_type` VARCHAR(255) NULL,
        `consultation_type` VARCHAR(255) NULL,
        `city` VARCHAR(255) NULL,
        `company` VARCHAR(255) NULL,
        `address` TEXT NULL,
        `send_sms_unanswered` VARCHAR(255) NULL,
        `extra_data` TEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci",

    // جدول رهگیری تغییرات فیلدها و کارهای نظارتی مشاوران
    "CREATE TABLE IF NOT EXISTS `audit_logs` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `lead_id` VARCHAR(100) NOT NULL,
        `field_name` VARCHAR(255) NOT NULL,
        `old_value` TEXT NULL,
        `new_value` TEXT NULL,
        `changed_by_name` VARCHAR(255) NOT NULL,
        `changed_by_role` VARCHAR(100) NOT NULL,
        `change_type` VARCHAR(55) NOT NULL,
        `created_at` VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci",

    // جدول سیستم نوتیفیکیشن‌ها و اعلانات کاربری
    "CREATE TABLE IF NOT EXISTS `notifications` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `user_id` VARCHAR(100) NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `message` TEXT NOT NULL,
        `lead_id` VARCHAR(100) NULL,
        `notification_type` VARCHAR(100) NOT NULL,
        `is_read` TINYINT(1) DEFAULT 0,
        `created_at` VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci",

    // جدول قرارهای ملاقات و تسک‌های زمان‌بندی شده روزانه
    "CREATE TABLE IF NOT EXISTS `activities` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `lead_id` VARCHAR(100) NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `activity_type` VARCHAR(100) NOT NULL,
        `priority` VARCHAR(50) NOT NULL,
        `scheduled_date` VARCHAR(50) NOT NULL,
        `scheduled_time` VARCHAR(50) NOT NULL,
        `is_done` TINYINT(1) DEFAULT 0,
        `author_name` VARCHAR(255) NOT NULL,
        `created_at` VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci",

    // جدول یادداشت‌های چسبان و توضیحات تکمیلی لیدها
    "CREATE TABLE IF NOT EXISTS `notes` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `lead_id` VARCHAR(100) NOT NULL,
        `content` TEXT NOT NULL,
        `author_name` VARCHAR(255) NOT NULL,
        `created_at` VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci"
];

// اجرای ساخت خودکار ساختارها
foreach ($queries as $sql) {
    if (!$mysqli->query($sql)) {
        send_response(500, [
            'status' => 'error',
            'message' => 'خطا در تعریف ساختار جداول پایگاه داده: ' . $mysqli->error
        ]);
    }
}

// ۵. تزریق اطلاعات پیش‌فرض (Seeding) در اولین اجرا در صورت خالی بودن دیتابیس
seed_default_data_if_empty($mysqli);

// ۶. روتر هوشمند مدیریت اکشن‌ها (Action Router API)
$action = isset($_GET['action']) ? trim($_GET['action']) : 'status';

switch ($action) {
    case 'status':
        handle_status($mysqli);
        break;

    case 'get_all':
        handle_get_all($mysqli);
        break;

    case 'sync_all':
        handle_sync_all($mysqli);
        break;

    default:
        send_response(400, [
            'status' => 'error',
            'message' => 'عملیات درخواست شده پشتیبانی نمی‌شود.'
        ]);
}

// ==========================================
//               توابع هندلر API
// ==========================================

/**
 * دریافت وضعیت سلامت اتصال به پایگاه داده و لیست جداول معتبر
 */
function handle_status($mysqli) {
    $tables = [];
    $res = $mysqli->query("SHOW TABLES");
    while ($row = $res->fetch_row()) {
        $tables[] = $row[0];
    }
    
    send_response(200, [
        'status' => 'success',
        'message' => 'اتصال به پایگاه داده با موفقیت برقرار شد. آماده همگام‌سازی جریانات مالی.',
        'database' => DB_NAME,
        'tables_configured' => $tables,
        'php_version' => PHP_VERSION,
        'collation' => 'utf8mb4_persian_ci'
    ]);
}

/**
 * دریافت پکیج کامل کلیه جدول‌ها به همراه ویژگی‌های سفارشی ادغام شده
 */
function handle_get_all($mysqli) {
    try {
        $data = [
            'users' => fetch_table_data($mysqli, 'users', ['approved']),
            'dropdowns' => fetch_table_data($mysqli, 'dropdowns', ['sort_order']),
            'custom_fields' => fetch_custom_fields($mysqli),
            'leads' => fetch_leads($mysqli),
            'activities' => fetch_table_data($mysqli, 'activities', ['is_done']),
            'notes' => fetch_table_data($mysqli, 'notes', []),
            'audit_logs' => fetch_table_data($mysqli, 'audit_logs', []),
            'notifications' => fetch_table_data($mysqli, 'notifications', ['is_read'])
        ];

        send_response(200, [
            'status' => 'success',
            'data' => $data
        ]);
    } catch (Exception $e) {
        send_response(500, [
            'status' => 'error',
            'message' => 'خطا در واکشی داده‌های جدول‌ها: ' . $e->getMessage()
        ]);
    }
}

/**
 * فرآیندِ یکپارچهِ تراکنشی تراکنش همگام‌سازی سراسری (Offline-First sync_all)
 */
function handle_sync_all($mysqli) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_response(405, [
            'status' => 'error',
            'message' => 'درخواست‌های همگام‌سازی صرفا از طریق متد POST قابل پذیرش می‌باشند.'
        ]);
    }

    $raw_input = file_get_contents('php://input');
    $payload = json_decode($raw_input, true);

    if (!$payload || !is_array($payload)) {
        send_response(400, [
            'status' => 'error',
            'message' => 'داده‌های سنکرون نامعتبر یا خالی می‌باشند.'
        ]);
    }

    // شروع رسمی تراکنش در سطح پایگاه داده جهت تضمین سلامت داده‌ها
    $mysqli->begin_transaction();

    try {
        // ۱. پردازش همگام‌سازی کاربران
        if (isset($payload['users']) && is_array($payload['users'])) {
            $mysqli->query("DELETE FROM users");
            $stmt = $mysqli->prepare("INSERT INTO users (id, username, full_name, email, role, password, approved) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($payload['users'] as $usr) {
                $id = $usr['id'];
                $username = $usr['username'];
                $full_name = $usr['full_name'];
                $email = isset($usr['email']) ? $usr['email'] : '';
                $role = $usr['role'];
                $password = isset($usr['password']) ? $usr['password'] : '';
                $approved = (isset($usr['approved']) && $usr['approved']) ? 1 : 0;

                $stmt->bind_param("ssssssi", $id, $username, $full_name, $email, $role, $password, $approved);
                $stmt->execute();
            }
            $stmt->close();
        }

        // ۲. پردازش همگام‌سازی گزینه‌های آبشاری
        if (isset($payload['dropdowns']) && is_array($payload['dropdowns'])) {
            $mysqli->query("DELETE FROM dropdowns");
            $stmt = $mysqli->prepare("INSERT INTO dropdowns (id, category, label, color, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
            foreach ($payload['dropdowns'] as $dd) {
                $id = $dd['id'];
                $category = $dd['category'];
                $label = $dd['label'];
                $color = $dd['color'];
                $parent_id = isset($dd['parent_id']) ? $dd['parent_id'] : null;
                $sort_order = isset($dd['sort_order']) ? intval($dd['sort_order']) : 0;

                $stmt->bind_param("sssssi", $id, $category, $label, $color, $parent_id, $sort_order);
                $stmt->execute();
            }
            $stmt->close();
        }

        // ۳. پردازش همگام‌سازی فیلدهای سفارشی
        if (isset($payload['custom_fields']) && is_array($payload['custom_fields'])) {
            $mysqli->query("DELETE FROM custom_fields");
            $stmt = $mysqli->prepare("INSERT INTO custom_fields (id, key_name, label, type, enabled) VALUES (?, ?, ?, ?, ?)");
            foreach ($payload['custom_fields'] as $cf) {
                $id = $cf['id'];
                $key_name = $cf['key']; // تبدیل کلید کلاینت به ستون فنی دیتابیس
                $label = $cf['label'];
                $type = $cf['type'];
                $enabled = (isset($cf['enabled']) && $cf['enabled']) ? 1 : 0;

                $stmt->bind_param("ssssi", $id, $key_name, $label, $type, $enabled);
                $stmt->execute();
            }
            $stmt->close();
        }

        // ۴. پردازش همگام‌سازی جامع لیدها و فرصت‌ها (بهمراه تفکیک ویژگی‌های داینامیک)
        if (isset($payload['leads']) && is_array($payload['leads'])) {
            $mysqli->query("DELETE FROM leads");
            
            $known_lead_keys = [
                'id', 'full_name', 'mobile', 'referral', 'lead_source', 'service', 
                'sub_service', 'lead_status', 'request_challenge', 'sms_text', 'module_type', 
                'opportunity_status', 'consultant', 'price', 'payment_type', 'payment_method', 
                'converted_at', 'created_at', 'is_starred', 'industry', 'telephone', 
                'consultation_topic', 'province', 'service_type', 'consultation_type', 
                'city', 'company', 'address', 'send_sms_unanswered'
            ];

            $sql = "INSERT INTO leads (
                id, full_name, mobile, referral, lead_source, service, 
                sub_service, lead_status, request_challenge, sms_text, module_type, 
                opportunity_status, consultant, price, payment_type, payment_method, 
                converted_at, created_at, is_starred, industry, telephone, 
                consultation_topic, province, service_type, consultation_type, 
                city, company, address, send_sms_unanswered, extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $mysqli->prepare($sql);
            
            foreach ($payload['leads'] as $item) {
                $id = $item['id'];
                $full_name = $item['full_name'];
                $mobile = $item['mobile'];
                $referral = isset($item['referral']) ? $item['referral'] : '';
                $lead_source = isset($item['lead_source']) ? $item['lead_source'] : '';
                $service = isset($item['service']) ? $item['service'] : '';
                $sub_service = isset($item['sub_service']) ? $item['sub_service'] : '';
                $lead_status = isset($item['lead_status']) ? $item['lead_status'] : '';
                $request_challenge = isset($item['request_challenge']) ? $item['request_challenge'] : '';
                $sms_text = isset($item['sms_text']) ? $item['sms_text'] : '';
                $module_type = isset($item['module_type']) ? $item['module_type'] : 'lead';
                $opportunity_status = isset($item['opportunity_status']) ? $item['opportunity_status'] : null;
                $consultant = isset($item['consultant']) ? $item['consultant'] : null;
                $price = isset($item['price']) ? floatval($item['price']) : null;
                $payment_type = isset($item['payment_type']) ? $item['payment_type'] : null;
                $payment_method = isset($item['payment_method']) ? $item['payment_method'] : null;
                $converted_at = isset($item['converted_at']) ? $item['converted_at'] : null;
                $created_at = $item['created_at'];
                $is_starred = (isset($item['is_starred']) && $item['is_starred']) ? 1 : 0;
                
                $industry = isset($item['industry']) ? $item['industry'] : null;
                $telephone = isset($item['telephone']) ? $item['telephone'] : null;
                $consultation_topic = isset($item['consultation_topic']) ? $item['consultation_topic'] : null;
                $province = isset($item['province']) ? $item['province'] : null;
                $service_type = isset($item['service_type']) ? $item['service_type'] : null;
                $consultation_type = isset($item['consultation_type']) ? $item['consultation_type'] : null;
                $city = isset($item['city']) ? $item['city'] : null;
                $company = isset($item['company']) ? $item['company'] : null;
                $address = isset($item['address']) ? $item['address'] : null;
                $send_sms_unanswered = isset($item['send_sms_unanswered']) ? $item['send_sms_unanswered'] : null;

                // شناسایی و بسته‌بندی متغیرهای اضافه و کاملا پویا به صورت JSON
                $extra = [];
                foreach ($item as $k => $v) {
                    if (!in_array($k, $known_lead_keys)) {
                        $extra[$k] = $v;
                    }
                }
                $extra_data = !empty($extra) ? json_encode($extra, JSON_UNESCAPED_UNICODE) : null;

                $stmt->bind_param(
                    "sssssssssssssddssssssssssssss",
                    $id, $full_name, $mobile, $referral, $lead_source, $service,
                    $sub_service, $lead_status, $request_challenge, $sms_text, $module_type,
                    $opportunity_status, $consultant, $price, $payment_type, $payment_method,
                    $converted_at, $created_at, $is_starred, $industry, $telephone,
                    $consultation_topic, $province, $service_type, $consultation_type,
                    $city, $company, $address, $send_sms_unanswered, $extra_data
                );
                $stmt->execute();
            }
            $stmt->close();
        }

        // ۵. پردازش همگام‌سازی قرار ملاقات‌ها و تسک‌ها
        if (isset($payload['activities']) && is_array($payload['activities'])) {
            $mysqli->query("DELETE FROM activities");
            $stmt = $mysqli->prepare("INSERT INTO activities (id, lead_id, title, activity_type, priority, scheduled_date, scheduled_time, is_done, author_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($payload['activities'] as $act) {
                $id = $act['id'];
                $lead_id = $act['lead_id'];
                $title = $act['title'];
                $activity_type = $act['activity_type'];
                $priority = $act['priority'];
                $scheduled_date = $act['scheduled_date'];
                $scheduled_time = $act['scheduled_time'];
                $is_done = (isset($act['is_done']) && $act['is_done']) ? 1 : 0;
                $author_name = $act['author_name'];
                $created_at = $act['created_at'];

                $stmt->bind_param("ssssssisss", $id, $lead_id, $title, $activity_type, $priority, $scheduled_date, $scheduled_time, $is_done, $author_name, $created_at);
                $stmt->execute();
            }
            $stmt->close();
        }

        // ۶. پردازش همگام‌سازی یادداشت‌ها
        if (isset($payload['notes']) && is_array($payload['notes'])) {
            $mysqli->query("DELETE FROM notes");
            $stmt = $mysqli->prepare("INSERT INTO notes (id, lead_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)");
            foreach ($payload['notes'] as $nt) {
                $id = $nt['id'];
                $lead_id = $nt['lead_id'];
                $content = $nt['content'];
                $author_name = $nt['author_name'];
                $created_at = $nt['created_at'];

                $stmt->bind_param("sssss", $id, $lead_id, $content, $author_name, $created_at);
                $stmt->execute();
            }
            $stmt->close();
        }

        // ۷. پردازش همگام‌سازی گزارشات نظارتی ادمین
        if (isset($payload['audit_logs']) && is_array($payload['audit_logs'])) {
            $mysqli->query("DELETE FROM audit_logs");
            $stmt = $mysqli->prepare("INSERT INTO audit_logs (id, lead_id, field_name, old_value, new_value, changed_by_name, changed_by_role, change_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($payload['audit_logs'] as $log) {
                $id = $log['id'];
                $lead_id = $log['lead_id'];
                $field_name = $log['field_name'];
                $old_value = isset($log['old_value']) ? $log['old_value'] : '';
                $new_value = isset($log['new_value']) ? $log['new_value'] : '';
                $changed_by_name = $log['changed_by_name'];
                $changed_by_role = $log['changed_by_role'];
                $change_type = $log['change_type'];
                $created_at = $log['created_at'];

                $stmt->bind_param("sssssssss", $id, $lead_id, $field_name, $old_value, $new_value, $changed_by_name, $changed_by_role, $change_type, $created_at);
                $stmt->execute();
            }
            $stmt->close();
        }

        // ۸. همگام‌سازی کامل نوتیفیکیشن‌ها
        if (isset($payload['notifications']) && is_array($payload['notifications'])) {
            $mysqli->query("DELETE FROM notifications");
            $stmt = $mysqli->prepare("INSERT INTO notifications (id, user_id, title, message, lead_id, notification_type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($payload['notifications'] as $ntf) {
                $id = $ntf['id'];
                $user_id = $ntf['user_id'];
                $title = $ntf['title'];
                $message = $ntf['message'];
                $lead_id = isset($ntf['lead_id']) ? $ntf['lead_id'] : null;
                $notification_type = $ntf['notification_type'];
                $is_read = (isset($ntf['is_read']) && $ntf['is_read']) ? 1 : 0;
                $created_at = $ntf['created_at'];

                $stmt->bind_param("ssssssis", $id, $user_id, $title, $message, $lead_id, $notification_type, $is_read, $created_at);
                $stmt->execute();
            }
            $stmt->close();
        }

        // تایید نهایی تراکنش در پایگاه داده (Commit) پس از پایان بازنویسی بی عیب و نقص
        $mysqli->commit();

        send_response(200, [
            'status' => 'success',
            'message' => 'همگام‌سازی چرخشی تراکنش با دیتابیس MySQL هاست اصلی هماهنگ شد.'
        ]);

    } catch (Exception $e) {
        // برگشت زدن کامل هر تغییری در صورت رخداد کوچک‌ترین مشکل در هر جدول (Safety Rollback)
        $mysqli->rollback();
        
        send_response(500, [
            'status' => 'error',
            'message' => 'خطا در انجام ثبت همگانی همگام‌سازی: ' . $e->getMessage()
        ]);
    }
}

// ==========================================
//              توابع کمکی و سیستمی
// ==========================================

/**
 * دریافت عمومی دادهای جداول عادی دیتابیس به همراه بازیابی Booleanها
 */
function fetch_table_data($mysqli, $table, $boolean_fields = []) {
    $results = [];
    $res = $mysqli->query("SELECT * FROM `$table`");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            foreach ($boolean_fields as $field) {
                if (isset($row[$field])) {
                    $row[$field] = $row[$field] ? true : false;
                }
            }
            $results[] = $row;
        }
    }
    return $results;
}

/**
 * دریافت فیلدهای اطلاعاتی سفارشی به فرمت types.ts
 */
function fetch_custom_fields($mysqli) {
    $results = [];
    $res = $mysqli->query("SELECT * FROM `custom_fields`");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $results[] = [
                'id' => $row['id'],
                'key' => $row['key_name'],
                'label' => $row['label'],
                'type' => $row['type'],
                'enabled' => $row['enabled'] ? true : false
            ];
        }
    }
    return $results;
}

/**
 * دریافت پرونده‌های معامه‌لاتی و لیدهای جامع با مرج‌کردن داده‌های پویای extra_data
 */
function fetch_leads($mysqli) {
    $leads = [];
    $res = $mysqli->query("SELECT * FROM `leads`");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $lead = $row;
            
            // مرج کردن ستون جزئیات منعطف
            if (!empty($row['extra_data'])) {
                $extra = json_decode($row['extra_data'], true);
                if (is_array($extra)) {
                    $lead = array_merge($lead, $extra);
                }
            }
            unset($lead['extra_data']);

            // تبدیل فیلدهای اعشاری و بولین مناسب برای خروجی تمیز JSON فرانت‌اند
            $lead['is_starred'] = $lead['is_starred'] ? true : false;
            if (isset($lead['price']) && $lead['price'] !== null) {
                $lead['price'] = floatval($lead['price']);
            }
            
            $leads[] = $lead;
        }
    }
    return $leads;
}

/**
 * خروجی پیام‌های JSON یکسان سیستم
 */
function send_response($code, $data) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * تزریق سریع دیتای دمو در اولین راه‌اندازی فرآیند جهت عدم مواجهه با وب‌سایت کاملاً خالی
 */
function seed_default_data_if_empty($mysqli) {
    // ۱. بررسی لزوم اجرای سیدر بر روی جدول منبع
    $check = $mysqli->query("SELECT COUNT(*) as cnt FROM `users`");
    $row = $check->fetch_assoc();
    if ($row['cnt'] > 0) {
        return; // دیتابیس قبلاً دارای اطلاعات است
    }

    // سید دراپ‌داون‌ها (اطلاعات مرجع)
    $dropdowns = [
        ["ref_1", "referral", "محمد رضا فتح آبادی", "#06b6d4", null, 1],
        ["ref_2", "referral", "مهتاب ناصری", "#10b981", null, 2],
        ["ref_3", "referral", "علی سجادی", "#a855f7", null, 3],
        ["src_1", "lead_source", "تبلیغاتی پیامکی ETOT", "#f97316", null, 1],
        ["src_2", "lead_source", "کمپین اینستاگرام", "#ec4899", null, 2],
        ["src_3", "lead_source", "گوگل ادز / سئو", "#3b82f6", null, 3],
        ["src_4", "lead_source", "نمایشگاه بین‌المللی", "#f59e0b", null, 4],
        ["srv_1", "service", "حقوقی", "#3b82f6", null, 1],
        ["srv_2", "service", "امور ثبتی", "#ec4899", null, 2],
        ["srv_3", "service", "مشاوره حقوقی", "#10b981", null, 3],
        ["sub_1", "sub_service", "وصول مطالبات", "#14b8a6", "srv_1", 1],
        ["sub_2", "sub_service", "انحصار وراثت", "#06b6d4", "srv_1", 2],
        ["sub_3", "sub_service", "ثبت شرکت تجارتی", "#f59e0b", "srv_2", 1],
        ["lst_1", "lead_status", "همین الان تماس اولیه بگیر", "#ef4444", null, 1],
        ["lst_2", "lead_status", "ارزیابی اولیه شده", "#f59e0b", null, 2],
        ["lst_3", "lead_status", "پیگیری مجدد/تماس مجدد", "#a855f7", null, 3],
        ["lst_4", "lead_status", "عدم پاسخگویی", "#ec4899", null, 4],
        ["ost_1", "opportunity_status", "جلسه دمو حضوری", "#10b981", null, 1],
        ["ost_2", "opportunity_status", "صدور و ارسال پیش‌فاکتور", "#3b82f6", null, 2],
        ["ost_3", "opportunity_status", "در انتظار پرداخت پیش‌پرداخت", "#f59e0b", null, 3],
        ["ost_4", "opportunity_status", "عقد نهایی قرارداد", "#06b6d4", null, 4],
        ["ost_5", "opportunity_status", "انصراف/معلق", "#6b7280", null, 5],
        ["con_1", "consultant", "جناب آقای مهندس حمیدی", "#3b82f6", null, 1],
        ["con_2", "consultant", "سرکار خانم دکتر کریمی", "#10b981", null, 2],
        ["con_3", "consultant", "جناب آقای دکتر یزدانی", "#f43f5e", null, 3],
        ["pty_1", "payment_type", "نقدی یک مرحله‌ای", "#10b981", null, 1],
        ["pty_2", "payment_type", "اقساطی ماهیانه", "#a855f7", null, 2],
        ["pty_3", "payment_type", "۵۰٪ پیش‌پرداخت + تسویه نهایی", "#f59e0b", null, 3],
        ["pm_1", "payment_method", "حواله بین بانکی پایا/ساتنا", "#3b82f6", null, 1],
        ["pm_2", "payment_method", "چک‌های صیادی معتبر بنفش", "#10b981", null, 2],
        ["pm_3", "payment_method", "واریز به کارت تجاری سازمان", "#ec4899", null, 3]
    ];
    $stmt = $mysqli->prepare("INSERT INTO `dropdowns` (id, category, label, color, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
    foreach ($dropdowns as $row) {
        $stmt->bind_param("sssssi", $row[0], $row[1], $row[2], $row[3], $row[4], $row[5]);
        $stmt->execute();
    }
    $stmt->close();

    // سید کاربران پیش‌فرض
    $users = [
        ["usr_1", "izatesplay", "مدیر ارشد سیستم", "admin@crm.com", "admin", "09386561626mM@", 1],
        ["usr_2", "consultant", "خانم سارا خسروی", "sara@crm.com", "consultant", "123", 1],
        ["usr_4", "supervisor", "مهندس علی کرمی (سرپرست)", "ali@crm.com", "supervisor", "123", 1]
    ];
    $stmt = $mysqli->prepare("INSERT INTO `users` (id, username, full_name, email, role, password, approved) VALUES (?, ?, ?, ?, ?, ?, ?)");
    foreach ($users as $row) {
        $stmt->bind_param("ssssssi", $row[0], $row[1], $row[2], $row[3], $row[4], $row[5], $row[6]);
        $stmt->execute();
    }
    $stmt->close();

    // سید لید دمو
    $leads = [
        [
            "lead_1", "محمد رضا فتح آبادی", "09121196033", "ref_1", "src_1", "srv_1", "sub_1", "lst_1",
            "۱۰ خرداد خیانت در امانت کلاهبرداری وصول مطالبات و استرداد لاشه چک‌های امانتی شرکت توسعه تجارت.",
            "همین الان تماس اولیه با آقای فتح‌آبادی برقرار شود جهت هماهنگی جلسه حضوری وکالت حقوقی.",
            "lead", null, null, null, null, null, null, "2026-06-01T11:29:00Z", 1
        ],
        [
            "lead_2", "جناب آقای محمدی ارشد", "09121523005", "ref_1", "src_1", "srv_1", "sub_2", "lst_1",
            "پیگیری شکوائیه کلاهبرداری اینترنتی و فیشینگ حساب بانکی سپهر صادرات.",
            "مکالمه اولیه انجام شد منتظر ارائه مستندات چاپی حساب هستیم.",
            "lead", null, null, null, null, null, null, "2026-06-01T11:32:00Z", 0
        ],
        [
            "opp_1", "مهندس امین باقری", "09129901658", "ref_3", "src_3", "srv_3", "sub_1", "lst_3",
            "قبول وکالت و مشاوره حقوقی پیگیری پرونده وصول مطالبات تجاری ملکی.",
            "پیش‌فاکتور مالیات قرارداد تنظیم و ارسال گردید.",
            "opportunity", "ost_2", "con_2", 450000000.0, "pty_3", "pm_1", "2026-05-31T09:00:00Z", "2026-05-25T11:00:00Z", 0
        ]
    ];
    $stmt = $mysqli->prepare("INSERT INTO `leads` (id, full_name, mobile, referral, lead_source, service, sub_service, lead_status, request_challenge, sms_text, module_type, opportunity_status, consultant, price, payment_type, payment_method, converted_at, created_at, is_starred) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($leads as $row) {
        $stmt->bind_param("sssssssssssssddsssi", 
            $row[0], $row[1], $row[2], $row[3], $row[4], $row[5], $row[6], $row[7], $row[8], $row[9], $row[10], $row[11], $row[12], $row[13], $row[14], $row[15], $row[16], $row[17], $row[18]
        );
        $stmt->execute();
    }
    $stmt->close();
}
