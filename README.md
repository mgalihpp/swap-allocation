# Swap Allocation Calculator

Web calculator sederhana untuk menghitung alokasi token SOL ke spot dan bid/ask pool.

## Fitur

- Input total token SOL.
- Atur persentase spot allocation.
- Sisa allocation otomatis masuk ke `Bid / Ask`.
- UI dark flat dengan gaya swap form.
- Logo dan favicon Solana.

## Formula

Jika total token adalah `1 SOL` dan spot allocation `30%`:

```txt
Spot = 1 SOL x 30% = 0.3 SOL
Bid / Ask = 1 SOL x 70% = 0.7 SOL
```

## Development

Install dependencies:

```bash
npm install
```

Run local development server:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Tech Stack

- React
- TypeScript
- Vite
- CSS
