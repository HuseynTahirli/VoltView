'use client';

import { BellOff } from 'lucide-react';

interface AlertsEmptyStateProps {
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function AlertsEmptyState({ onRefresh, refreshing }: AlertsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon container */}
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
        style={{
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)',
        }}
      >
        <BellOff size={28} style={{ color: '#3b82f6', opacity: 0.7 }} strokeWidth={1.5} />
      </div>

      {/* Heading */}
      <h3 className="text-base font-semibold text-white mb-2">No Active Alerts</h3>

      {/* Description */}
      <p className="text-sm max-w-xs" style={{ color: '#555', lineHeight: '1.6' }}>
        Your device is running within normal limits. Alerts will appear here if a threshold is breached.
      </p>

      {/* Refresh button — only shown if a handler is provided */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="mt-6 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          style={{
            background: refreshing ? '#1a1a1a' : '#111',
            border: '1px solid #2a2a2a',
            color: refreshing ? '#444' : '#888',
            cursor: refreshing ? 'not-allowed' : 'pointer',
          }}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      )}
    </div>
  );
}
