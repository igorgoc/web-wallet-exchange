import { RouteRecordRaw } from 'vue-router';

export const ClobRoutes: RouteRecordRaw[] = [
  {
    path: '/clob-exchange',
    name: 'ViewServicesClobExchange',
    component: () => import('@/modules/services/submodule/clob/views/ViewClobExchange.vue'),
    meta: {
      title: 'SiriusCLOB DEX',
    },
  },
];
