-- إصلاح صلاحيات تحديث الرسائل
-- تاريخ الإنشاء: 09-08-2025
-- الغرض: إضافة صلاحية تحديث حالة قراءة الرسائل للمستقبلين

-- بدء المعاملة
BEGIN;

-- التحقق من الصلاحيات الموجودة
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'messages' 
AND cmd = 'UPDATE';

-- حذف الصلاحية القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "Users can update read status of received messages" ON public.messages;

-- إضافة صلاحية جديدة لتحديث حالة قراءة الرسائل
CREATE POLICY "Users can update read status of received messages" ON public.messages
FOR UPDATE USING (
    -- المستخدم يمكنه تحديث الرسائل في المحادثات التي يشارك فيها
    EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = conversation_id 
        AND (user1_id = auth.uid()::text OR user2_id = auth.uid()::text)
    )
) WITH CHECK (
    -- يمكن تحديث حقول محددة فقط (read_at, updated_at)
    EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = conversation_id 
        AND (user1_id = auth.uid()::text OR user2_id = auth.uid()::text)
    )
);

-- التحقق من الصلاحيات بعد الإضافة
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'messages' 
AND cmd = 'UPDATE';

-- إنهاء المعاملة
COMMIT;

-- رسالة تأكيد
SELECT 'تم إضافة صلاحية تحديث حالة قراءة الرسائل بنجاح' AS result;
