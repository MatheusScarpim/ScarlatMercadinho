import { createRouter, createWebHistory } from 'vue-router';
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
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/kiosk', component: KioskView },
    { path: '/admin/login', component: LoginView },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        { path: 'dashboard', component: DashboardView },
        { path: 'products', component: ProductsView },
        { path: 'units', component: UnitsView },
        { path: 'categories', component: CategoriesView },
        { path: 'suppliers', component: SuppliersView },
        { path: 'purchases', component: PurchasesView },
        { path: 'stock-movements', component: StockMovementsView },
        { path: 'sales', component: SalesView },
        { path: 'locations', component: LocationsView }
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/kiosk' }
  ]
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.token) {
    return '/admin/login';
  }
});

export default router;
