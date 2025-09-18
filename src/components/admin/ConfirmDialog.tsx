import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  console.log('🔍 ConfirmDialog rendering with:', { isOpen, title, type });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px'
      }}
      onClick={(e) => {
        console.log('🔍 Modal backdrop clicked');
        if (e.target === e.currentTarget) {
          console.log('🚫 Closing modal via backdrop click');
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '2px solid #e5e7eb'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            backgroundColor: type === 'danger' ? '#fee2e2' :
              type === 'warning' ? '#fef3c7' : '#dbeafe'
          }}>
            {type === 'danger' ? '❌' :
             type === 'warning' ? '⚠️' : '✅'}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              {title}
            </h3>
          </div>
        </div>
        <p style={{ 
          color: '#6b7280', 
          marginBottom: '24px', 
          lineHeight: '1.6', 
          whiteSpace: 'pre-line', 
          margin: '0 0 24px 0' 
        }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              console.log('🚫 Cancel button clicked');
              onCancel();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              console.log('✅ Confirm button clicked');
              onConfirm();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: type === 'danger' ? '#dc2626' :
                type === 'warning' ? '#d97706' : '#2563eb',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
