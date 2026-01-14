import ThemeSelector from './components/ThemeSelector';
import GeneralSettings from './components/GeneralSettings';

export default function SettingsPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">设置</h1>
        <p className="text-base-content/60 mb-8">管理应用的外观和行为</p>

        <div className="space-y-8">
          {/* 外观设置 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">外观</h2>
            <ThemeSelector />
          </section>

          {/* 通用设置 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">通用</h2>
            <GeneralSettings />
          </section>

          {/* 关于 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">关于</h2>
            <div className="glass-card p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-base-content/60">应用名称</span>
                  <span className="font-medium">DevTools</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">版本</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">框架</span>
                  <span className="font-medium">Tauri v2 + React 18</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
