import { useSettingsStore, type Theme } from '../../../store/settingsStore';
import { ReactElement } from 'react';

export default function ThemeSelector() {
  const { theme, setTheme } = useSettingsStore();

  const themes: Array<{ value: Theme; label: string; icon: ReactElement; description: string }> = [
    {
      value: 'light',
      label: '亮色',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      description: '始终使用亮色主题'
    },
    {
      value: 'dark',
      label: '暗色',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
      description: '始终使用暗色主题'
    },
    {
      value: 'system',
      label: '跟随系统',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      description: '根据系统设置自动切换'
    },
  ];

  return (
    <div className="space-y-3">
      {themes.map((t) => (
        <div
          key={t.value}
          className={`glass-card p-4 cursor-pointer transition-all ${
            theme === t.value
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100'
              : 'hover:scale-[1.02]'
          }`}
          onClick={() => setTheme(t.value)}
        >
          <div className="flex items-center gap-4">
            <div className="text-primary">{t.icon}</div>
            <div className="flex-1">
              <h4 className="font-semibold">{t.label}</h4>
              <p className="text-sm text-base-content/60">{t.description}</p>
            </div>
            {theme === t.value && (
              <svg
                className="w-6 h-6 text-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
