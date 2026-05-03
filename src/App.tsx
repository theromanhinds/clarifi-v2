import { useApp } from '@/context/AppContext';
import { useRef, useState, useCallback, useEffect } from 'react';
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

  // Mobile state
  const [mobileView, setMobileView] = useState<'dashboard' | 'chat'>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Close drawer on escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (state.status === 'empty') {
    return <UploadScreen />;
  }

  const { engine, lifeEvents, transactions } = state;

  const switchView = (view: 'dashboard' | 'chat') => {
    setMobileView(view);
    setDrawerOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop 2-col layout (≥800px) ──────────────────────────────── */}
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
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Right — Chat */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ChatPanel />
        </div>
      </div>

      {/* ── Mobile layout (<800px) ──────────────────────────────────────── */}
      <div className="md:hidden flex flex-col w-full h-full">

        {/* Mobile header */}
        <div className="flex-shrink-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          {/* Hamburger / close */}
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] w-8 h-8 -ml-1"
            aria-label="Open navigation"
          >
            <span className={`block h-px bg-text-primary transition-all duration-200 origin-center ${drawerOpen ? 'rotate-45 translate-y-[6px]' : ''}`} />
            <span className={`block h-px bg-text-primary transition-all duration-200 ${drawerOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block h-px bg-text-primary transition-all duration-200 origin-center ${drawerOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} />
          </button>

          <span className="font-display text-xl text-text-primary">Clarifi</span>

          <div className="w-8" />{/* spacer to keep title centered */}
        </div>

        {/* Content area (drawer + view stacked) */}
        <div className="flex-1 overflow-hidden relative">

          {/* Side drawer */}
          <div
            className={`absolute inset-y-0 left-0 z-30 w-64 bg-surface border-r border-border flex flex-col py-6 px-4 transition-transform duration-250 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <p className="text-text-muted text-xs uppercase tracking-wider mb-4">Views</p>
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => switchView('dashboard')}
                className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 ${mobileView === 'dashboard' ? 'bg-accent-blue/15 text-accent-blue' : 'text-text-primary hover:bg-border'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => switchView('chat')}
                className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 ${mobileView === 'chat' ? 'bg-accent-blue/15 text-accent-blue' : 'text-text-primary hover:bg-border'}`}
              >
                Chat with Claire
              </button>
            </nav>
          </div>

          {/* Backdrop */}
          {drawerOpen && (
            <div
              className="absolute inset-0 z-20 bg-black/50"
              onClick={() => setDrawerOpen(false)}
            />
          )}

          {/* Active view */}
          <div className="h-full overflow-hidden">
            {mobileView === 'dashboard' ? (
              <div className="h-full overflow-y-auto px-4 py-5">
                <DashboardPanel engine={engine} lifeEvents={lifeEvents} transactions={transactions} />
              </div>
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                <ChatPanel />
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
