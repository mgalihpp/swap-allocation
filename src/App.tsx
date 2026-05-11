import { useMemo, useState } from 'react';

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 8,
    minimumFractionDigits: value > 0 && value < 1 ? 4 : 0,
  }).format(Number.isFinite(value) ? value : 0);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function App() {
  const token = 'SOL';
  const [total, setTotal] = useState(1);
  const [spotPercent, setSpotPercent] = useState(30);
  const [bidShare, setBidShare] = useState(50);

  const allocation = useMemo(() => {
    const safeTotal = Math.max(total || 0, 0);
    const safeSpotPercent = clamp(spotPercent || 0, 0, 100);
    const bidAskPercent = 100 - safeSpotPercent;
    const safeBidShare = clamp(bidShare || 0, 0, 100);
    const askShare = 100 - safeBidShare;
    const spot = safeTotal * (safeSpotPercent / 100);
    const bid = safeTotal * (bidAskPercent / 100) * (safeBidShare / 100);
    const ask = safeTotal * (bidAskPercent / 100) * (askShare / 100);

    return {
      total: safeTotal,
      spot,
      bid,
      ask,
      spotPercent: safeSpotPercent,
      bidPercent: (bidAskPercent * safeBidShare) / 100,
      askPercent: (bidAskPercent * askShare) / 100,
      bidAskPercent,
      bidShare: safeBidShare,
      askShare,
    };
  }, [bidShare, spotPercent, total]);

  const setNumber = (setter: (value: number) => void, min: number, max: number) => (value: string) => {
    const parsed = Number(value);
    setter(Number.isNaN(parsed) ? min : clamp(parsed, min, max));
  };

  return (
    <main className="shell">
      <section className="swap-widget">
        <div className="swap-card sell-card">
          <div className="card-label">Total token</div>
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
        </div>

        <button type="button" className="swap-arrow" aria-label="Calculate allocation">↓</button>

        <div className="swap-card buy-card">
          <div className="card-label">Allocation</div>
          <div className="allocation-bar" aria-label="Allocation bar">
            <span className="bar-spot" style={{ width: `${allocation.spotPercent}%` }} />
            <span className="bar-bid" style={{ width: `${allocation.bidPercent}%` }} />
            <span className="bar-ask" style={{ width: `${allocation.askPercent}%` }} />
          </div>
          <div className="result-list">
            <ResultRow label="Spot" amount={allocation.spot} percent={allocation.spotPercent} token={token} tone="spot" />
            <ResultRow label="Bid" amount={allocation.bid} percent={allocation.bidPercent} token={token} tone="bid" />
            <ResultRow label="Ask" amount={allocation.ask} percent={allocation.askPercent} token={token} tone="ask" />
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
              onChange={(event) => setSpotPercent(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Bid split</span>
            <strong>{allocation.bidShare}% / {allocation.askShare}%</strong>
            <input
              type="range"
              min="0"
              max="100"
              value={bidShare}
              onChange={(event) => setBidShare(Number(event.target.value))}
            />
          </label>
        </div>
      </section>
    </main>
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
  tone: 'spot' | 'bid' | 'ask';
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
