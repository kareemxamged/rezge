-- إنشاء حسابات وهمية واقعية مكتملة - 2 أغسطس 2025
-- الهدف: إنشاء حسابات تحتوي على جميع الحقول المطلوبة للظهور في البحث
-- الحقول المطلوبة: age, marital_status, nationality, bio, profession

-- حسابات الرجال المكتملة
INSERT INTO public.users (
    id, email, first_name, last_name, phone, age, gender, city, nationality, 
    marital_status, marriage_type, children_count, residence_location,
    weight, height, skin_color, body_type, religiosity_level, prayer_commitment,
    smoking, beard, education_level, financial_status, work_field,
    job_title, monthly_income, health_status, profession, religious_commitment,
    bio, looking_for, verified, status, profile_visibility, show_phone,
    show_email, allow_messages, family_can_view, two_factor_enabled,
    login_notifications, message_notifications, created_at, updated_at
) VALUES 

-- رجل سعودي - مهندس برمجيات
(gen_random_uuid(), 'khalid.alharbi2025@gmail.com', 'خالد', 'الحربي', '+966 555111222', 29, 'male', 'الرياض', 'المملكة العربية السعودية', 'single', 'first_wife', 0, 'الرياض', 78, 176, 'medium', 'athletic', 'religious', 'pray_all', 'no', 'yes', 'bachelor', 'above_average', 'مهندس برمجيات', 'مهندس برمجيات أول', '8000_12000', 'very_good', 'مهندس برمجيات', 'high', 'مهندس برمجيات متخصص في تطوير التطبيقات المحمولة، أعمل في شركة تقنية رائدة في الرياض. أحب التكنولوجيا والابتكار، وأقضي وقت فراغي في تعلم تقنيات جديدة والقراءة. أبحث عن شريكة حياة متدينة ومتفهمة تشاركني اهتماماتي وطموحاتي المهنية.', 'أبحث عن زوجة صالحة ومتدينة', true, 'active', 'public', true, false, true, true, false, true, true, NOW(), NOW()),

-- رجل إماراتي - طبيب
(gen_random_uuid(), 'saeed.almansouri2025@hotmail.com', 'سعيد', 'المنصوري', '+971 555333444', 33, 'male', 'دبي', 'الإمارات العربية المتحدة', 'single', 'no_objection_polygamy', 0, 'دبي', 82, 180, 'fair', 'average', 'very_religious', 'pray_all', 'no', 'yes', 'master', 'wealthy', 'طبيب', 'استشاري قلب', 'more_20000', 'excellent', 'طبيب', 'high', 'طبيب استشاري في أمراض القلب، أعمل في مستشفى خاص مرموق في دبي. أحب مساعدة المرضى وإنقاذ الأرواح، وأقدر العلم والبحث الطبي. في وقت فراغي أحب القراءة والسفر. أبحث عن زوجة متعلمة وصالحة تفهم طبيعة عملي وتدعمني.', 'أبحث عن زوجة صالحة ومتدينة', true, 'active', 'public', false, false, true, true, false, true, true, NOW(), NOW()),

-- رجل مصري - مدرس
(gen_random_uuid(), 'ahmed.mohamed2025@yahoo.com', 'أحمد', 'محمد', '+20 1555666777', 31, 'male', 'القاهرة', 'مصر', 'single', 'first_wife', 0, 'القاهرة', 75, 174, 'medium', 'slim', 'religious', 'pray_all', 'no', 'yes', 'bachelor', 'average', 'مدرس', 'مدرس لغة عربية', '3000_5000', 'good', 'مدرس', 'medium', 'مدرس لغة عربية في المرحلة الثانوية، أحب الأدب والشعر العربي، وأقدر التراث والثقافة العربية. أعمل على تطوير مهاراتي التعليمية باستمرار، وأحب القراءة والكتابة. أبحث عن زوجة متعلمة تقدر العلم والثقافة وتشاركني حب اللغة العربية.', 'أبحث عن زوجة صالحة ومتدينة', true, 'active', 'public', true, true, true, false, false, true, true, NOW(), NOW()),

-- رجل أردني - مهندس مدني
(gen_random_uuid(), 'omar.khouri2025@outlook.com', 'عمر', 'خوري', '+962 777888999', 28, 'male', 'عمان', 'الأردن', 'single', 'first_wife', 0, 'عمان', 73, 172, 'olive', 'average', 'religious', 'pray_sometimes', 'no', 'yes', 'bachelor', 'average', 'مهندس مدني', 'مهندس مدني', '5000_8000', 'very_good', 'مهندس مدني', 'medium', 'مهندس مدني أعمل في شركة استشارية للمشاريع الإنشائية، أحب التصميم والبناء، وأقدر الدقة والجودة في العمل. في وقت فراغي أحب الرياضة والطبيعة والرحلات. أبحث عن شريكة حياة تفهم طبيعة عملي وتشاركني حب الحياة والمغامرات الآمنة.', 'أبحث عن زوجة صالحة ومتدينة', true, 'active', 'public', false, true, true, true, false, true, true, NOW(), NOW()),

-- رجل كويتي - محاسب
(gen_random_uuid(), 'faisal.alrashid2025@gmail.com', 'فيصل', 'الراشد', '+965 99887766', 30, 'male', 'الكويت', 'الكويت', 'single', 'no_objection_polygamy', 0, 'الكويت', 76, 175, 'fair', 'average', 'religious', 'pray_all', 'no', 'yes', 'master', 'above_average', 'محاسب', 'محاسب قانوني', '8000_12000', 'good', 'محاسب', 'high', 'محاسب قانوني معتمد أعمل في بنك كويتي كبير، أتخصص في التحليل المالي والاستثمار. أحب الأرقام والتحليل، وأقدر الدقة والأمانة في العمل. في وقت فراغي أحب القراءة في الاقتصاد والاستثمار. أبحث عن زوجة ذكية ومتفهمة تقدر عالم الأعمال.', 'أبحث عن زوجة صالحة ومتدينة', true, 'active', 'public', true, false, true, true, false, true, true, NOW(), NOW());

-- حسابات النساء المكتملة
INSERT INTO public.users (
    id, email, first_name, last_name, phone, age, gender, city, nationality, 
    marital_status, marriage_type, children_count, residence_location,
    weight, height, skin_color, body_type, religiosity_level, prayer_commitment,
    smoking, hijab, education_level, financial_status, work_field,
    job_title, monthly_income, health_status, profession, religious_commitment,
    bio, looking_for, verified, status, profile_visibility, show_phone,
    show_email, allow_messages, family_can_view, two_factor_enabled,
    login_notifications, message_notifications, created_at, updated_at
) VALUES 

-- امرأة سعودية - معلمة
(gen_random_uuid(), 'nora.alharbi2025@gmail.com', 'نورا', 'الحربي', '+966 555222333', 26, 'female', 'الرياض', 'المملكة العربية السعودية', 'single', 'only_wife', 0, 'الرياض', 60, 163, 'fair', 'slim', 'religious', 'pray_all', 'no', 'hijab', 'bachelor', 'average', 'معلمة', 'معلمة رياضيات', '5000_8000', 'very_good', 'معلمة', 'high', 'معلمة رياضيات في المرحلة المتوسطة، أحب التعليم والتعامل مع الطلاب، وأقدر العلم والمعرفة. أعمل على تطوير أساليب التدريس لجعل الرياضيات أكثر متعة وفهماً. في وقت فراغي أحب القراءة والرسم. أبحث عن زوج صالح يقدر التعليم ويدعم طموحاتي المهنية.', 'أبحث عن زوج صالح ومتدين', true, 'active', 'public', false, false, true, true, false, true, true, NOW(), NOW()),

-- امرأة إماراتية - طبيبة أسنان
(gen_random_uuid(), 'sara.almansouri2025@hotmail.com', 'سارة', 'المنصوري', '+971 555444555', 28, 'female', 'دبي', 'الإمارات العربية المتحدة', 'single', 'no_objection_polygamy', 0, 'دبي', 58, 165, 'medium', 'average', 'very_religious', 'pray_all', 'no', 'hijab', 'master', 'above_average', 'طبيبة أسنان', 'طبيبة أسنان', '12000_20000', 'excellent', 'طبيبة أسنان', 'high', 'طبيبة أسنان أعمل في عيادة خاصة في دبي، أحب مساعدة المرضى وتحسين ابتساماتهم. أقدر الدقة والجمال في العمل، وأعمل على تطوير مهاراتي باستمرار. في وقت فراغي أحب السفر والتصوير. أبحث عن شريك حياة متفهم ومتدين يدعم عملي ويقدر طموحاتي.', 'أبحث عن زوج صالح ومتدين', true, 'active', 'public', true, false, true, true, false, true, true, NOW(), NOW()),

-- امرأة مصرية - صيدلانية
(gen_random_uuid(), 'mona.ahmed2025@yahoo.com', 'منى', 'أحمد', '+20 1666777888', 25, 'female', 'الإسكندرية', 'مصر', 'single', 'only_wife', 0, 'الإسكندرية', 55, 160, 'olive', 'slim', 'religious', 'pray_all', 'no', 'hijab', 'bachelor', 'average', 'صيدلانية', 'صيدلانية', '3000_5000', 'good', 'صيدلانية', 'medium', 'صيدلانية أعمل في صيدلية مجتمعية، أحب مساعدة الناس في الحصول على الأدوية المناسبة وتقديم النصائح الصحية. أقدر العلم الطبي وأعمل على تطوير معرفتي باستمرار. في وقت فراغي أحب القراءة والطبخ. أبحث عن زوج صالح يقدر عملي ويشاركني اهتماماتي.', 'أبحث عن زوج صالح ومتدين', true, 'active', 'public', false, true, true, false, false, true, true, NOW(), NOW()),

-- امرأة أردنية - مهندسة معمارية
(gen_random_uuid(), 'rana.khouri2025@outlook.com', 'رنا', 'خوري', '+962 777999000', 27, 'female', 'عمان', 'الأردن', 'single', 'only_wife', 0, 'عمان', 62, 167, 'medium', 'average', 'religious', 'pray_sometimes', 'no', 'hijab', 'master', 'above_average', 'مهندسة معمارية', 'مهندسة معمارية', '5000_8000', 'very_good', 'مهندسة معمارية', 'medium', 'مهندسة معمارية أعمل في مكتب تصميم معماري، أحب الإبداع في التصميم والجمع بين الوظيفة والجمال. أقدر الفن والتراث المعماري، وأعمل على مشاريع متنوعة. في وقت فراغي أحب الرسم والتصوير المعماري. أبحث عن شريك حياة يقدر الفن والإبداع ويدعم طموحاتي.', 'أبحث عن زوج صالح ومتدين', true, 'active', 'public', true, true, true, true, false, true, true, NOW(), NOW()),

-- امرأة كويتية - محاسبة
(gen_random_uuid(), 'layla.alrashid2025@gmail.com', 'ليلى', 'الراشد', '+965 99776655', 29, 'female', 'الكويت', 'الكويت', 'single', 'no_objection_polygamy', 0, 'الكويت', 64, 162, 'fair', 'average', 'religious', 'pray_all', 'no', 'hijab', 'bachelor', 'above_average', 'محاسبة', 'محاسبة مالية', '8000_12000', 'good', 'محاسبة', 'high', 'محاسبة مالية أعمل في شركة استشارية، أتخصص في التدقيق المالي والتحليل. أحب الدقة والنظام في العمل، وأقدر الأمانة والشفافية. في وقت فراغي أحب القراءة في الاقتصاد والتطوير الذاتي. أبحث عن زوج صالح يفهم طبيعة عملي ويقدر طموحاتي المهنية.', 'أبحث عن زوج صالح ومتدين', true, 'active', 'public', false, false, true, true, false, true, true, NOW(), NOW());
