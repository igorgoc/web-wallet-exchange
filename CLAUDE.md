# ProximaX Sirius Web Wallet & CLOB DEX - Claude Code Guide

Welcome! This file provides essential guidelines and context for working with the **ProximaX Sirius Web Wallet & Decentralized Exchange (DEX)** frontend.

---

## 1. Project Overview

- **Stack**: Vue 3 (Composition API / `<script setup>`), TypeScript, Tailwind CSS / custom styling, Vite.
- **Port**: Runs on port `3030` (`http://localhost:3030`).
- **Core Features**:
  - Sirius Web Wallet (account creation, balance tracking, transfers, namespaces, mosaics).
  - CLOB Exchange Interface (`src/modules/services/submodule/clob/views/ViewClobExchange.vue` at route `/#/clob-exchange`).
  - Cross-Chain Bridge UI (`/#/swap`).
  - Testnet 2 1-Click Faucet and 1-Click Automated Deposits/Withdrawals.

---

## 2. Key Architectural Invariants

### A. CLOB API Base Resolution
- `CLOB_API_BASE` is resolved dynamically:
  - If running behind Cloudflare Tunnel or reverse proxy, it uses `window.location.origin`.
  - If running locally on `:3030`, it connects to `http://localhost:8088` (the Cockpit / CLOB Relayer).

### B. Network Profiles & Mosaics
- **Testnet 2 (Network 168)**:
  - XPX: `0x13BFC518E40549D7` (Dec: `1423072717967804887`)
  - USDT: `0x4430AEFEF7E15D0C` (Dec: `4913619603564879116`)
  - BNB: `0x3CC1D3CE7447B6F9` (Dec: `4378013196448413433`)
- **Mainnet (Network 184)**:
  - XPX: `0x402B2F579FA859B8`
  - USDT: `0x7525381A171D1E44`
  - BNB: `0x1E5C5FADEC7B34DD`

### C. Key Privacy & Signing
- Private keys must never be logged or transmitted in plain text across unauthenticated boundaries.
- 1-Click deposits decrypt the key temporarily in browser memory, sign the deposit transfer on-chain to the vault address, and immediately wipe the key.

---

## 3. Standard Commands

```bash
# Install dependencies
npm install

# Start development server on port 3030
npm run dev -- --port 3030

# Build production bundle
npm run build
```

---

## 4. Sister Projects

- **CLOB Relayer & WASM Sandbox**: `/Users/igorgoc/Projects/sirius-supercontract-sandbox` (Cockpit API on port :8088, WASM cluster on :5051-:5053).
- **Native Node Supervisor**: `/Users/igorgoc/Projects/proximax-sirius-core-native`
