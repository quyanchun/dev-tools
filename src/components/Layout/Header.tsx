import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  return (
    <header className="h-16 bg-base-100 shadow-sm flex items-center px-6">
      {/* Logo */}
      <div className="text-xl font-bold mr-8">DevTools</div>

      {/* Navigation */}
      <nav className="flex gap-4 flex-1">
        <Link
          to="/"
          className={`btn btn-ghost ${location.pathname === '/' ? 'btn-active' : ''}`}
        >
          首页
        </Link>
        <Link
          to="/manage"
          className={`btn btn-ghost ${location.pathname === '/manage' ? 'btn-active' : ''}`}
        >
          管理
        </Link>
        <Link
          to="/settings"
          className={`btn btn-ghost ${location.pathname === '/settings' ? 'btn-active' : ''}`}
        >
          设置
        </Link>
      </nav>

      {/* Toolbar */}
      <div className="flex gap-2">
        <button className="btn btn-ghost btn-circle">📋</button>
        <button className="btn btn-ghost btn-circle">🌙</button>
      </div>
    </header>
  );
}
