import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

const STORAGE_KEY = 'swap-calculator-state';
const defaultShortcuts = [1, 5];
const allocationBars = Array.from({ length: 84 }, (_, index) => ({ index }));

type StoredState = {
  total?: number;
  spotPercent?: number;
  shortcutAmounts?: number[];
  customShortcut?: number;
  customShortcuts?: number[];
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 8,
    minimumFractionDigits: value > 0 && value < 1 ? 4 : 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatShortcut = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 8,
  }).format(Number.isFinite(value) ? value : 0);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseStoredNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
};

const parseStoredShortcuts = (value: unknown, fallbackShortcut: number) => {
  const shortcuts = Array.isArray(value) ? value : fallbackShortcut > 0 ? [fallbackShortcut] : [];

  return [...new Set(shortcuts
    .map((shortcut) => Number(shortcut))
    .filter((shortcut) => Number.isFinite(shortcut) && shortcut > 0)
    .map((shortcut) => Number(shortcut.toFixed(8))))];
};

const getInitialState = (): Required<StoredState> => {
  if (typeof window === 'undefined') {
    return { total: 1, spotPercent: 30, shortcutAmounts: defaultShortcuts, customShortcut: 0, customShortcuts: [] };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { total: 1, spotPercent: 30, shortcutAmounts: defaultShortcuts, customShortcut: 0, customShortcuts: [] };
    }

    const parsed = JSON.parse(stored) as StoredState;
    const legacyCustomShortcut = parseStoredNumber(parsed.customShortcut, 0, 0, Number.MAX_SAFE_INTEGER);
    const legacyCustomShortcuts = parseStoredShortcuts(parsed.customShortcuts, legacyCustomShortcut);
    const shortcutAmounts = Object.prototype.hasOwnProperty.call(parsed, 'shortcutAmounts')
      ? parseStoredShortcuts(parsed.shortcutAmounts, 0)
      : parseStoredShortcuts([...defaultShortcuts, ...legacyCustomShortcuts], 0);

    return {
      total: parseStoredNumber(parsed.total, 1, 0, Number.MAX_SAFE_INTEGER),
      spotPercent: parseStoredNumber(parsed.spotPercent, 30, 0, 100),
      shortcutAmounts,
      customShortcut: 0,
      customShortcuts: [],
    };
  } catch {
    return { total: 1, spotPercent: 30, shortcutAmounts: defaultShortcuts, customShortcut: 0, customShortcuts: [] };
  }
};

export function App() {
  const token = 'SOL';
  const initialState = useMemo(getInitialState, []);
  const [total, setTotal] = useState(initialState.total);
  const [spotPercent, setSpotPercent] = useState(initialState.spotPercent);
  const [shortcutAmounts, setShortcutAmounts] = useState(initialState.shortcutAmounts);
  const [shortcutInput, setShortcutInput] = useState('');
  const [isShortcutPanelOpen, setIsShortcutPanelOpen] = useState(false);
  const [isShortcutsExpanded, setIsShortcutsExpanded] = useState(false);
  const shortcutInputValue = Number(shortcutInput);
  const canApplyShortcut = Number.isFinite(shortcutInputValue) && shortcutInputValue > 0;

  const persistState = (nextState: StoredState) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        total,
        spotPercent,
        shortcutAmounts,
        ...nextState,
      }),
    );
  };

  const setTotalToken = (value: number) => {
    setTotal(value);
    persistState({ total: value });
  };

  const allocation = useMemo(() => {
    const safeTotal = Math.max(total || 0, 0);
    const safeSpotPercent = clamp(spotPercent || 0, 0, 100);
    const bidAskPercent = 100 - safeSpotPercent;
    const spot = safeTotal * (safeSpotPercent / 100);
    const bidAsk = safeTotal * (bidAskPercent / 100);

    return {
      total: safeTotal,
      spot,
      bidAsk,
      spotPercent: safeSpotPercent,
      bidAskPercent,
    };
  }, [spotPercent, total]);
  const spotBarCount = Math.round((allocation.spotPercent / 100) * allocationBars.length);

  const setNumber = (setter: (value: number) => void, min: number, max: number) => (value: string) => {
    const parsed = Number(value);
    const nextValue = Number.isNaN(parsed) ? min : clamp(parsed, min, max);
    setter(nextValue);
    persistState({ total: nextValue });
  };

  const updateSpotPercent = (value: number) => {
    const nextValue = clamp(value, 0, 100);
    setSpotPercent(nextValue);
    persistState({ spotPercent: nextValue });
  };

  const applyShortcutInput = () => {
    const nextShortcut = Number(shortcutInput);
    if (!Number.isFinite(nextShortcut) || nextShortcut <= 0) {
      return;
    }

    const normalizedShortcut = Number(nextShortcut.toFixed(8));
    const nextShortcuts = [...new Set([...shortcutAmounts, normalizedShortcut])].sort((left, right) => left - right);
    setShortcutAmounts(nextShortcuts);
    setTotalToken(normalizedShortcut);
    persistState({ total: normalizedShortcut, shortcutAmounts: nextShortcuts });
    setIsShortcutPanelOpen(false);
  };

  const removeShortcut = (shortcut: number) => {
    const nextShortcuts = shortcutAmounts.filter((item) => item !== shortcut);
    setShortcutAmounts(nextShortcuts);
    persistState({ shortcutAmounts: nextShortcuts });
  };

  const visibleShortcuts = [...shortcutAmounts].sort(
    (left, right) => left - right,
  );

  return (
    <main className="shell">
      <section className="swap-widget">
        <div className="swap-card sell-card">
          <div className="card-heading">
            <div className="card-label">Total token</div>
          </div>
          <div className="amount-row">
            <input
              className="amount-input"
              type="number"
              min="0"
              step="0.0001"
              value={total}
              onChange={(event) => setNumber(setTotal, 0, Number.MAX_SAFE_INTEGER)(event.target.value)}
              aria-label="Total token"
            />
            <div className="token-pill">
              <SolanaLogo />
              <span className="token-symbol">SOL</span>
            </div>
          </div>
          <div className="shortcut-actions">
            {visibleShortcuts.map((shortcut) => (
              isShortcutsExpanded ? (
                <span key={shortcut} className="shortcut-bubble">
                  <button type="button" onClick={() => setTotalToken(shortcut)}>
                    {formatShortcut(shortcut)}
                  </button>
                  <button type="button" aria-label={`Remove ${shortcut} ${token}`} onClick={() => removeShortcut(shortcut)}>
                    <CloseIcon />
                  </button>
                </span>
              ) : (
                <button key={shortcut} type="button" onClick={() => setTotalToken(shortcut)}>
                  {formatShortcut(shortcut)}
                </button>
              )
            ))}
            {!isShortcutsExpanded ? (
              <button type="button" onClick={() => setIsShortcutsExpanded(true)}>%</button>
            ) : (
              <>
                <button type="button" className="manage-trigger" aria-label="Custom amount" onClick={() => setIsShortcutPanelOpen(true)}>
                  <SlidersIcon />
                </button>
                <button type="button" className="manage-trigger" aria-label="Collapse shortcuts" onClick={() => setIsShortcutsExpanded(false)}>
                  <CloseIcon />
                </button>
              </>
            )}
          </div>
          {isShortcutPanelOpen && (
            <div className="shortcut-popover" role="dialog" aria-label="Manage shortcuts">
              <div className="popover-heading">
                <strong>Swap amount</strong>
                <button type="button" aria-label="Close shortcuts" onClick={() => setIsShortcutPanelOpen(false)}>
                  <CloseIcon />
                </button>
              </div>
              <form
                className="shortcut-input-wrap"
                onSubmit={(event) => {
                  event.preventDefault();
                  applyShortcutInput();
                }}
              >
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={shortcutInput}
                  onChange={(event) => setShortcutInput(event.target.value)}
                  placeholder="0.00"
                  aria-label="Shortcut amount"
                />
                <span>{token}</span>
              </form>
              <div className="popover-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShortcutInput('');
                  }}
                >
                  Reset
                </button>
                <button type="button" className={canApplyShortcut ? 'apply-button ready' : 'apply-button'} disabled={!canApplyShortcut} onClick={applyShortcutInput}>Apply</button>
              </div>
            </div>
          )}
        </div>

        <button type="button" className="swap-arrow" aria-label="Calculate allocation">↓</button>

        <div className="swap-card buy-card">
          <div className="card-label">Allocation</div>
          <div
            className="allocation-bar"
            aria-label="Allocation bar"
            style={{ '--spot-width': `${allocation.spotPercent}%` } as CSSProperties}
          >
            {allocationBars.map((bar) => (
              <AllocationBar key={bar.index} index={bar.index} spotBarCount={spotBarCount} />
            ))}
          </div>
          <div className="result-list">
            <ResultRow label="Spot" amount={allocation.spot} percent={allocation.spotPercent} token={token} tone="spot" />
            <ResultRow label="Bid / Ask" amount={allocation.bidAsk} percent={allocation.bidAskPercent} token={token} tone="bid" />
          </div>
        </div>

        <div className="controls-strip">
          <label>
            <span>Spot</span>
            <strong>{allocation.spotPercent}%</strong>
            <input
              type="range"
              min="0"
              max="100"
              value={spotPercent}
              onChange={(event) => updateSpotPercent(Number(event.target.value))}
            />
          </label>
        </div>
      </section>
    </main>
  );
}

function AllocationBar({ index, spotBarCount }: { index: number; spotBarCount: number }) {
  const isSpot = index < spotBarCount;
  const bidBarCount = allocationBars.length - spotBarCount;
  const bidIndex = index - spotBarCount;
  const bidProgress = bidBarCount <= 1 ? 0 : bidIndex / (bidBarCount - 1);
  const height = isSpot ? 72 : Math.max(4, 100 - Math.pow(bidProgress, 1.55) * 96);

  return <span className={isSpot ? 'bar-spot' : 'bar-bid'} style={{ height: `${height}%` }} />;
}

function SlidersIcon() {
  return (
    <svg className="action-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 6.5h7.2M14.8 6.5H16M4 13.5h1.2M8.8 13.5H16" />
      <circle cx="13" cy="6.5" r="1.8" />
      <circle cx="7" cy="13.5" r="1.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="action-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 6l8 8M14 6l-8 8" />
    </svg>
  );
}

function SolanaLogo() {
  return (
    <svg className="solana-logo" viewBox="0 0 397.7 311.7" role="img" aria-label="Solana logo">
      <defs>
        <linearGradient id="solana-a" x1="360.879" x2="141.213" y1="351.455" y2="-69.293" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id="solana-b" x1="264.829" x2="45.163" y1="401.601" y2="-19.147" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id="solana-c" x1="312.549" x2="92.883" y1="376.688" y2="-44.061" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path fill="url(#solana-a)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7Z" />
      <path fill="url(#solana-b)" d="M64.6 3.8C67 1.4 70.3 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8Z" />
      <path fill="url(#solana-c)" d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7Z" />
    </svg>
  );
}

function ResultRow({
  label,
  amount,
  percent,
  token,
  tone,
}: {
  label: string;
  amount: number;
  percent: number;
  token: string;
  tone: 'spot' | 'bid';
}) {
  return (
    <div className={`result-row ${tone}`}>
      <div>
        <span>{label}</span>
        <small>{formatAmount(percent)}% dari total</small>
      </div>
      <strong>{formatAmount(amount)} {token || 'TOKEN'}</strong>
    </div>
  );
}
