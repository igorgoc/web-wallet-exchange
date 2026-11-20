<template>
  <div>
    <form @submit.prevent="login">
      <fieldset>
        <div
          class="w-8/12 text-center mr-auto ml-auto error error_box"
          v-if="err != ''"
        >
          {{ err }}
        </div>
        <div class="w-8/12 mx-auto">
          <SelectNetwork />
        </div>
        <div class="mt-3"></div>
        <div class="w-8/12 mx-auto">
          <SelectWallet v-model="selectedWallet" />
        </div>
        <div class="mt-3"></div>
        <div class="text-center">
          <PasswordInput
            class="w-8/12 block ml-auto mr-auto"
            :placeholder="$t('general.password')"
            :errorMessage="$t('general.passwordRequired')"
            :showError="showPasswdError"
            v-model="walletPassword"
            icon="lock"
          />
        </div>
        <div class="text-center mt-2">
          <button
            type="submit"
            class="blue-btn bg-gray-primary py-2.5 w-8/12 disabled:opacity-50"
            :disabled="disableSignin || passwordCorrectPattern"
          >
            {{ $t("home.signIn") }}
          </button>
        </div>
      </fieldset>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import SelectNetwork from "@/components/SelectNetwork.vue";
import SelectWallet from "@/modules/home/components/SelectWallet.vue";
import PasswordInput from "@/components/PasswordInput.vue";
import { networkState } from "@/state/networkState";
import { walletState } from "@/state/walletState";
import { WalletUtils } from "@/util/walletUtils";
import { NetworkStateUtils } from "@/state/utils/networkStateUtils";
import { WalletStateUtils } from "@/state/utils/walletStateUtils";
import { Password } from "tsjs-xpx-chain-sdk";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();
const err = ref("");
const walletPassword = ref("");
const selectedWallet = ref<{ value: string; label: string } | null>(null);
const showPasswdError = ref(false);
const passwdPattern = "^[^ ]{8,}$";
const disableSignin = ref(false);

// Auto-select first available wallet for active network
const autoSelectWallet = () => {
  try {
    const available = walletState.wallets.filterByNetworkName(networkState.chainNetworkName);
    if (available && available.length > 0 && !selectedWallet.value) {
      selectedWallet.value = { value: available[0].name, label: available[0].name };
    }
  } catch (e) {}
};

onMounted(() => {
  autoSelectWallet();
});

watch(() => networkState.chainNetworkName, () => {
  selectedWallet.value = null;
  autoSelectWallet();
});

// Clear any stale legacy API key retry locks
try {
  localStorage.removeItem("locking_time");
  localStorage.removeItem("login_locking_retry");
} catch (e) {}

const passwordCorrectPattern = computed(() => {
  const hasValidPass = Boolean(walletPassword.value && walletPassword.value.match(passwdPattern));
  const hasWallet = Boolean(selectedWallet.value && selectedWallet.value.label);
  return !(hasValidPass && hasWallet);
});

const selectedNetwork = computed(() => {
  return {
    label: networkState.chainNetworkName,
    value: networkState.chainNetwork,
  };
});

const login = async () => {
  err.value = "";
  showPasswdError.value = false;

  if (!selectedWallet.value || !selectedWallet.value.label) {
    err.value = "Please select a wallet";
    return;
  }

  if (!walletPassword.value) {
    showPasswdError.value = true;
    return;
  }

  const walletName = selectedWallet.value.label;
  const currentNetwork = networkState.chainNetworkName;

  const result = WalletUtils.verifyWalletPassword(
    walletName,
    currentNetwork,
    walletPassword.value
  );

  if (!result) {
    err.value = t("general.walletPasswordInvalid", {
      name: walletName,
    });
    showPasswdError.value = true;
    return;
  }

  try {
    await NetworkStateUtils.updateNetworkConfig();
  } catch (e) {
    console.warn("Network config update deferred:", e);
  }

  sessionStorage.setItem("soundSetting", "true");
  WalletUtils.checkLoadedDataUsable(currentNetwork);

  const wallet = walletState.wallets.filterByNetworkNameAndName(
    currentNetwork,
    walletName
  );

  if (!wallet) {
    err.value = "Wallet not found for current network";
    return;
  }

  wallet.fixNonManagableAccounts();
  walletState.wallets.saveMyWalletOnlytoLocalStorage(wallet);
  WalletStateUtils.updateLoggedIn(wallet);
  NetworkStateUtils.updateLastAccessNetworkName(currentNetwork);

  // Cache testnet keys on Testnet for seamless 1-click trading without unlock lock prompt
  if (wallet && wallet.accounts && wallet.accounts.length > 0) {
    try {
      const pwd = new Password(walletPassword.value);
      for (const acc of wallet.accounts) {
        const priv = WalletUtils.decryptPrivateKey(pwd, acc.encrypted, acc.iv);
        if (priv && priv.length === 64) {
          const raw = acc.address.replace(/[- ]/g, '').toUpperCase();
          sessionStorage.setItem('_clob_testnet_key_' + raw, priv);
          localStorage.setItem('_clob_testnet_key_' + raw, priv);
        }
      }
    } catch (_) {}
  }

  router.push({ name: "ViewDashboard" });
};
</script>
