import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import KioskView from '../views/KioskView.vue';
import LoginView from '../views/LoginView.vue';
import AdminLayout from '../views/admin/AdminLayout.vue';
import ProductsView from '../views/admin/ProductsView.vue';
import UnitsView from '../views/admin/UnitsView.vue';
import CategoriesView from '../views/admin/CategoriesView.vue';
import SuppliersView from '../views/admin/SuppliersView.vue';
import PurchasesView from '../views/admin/PurchasesView.vue';
import StockMovementsView from '../views/admin/StockMovementsView.vue';
import SalesView from '../views/admin/SalesView.vue';
import DashboardView from '../views/admin/DashboardView.vue';
import LocationsView from '../views/admin/LocationsView.vue';
import NfceView from '../views/admin/NfceView.vue';
import SettingsView from '../views/admin/SettingsView.vue';
import ExpiringProductsView from '../views/admin/ExpiringProductsView.vue';
import FiscalView from '../views/admin/FiscalView.vue';
import UsersView from '../views/admin/UsersView.vue';
import { useAuthStore } from '../stores/auth';
import { PermissionKey } from '../constants/permissions';

const adminChildren: RouteRecordRaw[] = [
  { path: 'dashboard', component: DashboardView, meta: { permission: 'DASHBOARD' as PermissionKey } },
  { path: 'products', component: ProductsView, meta: { permission: 'PRODUCTS' as PermissionKey } },
  { path: 'units', component: UnitsView, meta: { permission: 'UNITS' as PermissionKey } },
  { path: 'categories', component: CategoriesView, meta: { permission: 'CATEGORIES' as PermissionKey } },
  { path: 'suppliers', component: SuppliersView, meta: { permission: 'SUPPLIERS' as PermissionKey } },
  { path: 'purchases', component: PurchasesView, meta: { permission: 'PURCHASES' as PermissionKey } },
  { path: 'stock-movements', component: StockMovementsView, meta: { permission: 'STOCK_MOVEMENTS' as PermissionKey } },
  { path: 'sales', component: SalesView, meta: { permission: 'SALES' as PermissionKey } },
  { path: 'locations', component: LocationsView, meta: { permission: 'LOCATIONS' as PermissionKey } },
  { path: 'settings', component: SettingsView, meta: { permission: 'SETTINGS' as PermissionKey } },
  { path: 'nfce', component: NfceView, meta: { permission: 'NFC_E' as PermissionKey } },
  { path: 'expiring-products', component: ExpiringProductsView, meta: { permission: 'EXPIRING_PRODUCTS' as PermissionKey } },
  { path: 'fiscal', component: FiscalView, meta: { permission: 'FISCAL' as PermissionKey } },
  { path: 'users', component: UsersView, meta: { requiresAdmin: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/kiosk', component: KioskView },
    { path: '/admin/login', component: LoginView },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: adminChildren
    },
    { path: '/:pathMatch(.*)*', redirect: '/kiosk' }
  ]
});

function findFirstAllowedAdminRoute(auth: ReturnType<typeof useAuthStore>) {
  for (const route of adminChildren) {
    const requiresAdmin = route.meta?.requiresAdmin;
    const permission = route.meta?.permission as PermissionKey | undefined;
    if (requiresAdmin && auth.user?.role !== 'ADMIN') continue;
    if (permission && !auth.hasPermission(permission)) continue;
    return `/admin/${route.path}`;
  }
  return '/admin/login';
}

router.beforeEach((to) => {
  const auth = useAuthStore();
  const requiresAuth = to.meta.requiresAuth;
  if (requiresAuth && (!auth.token || !auth.user)) {
    auth.logout();
    return '/admin/login';
  }

  const requiresAdmin = to.meta.requiresAdmin;
  if (requiresAdmin && auth.user?.role !== 'ADMIN') {
    const fallback = findFirstAllowedAdminRoute(auth);
    if (to.fullPath !== fallback) return fallback;
  }

  const permission = to.meta.permission as PermissionKey | undefined;
  if (permission && !auth.hasPermission(permission)) {
    const fallback = findFirstAllowedAdminRoute(auth);
    if (to.fullPath !== fallback) return fallback;
  }
});

export default router;
