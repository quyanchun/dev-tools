import type { Monitor, TargetStatus } from '../../../types';

/**
 * 目标状态显示配置
 */
export interface TargetStatusDisplay {
  /** 状态点的 CSS 类名 */
  dot: string;
  /** 显示的状态文本 */
  text: string;
  /** 文字颜色的 CSS 类名 */
  color: string;
  /** 是否显示动画 */
  animate: boolean;
  /** 动画类型: 'pulse' | 'blink' | null */
  animationType: 'pulse' | 'blink' | null;
}

/**
 * 根据监控对象的 is_active 和 last_status 返回正确的显示配置
 * 
 * 状态映射表:
 * | is_active | last_status | 状态文本 | 状态颜色 | 动画 |
 * |-----------|-------------|----------|----------|------|
 * | false     | *           | 未监控   | 灰色     | 无   |
 * | true      | running     | 运行中   | 绿色     | 脉冲 |
 * | true      | 其他        | 已停止   | 红色     | 无   |
 * 
 * @param monitor - 监控对象
 * @returns 目标状态显示配置
 * 
 * Requirements: 2.2, 2.3
 */
export function getTargetStatusDisplay(monitor: Monitor): TargetStatusDisplay {
  // 如果监控未启动，显示"未监控"
  if (!monitor.is_active) {
    return {
      dot: 'bg-base-300',
      text: '未监控',
      color: 'text-base-content/50',
      animate: false,
      animationType: null,
    };
  }

  // 只有 running 才是运行中，其他都是已停止
  if (monitor.last_status === 'running') {
    return {
      dot: 'bg-success',
      text: '运行中',
      color: 'text-success',
      animate: true,
      animationType: 'pulse',
    };
  }

  // stopped, checking, error, null, undefined 都显示"已停止"
  return {
    dot: 'bg-error',
    text: '已停止',
    color: 'text-error',
    animate: false,
    animationType: null,
  };
}
