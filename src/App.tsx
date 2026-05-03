import { useApp } from '@/context/AppContext';
import { useRef, useState, useCallback } from 'react';
import { UploadScreen } from '@/components/Upload/UploadScreen';
import { DashboardPanel } from '@/components/Dashboard/DashboardPanel';
import { ChatPanel } from '@/components/Chat/ChatPanel';

const MIN_PANEL_PCT = 25;
const MAX_PANEL_PCT = 70;

export default function App() {
  const { state } = useApp();
  const [leftPct, setLeftPct] = useState(40);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPct(Math.min(MAX_PANEL_PCT, Math.max(MIN_PANEL_PCT, pct)));
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  if (state.status === 'empty') {
    return <UploadScreen />;
  }

  const { engine, lifeEvents, transactions } = state;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Header — mobile only */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <span className="font-display text-xl text-text-primary">Clarifi</span>
        <span className="text-text-muted text-xs font-mono">
          ${engine.currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Desktop 2-col layout */}
      <div
        ref={containerRef}
        className="hidden md:flex w-full"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Left — Dashboard */}
        <div
          className="border-r border-border overflow-y-auto px-5 py-6 flex-shrink-0"
          style={{ width: `${leftPct}%` }}
        >
          <div className="mb-6">
            <h1 className="font-display text-2xl text-text-primary">Clarifi</h1>
          </div>
          <DashboardPanel engine={engine} lifeEvents={lifeEvents} transactions={transactions} />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="w-1 flex-shrink-0 cursor-col-resize hover:bg-accent-blue/30 active:bg-accent-blue/50 transition-colors duration-150 group relative"
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" /> {/* wider hit area */}
        </div>

        {/* Right — Chat */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ChatPanel />
        </div>
      </div>

      {/* Mobile — stacked */}
      <div className="md:hidden flex flex-col w-full h-full pt-[52px]">
        {/* On mobile: dashboard collapses to a summary at top, chat takes main space */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Scrollable dashboard summary */}
          <div className="px-4 py-4 border-b border-border overflow-y-auto max-h-[45vh]">
            <DashboardPanel engine={engine} lifeEvents={lifeEvents} transactions={transactions} />
          </div>
          {/* Chat fills remaining */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
