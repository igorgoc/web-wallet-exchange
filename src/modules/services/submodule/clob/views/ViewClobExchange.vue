<template>
  <div class="clob-wrapper">
    <!-- Top Bar / Cockpit Header -->
    <header class="clob-header">
      <div class="header-left">
        <!-- Back to Wallet Button -->
        <button 
          type="button" 
          @click="handleBackToWallet" 
          class="back-wallet-btn" 
          :title="isWalletLoggedIn ? 'Back to Wallet Dashboard' : 'Back to Wallet Selection'"
        >
          <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Wallet</span>
        </button>

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

        <div class="stat-item main-price mobile-hide">
          <span class="stat-val font-mono stat-price-white">{{ formatCleanPrice(currentPrice) }}</span>
          <span class="stat-change" :class="lastTradeSide === 'buy' ? 'up' : 'down'">+4.16%</span>
        </div>

        <div class="stat-sep mobile-hide"></div>

        <div class="stat-item mobile-hide">
          <span class="stat-lbl">24h High</span>
          <span class="stat-val font-mono">{{ formatCleanPrice(high24h) }}</span>
        </div>
        <div class="stat-item mobile-hide">
          <span class="stat-lbl">24h Low</span>
          <span class="stat-val font-mono">{{ formatCleanPrice(low24h) }}</span>
        </div>
        <div class="stat-item mobile-hide">
          <span class="stat-lbl">24h Volume</span>
          <span class="stat-val font-mono">{{ volume24h.toLocaleString() }} XPX</span>
        </div>
      </div>

      <div class="header-right">
        <!-- User Active Wallet & Tradeable Balance Area (Desktop) -->
        <div class="wallet-balance-area font-mono mobile-hide" v-if="activeAccount">
          <template v-if="isClobBalanceLoaded || hasCachedClobBalance">
            <span class="bal-val text-emerald-400" title="Tradeable XPX">{{ totalAvailableXpx.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }} XPX</span>
            <span class="bal-sep">•</span>
            <span v-if="isBnbPair" class="bal-val text-emerald-400" title="Tradeable BNB">{{ totalAvailableBnb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) }} BNB</span>
            <span v-else class="bal-val text-emerald-400" title="Tradeable USDT">${{ totalAvailableUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} USDT</span>
          </template>
          <span v-else class="bal-val text-slate-400" title="Syncing trading account balance">Syncing balance...</span>
          <span class="bal-sep">•</span>
          <button
            v-if="hasSmartTradingAccount"
            type="button"
            class="header-action-pill pill-activated"
            disabled
            :title="`Smart Trading Account Active: ${tradingAccountAddress}`"
          >
            Smart trading activated
          </button>
          <button
            v-else-if="isTradingAccountPending"
            type="button"
            class="header-action-pill pill-pending"
            disabled
            title="2-of-2 Multisig activation confirming on Sirius L1 (~15s)"
          >
            Activating...
          </button>
          <button
            v-else-if="!isTradingAccountStatusLoaded"
            type="button"
            class="header-action-pill pill-syncing"
            disabled
            title="Checking Smart Trading account status..."
          >
            Syncing...
          </button>
          <button
            v-else
            type="button"
            class="header-action-pill pill-activate"
            @click="openTradingSetupModal"
            title="Activate Non-Custodial 2-of-2 Co-Signed Smart Trading Account"
          >
            Activate Smart Trading
          </button>
          <button
            v-if="hasSmartTradingAccount"
            type="button"
            class="header-action-pill pill-topup"
            @click="openTopUpModal"
            title="Transfer coins from Personal Wallet to your 2-of-2 Smart Trading Account"
          >
            + Top Up
          </button>
          <button
            type="button"
            class="header-action-pill pill-withdraw"
            @click="openWithdrawModal"
            :title="hasSmartTradingAccount ? 'Co-sign non-custodial withdrawal from Smart Trading Account to Personal Wallet' : 'Withdraw funds from CLOB Vault to L1 wallet'"
          >
            Withdraw
          </button>
        </div>

        <!-- Direct Faucet Button (Testnet only) -->
        <button 
          v-if="getActiveNetworkId() !== 184 && isFaucetSupported" 
          type="button" 
          class="mobile-faucet-btn" 
          @click="claimFaucet" 
          :disabled="isClaimingFaucet"
          title="Claim free testnet XPX & USDT"
        >
          <span class="faucet-drop" :class="{ 'spin-pulse': isClaimingFaucet }">💧</span>
          <span class="faucet-txt">{{ isClaimingFaucet ? 'Claiming...' : 'Faucet' }}</span>
        </button>

        <!-- Small Dot Connection Indicator -->
        <div class="conn-dot-container flex-shrink-0" :title="isConnected ? 'Connected to SiriusCLOB' : 'Offline'">
          <span class="conn-dot" :class="isConnected ? 'online' : 'offline'"></span>
        </div>
      </div>
    </header>

    <!-- Main Trading Grid (Desktop 3-Column Workstation) -->
    <main class="clob-grid" v-if="!isMobile">
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
                role="button"
                tabindex="0"
                @click="setOrderPrice(ask.price)"
                @keydown.enter.prevent="setOrderPrice(ask.price)"
                @keydown.space.prevent="setOrderPrice(ask.price)"
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
                role="button"
                tabindex="0"
                @click="setOrderPrice(bid.price)"
                @keydown.enter.prevent="setOrderPrice(bid.price)"
                @keydown.space.prevent="setOrderPrice(bid.price)"
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
                v-for="(trade, idx) in trades.slice(0, 100)" 
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
                Available: {{ (!activeAccount || isClobBalanceLoaded || hasCachedClobBalance) ? (orderSide === 'buy' ? (isBnbPair ? totalAvailableBnb.toFixed(4) + ' BNB' : '$' + totalAvailableUsdt.toFixed(2) + ' USDT') : (totalAvailableXpx.toLocaleString() + ' XPX')) : '...' }}
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
              <span class="font-mono text-slate-200">{{ estimatedFeeDisplay }}</span>
            </div>
          </div>

          <!-- Submit Order Button / Unlock To Trade -->
          <button 
            v-if="!activeAccount"
            type="button"
            class="submit-trade-btn btn-unlock"
            @click="router.push({ name: 'Home' })"
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

    <!-- Mobile Trading Layout (iPhone / Android) -->
    <main class="clob-mobile-main" v-else>
      <!-- 1. LIVE CANDLESTICK CHART (ALWAYS VISIBLE & MOUNTED) -->
      <div class="mobile-chart-section" :class="{ 'chart-expanded': isChartExpanded }">
        <div class="panel chart-panel mobile-chart-panel">
          <div class="panel-header">
            <div class="chart-header-left">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-100 text-xs">{{ selectedPair }}</span>
                <span class="font-mono text-xs font-bold" :class="lastTradeSide === 'buy' ? 'text-emerald-400' : 'text-rose-400'">
                  {{ formatCleanPrice(currentPrice) }}
                </span>
              </div>
              <!-- Mini OHLC Values on Hover/Live -->
              <div class="ohlc-bar font-mono text-[9px]" v-if="hoverCandle || latestCandle">
                <span class="lbl">O</span><span class="ohlc-val">{{ formatCleanPrice((hoverCandle || latestCandle)!.o) }}</span>
                <span class="lbl">H</span><span class="ohlc-val">{{ formatCleanPrice((hoverCandle || latestCandle)!.h) }}</span>
                <span class="lbl">L</span><span class="ohlc-val">{{ formatCleanPrice((hoverCandle || latestCandle)!.l) }}</span>
                <span class="lbl">C</span><span class="ohlc-val" :class="(hoverCandle || latestCandle)!.c >= (hoverCandle || latestCandle)!.o ? 'up' : 'down'">{{ formatCleanPrice((hoverCandle || latestCandle)!.c) }}</span>
              </div>
            </div>
            <div class="chart-actions flex items-center gap-1">
              <button 
                v-for="tf in (['1m', '5m', '15m', '1h'] as const)" 
                :key="tf"
                type="button"
                class="chart-btn text-[11px] px-2 py-0.5"
                :class="{ active: activeInterval === tf }"
                @click="changeInterval(tf)"
              >
                {{ tf }}
              </button>
              <button 
                type="button" 
                class="chart-btn text-[11px] px-2 py-0.5 ml-1" 
                :class="{ active: isChartExpanded }"
                @click="toggleExpandChart" 
                :title="isChartExpanded ? 'Collapse Chart' : 'Expand Chart'"
              >
                {{ isChartExpanded ? '⤡' : '⤢' }}
              </button>
            </div>
          </div>
          <div class="mobile-market-stats font-mono" v-show="!isChartExpanded">
            <span><span class="text-slate-500">24h H</span> {{ formatCleanPrice(high24h) }}</span>
            <span class="text-slate-700">•</span>
            <span><span class="text-slate-500">L</span> {{ formatCleanPrice(low24h) }}</span>
            <span class="text-slate-700">•</span>
            <span><span class="text-slate-500">Vol</span> {{ formatCompactNumber(volume24h) }} XPX</span>
          </div>
          <div class="tv-chart-container mobile-tv-chart" ref="chartContainerMobileRef"></div>
        </div>
      </div>

      <!-- 2. MOBILE TABS: [ Trade ] | [ Order Book ] | [ Orders ] -->
      <nav class="mobile-segmented-bar" v-show="!isChartExpanded">
        <button 
          type="button" 
          class="mobile-segment-btn" 
          :class="{ active: mobileTradeTab === 'trade' }" 
          @click="mobileTradeTab = 'trade'"
        >
          <span class="segment-icon">⚡</span>
          <span>Trade</span>
        </button>
        <button 
          type="button" 
          class="mobile-segment-btn" 
          :class="{ active: mobileTradeTab === 'book' }" 
          @click="mobileTradeTab = 'book'"
        >
          <span class="segment-icon">📖</span>
          <span>Order Book</span>
        </button>
        <button 
          type="button" 
          class="mobile-segment-btn" 
          :class="{ active: mobileTradeTab === 'orders' }" 
          @click="mobileTradeTab = 'orders'"
        >
          <span class="segment-icon">📋</span>
          <span>Orders</span>
          <span v-if="myOpenOrders.length > 0" class="mobile-order-badge">{{ myOpenOrders.length }}</span>
        </button>
      </nav>

      <!-- 3. TAB A: TRADE TICKET (Full-width, clean, spacious) -->
      <div v-show="mobileTradeTab === 'trade' && !isChartExpanded" class="mobile-trade-view">
        <!-- Available Balances & Smart Trading Actions Card -->
        <div class="mobile-bal-card">
          <div class="flex justify-between items-center gap-2 text-xs">
            <div v-if="activeAccount" class="flex items-center gap-1.5 min-w-0 truncate">
              <span class="text-slate-400">Tradeable:</span>
              <template v-if="isClobBalanceLoaded || hasCachedClobBalance">
                <span class="text-emerald-400 font-mono font-bold">{{ totalAvailableXpx.toLocaleString(undefined, { maximumFractionDigits: 2 }) }} XPX</span>
                <span class="text-slate-600">•</span>
                <span v-if="isBnbPair" class="text-emerald-400 font-mono font-bold">{{ totalAvailableBnb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) }} BNB</span>
                <span v-else class="text-emerald-400 font-mono font-bold">${{ totalAvailableUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} USDT</span>
              </template>
              <span v-else class="text-slate-400 font-mono">Syncing...</span>
            </div>
            <div v-else class="text-slate-400 text-[11px]">
              Connect wallet to manage Smart Trading &amp; balances
            </div>
            <button
              v-if="activeAccount && getActiveNetworkId() === 184 && sessionTradingPrivateKey"
              type="button"
              @click="lockTradingSession"
              class="lock-session-pill flex-shrink-0"
              title="Lock trading session"
            >
              🔒 Lock
            </button>
          </div>

          <div v-if="activeAccount" class="mobile-action-pills">
            <button
              v-if="hasSmartTradingAccount"
              type="button"
              class="header-action-pill pill-activated"
              disabled
              :title="`Smart Trading Account Active: ${tradingAccountAddress}`"
            >
              Smart trading activated
            </button>
            <button
              v-else-if="isTradingAccountPending"
              type="button"
              class="header-action-pill pill-pending"
              disabled
              title="2-of-2 Multisig activation confirming on Sirius L1 (~15s)"
            >
              Activating...
            </button>
            <button
              v-else-if="!isTradingAccountStatusLoaded"
              type="button"
              class="header-action-pill pill-syncing"
              disabled
              title="Checking Smart Trading account status..."
            >
              Syncing...
            </button>
            <button
              v-else
              type="button"
              class="header-action-pill pill-activate"
              @click="openTradingSetupModal"
              title="Activate Non-Custodial 2-of-2 Co-Signed Smart Trading Account"
            >
              Activate Smart Trading
            </button>
            <button
              v-if="hasSmartTradingAccount"
              type="button"
              class="header-action-pill pill-topup"
              @click="openTopUpModal"
              title="Transfer coins from Personal Wallet to your 2-of-2 Smart Trading Account"
            >
              + Top Up
            </button>
            <button
              type="button"
              class="header-action-pill pill-withdraw"
              @click="openWithdrawModal"
              :title="hasSmartTradingAccount ? 'Co-sign non-custodial withdrawal from Smart Trading Account to Personal Wallet' : 'Withdraw funds from CLOB Vault to L1 wallet'"
            >
              Withdraw
            </button>
          </div>

          <div v-if="activeAccount && hasSmartTradingAccount && pendingSettlementNotice" class="pending-settle-banner mobile-pending-banner mt-2">
            <div class="text-[11px] text-amber-300 leading-snug">
              ⏳ <strong>{{ pendingSettlementNotice }}</strong>
            </div>
            <button
              v-if="(tradingAccountInfo?.pendingSettlementsCount || 0) > 0"
              type="button"
              class="settle-now-btn"
              :disabled="isSettlingPending"
              @click="settlePendingTradesNow"
            >
              {{ isSettlingPending ? 'Settling...' : 'Co-Sign & Settle' }}
            </button>
          </div>
        </div>

        <!-- The Full-Width Order Ticket Card -->
        <div class="mobile-ticket-card">
          <!-- Buy / Sell Mode Toggle -->
          <div class="side-toggle mb-2.5">
            <button 
              type="button"
              class="side-btn" 
              :class="{ 'active-buy': orderSide === 'buy' }" 
              @click="orderSide = 'buy'"
            >
              Buy XPX
            </button>
            <button 
              type="button"
              class="side-btn" 
              :class="{ 'active-sell': orderSide === 'sell' }" 
              @click="orderSide = 'sell'"
            >
              Sell XPX
            </button>
          </div>

          <!-- Limit / Market Pill Toggle -->
          <div class="type-toggle mb-2.5">
            <button 
              v-for="t in ['Limit', 'Market']" 
              :key="t"
              type="button"
              class="type-btn text-xs py-1.5"
              :class="{ active: orderType === t }"
              @click="orderType = t"
            >
              {{ t }} Order
            </button>
          </div>

          <!-- Price Input -->
          <div class="form-group mb-2" v-if="orderType === 'Limit'">
            <div class="flex justify-between items-center mb-1 text-xs">
              <label class="text-slate-300 font-medium">Price ({{ quoteSymbol }})</label>
              <div class="flex items-center gap-1.5">
                <button 
                  type="button" 
                  class="quick-fill-pill" 
                  v-if="bestBidPrice" 
                  @click="setOrderPrice(bestBidPrice)"
                  title="Fill with best bid price"
                >
                  Bid: {{ formatCleanPrice(bestBidPrice) }}
                </button>
                <button 
                  type="button" 
                  class="quick-fill-pill" 
                  v-if="bestAskPrice" 
                  @click="setOrderPrice(bestAskPrice)"
                  title="Fill with best ask price"
                >
                  Ask: {{ formatCleanPrice(bestAskPrice) }}
                </button>
              </div>
            </div>
            <div class="mobile-input-stepper-box">
              <button type="button" class="stepper-btn" @click="stepPrice(-1)">−</button>
              <input 
                type="number" 
                v-model="orderPrice" 
                step="any" 
                min="0" 
                class="mobile-clean-input font-mono" 
                placeholder="0.000000"
              />
              <button type="button" class="stepper-btn" @click="stepPrice(1)">+</button>
            </div>
          </div>

          <div class="form-group mb-2" v-else>
            <div class="flex justify-between items-center mb-1 text-xs">
              <label class="text-slate-300 font-medium">Price</label>
              <span class="mid-btn-pill">Best Available Market</span>
            </div>
            <div class="input-box">
              <input 
                type="text" 
                readonly 
                :value="formatCleanPrice(orderSide === 'buy' ? bestAskPrice : bestBidPrice) || 'Market Price'" 
                class="form-input font-mono cursor-default text-slate-300"
              />
              <span class="unit text-xs">{{ quoteSymbol }}</span>
            </div>
          </div>

          <!-- Amount Input -->
          <div class="form-group mb-2">
            <div class="flex justify-between items-center mb-1 text-xs">
              <label class="text-slate-300 font-medium">Amount (XPX)</label>
              <span class="text-slate-400 font-mono text-[11px]">
                Max: {{ maxOrderAmountDisplay }}
              </span>
            </div>
            <div class="mobile-input-stepper-box">
              <button type="button" class="stepper-btn" @click="stepAmount(-100)">−</button>
              <input 
                type="number" 
                v-model="orderAmount" 
                step="any" 
                min="1" 
                placeholder="0" 
                class="mobile-clean-input font-mono"
              />
              <button type="button" class="stepper-btn" @click="stepAmount(100)">+</button>
            </div>

            <!-- 25 / 50 / 75 / 100% Buttons -->
            <div class="pct-grid mt-2">
              <button v-for="pct in [25, 50, 75, 100]" :key="pct" type="button" class="pct-btn text-xs py-1.5" @click="setAmountPct(pct)">
                {{ pct }}%
              </button>
            </div>
          </div>

          <!-- Order Total / Fee Details -->
          <div class="summary-box my-2 py-1.5 px-3 text-xs">
            <div class="summary-row flex justify-between">
              <span class="text-slate-400">Order Value</span>
              <span class="font-mono text-slate-200 font-semibold">{{ formatCleanTotal(effectiveOrderPrice * (Number(orderAmount) || 0)) }} {{ quoteSymbol }}</span>
            </div>
            <div class="summary-row flex justify-between">
              <span class="text-slate-400">Est. Fee</span>
              <span class="font-mono text-slate-200">{{ estimatedFeeDisplay }}</span>
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            v-if="!activeAccount"
            type="button"
            class="submit-trade-btn btn-unlock text-sm py-3"
            @click="router.push({ name: 'Home' })"
          >
            Connect Wallet
          </button>
          <button 
            v-else-if="getActiveNetworkId() === 184 && !sessionTradingPrivateKey"
            type="button"
            class="submit-trade-btn btn-unlock text-sm py-3"
            @click="pendingAction = 'order'; showPasswordModal = true; passwordError = ''"
          >
            Unlock to Trade
          </button>
          <button 
            v-else
            type="button"
            class="submit-trade-btn text-sm py-3 font-extrabold" 
            :class="[
              orderSide === 'buy' ? 'btn-buy' : 'btn-sell',
              { 'btn-disabled': isInsufficientTotalBalance || !orderAmount || Number(orderAmount) <= 0 }
            ]"
            :disabled="isSubmitting"
            @click="handleTradeButtonClick"
          >
            <span v-if="isSubmitting" class="flex items-center justify-center gap-1.5">
              <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Placing Order...</span>
            </span>
            <span v-else-if="!orderAmount || Number(orderAmount) <= 0">Enter Amount</span>
            <span v-else-if="isInsufficientTotalBalance">Insufficient {{ orderSide === 'buy' ? quoteSymbol : 'XPX' }}</span>
            <span v-else>{{ orderSide === 'buy' ? 'Buy XPX' : 'Sell XPX' }}</span>
          </button>
        </div>

        <!-- Mini Live Order Book Strip Below Ticket (Top 3 Asks, Mid, Top 3 Bids) -->
        <div class="mobile-mini-book-card mt-3">
          <div class="flex justify-between items-center px-3 py-2 border-b border-[#14221c]">
            <span class="text-xs font-bold text-slate-300">Live Order Book Quick-Fill</span>
            <button type="button" class="text-xs text-emerald-400 hover:underline font-semibold" @click="mobileTradeTab = 'book'">
              Full Book ({{ asks.length + bids.length }}) →
            </button>
          </div>
          <div class="p-2">
            <!-- Asks -->
            <div class="flex flex-col gap-1">
              <div 
                v-for="ask in mobileDisplayedAsks.slice(0, 3)" 
                :key="ask.orderId" 
                class="flex justify-between items-center px-2 py-1 rounded cursor-pointer bg-slate-900/40 hover:bg-rose-950/30"
                @click="setOrderPrice(ask.price)"
              >
                <span class="font-mono text-rose-400 text-xs font-bold">{{ formatCleanPrice(ask.price) }}</span>
                <span class="font-mono text-slate-400 text-xs">{{ formatCompactNumber(ask.amount) }} XPX</span>
              </div>
            </div>
            <!-- Mid Price -->
            <div class="flex justify-between items-center px-2 py-1 my-1 bg-slate-800/40 rounded border border-slate-700/40">
              <span class="font-mono text-xs font-bold" :class="lastTradeSide === 'buy' ? 'text-emerald-400' : 'text-rose-400'">
                {{ formatCleanPrice(currentPrice) }} {{ quoteSymbol }}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">Spread: {{ spreadPct }}%</span>
            </div>
            <!-- Bids -->
            <div class="flex flex-col gap-1">
              <div 
                v-for="bid in mobileDisplayedBids.slice(0, 3)" 
                :key="bid.orderId" 
                class="flex justify-between items-center px-2 py-1 rounded cursor-pointer bg-slate-900/40 hover:bg-emerald-950/30"
                @click="setOrderPrice(bid.price)"
              >
                <span class="font-mono text-emerald-400 text-xs font-bold">{{ formatCleanPrice(bid.price) }}</span>
                <span class="font-mono text-slate-400 text-xs">{{ formatCompactNumber(bid.amount) }} XPX</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Collapsible Open Orders Drawer at bottom of Trade Tab -->
        <div class="mobile-open-orders-card mt-3">
          <div class="flex justify-between items-center px-3 py-2 border-b border-[#14221c]">
            <span class="text-xs font-bold text-slate-200">Open Orders ({{ myOpenOrders.length }})</span>
            <button type="button" class="text-xs text-emerald-400 hover:underline" @click="mobileTradeTab = 'orders'">
              View All ({{ myOpenOrders.length }}) →
            </button>
          </div>
          <div v-if="myOpenOrders.length > 0" class="divide-y divide-slate-800/40">
            <div v-for="order in myOpenOrders.slice(0, 2)" :key="order.id" class="px-3 py-2 flex justify-between items-center text-xs">
              <div>
                <span :class="order.side === 'Buy' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'">{{ order.side }}</span>
                <span class="ml-1 text-slate-200 font-mono">{{ order.amount.toLocaleString() }} XPX</span>
                <span class="text-slate-400 ml-1 font-mono">@ {{ formatCleanPrice(order.price) }}</span>
              </div>
              <button type="button" class="cancel-btn text-[10px] py-1 px-3" @click="cancelOrder(order.id)">Cancel</button>
            </div>
          </div>
          <div v-else class="text-center py-3 text-xs text-slate-500">
            No open orders
          </div>
        </div>
      </div>

      <!-- 4. TAB B: DEDICATED FULL-WIDTH ORDER BOOK (No squeezing!) -->
      <div v-show="mobileTradeTab === 'book' && !isChartExpanded" class="mobile-book-full-view">
        <div class="panel book-panel mobile-book-panel">
          <div class="panel-header flex justify-between items-center">
            <span class="font-bold text-slate-200 text-xs">Live Order Book</span>
            <div class="text-[11px] font-mono text-slate-400">
              Spread: <span class="text-slate-200">{{ formatCleanPrice(spread) }}</span> ({{ spreadPct }}%)
            </div>
          </div>
          <div class="ob-table-header px-3 py-1.5 text-[11px] text-slate-400 grid grid-cols-3 border-b border-slate-800">
            <span>Price ({{ quoteSymbol }})</span>
            <span class="text-right">Size (XPX)</span>
            <span class="text-right">Total ({{ quoteSymbol }})</span>
          </div>
          <!-- Full Asks List -->
          <div class="mobile-full-ob-list">
            <div 
              v-for="ask in asks.slice(0, 10)" 
              :key="ask.orderId" 
              class="ob-row mobile-ob-full-row ask cursor-pointer"
              @click="setOrderPrice(ask.price); mobileTradeTab = 'trade'"
              title="Tap to fill price into trade ticket"
            >
              <div class="ob-depth-bar" :style="{ width: calcDepth(ask.amount, maxAskDepth) + '%' }"></div>
              <span class="ob-cell font-mono text-rose-400 font-bold text-xs">{{ formatCleanPrice(ask.price) }}</span>
              <span class="ob-cell font-mono text-right text-slate-300 text-xs">{{ ask.amount.toLocaleString() }}</span>
              <span class="ob-cell font-mono text-right text-slate-400 text-xs">{{ (ask.price * ask.amount).toFixed(2) }}</span>
            </div>
            <div v-if="asks.length === 0" class="empty-state py-4 text-xs">No asks available</div>
          </div>
          <!-- Mid Market Bar -->
          <div class="mobile-ob-mid px-3 py-2 my-1">
            <span class="font-mono font-bold text-sm" :class="lastTradeSide === 'buy' ? 'text-emerald-400' : 'text-rose-400'">
              {{ formatCleanPrice(currentPrice) }} {{ quoteSymbol }}
            </span>
            <span class="text-xs text-slate-400 font-mono">24h Spread: {{ spreadPct }}%</span>
          </div>
          <!-- Full Bids List -->
          <div class="mobile-full-ob-list">
            <div 
              v-for="bid in bids.slice(0, 10)" 
              :key="bid.orderId" 
              class="ob-row mobile-ob-full-row bid cursor-pointer"
              @click="setOrderPrice(bid.price); mobileTradeTab = 'trade'"
              title="Tap to fill price into trade ticket"
            >
              <div class="ob-depth-bar" :style="{ width: calcDepth(bid.amount, maxBidDepth) + '%' }"></div>
              <span class="ob-cell font-mono text-emerald-400 font-bold text-xs">{{ formatCleanPrice(bid.price) }}</span>
              <span class="ob-cell font-mono text-right text-slate-300 text-xs">{{ bid.amount.toLocaleString() }}</span>
              <span class="ob-cell font-mono text-right text-slate-400 text-xs">{{ (bid.price * bid.amount).toFixed(2) }}</span>
            </div>
            <div v-if="bids.length === 0" class="empty-state py-4 text-xs">No bids available</div>
          </div>
        </div>
      </div>

      <!-- 5. TAB C: OPEN ORDERS & MY TRADES -->
      <div v-show="mobileTradeTab === 'orders' && !isChartExpanded" class="mobile-orders-view">
        <div class="panel orders-tabs-panel mobile-orders-panel">
          <div class="panel-header tab-header">
            <div class="tabs">
              <button 
                type="button"
                class="tab-btn" 
                :class="{ active: activeTab === 'orders' }" 
                @click="activeTab = 'orders'"
              >
                Open Orders ({{ myOpenOrders.length }})
              </button>
              <button 
                type="button"
                class="tab-btn" 
                :class="{ active: activeTab === 'myTrades' }" 
                @click="activeTab = 'myTrades'"
              >
                My Trades ({{ myTrades.length }})
              </button>
            </div>
            <button 
              v-if="activeTab === 'orders' && myOpenOrders.length > 0" 
              type="button"
              class="cancel-all-btn" 
              @click="cancelAllOrders" 
              title="Cancel all open orders on this pair"
            >
              Cancel All
            </button>
          </div>

          <div class="tab-content">
            <!-- Open Orders Cards -->
            <div v-if="activeTab === 'orders'" class="table-container">
              <div v-if="myOpenOrders.length === 0" class="empty-state py-12">
                <p class="text-slate-400">No open orders</p>
              </div>
              <div v-else class="mobile-order-cards">
                <div v-for="order in myOpenOrders" :key="order.id" class="mobile-order-card">
                  <div class="mobile-order-card-header">
                    <span :class="order.side === 'Buy' ? 'text-emerald-400' : 'text-rose-400'" class="font-bold text-sm">
                      {{ order.side }} {{ selectedPair.split('/')[0] }}
                    </span>
                    <span class="text-slate-400 text-xs font-mono">#{{ order.id }}</span>
                  </div>
                  <div class="mobile-order-card-body">
                    <div class="mobile-order-field">
                      <span class="field-lbl">Price</span>
                      <span class="field-val font-mono">{{ formatCleanPrice(order.price) }}</span>
                    </div>
                    <div class="mobile-order-field">
                      <span class="field-lbl">Amount</span>
                      <span class="field-val font-mono">{{ order.amount.toLocaleString() }}</span>
                    </div>
                    <div class="mobile-order-field">
                      <span class="field-lbl">Filled</span>
                      <span class="field-val font-mono">{{ order.filled || '0%' }}</span>
                    </div>
                  </div>
                  <div class="mobile-order-card-footer mt-2">
                    <button type="button" class="cancel-btn mobile-cancel-btn" @click="cancelOrder(order.id)">
                      Cancel Order
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- My Trades Cards -->
            <div v-if="activeTab === 'myTrades'" class="table-container">
              <div v-if="myTrades.length === 0" class="empty-state py-12">
                <p class="text-slate-400">No personal trades executed yet</p>
              </div>
              <div v-else class="mobile-trade-cards">
                <div v-for="(trade, idx) in myTrades" :key="idx" class="mobile-trade-card">
                  <div class="flex justify-between items-center text-xs">
                    <span :class="trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'" class="font-bold uppercase">
                      {{ trade.side }}
                    </span>
                    <span class="text-slate-400 font-mono">{{ trade.time }}</span>
                  </div>
                  <div class="flex justify-between items-center text-xs mt-1">
                    <span class="text-slate-300 font-mono">{{ formatCleanPrice(trade.price) }} {{ quoteSymbol }}</span>
                    <span class="text-slate-200 font-mono">{{ trade.amount.toLocaleString() }} XPX</span>
                  </div>
                  <div class="text-right text-[11px] text-slate-400 font-mono mt-1">
                    Total: {{ formatCleanTotal(trade.price * trade.amount) }} {{ quoteSymbol }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Password Unlock Modal for Session Trading -->
    <div v-if="showPasswordModal" class="modal-overlay" style="z-index: 10050" @click.self="showPasswordModal = false">
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

    <!-- Native Co-Signed Smart Trading Account Setup Modal (Solution 2 Model A) -->
    <TradingAccountSetupModal
      :visible="showTradingSetupModal"
      :activeAccount="activeAccount"
      :validatorCluster="validatorClusterInfo"
      :clobApiBase="CLOB_API_BASE"
      :networkType="getActiveNetworkId()"
      :generationHash="getActiveGenerationHash()"
      :sessionKey="sessionTradingPrivateKey"
      @close="showTradingSetupModal = false"
      @activated="onTradingAccountActivated"
    />

    <!-- Top-Up Modal: Unified Multi-Mosaic L1 Transfer from Personal Wallet to 2-of-2 Smart Trading Account -->
    <div v-if="showTopUpModal" class="modal-overlay" @click.self="showTopUpModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">📥</span>
            <div>
              <h3>Top Up Trading Account</h3>
              <p class="modal-subtitle">Send one or more coins in a single L1 transaction (~15–30s confirmation)</p>
            </div>
          </div>
          <button class="modal-close-btn" @click="showTopUpModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="multi-asset-list mb-3">
            <div v-for="asset in CLOB_ASSETS" :key="asset" class="multi-asset-row">
              <div class="multi-asset-meta">
                <span class="asset-tag">{{ asset }}</span>
                <span class="asset-avail">Wallet: {{ formatClobAsset(asset, getPersonalWalletBalance(asset)) }}</span>
              </div>
              <div class="multi-asset-controls">
                <div class="input-box multi-input-box">
                  <input
                    type="number"
                    v-model="topUpAmounts[asset]"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    class="form-input font-mono"
                  />
                  <span class="unit">{{ asset }}</span>
                </div>
                <button type="button" class="row-quick-btn" @click="setTopUpPct(asset, 50)">50%</button>
                <button type="button" class="row-quick-btn" @click="setTopUpPct(asset, 100)">Max</button>
              </div>
            </div>
          </div>

          <div class="summary-box mb-3 font-mono text-xs">
            <div class="summary-row">
              <span class="text-slate-400">Transferring</span>
              <span class="text-emerald-400 font-semibold">{{ topUpSummaryText || 'Enter amount(s) above' }}</span>
            </div>
            <div class="summary-row">
              <span class="text-slate-400">From → To</span>
              <span class="text-slate-300">{{ activeAccount ? shortAddress(activeAccount.address) : '—' }} → {{ shortAddress(tradingAccountAddress) }}</span>
            </div>
            <div class="summary-row">
              <span class="text-slate-400">Confirmation</span>
              <span class="text-sky-400">Single Sirius L1 tx (~15–30s)</span>
            </div>
          </div>
          <p v-if="topUpError" class="text-xs text-rose-400 font-medium mb-2">{{ topUpError }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showTopUpModal = false">Cancel</button>
          <button class="btn-confirm-deposit" :disabled="isToppingUp || !isTopUpValid" @click="executeTopUp">
            {{ isToppingUp ? 'Broadcasting...' : 'Top Up Selected Coins' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Withdrawal Modal: Unified Multi-Mosaic Co-Signed Withdrawal to Personal Wallet -->
    <div v-if="showWithdrawModal" class="modal-overlay" @click.self="showWithdrawModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">💸</span>
            <div>
              <h3>{{ hasSmartTradingAccount ? 'Withdraw to Personal Wallet' : 'Withdraw to Sirius Wallet' }}</h3>
              <p class="modal-subtitle">
                {{ hasSmartTradingAccount
                  ? 'Withdraw XPX, USDT, and BNB together in one 2-of-2 L1 transaction (~15–30s)'
                  : 'Transfer available funds from CLOB Vault to your Sirius account' }}
              </p>
            </div>
          </div>
          <button class="modal-close-btn" @click="showWithdrawModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="multi-asset-list mb-3">
            <div v-for="asset in CLOB_ASSETS" :key="asset" class="multi-asset-row">
              <div class="multi-asset-meta">
                <span class="asset-tag">{{ asset }}</span>
                <span class="asset-avail">Avail: {{ formatClobAsset(asset, getTradingAvailableBalance(asset)) }}</span>
              </div>
              <div class="multi-asset-controls">
                <div class="input-box multi-input-box">
                  <input
                    type="number"
                    v-model="withdrawAmounts[asset]"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    class="form-input font-mono"
                  />
                  <span class="unit">{{ asset }}</span>
                </div>
                <button type="button" class="row-quick-btn" @click="setWithdrawAssetPct(asset, 50)">50%</button>
                <button type="button" class="row-quick-btn" @click="setWithdrawAssetPct(asset, 100)">Max</button>
              </div>
            </div>
          </div>

          <div v-if="hasSmartTradingAccount && pendingSettlementNotice" class="pending-settle-banner mb-3">
            <div class="text-xs text-amber-300 leading-relaxed">
              ⏳ <strong>{{ pendingSettlementNotice }}</strong>
              <span class="block text-slate-300 mt-0.5">Pending trade gains cannot be withdrawn until confirmed on Sirius L1 (~15s).</span>
            </div>
            <button
              v-if="(tradingAccountInfo?.pendingSettlementsCount || 0) > 0"
              type="button"
              class="settle-now-btn"
              :disabled="isSettlingPending"
              @click="settlePendingTradesNow"
            >
              {{ isSettlingPending ? 'Settling...' : 'Co-Sign & Settle' }}
            </button>
          </div>

          <div class="summary-box mb-3 font-mono text-xs">
            <div class="summary-row">
              <span class="text-slate-400">Net You Will Receive</span>
              <span class="text-emerald-400 font-bold">{{ withdrawSummaryText || 'Enter amount(s) above' }}</span>
            </div>
            <div class="summary-row">
              <span class="text-slate-400">Exchange Fee</span>
              <span class="text-amber-400 font-semibold">
                {{ hasSmartTradingAccount ? '0 (L1 gas only)' : '1 XPX / 1 USDT / 0.001 BNB per asset' }}
              </span>
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
            <span v-else>Withdraw Selected Coins</span>
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
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { walletState } from '@/state/walletState';
import { networkState } from '@/state/networkState';
import {
  Account,
  Address,
  AggregateTransaction,
  CosignatureTransaction,
  Deadline,
  DerivationScheme,
  KeyPair,
  Mosaic,
  MosaicId,
  Password,
  PlainMessage,
  PublicAccount,
  TransactionMapping,
  TransactionType,
  TransferTransaction,
  UInt64,
} from 'tsjs-xpx-chain-sdk';
import { WalletUtils } from '@/util/walletUtils';
import { WalletStateUtils } from '@/state/utils/walletStateUtils';
import TradingAccountSetupModal from '../components/TradingAccountSetupModal.vue';
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

const isWalletLoggedIn = computed(() => {
  return Boolean(walletState.isLogin || walletState.currentLoggedInWallet);
});

function handleBackToWallet() {
  if (isWalletLoggedIn.value) {
    router.push({ name: 'ViewDashboard' });
  } else {
    router.push({ name: 'Home' });
  }
}

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
const baseSymbol = computed(() => 'XPX');
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

function formatCleanTotal(val: number | string | any): string {
  if (val === undefined || val === null) return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (!Number.isFinite(num)) return '0.00';
  return isBnbPair.value ? num.toFixed(6) : num.toFixed(2);
}


const obTab = ref<'book' | 'trades'>('book');
const activeTab = ref<'orders' | 'myTrades'>('orders');
const orderSide = ref<'buy' | 'sell'>('buy');
const orderType = ref<string>('Limit');
const orderPrice = ref<number>(0.000076);
const orderAmount = ref<number | string>('');

const currentPrice = ref<number>(0.000076);
const high24h = ref<number>(0.000080);
const low24h = ref<number>(0.000072);
const volume24h = ref<number>(1284000);
const lastTradeSide = ref<'buy' | 'sell'>('buy');
const isConnected = ref<boolean>(false);

interface PancakeOracleData {
  ok: boolean;
  source: string;
  pairAddress: string;
  baseToken: string;
  quoteToken: string;
  xpxReserve?: number;
  bnbReserve?: number;
  priceBnb: number;
  priceUsdt: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  priceChange24h?: number;
  timestamp?: number;
}
const pancakeOracle = ref<PancakeOracleData | null>(null);

// Mobile Viewport & Tab Navigation
const isMobile = ref<boolean>(false);
const mobileTradeTab = ref<'trade' | 'book' | 'orders'>('trade');
const isChartExpanded = ref<boolean>(false);

function toggleExpandChart() {
  isChartExpanded.value = !isChartExpanded.value;
  nextTick(() => {
    const container = getActiveChartContainer();
    if (chart && container) {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        chart.applyOptions({ width: rect.width, height: rect.height });
        chart.timeScale().fitContent();
      }
    }
  });
}

function stepPrice(direction: number) {
  const step = isBnbPair.value ? 0.00000001 : 0.000001;
  const current = Number(orderPrice.value) || 0;
  const next = Math.max(0, current + direction * step);
  orderPrice.value = parseFloat(next.toFixed(priceDecimals.value));
}

function stepAmount(direction: number) {
  const current = Number(orderAmount.value) || 0;
  const next = Math.max(0, current + direction);
  orderAmount.value = next > 0 ? next : '';
}

function formatCompactNumber(val: number | string): string {
  const n = Number(val);
  if (!n || isNaN(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const mobileDisplayedAsks = computed(() => {
  return asks.value.slice(0, 6).reverse();
});

const mobileDisplayedBids = computed(() => {
  return bids.value.slice(0, 6);
});

function checkMobile() {
  if (typeof window !== 'undefined') {
    const wasMobile = isMobile.value;
    const nowMobile = window.innerWidth <= 768;
    if (wasMobile !== nowMobile) {
      isMobile.value = nowMobile;
      nextTick(() => {
        initTradingViewChart();
      });
    }
  }
}

// Selected Wallet Account vs Canonical Main Owner Account
// If the user enters the CLOB while a Trading Account (e.g. Trading (primary)) is selected,
// automatically resolve its linked Main Account in the same wallet so both behave identically.
const discoveredOwnerAddress = ref<string>('');
const discoveredOwnerPublicKey = ref<string>('');

const selectedWalletAccount = computed(() => {
  const wallet = walletState.currentLoggedInWallet;
  if (!wallet) return null;
  if (typeof wallet.selectDefaultAccount === 'function') {
    const def = wallet.selectDefaultAccount();
    if (def) return def;
  }
  return wallet.accounts?.[0] || null;
});

function normalizeAddrStr(addr?: string | null): string {
  return String(addr || '').replace(/[- ]/g, '').toUpperCase();
}

const activeAccount = computed(() => {
  const sel: any = selectedWalletAccount.value;
  if (!sel) return null;
  const wallet = walletState.currentLoggedInWallet;
  const accounts: any[] = wallet?.accounts || [];

  const linkedMain = normalizeAddrStr(sel.linkedMainAddress);
  if (linkedMain) {
    const found = accounts.find((a) => normalizeAddrStr(a?.address) === linkedMain);
    if (found) return found;
  }

  const discAddr = normalizeAddrStr(discoveredOwnerAddress.value);
  const discPub = String(discoveredOwnerPublicKey.value || '').toUpperCase();
  if (discAddr || discPub) {
    const found = accounts.find(
      (a) =>
        (discAddr && normalizeAddrStr(a?.address) === discAddr) ||
        (discPub && String(a?.publicKey || '').toUpperCase() === discPub)
    );
    if (found) return found;
  }

  return sel;
});

watch(
  () => [selectedWalletAccount.value?.publicKey, selectedWalletAccount.value?.address],
  () => {
    discoveredOwnerAddress.value = '';
    discoveredOwnerPublicKey.value = '';
  }
);

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
const hasCachedClobBalance = ref<boolean>(false);
const tradingAccountInfo = ref<any>(null);
const isTradingAccountStatusLoaded = ref<boolean>(false);

// Authoritative Real On-Chain Coins for this specific account (Personal Wallet)
const displayAccountXpx = computed(() => {
  return onChainXpx.value || 0;
});

const displayAccountUsdt = computed(() => {
  return onChainUsdt.value || 0;
});

const displayAccountBnb = computed(() => {
  return onChainBnb.value || 0;
});

const totalAvailableXpx = computed(() => {
  const base = userXpxBalance.value;
  return Math.max(0, parseFloat((base - 0.2).toFixed(6))); // Reserve 0.2 XPX for L1 network gas
});

const totalAvailableUsdt = computed(() => {
  return parseFloat(userUsdtBalance.value.toFixed(2));
});

const totalAvailableBnb = computed(() => {
  return parseFloat(userBnbBalance.value.toFixed(6));
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
        if (activeAccount.value && onChainXpx.value > 0) {
          (activeAccount.value as any).balance = onChainXpx.value;
        }
        return;
      }
    }
  } catch (_) {}

  // 2. Direct fallback to Sirius Testnet 2 / Mainnet REST Node
  try {
    let nodeEndpoint = networkState.selectedAPIEndpoint || (getActiveNetworkId() === 184 ? 'https://betelgeuse.xpxsirius.io' : 'api-2.testnet2.xpxsirius.io');
    if (getActiveNetworkId() === 184 && (!networkState.selectedAPIEndpoint || networkState.selectedAPIEndpoint.includes('testnet'))) {
      nodeEndpoint = 'https://betelgeuse.xpxsirius.io';
    }
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
      const rawAddr = (newAddr || '').replace(/[- ]/g, '').toUpperCase();
      const existingOwnerAddr = normalizeAddrStr(tradingAccountInfo.value?.tradingAccount?.ownerAddress);
      const keepExistingTradingInfo = Boolean(existingOwnerAddr && existingOwnerAddr === rawAddr);
      isClobBalanceLoaded.value = false;
      hasCachedClobBalance.value = localStorage.getItem(`clob_bal_${rawAddr}_xpx`) !== null;
      if (!keepExistingTradingInfo) {
        const cachedTradingInfo = readCachedTradingAccountInfo(rawAddr);
        if (cachedTradingInfo) {
          tradingAccountInfo.value = cachedTradingInfo;
          isTradingAccountStatusLoaded.value = true;
        } else {
          tradingAccountInfo.value = null;
          isTradingAccountStatusLoaded.value = false;
        }
      }
      // Immediately reset and isolate balances to the new account, preventing cross-wallet leaks
      userXpxBalance.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_xpx`) || '0');
      userUsdtBalance.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_usdt`) || '0.00');
      userBnbBalance.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_bnb`) || '0.00');
      lockedXpxEscrow.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_locked_xpx`) || '0');
      lockedUsdtEscrow.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_locked_usdt`) || '0.00');
      lockedBnbEscrow.value = parseFloat(localStorage.getItem(`clob_bal_${rawAddr}_locked_bnb`) || '0.00');
      if (activeAccount.value?.balance !== undefined && Number((activeAccount.value as any).balance) > 0) {
        onChainXpx.value = Number((activeAccount.value as any).balance);
      } else {
        onChainXpx.value = 0;
      }
      onChainUsdt.value = 0;
      onChainBnb.value = 0;
      fetchOnChainBalances();
      fetchTradingAccountStatus();
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
    const bnbSpot = pancakeOracle.value?.priceBnb || 0.00000014;
    currentPrice.value = bnbSpot;
    orderPrice.value = bnbSpot;
    high24h.value = bnbSpot * 1.05;
    low24h.value = bnbSpot * 0.95;
    candleData['1m'] = createSeedCandles(120, 1, bnbSpot);
    candleData['5m'] = createSeedCandles(100, 5, bnbSpot);
    candleData['15m'] = createSeedCandles(96, 15, bnbSpot);
    candleData['1h'] = createSeedCandles(72, 60, bnbSpot);
  } else {
    const usdtSpot = pancakeOracle.value?.priceUsdt || 0.000076;
    currentPrice.value = usdtSpot;
    orderPrice.value = usdtSpot;
    high24h.value = usdtSpot * 1.05;
    low24h.value = usdtSpot * 0.95;
    candleData['1m'] = createSeedCandles(120, 1, usdtSpot);
    candleData['5m'] = createSeedCandles(100, 5, usdtSpot);
    candleData['15m'] = createSeedCandles(96, 15, usdtSpot);
    candleData['1h'] = createSeedCandles(72, 60, usdtSpot);
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
  const targetAddr = (hasSmartTradingAccount.value && tradingAccountAddress.value)
    ? tradingAccountAddress.value
    : activeAccount.value?.address;
  if (!pubKey && !targetAddr) {
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
    hasSmartTradingAccount.value
      ? 'Sending testnet coins directly to your Smart Trading Account on Sirius Testnet 2...'
      : 'Broadcasting on-chain transfer on Sirius Testnet 2. Please wait for block confirmation...',
    'info',
    4000
  );

  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/faucet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: pubKey, address: targetAddr }),
    });
    const data = await res.json();
    if (data.ok && data.txHash) {
      await Promise.allSettled([fetchOnChainBalances(), fetchTradingAccountStatus()]);
      const destLabel = data.deliveredToTradingAccount || hasSmartTradingAccount.value
        ? `your Trading Account (${data.recipient || targetAddr})`
        : `${data.recipient || targetAddr}`;
      showToast(
        'On-Chain Faucet Delivered!',
        `+${data.amountXpx || 50} XPX, +${data.amountUsdt || 100} USDT & +${data.amountBnb || 0.1} BNB sent to ${destLabel} on Sirius Testnet 2! Ready to trade once confirmed (~15s).`,
        'success',
        7000,
        data.txHash
      );
      // Active verification poller: auto-refresh every 2.5s for 25s until on-chain balance reflects the transaction
      let pollCount = 0;
      const faucetPoller = setInterval(async () => {
        pollCount++;
        try {
          await Promise.allSettled([fetchOnChainBalances(), fetchTradingAccountStatus()]);
          if (pollCount >= 10) {
            clearInterval(faucetPoller);
          }
        } catch (_) {}
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
  return orderPrice.value || (isBnbPair.value ? (pancakeOracle.value?.priceBnb || 0.00000014) : (pancakeOracle.value?.priceUsdt || 0.000076));
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




// Safe Max Trade Amount Display (Avoids division by zero or NaN)
const maxOrderAmountDisplay = computed(() => {
  if (orderSide.value === 'buy') {
    const effPrice = effectiveOrderPrice.value;
    if (!effPrice || effPrice <= 0) return '0';
    const availQuote = isBnbPair.value ? totalAvailableBnb.value : totalAvailableUsdt.value;
    return Math.floor(availQuote / effPrice).toLocaleString();
  } else {
    return totalAvailableXpx.value.toLocaleString();
  }
});

// Estimated Fee Display (XPX for Buy, Quote asset for Sell)
const estimatedFeeDisplay = computed(() => {
  const amt = Number(orderAmount.value) || 0;
  const isBuy = orderSide.value === 'buy';
  const feeAsset = isBuy ? baseSymbol.value : quoteSymbol.value;
  if (amt <= 0) return `0.0000 ${feeAsset}`;
  if (orderType.value === 'Limit') {
    return `0.0000 ${feeAsset} (Maker)`;
  }
  if (isBuy) {
    // 0.10% taker fee charged in received base asset (XPX)
    return (amt * 0.001).toFixed(4) + ` ${baseSymbol.value} (0.10%)`;
  } else {
    // 0.10% taker fee charged in received quote asset (USDT or BNB)
    const quoteVal = amt * effectiveOrderPrice.value;
    return (quoteVal * 0.001).toFixed(4) + ` ${quoteSymbol.value} (0.10%)`;
  }
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
  const spot = isBnbPair.value ? (pancakeOracle.value?.priceBnb || 0.00000014) : (pancakeOracle.value?.priceUsdt || 0.000076);
  const bestBid = bids.value.length ? Number(bids.value[0].price || 0) : spot * 0.99;
  const bestAsk = asks.value.length ? Number(asks.value[0].price || 0) : spot * 1.01;
  const mid = (bestBid + bestAsk) / 2;
  orderPrice.value = parseFloat(mid.toFixed(priceDecimals.value));
}

function setAmountPct(pct: number) {
  const effectivePrice = effectiveOrderPrice.value || (isBnbPair.value ? (pancakeOracle.value?.priceBnb || 0.00000014) : (pancakeOracle.value?.priceUsdt || 0.000076));
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

// 20-minute Inactivity Session Timeout (1,200,000 ms) across all networks
const PASSWORD_EXPIRY_MS = 20 * 60 * 1000;
let sessionTimer: any = null;

function setTradingSessionKey(priv: string) {
  sessionTradingPrivateKey.value = priv;
  const rawAddr = (activeAccount.value?.address || '').replace(/[- ]/g, '').toUpperCase();
  // Persist strictly to sessionStorage for page reloads during active browser session (never in persistent localStorage)
  if (rawAddr) {
    sessionStorage.setItem('_clob_testnet_key_' + rawAddr, priv);
  }
  // Enforce 20-minute inactivity session expiration across all networks
  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }
  sessionTimer = setTimeout(() => {
    lockTradingSession();
    showToast('Trading Session Expired', 'Session expired after 20 minutes of inactivity. Please enter password to trade again.', 'info', 4000);
  }, PASSWORD_EXPIRY_MS);
}

function lockTradingSession() {
  sessionTradingPrivateKey.value = null;
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }
  const rawAddr = (activeAccount.value?.address || '').replace(/[- ]/g, '').toUpperCase();
  if (rawAddr) {
    sessionStorage.removeItem('_clob_testnet_key_' + rawAddr);
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

  // Resolve active session key from sessionStorage if available
  const rawAddr = (activeAccount.value.address || '').replace(/[- ]/g, '').toUpperCase();
  const stored = sessionStorage.getItem('_clob_testnet_key_' + rawAddr);
  if (stored) {
    try {
      const acc = Account.createFromPrivateKey(stored, netId, 1);
      if (acc.publicKey.toLowerCase() === activeAccount.value.publicKey.toLowerCase()) {
        sessionTradingPrivateKey.value = stored;
        return acc;
      }
    } catch (_) {}
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
    } else if (pendingAction.value === 'withdraw') {
      pendingAction.value = null;
      executeWithdraw();
    } else if (pendingAction.value === 'topup') {
      pendingAction.value = null;
      executeTopUp();
    } else if (pendingAction.value === 'settlePending') {
      pendingAction.value = null;
      settlePendingTradesNow();
    }
    if (hasSmartTradingAccount.value) {
      cosignAllPendingSettlements().catch(() => {});
    }
  } catch (err: any) {
    passwordError.value = 'Incorrect wallet password. Please verify your password.';
    showToast('Authorization Failed', 'Incorrect wallet password. Please try again.', 'error', 4500);
  }
}

// === Solution 2 (Model A): Native Co-Signed Smart Trading Account State & Operations ===
type ClobAsset = 'XPX' | 'USDT' | 'BNB';
const CLOB_ASSETS: ClobAsset[] = ['XPX', 'USDT', 'BNB'];

const validatorClusterInfo = ref<any>(null);
const showTradingSetupModal = ref<boolean>(false);
const showTopUpModal = ref<boolean>(false);
const topUpAmounts = ref<Record<ClobAsset, string>>({ XPX: '', USDT: '', BNB: '' });
const isToppingUp = ref<boolean>(false);
const topUpError = ref<string>('');
const cosigningSettlementIds = new Set<string>();
const cosignedSettlementIds = new Set<string>();
const shownSettlementToastIds = new Set<string>();
const recentSignedOrders = new Map<string, { pair: string; side: 'buy' | 'sell'; price: string; amount: string }>();

function hexToUint8(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function parseDecBigInt(valStr: string | number, decimals: number): bigint {
  const clean = String(valStr ?? '0').trim();
  const [intPart, fracPart = ''] = clean.split('.');
  const padded = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt((intPart.replace(/[^0-9]/g, '') || '0') + padded);
}

const hasSmartTradingAccount = computed(() => {
  return Boolean(tradingAccountInfo.value?.hasTradingAccount && tradingAccountInfo.value?.status === 'active');
});

const isTradingAccountPending = computed(() => {
  return Boolean(tradingAccountInfo.value?.hasTradingAccount && tradingAccountInfo.value?.status === 'pending');
});

const tradingAccountAddress = computed(() => {
  return tradingAccountInfo.value?.tradingAccount?.tradingAddress || '';
});

const tradingAccountPublicKey = computed(() => {
  return tradingAccountInfo.value?.tradingAccount?.tradingPublicKey || '';
});

const personalWalletXpx = computed(() => onChainXpx.value || 0);
const personalWalletUsdt = computed(() => onChainUsdt.value || 0);
const personalWalletBnb = computed(() => onChainBnb.value || 0);

function getActiveGenerationHash(): string {
  if (validatorClusterInfo.value?.generationHash) return validatorClusterInfo.value.generationHash;
  return getActiveNetworkId() === 184
    ? '10540AD3A1BF46B1A05D8B1CF0252BC9FB2E0B53CFD748262B0CE341CEAFEB6B'
    : '56D112C98F7A7E34D1AEDC4BD01BC06CA2276DD546A93E36690B785E82439CA9';
}

function getMosaicHexForAsset(asset: 'XPX' | 'USDT' | 'BNB'): string {
  const isMainnet = getActiveNetworkId() === 184;
  if (asset === 'XPX') return isMainnet ? '402B2F579FAEBC59' : '13BFC518E40549D7';
  if (asset === 'USDT') return isMainnet ? '7525381A171D1E44' : '4430AEFEF7E15D0C';
  return isMainnet ? '1E5C5FADEC7B34DD' : '3CC1D3CE7447B6F9';
}

function getActiveSiriusNodeEndpoint(): string {
  let nodeEndpoint = networkState.selectedAPIEndpoint || (getActiveNetworkId() === 184 ? 'https://betelgeuse.xpxsirius.io' : 'https://api-2.testnet2.xpxsirius.io');
  if (getActiveNetworkId() === 184 && (!networkState.selectedAPIEndpoint || networkState.selectedAPIEndpoint.includes('testnet'))) {
    nodeEndpoint = 'https://betelgeuse.xpxsirius.io';
  }
  if (!nodeEndpoint.startsWith('http://') && !nodeEndpoint.startsWith('https://')) {
    const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
    nodeEndpoint = `${proto}://${nodeEndpoint}`;
  }
  nodeEndpoint = nodeEndpoint.replace(/\/+$/, '');
  if (nodeEndpoint.startsWith('https://') && nodeEndpoint.endsWith(':3000')) {
    nodeEndpoint = nodeEndpoint.replace(':3000', '');
  }
  return nodeEndpoint;
}

function getTradingAccountCacheKey(rawAddr: string): string {
  const clean = normalizeAddrStr(rawAddr);
  return clean ? `clob_trading_info_${getActiveNetworkId()}_${clean}` : '';
}

function readCachedTradingAccountInfo(rawAddr: string): any | null {
  try {
    const key = getTradingAccountCacheKey(rawAddr);
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.hasTradingAccount === 'boolean') {
      return parsed;
    }
  } catch (_) {}
  return null;
}

function writeCachedTradingAccountInfo(rawAddr: string, data: any) {
  try {
    const key = getTradingAccountCacheKey(rawAddr);
    if (!key || !data) return;
    const minimal = {
      ok: true,
      hasTradingAccount: Boolean(data.hasTradingAccount),
      status: data.status || 'none',
      tradingAccount: data.tradingAccount
        ? {
            ownerAddress: data.tradingAccount.ownerAddress || '',
            ownerPublicKey: data.tradingAccount.ownerPublicKey || '',
            tradingAddress: data.tradingAccount.tradingAddress || '',
            tradingPublicKey: data.tradingAccount.tradingPublicKey || '',
          }
        : null,
      pendingSettlementsCount: Number(data.pendingSettlementsCount || 0),
    };
    localStorage.setItem(key, JSON.stringify(minimal));
  } catch (_) {}
}

async function fetchTradingAccountStatus() {
  const queryAcc = activeAccount.value || selectedWalletAccount.value;
  if (!queryAcc?.publicKey && !queryAcc?.address) return;
  try {
    const qParam = queryAcc.publicKey
      ? `ownerPublicKey=${queryAcc.publicKey}`
      : `ownerAddress=${queryAcc.address}`;
    const res = await fetch(`${CLOB_API_BASE}/api/clob/trading-account/status?${qParam}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        tradingAccountInfo.value = data;
        if (queryAcc.address) {
          writeCachedTradingAccountInfo(queryAcc.address, data);
        }
        if (data.validatorCluster) {
          validatorClusterInfo.value = data.validatorCluster;
        }
        const tAcc = data.tradingAccount;
        if (tAcc?.ownerAddress) {
          writeCachedTradingAccountInfo(tAcc.ownerAddress, data);
        }
        if (tAcc?.tradingAddress) {
          writeCachedTradingAccountInfo(tAcc.tradingAddress, data);
        }
        if (tAcc?.ownerAddress || tAcc?.ownerPublicKey) {
          const sel: any = selectedWalletAccount.value;
          if (sel && normalizeAddrStr(sel.address) === normalizeAddrStr(tAcc.tradingAddress)) {
            discoveredOwnerAddress.value = tAcc.ownerAddress || '';
            discoveredOwnerPublicKey.value = tAcc.ownerPublicKey || '';
            if (!sel.linkedMainAddress && tAcc.ownerAddress) {
              sel.linkedMainAddress = tAcc.ownerAddress;
              sel.isTradingAccount = true;
            }
          }
        }
      }
    }
  } catch (_) {
  } finally {
    isTradingAccountStatusLoaded.value = true;
  }
}

function openTradingSetupModal() {
  fetchTradingAccountStatus().catch(() => {});
  showTradingSetupModal.value = true;
}

function onTradingAccountActivated(res: any) {
  if (res?.ownerPrivateKey && !sessionTradingPrivateKey.value) {
    setTradingSessionKey(res.ownerPrivateKey);
  }
  showTradingSetupModal.value = false;
  if (res?.confirmed) {
    fetchTradingAccountStatus().then(() => syncFromNode());
    showToast(
      'Smart Trading Account Active!',
      'Your 2-of-2 Smart Trading Account is confirmed on Sirius L1.',
      'success',
      5000,
      res.txHash
    );
    return;
  }
  showToast(
    'Confirming on Sirius L1 (~15–30s)...',
    `Activation broadcast (${String(res.txHash || '').slice(0, 12)}...). Waiting for Sirius L1 block confirmation (~15–30s).`,
    'info',
    7000,
    res.txHash
  );
  fetchTradingAccountStatus();
  if (activationPollTimer) clearInterval(activationPollTimer);
  let polls = 0;
  activationPollTimer = setInterval(async () => {
    polls++;
    try {
      await fetchTradingAccountStatus();
    } catch (_) {}
    if (hasSmartTradingAccount.value || polls >= 16) {
      if (activationPollTimer) {
        clearInterval(activationPollTimer);
        activationPollTimer = null;
      }
      if (hasSmartTradingAccount.value) {
        showToast('Smart Trading Account Active!', 'Your 2-of-2 Smart Trading Account is confirmed on Sirius L1!', 'success', 5000);
        syncFromNode();
      }
    }
  }, 2500);
}

function formatClobAsset(asset: ClobAsset, val: number): string {
  return (Number(val) || 0).toFixed(asset === 'BNB' ? 4 : 2);
}

function getPersonalWalletBalance(asset: ClobAsset): number {
  if (asset === 'XPX') return personalWalletXpx.value;
  if (asset === 'USDT') return personalWalletUsdt.value;
  return personalWalletBnb.value;
}

const isSettlingPending = ref<boolean>(false);

function getTradingAvailableBalance(asset: ClobAsset): number {
  const w = tradingAccountInfo.value?.balances?.withdrawable;
  if (hasSmartTradingAccount.value && w) {
    const key = asset.toLowerCase();
    if (w[key] !== undefined && w[key] !== null) {
      const atomic = Number(w[key]);
      if (Number.isFinite(atomic)) return atomic / 1_000_000;
    }
  }
  if (asset === 'XPX') return userXpxBalance.value;
  if (asset === 'USDT') return userUsdtBalance.value;
  return userBnbBalance.value;
}

const pendingSettlementNotice = computed(() => {
  const b = tradingAccountInfo.value?.balances;
  if (!hasSmartTradingAccount.value || !b) return '';
  const parts: string[] = [];
  for (const asset of CLOB_ASSETS) {
    const k = asset.toLowerCase();
    const tradeable = Number(b.tradeable?.[k] || 0) / 1_000_000;
    const withdrawable = Number(b.withdrawable?.[k] || 0) / 1_000_000;
    const diff = tradeable - withdrawable;
    if (diff > 0.000001) {
      parts.push(`+${formatClobAsset(asset, diff)} ${asset}`);
    }
  }
  const cnt = Number(tradingAccountInfo.value?.pendingSettlementsCount || 0);
  if (parts.length > 0) {
    return `${parts.join(', ')} awaiting L1 trade settlement (${formatClobAsset('XPX', getTradingAvailableBalance('XPX'))} XPX withdrawable now).`;
  }
  if (cnt > 0) {
    return `${cnt} trade settlement(s) awaiting L1 co-signature / block confirmation.`;
  }
  return '';
});

async function cosignAllPendingSettlements(): Promise<{ signedCount: number; errors: string[] }> {
  if (!hasSmartTradingAccount.value || !activeAccount.value?.publicKey) {
    return { signedCount: 0, errors: [] };
  }
  const signer = getSignerAccount();
  if (!signer) return { signedCount: 0, errors: ['Wallet unlock required to cosign settlement.'] };
  let signedCount = 0;
  const errors: string[] = [];
  const resSettle = await fetch(
    `${CLOB_API_BASE}/api/clob/trading-account/pending-settlements?ownerPublicKey=${activeAccount.value.publicKey}`
  );
  if (resSettle.ok) {
    const sData = await resSettle.json();
    if (sData.ok && Array.isArray(sData.settlements)) {
      for (const s of sData.settlements) {
        if (s.status === 'pending_cosign') {
          const result = await cosignVerifiedSettlement(s);
          if (result.ok) signedCount++;
          else if (result.error) errors.push(result.error);
        }
      }
    }
  }
  return { signedCount, errors };
}

async function settlePendingTradesNow() {
  if (isSettlingPending.value) return;
  const signer = getSignerAccount();
  if (!signer) {
    pendingAction.value = 'settlePending';
    showPasswordModal.value = true;
    passwordError.value = '';
    return;
  }
  isSettlingPending.value = true;
  withdrawError.value = '';
  try {
    const { signedCount, errors } = await cosignAllPendingSettlements();
    await fetchTradingAccountStatus();
    await syncFromNode();
    if (errors.length > 0 && signedCount === 0) {
      withdrawError.value = errors[0];
      showToast('Settlement Failed', errors[0], 'error', 7000);
    } else if (signedCount > 0) {
      showToast('Settlement Co-Signed!', 'Broadcast to Sirius L1. Withdrawable balance updates once confirmed (~15s).', 'success', 6000);
    } else {
      showToast('Settlement Status Refreshed', 'Waiting for Sirius L1 block confirmation (~15s).', 'info', 4500);
    }
  } catch (err: any) {
    withdrawError.value = err?.message || 'Failed to settle pending trades';
    showToast('Settlement Error', withdrawError.value, 'error', 6000);
  } finally {
    isSettlingPending.value = false;
  }
}

function parseAssetAmounts(amountsMap: Record<ClobAsset, string>): Array<{ asset: ClobAsset; amount: number }> {
  const entries: Array<{ asset: ClobAsset; amount: number }> = [];
  for (const asset of CLOB_ASSETS) {
    const val = parseFloat(amountsMap[asset]);
    if (Number.isFinite(val) && val > 0) {
      entries.push({ asset, amount: val });
    }
  }
  return entries;
}

function buildSortedMosaics(entries: Array<{ asset: ClobAsset; amount: number }>): Mosaic[] {
  return entries
    .map((e) => {
      const hex = getMosaicHexForAsset(e.asset);
      const atomicAmt = BigInt(Math.round(e.amount * 1_000_000));
      return {
        idBigInt: BigInt('0x' + hex),
        mosaic: new Mosaic(new MosaicId(hex), UInt64.fromHex(atomicAmt.toString(16).padStart(16, '0'))),
      };
    })
    .sort((a, b) => (a.idBigInt < b.idBigInt ? -1 : a.idBigInt > b.idBigInt ? 1 : 0))
    .map((item) => item.mosaic);
}

const topUpSelectedEntries = computed(() => parseAssetAmounts(topUpAmounts.value));

const topUpSummaryText = computed(() =>
  topUpSelectedEntries.value.map((e) => `${formatClobAsset(e.asset, e.amount)} ${e.asset}`).join(' + ')
);

const isTopUpValid = computed(() => {
  if (topUpSelectedEntries.value.length === 0) return false;
  return topUpSelectedEntries.value.every((e) => e.amount <= getPersonalWalletBalance(e.asset));
});

function setTopUpPct(asset: ClobAsset, pct: number) {
  let avail = getPersonalWalletBalance(asset);
  if (asset === 'XPX' && pct === 100 && avail > 0.2) {
    avail = Math.max(0, avail - 0.2); // Reserve XPX for L1 network fee
  }
  const val = (avail * pct) / 100;
  topUpAmounts.value[asset] = val > 0 ? formatClobAsset(asset, val) : '';
}

function openTopUpModal() {
  topUpError.value = '';
  topUpAmounts.value = { XPX: '', USDT: '', BNB: '' };
  showTopUpModal.value = true;
}

async function executeTopUp() {
  if (isToppingUp.value) return;
  if (!hasSmartTradingAccount.value || !tradingAccountAddress.value) {
    topUpError.value = 'Smart Trading Account is not active yet.';
    return;
  }
  if (normalizeAddrStr(activeAccount.value?.address) === normalizeAddrStr(tradingAccountAddress.value)) {
    const ownerAddr = tradingAccountInfo.value?.tradingAccount?.ownerAddress || 'your main account';
    topUpError.value = `To top up this 2-of-2 Trading Account, make sure linked main account (${ownerAddr}) is in your wallet.`;
    return;
  }
  const entries = parseAssetAmounts(topUpAmounts.value);
  if (entries.length === 0) {
    topUpError.value = 'Enter an amount for at least one coin.';
    return;
  }
  for (const e of entries) {
    const avail = getPersonalWalletBalance(e.asset);
    if (e.amount > avail) {
      topUpError.value = `Requested ${e.amount} ${e.asset} exceeds wallet balance (${formatClobAsset(e.asset, avail)} ${e.asset}).`;
      return;
    }
  }
  const signer = getSignerAccount();
  if (!signer) {
    pendingAction.value = 'topup';
    showPasswordModal.value = true;
    passwordError.value = '';
    return;
  }

  isToppingUp.value = true;
  topUpError.value = '';
  try {
    const netId = getActiveNetworkId();
    const genHash = getActiveGenerationHash();
    const mosaics = buildSortedMosaics(entries);
    const summaryLabel = entries.map((e) => `${e.amount} ${e.asset}`).join(' + ');

    const tx = TransferTransaction.create(
      Deadline.create(),
      Address.createFromRawAddress(tradingAccountAddress.value),
      mosaics,
      PlainMessage.create('SiriusCLOB: Trading Account Top-Up'),
      netId,
      UInt64.fromUint(200000)
    );
    const signedTx = signer.preV2Sign(tx, genHash);
    const endpoint = getActiveSiriusNodeEndpoint();
    const res = await fetch(`${endpoint}/transactions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: signedTx.payload }),
    });
    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Sirius node rejected transfer: ${errTxt}`);
    }
    showToast(
      'Top-Up Broadcast!',
      `Sent ${summaryLabel} in one L1 transaction to your Trading Account. Confirming in ~15–30s.`,
      'success',
      6000,
      signedTx.hash
    );
    showTopUpModal.value = false;
    topUpAmounts.value = { XPX: '', USDT: '', BNB: '' };
    if (topUpPollTimer) clearInterval(topUpPollTimer);
    let polls = 0;
    topUpPollTimer = setInterval(async () => {
      polls++;
      try {
        await fetchTradingAccountStatus();
        await syncFromNode();
      } catch (_) {}
      if (polls >= 12 && topUpPollTimer) {
        clearInterval(topUpPollTimer);
        topUpPollTimer = null;
      }
    }, 2500);
  } catch (err: any) {
    topUpError.value = err?.message || 'Top-up transfer failed';
    showToast('Top-Up Failed', topUpError.value, 'error');
  } finally {
    isToppingUp.value = false;
  }
}

function getSettlementSignKey(settlement: any): string {
  return `${settlement?.settlementId || ''}:${settlement?.txHash || ''}`;
}

async function cosignVerifiedSettlement(
  settlement: any,
  options: { silentToast?: boolean; _retriedRebuild?: boolean } = {}
): Promise<{ ok: boolean; txHash?: string; status?: string; approvedCount?: number; error?: string }> {
  if (!settlement || !settlement.settlementId || !settlement.aggregatePayload) return { ok: false };
  const signKey = getSettlementSignKey(settlement);
  if (cosigningSettlementIds.has(signKey) || cosignedSettlementIds.has(signKey)) {
    return { ok: false };
  }
  const signer = getSignerAccount();
  if (!signer) return { ok: false };
  const signerPubUpper = String(signer.publicKey || '').toUpperCase();
  if (
    Array.isArray(settlement.collectedCosigs) &&
    settlement.collectedCosigs.some((c: any) => String(c?.signer || '').toUpperCase() === signerPubUpper)
  ) {
    cosignedSettlementIds.add(signKey);
    return { ok: false };
  }

  cosigningSettlementIds.add(signKey);
  try {
    // Independently inspect aggregate payload locally before cosigning:
    // Ensure ONLY TransferTransactions exist, and outflows strictly match signed order fills
    const decoded: any = TransactionMapping.createFromPayload(settlement.aggregatePayload);
    if (decoded.type !== TransactionType.AGGREGATE_COMPLETE_V1 && decoded.type !== 16705) {
      return { ok: false, error: 'Invalid settlement transaction type' };
    }
    const innerTxns = decoded.innerTransactions || [];
    const ownerPubUpper = String(signer.publicKey || '').toUpperCase();
    const tradingPubUpper = String(tradingAccountPublicKey.value || settlement.tradingPublicKey || '').toUpperCase();
    const tradingAddrUpper = normalizeAddrStr(tradingAccountAddress.value);
    if (!tradingPubUpper) {
      return { ok: false, error: 'Trading Account metadata not loaded yet; refusing blind cosignature' };
    }
    const outByHex = new Map<string, bigint>();
    const inByHex = new Map<string, bigint>();

    for (const inner of innerTxns) {
      if (inner.type !== TransactionType.TRANSFER && inner.type !== 16724) {
        console.warn('[Settlement Safety] Refused non-transfer inner tx in settlement aggregate');
        return { ok: false, error: 'Refused non-transfer inner transaction in settlement' };
      }
      const sPub = String(inner.signer?.publicKey || '').toUpperCase();
      if (ownerPubUpper && sPub === ownerPubUpper && tradingPubUpper !== ownerPubUpper) {
        return { ok: false, error: 'Security block: Settlement attempted to spend directly from personal Main Wallet' };
      }
      const recipObj = inner.recipient || inner.recipientAddress;
      const rAddr = recipObj && typeof recipObj.plain === 'function' ? normalizeAddrStr(recipObj.plain()) : '';
      for (const m of (inner.mosaics || [])) {
        const mHex = m.id.toHex().toUpperCase();
        const amt = BigInt(m.amount.compact ? m.amount.compact() : m.amount);
        if (tradingPubUpper && sPub === tradingPubUpper) {
          outByHex.set(mHex, (outByHex.get(mHex) || 0n) + amt);
        }
        if (tradingAddrUpper && rAddr === tradingAddrUpper) {
          inByHex.set(mHex, (inByHex.get(mHex) || 0n) + amt);
        }
      }
    }

    // Gap B verification: never blind-sign outflows from Trading Account without verifying against own signed order
    if (outByHex.size > 0) {
      let verifiedOrd: { pair: string; side: 'buy' | 'sell'; price: string; amount: string } | null = null;
      const ctx = settlement.orderContext;
      const ctxIsMine = Boolean(ctx && (!ctx.publicKey || String(ctx.publicKey).toUpperCase() === ownerPubUpper));
      if (ctxIsMine && ctx && ctx.signature && ctx.nonce && ctx.expiry) {
        const domainSep = String(ctx.domainSeparator || `${getActiveNetworkId()}:SiriusCLOB-v1`);
        const normPair = String(ctx.pair || 'XPX/USDT').toUpperCase().replace('_', '/');
        const normSide = String(ctx.side || '').toLowerCase() === 'sell' ? 'sell' : 'buy';
        const normType = String(ctx.type || '') === 'Market' ? 'Market' : 'Limit';
        const msg = `${domainSep}:ORDER:${normPair}:${normSide}:${normType}:${String(ctx.price)}:${String(ctx.amount)}:${ctx.nonce}:${ctx.expiry}`;
        const sigOk = KeyPair.verify(
          hexToUint8(ownerPubUpper),
          new TextEncoder().encode(msg),
          hexToUint8(String(ctx.signature)),
          DerivationScheme.Ed25519Sha3
        );
        if (!sigOk) {
          return { ok: false, error: 'Security block: Invalid order signature inside settlement context' };
        }
        verifiedOrd = { pair: normPair, side: normSide, price: String(ctx.price), amount: String(ctx.amount) };
      } else if (settlement.orderId && recentSignedOrders.has(String(settlement.orderId))) {
        verifiedOrd = recentSignedOrders.get(String(settlement.orderId)) || null;
      } else if (settlement.orderId) {
        const openMatch: any = myOpenOrders.value.find((o: any) => String(o.id) === String(settlement.orderId));
        if (openMatch) {
          verifiedOrd = {
            pair: String(openMatch.pair || selectedPair.value).toUpperCase().replace('_', '/'),
            side: String(openMatch.side || '').toLowerCase() === 'sell' ? 'sell' : 'buy',
            price: String(openMatch.price || '0'),
            amount: String(openMatch.amount || '0'),
          };
        }
      }

      if (!verifiedOrd) {
        return { ok: false, error: 'Security block: Could not verify settlement against a locally signed order' };
      }

      const xpxHex = getMosaicHexForAsset('XPX').toUpperCase();
      const quoteSym: ClobAsset = verifiedOrd.pair.endsWith('/BNB') ? 'BNB' : 'USDT';
      const quoteHex = getMosaicHexForAsset(quoteSym).toUpperCase();
      const outXpx = outByHex.get(xpxHex) || 0n;
      const outQuote = outByHex.get(quoteHex) || 0n;
      const inXpx = inByHex.get(xpxHex) || 0n;
      const inQuote = inByHex.get(quoteHex) || 0n;

      for (const [hex] of outByHex.entries()) {
        if (hex !== xpxHex && hex !== quoteHex) {
          return { ok: false, error: `Security block: Unexpected mosaic ${hex} leaving Trading Account` };
        }
      }

      const ordAmt = parseDecBigInt(verifiedOrd.amount, 6);
      const ordPriceTicks = parseDecBigInt(verifiedOrd.price, 8);
      const PRICE_SCALE = 100_000_000n;

      if (verifiedOrd.side === 'buy') {
        if (outXpx > 0n) {
          return { ok: false, error: 'Security block: BUY settlement tried to send XPX out of Trading Account' };
        }
        const maxQuote = ((ordAmt * ordPriceTicks + PRICE_SCALE - 1n) / PRICE_SCALE) * 102n / 100n + 1000n;
        if (outQuote > maxQuote) {
          return { ok: false, error: 'Security block: BUY settlement quote outflow exceeds your signed order limit' };
        }
        if (outQuote > 0n && inXpx === 0n) {
          return { ok: false, error: 'Security block: BUY settlement sends quote without delivering XPX' };
        }
      } else {
        if (outQuote > 0n) {
          return { ok: false, error: 'Security block: SELL settlement tried to send quote out of Trading Account' };
        }
        const maxXpx = (ordAmt * 102n) / 100n + 1000n;
        if (outXpx > maxXpx) {
          return { ok: false, error: 'Security block: SELL settlement XPX outflow exceeds your signed order amount' };
        }
        if (outXpx > 0n && inQuote === 0n) {
          return { ok: false, error: `Security block: SELL settlement sends XPX without delivering ${quoteSym}` };
        }
        if (outXpx > 0n && ordPriceTicks > 0n) {
          const minQuote = ((outXpx * ordPriceTicks) / PRICE_SCALE) * 97n / 100n;
          if (minQuote >= 100n && inQuote < minQuote) {
            return { ok: false, error: 'Security block: SELL settlement payout below signed limit price' };
          }
        }
      }
    }

    const genHash = getActiveGenerationHash();
    const cosig = CosignatureTransaction.signTransactionPayload(
      signer,
      settlement.aggregatePayload,
      genHash
    );
    const res = await fetch(`${CLOB_API_BASE}/api/clob/trading-account/cosign-settlement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settlementId: settlement.settlementId,
        cosignature: {
          parentHash: cosig.parentHash,
          signer: cosig.signer,
          signature: cosig.signature,
        },
      }),
    });
    const data = await res.json();
    if (data.ok && data.rebuilt && data.settlement && !options._retriedRebuild) {
      cosigningSettlementIds.delete(signKey);
      return await cosignVerifiedSettlement(data.settlement, { ...options, _retriedRebuild: true });
    }
    if (data.ok) {
      cosignedSettlementIds.add(signKey);
      const approvedCount = Array.isArray(data.approvedByNodes) ? data.approvedByNodes.length : 0;
      if (options.silentToast) {
        shownSettlementToastIds.add(signKey);
      } else if (!shownSettlementToastIds.has(signKey) && !data.alreadySubmitted) {
        shownSettlementToastIds.add(signKey);
        if (data.status === 'pending_cosign') {
          showToast(
            'Cosignature Recorded',
            'Your settlement signature is saved. Waiting for counterparty co-signature before L1 broadcast.',
            'info',
            5000
          );
        } else if (data.txHash) {
          showToast(
            'Atomic L1 Settlement Broadcast!',
            `2-of-2 Peer-to-Peer swap signed by you & ${approvedCount} validator nodes.`,
            'trade',
            5000,
            data.txHash
          );
        }
      }
      return { ok: true, txHash: data.txHash, status: data.status, approvedCount };
    }
    if (!data.ok) {
      console.warn('[Settlement Cosign] Rejected:', data.error);
      return { ok: false, error: data.error || 'Settlement cosign rejected by backend' };
    }
    return { ok: false };
  } catch (err: any) {
    console.warn('[Settlement Cosign] Notice:', err);
    return { ok: false, error: err?.message || 'Failed to cosign settlement' };
  } finally {
    cosigningSettlementIds.delete(signKey);
  }
}

const isSubmitting = ref(false);

// Withdrawal State & Operations (Unified Multi-Mosaic)
const showWithdrawModal = ref<boolean>(false);
const withdrawAmounts = ref<Record<ClobAsset, string>>({ XPX: '', USDT: '', BNB: '' });
const isWithdrawing = ref<boolean>(false);
const withdrawError = ref<string>('');

function getAssetWithdrawFee(asset: ClobAsset): number {
  if (hasSmartTradingAccount.value) return 0; // Native L1 gas only, 0 exchange fee!
  return asset === 'BNB' ? 0.001 : 1.0;
}

const withdrawSelectedEntries = computed(() => parseAssetAmounts(withdrawAmounts.value));

const withdrawSummaryText = computed(() => {
  if (withdrawSelectedEntries.value.length === 0) return '';
  return withdrawSelectedEntries.value
    .map((e) => {
      const net = Math.max(0, e.amount - getAssetWithdrawFee(e.asset));
      return `${formatClobAsset(e.asset, net)} ${e.asset}`;
    })
    .join(' + ');
});

const isWithdrawValid = computed(() => {
  if (withdrawSelectedEntries.value.length === 0) return false;
  return withdrawSelectedEntries.value.every((e) => {
    const fee = getAssetWithdrawFee(e.asset);
    const maxAvail = getTradingAvailableBalance(e.asset);
    return e.amount > fee && e.amount <= maxAvail;
  });
});

function openWithdrawModal() {
  withdrawError.value = '';
  withdrawAmounts.value = { XPX: '', USDT: '', BNB: '' };
  fetchTradingAccountStatus().catch(() => {});
  showWithdrawModal.value = true;
}

function setWithdrawAssetPct(asset: ClobAsset, pct: number) {
  const maxAvail = getTradingAvailableBalance(asset);
  const val = (maxAvail * pct) / 100;
  withdrawAmounts.value[asset] = val > 0 ? formatClobAsset(asset, val) : '';
}

async function executeWithdraw() {
  if (isWithdrawing.value) return;
  if (hasSmartTradingAccount.value && normalizeAddrStr(activeAccount.value?.address) === normalizeAddrStr(tradingAccountAddress.value)) {
    const ownerAddr = tradingAccountInfo.value?.tradingAccount?.ownerAddress || 'your main account';
    withdrawError.value = `To co-sign withdrawals for this 2-of-2 Trading Account, import/select linked main account (${ownerAddr}) in your wallet.`;
    return;
  }
  const entries = parseAssetAmounts(withdrawAmounts.value);
  if (entries.length === 0) {
    withdrawError.value = 'Enter a withdrawal amount for at least one coin.';
    return;
  }
  for (const e of entries) {
    const fee = getAssetWithdrawFee(e.asset);
    if (e.amount <= fee) {
      withdrawError.value = `${e.asset} amount must be strictly greater than fee (${fee} ${e.asset}).`;
      return;
    }
    const maxAvail = getTradingAvailableBalance(e.asset);
    if (e.amount > maxAvail) {
      withdrawError.value = `Requested ${e.amount} ${e.asset} exceeds available balance (${formatClobAsset(e.asset, maxAvail)} ${e.asset}).`;
      return;
    }
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
  const netId = getActiveNetworkId();
  const cleanAddr = (activeAccount.value?.address || '').replace(/[- ]/g, '').toUpperCase();
  const summaryLabel = entries.map((e) => `${e.amount} ${e.asset}`).join(' + ');

  try {
    // Ensure Smart Trading Account status is loaded before routing between 2-of-2 co-signed vs legacy vault
    if (!tradingAccountInfo.value) {
      await fetchTradingAccountStatus().catch(() => {});
    }
    // Solution 2 (Model A): Single Atomic Multi-Mosaic Co-Signed Withdrawal from 2-of-2 Trading Account
    if (hasSmartTradingAccount.value && tradingAccountPublicKey.value) {
      const genHash = getActiveGenerationHash();
      const mosaics = buildSortedMosaics(entries);
      const tradingPubAcc = PublicAccount.createFromPublicKey(tradingAccountPublicKey.value, netId);
      const innerTx = TransferTransaction.create(
        Deadline.create(),
        Address.createFromRawAddress(cleanAddr),
        mosaics,
        PlainMessage.create('SiriusCLOB: Co-Signed Withdrawal'),
        netId
      ).toAggregateV1(tradingPubAcc);

      const aggTx = AggregateTransaction.createCompleteV1(
        Deadline.create(),
        [innerTx],
        netId,
        [],
        UInt64.fromUint(250000)
      );

      // User signs as outer initiator (satisfies Cosigner 1 of the 2-of-2 Trading Account)
      const signedByInitiator = signer.preV2Sign(aggTx, genHash);

      const res = await fetch(`${CLOB_API_BASE}/api/clob/trading-account/cosign-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedByInitiatorPayload: signedByInitiator.payload,
          callerPublicKey: signer.publicKey,
          tradingAccountPublicKey: tradingAccountPublicKey.value,
          recipientAddress: cleanAddr,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const nodesLabel = Array.isArray(data.approvedByNodes) ? data.approvedByNodes.join(', ') : '2-of-3 Validators';
        showToast(
          'Co-Signed Withdrawal Broadcast!',
          `Withdrew ${summaryLabel} in one L1 transaction to Personal Wallet.\nCo-signed by: ${nodesLabel}`,
          'success',
          6500,
          data.txHash
        );
        showWithdrawModal.value = false;
        withdrawAmounts.value = { XPX: '', USDT: '', BNB: '' };
        fetchTradingAccountStatus().catch(() => {});
        syncFromNode().catch(() => {});
      } else {
        withdrawError.value = data.error || 'Co-signed withdrawal rejected';
        showToast('Withdrawal Rejected', withdrawError.value, 'error');
      }
      return;
    }

    // Legacy Vault Withdrawal Path (iterates selected assets)
    const completedAssets: string[] = [];
    for (const e of entries) {
      const now = Date.now();
      const nonce = generateSecureNonce(now);
      const expiry = now + PASSWORD_EXPIRY_MS;
      const formattedAmt = e.amount.toFixed(6);
      const withdrawMsg = `${netId}:SiriusCLOB-v1:WITHDRAW:${e.asset}:${formattedAmt}:${cleanAddr}:${nonce}:${expiry}`;
      const signature = signer.signData(withdrawMsg);

      const res = await fetch(`${CLOB_API_BASE}/api/clob/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: e.asset,
          mosaic: e.asset,
          amount: formattedAmt,
          recipient: cleanAddr,
          publicKey: signer.publicKey,
          nonce,
          expiry,
          signature,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || `${e.asset} withdrawal failed`);
      }
      if (data.balances) applyBalances(data.balances);
      completedAssets.push(`${e.amount} ${e.asset}`);
    }

    showToast(
      'Withdrawal Broadcast',
      `Withdrew ${completedAssets.join(' + ')} to your Sirius account.`,
      'success',
      6000
    );
    showWithdrawModal.value = false;
    withdrawAmounts.value = { XPX: '', USDT: '', BNB: '' };
    syncFromNode().catch(() => {});
  } catch (err: any) {
    withdrawError.value = err.message || 'Withdrawal failed';
    showToast('Withdrawal Error', withdrawError.value, 'error');
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
  const fallbackMid = currentPrice.value || (isBnbPair.value ? (pancakeOracle.value?.priceBnb || 0.00000014) : (pancakeOracle.value?.priceUsdt || 0.000076));
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
      if (data.orderId) {
        recentSignedOrders.set(String(data.orderId), {
          pair: normPair,
          side: normSide,
          price: priceStr,
          amount: amountStr,
        });
      }
      applyBalances(data.balances);

      // Immediately co-sign atomic L1 trade settlement if user's Smart Trading Account filled
      let settleRes: { ok: boolean; txHash?: string; status?: string; approvedCount?: number; error?: string } | null = null;
      if (data.pendingSettlement) {
        settleRes = await cosignVerifiedSettlement(data.pendingSettlement, { silentToast: true }).catch((e: any) => ({
          ok: false,
          error: e?.message || 'Settlement co-signing failed',
        }));
      }

      const orderId = data.orderId || ++nextOrderId;
      if (settleRes && !settleRes.ok && settleRes.error) {
        showToast(
          'Trade Matched — L1 Settlement Failed',
          `Order #${orderId} matched, but Sirius L1 rejected settlement:\n${settleRes.error}`,
          'error',
          7500
        );
      } else if (data.fillsCount > 0) {
        const actionVerb = String(data.side || '').toLowerCase() === 'sell' ? 'Sold' : 'Bought';
        const filledQty = Number(data.filledAmount || data.amount || 0).toLocaleString();
        if (settleRes?.ok && settleRes.status === 'pending_cosign') {
          showToast(
            'Trade Matched — Waiting for Counterparty',
            `${actionVerb} ${filledQty} XPX on ${selectedPair.value}. Your co-signature is recorded; L1 settlement will broadcast once the counterparty co-signs.`,
            'info',
            6000
          );
        } else {
          const txHashToShow = settleRes?.txHash || data.settlementTxHash;
          const summaryMsg = settleRes?.ok && txHashToShow
            ? `${actionVerb} ${filledQty} XPX on ${selectedPair.value}. Co-signed by your wallet & ${settleRes.approvedCount || 2} validator nodes and sent to Sirius L1 (confirms in ~15s).`
            : `${actionVerb} ${filledQty} XPX on ${selectedPair.value}. Your trading balance has been updated.`;
          showToast(
            'Trade Executed & Settled!',
            summaryMsg,
            'trade',
            6000,
            txHashToShow
          );
        }
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
          `Resting Order #${orderId} on book: ${data.side} ${Number(data.amount || 0).toLocaleString()} XPX @ ${formatPrice(data.price)} on ${selectedPair.value}.`,
          'success',
          4500
        );
      }

      isSubmitting.value = false;
      syncFromNode().catch(() => {});
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

function createSeedCandles(count: number, intervalMinutes: number, targetEndPrice: number): Candle[] {
  const nowSec = Math.floor(Date.now() / 1000);
  const intervalSec = intervalMinutes * 60;
  const baseSec = Math.floor(nowSec / intervalSec) * intervalSec;
  const decimals = priceDecimals.value;
  const price = parseFloat(targetEndPrice.toFixed(decimals));
  const temp: Candle[] = [];

  for (let i = 0; i < count; i++) {
    const candleSec = (baseSec - (i * intervalSec)) as UTCTimestamp;
    const d = new Date(candleSec * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    temp.push({ time: candleSec, timeStr, o: price, h: price, l: price, c: price, v: 0 });
  }

  temp.reverse();
  return temp;
}

const candleData = reactive<Record<ChartInterval, Candle[]>>({
  '1m': createSeedCandles(120, 1, 0.000076),
  '5m': createSeedCandles(100, 5, 0.000076),
  '15m': createSeedCandles(96, 15, 0.000076),
  '1h': createSeedCandles(72, 60, 0.000076),
});

const latestCandle = computed(() => {
  const arr = candleData[activeInterval.value];
  return arr && arr.length > 0 ? arr[arr.length - 1] : null;
});

const hoverCandle = ref<Candle | null>(null);
const chartContainerRef = ref<HTMLDivElement | null>(null);
const chartContainerMobileRef = ref<HTMLDivElement | null>(null);

function getActiveChartContainer(): HTMLDivElement | null {
  return isMobile.value ? chartContainerMobileRef.value : chartContainerRef.value;
}

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

async function fetchRealCandles(tf?: ChartInterval) {
  const targetTf = tf || activeInterval.value;
  const pairParam = selectedPair.value.toLowerCase().replace('/', '_');
  try {
    const res = await fetch(`${CLOB_API_BASE}/api/clob/candles?pair=${pairParam}&interval=${targetTf}&limit=200`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.candles) && data.candles.length > 0) {
        candleData[targetTf] = data.candles.map((c: any) => ({
          time: c.time as UTCTimestamp,
          timeStr: new Date(c.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          o: c.open,
          h: c.high,
          l: c.low,
          c: c.close,
          v: c.volume || 0
        }));
        if (targetTf === activeInterval.value) {
          loadCandlesToChart();
        }
      }
    }
  } catch (_) {}
}

async function changeInterval(tf: ChartInterval) {
  activeInterval.value = tf;
  hoverCandle.value = null;
  loadCandlesToChart();
  await fetchRealCandles(tf);
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
  const container = getActiveChartContainer();
  if (!container) return;

  if (chart) {
    chart.remove();
    chart = null;
  }

  const rect = container.getBoundingClientRect();
  const width = rect.width > 0 ? rect.width : (typeof window !== 'undefined' ? Math.max(300, window.innerWidth - 24) : 360);
  const height = rect.height > 0 ? rect.height : (isMobile.value ? 230 : (typeof window !== 'undefined' ? Math.max(260, window.innerHeight - 260) : 360));

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

// Node Sync State
const tradeTimestampMap = new Map<string, string>();
let pollTimer: any = null;
let activationPollTimer: any = null;
let topUpPollTimer: any = null;
let syncInFlight = false;
let syncGeneration = 0;
let lastDepthSig = '';
let lastTradesSig = '';
let lastOpenOrdersSig = '';

async function syncFromNode() {
  if (syncInFlight) return;
  syncInFlight = true;
  const myGen = ++syncGeneration;
  const pairAtStart = selectedPair.value;
  const pairParam = pairAtStart.toLowerCase().replace('/', '_');
  const pubKey = activeAccount.value?.publicKey || '1111111111111111111111111111111111111111111111111111111111111111';

  const fetchJsonSafe = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  };

  try {
    // Run all independent market + account requests in parallel (cuts 10-call waterfall by ~5-8x!)
    const [
      ,
      depthRes,
      tradesRes,
      ,
      oracleRes,
      ordersRes,
      mmRes,
      balRes,
      ,
    ] = await Promise.allSettled([
      fetchOnChainBalances(),
      fetchJsonSafe(`${CLOB_API_BASE}/api/clob/depth?pair=${pairParam}`),
      fetchJsonSafe(`${CLOB_API_BASE}/api/clob/trades?pair=${pairParam}&limit=100`),
      fetchRealCandles(activeInterval.value),
      fetchJsonSafe(`${CLOB_API_BASE}/api/clob/oracle/pancakeswap`),
      fetchJsonSafe(`${CLOB_API_BASE}/api/clob/orders/open?publicKey=${pubKey}&pair=${pairParam}`),
      fetchJsonSafe(`${CLOB_API_BASE}/api/clob/mm/status`),
      fetchJsonSafe(`${CLOB_API_BASE}/api/clob/balance?publicKey=${pubKey}`),
      fetchTradingAccountStatus(),
    ]);

    // Drop stale response if user switched pairs mid-flight
    if (selectedPair.value !== pairAtStart || myGen !== syncGeneration) {
      return;
    }

    // 1. Apply Live Depth (only mutate reactive arrays when changed to prevent redundant re-renders)
    if (depthRes.status === 'fulfilled' && depthRes.value.ok) {
      const data = depthRes.value.data;
      isConnected.value = true;
      const parsedBids = (data?.bids || []).map((b: any, idx: number) => ({
        price: b.price / 100_000_000,
        amount: b.total_depth / 1_000_000,
        total: (b.price / 100_000_000) * (b.total_depth / 1_000_000),
        orderId: 100 + idx,
        owner: 'On-Chain'
      }));
      const parsedAsks = (data?.asks || []).map((a: any, idx: number) => ({
        price: a.price / 100_000_000,
        amount: a.total_depth / 1_000_000,
        total: (a.price / 100_000_000) * (a.total_depth / 1_000_000),
        orderId: 200 + idx,
        owner: 'On-Chain'
      }));
      const depthSig = `${pairParam}:${parsedBids.length}:${parsedAsks.length}:${parsedBids[0]?.price || 0}:${parsedBids[0]?.amount || 0}:${parsedAsks[0]?.price || 0}:${parsedAsks[0]?.amount || 0}`;
      if (depthSig !== lastDepthSig) {
        lastDepthSig = depthSig;
        bids.value = parsedBids;
        asks.value = parsedAsks;
      }
    } else if (depthRes.status === 'rejected' || (depthRes.status === 'fulfilled' && !depthRes.value.ok)) {
      isConnected.value = false;
    }

    // 2. Apply Real Trades (newest-first, 100-trade FIFO cap, bounded tradeTimestampMap)
    if (tradesRes.status === 'fulfilled' && tradesRes.value.ok && Array.isArray(tradesRes.value.data)) {
      const tradeData = tradesRes.value.data;
      if (tradeData.length > 0 || trades.value.length === 0) {
        const orderedNewestFirst = tradeData
          .map((t: any, idx: number) => ({ t, idx, ts: Number(t.timestamp) || 0 }))
          .sort((a, b) => (b.ts !== a.ts ? b.ts - a.ts : a.idx - b.idx))
          .slice(0, 100);

        const top = orderedNewestFirst[0]?.t;
        const tradesSig = `${pairParam}:${orderedNewestFirst.length}:${top?.maker_order_id || ''}:${top?.price || ''}:${top?.base_amount || ''}:${top?.timestamp || ''}`;
        if (tradesSig !== lastTradesSig) {
          lastTradesSig = tradesSig;
          const activeKeys = new Set<string>();
          trades.value = orderedNewestFirst.map(({ t, idx }) => {
            const price = t.price / 100_000_000;
            const amount = t.base_amount / 1_000_000;
            const side = (t.taker_side === 'Buy' || t.taker_side === 0) ? 'buy' : 'sell';
            const tradeKey = `${t.maker_order_id}_${t.price}_${t.base_amount}_${t.quote_amount}_${idx}`;
            activeKeys.add(tradeKey);
            const rawTs = Number(t.timestamp);
            const hasValidTs = Number.isFinite(rawTs) && rawTs > 0;
            const localTimeFromTs = hasValidTs
              ? new Date(rawTs < 1e12 ? rawTs * 1000 : rawTs).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })
              : '';
            if (!tradeTimestampMap.has(tradeKey)) {
              tradeTimestampMap.set(
                tradeKey,
                localTimeFromTs || new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })
              );
            }
            const time = localTimeFromTs || tradeTimestampMap.get(tradeKey) || '';
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
          // Prune stale keys so tradeTimestampMap never grows unbounded
          if (tradeTimestampMap.size > 150) {
            for (const k of Array.from(tradeTimestampMap.keys())) {
              if (!activeKeys.has(k)) tradeTimestampMap.delete(k);
            }
          }
          const latest = trades.value[0];
          if (latest) {
            currentPrice.value = latest.price;
            lastTradeSide.value = latest.side;
            updateChartPrice(latest.price);
          }
        }
      }
    }

    // 3. Apply PancakeSwap Oracle
    if (oracleRes.status === 'fulfilled' && oracleRes.value.ok && oracleRes.value.data?.ok) {
      const pJson = oracleRes.value.data;
      pancakeOracle.value = pJson;
      if (!orderPrice.value || orderPrice.value === 0.005 || orderPrice.value === 0.00000834) {
        orderPrice.value = isBnbPair.value ? pJson.priceBnb : pJson.priceUsdt;
      }
    }

    // 4. Apply Open Resting Orders (diff-checked)
    if (ordersRes.status === 'fulfilled' && ordersRes.value.ok && Array.isArray(ordersRes.value.data?.orders)) {
      const rawOrders = ordersRes.value.data.orders;
      const openSig = `${pairParam}:${pubKey}:${rawOrders.length}:${rawOrders.map((o: any) => `${o.id || o.orderId}:${o.filled || ''}`).join(',')}`;
      if (openSig !== lastOpenOrdersSig) {
        lastOpenOrdersSig = openSig;
        myOpenOrders.value = rawOrders.map((o: any) => ({
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

    // 5. Apply 24h Market Maker Volume
    if (mmRes.status === 'fulfilled' && mmRes.value.ok && mmRes.value.data?.volumeXPX > 0) {
      volume24h.value = Math.round(mmRes.value.data.volumeXPX / 1_000_000);
    }

    // 6. Apply Sandbox Balance
    if (balRes.status === 'fulfilled' && balRes.value.ok && balRes.value.data?.ok && balRes.value.data?.balances) {
      applyBalances(balRes.value.data.balances);
    }

    // 7. Auto-cosign pending settlements once Smart Trading Account status is synced
    if (hasSmartTradingAccount.value && sessionTradingPrivateKey.value && activeAccount.value?.publicKey) {
      try {
        const resSettle = await fetch(`${CLOB_API_BASE}/api/clob/trading-account/pending-settlements?ownerPublicKey=${activeAccount.value.publicKey}`);
        if (resSettle.ok) {
          const sData = await resSettle.json();
          if (sData.ok && Array.isArray(sData.settlements)) {
            const myPubUpper = String(activeAccount.value?.publicKey || '').toUpperCase();
            for (const s of sData.settlements) {
              const sKey = getSettlementSignKey(s);
              const alreadySignedByMe =
                cosignedSettlementIds.has(sKey) ||
                (Array.isArray(s.collectedCosigs) &&
                  s.collectedCosigs.some((c: any) => String(c?.signer || '').toUpperCase() === myPubUpper));
              if (s.status === 'pending_cosign' && !alreadySignedByMe) {
                cosignVerifiedSettlement(s).catch(() => {});
              }
            }
          }
        }
      } catch (_) {}
    }
  } catch (_) {
    isConnected.value = false;
  } finally {
    syncInFlight = false;
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

watch(isChartExpanded, () => {
  nextTick(() => {
    const container = getActiveChartContainer();
    if (chart && container) {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        chart.applyOptions({ width: rect.width, height: rect.height });
        chart.timeScale().fitContent();
      }
    }
  });
});

onMounted(() => {
  WalletStateUtils.purgeStorageKeys();
  checkMobile();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', checkMobile);
  }
  nextTick(() => {
    initTradingViewChart();
  });
  fetchClobConfig();
  syncFromNode();
  pollTimer = setInterval(syncFromNode, 3000);
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkMobile);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (chart) {
    chart.remove();
    chart = null;
  }
  if (pollTimer) clearInterval(pollTimer);
  if (activationPollTimer) {
    clearInterval(activationPollTimer);
    activationPollTimer = null;
  }
  if (topUpPollTimer) {
    clearInterval(topUpPollTimer);
    topUpPollTimer = null;
  }
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
  position: relative;
  z-index: 1000;
  background: #0a110e;
  border: 1px solid #14221c;
  border-radius: 12px;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  gap: 12px;
  margin-bottom: 12px;
  overflow: visible;
}

.header-left {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 16px;
  flex-shrink: 0;
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
.wallet-balance-area .bal-val {
  color: #f8fafc;
  font-weight: 600;
}
.wallet-balance-area .bal-sep {
  color: #24352f;
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

/* Grid Layout - Fluid 3-Column Workstation */
.clob-grid {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(250px, 320px) minmax(270px, 340px);
  gap: 12px;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}


/* Mobile Faucet Button (Testnet Header) */
.mobile-faucet-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(14, 165, 233, 0.16);
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: #38bdf8;
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.mobile-faucet-btn:hover {
  background: rgba(14, 165, 233, 0.28);
  border-color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
}
.mobile-faucet-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Mobile Segmented Control Bar */
.mobile-segmented-bar {
  display: flex;
  background: #0d1512;
  border: 1px solid #16241f;
  border-radius: 10px;
  padding: 3px;
  gap: 4px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.mobile-segment-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: transparent;
  border: 1px solid transparent;
  color: #7b8e87;
  padding: 7px 6px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.mobile-segment-btn.active {
  background: #17382a;
  color: #2cd58a;
  border-color: rgba(44, 213, 138, 0.3);
  box-shadow: 0 2px 8px rgba(44, 213, 138, 0.15);
}

.mobile-order-badge {
  background: #2cd58a;
  color: #071a12;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 9999px;
  margin-left: 2px;
}

/* Mobile Main Container */
.clob-mobile-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}

/* 1. Mobile Live Candlestick Chart Section */
.mobile-chart-section {
  background: #0a110e;
  border: 1px solid #14221c;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.mobile-chart-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.mobile-tv-chart {
  width: 100%;
  height: 230px;
  min-height: 230px;
}

/* Expanded Full-Screen Chart */
.mobile-chart-section.chart-expanded {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
  margin: 0;
  height: 100vh;
  background: #080c14;
}

.mobile-chart-section.chart-expanded .mobile-tv-chart {
  height: calc(100vh - 60px);
  min-height: calc(100vh - 60px);
}

/* 2. Mobile Trade View (Full Width Ticket + Live Mini Book) */
.mobile-trade-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-market-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  font-size: 10px;
  color: #cbd5e1;
  background: rgba(8, 13, 11, 0.7);
  border-bottom: 1px solid #14221c;
  overflow-x: auto;
  white-space: nowrap;
}

.mobile-bal-card {
  background: #0d1512;
  border: 1px solid #16241f;
  border-radius: 10px;
  padding: 9px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-action-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.mobile-action-pills .header-action-pill {
  height: 27px;
  padding: 0 11px;
  font-size: 11px;
}

.mobile-pending-banner {
  padding: 8px 10px;
}


.mobile-ticket-card {
  background: #0a110e;
  border: 1px solid #14221c;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.mobile-input-stepper-box {
  display: flex;
  align-items: center;
  background: #0d1512;
  border: 1px solid #16241f;
  border-radius: 8px;
  overflow: hidden;
  height: 42px;
}

.stepper-btn {
  background: transparent;
  border: none;
  color: #7b8e87;
  font-size: 18px;
  font-weight: 700;
  width: 44px;
  height: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: all 0.15s ease;
}

.stepper-btn:active {
  background: rgba(44, 213, 138, 0.15);
  color: #2cd58a;
}

.mobile-clean-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f8fafc;
  font-size: 16px !important;
  text-align: center;
  font-weight: 600;
}

.quick-fill-pill {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-fill-pill:hover,
.quick-fill-pill:active {
  color: #2cd58a;
  border-color: rgba(44, 213, 138, 0.3);
  background: rgba(44, 213, 138, 0.08);
}

.mobile-mini-book-card {
  background: #0a110e;
  border: 1px solid #14221c;
  border-radius: 10px;
  overflow: hidden;
}

.mobile-open-orders-card {
  background: #0a110e;
  border: 1px solid #14221c;
  border-radius: 10px;
  overflow: hidden;
}

/* 3. Mobile Dedicated Full-Width Order Book */
.mobile-book-full-view {
  display: flex;
  flex-direction: column;
}

.mobile-book-panel {
  display: flex;
  flex-direction: column;
  background: #0a110e;
  border: 1px solid #14221c;
  border-radius: 10px;
  overflow: hidden;
}

.mobile-full-ob-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mobile-ob-full-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 4px 12px;
  font-size: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.1s ease;
}

.mobile-ob-full-row:active {
  background: rgba(255, 255, 255, 0.08);
}

.mobile-ob-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  margin: 3px 0;
  background: rgba(19, 28, 51, 0.6);
  border-top: 1px solid #1e293b;
  border-bottom: 1px solid #1e293b;
}

/* 4. Mobile Orders View */
.mobile-orders-view {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.mobile-orders-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0a110e;
  border: 1px solid #14221c;
  border-radius: 10px;
  overflow: hidden;
}

.mobile-order-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.mobile-order-card {
  background: #0d1512;
  border: 1px solid #16241f;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-order-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-order-card-body {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.mobile-order-field {
  display: flex;
  flex-direction: column;
}

.mobile-order-field .field-lbl {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
}

.mobile-order-field .field-val {
  font-size: 12px;
  color: #f1f5f9;
  font-weight: 600;
}

.mobile-cancel-btn {
  width: 100%;
  padding: 7px;
  font-size: 12px;
}

.mobile-trade-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
}

.mobile-trade-card {
  background: #0d1512;
  border: 1px solid #16241f;
  border-radius: 8px;
  padding: 8px 10px;
}

/* Screen Breakpoint Rules for Phone & Tablet */
@media (max-width: 768px) {
  .mobile-hide {
    display: none !important;
  }
  .clob-wrapper {
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    padding: 8px;
    height: 100vh;
    height: 100dvh;
    max-height: 100dvh;
    overflow-x: hidden;
    overflow-y: hidden;
  }
  .clob-mobile-main {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  .clob-header {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    margin-bottom: 8px;
    gap: 6px;
    flex-wrap: wrap;
    overflow-x: visible;
  }
  .header-left {
    gap: 6px;
    min-width: 0;
    flex: 1 1 auto;
    flex-shrink: 1;
  }
  .header-right {
    gap: 6px;
    flex-shrink: 0;
    margin-left: auto;
  }
  .pair-tab-btn {
    padding: 4px 8px;
    font-size: 11px;
    white-space: nowrap;
  }
  .back-wallet-btn {
    padding: 4px 8px;
    font-size: 11px;
  }
  .mobile-faucet-btn {
    padding: 4px 8px;
    font-size: 10.5px;
  }
  .mobile-chart-panel .panel-header {
    flex-wrap: wrap;
    height: auto;
    gap: 6px;
    padding: 7px 10px;
  }
  .mobile-chart-panel .chart-header-left {
    width: 100%;
    min-width: 0;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 8px;
  }
  .mobile-chart-panel .ohlc-bar {
    flex-wrap: wrap;
    gap: 4px 6px;
    font-size: 10px;
  }
  .mobile-chart-panel .chart-actions {
    width: auto;
    margin-left: auto;
    justify-content: flex-end;
  }
  .mobile-bal-card,
  .mobile-ticket-card,
  .mobile-mini-book-card,
  .mobile-open-orders-card,
  .mobile-book-panel,
  .mobile-orders-panel {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    min-width: 0;
  }
  input.form-input,
  input.mobile-clean-input,
  input[type="number"],
  input[type="text"],
  input[type="password"] {
    font-size: 16px !important; /* Critical: stops iOS Safari auto-zoom on input tap */
  }
  .modal-card {
    margin: 0;
    max-width: 100%;
    max-height: calc(100vh - 24px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .modal-header {
    padding: 13px 15px;
  }
  .modal-body {
    padding: 14px 15px;
  }
  .modal-footer {
    padding: 12px 15px;
    flex-wrap: wrap;
  }
  .pending-settle-banner {
    flex-direction: column;
    align-items: stretch;
  }
  .toast-container {
    left: 12px;
    right: 12px;
    bottom: 14px;
    max-width: none;
  }
}

@media (max-width: 960px) and (min-width: 769px) {
  .clob-wrapper {
    height: auto;
    min-height: 100vh;
    max-height: none;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .clob-grid {
    display: flex;
    flex-direction: column;
    height: auto;
    overflow: visible;
    gap: 16px;
  }
  .chart-and-orders-col {
    min-height: 520px;
  }
  .orderbook-col {
    min-height: 480px;
  }
  .order-entry-col {
    min-height: 480px;
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


/* Modal Styling */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  z-index: 9999;
}

.modal-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - 24px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
  overflow-x: hidden;
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

.header-action-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.pill-activate {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(5, 150, 105, 0.24));
  border-color: rgba(16, 185, 129, 0.45);
  color: #34d399;
}

.pill-activate:hover {
  background: linear-gradient(135deg, #10b981, #059669);
  border-color: transparent;
  color: #022c22;
  transform: translateY(-1px);
}

.pill-activated {
  background: #1e293b;
  border-color: #334155;
  color: #94a3b8;
  cursor: default;
}

.pill-pending {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  cursor: wait;
}

.pill-syncing {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(51, 65, 85, 0.8);
  color: #94a3b8;
  cursor: wait;
}

.pill-topup {
  background: rgba(56, 189, 248, 0.16);
  border-color: rgba(56, 189, 248, 0.4);
  color: #7dd3fc;
}

.pill-topup:hover {
  background: #0284c7;
  border-color: transparent;
  color: #ffffff;
  transform: translateY(-1px);
}

.pill-withdraw {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
  border-color: rgba(139, 92, 246, 0.4);
  color: #c084fc;
}

.pill-withdraw:hover {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-color: transparent;
  color: #ffffff;
  transform: translateY(-1px);
}

/* Unified Multi-Mosaic Top-Up / Withdrawal Rows */
.multi-asset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.multi-asset-row {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.multi-asset-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.asset-tag {
  font-size: 12px;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.03em;
}

.asset-avail {
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #94a3b8;
}

.multi-asset-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.multi-input-box {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
}

.row-quick-btn {
  height: 32px;
  padding: 0 9px;
  border-radius: 8px;
  background: #0f172a;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.row-quick-btn:hover {
  background: #1e293b;
  border-color: #38bdf8;
  color: #f8fafc;
}

.pending-settle-banner {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.settle-now-btn {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.45);
  color: #fde68a;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 8px;
  white-space: nowrap;
  cursor: pointer;
}

.settle-now-btn:hover:not(:disabled) {
  background: #d97706;
  color: #ffffff;
}

.settle-now-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
