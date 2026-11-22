import { createRouter, createWebHashHistory } from 'vue-router'
import { walletState } from '@/state/walletState';
import { HomeRoutes } from '@/modules/home/routingHome';
import { DashboardRoutes } from '@/modules/dashboard/routingDashboard';
import { TransferRoutes } from '@/modules/transfer/routingTransfer';
import { WalletRoutes } from '@/modules/wallet/routingWallet';
import { AccountRoutes } from '@/modules/account/routingAccount';
import { ServiceRoutes  } from '@/modules/services/routingService';
import { TransactionRoutes  } from '@/modules/transaction/routingTransaction';
import { MetadataTransactionRoutes  } from '@/modules/metadataTxn/routingMetadataTransaction';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    ...HomeRoutes,
  ...WalletRoutes,
  ...DashboardRoutes,
  ...TransferRoutes,
  ...AccountRoutes,
  ...ServiceRoutes,
  ...TransactionRoutes,
  ...MetadataTransactionRoutes
  ]
})

router.beforeEach((to, from, next) => {
  if (to.name === 'ViewDashboard' || to.path === '/dashboard' || to.path.startsWith('/dashboard/')) {
    if (!walletState.isLogin && !walletState.currentLoggedInWallet) {
      return next({ name: 'Home' });
    }
  }
  next();
});

export default router
