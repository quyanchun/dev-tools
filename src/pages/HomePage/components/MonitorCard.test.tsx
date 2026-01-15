import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MonitorCard from './MonitorCard';
import type { Monitor } from '../../../types';

/**
 * Test suite for MonitorCard component
 * Validates: Requirements 5.1 - Click handler invocation
 */
describe('MonitorCard', () => {
  // Helper to create a mock monitor
  const createMockMonitor = (overrides: Partial<Monitor> = {}): Monitor => ({
    id: 'test-monitor-1',
    name: 'Test Monitor',
    icon: null,
    monitor_type: 'process',
    target: 'test-process',
    check_interval: 60,
    expected_result: null,
    alert_on_failure: true,
    is_active: true,
    last_check_time: null,
    last_status: 'running',
    folder_id: null,
    position: 0,
    created_at: Date.now(),
    ...overrides,
  });

  describe('Click Handler - Requirements 5.1', () => {
    it('should call onShowDetails with monitor when card is clicked', () => {
      const mockOnShowDetails = vi.fn();
      const monitor = createMockMonitor();

      render(
        <MonitorCard monitor={monitor} onShowDetails={mockOnShowDetails} />
      );

      // Find and click the card
      const card = screen.getByText('Test Monitor').closest('.glass-card');
      expect(card).toBeTruthy();
      
      fireEvent.click(card!);

      // Verify callback was called with the monitor object
      expect(mockOnShowDetails).toHaveBeenCalledTimes(1);
      expect(mockOnShowDetails).toHaveBeenCalledWith(monitor);
    });

    it('should call onShowDetails when clicking on inactive monitor card', () => {
      const mockOnShowDetails = vi.fn();
      const monitor = createMockMonitor({ is_active: false });

      render(
        <MonitorCard monitor={monitor} onShowDetails={mockOnShowDetails} />
      );

      const card = screen.getByText('Test Monitor').closest('.glass-card');
      fireEvent.click(card!);

      expect(mockOnShowDetails).toHaveBeenCalledTimes(1);
      expect(mockOnShowDetails).toHaveBeenCalledWith(monitor);
    });

    it('should pass the correct monitor object to onShowDetails', () => {
      const mockOnShowDetails = vi.fn();
      const monitor = createMockMonitor({
        id: 'unique-id-123',
        name: 'Unique Monitor',
        monitor_type: 'api',
        target: 'https://api.example.com',
        is_active: true,
        last_status: 'checking',
      });

      render(
        <MonitorCard monitor={monitor} onShowDetails={mockOnShowDetails} />
      );

      const card = screen.getByText('Unique Monitor').closest('.glass-card');
      fireEvent.click(card!);

      // Verify the exact monitor object was passed
      const calledWith = mockOnShowDetails.mock.calls[0][0];
      expect(calledWith.id).toBe('unique-id-123');
      expect(calledWith.name).toBe('Unique Monitor');
      expect(calledWith.monitor_type).toBe('api');
      expect(calledWith.target).toBe('https://api.example.com');
    });
  });
});
