<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-card trading-setup-card">
      <div class="modal-header">
        <div class="modal-title">
          <span class="modal-icon">🛡️</span>
          <div>
            <h3>Activate Smart Trading Account</h3>
            <p class="modal-subtitle">Non-custodial 2-of-2 Sirius L1 account</p>
          </div>
        </div>
        <button class="modal-close-btn" @click="handleClose">✕</button>
      </div>

      <div class="modal-body">
        <div class="security-Guarantee-box mb-3">
          <div class="guarantee-row">
            <span class="badge-ok">🔐</span>
            <span><strong>2-of-2 Multisig Trading Account:</strong> The exchange will create a dedicated Sirius Trading Account where <strong>Signer 1 is your Wallet</strong> and <strong>Signer 2 is the Validator Nodes Cluster</strong>.</span>
          </div>
          <div class="guarantee-row">
            <span class="badge-ok">⚡</span>
            <span><strong>All trading uses this account:</strong> Every buy, sell, and atomic L1 settlement runs in connection with your Trading Account — neither the exchange nor any node can move your funds without your wallet.</span>
          </div>
          <div class="guarantee-row">
            <span class="badge-ok">⏳</span>
            <span><strong>Block confirmation:</strong> Please wait ~15–30 seconds after activating (one-time L1 fee: ~0.25 XPX).</span>
          </div>
        </div>

        <div v-if="isWaitingConfirmation" class="confirm-wait-box mb-3">
          <div class="confirm-wait-row">
            <span class="spinner-dot"></span>
            <div>
              <div class="confirm-wait-title">Waiting for Sirius L1 block confirmation...</div>
              <div class="confirm-wait-sub">
                Usually takes ~15–30s • {{ elapsedSeconds }}s elapsed
                <span v-if="broadcastTxHash"> • Tx {{ broadcastTxHash.slice(0, 10) }}...</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="detectedAccounts.length > 0 && !isWaitingConfirmation" class="detected-box mb-3">
          <div class="detected-header">
            <span>Detected Existing Trading Accounts ({{ detectedAccounts.length }})</span>
            <button
              v-if="emptyOrphanCount > 0"
              type="button"
              class="cleanup-btn"
              @click="cleanupEmptyOrphans"
            >
              Remove {{ emptyOrphanCount }} empty duplicate{{ emptyOrphanCount > 1 ? 's' : '' }}
            </button>
          </div>
          <div class="detected-list">
            <div v-for="acc in detectedAccounts" :key="acc.address" class="detected-row">
              <div>
                <div class="detected-addr">{{ acc.name }} • {{ acc.address.slice(0, 8) }}...{{ acc.address.slice(-6) }}</div>
                <div class="detected-bal">{{ acc.balanceText }}</div>
              </div>
              <span class="detected-badge" :class="acc.badgeClass">{{ acc.statusLabel }}</span>
            </div>
          </div>
        </div>

        <div v-if="!sessionKey && !isWaitingConfirmation" class="form-group mb-2">
          <label class="modal-label">Wallet Password</label>
          <div class="input-box">
            <input
              type="password"
              v-model="passwordInput"
              class="form-input font-mono"
              placeholder="Enter wallet password"
              @keyup.enter="activate"
            />
          </div>
        </div>

        <p v-if="errorMsg" class="text-xs text-rose-400 font-medium mt-2">{{ errorMsg }}</p>
        <p v-if="statusMsg && !isWaitingConfirmation" class="text-xs text-emerald-400 font-medium mt-2">{{ statusMsg }}</p>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="handleClose" :disabled="isActivating && !isWaitingConfirmation">
          {{ isWaitingConfirmation ? 'Hide & Wait in Background' : 'Cancel' }}
        </button>
        <button v-if="!isWaitingConfirmation" class="btn-confirm-activate" @click="activate" :disabled="isActivating">
          <span v-if="isActivating">Submitting (~15–30s)...</span>
          <span v-else>Activate Smart Trading</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import {
  Account,
  Address,
  AggregateTransaction,
  CosignatureTransaction,
  Deadline,
  ModifyMultisigAccountTransaction,
  MultisigCosignatoryModification,
  MultisigCosignatoryModificationType,
  Mosaic,
  MosaicId,
  Password,
  PlainMessage,
  PublicAccount,
  TransferTransaction,
  UInt64,
} from 'tsjs-xpx-chain-sdk';
import { walletState } from '@/state/walletState';
import { networkState } from '@/state/networkState';
import { WalletAccount } from '@/models/walletAccount';
import { WalletUtils } from '@/util/walletUtils';

const props = defineProps<{
  visible: boolean;
  activeAccount: any;
  validatorCluster: any;
  clobApiBase: string;
  networkType: number;
  generationHash: string;
  sessionKey: string | null;
}>();

const emit = defineEmits(['close', 'activated']);

const passwordInput = ref('');
const errorMsg = ref('');
const statusMsg = ref('');
const isActivating = ref(false);
const isWaitingConfirmation = ref(false);
const broadcastTxHash = ref('');
const elapsedSeconds = ref(0);
let elapsedTimer: ReturnType<typeof setInterval> | null = null;
let pendingActivatedPayload: any = null;
let dismissedToBackground = false;

interface DetectedTradingAccount {
  name: string;
  address: string;
  publicKey: string;
  balanceText: string;
  statusLabel: string;
  badgeClass: string;
  isEmptyOrphan: boolean;
}

const detectedAccounts = ref<DetectedTradingAccount[]>([]);
const emptyOrphanCount = computed(() => detectedAccounts.value.filter((a) => a.isEmptyOrphan).length);

async function scanExistingTradingAccounts() {
  const wallet = walletState.currentLoggedInWallet;
  const clusterPub = String(props.validatorCluster?.clusterPublicKey || '').toUpperCase();
  const netType = props.validatorCluster?.networkType || props.networkType;
  const nodeUrl = getSiriusNodeUrl(netType);

  const byAddr = new Map<string, { name: string; address: string; publicKey: string }>();
  if (wallet && Array.isArray(wallet.accounts)) {
    for (const a of wallet.accounts as any[]) {
      const name = String(a?.name || '');
      if (a?.isTradingAccount || name.startsWith('Trading (')) {
        const clean = String(a.address || '').replace(/[- ]/g, '').toUpperCase();
        if (clean) {
          byAddr.set(clean, { name: name || 'Trading', address: clean, publicKey: String(a.publicKey || '').toUpperCase() });
        }
      }
    }
  }

  // Also check Sirius L1 multisig graph for primary account
  if (props.activeAccount?.address) {
    try {
      const ownerClean = String(props.activeAccount.address).replace(/[- ]/g, '').toUpperCase();
      const msRes = await fetch(`${nodeUrl}/account/${ownerClean}/multisig`);
      if (msRes.ok) {
        const msJson = await msRes.json();
        const msAccounts: string[] = msJson?.multisig?.multisigAccounts || [];
        for (const pub of msAccounts) {
          try {
            const addr = Address.createFromPublicKey(pub, netType).plain().replace(/[- ]/g, '').toUpperCase();
            if (!byAddr.has(addr)) {
              byAddr.set(addr, { name: 'On-Chain Multisig', address: addr, publicKey: pub.toUpperCase() });
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  const results: DetectedTradingAccount[] = [];
  for (const item of byAddr.values()) {
    let hasAssets = false;
    let accountVerifiedEmpty = false;
    let balSummary = '0 XPX';
    let isMultisig = false;
    let multisigVerifiedNone = false;
    let matchesCurrentCluster = false;

    try {
      const accRes = await fetch(`${nodeUrl}/account/${item.address}`);
      if (accRes.status === 404) {
        accountVerifiedEmpty = true;
      } else if (accRes.ok) {
        const accJson = await accRes.json();
        const mosaics = accJson?.account?.mosaics || [];
        if (mosaics.length > 0) {
          hasAssets = true;
          const xpxHex = netType === 184 ? '402B2F579FAEBC59' : '13BFC518E40549D7';
          const usdtHex = netType === 184 ? '7525381A171D1E44' : '4430AEFEF7E15D0C';
          const bnbHex = netType === 184 ? '1E5C5FADEC7B34DD' : '3CC1D3CE7447B6F9';
          const parts: string[] = [];
          for (const m of mosaics) {
            const hi = BigInt(m.id[1] >>> 0);
            const lo = BigInt(m.id[0] >>> 0);
            const hex = ((hi << 32n) | lo).toString(16).toUpperCase().padStart(16, '0');
            const amt = Number(BigInt(m.amount[0] >>> 0) + (BigInt(m.amount[1] >>> 0) << 32n)) / 1_000_000;
            if (amt <= 0) continue;
            if (hex === xpxHex) parts.push(`${amt.toFixed(2)} XPX`);
            else if (hex === usdtHex) parts.push(`${amt.toFixed(2)} USDT`);
            else if (hex === bnbHex) parts.push(`${amt.toFixed(4)} BNB`);
            else parts.push(`${amt.toFixed(2)} Mosaic`);
          }
          balSummary = parts.length > 0 ? parts.join(' • ') : '0 XPX';
        } else {
          accountVerifiedEmpty = true;
        }
      }
    } catch (_) {}

    try {
      const msRes = await fetch(`${nodeUrl}/account/${item.address}/multisig`);
      if (msRes.status === 404) {
        multisigVerifiedNone = true;
      } else if (msRes.ok) {
        const msJson = await msRes.json();
        const ms = msJson?.multisig;
        if (ms && ms.minApproval >= 2) {
          isMultisig = true;
          const cosigs = (ms.cosignatories || []).map((c: string) => c.toUpperCase());
          if (clusterPub && cosigs.includes(clusterPub)) {
            matchesCurrentCluster = true;
          }
        } else {
          multisigVerifiedNone = true;
        }
      }
    } catch (_) {}

    const verifiedEmptyOrphan = !isMultisig && !hasAssets && accountVerifiedEmpty && multisigVerifiedNone;
    let statusLabel = verifiedEmptyOrphan ? 'Empty / Failed' : 'Unverified (RPC Unavailable)';
    let badgeClass = 'badge-muted';
    if (matchesCurrentCluster) {
      statusLabel = 'Active (Current Node)';
      badgeClass = 'badge-green';
    } else if (isMultisig) {
      statusLabel = 'Old Node Build';
      badgeClass = 'badge-amber';
    } else if (hasAssets) {
      statusLabel = 'Unconverted (Funded)';
      badgeClass = 'badge-amber';
    }

    results.push({
      name: item.name,
      address: item.address,
      publicKey: item.publicKey,
      balanceText: balSummary,
      statusLabel,
      badgeClass,
      isEmptyOrphan: verifiedEmptyOrphan,
    });
  }
  detectedAccounts.value = results;
}

function cleanupEmptyOrphans() {
  const wallet = walletState.currentLoggedInWallet;
  if (!wallet || !Array.isArray(wallet.accounts)) return;
  const emptySet = new Set(detectedAccounts.value.filter((a) => a.isEmptyOrphan).map((a) => a.address));
  if (emptySet.size === 0) return;
  wallet.accounts = wallet.accounts.filter((a: any) => {
    const clean = String(a?.address || '').replace(/[- ]/g, '').toUpperCase();
    return !emptySet.has(clean);
  });
  walletState.wallets.saveMyWalletOnlytoLocalStorage(wallet);
  detectedAccounts.value = detectedAccounts.value.filter((a) => !a.isEmptyOrphan);
}

watch(
  () => props.visible,
  (isOpen) => {
    if (isOpen) {
      scanExistingTradingAccounts().catch(() => {});
    }
  },
  { immediate: true }
);

function stopElapsedTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

let isComponentMounted = true;

onUnmounted(() => {
  isComponentMounted = false;
  stopElapsedTimer();
});

function handleClose() {
  if (isWaitingConfirmation.value && pendingActivatedPayload) {
    dismissedToBackground = true;
    isWaitingConfirmation.value = false;
    stopElapsedTimer();
    const payload = pendingActivatedPayload;
    pendingActivatedPayload = null;
    emit('activated', { ...payload, confirmed: false });
    return;
  }
  if (!isActivating.value) {
    emit('close');
  }
}

function getSiriusNodeUrl(netType: number): string {
  let nodeEndpoint = networkState.selectedAPIEndpoint || (netType === 184 ? 'https://betelgeuse.xpxsirius.io' : 'https://api-2.testnet2.xpxsirius.io');
  if (netType === 184 && (!networkState.selectedAPIEndpoint || networkState.selectedAPIEndpoint.includes('testnet'))) {
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

async function activate() {
  if (isActivating.value) return;
  errorMsg.value = '';
  statusMsg.value = '';

  if (!props.activeAccount) {
    errorMsg.value = 'No active wallet account selected.';
    return;
  }
  if (!props.clobApiBase) {
    errorMsg.value = 'CLOB Exchange API endpoint is not configured for this network.';
    return;
  }

  let ownerPriv = props.sessionKey || '';
  let rawPassword = '';
  if (!ownerPriv) {
    if (!passwordInput.value) {
      errorMsg.value = 'Wallet password is required.';
      return;
    }
    try {
      rawPassword = passwordInput.value;
      const pwd = new Password(rawPassword);
      ownerPriv = WalletUtils.decryptPrivateKey(pwd, props.activeAccount.encrypted, props.activeAccount.iv);
      passwordInput.value = '';
    } catch (_) {
      rawPassword = '';
      errorMsg.value = 'Incorrect wallet password.';
      return;
    }
  }

  if (!ownerPriv || ownerPriv.length !== 64) {
    errorMsg.value = 'Unable to unlock owner signing key.';
    return;
  }

  isActivating.value = true;
  try {
    // 1. Ensure fresh Validator Cluster public key from backend
    let clusterInfo = props.validatorCluster;
    if (!clusterInfo?.clusterPublicKey) {
      const infoRes = await fetch(`${props.clobApiBase}/api/clob/validator-info`);
      clusterInfo = await infoRes.json();
    }
    if (!clusterInfo?.clusterPublicKey) {
      throw new Error('Could not fetch Validator Cluster public key from CLOB backend.');
    }

    const genHash = clusterInfo.generationHash || props.generationHash;
    const netType = clusterInfo.networkType || props.networkType;
    const ownerAcc = Account.createFromPrivateKey(ownerPriv, netType, 1);

    // 1b. Refresh cluster info from GET /validator-info (never call admin-gated POST /validator-cluster/bootstrap from user UI!)
    if (!clusterInfo.isMultisigConfirmedOnChain) {
      statusMsg.value = 'Verifying Level-2 BFT Validator Cluster on Sirius L1...';
      try {
        const freshRes = await fetch(`${props.clobApiBase}/api/clob/validator-info`);
        const freshInfo = await freshRes.json();
        if (freshInfo?.clusterPublicKey) {
          clusterInfo = freshInfo;
        }
      } catch (_) {}
    }

    // 2. Generate dedicated Smart Trading Account keypair (saved ONLY after L1 broadcast succeeds!)
    const tradingAcc = Account.generateNewAccount(netType);

    statusMsg.value = 'Signing native 2-of-2 ModifyMultisigAccountTransaction...';
    const clusterPubAcc = PublicAccount.createFromPublicKey(clusterInfo.clusterPublicKey, netType);

    const modTx = ModifyMultisigAccountTransaction.create(
      Deadline.create(),
      2,
      2,
      [
        new MultisigCosignatoryModification(MultisigCosignatoryModificationType.Add, ownerAcc.publicAccount),
        new MultisigCosignatoryModification(MultisigCosignatoryModificationType.Add, clusterPubAcc),
      ],
      netType
    ).toAggregateV1(tradingAcc.publicAccount);

    const aggTx = AggregateTransaction.createCompleteV1(
      Deadline.create(),
      [modTx],
      netType,
      [],
      UInt64.fromUint(250000)
    );

    const signedByInitiator = ownerAcc.preV2Sign(aggTx, genHash);
    const tradingAccountCosig = CosignatureTransaction.signTransactionPayload(
      tradingAcc,
      signedByInitiator.payload,
      genHash
    );

    statusMsg.value = 'Collecting 2-of-3 BFT Validator Server cosignatures...';
    const res = await fetch(`${props.clobApiBase}/api/clob/account/activate-trading-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signedByInitiatorPayload: signedByInitiator.payload,
        tradingAccountCosig: {
          parentHash: tradingAccountCosig.parentHash,
          signer: tradingAccountCosig.signer,
          signature: tradingAccountCosig.signature,
        },
        ownerPublicKey: ownerAcc.publicKey,
        tradingAccountPublicKey: tradingAcc.publicKey,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || 'Failed to activate Trading Account');
    }

    // Persist Trading Account into local wallet ONLY AFTER L1 activation broadcast succeeded
    const wallet = walletState.currentLoggedInWallet;
    if (wallet && rawPassword) {
      try {
        const plainAddr = tradingAcc.address.plain();
        const exists = wallet.accounts.some((a: any) => a.address === plainAddr || a.publicKey === tradingAcc.publicKey);
        if (!exists) {
          const pwdObj = WalletUtils.createPassword(rawPassword);
          const enc = WalletUtils.createAccountSimpleFromPrivateKey(
            `Trading (${props.activeAccount.name || 'CLOB'})`,
            pwdObj,
            tradingAcc.privateKey,
            netType
          );
          const wa = new WalletAccount(
            `Trading (${props.activeAccount.name || 'CLOB'})`,
            tradingAcc.publicKey,
            plainAddr,
            'pass:bip32',
            enc.encryptedPrivateKey.encryptedKey,
            enc.encryptedPrivateKey.iv
          );
          wa.isTradingAccount = true;
          wa.linkedMainAddress = props.activeAccount.address;
          wallet.accounts.push(wa);
          walletState.wallets.saveMyWalletOnlytoLocalStorage(wallet);
        }
      } catch (_) {}
    }

    statusMsg.value = 'Broadcast complete. Waiting for Sirius L1 block confirmation...';
    passwordInput.value = '';
    broadcastTxHash.value = data.txHash || '';
    pendingActivatedPayload = { ...data, ownerPrivateKey: ownerPriv };
    dismissedToBackground = false;
    isWaitingConfirmation.value = true;
    elapsedSeconds.value = 0;
    stopElapsedTimer();
    elapsedTimer = setInterval(() => {
      elapsedSeconds.value += 1;
    }, 1000);

    // Poll Sirius L1 until transaction confirms in a block (~15–30s) or user moves to background
    const nodeUrl = getSiriusNodeUrl(netType);
    let confirmedOnL1 = false;
    for (let i = 0; i < 24; i++) {
      if (dismissedToBackground || !isComponentMounted) return;
      await new Promise((r) => setTimeout(r, 2500));
      if (dismissedToBackground || !isComponentMounted) return;
      try {
        const stRes = await fetch(`${nodeUrl}/transactionStatus/${data.txHash}`);
        if (stRes.ok) {
          const st = await stRes.json();
          if (st.group === 'confirmed') {
            confirmedOnL1 = true;
            break;
          }
          if (st.group === 'failed') {
            throw new Error(`Sirius L1 rejected activation: ${st.status}`);
          }
        }
      } catch (pollErr: any) {
        if (pollErr.message?.includes('rejected activation')) throw pollErr;
      }
    }

    stopElapsedTimer();
    isWaitingConfirmation.value = false;
    const finalPayload = pendingActivatedPayload || { ...data, ownerPrivateKey: ownerPriv };
    pendingActivatedPayload = null;
    if (!dismissedToBackground) {
      emit('activated', { ...finalPayload, confirmed: confirmedOnL1 });
    }
  } catch (err: any) {
    stopElapsedTimer();
    isWaitingConfirmation.value = false;
    pendingActivatedPayload = null;
    errorMsg.value = err?.message || 'Activation failed';
  } finally {
    rawPassword = '';
    passwordInput.value = '';
    stopElapsedTimer();
    isActivating.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 12, 0.78);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.trading-setup-card {
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: #0c1411;
  border: 1px solid #1e352c;
  border-radius: 14px;
  padding: 18px 20px;
  color: #f1f5f9;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.modal-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}
.modal-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: #86efac;
}
.modal-icon {
  font-size: 22px;
}
.modal-close-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 16px;
  cursor: pointer;
}
.security-Guarantee-box {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.22);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.guarantee-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  color: #cbd5e1;
}
.badge-ok {
  color: #34d399;
  font-weight: 700;
}
.confirm-wait-box {
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.28);
  border-radius: 10px;
  padding: 12px;
}
.confirm-wait-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.confirm-wait-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #e0f2fe;
}
.confirm-wait-sub {
  font-size: 11px;
  color: #7dd3fc;
  margin-top: 2px;
}
.spinner-dot {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  border: 2px solid rgba(125, 211, 252, 0.25);
  border-top-color: #38bdf8;
  flex-shrink: 0;
  animation: clob-spin 0.85s linear infinite;
}
@keyframes clob-spin {
  to {
    transform: rotate(360deg);
  }
}
.modal-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}
.input-box {
  display: flex;
  align-items: center;
  background: #080d0b;
  border: 1px solid #1e352c;
  border-radius: 8px;
  padding: 8px 10px;
}
.form-input {
  background: transparent;
  border: none;
  color: #f8fafc;
  width: 100%;
  outline: none;
  font-size: 13px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
.btn-cancel {
  background: #131f1b;
  border: 1px solid #1e352c;
  color: #94a3b8;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.btn-confirm-activate {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: #022c22;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.btn-confirm-activate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.detected-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 10px 12px;
}
.detected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #cbd5e1;
  margin-bottom: 6px;
}
.cleanup-btn {
  background: rgba(244, 63, 94, 0.14);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: #fda4af;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.cleanup-btn:hover {
  background: #e11d48;
  color: #fff;
}
.detected-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 120px;
  overflow-y: auto;
}
.detected-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #080d0b;
  border: 1px solid #172721;
  border-radius: 7px;
  padding: 5px 8px;
}
.detected-addr {
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #e2e8f0;
}
.detected-bal {
  font-size: 10px;
  color: #94a3b8;
}
.detected-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 9999px;
  white-space: nowrap;
}
.badge-green {
  background: rgba(16, 185, 129, 0.16);
  color: #34d399;
}
.badge-amber {
  background: rgba(245, 158, 11, 0.16);
  color: #fbbf24;
}
.badge-muted {
  background: rgba(100, 116, 139, 0.2);
  color: #94a3b8;
}
</style>
