import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Download, Home } from "lucide-react";
import { invoke } from '@tauri-apps/api/core';
import { useRef, useState } from "react";

interface AlertModal {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const showBtn = location.pathname !== '/' && location.pathname !== '/menu';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertModal, setAlertModal] = useState<AlertModal | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        setAlertModal({
          type: 'error',
          title: 'Ошибка JSON',
          message: 'Файл не является корректным JSON-файлом.',
        });
        return;
      }

      if (!data.scenario_id) {
        setAlertModal({
          type: 'error',
          title: 'Неверный формат',
          message: 'Отсутствует обязательное поле scenario_id в файле сценария.',
        });
        return;
      }

      await invoke('save_scenario', { id: data.scenario_id, content: JSON.stringify(data, null, 2) });
      setAlertModal({
        type: 'success',
        title: 'Сценарий импортирован',
        message: `«${data.title || data.scenario_id}» успешно добавлен в список сценариев.`,
      });
      window.dispatchEvent(new CustomEvent('scenarioImported'));
    } catch (err) {
      console.error("Failed to import scenario:", err);
      setAlertModal({
        type: 'error',
        title: 'Ошибка импорта',
        message: typeof err === 'string' ? err : 'Не удалось импортировать файл. Убедитесь, что формат соответствует требованиям.',
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBtn && (
            <>
              <button onClick={() => navigate('/menu')} className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors" title="На главную">
                <Home size={20} />
              </button>
            </>
          )}
          <h1 className="text-xl font-bold text-gray-800">Симулятор Системного Аналитика</h1>
        </div>

        { !showBtn && (
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 rounded-md transition-colors" title="Импортировать сценарий из файла">
              <Download size={16} /> Загрузить Сценарий
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Custom Alert Modal */}
      {alertModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setAlertModal(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              animation: 'modalIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: alertModal.type === 'success'
                ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                : 'linear-gradient(135deg, #fee2e2, #fecaca)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              {alertModal.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              {alertModal.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px', lineHeight: 1.5 }}>
              {alertModal.message}
            </p>

            <button
              onClick={() => setAlertModal(null)}
              style={{
                padding: '10px 32px',
                borderRadius: '10px',
                border: 'none',
                background: alertModal.type === 'success'
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #6b7280, #4b5563)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: alertModal.type === 'success'
                  ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                  : '0 2px 8px rgba(107, 114, 128, 0.3)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
