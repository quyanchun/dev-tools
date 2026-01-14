import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 全局背景 */}
      <div className="launchpad-background"></div>

      {/* Header */}
      <Header />

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
}
