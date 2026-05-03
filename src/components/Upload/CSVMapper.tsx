import { useState } from 'react';
import { ColumnMapping } from '@/engine/parser';

interface CSVMapperProps {
  file: File;
  detectedMapping: ColumnMapping;
  onConfirm: (mapping: Partial<ColumnMapping>) => void;
  onCancel: () => void;
}

const COLUMN_LABELS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'date', label: 'Date column', required: true },
  { key: 'description', label: 'Description column', required: true },
  { key: 'amount', label: 'Amount column (signed)', required: false },
  { key: 'debit', label: 'Debit column (withdrawals)', required: false },
  { key: 'credit', label: 'Credit column (deposits)', required: false },
];

export function CSVMapper({ file, detectedMapping, onConfirm, onCancel }: CSVMapperProps) {
  // We'll read the headers from the file name hint — they're already in detectedMapping
  // In practice, the detected mapping already has the headers available
  const [mapping, setMapping] = useState<ColumnMapping>({ ...detectedMapping });

  // Extract available column names from what was detected
  const availableColumns = Object.values(detectedMapping).filter(Boolean) as string[];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h2 className="font-display text-3xl text-text-primary mb-2">Map your columns</h2>
        <p className="text-text-muted text-sm mb-6">
          We couldn't auto-detect the column layout of <span className="font-mono text-text-primary">{file.name}</span>.
          Please map each column manually.
        </p>

        <div className="space-y-4">
          {COLUMN_LABELS.map(({ key, label, required }) => (
            <div key={key}>
              <label className="block text-text-muted text-xs mb-1">
                {label} {required && <span className="text-accent-red">*</span>}
              </label>
              <input
                type="text"
                placeholder="Column header name"
                value={mapping[key] ?? ''}
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, [key]: e.target.value || null }))
                }
                list={`suggestions-${key}`}
                className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue transition-all duration-150"
              />
              <datalist id={`suggestions-${key}`}>
                {availableColumns.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          ))}
        </div>

        <p className="text-text-muted text-xs mt-3">
          You need either a signed <em>Amount</em> column, or both <em>Debit</em> and <em>Credit</em> columns.
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onConfirm(mapping)}
            className="flex-1 py-2 bg-accent-green text-black text-sm font-medium rounded transition-all duration-150 hover:opacity-80"
          >
            Continue
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-surface border border-border text-text-muted text-sm rounded transition-all duration-150 hover:border-text-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
