<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card trading-setup-card">
      <div class="modal-header">
        <div class="modal-title">
          <span class="modal-icon">🛡️</span>
          <div>
            <h3>Activate Native Smart Trading Account</h3>
            <p class="modal-subtitle">Solution 2 (Model A) • 2-of-2 Sirius L1 Co-Signed Security</p>
          </div>
        </div>
        <button class="modal-close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div class="security-Guarantee-box mb-3">
          <div class="guarantee-row">
            <span class="badge-ok">✓</span>
            <span><strong>Zero Hot Wallet Risk:</strong> Your coins stay in your own dedicated on-chain Sirius account.</span>
          </div>
          <div class="guarantee-row">
            <span class="badge-ok">✓</span>
            <span><strong>No Exchange Theft:</strong> Validator servers cannot move a single mosaic without your key.</span>
          </div>
          <div class="guarantee-row">
            <span class="badge-ok">✓</span>
            <span><strong>BFT Co-Signing (2-of-3):</strong> Withdrawals &amp; settlements require 2-of-3 distributed validator nodes.</span>
          </div>
        </div>

        <div class="summary-box mb-3 font-mono text-xs">
          <div class="summary-row">
            <span class="text-slate-400">Cosigner 1 (You)</span>
            <span class="text-emerald-400">{{ shortKey(activeAccount?.publicKey) }}</span>
          </div>
          <div class="summary-row">
            <span class="text-slate-400">Cosigner 2 (Validator Cluster 2-of-3)</span>
            <span class="text-sky-400">{{ shortKey(clusterPubKey) }}</span>
          </div>
          <div class="summary-row">
            <span class="text-slate-400">On-Chain Scheme</span>
            <span class="text-slate-200">Native 2-of-2 Multisig (Level 1 → Level 2)</span>
          </div>
          <div class="summary-row">
            <span class="text-slate-400">L1 Network Activation Fee</span>
            <span class="text-amber-400">~0.05 XPX (from Main Wallet)</span>
          </div>
        </div>

        <div v-if="!sessionKey" class="form-group mb-2">
          <label class="modal-label">Wallet Password</label>
          <div class="input-box">
            <input
              type="password"
              v-model="passwordInput"
              class="form-input font-mono"
              placeholder="Enter wallet password to sign L1 activation"
              @keyup.enter="activate"
            />
          </div>
        </div>

        <p v-if="errorMsg" class="text-xs text-rose-400 font-medium mt-2">{{ errorMsg }}</p>
        <p v-if="statusMsg" class="text-xs text-emerald-400 font-medium mt-2">{{ statusMsg }}</p>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')" :disabled="isActivating">Cancel</button>
        <button class="btn-confirm-activate" @click="activate" :disabled="isActivating">
          <span v-if="isActivating">Broadcasting L1 Activation...</span>
          <span v-else>Activate 2-of-2 Trading Account</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Account,
  AggregateTransaction,
  CosignatureTransaction,
  Deadline,
  ModifyMultisigAccountTransaction,
  MultisigCosignatoryModification,
  MultisigCosignatoryModificationType,
  Password,
  PublicAccount,
  UInt64,
} from 'tsjs-xpx-chain-sdk';
import { walletState } from '@/state/walletState';
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

const clusterPubKey = computed(() => props.validatorCluster?.clusterPublicKey || '');

function shortKey(k: string) {
  if (!k) return 'Loading...';
  return `${k.slice(0, 8)}...${k.slice(-6)}`;
}

async function activate() {
  if (isActivating.value) return;
  errorMsg.value = '';
  statusMsg.value = '';

  if (!props.activeAccount) {
    errorMsg.value = 'No active wallet account selected.';
    return;
  }

  let ownerPriv = props.sessionKey || '';
  if (!ownerPriv) {
    if (!passwordInput.value) {
      errorMsg.value = 'Wallet password is required.';
      return;
    }
    try {
      const pwd = new Password(passwordInput.value);
      ownerPriv = WalletUtils.decryptPrivateKey(pwd, props.activeAccount.encrypted, props.activeAccount.iv);
    } catch (_) {
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

    // 2. Generate dedicated Smart Trading Account keypair (and save to local wallet if password provided)
    const tradingAcc = Account.generateNewAccount(netType);
    const wallet = walletState.currentLoggedInWallet;
    if (wallet && passwordInput.value) {
      try {
        const pwdObj = WalletUtils.createPassword(passwordInput.value);
        const enc = WalletUtils.createAccountSimpleFromPrivateKey(
          `Trading (${props.activeAccount.name || 'CLOB'})`,
          pwdObj,
          tradingAcc.privateKey,
          netType
        );
        const wa = new WalletAccount(
          `Trading (${props.activeAccount.name || 'CLOB'})`,
          tradingAcc.publicKey,
          tradingAcc.address.plain(),
          'pass:bip32',
          enc.encryptedPrivateKey.encryptedKey,
          enc.encryptedPrivateKey.iv
        );
        wa.isTradingAccount = true;
        wa.linkedMainAddress = props.activeAccount.address;
        wallet.accounts.push(wa);
        walletState.wallets.saveMyWalletOnlytoLocalStorage(wallet);
      } catch (_) {}
    }

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

    statusMsg.value = `Activation broadcast (${data.txHash.slice(0, 14)}...)! Confirming on Sirius L1...`;
    passwordInput.value = '';
    emit('activated', { ...data, ownerPrivateKey: ownerPriv });
  } catch (err: any) {
    errorMsg.value = err?.message || 'Activation failed';
  } finally {
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
.summary-box {
  background: #080d0b;
  border: 1px solid #172721;
  border-radius: 10px;
  padding: 10px 12px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
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
</style>
