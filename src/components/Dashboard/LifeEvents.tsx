import { useState } from 'react';
import { LifeEvent } from '@/types';
import { useApp } from '@/context/AppContext';
import { getNextMonthKey, formatMonthKey } from '@/utils/formatters';

function generateId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const TYPE_LABELS: Record<LifeEvent['type'], string> = {
  income_change: 'Income change',
  expense_change: 'Expense change',
  one_time_expense: 'One-time expense',
  one_time_income: 'One-time income',
};

interface LifeEventsProps {
  lifeEvents: LifeEvent[];
}

export function LifeEvents({ lifeEvents }: LifeEventsProps) {
  const { addLifeEvent, removeLifeEvent } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: '',
    startMonth: getNextMonthKey(),
    type: 'one_time_expense' as LifeEvent['type'],
    amount: '',
    ongoing: false,
  });

  const handleAdd = () => {
    const amount = parseFloat(form.amount);
    if (!form.label || isNaN(amount)) return;
    addLifeEvent({
      id: generateId(),
      label: form.label,
      startMonth: form.startMonth,
      type: form.type,
      amount,
      ongoing: form.ongoing,
    });
    setForm({
      label: '',
      startMonth: getNextMonthKey(),
      type: 'one_time_expense',
      amount: '',
      ongoing: false,
    });
    setShowForm(false);
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text-muted text-xs uppercase tracking-wider">Life Events</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-accent-blue text-xs hover:opacity-80 transition-all duration-150"
        >
          {showForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {/* Existing events */}
      {lifeEvents.length > 0 && (
        <div className="space-y-2">
          {lifeEvents.map((evt) => (
            <div
              key={evt.id}
              className="flex items-start justify-between gap-2 text-sm"
            >
              <div>
                <span className="text-text-primary">{evt.label}</span>
                <span className="text-text-muted ml-2 text-xs">
                  {formatMonthKey(evt.startMonth)} · {TYPE_LABELS[evt.type]}
                  {' · '}
                  <span className="font-mono">
                    {evt.type === 'one_time_expense' || evt.type === 'expense_change'
                      ? '-'
                      : '+'}
                    ${Math.abs(evt.amount).toLocaleString()}
                  </span>
                  {evt.ongoing && ' · ongoing'}
                </span>
              </div>
              <button
                onClick={() => removeLifeEvent(evt.id)}
                className="text-text-muted hover:text-accent-red text-xs transition-all duration-150 flex-shrink-0"
                aria-label="Remove event"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="space-y-3 pt-2 border-t border-border">
          <input
            type="text"
            placeholder="Label (e.g. Rent increase)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-all duration-150"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-text-muted text-xs block mb-1">Month</label>
              <input
                type="month"
                value={form.startMonth}
                onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-all duration-150"
              />
            </div>
            <div>
              <label className="text-text-muted text-xs block mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as LifeEvent['type'],
                    ongoing: e.target.value.includes('change'),
                  }))
                }
                className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-all duration-150"
              >
                {Object.entries(TYPE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <label className="text-text-muted text-xs block mb-1">Amount ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue transition-all duration-150"
              />
            </div>
            {(form.type === 'income_change' || form.type === 'expense_change') && (
              <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.ongoing}
                  onChange={(e) => setForm((f) => ({ ...f, ongoing: e.target.checked }))}
                  className="accent-accent-blue"
                />
                Ongoing
              </label>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.label || !form.amount}
            className="w-full py-2 bg-accent-blue text-white text-sm rounded transition-all duration-150 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to projection
          </button>
        </div>
      )}

      {lifeEvents.length === 0 && !showForm && (
        <p className="text-text-muted text-xs">
          No life events. Add upcoming income changes, large expenses, etc. to see how they affect your projection.
        </p>
      )}
    </div>
  );
}
