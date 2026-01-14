import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import HomePage from './pages/HomePage/HomePage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import { useSettingsStore } from './store/settingsStore';
import './App.css';

function App() {
  const { loadSettings, theme } = useSettingsStore();

  // 加载设置并应用主题
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const effectiveTheme = mediaQuery.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', effectiveTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
