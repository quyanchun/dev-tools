import { Link, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../../store/settingsStore';

export default function Header() {
  const location = useLocation();
  const { theme, setTheme } = useSettingsStore();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'dark':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
    }
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <header className="h-16 glass-header flex items-center px-6">
      {/* Logo */}
      <div className="text-xl font-semibold mr-8 text-base-content">DevTools</div>

      {/* Navigation */}
      <nav className="flex gap-2 flex-1">
        <Link
          to="/"
          className={`btn btn-ghost btn-sm ${location.pathname === '/' ? 'btn-active' : ''}`}
        >
          首页
        </Link>
        <Link
          to="/manage"
          className={`btn btn-ghost btn-sm ${location.pathname === '/manage' ? 'btn-active' : ''}`}
        >
          管理
        </Link>
        <Link
          to="/settings"
          className={`btn btn-ghost btn-sm ${location.pathname === '/settings' ? 'btn-active' : ''}`}
        >
          设置
        </Link>
      </nav>

      {/* Toolbar */}
      <div className="flex gap-2">
        <button
          className="btn btn-ghost btn-circle btn-sm"
          title="日志"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button
          className="btn btn-ghost btn-circle btn-sm"
          onClick={cycleTheme}
          title={`当前主题: ${theme === 'light' ? '亮色' : theme === 'dark' ? '暗色' : '跟随系统'}`}
        >
          {getThemeIcon()}
        </button>
      </div>
    </header>
  );
}
