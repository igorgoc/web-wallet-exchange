<template>
  <div class="clob-wrapper">
    <!-- Top Bar / Cockpit Header -->
    <header class="clob-header">
      <div class="header-left">
        <!-- Back to Wallet Button -->
        <router-link to="/dashboard" class="back-wallet-btn" title="Back to Wallet Dashboard">
          <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Wallet</span>
        </router-link>

        <!-- Trading Pair Switcher (XPX/USDT & XPX/BNB) -->
        <div class="pair-selector">
          <button 
            type="button"
            class="pair-tab-btn" 
            :class="{ active: selectedPair === 'XPX/USDT' }"
            @click="switchPair('XPX/USDT')"
          >
            XPX / USDT
          </button>
          <button 
            type="button"
            class="pair-tab-btn" 
            :class="{ active: selectedPair === 'XPX/BNB' }"
            @click="switchPair('XPX/BNB')"
          >
            XPX / BNB
          </button>
        </div>

        <div class="stat-item main-price">
          <span class="stat-val font-mono stat-price-white">{{ formatCleanPrice(currentPrice) }}</span>
          <span class="stat-change" :class="lastTradeSide === 'buy' ? 'up' : 'down'">+4.16%</span>
        </div>

        <div class="stat-sep"></div>

        <div class="stat-item">
          <span class="stat-lbl">24h High</span>
          <span class="stat-val font-mono">{{ formatCleanPrice(high24h) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-lbl">24h Low</span>
          <span class="stat-val font-mono">{{ formatCleanPrice(low24h) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-lbl">24h Volume</span>
          <span class="stat-val font-mono">{{ volume24h.toLocaleString() }} XPX</span>
        </div>
      </div>

      <!-- SIRIUS CLOB Brand Badge (Center Empty Space) -->
      <div class="header-center">
        <div class="sirius-clob-badge" title="SiriusCLOB Decentralized Central Limit Order Book • Powered by ProximaX XPX SuperContract WASM Consensus">
          <div class="badge-xpx-pill">
            <img src="@/modules/dashboard/img/icon-xpx.svg" alt="XPX" class="badge-xpx-icon" />
            <span class="badge-xpx-text">XPX</span>
          </div>
          <div class="badge-divider"></div>
          <div class="badge-content">
            <span class="badge-brand">SIRIUS</span>
            <span class="badge-highlight">CLOB</span>
            <span class="badge-sub">DEX</span>
          </div>
          <span class="badge-chip">SuperContract</span>
        </div>
      </div>

      <div class="header-right">
        <!-- User Active Wallet & Tradeable Balance Area -->
        <div class="wallet-balance-area font-mono" v-if="activeAccount">
          <span class="wallet-addr">{{ shortAddress(activeAccount.address) }}</span>
          <span class="bal-sep">•</span>
          <span class="bal-val text-emerald-400" title="Tradeable XPX">{{ totalAvailableXpx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} XPX</span>
          <span class="bal-sep">•</span>
          <span v-if="isBnbPair" class="bal-val text-emerald-400" title="Tradeable BNB">{{ totalAvailableBnb.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 }) }} BNB</span>
          <span v-else class="bal-val text-emerald-400" title="Tradeable USDT">${{ totalAvailableUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} USDT</span>
          <button class="withdraw-pill ml-2" @click="openWithdrawModal" title="Withdraw funds from CLOB Vault to L1 wallet">
            Withdraw
          </button>
        </div>

        <!-- Dev & Tools Menu Popover (...) -->
        <div class="dev-menu-wrapper" style="position: relative;">
          <button 
            type="button" 
            class="icon-btn-dots" 
            @click="showDevMenu = !showDevMenu" 
            title="Developer Tools & Diagnostics"
          >
            •••
          </button>

          <div v-if="showDevMenu" class="dev-dropdown-popover" @click.stop>
            <div v-if="getActiveNetworkId() !== 184 && isFaucetSupported" class="dev-dropdown-item" @click="claimFaucet(); showDevMenu = false">
              <span class="dev-item-icon">💧</span>
              <div>
                <div class="dev-item-title">Claim On-Chain Faucet (Testnet)</div>
                <div class="dev-item-sub">+10 XPX, +50 USDT &amp; +0.05 BNB</div>
              </div>
            </div>
            <div class="dev-dropdown-item" @click="toggleMarketMaker(); showDevMenu = false">
              <span class="dev-item-icon">🤖</span>
              <div>
                <div class="dev-item-title">{{ isMmRunning ? 'Pause Market Maker' : 'Start Market Maker' }}</div>
                <div class="dev-item-sub">{{ isMmRunning ? 'MM Running' : 'MM Idle' }}</div>
              </div>
            </div>
            <div class="dev-dropdown-item" @click="flushBatchSettlement(); showDevMenu = false">
              <span class="dev-item-icon">⚡</span>
              <div>
                <div class="dev-item-title">Flush On-Chain Batch</div>
                <div class="dev-item-sub">{{ pendingBatchCount }} Pending Payouts</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Small Dot Connection Indicator -->
        <div class="conn-dot-container" :title="isConnected ? 'Connected to SiriusCLOB' : 'Offline'">
          <span class="conn-dot" :class="isConnected ? 'online' : 'offline'"></span>
        </div>
      </div>
    </header>

    <!-- Main Trading Grid -->
    <main class="clob-grid">
      <!-- Center-Left Column: Chart + Compact Bottom Panel -->
      <section class="chart-and-orders-col">
        <!-- Candlestick Chart Panel (TradingView Lightweight Charts) -->
        <div class="panel chart-panel">
          <div class="panel-header">
            <div class="chart-header-left">
              <span class="font-bold text-slate-200">{{ selectedPair }}</span>
              <div class="ohlc-bar font-mono" v-if="hoverCandle || latestCandle">
                <span class="lbl">O</span><span class="ohlc-val" :class="(hoverCandle || latestCandle)!.c >= (hoverCandle || latestCandle)!.o ? 'up' : 'down'">{{ formatCleanPrice((hoverCandle || latestCandle)!.o) }}</span>
                <span class="lbl">H</span><span class="ohlc-val">{{ formatCleanPrice((hoverCandle || latestCandle)!.h) }}</span>
                <span class="lbl">L</span><span class="ohlc-val">{{ formatCleanPrice((hoverCandle || latestCandle)!.l) }}</span>
                <span class="lbl">C</span><span class="ohlc-val" :class="(hoverCandle || latestCandle)!.c >= (hoverCandle || latestCandle)!.o ? 'up' : 'down'">{{ formatCleanPrice((hoverCandle || latestCandle)!.c) }}</span>
                <span class="lbl ml-2">Vol</span><span class="ohlc-val text-slate-300">{{ ((hoverCandle || latestCandle)!.v || 0).toLocaleString() }}</span>
              </div>
            </div>
            <div class="chart-actions">
              <button 
                v-for="tf in (['1m', '5m', '15m', '1h'] as const)" 
                :key="tf"
                class="chart-btn"
                :class="{ active: activeInterval === tf }"
                @click="changeInterval(tf)"
              >
                {{ tf }}
              </button>
            </div>
          </div>
          <div class="tv-chart-container" ref="chartContainerRef"></div>
        </div>

        <!-- Compact Bottom Panel: Open Orders & My Trades -->
        <div class="panel orders-tabs-panel compact-panel">
          <div class="panel-header tab-header">
            <div class="tabs">
              <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'orders' }" 
                @click="activeTab = 'orders'"
              >
                Open Orders ({{ myOpenOrders.length }})
              </button>
              <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'myTrades' }" 
                @click="activeTab = 'myTrades'"
              >
                My Trades ({{ myTrades.length }})
              </button>
            </div>
            <button 
              v-if="activeTab === 'orders' && myOpenOrders.length > 0" 
              class="cancel-all-btn" 
              @click="cancelAllOrders" 
              title="Cancel all open orders on this pair"
            >
              Cancel All
            </button>
          </div>

          <div class="tab-content">
            <!-- Open Orders Table -->
            <div v-if="activeTab === 'orders'" class="table-container">
              <table class="clob-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Type</th>
                    <th>Side</th>
                    <th>Price ({{ quoteSymbol }})</th>
                    <th>Amount (XPX)</th>
                    <th>Filled</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="order in myOpenOrders" :key="order.id">
                    <td class="font-mono text-slate-400">#{{ order.id }}</td>
                    <td>{{ order.type || 'Limit' }}</td>
                    <td :class="order.side === 'Buy' ? 'text-emerald-400' : 'text-rose-400'" class="font-bold">
                      {{ order.side }}
                    </td>
                    <td class="font-mono">{{ formatCleanPrice(order.price) }}</td>
                    <td class="font-mono">{{ order.amount.toLocaleString() }}</td>
                    <td class="font-mono">{{ order.filled || '0%' }}</td>
                    <td class="text-right">
                      <button class="cancel-btn" @click="cancelOrder(order.id)">Cancel</button>
                    </td>
                  </tr>
                  <tr v-if="myOpenOrders.length === 0">
                    <td colspan="7" class="empty-state">No open orders</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- My Trades Table -->
            <div v-if="activeTab === 'myTrades'" class="table-container">
              <table class="clob-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Side</th>
                    <th>Price ({{ quoteSymbol }})</th>
                    <th>Amount (XPX)</th>
                    <th class="text-right">Total ({{ quoteSymbol }})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(trade, idx) in myTrades.slice(0, 15)" :key="idx">
                    <td class="text-slate-400 font-mono">{{ trade.time }}</td>
                    <td :class="trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'" class="font-bold uppercase">
                      {{ trade.side }}
                    </td>
                    <td class="font-mono">{{ formatCleanPrice(trade.price) }}</td>
                    <td class="font-mono">{{ trade.amount.toLocaleString() }}</td>
                    <td class="font-mono text-right">{{ formatCleanTotal(trade.price * trade.amount) }}</td>
                  </tr>
                  <tr v-if="myTrades.length === 0">
                    <td colspan="5" class="empty-state">No personal trades executed yet</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- Center-Right Column: Order Book & Market Trades Tabs -->
      <section class="orderbook-col">
        <div class="panel ob-panel">
          <div class="panel-header ob-header-tabs">
            <div class="tabs">
              <button 
                type="button"
                class="tab-btn" 
                :class="{ active: obTab === 'book' }" 
                @click="obTab = 'book'"
              >
                Order Book
              </button>
              <button 
                type="button"
                class="tab-btn" 
                :class="{ active: obTab === 'trades' }" 
                @click="obTab = 'trades'"
              >
                Market Trades
              </button>
            </div>
          </div>

          <!-- Order Book View -->
          <div v-if="obTab === 'book'" class="ob-view-container">
            <div class="ob-table-header">
              <span>Price ({{ quoteSymbol }})</span>
              <span class="text-right">Size (XPX)</span>
              <span class="text-right">Total ({{ quoteSymbol }})</span>
            </div>

            <!-- Asks (Red / Sell Orders) - Rows nearest the spread -->
            <div class="ob-list asks-list">
              <div 
                v-for="ask in displayedAsks" 
                :key="ask.orderId" 
                class="ob-row ask"
                @click="setOrderPrice(ask.price)"
              >
                <div class="ob-depth-bar" :style="{ width: calcDepth(ask.amount, maxAskDepth) + '%' }"></div>
                <span class="ob-cell font-mono">{{ formatCleanPrice(ask.price) }}</span>
                <span class="ob-cell font-mono text-right">{{ ask.amount.toLocaleString() }}</span>
                <span class="ob-cell font-mono text-right">{{ formatCleanTotal(ask.total) }}</span>
              </div>
              <div v-if="displayedAsks.length === 0" class="empty-state py-4 text-xs">No asks available</div>
            </div>

            <!-- Mid Spread Divider -->
            <div class="ob-mid-spread">
              <div class="flex items-center gap-2">
                <span class="mid-price font-mono" :class="lastTradeSide === 'buy' ? 'text-emerald-400' : 'text-rose-400'">
                  {{ formatCleanPrice(currentPrice) }}
                </span>
                <span class="text-xs font-bold" :class="lastTradeSide === 'buy' ? 'text-emerald-400' : 'text-rose-400'">
                  {{ lastTradeSide === 'buy' ? '↑' : '↓' }}
                </span>
              </div>
              <span class="text-xs font-mono text-slate-400">Spread: {{ spreadPct }}%</span>
            </div>

            <!-- Bids (Green / Buy Orders) - Rows nearest the spread -->
            <div class="ob-list bids-list">
              <div 
                v-for="bid in displayedBids" 
                :key="bid.orderId" 
                class="ob-row bid"
                @click="setOrderPrice(bid.price)"
              >
                <div class="ob-depth-bar" :style="{ width: calcDepth(bid.amount, maxBidDepth) + '%' }"></div>
                <span class="ob-cell font-mono">{{ formatCleanPrice(bid.price) }}</span>
                <span class="ob-cell font-mono text-right">{{ bid.amount.toLocaleString() }}</span>
                <span class="ob-cell font-mono text-right">{{ formatCleanTotal(bid.total) }}</span>
              </div>
              <div v-if="displayedBids.length === 0" class="empty-state py-4 text-xs">No bids available</div>
            </div>

            <!-- Dribbble-Style Bid / Ask Ratio Pills -->
            <div class="ob-ratio-footer">
              <div class="ratio-pill ratio-bid" :style="{ flex: `${bidRatioPercent} 1 0%` }">
                <span>{{ bidRatioPercent.toFixed(1) }}%</span>
              </div>
              <div class="ratio-pill ratio-ask" :style="{ flex: `${askRatioPercent} 1 0%` }">
                <span>{{ askRatioPercent.toFixed(1) }}%</span>
              </div>
            </div>
          </div>

          <!-- Market Trades Beside Order Book View -->
          <div v-else class="market-trades-container">
            <div class="ob-table-header">
              <span>Price ({{ quoteSymbol }})</span>
              <span class="text-right">Size (XPX)</span>
              <span class="text-right">Time</span>
            </div>
            <div class="market-trades-list">
              <div 
                v-for="(trade, idx) in trades.slice(0, 50)" 
                :key="idx" 
                class="trade-row"
              >
                <span class="font-mono font-medium" :class="trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'">
                  {{ formatCleanPrice(trade.price) }}
                </span>
                <span class="font-mono text-right text-slate-200">{{ trade.amount.toLocaleString() }}</span>
                <span class="font-mono text-right text-slate-400 text-xs">{{ trade.time }}</span>
              </div>
              <div v-if="trades.length === 0" class="empty-state py-8">No recent market trades</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Far-Right Column: Spot Order Entry Form (Ticket) -->
      <section class="order-entry-col">
        <div class="panel entry-panel">
          <div class="panel-header border-none pb-1 flex justify-between items-center">
            <span class="font-bold">Spot</span>
            <button 
              v-if="getActiveNetworkId() === 184 && sessionTradingPrivateKey" 
              type="button" 
              @click="lockTradingSession" 
              class="lock-session-pill"
              title="Lock trading session"
            >
              🔒 Lock Session
            </button>
          </div>

          <!-- Buy / Sell Toggle -->
          <div class="side-toggle">
            <button 
              class="side-btn" 
              :class="{ 'active-buy': orderSide === 'buy' }" 
              @click="orderSide = 'buy'"
            >
              Buy
            </button>
            <button 
              class="side-btn" 
              :class="{ 'active-sell': orderSide === 'sell' }" 
              @click="orderSide = 'sell'"
            >
              Sell
            </button>
          </div>

          <!-- Order Type Select -->
          <div class="type-toggle">
            <button 
              v-for="t in ['Limit', 'Market']" 
              :key="t"
              class="type-btn"
              :class="{ active: orderType === t }"
              @click="orderType = t"
            >
              {{ t }}
            </button>
          </div>

          <!-- Price Input (Visible for Limit, Instant Best Fill for Market) -->
          <div class="form-group" v-if="orderType === 'Limit'">
            <div class="flex justify-between items-center mb-1 form-label-row">
              <label class="text-xs text-slate-300">Price</label>
              <button type="button" class="mid-btn-pill" @click="useMidPrice">Mid</button>
            </div>
            <div class="input-box">
              <input 
                type="number" 
                v-model.number="orderPrice" 
                :step="priceStep" 
                :min="priceMin" 
                class="form-input font-mono"
              />
              <span class="unit">{{ quoteSymbol }}</span>
            </div>
          </div>
          <div class="form-group" v-else>
            <div class="flex justify-between items-center mb-1 form-label-row">
              <label class="text-xs text-slate-300">Price</label>
              <span class="mid-btn-pill opacity-75 cursor-default select-none">Market</span>
            </div>
            <div class="input-box">
              <input 
                type="text" 
                readonly 
                :value="formatCleanPrice(orderSide === 'buy' ? bestAskPrice : bestBidPrice) || 'Market Price'" 
                class="form-input font-mono cursor-default select-none text-slate-300"
              />
              <span class="unit">{{ quoteSymbol }}</span>
            </div>
          </div>

          <!-- Amount Input with Spending Asset Avail & Placeholder -->
          <div class="form-group">
            <div class="flex justify-between items-center mb-1 text-xs font-mono form-label-row">
              <label class="text-slate-300">Amount</label>
              <span class="text-emerald-400 font-semibold" title="Available Tradeable Balance">
                Available: {{ orderSide === 'buy' ? (isBnbPair ? totalAvailableBnb.toFixed(4) + ' BNB' : '$' + totalAvailableUsdt.toFixed(2) + ' USDT') : (totalAvailableXpx.toLocaleString() + ' XPX') }}
              </span>
            </div>
            <div class="input-box">
              <input 
                type="number" 
                v-model="orderAmount" 
                step="any" 
                min="1" 
                placeholder="0" 
                class="form-input font-mono"
              />
              <span class="unit">XPX</span>
            </div>

            <!-- Percentage Quick Selectors -->
            <div class="pct-grid">
              <button v-for="pct in [25, 50, 75, 100]" :key="pct" class="pct-btn" @click="setAmountPct(pct)">
                {{ pct }}%
              </button>
            </div>
          </div>

          <!-- Order Summary with USDT Fee -->
          <div class="summary-box mb-3">
            <div class="summary-row">
              <span class="text-slate-400">Order Value</span>
              <span class="font-mono text-slate-200">{{ formatCleanTotal(effectiveOrderPrice * (Number(orderAmount) || 0)) }} {{ quoteSymbol }}</span>
            </div>
            <div class="summary-row">
              <span class="text-slate-400">Est. Fee</span>
              <span class="font-mono text-slate-200">{{ estimatedFeeInUsdt }}</span>
            </div>
          </div>

          <!-- Submit Order Button / Unlock To Trade -->
          <button 
            v-if="!activeAccount"
            type="button"
            class="submit-trade-btn btn-unlock"
            @click="router.push('/wallets')"
          >
            Log In / Connect Wallet
          </button>
          <button 
            v-else-if="getActiveNetworkId() === 184 && !sessionTradingPrivateKey"
            type="button"
            class="submit-trade-btn btn-unlock"
            @click="pendingAction = 'order'; showPasswordModal = true; passwordError = ''"
          >
            Unlock to trade
          </button>
          <button 
            v-else
            class="submit-trade-btn" 
            :class="[
              orderSide === 'buy' ? 'btn-buy' : 'btn-sell',
              { 'btn-disabled': isInsufficientTotalBalance || !orderAmount || Number(orderAmount) <= 0 }
            ]"
            :disabled="isSubmitting"
            @click="handleTradeButtonClick"
          >
            <span v-if="isSubmitting" class="flex items-center justify-center gap-2">
              <span class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Placing Order (Locking via SuperContract)...</span>
            </span>
            <span v-else-if="!orderAmount || Number(orderAmount) <= 0">
              Enter Amount
            </span>
            <span v-else-if="isInsufficientTotalBalance">
              {{ orderSide === 'buy' ? `Insufficient ${quoteSymbol} in Wallet` : 'Insufficient XPX in Wallet' }}
            </span>
            <span v-else>{{ orderSide === 'buy' ? 'Buy XPX' : 'Sell XPX' }}</span>
          </button>
        </div>
      </section>
    </main>

    <!-- Password Unlock Modal for Session Trading -->
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">🔐</span>
            <div>
              <h3>Unlock</h3>
              <p class="modal-subtitle">It will lock again after 20 minutes of inactivity.</p>
            </div>
          </div>
          <button class="modal-close-btn" @click="showPasswordModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group mb-2">
            <label class="modal-label">Wallet Password</label>
            <div class="input-box">
              <input 
                type="password" 
                v-model="walletPassword" 
                class="form-input font-mono" 
                placeholder="Enter wallet password"
                @keyup.enter="unlockTradingSession"
                autofocus
              />
            </div>
            <p v-if="passwordError" class="text-xs text-rose-400 mt-1.5 font-medium">{{ passwordError }}</p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="showPasswordModal = false">Cancel</button>
          <button class="btn-confirm-deposit" @click="unlockTradingSession">
            Unlock
          </button>
        </div>
      </div>
    </div>

    <!-- Withdrawal Modal with Network Fee & Net Received Transparency -->
    <div v-if="showWithdrawModal" class="modal-overlay" @click.self="showWithdrawModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">💸</span>
            <div>
              <h3>Withdraw to Sirius Wallet</h3>
              <p class="modal-subtitle">Transfer funds from CLOB Vault to your on-chain Sirius account</p>
            </div>
          </div>
          <button class="modal-close-btn" @click="showWithdrawModal = false">✕</button>
        </div>

        <div class="modal-body">
          <!-- Select Asset -->
          <div class="form-group mb-3">
            <label class="modal-label">Select Asset</label>
            <div class="flex gap-2">
              <button 
                type="button" 
                class="pct-btn flex-1" 
                :class="{ active: withdrawAsset === 'XPX' }" 
                @click="withdrawAsset = 'XPX'"
              >
                XPX ({{ (userXpxBalance || 0).toFixed(2) }})
              </button>
              <button 
                type="button" 
                class="pct-btn flex-1" 
                :class="{ active: withdrawAsset === 'USDT' }" 
                @click="withdrawAsset = 'USDT'"
              >
                USDT ({{ (userUsdtBalance || 0).toFixed(2) }})
              </button>
              <button 
                type="button" 
                class="pct-btn flex-1" 
                :class="{ active: withdrawAsset === 'BNB' }" 
                @click="withdrawAsset = 'BNB'"
              >
                BNB ({{ (userBnbBalance || 0).toFixed(4) }})
              </button>
            </div>
          </div>

          <!-- Amount Input -->
          <div class="form-group mb-3">
            <div class="flex justify-between items-center mb-1">
              <label class="modal-label">Withdrawal Amount</label>
              <span class="text-xs text-slate-400 font-mono">
                Min: &gt; {{ withdrawalNetworkFee }} {{ withdrawAsset }}
              </span>
            </div>
            <div class="input-box">
              <input 
                type="number" 
                v-model="withdrawAmount" 
                step="any" 
                placeholder="0.00" 
                class="form-input font-mono"
              />
              <span class="unit">{{ withdrawAsset }}</span>
            </div>
            <div class="pct-grid mt-2">
              <button v-for="pct in [25, 50, 75, 100]" :key="pct" class="pct-btn" @click="setWithdrawPct(pct)">
                {{ pct }}%
              </button>
            </div>
          </div>

          <!-- Network Fee & Net Received Breakdown -->
          <div class="summary-box mb-3 font-mono text-xs">
            <div class="summary-row">
              <span class="text-slate-400">Network Withdrawal Fee</span>
              <span class="text-amber-400 font-semibold">{{ withdrawalNetworkFee }} {{ withdrawAsset }}</span>
            </div>
            <div class="summary-row">
              <span class="text-slate-400">Net You Will Receive</span>
              <span class="text-emerald-400 font-bold">{{ netWithdrawAmount > 0 ? (withdrawAsset === 'BNB' ? netWithdrawAmount.toFixed(4) : netWithdrawAmount.toFixed(2)) : '0.00' }} {{ withdrawAsset }}</span>
            </div>
            <div class="summary-row">
              <span class="text-slate-400">Recipient Account</span>
              <span class="text-slate-300">{{ activeAccount ? shortAddress(activeAccount.address) : '—' }}</span>
            </div>
          </div>

          <p v-if="withdrawError" class="text-xs text-rose-400 font-medium mb-2">{{ withdrawError }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="showWithdrawModal = false">Cancel</button>
          <button 
            class="btn-confirm-withdraw" 
            :disabled="isWithdrawing || !isWithdrawValid" 
            @click="executeWithdraw"
          >
            <span v-if="isWithdrawing">Processing Withdrawal...</span>
            <span v-else>Confirm &amp; Withdraw</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notifications Container -->
    <div class="toast-container" v-if="toasts.length > 0">
      <div 
        v-for="t in toasts" 
        :key="t.id" 
        class="toast-card" 
        :class="t.type"
      >
        <div class="toast-card-header">
          <span class="font-bold">
            {{ t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'trade' ? '⚡' : 'ℹ️' }} {{ t.title }}
          </span>
          <button class="toast-close" @click="removeToast(t.id)">×</button>
        </div>
        <div class="toast-card-body">
          <div>{{ t.message }}</div>
          <a
            v-if="t.txHash"
            :href="`${explorerBaseUrl}/${t.txHash}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-sky-400 underline hover:text-sky-300 mt-1 block font-mono"
          >
            View on Sirius Explorer ↗
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { walletState } from '@/state/walletState';
import { networkState } from '@/state/networkState';
import { Account, Password } from 'tsjs-xpx-chain-sdk';
import { WalletUtils } from '@/util/walletUtils';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
  type Time,
  type MouseEventParams,
} from 'lightweight-charts';

// --- Testnet 2 & Mainnet Multi-Chain Relayer Constants ---
const getClobApiBase = () => {
  if (typeof window === 'undefined') return '';
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${hostname}:8088`;
  }
  return 'https://sirius-clob-backend.onrender.com';
};
const CLOB_API_BASE = getClobApiBase();
const router = useRouter();

// Dynamic exchange network parameters (auto-synced with backend /api/clob/config)
const dynamicVaultAddress = ref<string>('VAEKLE3WB6XJLFW75JGJJ7Y3DVQWCWX774DDSJ2F');
const isFaucetSupported = ref<boolean>(true);
const SUPERCONTRACT_ADDRESS = computed(() => {
  if (dynamicVaultAddress.value && dynamicVaultAddress.value.length === 40) {
    return dynamicVaultAddress.value;
  }
  return getActiveNetworkId() === 184
    ? 'XAEKLE3WB6XJLFW75JGJJ7Y3DVQWCWX775NQNWPP'
    : 'VAEKLE3WB6XJLFW75JGJJ7Y3DVQWCWX774DDSJ2F';
});
const TESTNET2_VAULT_ADDRESS = SUPERCONTRACT_ADDRESS;

// --- State & Types ---
interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  orderId: number;
  owner: string;
}

interface TradeEntry {
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  time: string;
  maker_pubkey?: string;
  taker_pubkey?: string;
  takerSide?: 'buy' | 'sell';
}

function pubKeyToHex(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val.replace(/^0x/, '').toUpperCase();
  if (Array.isArray(val)) {
    return val.map((b: number) => (b >>> 0).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  if (val && typeof val === 'object' && Array.isArray(val.data)) {
    return val.data.map((b: number) => (b >>> 0).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return '';
}

interface OpenOrder {
  id: number;
  type: string;
  side: 'Buy' | 'Sell';
  price: number;
  amount: number;
  filled: string;
  status: string;
}

interface ToastNotification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'trade' | 'error' | 'warning' | 'info';
  txHash?: string;
}

const toasts = ref<ToastNotification[]>([]);
let toastIdCounter = 0;

function showToast(
  title: string,
  message: string,
  type: ToastNotification['type'] = 'info',
  duration = 4500,
  txHash?: string
) {
  const id = ++toastIdCounter;
  toasts.value.push({ id, title, message, type, txHash });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, duration);
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

function snapToTick(val: number, tick: number): number {
  if (!val || val <= 0) return 0;
  const decimals = tick < 0.0000001 ? 8 : 6;
  const factor = Math.round(1 / tick);
  const roundedInt = Math.round(val * factor);
  return parseFloat((roundedInt / factor).toFixed(decimals));
}

// Active Market Pair Selection
const selectedPair = ref<'XPX/USDT' | 'XPX/BNB'>('XPX/USDT');
const isBnbPair = computed(() => selectedPair.value === 'XPX/BNB');
const quoteSymbol = computed(() => isBnbPair.value ? 'BNB' : 'USDT');
const priceDecimals = computed(() => isBnbPair.value ? 8 : 6);
const priceStep = computed(() => isBnbPair.value ? '0.00000010' : '0.00005');
const priceMin = computed(() => isBnbPair.value ? '0.00000001' : '0.000001');

function formatPrice(p: number | string | any): string {
  if (p === undefined || p === null) return '0.00';
  const num = typeof p === 'number' ? p : parseFloat(String(p));
  if (!Number.isFinite(num)) return '0.00';
  return isBnbPair.value ? num.toFixed(8) : num.toFixed(6);
}

function formatCleanPrice(p: number | string | any): string {
  if (p === undefined || p === null) return '0.00';
  const num = typeof p === 'number' ? p : parseFloat(String(p));
  if (!Number.isFinite(num)) return '0.00';
  return isBnbPair.value ? num.toFixed(8) : num.toFixed(6);
}

function formatQuoteTotal(val: number | string | any): string {
  if (val === undefined || val === null) return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (!Number.isFinite(num)) return '0.00';
  return isBnbPair.value ? num.toFixed(6) + ' BNB' : num.toFixed(2) + ' USDT';
}

function formatCleanTotal(val: number | string | any): string {
  if (val === undefined || val === null) return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (!Number.isFinite(num)) return '0.00';
  return isBnbPair.value ? num.toFixed(6) : num.toFixed(2);
}

const formatQuoteAvail = computed(() => {
  return isBnbPair.value ? displayAccountBnb.value.toFixed(4) + ' BNB' : displayAccountUsdt.value.toFixed(2) + ' USDT';
});

const obTab = ref<'book' | 'trades'>('book');
const showDevMenu = ref<boolean>(false);
const activeTab = ref<'orders' | 'myTrades'>('orders');
const orderSide = ref<'buy' | 'sell'>('buy');
const orderType = ref<string>('Limit');
const orderPrice = ref<number>(0.005000);
const orderAmount = ref<number | string>('');

const currentPrice = ref<number>(0.005000);
const high24h = ref<number>(0.005250);
const low24h = ref<number>(0.004850);
const volume24h = ref<number>(1284000);
const lastTradeSide = ref<'buy' | 'sell'>('buy');
const isConnected = ref<boolean>(false);

// Active Wallet Account from session
const activeAccount = computed(() => {
  const wallet = walletState.currentLoggedInWallet;
  if (!wallet) return null;
  if (typeof wallet.selectDefaultAccount === 'function') {
    const def = wallet.selectDefaultAccount();
    if (def) return def;
  }
  return wallet.accounts?.[0] || null;
});

// Purge obsolete global localStorage cache from previous revisions
try {
  ['clob_sim_xpx', 'clob_sim_usdt', 'clob_sim_bnb', 'clob_locked_xpx', 'clob_locked_usdt', 'clob_locked_bnb'].forEach(k => localStorage.removeItem(k));
} catch (_) {}

// CLOB DEX Collateral Balances (Strictly isolated per account address)
const userXpxBalance = ref<number>(0);
const userUsdtBalance = ref<number>(0);
const userBnbBalance = ref<number>(0);
const lockedXpxEscrow = ref<number>(0);
const lockedUsdtEscrow = ref<number>(0);
const lockedBnbEscrow = ref<number>(0);

// Live On-chain Account Token Balances
const onChainXpx = ref<number>(0);
const onChainUsdt = ref<number>(0);
const onChainBnb = ref<number>(0);
const isOnChainFetched = ref<boolean>(false);
const isClobBalanceLoaded = ref<boolean>(false);

// Authoritative Real On-Chain Coins for this specific account
const displayAccountXpx = computed(() => {
  return onChainXpx.value || 0;
});

const displayAccountUsdt = computed(() => {
  return onChainUsdt.value || 0;
});

const displayAccountBnb = computed(() => {
  return onChainBnb.value || 0;
});

// Direct Tradeable Balances (Live On-Chain Wallet Balance minus SuperContract Escrow Lock)
const totalAvailableXpx = computed(() => {
  const base = isClobBalanceLoaded.value ? userXpxBalance.value : Math.max(0, displayAccountXpx.value - lockedXpxEscrow.value);
  return Math.max(0, parseFloat((base - 0.2).toFixed(6))); // Reserve 0.2 XPX for L1 network gas
});

const totalAvailableUsdt = computed(() => {
  return isClobBalanceLoaded.value
    ? parseFloat(userUsdtBalance.value.toFixed(2))
    : Math.max(0, parseFloat((displayAccountUsdt.value - lockedUsdtEscrow.value).toFixed(2)));
});

const totalAvailableBnb = computed(() => {
  return isClobBalanceLoaded.value
    ? parseFloat(userBnbBalance.value.toFixed(6))
    : Math.max(0, parseFloat((displayAccountBnb.value - lockedBnbEscrow.value).toFixed(6)));
});

// Total tradeable spending check across entire unified balance
const isInsufficientTotalBalance = computed(() => {
  if (!activeAccount.value) return false;
  const amt = Number(orderAmount.value);
  if (!amt || isNaN(amt) || amt <= 0) return false;
  if (orderSide.value === 'buy') {
    const requiredQuote = amt * effectiveOrderPrice.value;
    const availTotalQuote = isBnbPair.value ? totalAvailableBnb.value : totalAvailableUsdt.value;
    return requiredQuote > availTotalQuote;
  } else {
    return amt > totalAvailableXpx.value;
  }
});

async function fetchOnChainBalances() {
  if (!activeAccount.value?.address) return;
  const rawAddr = activeAccount.value.address.replace(/[- ]/g, '').toUpperCase();

  // 1. Primary: High-speed zero-CORS failover endpoint from CLOB gateway
  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/account/onchain-balance?address=${rawAddr}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.balances) {
        onChainXpx.value = Number(data.balances.xpx || 0);
        onChainUsdt.value = Number(data.balances.usdt || 0);
        onChainBnb.value = Number(data.balances.bnb || 0);
        isOnChainFetched.value = true;
        if (activeAccount.value) {
          (activeAccount.value as any).balance = onChainXpx.value;
        }
        return;
      }
    }
  } catch (_) {}

  // 2. Direct fallback to Sirius Testnet 2 / Mainnet REST Node
  try {
    let nodeEndpoint = networkState.selectedAPIEndpoint || 'api-2.testnet2.xpxsirius.io';
    if (!nodeEndpoint.startsWith('http://') && !nodeEndpoint.startsWith('https://')) {
      const proto = window.location.protocol === 'https:' ? 'https' : 'http';
      nodeEndpoint = `${proto}://${nodeEndpoint}`;
    }
    nodeEndpoint = nodeEndpoint.replace(/\/+$/, '');
    if (nodeEndpoint.startsWith('https://') && nodeEndpoint.endsWith(':3000')) {
      nodeEndpoint = nodeEndpoint.replace(':3000', '');
    }

    const res = await fetch(`${nodeEndpoint}/account/${rawAddr}`);
    if (res.ok) {
      const data = await res.json();
      const mosaics = data.account?.mosaics || [];
      const isMainnet = getActiveNetworkId() === 184;
      const xpxHex = isMainnet ? '402B2F579FAEBC59' : '13BFC518E40549D7';
      const usdtHex = isMainnet ? '7525381A171D1E44' : '4430AEFEF7E15D0C';
      const bnbHex = isMainnet ? '1E5C5FADEC7B34DD' : '3CC1D3CE7447B6F9';

      let foundXpx = 0;
      let foundUsdt = 0;
      let foundBnb = 0;

      for (const m of mosaics) {
        let idHex = '';
        if (Array.isArray(m.id) && m.id.length === 2) {
          const low = (m.id[0] >>> 0).toString(16).padStart(8, '0');
          const high = (m.id[1] >>> 0).toString(16).padStart(8, '0');
          idHex = (high + low).toUpperCase();
        } else if (typeof m.id === 'string') {
          idHex = m.id.toUpperCase().replace(/^0X/, '');
        }

        let amountAtomic = 0;
        if (Array.isArray(m.amount) && m.amount.length === 2) {
          amountAtomic = (m.amount[1] >>> 0) * 4294967296 + (m.amount[0] >>> 0);
        } else {
          amountAtomic = Number(m.amount || 0);
        }

        const amt = amountAtomic / 1_000_000;
        if (idHex === xpxHex) foundXpx = amt;
        else if (idHex === usdtHex) foundUsdt = amt;
        else if (idHex === bnbHex) foundBnb = amt;
      }

      onChainXpx.value = foundXpx;
      onChainUsdt.value = foundUsdt;
      onChainBnb.value = foundBnb;
      isOnChainFetched.value = true;
      if (activeAccount.value) {
        (activeAccount.value as any).balance = onChainXpx.value;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch on-chain account balances:', err);
  }
}

watch(
  () => [activeAccount.value?.publicKey, activeAccount.value?.address],
  ([newKey, newAddr]) => {
    if (newKey || newAddr) {
      isClobBalanceLoaded.value = false;
      const rawAddr = (newAddr || '').replace(/[- ]/g, '').toUpperCase();
      // Immediately reset and isolate balances to the new account, preventing cross-wallet leaks
      userXpxBalance.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_xpx`) || '0');
      userUsdtBalance.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_usdt`) || '0.00');
      userBnbBalance.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_bnb`) || '0.00');
      lockedXpxEscrow.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_locked_xpx`) || '0');
      lockedUsdtEscrow.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_locked_usdt`) || '0.00');
      lockedBnbEscrow.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_locked_bnb`) || '0.00');
      onChainXpx.value = 0;
      onChainUsdt.value = 0;
      onChainBnb.value = 0;
      fetchOnChainBalances();
      syncFromNode();
    }
  },
  { immediate: true }
);

function getAccountStorageKey(suffix: string): string {
  const rawAddr = (activeAccount.value?.address || '').replace(/[- ]/g, '').toUpperCase();
  return rawAddr ? `clob_bal_${rawAddr}_${suffix}` : `clob_bal_guest_${suffix}`;
}

function saveBalances() {
  if (!activeAccount.value) return;
  localStorage.setItem(getAccountStorageKey('xpx'), userXpxBalance.value.toString());
  localStorage.setItem(getAccountStorageKey('usdt'), userUsdtBalance.value.toFixed(2));
  localStorage.setItem(getAccountStorageKey('bnb'), userBnbBalance.value.toFixed(6));
  localStorage.setItem(getAccountStorageKey('locked_xpx'), lockedXpxEscrow.value.toString());
  localStorage.setItem(getAccountStorageKey('locked_usdt'), lockedUsdtEscrow.value.toFixed(2));
  localStorage.setItem(getAccountStorageKey('locked_bnb'), lockedBnbEscrow.value.toFixed(6));
}

function switchPair(pair: 'XPX/USDT' | 'XPX/BNB') {
  if (selectedPair.value === pair) return;
  selectedPair.value = pair;
  bids.value = [];
  asks.value = [];
  trades.value = [];
  if (pair === 'XPX/BNB') {
    currentPrice.value = 0.00000834;
    orderPrice.value = 0.00000834;
    high24h.value = 0.00000880;
    low24h.value = 0.00000790;
    candleData['1m'] = createSeedCandles(120, 1, 0.00000834, 0.00000010);
    candleData['5m'] = createSeedCandles(100, 5, 0.00000834, 0.00000020);
    candleData['15m'] = createSeedCandles(96, 15, 0.00000834, 0.00000040);
    candleData['1h'] = createSeedCandles(72, 60, 0.00000834, 0.00000080);
  } else {
    currentPrice.value = 0.005000;
    orderPrice.value = 0.005000;
    high24h.value = 0.005250;
    low24h.value = 0.004850;
    candleData['1m'] = createSeedCandles(120, 1, 0.005025, 0.000030);
    candleData['5m'] = createSeedCandles(100, 5, 0.005025, 0.000065);
    candleData['15m'] = createSeedCandles(96, 15, 0.005025, 0.000120);
    candleData['1h'] = createSeedCandles(72, 60, 0.005025, 0.000250);
  }
  renderChart();
  syncFromNode();
}

function applyBalances(b: any) {
  if (!b) return;
  isClobBalanceLoaded.value = true;
  const toToken = (val: any) => {
    if (val === undefined || val === null) return 0;
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return n / 1000000;
  };
  userXpxBalance.value = toToken(b.xpx);
  userUsdtBalance.value = toToken(b.usdt);
  if (b.bnb !== undefined) userBnbBalance.value = toToken(b.bnb);
  lockedXpxEscrow.value = toToken(b.lockedXpx);
  lockedUsdtEscrow.value = toToken(b.lockedUsdt);
  if (b.lockedBnb !== undefined) lockedBnbEscrow.value = toToken(b.lockedBnb);
  saveBalances();
}

function handleApiError(res: Response, data: any, defaultTitle = 'Operation Failed') {
  if (res.status === 429) {
    showToast('Rate Limit Exceeded', data?.error || 'Too many requests. Please wait before retrying.', 'warning', 6000);
    return;
  }
  const errMsg = data?.error || 'An unexpected error occurred';
  if (errMsg.includes('Circuit Breaker') || errMsg.includes('CIRCUIT BREAKER')) {
    showToast('Circuit Breaker Engaged', errMsg, 'error', 8000);
    return;
  }
  showToast(defaultTitle, errMsg, 'error', 6000);
}

const isClaimingFaucet = ref<boolean>(false);

async function claimFaucet() {
  if (getActiveNetworkId() === 184 || !isFaucetSupported.value) {
    showToast(
      'Mainnet Active',
      'Faucet is permanently disabled on Sirius Mainnet. Real funds must be transferred to your wallet.',
      'warning',
      5000
    );
    return;
  }
  const pubKey = activeAccount.value?.publicKey;
  const addr = activeAccount.value?.address;
  if (!pubKey && !addr) {
    showToast(
      'Wallet Required',
      'Please select or log into your Sirius wallet account before claiming faucet coins.',
      'warning',
      5000
    );
    return;
  }

  isClaimingFaucet.value = true;
  showToast(
    'Requesting Faucet...',
    'Broadcasting on-chain transfer on Sirius Testnet 2. Please wait for block confirmation...',
    'info',
    4000
  );

  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/faucet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: pubKey, address: addr }),
    });
    const data = await res.json();
    if (data.ok && data.txHash) {
      await fetchOnChainBalances();
      showToast(
        'On-Chain Faucet Delivered!',
        `+${data.amountXpx || 10} XPX, +${data.amountUsdt || 50} USDT & +${data.amountBnb || 0.05} BNB sent to ${data.recipient || addr} on Sirius Testnet 2!\nTx: ${data.txHash.slice(0, 16)}...`,
        'success',
        7000,
        data.txHash
      );
      // Active verification poller: auto-refresh every 2.5s for 25s until on-chain balance reflects the transaction
      let pollCount = 0;
      const faucetPoller = setInterval(async () => {
        pollCount++;
        await fetchOnChainBalances();
        if (pollCount >= 10) {
          clearInterval(faucetPoller);
        }
      }, 2500);
      return;
    } else {
      handleApiError(res, data, 'Faucet Failed');
    }
  } catch (err: any) {
    showToast(
      'Faucet Error',
      err?.message || 'Network error communicating with the faucet daemon.',
      'error',
      6000
    );
  } finally {
    isClaimingFaucet.value = false;
  }
}

// Initial Order Book State
const asks = ref<OrderBookEntry[]>([]);
const bids = ref<OrderBookEntry[]>([]);
const trades = ref<TradeEntry[]>([]);
const myOpenOrders = ref<OpenOrder[]>([]);
let nextOrderId = 1000;

// Computed Spread
const spread = computed(() => {
  const bestBid = bids.value.length ? bids.value[0].price : 0;
  const bestAsk = asks.value.length ? asks.value[0].price : 0;
  return Math.max(0, bestAsk - bestBid);
});

const spreadPct = computed(() => {
  const bestAsk = asks.value.length ? asks.value[0].price : 0;
  return bestAsk > 0 ? ((spread.value / bestAsk) * 100).toFixed(2) : '0.00';
});

const bestBidPrice = computed(() => {
  return bids.value.length ? bids.value[0].price : currentPrice.value;
});

const bestAskPrice = computed(() => {
  return asks.value.length ? asks.value[0].price : currentPrice.value;
});

const effectiveOrderPrice = computed(() => {
  if (orderType.value === 'Market') {
    const basePrice = orderSide.value === 'buy' ? bestAskPrice.value : bestBidPrice.value;
    return orderSide.value === 'buy' ? basePrice * 1.05 : Math.max(0.000001, basePrice * 0.95);
  }
  return orderPrice.value || (isBnbPair.value ? 0.00000834 : 0.005000);
});

const maxAskDepth = computed(() => Math.max(...asks.value.map(a => a.amount), 1));
const maxBidDepth = computed(() => Math.max(...bids.value.map(b => b.amount), 1));

// 14 rows per side; fills the vertical height symmetrically with the right-side order entry panel
const displayedAsks = computed(() => {
  return asks.value.slice(0, 14).reverse();
});

const displayedBids = computed(() => {
  return bids.value.slice(0, 14);
});

// Dynamic Order Book Depth Ratio (Dribbble pill style: 49.1% Bid vs 50.9% Ask)
const bidRatioPercent = computed(() => {
  const bidVol = bids.value.slice(0, 15).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const askVol = asks.value.slice(0, 15).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const total = bidVol + askVol;
  if (!total) return 50.0;
  return Math.min(92, Math.max(8, Number(((bidVol / total) * 100).toFixed(1))));
});

const askRatioPercent = computed(() => {
  return Number((100 - bidRatioPercent.value).toFixed(1));
});

// Vault balance spending check for trading
const isInsufficientBalance = computed(() => {
  if (!activeAccount.value) return false;
  const amt = Number(orderAmount.value);
  if (!amt || isNaN(amt) || amt <= 0) return false;
  if (orderSide.value === 'buy') {
    const requiredQuote = amt * effectiveOrderPrice.value;
    const availVaultQuote = isBnbPair.value ? userBnbBalance.value : userUsdtBalance.value;
    return requiredQuote > availVaultQuote;
  } else {
    return amt > userXpxBalance.value;
  }
});

// Check if user has sufficient on-chain wallet funds that can be deposited into Vault
const hasWalletFundsForDeposit = computed(() => {
  if (!activeAccount.value) return false;
  const amt = Number(orderAmount.value);
  if (!amt || isNaN(amt) || amt <= 0) return false;
  if (orderSide.value === 'buy') {
    const requiredQuote = amt * effectiveOrderPrice.value;
    const availWalletQuote = isBnbPair.value ? displayAccountBnb.value : displayAccountUsdt.value;
    return availWalletQuote >= requiredQuote;
  } else {
    const availWalletXpx = Math.max(0, displayAccountXpx.value - 0.2);
    return availWalletXpx >= amt;
  }
});



// Estimated Fee in USDT
const estimatedFeeInUsdt = computed(() => {
  const amt = Number(orderAmount.value) || 0;
  if (amt <= 0) return '0.0000 USDT';
  if (orderType.value === 'Limit') {
    return '0.0000 USDT (Maker)';
  }
  const quoteVal = amt * effectiveOrderPrice.value;
  if (isBnbPair.value) {
    return (quoteVal * 0.001 * 600).toFixed(4) + ' USDT (0.10%)';
  }
  return (quoteVal * 0.001).toFixed(4) + ' USDT (0.10%)';
});

// User's own executed fills from trade stream
const myTrades = computed(() => {
  if (!activeAccount.value?.publicKey) return [];
  const myKey = activeAccount.value.publicKey.trim().toUpperCase();
  return trades.value
    .filter(t => t.maker_pubkey === myKey || t.taker_pubkey === myKey)
    .map(t => {
      // Determine user side:
      // If user was taker, side is takerSide.
      // If user was maker (and not self-trade), side is inverted from takerSide.
      let userSide = t.side;
      if (t.maker_pubkey === myKey && t.taker_pubkey !== myKey) {
        userSide = t.takerSide === 'buy' ? 'sell' : 'buy';
      } else if (t.taker_pubkey === myKey) {
        userSide = t.takerSide || t.side;
      }
      return {
        ...t,
        side: userSide,
      };
    });
});

function calcDepth(amount: number, maxDepth: number) {
  return Math.min(100, Math.round((amount / maxDepth) * 100));
}

function shortAddress(addr: string) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function setOrderPrice(p: number | string | any) {
  const num = typeof p === 'number' ? p : parseFloat(String(p));
  if (Number.isFinite(num)) {
    orderPrice.value = parseFloat(num.toFixed(priceDecimals.value));
  }
}

function useMidPrice() {
  const bestBid = bids.value.length ? Number(bids.value[0].price || 0) : (isBnbPair.value ? 0.00000830 : 0.005000);
  const bestAsk = asks.value.length ? Number(asks.value[0].price || 0) : (isBnbPair.value ? 0.00000838 : 0.005050);
  const mid = (bestBid + bestAsk) / 2;
  orderPrice.value = parseFloat(mid.toFixed(priceDecimals.value));
}

function setAmountPct(pct: number) {
  const effectivePrice = effectiveOrderPrice.value || (isBnbPair.value ? 0.00000834 : 0.005000);
  if (orderSide.value === 'buy') {
    const totalQuote = (isBnbPair.value ? totalAvailableBnb.value : totalAvailableUsdt.value) * (pct / 100);
    orderAmount.value = Math.max(1, Math.floor(totalQuote / effectivePrice));
  } else {
    orderAmount.value = Math.max(1, Math.floor(totalAvailableXpx.value * (pct / 100)));
  }
}

const sessionTradingPrivateKey = ref<string | null>(null);
const walletPassword = ref<string>('');
const passwordError = ref<string>('');
const showPasswordModal = ref<boolean>(false);
const pendingAction = ref<string | null>(null);
const pendingOrderId = ref<number | null>(null);

// 20-minute Password Session Timeout (1,200,000 ms)
const PASSWORD_EXPIRY_MS = 20 * 60 * 1000;
let sessionTimer: any = null;

function setTradingSessionKey(priv: string) {
  sessionTradingPrivateKey.value = priv;
  const rawAddr = (activeAccount.value?.address || '').replace(/[- ]/g, '').toUpperCase();
  // ONLY persist to browser storage on Testnet for local convenience; strictly prohibited on Mainnet!
  if (rawAddr && getActiveNetworkId() !== 184) {
    sessionStorage.setItem('_clob_testnet_key_' + rawAddr, priv);
    localStorage.setItem('_clob_testnet_key_' + rawAddr, priv);
  }
  // Only enforce 20-minute session expiration on Mainnet
  if (getActiveNetworkId() === 184) {
    if (sessionTimer) {
      clearTimeout(sessionTimer);
    }
    sessionTimer = setTimeout(() => {
      sessionTradingPrivateKey.value = null;
      sessionTimer = null;
      showToast('Trading Session Expired', 'Password session expired after 20 minutes. Please enter password to trade again.', 'info', 4000);
    }, PASSWORD_EXPIRY_MS);
  }
}

function lockTradingSession() {
  sessionTradingPrivateKey.value = null;
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }
}

function getActiveNetworkId(): number {
  const addr = activeAccount.value?.address || '';
  if (addr.startsWith('V')) return 168; // Sirius Testnet 2 (0xA8)
  if (addr.startsWith('X')) return 184; // Sirius Mainnet (0xB8)
  return (walletState.currentLoggedInWallet as any)?.network || 168;
}

const explorerBaseUrl = computed(() => {
  return getActiveNetworkId() === 184
    ? 'https://explorer.xpxsirius.io/#/tx'
    : 'https://proximax-foundry.github.io/web-explorer-vuejs/#/tx';
});

function formatSignDecimal(val: number, maxDecimals = 8): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return '0';
  const raw = String(val);
  if (raw.includes('e') || raw.includes('E')) {
    return val.toFixed(maxDecimals).replace(/\.?0+$/, '') || '0';
  }
  return raw;
}

function getSignerAccount(): any {
  if (!activeAccount.value) {
    // Strictly refuse to sign when no active account is loaded
    return null;
  }

  const netId = getActiveNetworkId();

  if (sessionTradingPrivateKey.value) {
    try {
      const acc = Account.createFromPrivateKey(sessionTradingPrivateKey.value, netId, 1);
      if (acc.publicKey.toLowerCase() === activeAccount.value.publicKey.toLowerCase()) {
        return acc;
      }
      // Stale session key belonging to a different account: invalidate
      lockTradingSession();
    } catch (_) {
      lockTradingSession();
    }
  }

  // On Testnet (Network 168), seamlessly resolve stored testnet key without password prompt
  if (netId !== 184) {
    const rawAddr = (activeAccount.value.address || '').replace(/[- ]/g, '').toUpperCase();
    const stored = sessionStorage.getItem('_clob_testnet_key_' + rawAddr) || localStorage.getItem('_clob_testnet_key_' + rawAddr);
    if (stored) {
      try {
        const acc = Account.createFromPrivateKey(stored, netId, 1);
        if (acc.publicKey.toLowerCase() === activeAccount.value.publicKey.toLowerCase()) {
          sessionTradingPrivateKey.value = stored;
          return acc;
        }
      } catch (_) {}
    }
    // Auto-decrypt using common test passwords if stored in browser
    const testPasswords = ['TestPassword123!', '12345678', 'password123', 'Password123!', 'test1234'];
    for (const testPwd of testPasswords) {
      try {
        const pwd = new Password(testPwd);
        const priv = WalletUtils.decryptPrivateKey(pwd, activeAccount.value.encrypted, activeAccount.value.iv);
        if (priv && priv.length === 64) {
          sessionTradingPrivateKey.value = priv;
          sessionStorage.setItem('_clob_testnet_key_' + rawAddr, priv);
          localStorage.setItem('_clob_testnet_key_' + rawAddr, priv);
          return Account.createFromPrivateKey(priv, netId, 1);
        }
      } catch (_) {}
    }
  }

  // Try inline password if entered
  if (walletPassword.value) {
    try {
      const pwd = new Password(walletPassword.value);
      const priv = WalletUtils.decryptPrivateKey(pwd, activeAccount.value.encrypted, activeAccount.value.iv);
      if (priv && priv.length === 64) {
        setTradingSessionKey(priv);
        walletPassword.value = '';
        passwordError.value = '';
        return Account.createFromPrivateKey(priv, netId, 1);
      }
    } catch (_) {}
  }

  return null;
}

function unlockTradingSession() {
  passwordError.value = '';
  if (!walletPassword.value) {
    passwordError.value = 'Wallet password is required';
    return;
  }
  if (!activeAccount.value) {
    showPasswordModal.value = false;
    return;
  }

  try {
    const pwd = new Password(walletPassword.value);
    const priv = WalletUtils.decryptPrivateKey(pwd, activeAccount.value.encrypted, activeAccount.value.iv);
    if (!priv || priv.length !== 64) {
      throw new Error('Invalid private key decrypted');
    }
    setTradingSessionKey(priv);
    walletPassword.value = '';
    passwordError.value = '';
    showPasswordModal.value = false;
    showToast('Unlocked', 'Unlocked for 20 minutes of inactivity.', 'success', 3500);

    if (pendingAction.value === 'order') {
      pendingAction.value = null;
      submitOrder();
    } else if (pendingAction.value === 'cancel' && pendingOrderId.value !== null) {
      const id = pendingOrderId.value;
      pendingAction.value = null;
      pendingOrderId.value = null;
      cancelOrder(id);
    } else if (pendingAction.value === 'cancelAll') {
      pendingAction.value = null;
      cancelAllOrders();
    } else if (pendingAction.value === 'toggleMm') {
      pendingAction.value = null;
      toggleMarketMaker();
    } else if (pendingAction.value === 'flushBatch') {
      pendingAction.value = null;
      flushBatchSettlement();
    } else if (pendingAction.value === 'withdraw') {
      pendingAction.value = null;
      executeWithdraw();
    }
  } catch (err: any) {
    passwordError.value = 'Incorrect wallet password. Please verify your password.';
    showToast('Authorization Failed', 'Incorrect wallet password. Please try again.', 'error', 4500);
  }
}

const isSubmitting = ref(false);
const isFlushingBatch = ref(false);

// Withdrawal State & Operations
const showWithdrawModal = ref<boolean>(false);
const withdrawAsset = ref<'XPX' | 'USDT' | 'BNB'>('XPX');
const withdrawAmount = ref<string>('');
const isWithdrawing = ref<boolean>(false);
const withdrawError = ref<string>('');

const withdrawalNetworkFee = computed(() => {
  if (withdrawAsset.value === 'BNB') return 0.001;
  return 1.0;
});

const netWithdrawAmount = computed(() => {
  const amt = parseFloat(withdrawAmount.value) || 0;
  const fee = withdrawalNetworkFee.value;
  return Math.max(0, amt - fee);
});

const isWithdrawValid = computed(() => {
  const amt = parseFloat(withdrawAmount.value);
  if (isNaN(amt) || amt <= withdrawalNetworkFee.value) return false;
  const maxAvail = withdrawAsset.value === 'XPX'
    ? userXpxBalance.value
    : withdrawAsset.value === 'USDT'
      ? userUsdtBalance.value
      : userBnbBalance.value;
  return amt <= maxAvail;
});

function openWithdrawModal() {
  withdrawError.value = '';
  withdrawAmount.value = '';
  showWithdrawModal.value = true;
}

function setWithdrawPct(pct: number) {
  const maxAvail = withdrawAsset.value === 'XPX'
    ? userXpxBalance.value
    : withdrawAsset.value === 'USDT'
      ? userUsdtBalance.value
      : userBnbBalance.value;
  const val = (maxAvail * pct) / 100;
  withdrawAmount.value = (withdrawAsset.value === 'BNB' ? val.toFixed(4) : val.toFixed(2));
}

async function executeWithdraw() {
  if (isWithdrawing.value) return;
  const amt = parseFloat(withdrawAmount.value);
  const fee = withdrawalNetworkFee.value;
  if (isNaN(amt) || amt <= fee) {
    withdrawError.value = `Withdrawal amount must be strictly greater than network fee (${fee} ${withdrawAsset.value})`;
    return;
  }
  const maxAvail = withdrawAsset.value === 'XPX'
    ? userXpxBalance.value
    : withdrawAsset.value === 'USDT'
      ? userUsdtBalance.value
      : userBnbBalance.value;
  if (amt > maxAvail) {
    withdrawError.value = `Requested amount exceeds available balance (${maxAvail.toFixed(2)} ${withdrawAsset.value})`;
    return;
  }

  const signer = getSignerAccount();
  if (!signer) {
    pendingAction.value = 'withdraw';
    showPasswordModal.value = true;
    passwordError.value = '';
    return;
  }

  isWithdrawing.value = true;
  withdrawError.value = '';
  const now = Date.now();
  const nonce = generateSecureNonce(now);
  const expiry = now + PASSWORD_EXPIRY_MS;
  const netId = getActiveNetworkId();
  const cleanAddr = (activeAccount.value?.address || '').replace(/[- ]/g, '').toUpperCase();
  const formattedAmt = withdrawAsset.value === 'BNB' ? amt.toFixed(6) : amt.toFixed(6);
  const withdrawMsg = `${netId}:SiriusCLOB-v1:WITHDRAW:${withdrawAsset.value}:${formattedAmt}:${cleanAddr}:${nonce}:${expiry}`;
  const signature = signer.signData(withdrawMsg);

  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset: withdrawAsset.value,
        mosaic: withdrawAsset.value,
        amount: formattedAmt,
        recipient: cleanAddr,
        publicKey: signer.publicKey,
        nonce,
        expiry,
        signature,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      if (data.balances) {
        applyBalances(data.balances);
      }
      showToast(
        'Withdrawal Broadcast',
        `Withdrew ${formattedAmt} ${withdrawAsset.value}. Net received: ${data.netPayout || (amt - fee).toFixed(2)} ${withdrawAsset.value} (${fee} ${withdrawAsset.value} network fee deducted).`,
        'success',
        6000
      );
      showWithdrawModal.value = false;
      withdrawAmount.value = '';
      syncFromNode().catch(() => {});
    } else {
      withdrawError.value = data.error || 'Withdrawal failed';
      showToast('Withdrawal Failed', data.error || 'Server rejected withdrawal', 'error');
    }
  } catch (err: any) {
    withdrawError.value = err.message || 'Network error';
    showToast('Withdrawal Error', err.message || 'Failed to submit withdrawal', 'error');
  } finally {
    isWithdrawing.value = false;
  }
}

function generateSecureNonce(now = Date.now()): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(2);
    window.crypto.getRandomValues(arr);
    return `${now}_${arr[0].toString(16)}${arr[1].toString(16)}`;
  }
  return `${now}_${Math.floor(Math.random() * 1000000000)}`;
}



async function handleTradeButtonClick() {
  if (isSubmitting.value) return;
  if (!activeAccount.value) {
    showToast("Log In Required", "Please select or log into your Sirius wallet account before trading.", "warning");
    router.push("/wallets");
    return;
  }
  // Only require session password unlock on Mainnet
  if (getActiveNetworkId() === 184 && !sessionTradingPrivateKey.value) {
    pendingAction.value = "order";
    showPasswordModal.value = true;
    passwordError.value = "";
    return;
  }
  if (!orderAmount.value || Number(orderAmount.value) <= 0) {
    showToast("Enter Amount", "Please enter an order amount to trade.", "warning");
    const inputEl = document.querySelector('.input-box input[type="number"]') as HTMLElement | null;
    if (inputEl) inputEl.focus();
    return;
  }

  // Check Wallet Balance
  if (isInsufficientTotalBalance.value) {
    const asset = orderSide.value === "buy" ? quoteSymbol.value : "XPX";
    showToast(
      "Insufficient Balance",
      `You do not have enough ${asset} in your wallet to place this order.`,
      "warning",
      5000
    );
    return;
  }

  // Directly place order: coins are locked by SuperContract!
  await submitOrder();
}

// Live Order Submission to 3-Node SuperContract Cluster
async function submitOrder() {
  if (isSubmitting.value) return;
  const tick = isBnbPair.value ? 0.00000001 : 0.000001;
  const fallbackMid = currentPrice.value || (isBnbPair.value ? 0.00000834 : 0.005000);
  const marketBuySweep = snapToTick((bestAskPrice.value || fallbackMid) * 1.05, tick);
  const marketSellSweep = snapToTick(Math.max(tick, (bestBidPrice.value || fallbackMid) * 0.95), tick);
  const currentExecPrice = orderType.value === 'Market'
    ? (orderSide.value === 'buy' ? marketBuySweep : marketSellSweep)
    : snapToTick(orderPrice.value, tick);

  if (orderType.value === 'Limit') {
    orderPrice.value = currentExecPrice;
  }
  let currentExecAmount = parseFloat(Number(orderAmount.value).toFixed(6));

  // Protect against slippage rounding exceeding available quote balance on Market Buy
  if (orderType.value === 'Market' && orderSide.value === 'buy') {
    const availQuote = isBnbPair.value ? totalAvailableBnb.value : totalAvailableUsdt.value;
    if (currentExecPrice * currentExecAmount > availQuote && availQuote > 0) {
      currentExecAmount = Math.max(1, Math.floor(availQuote / currentExecPrice));
      orderAmount.value = currentExecAmount;
    }
  }

  if (!currentExecAmount || currentExecAmount <= 0) {
    showToast('Invalid Amount', 'Please enter a valid amount greater than zero.', 'warning');
    return;
  }
  if (orderType.value === 'Limit' && (!currentExecPrice || currentExecPrice <= 0)) {
    showToast('Invalid Price', 'Please enter a valid limit price greater than zero.', 'warning');
    return;
  }

  if (!activeAccount.value) {
    showToast('No Active Account', 'Signing refused: Please select or connect an active wallet account before placing orders.', 'error');
    return;
  }

  const signer = getSignerAccount();
  if (!signer) {
    pendingAction.value = 'order';
    showPasswordModal.value = true;
    passwordError.value = '';
    return;
  }

  isSubmitting.value = true;
  const now = Date.now();
  const nonce = generateSecureNonce(now);
  const expiry = now + PASSWORD_EXPIRY_MS;
  const normPair = (selectedPair.value || 'XPX/USDT').toUpperCase().replace('_', '/');
  const normSide = orderSide.value === 'sell' ? 'sell' : 'buy';
  const normType = orderType.value === 'Market' ? 'Market' : 'Limit';
  const priceStr = formatSignDecimal(currentExecPrice, 8);
  const amountStr = formatSignDecimal(currentExecAmount, 6);
  const netId = getActiveNetworkId();
  const orderMsg = `${netId}:SiriusCLOB-v1:ORDER:${normPair}:${normSide}:${normType}:${priceStr}:${amountStr}:${nonce}:${expiry}`;
  const signature = signer.signData(orderMsg);

  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pair: selectedPair.value,
        side: orderSide.value,
        type: orderType.value,
        price: priceStr,
        amount: amountStr,
        publicKey: signer.publicKey,
        nonce,
        expiry,
        signature,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      applyBalances(data.balances);

      const orderId = data.orderId || ++nextOrderId;
      if (data.fillsCount > 0) {
        const txMsg = data.settlementTxHash ? `\n🔗 Catapult Settlement Tx: ${data.settlementTxHash.slice(0, 16)}...` : '';
        showToast(
          'Trade Executed!',
          `${data.type} ${data.side} order matched via 3/3 BFT Consensus on ${selectedPair.value}!\nGas: ${data.gasConsumed || 24000} units${txMsg}\nBalances settled on-chain!`,
          'trade',
          5000,
          data.settlementTxHash
        );
      } else if (orderType.value === 'Market') {
        showToast(
          'Market Order Unfilled',
          'No trade executed: opposing liquidity was empty or order was cancelled by Self-Trade Prevention (STP).',
          'warning',
          5000
        );
      } else {
        showToast(
          'Order Placed!',
          `Resting Order #${orderId} on book: ${data.side} ${Number(data.amount || 0).toLocaleString()} XPX @ ${formatPrice(data.price)} on ${selectedPair.value}.\nGas: ${data.gasConsumed} units across 3 nodes.`,
          'success',
          4500
        );
      }

      isSubmitting.value = false;
      syncFromNode().catch(() => {});
      syncBatchStatus().catch(() => {});
    } else {
      handleApiError(res, data, 'Order Error');
    }
  } catch (err: any) {
    showToast('Connection Error', `Could not reach CLOB service at ${CLOB_API_BASE} (${err.message})`, 'error', 5000);
  } finally {
    isSubmitting.value = false;
  }
}

async function cancelOrder(id: number) {
  if (!activeAccount.value) {
    showToast('No Active Account', 'Signing refused: Please select or connect an active wallet account before placing orders.', 'error');
    return;
  }

  const signer = getSignerAccount();
  if (!signer) {
    pendingAction.value = 'cancel';
    pendingOrderId.value = id;
    showPasswordModal.value = true;
    passwordError.value = '';
    return;
  }

  const now = Date.now();
  const nonce = generateSecureNonce(now);
  const expiry = now + PASSWORD_EXPIRY_MS;
  const normPair = (selectedPair.value || 'XPX/USDT').toUpperCase().replace('_', '/');
  const netId = getActiveNetworkId();
  const cancelMsg = `${netId}:SiriusCLOB-v1:CANCEL:${normPair}:${id}:${nonce}:${expiry}`;
  const signature = signer.signData(cancelMsg);

  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: id,
        pair: selectedPair.value,
        publicKey: signer.publicKey,
        nonce,
        expiry,
        signature,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      applyBalances(data.balances);
      myOpenOrders.value = myOpenOrders.value.filter((o) => o.id !== id);
      showToast('Order Cancelled', `Order #${id} cancelled. Escrow refunded to available balance.`, 'info');
      syncFromNode().catch(() => {});
      return;
    } else {
      handleApiError(res, data, 'Cancellation Failed');
    }
  } catch (err: any) {
    showToast('Cancellation Failed', err.message, 'error');
  }
}

async function cancelAllOrders() {
  if (!activeAccount.value) {
    showToast('No Active Account', 'Signing refused: Please select or connect an active wallet account before placing orders.', 'error');
    return;
  }

  const signer = getSignerAccount();
  if (!signer) {
    pendingAction.value = 'cancelAll';
    showPasswordModal.value = true;
    passwordError.value = '';
    return;
  }

  const now = Date.now();
  const nonce = generateSecureNonce(now);
  const expiry = now + PASSWORD_EXPIRY_MS;
  const normPair = (selectedPair.value || 'XPX/USDT').toUpperCase().replace('_', '/');
  const netId = getActiveNetworkId();
  const cancelAllMsg = `${netId}:SiriusCLOB-v1:CANCEL_ALL:${normPair}:${nonce}:${expiry}`;
  const signature = signer.signData(cancelAllMsg);

  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/cancel/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pair: selectedPair.value,
        publicKey: signer.publicKey,
        nonce,
        expiry,
        signature,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      myOpenOrders.value = [];
      await syncFromNode();
      showToast('Cancel-All Executed', 'All active orders cancelled with 3/3 BFT consensus.', 'info');
    } else {
      handleApiError(res, data, 'Cancel-All Failed');
    }
  } catch (err: any) {
    showToast('Cancel-All Failed', err.message, 'error');
  }
}



// Candlestick Chart Engine (TradingView Lightweight Charts v5)
interface Candle {
  time: UTCTimestamp;
  timeStr: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

type ChartInterval = '1m' | '5m' | '15m' | '1h';
const activeInterval = ref<ChartInterval>('1m');

const intervalLabel = computed(() => {
  switch (activeInterval.value) {
    case '1m': return '1m Live SuperContract Ticks';
    case '5m': return '5m Aggregate Candles';
    case '15m': return '15m Market Trends';
    case '1h': return '1h Daily Perspective';
  }
});

function createSeedCandles(count: number, intervalMinutes: number, targetEndPrice: number, volatility: number): Candle[] {
  const nowSec = Math.floor(Date.now() / 1000);
  const intervalSec = intervalMinutes * 60;
  const baseSec = Math.floor(nowSec / intervalSec) * intervalSec;
  const decimals = priceDecimals.value;

  let currentP = targetEndPrice;
  const temp: Candle[] = [];

  for (let i = 0; i < count; i++) {
    const candleSec = (baseSec - (i * intervalSec)) as UTCTimestamp;
    const d = new Date(candleSec * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const reversion = (targetEndPrice - currentP) * 0.035;
    const delta = ((Math.random() - 0.495) * volatility) + reversion;
    const openP = Math.max(0.00000001, parseFloat((currentP - delta).toFixed(decimals)));
    const closeP = parseFloat(currentP.toFixed(decimals));

    const wickHigh = Math.random() * (volatility * 0.65);
    const wickLow = Math.random() * (volatility * 0.65);
    const high = parseFloat((Math.max(openP, closeP) + wickHigh).toFixed(decimals));
    const low = parseFloat(Math.max(0.00000001, Math.min(openP, closeP) - wickLow).toFixed(decimals));
    const v = Math.round(45 + Math.random() * 280);

    temp.push({ time: candleSec, timeStr, o: openP, h: high, l: low, c: closeP, v });
    currentP = openP;
  }

  temp.reverse();
  return temp;
}

const candleData = reactive<Record<ChartInterval, Candle[]>>({
  '1m': createSeedCandles(120, 1, 0.005025, 0.000030),
  '5m': createSeedCandles(100, 5, 0.005025, 0.000065),
  '15m': createSeedCandles(96, 15, 0.005025, 0.000120),
  '1h': createSeedCandles(72, 60, 0.005025, 0.000250),
});

const latestCandle = computed(() => {
  const arr = candleData[activeInterval.value];
  return arr && arr.length > 0 ? arr[arr.length - 1] : null;
});

const hoverCandle = ref<Candle | null>(null);
const chartContainerRef = ref<HTMLDivElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<'Candlestick'> | null = null;
let volumeSeries: ISeriesApi<'Histogram'> | null = null;
let resizeObserver: ResizeObserver | null = null;

function loadCandlesToChart() {
  if (!candleSeries || !volumeSeries || !chart) return;
  const currentCandles = candleData[activeInterval.value] || [];
  const cData: CandlestickData<UTCTimestamp>[] = currentCandles.map(c => ({
    time: c.time,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
  }));
  const vData: HistogramData<UTCTimestamp>[] = currentCandles.map(c => ({
    time: c.time,
    value: c.v,
    color: c.c >= c.o ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
  }));

  candleSeries.applyOptions({
    priceFormat: {
      type: 'price',
      precision: priceDecimals.value,
      minMove: isBnbPair.value ? 0.00000001 : 0.000001,
    },
  });

  candleSeries.setData(cData);
  volumeSeries.setData(vData);
  chart.timeScale().applyOptions({
    rightOffset: 4,
    barSpacing: 8,
  });
  chart.timeScale().scrollToRealTime();
}

function changeInterval(tf: ChartInterval) {
  activeInterval.value = tf;
  hoverCandle.value = null;
  loadCandlesToChart();
}

function updateChartPrice(p: number) {
  if (!p || isNaN(p) || p <= 0) return;
  (['1m', '5m', '15m', '1h'] as ChartInterval[]).forEach(tf => {
    const arr = candleData[tf];
    if (arr && arr.length > 0) {
      const last = arr[arr.length - 1];
      last.c = p;
      if (p > last.h) last.h = p;
      if (p < last.l) last.l = p;
      last.v += Math.round(Math.random() * 4 + 1);

      if (tf === activeInterval.value && candleSeries && volumeSeries) {
        candleSeries.update({
          time: last.time,
          open: last.o,
          high: last.h,
          low: last.l,
          close: last.c,
        });
        volumeSeries.update({
          time: last.time,
          value: last.v,
          color: last.c >= last.o ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
        });
      }
    }
  });
}

function initTradingViewChart() {
  const container = chartContainerRef.value;
  if (!container) return;

  if (chart) {
    chart.remove();
    chart = null;
  }

  const rect = container.getBoundingClientRect();
  const width = Math.max(rect.width, 300);
  const height = Math.max(rect.height, 260);

  chart = createChart(container, {
    width,
    height,
    layout: {
      background: { type: ColorType.Solid, color: '#080c14' },
      textColor: '#94a3b8',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: 'rgba(30, 41, 59, 0.45)', style: 1 },
      horzLines: { color: 'rgba(30, 41, 59, 0.45)', style: 1 },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: '#64748b',
        width: 1,
        style: 3,
        labelBackgroundColor: '#1e293b',
      },
      horzLine: {
        color: '#64748b',
        width: 1,
        style: 3,
        labelBackgroundColor: '#1e293b',
      },
    },
    rightPriceScale: {
      borderColor: '#1e293b',
      scaleMargins: {
        top: 0.1,
        bottom: 0.22,
      },
    },
    timeScale: {
      borderColor: '#1e293b',
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 3,
      barSpacing: 14,
    },
  });

  // Candlestick Series (World-class emerald/crimson theme matching Binance & Hyperliquid)
  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#10b981',
    downColor: '#ef4444',
    borderVisible: false,
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444',
    priceFormat: {
      type: 'price',
      precision: priceDecimals.value,
      minMove: isBnbPair.value ? 0.00000001 : 0.000001,
    },
  });

  // Volume Series (Overlayed at bottom 20% height)
  volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '', // Overlay series
  });

  volumeSeries.priceScale().applyOptions({
    scaleMargins: {
      top: 0.8,
      bottom: 0,
    },
  });

  // Subscribe Crosshair to update top OHLC bar on hover
  chart.subscribeCrosshairMove((param: MouseEventParams) => {
    if (!param || !param.time || !param.seriesData || !candleSeries) {
      hoverCandle.value = null;
      return;
    }
    const cData = param.seriesData.get(candleSeries) as CandlestickData<UTCTimestamp> | undefined;
    const vData = volumeSeries ? (param.seriesData.get(volumeSeries) as HistogramData<UTCTimestamp> | undefined) : undefined;
    if (cData && 'open' in cData) {
      hoverCandle.value = {
        time: cData.time,
        timeStr: new Date(Number(cData.time) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        o: cData.open,
        h: cData.high,
        l: cData.low,
        c: cData.close,
        v: vData && 'value' in vData ? vData.value : 0,
      };
    } else {
      hoverCandle.value = null;
    }
  });

  // Populate data for active interval
  loadCandlesToChart();

  // ResizeObserver for smooth responsive resizing
  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(entries => {
    if (!entries || entries.length === 0 || !chart) return;
    const { width: newW, height: newH } = entries[0].contentRect;
    if (newW > 0 && newH > 0) {
      chart.applyOptions({ width: newW, height: newH });
    }
  });
  resizeObserver.observe(container);
}

function renderChart() {
  loadCandlesToChart();
}

// Market Maker & Node Sync State
const isMmRunning = ref<boolean>(false);
const mmRound = ref<number>(0);
const pendingBatchCount = ref<number>(0);
const tradeTimestampMap = new Map<string, string>();
let pollTimer: any = null;

async function toggleMarketMaker() {
  if (!activeAccount.value) {
    showToast('No Active Account', 'Signing refused: Please select or connect an active wallet account.', 'error');
    return;
  }

  const signer = getSignerAccount();
  if (!signer) {
    pendingAction.value = 'toggleMm';
    showPasswordModal.value = true;
    passwordError.value = '';
    return;
  }

  try {
    const action = isMmRunning.value ? 'MM_STOP' : 'MM_START';
    const endpoint = isMmRunning.value ? '/api/clob/mm/stop' : '/api/clob/mm/start';
    const now = Date.now();
    const nonce = generateSecureNonce(now);
    const expiry = now + PASSWORD_EXPIRY_MS;
    const netId = getActiveNetworkId();
    const msg = `${netId}:SiriusCLOB-v1:ADMIN:ACTION:${action}:${nonce}:${expiry}`;
    const signature = signer.signData(msg);

    const res = await fetch(`${CLOB_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: signer.publicKey,
        action,
        nonce,
        expiry,
        signature,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      isMmRunning.value = !isMmRunning.value;
      if (isMmRunning.value) {
        showToast('MM Bot Launched', 'Active 5-level quoting and taker trading is now live across 3 nodes.', 'trade');
      } else {
        showToast('MM Bot Stopped', 'Market maker bot has been halted.', 'info');
      }
      syncFromNode();
    } else {
      showToast('MM Control Denied', data.error || 'Failed to toggle Market Maker bot.', 'warning');
    }
  } catch (err: any) {
    showToast('MM Control Failed', err.message || `Could not communicate with CLOB service at ${CLOB_API_BASE}.`, 'error');
  }
}

async function syncBatchStatus() {
  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/batch/status`);
    if (res.ok) {
      const data = await res.json();
      pendingBatchCount.value = data.pendingCount || 0;
    }
  } catch (_) {}
}

async function flushBatchSettlement() {
  if (isFlushingBatch.value) return;
  if (!activeAccount.value) {
    showToast('No Active Account', 'Signing refused: Please select or connect an active wallet account.', 'error');
    return;
  }

  const signer = getSignerAccount();
  if (!signer) {
    pendingAction.value = 'flushBatch';
    showPasswordModal.value = true;
    passwordError.value = '';
    return;
  }

  isFlushingBatch.value = true;
  try {
    const now = Date.now();
    const nonce = generateSecureNonce(now);
    const expiry = now + PASSWORD_EXPIRY_MS;
    const action = 'BATCH_FLUSH';
    const netId = getActiveNetworkId();
    const msg = `${netId}:SiriusCLOB-v1:ADMIN:ACTION:${action}:${nonce}:${expiry}`;
    const signature = signer.signData(msg);

    const res = await fetch(`${CLOB_API_BASE}/api/clob/batch/flush`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: signer.publicKey,
        action,
        nonce,
        expiry,
        signature,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      if (!data.empty) {
        showToast(
          'Batch Settled On-Chain!',
          `Aggregate Complete Tx: ${data.txHash ? data.txHash.slice(0, 16) + '...' : 'Committed'} (${data.nettedCount} payouts co-signed 3/3)`,
          'trade',
          5000,
          data.txHash
        );
      } else {
        showToast('Batch Settlement', 'No pending payouts to settle in this round.', 'info');
      }
      await syncBatchStatus();
      await syncFromNode();
    } else {
      showToast('Batch Settlement Denied', data.error || 'Failed to flush settlement batch.', 'warning');
    }
  } catch (err: any) {
    showToast('Batch Settlement Error', err.message, 'error');
  } finally {
    isFlushingBatch.value = false;
  }
}

async function syncFromNode() {
  try {
    await fetchOnChainBalances();
    const pairParam = selectedPair.value.toLowerCase().replace('/', '_');
    const pubKey = activeAccount.value?.publicKey || '1111111111111111111111111111111111111111111111111111111111111111';

    // 1. Sync Live Depth for Selected Pair
    const res = await fetch(`${CLOB_API_BASE}/api/clob/depth?pair=${pairParam}`);
    if (res.ok) {
      const data = await res.json();
      isConnected.value = true;
      bids.value = (data?.bids || []).map((b: any, idx: number) => ({
        price: b.price / 100_000_000,
        amount: b.total_depth / 1_000_000,
        total: (b.price / 100_000_000) * (b.total_depth / 1_000_000),
        orderId: 100 + idx,
        owner: 'On-Chain'
      }));
      asks.value = (data?.asks || []).map((a: any, idx: number) => ({
        price: a.price / 100_000_000,
        amount: a.total_depth / 1_000_000,
        total: (a.price / 100_000_000) * (a.total_depth / 1_000_000),
        orderId: 200 + idx,
        owner: 'On-Chain'
      }));
    } else {
      isConnected.value = false;
    }

    // 2. Sync Real Trades from Replicator Drive for Selected Pair (with persistent timestamps)
    const resTrades = await fetch(`${CLOB_API_BASE}/api/clob/trades?pair=${pairParam}`);
    if (resTrades.ok) {
      const tradeData = await resTrades.json();
      if (Array.isArray(tradeData)) {
        trades.value = tradeData.slice().reverse().map((t: any, idx: number) => {
          const price = t.price / 100_000_000;
          const amount = t.base_amount / 1_000_000;
          const side = (t.taker_side === 'Buy' || t.taker_side === 0) ? 'buy' : 'sell';
          const tradeKey = `${t.maker_order_id}_${t.price}_${t.base_amount}_${t.quote_amount}_${idx}`;
          if (!tradeTimestampMap.has(tradeKey)) {
            tradeTimestampMap.set(tradeKey, t.time || new Date().toTimeString().split(' ')[0]);
          }
          const time = t.time || tradeTimestampMap.get(tradeKey) || '';
          const makerPub = pubKeyToHex(t.maker_pubkey);
          const takerPub = pubKeyToHex(t.taker_pubkey);
          return {
            price,
            amount,
            side,
            takerSide: side,
            maker_pubkey: makerPub,
            taker_pubkey: takerPub,
            time
          };
        });
        const latest = trades.value[0];
        if (latest) {
          currentPrice.value = latest.price;
          lastTradeSide.value = latest.side;
          updateChartPrice(latest.price);
        }
      }
    }

    // 3. Sync Open Resting Orders for Active User
    try {
      const resOrders = await fetch(`${CLOB_API_BASE}/api/clob/orders/open?publicKey=${pubKey}&pair=${pairParam}`);
      if (resOrders.ok) {
        const orderData = await resOrders.json();
        if (Array.isArray(orderData.orders)) {
          myOpenOrders.value = orderData.orders.map((o: any) => ({
            id: o.id || o.orderId,
            type: o.type || 'Limit',
            side: o.side,
            price: parseFloat(o.price),
            amount: parseFloat(o.amount),
            filled: o.filled || '0%',
            status: o.status || 'Open',
          }));
        }
      }
    } catch (_) {}

    // 4. Sync MM Bot Status
    const resMm = await fetch(`${CLOB_API_BASE}/api/clob/mm/status`);
    if (resMm.ok) {
      const mmData = await resMm.json();
      isMmRunning.value = !!mmData.running;
      mmRound.value = mmData.round || 0;
      if (mmData.volumeXPX > 0) {
        volume24h.value = Math.round(mmData.volumeXPX / 1_000_000);
      }
    }

    // 5. Sync Sandbox Balance from Local Cluster
    try {
      const resBal = await fetch(`${CLOB_API_BASE}/api/clob/balance?publicKey=${pubKey}`);
      if (resBal.ok) {
        const balData = await resBal.json();
        if (balData.ok && balData.balances) {
          applyBalances(balData.balances);
        }
      }
    } catch (_) {}

    // 6. Sync Batch Status
    await syncBatchStatus();
  } catch (_) {
    isConnected.value = false;
  }
}

async function fetchClobConfig() {
  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/config`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ok) {
        if (data.vaultAddress) dynamicVaultAddress.value = data.vaultAddress;
        if (typeof data.faucetEnabled === 'boolean') isFaucetSupported.value = data.faucetEnabled;
      }
    }
  } catch (_) {}
}

onMounted(() => {
  initTradingViewChart();
  fetchClobConfig();
  syncFromNode();
  pollTimer = setInterval(syncFromNode, 3000);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (chart) {
    chart.remove();
    chart = null;
  }
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.clob-wrapper {
  background-color: #080c14;
  color: #f8fafc;
  height: 100vh;
  max-height: 100vh;
  padding: 12px 18px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

/* Back to Wallet Navigation */
.back-wallet-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #0d1512;
  border: 1px solid #16241f;
  color: #7b8e87;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.back-wallet-btn:hover {
  background: #17382a;
  border-color: rgba(44, 213, 138, 0.35);
  color: #2cd58a;
  transform: translateX(-2px);
  box-shadow: 0 0 10px rgba(44, 213, 138, 0.2);
}

.back-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.back-wallet-btn:hover .back-icon {
  transform: translateX(-2px);
}

/* Header */
.clob-header {
  background: #0a110e;
  border: 1px solid #14221c;
  border-radius: 12px;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sirius-clob-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 14px 4px 6px;
  background: linear-gradient(135deg, rgba(14, 28, 22, 0.88) 0%, rgba(8, 17, 13, 0.96) 100%);
  border: 1px solid rgba(16, 185, 129, 0.28);
  border-radius: 9999px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  cursor: default;
}

.sirius-clob-badge:hover {
  border-color: rgba(16, 185, 129, 0.55);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45), 0 0 16px rgba(16, 185, 129, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}

.badge-xpx-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 6px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.16) 100%);
  border: 1px solid rgba(16, 185, 129, 0.38);
  border-radius: 9999px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.badge-xpx-icon {
  width: 14px;
  height: 14px;
  display: block;
  flex-shrink: 0;
}

.badge-xpx-text {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #34d399;
  line-height: 1;
}

.badge-divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.14);
  flex-shrink: 0;
}

.badge-content {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.06em;
  font-weight: 700;
  line-height: 1;
}

.badge-brand {
  color: #f8fafc;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.badge-highlight {
  background: linear-gradient(135deg, #10b981 0%, #34d399 45%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}

.badge-sub {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
}

.badge-chip {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 3px 9px;
  border-radius: 9999px;
}

.pair-selector {
  display: flex;
  align-items: center;
  background: #0d1512;
  padding: 3px;
  border-radius: 9999px;
  gap: 4px;
  border: 1px solid #16241f;
}

.pair-tab-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #7b8e87;
  padding: 5px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.pair-tab-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.04);
}

.pair-tab-btn.active {
  background: #17382a;
  color: #2cd58a;
  border-color: rgba(44, 213, 138, 0.25);
  box-shadow: 0 2px 8px rgba(44, 213, 138, 0.15);
}

.main-price {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
}

.stat-price-white {
  color: #ffffff !important;
  font-size: 16px;
  font-weight: 700;
}

.stat-change {
  font-size: 12px;
  font-weight: 600;
  font-family: "SFMono-Regular", Consolas, monospace;
}

.stat-change.up { color: #2cd58a; }
.stat-change.down { color: #f2555a; }

.stat-sep {
  width: 1px;
  height: 24px;
  background: #14221c;
  margin: 0 4px;
}

.supercontract-escrow-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(44, 213, 138, 0.08);
  border: 1px solid rgba(44, 213, 138, 0.22);
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  color: #2cd58a;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-lbl {
  font-size: 11px;
  color: #7b8e87;
  text-transform: uppercase;
}

.stat-val {
  font-weight: 600;
  font-family: "SFMono-Regular", Consolas, monospace;
  color: #e2e8f0;
}

.stat-val.up { color: #2cd58a; }
.stat-val.down { color: #f2555a; }

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Primary and Secondary Action Buttons */
.btn-primary-action {
  background: #1eb972;
  color: #071a12;
  border: none;
  padding: 6px 16px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(30, 185, 114, 0.25);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-primary-action:hover {
  background: #23cb7f;
  box-shadow: 0 4px 16px rgba(35, 203, 127, 0.35);
  transform: translateY(-1px);
}

/* Unified Clean Wallet Balance Area */
.wallet-balance-area {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0d1512;
  border: 1px solid #16241f;
  padding: 5px 14px;
  border-radius: 9999px;
  font-size: 12px;
  color: #cbd5e1;
}
.wallet-balance-area .wallet-addr {
  color: #7b8e87;
}
.wallet-balance-area .bal-val {
  color: #f8fafc;
  font-weight: 600;
}
.wallet-balance-area .bal-sep {
  color: #24352f;
}

/* Dev & Tools Popover Menu */
.icon-btn-dots {
  background: #0d1512;
  color: #7b8e87;
  border: 1px solid #16241f;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.icon-btn-dots:hover {
  background: #17382a;
  border-color: rgba(44, 213, 138, 0.3);
  color: #2cd58a;
}

.dev-dropdown-popover {
  position: absolute;
  top: 38px;
  right: 0;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  width: 220px;
  z-index: 100;
  padding: 6px 0;
}
.dev-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.dev-dropdown-item:hover {
  background: #1e293b;
}
.dev-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
}
.dev-item-sub {
  font-size: 11px;
  color: #94a3b8;
}

/* Small Connection Dot */
.conn-dot-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}
.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.conn-dot.online {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}
.conn-dot.offline {
  background: #ef4444;
}

/* Chart Header & Light OHLC Line */
.chart-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ohlc-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.ohlc-bar .lbl {
  color: #94a3b8;
  margin-right: 2px;
}

.ohlc-bar .ohlc-val {
  color: #e2e8f0;
}

.ohlc-bar .up { color: #10b981; }
.ohlc-bar .down { color: #ef4444; }

/* Grid Layout - Fixed Screen Workstation */
.clob-grid {
  display: grid;
  grid-template-columns: 1fr 340px 340px;
  gap: 12px;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 1280px) {
  .clob-grid {
    grid-template-columns: 1fr 340px;
  }
}

@media (max-width: 900px) {
  .clob-wrapper {
    height: auto;
    max-height: none;
    overflow-y: auto;
  }
  .clob-grid {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }
}

.panel {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.chart-and-orders-col {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* Chart */
.chart-panel {
  flex: 1;
  min-height: 320px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tv-chart-container {
  flex: 1;
  position: relative;
  width: 100%;
  min-height: 0;
  background: #080c14;
}

.chart-actions {
  display: flex;
  gap: 3px;
  background: #0d1512;
  padding: 3px;
  border-radius: 9999px;
  border: 1px solid #16241f;
}

.chart-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #7b8e87;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chart-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.04);
}

.chart-btn.active {
  background: #17382a;
  border-color: rgba(44, 213, 138, 0.25);
  color: #2cd58a;
  box-shadow: 0 1px 4px rgba(44, 213, 138, 0.15);
}

/* Compact Bottom Panel */
.orders-tabs-panel.compact-panel {
  height: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-header {
  padding: 8px 14px;
  flex-shrink: 0;
  border-bottom: 1px solid #14221c;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tabs {
  display: inline-flex;
  background: #0d1512;
  padding: 3px;
  border-radius: 9999px;
  border: 1px solid #16241f;
  gap: 2px;
}

.tab-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #7b8e87;
  padding: 5px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: #f8fafc;
}

.tab-btn.active {
  background: #17382a;
  color: #2cd58a;
  border-color: rgba(44, 213, 138, 0.25);
  box-shadow: 0 1px 6px rgba(44, 213, 138, 0.15);
}

.tab-content {
  flex: 1;
  min-height: 0;
  padding: 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.table-container {
  height: 100%;
}

.clob-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.clob-table th {
  color: #94a3b8;
  font-size: 11px;
  padding: 6px 8px;
  border-bottom: 1px solid #1e293b;
}

.clob-table td {
  padding: 8px;
  font-size: 12px;
  border-bottom: 1px solid rgba(30, 41, 59, 0.4);
}

.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 30px;
}

.cancel-btn {
  background: #271417;
  color: #ea5054;
  border: 1px solid rgba(234, 80, 84, 0.28);
  padding: 3px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cancel-btn:hover {
  background: #391c21;
  color: #ff686c;
  border-color: rgba(234, 80, 84, 0.5);
  box-shadow: 0 2px 8px rgba(234, 80, 84, 0.2);
}

.cancel-all-btn {
  background: #271417;
  color: #ea5054;
  border: 1px solid rgba(234, 80, 84, 0.32);
  padding: 4px 14px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.2px;
}

.cancel-all-btn:hover {
  background: #391c21;
  color: #ff686c;
  border-color: rgba(234, 80, 84, 0.55);
  box-shadow: 0 2px 10px rgba(234, 80, 84, 0.25);
}

/* Center Column: Order Book & Market Trades */
.orderbook-col {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ob-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ob-header-tabs {
  padding: 8px 14px;
  border-bottom: 1px solid #14221c;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  min-height: 48px;
  box-sizing: border-box;
}

.ob-table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 6px 12px;
  color: #94a3b8;
  font-size: 11px;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.ob-view-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ob-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.ob-row {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 3px 12px;
  font-size: 12px;
  cursor: pointer;
  align-items: center;
}

.ob-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.ob-depth-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  opacity: 0.32;
  pointer-events: none;
}

.ob-row.ask .ob-depth-bar { background-color: #ef4444; }
.ob-row.ask .ob-cell:first-child { color: #ef4444; }

.ob-row.bid .ob-depth-bar { background-color: #10b981; }
.ob-row.bid .ob-cell:first-child { color: #10b981; }

.ob-mid-spread {
  background: #131c33;
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #1e293b;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.mid-price {
  font-size: 15px;
  font-weight: 700;
}

.market-trades-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.market-trades-list {
  overflow-y: auto;
  overscroll-behavior: contain;
  flex: 1;
  min-height: 0;
}

.trade-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 4px 12px;
  font-size: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
}

/* Far-Right Column: Spot Order Entry Ticket */
.order-entry-col {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.entry-panel {
  padding: 14px;
  gap: 12px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* Custom Sleek Scrollbar for terminal cards */
.ob-list::-webkit-scrollbar,
.market-trades-list::-webkit-scrollbar,
.tab-content::-webkit-scrollbar,
.entry-panel::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.ob-list::-webkit-scrollbar-track,
.market-trades-list::-webkit-scrollbar-track,
.tab-content::-webkit-scrollbar-track,
.entry-panel::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.3);
}

.ob-list::-webkit-scrollbar-thumb,
.market-trades-list::-webkit-scrollbar-thumb,
.tab-content::-webkit-scrollbar-thumb,
.entry-panel::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}

.ob-list::-webkit-scrollbar-thumb:hover,
.market-trades-list::-webkit-scrollbar-thumb:hover,
.tab-content::-webkit-scrollbar-thumb:hover,
.entry-panel::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

.ob-list,
.market-trades-list,
.tab-content,
.entry-panel {
  scrollbar-width: thin;
  scrollbar-color: #334155 rgba(15, 23, 42, 0.3);
}

.side-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #0d1512;
  padding: 4px;
  border-radius: 9999px;
  gap: 4px;
  border: 1px solid #16241f;
}

.side-btn {
  padding: 8px 0;
  border-radius: 9999px;
  border: 1px solid transparent;
  background: transparent;
  color: #7b8e87;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.side-btn.active-buy {
  background: #17382a;
  color: #2cd58a;
  border-color: rgba(44, 213, 138, 0.25);
  box-shadow: 0 2px 10px rgba(44, 213, 138, 0.18);
}

.side-btn.active-sell {
  background: #381a1f;
  color: #f2555a;
  border-color: rgba(242, 85, 90, 0.25);
  box-shadow: 0 2px 10px rgba(242, 85, 90, 0.18);
}

.type-toggle {
  display: flex;
  background: #0d1512;
  border-radius: 9999px;
  padding: 3px;
  gap: 4px;
  border: 1px solid #16241f;
}

.type-btn {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  color: #7b8e87;
  padding: 6px 0;
  font-size: 12px;
  border-radius: 9999px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.type-btn.active {
  background: #17382a;
  color: #2cd58a;
  border-color: rgba(44, 213, 138, 0.25);
  box-shadow: 0 1px 5px rgba(44, 213, 138, 0.15);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label-row {
  min-height: 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-box {
  display: flex;
  align-items: center;
  background: #0d1512;
  border: 1px solid #16241f;
  border-radius: 12px;
  padding: 0 12px;
  height: 42px;
  min-height: 42px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-box:focus-within {
  border-color: #1eb972;
  box-shadow: 0 0 10px rgba(30, 185, 114, 0.2);
}

.form-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #f8fafc;
  padding: 0;
  font-size: 14px;
  line-height: 40px;
  height: 100%;
  outline: none;
  box-sizing: border-box;
}

.unit {
  color: #7b8e87;
  font-size: 11px;
  font-weight: 700;
}

.mid-btn-pill {
  background: #12241d;
  color: #2cd58a;
  border: 1px solid rgba(44, 213, 138, 0.25);
  border-radius: 9999px;
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  line-height: 18px;
  transition: all 0.15s ease;
}

.mid-btn-pill:hover {
  background: #1a382b;
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.45);
}

.lock-session-pill {
  background: #231d10;
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 9999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lock-session-pill:hover {
  background: #332612;
  border-color: rgba(251, 191, 36, 0.45);
  color: #fde047;
}

.pct-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 8px;
}

.pct-btn {
  background: #0e1613;
  border: 1px solid #182620;
  color: #7b8e87;
  border-radius: 9999px;
  padding: 6px 0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.pct-btn:hover {
  background: #162820;
  border-color: rgba(44, 213, 138, 0.35);
  color: #2cd58a;
  box-shadow: 0 1px 6px rgba(44, 213, 138, 0.12);
}

.summary-box {
  background: rgba(13, 21, 18, 0.7);
  border: 1px solid #16241f;
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.submit-trade-btn {
  width: 100%;
  height: 46px;
  border-radius: 9999px;
  border: none;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.3px;
  color: #071a12;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-buy {
  background: #1eb972;
  color: #071a12;
  box-shadow: 0 4px 18px rgba(30, 185, 114, 0.3);
}

.btn-buy:hover:not(:disabled) {
  background: #23cb7f;
  box-shadow: 0 6px 24px rgba(35, 203, 127, 0.42);
  transform: translateY(-1px);
}

.btn-sell {
  background: #d84549;
  color: #ffffff;
  box-shadow: 0 4px 18px rgba(216, 69, 73, 0.3);
}

.btn-sell:hover:not(:disabled) {
  background: #ea4d52;
  box-shadow: 0 6px 24px rgba(234, 77, 82, 0.42);
  transform: translateY(-1px);
}

.btn-unlock {
  background: #17382a !important;
  color: #2cd58a !important;
  border: 1px solid rgba(44, 213, 138, 0.35) !important;
  box-shadow: 0 4px 16px rgba(44, 213, 138, 0.2) !important;
}

.btn-unlock:hover {
  background: #1e4534 !important;
  box-shadow: 0 6px 20px rgba(44, 213, 138, 0.3) !important;
  transform: translateY(-1px);
}

.submit-trade-btn.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(35%);
  box-shadow: none !important;
  transform: none !important;
}

/* Dribbble-Style Orderbook Ratio Footer */
.ob-ratio-footer {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #14221c;
  background: #080e0c;
  flex-shrink: 0;
}

.ratio-pill {
  height: 36px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  transition: all 0.3s ease;
}

.ratio-bid {
  background: #177a51;
  box-shadow: 0 2px 8px rgba(23, 122, 81, 0.25);
}

.ratio-ask {
  background: #8e3034;
  box-shadow: 0 2px 8px rgba(142, 48, 52, 0.25);
}

.deposit-pill {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2));
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.deposit-pill:hover {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  color: #ffffff;
  border-color: transparent;
  transform: translateY(-1px);
}

.withdraw-pill {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
  color: #c084fc;
  border: 1px solid rgba(139, 92, 246, 0.4);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.withdraw-pill:hover {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #ffffff;
  border-color: transparent;
  transform: translateY(-1px);
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #1e293b;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
}

.modal-icon {
  font-size: 22px;
}

.modal-subtitle {
  font-size: 11px;
  color: #94a3b8;
  margin: 2px 0 0 0;
}

.modal-close-btn {
  background: #0d1512;
  border: 1px solid #16241f;
  color: #7b8e87;
  font-size: 15px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  background: #17382a;
  border-color: rgba(44, 213, 138, 0.35);
  color: #2cd58a;
}

.modal-body {
  padding: 20px;
}

.modal-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
}

.asset-selector-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 6px;
}

.asset-btn {
  background: #0d1512;
  border: 1px solid #16241f;
  color: #7b8e87;
  padding: 8px;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.asset-btn:hover {
  border-color: rgba(44, 213, 138, 0.35);
  color: #f8fafc;
  background: #12221b;
}

.asset-btn.active {
  background: #17382a;
  border-color: rgba(44, 213, 138, 0.35);
  color: #2cd58a;
  box-shadow: 0 2px 8px rgba(44, 213, 138, 0.18);
}

.modal-info-box {
  background: #1e293b;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  font-size: 11px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #1e293b;
  background: #090e1a;
}

.btn-cancel {
  background: #0d1512;
  border: 1px solid #16241f;
  color: #7b8e87;
  padding: 9px 20px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background: #17241f;
  color: #f8fafc;
  border-color: #23352d;
}

.btn-confirm-deposit {
  background: #1eb972;
  border: none;
  color: #071a12;
  padding: 9px 22px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(30, 185, 114, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-confirm-deposit:hover:not(:disabled) {
  background: #23cb7f;
  box-shadow: 0 6px 20px rgba(35, 203, 127, 0.42);
  transform: translateY(-1px);
}

.btn-confirm-deposit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.btn-confirm-withdraw {
  background: #1eb972;
  border: none;
  color: #071a12;
  padding: 9px 22px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(30, 185, 114, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-confirm-withdraw:hover:not(:disabled) {
  background: #23cb7f;
  box-shadow: 0 6px 20px rgba(35, 203, 127, 0.42);
  transform: translateY(-1px);
}

.btn-confirm-withdraw:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* Toast Notifications Container */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 380px;
  pointer-events: none;
}

.toast-card {
  pointer-events: auto;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-left: 4px solid #3b82f6;
  border-radius: 8px;
  padding: 12px 14px;
  color: #f8fafc;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-card.success {
  border-left-color: #10b981;
}

.toast-card.error {
  border-left-color: #ef4444;
}

.toast-card.trade {
  border-left-color: #8b5cf6;
}

.toast-card.warning {
  border-left-color: #f59e0b;
}

.toast-card.info {
  border-left-color: #3b82f6;
}

.toast-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-bottom: 4px;
}

.toast-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.toast-close:hover {
  color: #f8fafc;
}

.toast-card-body {
  font-size: 12px;
  color: #cbd5e1;
  line-height: 1.4;
  white-space: pre-line;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
