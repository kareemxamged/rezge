import { useState, useEffect } from 'react';
import { verificationService } from '../lib/verificationService';

interface VerificationStatus {
  isVerified: boolean;
  isPending: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useVerificationStatus = (userId: string): VerificationStatus => {
  const [isVerified, setIsVerified] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkVerificationStatus = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // فحص حالة التوثيق من المستخدم (من جدول users)
      // هذا سيتم تنفيذه عبر API call أو من context المستخدم
      // للآن سنستخدم طريقة مبسطة

      // فحص وجود طلب توثيق نشط
      const result = await verificationService.getCurrentRequest(userId);
      
      if (result.success && result.data) {
        const request = result.data;
        // إذا كان هناك طلب نشط
        if (request.status === 'pending' || request.status === 'under_review') {
          setIsPending(true);
          setIsVerified(false);
        } else if (request.status === 'approved') {
          setIsPending(false);
          setIsVerified(true);
        } else {
          setIsPending(false);
          setIsVerified(false);
        }
      } else {
        // لا يوجد طلب نشط، فحص حالة التوثيق من بيانات المستخدم
        setIsPending(false);
        // هنا يجب فحص حالة verified من بيانات المستخدم
        // سنتركها false للآن حتى نحصل على البيانات من المكون الأب
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في فحص حالة التوثيق');
      setIsPending(false);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkVerificationStatus();
  }, [userId]);

  const refresh = () => {
    checkVerificationStatus();
  };

  return {
    isVerified,
    isPending,
    isLoading,
    error,
    refresh
  };
};

// Hook مبسط للاستخدام مع بيانات المستخدم المتاحة
export const useSimpleVerificationStatus = (userVerified: boolean, userId: string) => {
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkPendingStatus = async () => {
      if (userVerified || !userId) return;

      try {
        setIsLoading(true);
        const result = await verificationService.getCurrentRequest(userId);
        
        if (result.success && result.data) {
          const request = result.data;
          setIsPending(
            request.status === 'pending' || 
            request.status === 'under_review'
          );
        } else {
          setIsPending(false);
        }
      } catch (error) {
        setIsPending(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPendingStatus();
  }, [userVerified, userId]);

  return {
    isVerified: userVerified,
    isPending,
    isLoading
  };
};
