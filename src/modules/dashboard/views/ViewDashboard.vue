<template>
  <div>
    <div class="px-2 sm:px-10 bg-gray-200 pb-4 pt-5">
      <div class="max-w-screen-sm m-auto">
        <div
          class="shadow-md w-full overflow-x-hidden address_div px-7 py-3 rounded flex flex-col bg-white text-black"
        >
          <div class="text-center py-3">
            <div class="text-center my-2">
              <div class="inline-block">
                <span class="font-bold text-xl">{{
                  selectedAccountBalanceFront
                }}</span
                >{{ selectedAccountBalanceBack ? "." : ""
                }}<span class="text-md">{{ selectedAccountBalanceBack }}</span>
                <span class="font-bold text-xl">{{
                  currentNativeTokenName
                }}</span>
              </div>
              <img
                src="@/modules/dashboard/img/icon-xpx.svg"
                class="inline-block w-6 h-6 ml-3 mb-2"
              />
            </div>
            <router-link
              :to="'/details-account/' + selectedAccountAddressPlain"
              class="inline-block text-xs font-bold text-blue-primary cursor-pointer"
              >{{ selectedAccountName
              }}<img
                src="@/modules/dashboard/img/icon-blue-chevron-right.svg"
                class="inline-block w-5 h-5 ml-1 mb-0.5"
            /></router-link>
            <div class="mb-8">
              <div class="flex items-center justify-center">
                <div
                  id="address"
                  class="inline-block font-bold outline-none break-all text-xs lg:text-tsm"
                  :copyValue="selectedAccountAddressPlain"
                  :copySubject="$t('general.address')"
                >
                  {{ selectedAccountAddressShort }}
                </div>

                <img
                  src="@/modules/dashboard/img/icon-copy.svg"
                  class="w-4 cursor-pointer ml-4 inline-block"
                  @click="copy('address')"
                />
                <AddressQRModal
                  :accountAddressQR="addressQR"
                  :notIncludeWord="true"
                />
              </div>
            </div>
            <div>
              <a
                :href="faucetLink"
                target="_new"
                class="inline-block text-center mr-2"
                v-if="faucetLink"
              >
                <div class="inline-block rounded-full bg-blue-primary w-8 h-8">
                  <div class="h-full w-full flex items-center justify-center">
                    <img
                      src="@/modules/dashboard/img/icon-balance-white.svg"
                      class="w-5 h-5"
                    />
                  </div>
                </div>
                <br />
                <div class="text-xxs text-gray-400 inline-block uppercase">
                  {{ $t("general.topUp") }}
                </div>
              </a>
              <router-link
                :to="{ name: 'ViewTransferCreate' }"
                class="inline-block text-center mx-2"
              >
                <div class="inline-block rounded-full bg-blue-primary w-8 h-8">
                  <div class="h-full w-full flex items-center justify-center">
                    <img
                      src="@/modules/dashboard/img/icon-transfer-white.svg"
                      class="w-5 h-5"
                    />
                  </div>
                </div>
                <br />
                <div class="text-xxs text-gray-400 inline-block uppercase">
                  {{ $t("general.transfer") }}
                </div>
              </router-link>
              <!-- <router-link :to="{ name: 'ViewServicesStackingBuy'}" class="inline-block text-center mx-2.5" v-if="isPublicNetwork">
                <div class="inline-block rounded-full bg-blue-primary w-8 h-8">
                  <div class="flex items-center justify-center h-full w-full">
                    <font-awesome-icon icon="shopping-bag" class="h-5 w-5 text-white" />
                  </div>
                </div><br>
                <div class="text-xxs text-gray-400 inline-block uppercase">{{$t('general.buy')}}</div>
              </router-link> -->
              <router-link
                :to="{ name: 'ViewServicesMainnetSwap' }"
                class="inline-block text-center mx-3"
                v-if="isPublicNetwork"
              >
                <div class="inline-block rounded-full bg-blue-primary w-8 h-8">
                  <div class="h-full w-full flex items-center justify-center">
                    <img
                      src="@/modules/dashboard/img/icon-swap-white.svg"
                      class="w-5 h-5"
                    />
                  </div>
                </div>
                <br />
                <div class="text-xxs text-gray-400 inline-block uppercase">
                  {{ $t("general.swap") }}
                </div>
              </router-link>
            </div>
          </div>
        </div>

        <!-- CLOB DEX Pending Order Signature & Settlement Alert (Home Screen) -->
        <div
          v-if="clobSettlementsNeedingMySignature.length > 0"
          class="mt-3 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 shadow-md text-left"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span class="text-xs font-extrabold uppercase tracking-wide text-amber-900">
                  DEX Action Required: {{ clobSettlementsNeedingMySignature.length }} Order{{ clobSettlementsNeedingMySignature.length > 1 ? 's' : '' }} Awaiting Your Signature
                </span>
              </div>
              <p class="text-xs text-amber-800 mt-1">
                Your matched CLOB order{{ clobSettlementsNeedingMySignature.length > 1 ? 's need' : ' needs' }} your co-signature to complete atomic settlement on Sirius L1:
              </p>
              <div class="mt-2 space-y-1.5">
                <div
                  v-for="item in clobSettlementsNeedingMySignature"
                  :key="item.settlementId"
                  class="flex flex-wrap items-center justify-between gap-2 rounded bg-white/90 border border-amber-200 px-3 py-2 text-xs"
                >
                  <div class="min-w-0">
                    <span class="font-mono font-bold text-gray-900">Order #{{ item.myOrderId || item.orderId }}</span>
                    <span
                      class="ml-1.5 inline-block px-1.5 py-0.5 rounded font-bold uppercase text-[10px]"
                      :class="item.mySide === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                    >
                      {{ item.mySide }}
                    </span>
                    <span class="ml-1.5 font-mono font-semibold text-gray-800">{{ item.myAmount }} XPX</span>
                    <span v-if="item.myPrice" class="ml-1 font-mono text-gray-600">@ {{ item.myPrice }} {{ item.quoteSymbol }}</span>
                    <span class="ml-1.5 text-[11px] text-gray-500">({{ item.pair }})</span>
                    <div class="text-[11px] text-amber-700 font-medium mt-0.5">
                      Signed {{ item.signedCount }}/{{ item.requiredCount }} — Waiting for your signature
                    </div>
                  </div>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer flex-shrink-0"
                    @click="goToSignClobOrder(item)"
                  >
                    Sign Order →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CLOB DEX Counterparty Signature Status (User2 waiting / both signed) -->
        <div
          v-else-if="clobCounterpartyStatusItems.length > 0"
          class="mt-3 rounded-lg border px-4 py-3 shadow-sm text-left"
          :class="clobHasOnlyWaitingCounterparty ? 'border-sky-300 bg-sky-50' : 'border-emerald-300 bg-emerald-50'"
        >
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span
              class="text-xs font-extrabold uppercase tracking-wide"
              :class="clobHasOnlyWaitingCounterparty ? 'text-sky-900' : 'text-emerald-900'"
            >
              DEX Order Settlement Status
            </span>
            <button
              type="button"
              class="text-xs font-bold underline cursor-pointer"
              :class="clobHasOnlyWaitingCounterparty ? 'text-sky-700' : 'text-emerald-700'"
              @click="router.push({ name: 'ViewServicesClobExchange', query: { tab: 'orders' } })"
            >
              View Open Orders →
            </button>
          </div>
          <div class="space-y-1.5">
            <div
              v-for="item in clobCounterpartyStatusItems.slice(0, 3)"
              :key="item.settlementId"
              class="flex flex-wrap items-center justify-between gap-2 rounded bg-white/90 border px-3 py-1.5 text-xs"
              :class="item.allPartiesSigned ? 'border-emerald-200' : 'border-sky-200'"
            >
              <div>
                <span class="font-mono font-bold text-gray-900">Order #{{ item.myOrderId || item.orderId }}</span>
                <span
                  class="ml-1.5 inline-block px-1.5 py-0.5 rounded font-bold uppercase text-[10px]"
                  :class="item.mySide === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                >
                  {{ item.mySide }}
                </span>
                <span class="ml-1.5 font-mono text-gray-800">{{ item.myAmount }} XPX</span>
                <span v-if="item.myPrice" class="ml-1 font-mono text-gray-600">@ {{ item.myPrice }} {{ item.quoteSymbol }}</span>
              </div>
              <span
                class="text-[11px] font-bold px-2 py-0.5 rounded-full"
                :class="item.allPartiesSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'"
              >
                <template v-if="item.allPartiesSigned && item.status === 'confirmed'">
                  ✓ Signed by both users ({{ item.signedCount }}/{{ item.requiredCount }}) · Confirmed on L1
                </template>
                <template v-else-if="item.allPartiesSigned">
                  ✓ Signed by both users ({{ item.signedCount }}/{{ item.requiredCount }}) · Settling on L1...
                </template>
                <template v-else>
                  Signed by you only ({{ item.signedCount }}/{{ item.requiredCount }}) · Waiting for counterparty
                </template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="text-left px-2 sm:px-10 bg-gray-200">
      <div class="transition-all flex items-end">
        <div
          class="text-xs inline-block px-3 rounded-t-sm py-3"
          :class="`${
            displayBoard == 'asset'
              ? 'bg-white text-gray-primary'
              : 'cursor-pointer'
          }`"
          @click="displayBoard = 'asset'"
        >
          {{ $t("general.asset", 2) }}
        </div>
        <div
          class="text-xs inline-block px-3 rounded-t-sm py-3"
          :class="`${
            displayBoard == 'overview'
              ? 'bg-white text-gray-primary'
              : 'cursor-pointer'
          }`"
          @click="displayBoard = 'overview'"
        >
          Activities
        </div>
      </div>
    </div>
    <div class="bg-white px-2 sm:px-10" v-if="displayBoard == 'overview'">
      <div class="text-txs text-gray-400 mt-10 mb-2">
        <b class="text-gray-700 uppercase">Pending Transactions</b>
      </div>
      <PendingDataTable :transaction="pendingTransactions" />
      <div class="text-txs text-gray-400 mt-10 mb-2">
        <b class="text-gray-700 uppercase">{{
          $t("dashboard.recentTransactions")
        }}</b>
      </div>
      <MixedTxnDataTable
        :selectedGroupType="transactionGroupType.CONFIRMED"
        :transactions="recentTransactions"
        @openDecryptMsg="openDecryptMsgModal"
      ></MixedTxnDataTable>
      <a
        :href="linkToExplorer()"
        target="_blank"
        v-if="searchedTransactions.length == 10"
        ><div class="text-right text-xs text-blue-primary mt-3">
          View more...
        </div></a
      >
    </div>
    <div
      class="bg-white px-2 sm:px-10 pt-12"
      v-else-if="displayBoard == 'asset'"
    >
      <DashboardAssetDataTable :assets="accountAssets" />
    </div>
  </div>
</template>

<script setup lang="ts">
import PendingDataTable from "@/modules/account/components/PendingDataTable.vue";
import { computed, ref, getCurrentInstance, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import {
  TransactionFilterTypes,
} from "@/modules/dashboard/model/transactions/transaction";
import MixedTxnDataTable from "@/modules/dashboard/components/TransactionDataTable/MixedTxnDataTable.vue";
import DashboardAssetDataTable from "@/modules/dashboard/components/DashboardAssetDataTable.vue";
import AddressQRModal from "@/modules/dashboard/components/AddressQRModal.vue";
import { copyToClipboard } from "@/util/functions";
import { Helper, LooseObject } from "@/util/typeHelper";
import { useToast } from "primevue/usetoast";
import { walletState } from "@/state/walletState";
import { ChainUtils } from "@/util/chainUtils";
import { networkState } from "@/state/networkState";
import { DashboardService } from "@/modules/dashboard/service/dashboardService";
import qrcode from "qrcode-generator";
import { listenerState } from "@/state/listenerState";
import { WalletUtils } from "@/util/walletUtils";
import { AppState } from "@/state/appState";
import { useI18n } from "vue-i18n";
import {  NetworkType, TransactionMapping } from "tsjs-xpx-chain-sdk";
import { TransactionUtils } from "@/util/transactionUtils";


const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const internalInstance = getCurrentInstance();

onMounted(() => {
  if (!walletState.isLogin && !walletState.currentLoggedInWallet) {
    router.push({ name: "Home" });
  }
});

watch([() => walletState.isLogin, () => walletState.currentLoggedInWallet], ([isLogin, wallet]) => {
  if (!isLogin && !wallet) {
    router.push({ name: "Home" });
  }
});
const emitter = internalInstance.appContext.config.globalProperties.emitter;
const displayBoard = ref("asset");
const showAddressQRModal = ref(false);
const showMessageModal = ref(false);
const showDecryptMessageModal = ref(false);
const showCosignModal = ref(false);
const messagePayload = ref("");
const publicKeyToUse = ref("");

const manualPublicKey = ref(false);
const initialSignerPublicKey = ref("");
const isInitialSender = ref(false);
const decryptMessageKey = ref(0);

const isPublicNetwork = computed(() => {
  return (
    AppState.networkType == NetworkType.TEST_NET ||
    AppState.networkType == NetworkType.MAIN_NET
  );
});

const openDecryptMsgModal = async (data) => {
  let txType = data.txType;
  let recipient = data.recipient;
  let recipientType = data.recipientType;
  let autoRecipientPublicKey = false;
  isInitialSender.value = false;
  let txSender = data.sender;
  initialSignerPublicKey.value = data.initialSigner;
  messagePayload.value = data.message;
  publicKeyToUse.value = "";
  manualPublicKey.value = false;
  //recipientAddress.value = data.recipient;
  if (txType === "Transfer" || txType === "Aggregate Complete") {
    autoRecipientPublicKey = true;
    let senderAccount = WalletUtils.findWalletAccountByPublicKey(
      walletState.currentLoggedInWallet,
      txSender
    );
    if (senderAccount) {
      isInitialSender.value = true;
    }
  } else {
    let senderAccount = WalletUtils.findWalletAccountByPublicKey(
      walletState.currentLoggedInWallet,
      initialSignerPublicKey.value
    );
    if (senderAccount) {
      isInitialSender.value = true;
    }
  }
  if (recipientType === "address") {
    let accountPublicKey = WalletUtils.findAccountPublicKeyByAddress(
      walletState.currentLoggedInWallet,
      recipient
    );
    if (accountPublicKey) {
      publicKeyToUse.value = accountPublicKey;
    } else {
      let accountInfo = await ChainUtils.getAccountInfo(
        Helper.createAddress(recipient)
      );
      if (accountInfo.publicKey === "0".repeat(64)) {
        manualPublicKey.value = true;
      } else {
        publicKeyToUse.value = accountInfo.publicKey;
      }
    }
  } else {
    let address = await ChainUtils.getNamespaceLinkedAddress(recipient);
    if (address) {
      let accountPublicKey = WalletUtils.findAccountPublicKeyByAddress(
        walletState.currentLoggedInWallet,
        recipient
      );
      if (accountPublicKey) {
        publicKeyToUse.value = accountPublicKey;
      } else {
        let accountInfo = await ChainUtils.getAccountInfo(address);
        if (accountInfo.publicKey === "0".repeat(64)) {
          manualPublicKey.value = true;
        } else {
          publicKeyToUse.value = accountInfo.publicKey;
        }
      }
    } else {
      manualPublicKey.value = true;
    }
  }
  if (!autoRecipientPublicKey) {
    manualPublicKey.value = true;
  }
  decryptMessageKey.value++;
  showDecryptMessageModal.value = true;
};


const currentNativeTokenName = computed(() => AppState.nativeToken.label);
const currentNativeTokenDivisibility = computed(
  () => AppState.nativeToken.divisibility
);
const displyFaucet = computed(() => {
  return AppState.networkType == NetworkType.TEST_NET ? true : false;
});
const faucetLink = computed(() => {
  if (displyFaucet.value) {
    if (networkState.chainNetworkName == "Sirius Testnet 1") {
      return "https://bctestnetfaucet.xpxsirius.io/#/";
    } else if (networkState.chainNetworkName == "Sirius Testnet 2") {
      return "https://bctestnet2faucet.xpxsirius.io/#/";
    } else {
      return false;
    }
  } else {
    if (AppState.networkType == NetworkType.MAIN_NET) {
      return "https://www.proximax.io/en/xpx";
    } else {
      return false;
    }
  }
});

let selectedAccount = computed(() => {
  if (!walletState.currentLoggedInWallet) {
    return null;
  } else if (!walletState.currentLoggedInWallet.selectDefaultAccount()) {
    return walletState.currentLoggedInWallet.accounts[0];
  }
  return walletState.currentLoggedInWallet.selectDefaultAccount();
});
const accountAssets = computed(() => {
  if (!walletState.currentLoggedInWallet) {
    return [];
  }
  let defaultAccAsset = selectedAccount.value.assets;
  let filteredAsset = defaultAccAsset.filter((asset) => asset.rawAmount != 0);
  return filteredAsset;
});


const selectedAccountAddress = computed(() => {
  if (selectedAccount.value) {
    return Helper.createAddress(selectedAccount.value.address).pretty();
  } else {
    return null;
  }
});
const selectedAccountAddressPlain = computed(() =>
  selectedAccount.value ? selectedAccount.value.address : null
);
const selectedAccountAddressShort = computed(() => {
  if (selectedAccount.value) {
    let prettyAddress = Helper.createAddress(
      selectedAccount.value.address
    ).pretty();
    let firstPartAddress = prettyAddress.substring(0, 11);
    let secondPartAddress = prettyAddress.substring(prettyAddress.length - 11);
    return firstPartAddress + "..." + secondPartAddress;
  } else {
    return null;
  }
});


const selectedAccountBalance = computed(() => {
  if (!selectedAccount.value) {
    return null;
  } else {
    return Helper.toCurrencyFormat(
      selectedAccount.value ? selectedAccount.value.balance : 0,
      currentNativeTokenDivisibility.value
    );
  }
});
const selectedAccountBalanceFront = computed(() => {
  if (selectedAccountBalance.value) {
    let balance = selectedAccountBalance.value.split(".");
    return balance[0];
  } else {
    return null;
  }
});
const selectedAccountBalanceBack = computed(() => {
  if (selectedAccountBalance.value) {
    let balance = selectedAccountBalance.value.split(".");
    return balance[1];
  } else {
    return null;
  }
});
const selectedAccountName = computed(() => {
  if (selectedAccount.value) {
    return selectedAccount.value.name;
  } else {
    return null;
  }
});
const addressQR = computed(() => {
  if (selectedAccountAddress.value) {
    let qr = qrcode(15, "H");
    qr.addData(selectedAccountAddress.value);
    qr.make();
    return qr.createDataURL();
  } else {
    return null;
  }
});
let dashboardService = new DashboardService(
  walletState.currentLoggedInWallet,
  selectedAccount.value
);
let accountConfirmedTxnsCount = ref(0);
let updateAccountTransactionCount = async () => {
  let transactionsCount = await dashboardService.getAccountTransactionsCount(
    selectedAccount.value
  );
  accountConfirmedTxnsCount.value = transactionsCount.confirmed;
};
const copy = (id) => {
  let stringToCopy = document.getElementById(id).getAttribute("copyValue");
  let copySubject = document.getElementById(id).getAttribute("copySubject");
  copyToClipboard(stringToCopy);

  toast.add({
    severity: "info",
    detail: copySubject + " " + t("general.copied"),
    group: "br-custom",
    life: 3000,
  });
};
// setup transaction loading
const recentTransactions = ref([]);
const searchedTransactions = ref([]);
const recentTransferTransactions = ref([]);
let allTxnQueryParams = Helper.createTransactionQueryParams();
let transactionGroupType = Helper.getTransactionGroupType();

let blockDescOrderSortingField = Helper.createTransactionFieldOrder(
  Helper.getQueryParamOrder_v2().DESC,
  Helper.getTransactionSortField().BLOCK
);
allTxnQueryParams.updateFieldOrder(blockDescOrderSortingField);
allTxnQueryParams.embedded = true;
let loadRecentTransactions = async () => {
  let txnQueryParams = Helper.createTransactionQueryParams();
  txnQueryParams.pageSize = 1;
  txnQueryParams.publicKey = selectedAccount.value.publicKey;
  txnQueryParams.embedded = true;
  txnQueryParams.updateFieldOrder(blockDescOrderSortingField);
  let transactionSearchResult = await dashboardService.searchTxns(
    transactionGroupType.CONFIRMED,
    txnQueryParams
  );
  let formattedTxns = await dashboardService.formatConfirmedMixedTxns(
    transactionSearchResult.transactions
  );
  recentTransactions.value = formattedTxns.slice(0, 5);
  searchedTransactions.value = formattedTxns;
};
let loadRecentTransferTransactions = async () => {
  let txnQueryParams = Helper.createTransactionQueryParams();
  txnQueryParams.pageSize = 20;
  txnQueryParams.type = TransactionFilterTypes.getTransferTypes();
  txnQueryParams.publicKey = selectedAccount.value.publicKey;
  txnQueryParams.embedded = true;
  txnQueryParams.updateFieldOrder(blockDescOrderSortingField);
  let transactionSearchResult = await dashboardService.searchTxns(
    transactionGroupType.CONFIRMED,
    txnQueryParams
  );
  if (transactionSearchResult.transactions.length) {
    let formattedTxns = await dashboardService.formatConfirmedMixedTxns(
      transactionSearchResult.transactions
    );
    recentTransferTransactions.value = formattedTxns;
    recentTransferTxnRow.value = formatRecentTransfer(formattedTxns).slice(
      0,
      3
    );
  }
};



const recentTransferTxnRow = ref([]);

const formatRecentTransfer = (transactions) => {
  let transferTxn = [];
  let nativeTokenTxns = transactions.filter((txn) => txn.amountTransfer > 0);
  for (const txn of nativeTokenTxns) {
    let formattedTransferTxn: LooseObject = {};
    if (
      selectedAccountAddressPlain.value == txn.sender &&
      selectedAccountAddressPlain.value == txn.recipient
    ) {
      continue;
    } else if (selectedAccountAddressPlain.value == txn.sender) {
      formattedTransferTxn.transferContact =
        walletState.currentLoggedInWallet.convertAddressToNamePretty(
          txn.recipient,
          true
        );
      formattedTransferTxn.transferContactAddress = txn.recipient;
      formattedTransferTxn.amount =
        "-" +
        Helper.toCurrencyFormat(
          txn.amountTransfer,
          AppState.nativeToken.divisibility
        );
    } else {
      formattedTransferTxn.transferContact = walletState.currentLoggedInWallet
        .convertAddressToNamePretty(txn.sender, true)
        .substring(0, 30);
      formattedTransferTxn.transferContactAddress = txn.sender;
      formattedTransferTxn.amount = Helper.toCurrencyFormat(
        txn.amountTransfer,
        AppState.nativeToken.divisibility
      );
    }

    if (formattedTransferTxn.transferContact.length > 20) {
      formattedTransferTxn.transferContact =
        formattedTransferTxn.transferContact.substring(0, 17) + "...";
    }
    formattedTransferTxn.hash = txn.hash;
    transferTxn.push(formattedTransferTxn);
  }
  return transferTxn;
};

emitter.on("CLOSE_MODAL", () => {
  showAddressQRModal.value = false;
  showMessageModal.value = false;
  showCosignModal.value = false;
  showDecryptMessageModal.value = false;
});

emitter.on("DEFAULT_ACCOUNT_SWITCHED", async (payload) => {
  // currentAccount = walletState.currentLoggedInWallet.selectDefaultAccount();
  // currentAccount.default = true;
  // selectedAccount.value = currentAccount;
  // recentTransferTxn();
  updateAccountTransactionCount();
  loadRecentTransactions();
  // loadRecentTransferTransactions();
  await loadUnconfirmedTransactions();
  await loadPartialTransactions();
  loadInQueueTransactions();
});

const unconfirmedTxns = ref([]);
const partialTxns = ref([]);
const inQueueTxns = ref([]);
const pendingTransactions = computed(() => {
  return unconfirmedTxns.value
    .concat(inQueueTxns.value)
    .concat(partialTxns.value);
});
let loadUnconfirmedTransactions = async () => {
  if (!selectedAccount.value) {
    return;
  }
  let txnQueryParams = Helper.createTransactionQueryParams();
  txnQueryParams.pageSize = 1;
  txnQueryParams.address = selectedAccountAddressPlain.value;
  txnQueryParams.embedded = true;
  txnQueryParams.updateFieldOrder(blockDescOrderSortingField);
  let transactionSearchResult = await dashboardService.searchTxns(
    transactionGroupType.UNCONFIRMED,
    txnQueryParams
  );
  let formattedTxns = await dashboardService.formatUnconfirmedMixedTxns(
    transactionSearchResult.transactions
  );
  //groupType = 'unconfirmed'
  unconfirmedTxns.value = formattedTxns;
};

let loadPartialTransactions = async () => {
  if (!selectedAccount.value) {
    return;
  }
  let dashboardService = new DashboardService(
    walletState.currentLoggedInWallet,
    selectedAccount.value
  );
  let txnQueryParams = Helper.createTransactionQueryParams();
  txnQueryParams.pageSize = 100;
  txnQueryParams.address = selectedAccountAddressPlain.value;
  let transactionSearchResult = await dashboardService.searchTxns(
    transactionGroupType.PARTIAL,
    txnQueryParams
  );
  let formattedTxns = await dashboardService.formatPartialMixedTxns(
    transactionSearchResult.transactions
  );
  //groupType = 'partial'
  partialTxns.value = formattedTxns;
};

let loadInQueueTransactions = () => {
  if (!selectedAccount.value) {
    return;
  }
  let txns = [];
  listenerState.autoAnnounceSignedTransaction.forEach((tx) => {
    let txn = TransactionMapping.createFromPayload(
      tx.signedTransaction.payload
    );
    let aggregateTxn = TransactionUtils.castToAggregate(txn);
    if (
      aggregateTxn.innerTransactions.find(
        (tx) => tx.signer.address.plain() == selectedAccount.value.address
      ) != undefined ||
      tx.signedTransaction.signer == selectedAccount.value.publicKey
    ) {
      txns.push({
        type: "Aggregate Bonded",
        hash: tx.signedTransaction.hash,
        deadline: txn.deadline.value,
        groupType: "In Queue",
        recipient: "",
        sender: "",
        amount: "",
        message: "",
        sda: "",
      });
    }
  });
  inQueueTxns.value = txns;
};
const init = async () => {
  updateAccountTransactionCount();
  loadRecentTransactions();
  // loadRecentTransferTransactions();
  await loadUnconfirmedTransactions();
  await loadPartialTransactions();
  loadInQueueTransactions();
};
if (AppState.isReady) {
  init();
} else {
  let readyWatcher = watch(AppState, (value) => {
    if (value.isReady) {
      init();
      readyWatcher();
    }
  });
}

const linkToExplorer = () => {
  if (!networkState.currentNetworkProfile) {
    return "";
  }
  return (
    networkState.currentNetworkProfile.chainExplorer.url +
    "/" +
    networkState.currentNetworkProfile.chainExplorer.addressRoute +
    "/" +
    selectedAccount.value.address
  );
};

// === CLOB DEX Pending Settlement & Signature Status (Home Screen) ===
const getClobApiBase = () => {
  if (typeof window === "undefined") return "";
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://${hostname}:8088`;
  }
  return "https://sirius-clob-backend.onrender.com";
};
const CLOB_API_BASE = getClobApiBase();

interface ClobSettlementSummary {
  settlementId: string;
  orderId: string;
  myOrderId: string;
  role: string;
  pair: string;
  quoteSymbol: string;
  mySide: string;
  myPrice: string;
  myAmount: string;
  status: string;
  txHash?: string | null;
  requiredCount: number;
  signedCount: number;
  signedByMe: boolean;
  needsMySignature: boolean;
  waitingForCounterparty: boolean;
  allPartiesSigned: boolean;
  createdAt: number;
  updatedAt: number;
  accountName?: string;
}

const clobRecentSettlements = ref<ClobSettlementSummary[]>([]);
let clobPollTimer: ReturnType<typeof setInterval> | null = null;

const clobSettlementsNeedingMySignature = computed(() =>
  clobRecentSettlements.value.filter((s) => s.needsMySignature && s.status === "pending_cosign")
);

const clobCounterpartyStatusItems = computed(() => {
  const cutoff = Date.now() - 10 * 60 * 1000; // show recently completed 2/2 signatures for 10 min on Home screen
  return clobRecentSettlements.value.filter(
    (s) =>
      s.waitingForCounterparty ||
      (s.allPartiesSigned &&
        (s.status === "ready" || s.status === "broadcast" || (s.status === "confirmed" && (s.updatedAt || 0) >= cutoff)))
  );
});

const clobHasOnlyWaitingCounterparty = computed(
  () =>
    clobCounterpartyStatusItems.value.length > 0 &&
    clobCounterpartyStatusItems.value.every((s) => !s.allPartiesSigned)
);

const fetchHomeClobSettlements = async () => {
  const wallet = walletState.currentLoggedInWallet;
  if (!wallet) {
    clobRecentSettlements.value = [];
    return;
  }
  const accs = Array.isArray(wallet.accounts) ? wallet.accounts : [];
  const pubKeysToCheck: Array<{ publicKey: string; name: string }> = [];
  const seen = new Set<string>();
  if (selectedAccount.value?.publicKey) {
    const pk = String(selectedAccount.value.publicKey).toLowerCase();
    seen.add(pk);
    pubKeysToCheck.push({ publicKey: selectedAccount.value.publicKey, name: selectedAccount.value.name || "Account" });
  }
  for (const a of accs) {
    const pk = String(a?.publicKey || "").toLowerCase();
    if (pk && !seen.has(pk)) {
      seen.add(pk);
      pubKeysToCheck.push({ publicKey: a.publicKey, name: a.name || "Account" });
    }
  }
  if (pubKeysToCheck.length === 0) return;

  try {
    const allItems: ClobSettlementSummary[] = [];
    const seenIds = new Set<string>();
    const results = await Promise.allSettled(
      pubKeysToCheck.map(async (entry) => {
        const res = await fetch(
          `${CLOB_API_BASE}/api/clob/trading-account/pending-settlements?ownerPublicKey=${entry.publicKey}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        if (!data || !data.ok) return [];
        const list: ClobSettlementSummary[] = Array.isArray(data.recentSettlements)
          ? data.recentSettlements
          : Array.isArray(data.settlements)
          ? data.settlements
              .map((s: any) => s.signatureSummary)
              .filter(Boolean)
          : [];
        return list.map((item) => ({ ...item, accountName: entry.name }));
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        for (const item of r.value) {
          if (item && item.settlementId && !seenIds.has(item.settlementId)) {
            seenIds.add(item.settlementId);
            allItems.push(item);
          }
        }
      }
    }
    allItems.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    clobRecentSettlements.value = allItems;
  } catch (_) {}
};

const goToSignClobOrder = (item: ClobSettlementSummary) => {
  router.push({
    name: "ViewServicesClobExchange",
    query: {
      action: "signSettlement",
      pair: item.pair || "XPX/USDT",
      settlementId: item.settlementId,
    },
  });
};

onMounted(() => {
  fetchHomeClobSettlements();
  clobPollTimer = setInterval(fetchHomeClobSettlements, 8000);
});

onUnmounted(() => {
  if (clobPollTimer) {
    clearInterval(clobPollTimer);
    clobPollTimer = null;
  }
});

watch(
  () => selectedAccount.value?.publicKey,
  () => {
    fetchHomeClobSettlements();
  }
);
</script>
<style lang="scss" scoped>
.address_div {
  top: 4px;
}
.p-dialog .p-dialog-header {
  padding: 1rem 1.25rem;
}
.p-dialog .p-dialog-header .p-dialog-title {
  font-size: 1rem;
}
#address {
  @extend .text-xs !optional;
}
.default-div {
  @apply text-gray-100;
  background: #33344a;
  background-position: right top;
  background-repeat: no-repeat;
  background-size: 250px;
  height: 184px;
}
.balance-div {
  height: 184px;
}
.transaction-div {
  height: 184px;
}
@media (min-width: 640px) {
  .address_div {
    top: 0px;
  }
}
@media (min-width: 1280px) {
  .address_div {
    top: 4px;
  }
  #address {
    @extend .text-sm !optional;
  }
}
.dashboard-link {
  position: relative;
  top: -4px;
}
</style>
