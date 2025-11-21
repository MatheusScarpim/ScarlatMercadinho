<template>
  <div class="dashboard">
    <div class="header-row">
      <div>
        <p class="eyebrow">visão geral</p>
        <h2>Dashboard</h2>
      </div>
      <div class="filters glass">
        <label>Período</label>
        <select v-model="period" @change="load">
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
      </div>
    </div>

    <div class="cards">
      <div class="stat glass">
        <span>Faturamento</span>
        <strong>R$ {{ metrics.revenue.toFixed(2) }}</strong>
      </div>
      <div class="stat glass">
        <span>Vendas</span>
        <strong>{{ metrics.salesCount }}</strong>
      </div>
      <div class="stat glass">
        <span>Itens vendidos</span>
        <strong>{{ metrics.itemsSold }}</strong>
      </div>
      <div class="stat glass">
        <span>Ticket médio</span>
        <strong>R$ {{ metrics.avgTicket.toFixed(2) }}</strong>
      </div>
    </div>

    <div class="grid">
      <div class="panel glass">
        <div class="panel-header">
          <h4>Faturamento diário</h4>
        </div>
        <div class="chart">
          <Bar :data="revenueChartData" :options="chartOptions" />
        </div>
      </div>
      <div class="panel glass">
        <div class="panel-header">
          <h4>Formas de pagamento</h4>
        </div>
        <div class="chart">
          <Pie :data="paymentChartData" :options="pieOptions" />
        </div>
      </div>
    </div>

    <div class="panel glass">
      <div class="panel-header">
        <h4>Produtos mais vendidos</h4>
      </div>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Qtde</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in topProducts" :key="p.id">
            <td>{{ p.name }}</td>
            <td>{{ p.quantity }}</td>
            <td>R$ {{ p.total.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../../services/api';
import { Bar, Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

const period = ref('7');
const metrics = ref({
  revenue: 0,
  salesCount: 0,
  itemsSold: 0,
  avgTicket: 0
});
const topProducts = ref<Array<{ id: string; name: string; quantity: number; total: number }>>([]);

const revenueChartData = ref({
  labels: [] as string[],
  datasets: [
    {
      label: 'Faturamento (R$)',
      data: [] as number[],
      backgroundColor: 'rgba(16, 180, 157, 0.5)',
      borderRadius: 6
    }
  ]
});

const paymentChartData = ref({
  labels: [] as string[],
  datasets: [
    {
      data: [] as number[],
      backgroundColor: ['#0e9c87', '#10b49d', '#8bdcd0', '#42b6a2', '#d9e2ec']
    }
  ]
});

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `R$ ${ctx.raw?.toFixed ? ctx.raw.toFixed(2) : ctx.raw}`
      }
    }
  },
  scales: {
    y: {
      ticks: {
        color: '#5b6577',
        callback: (v: any) => `R$ ${v}`
      },
      grid: { color: 'rgba(0,0,0,0.05)' }
    },
    x: { ticks: { color: '#5b6577' }, grid: { display: false } }
  }
};

const pieOptions = {
  responsive: true,
  plugins: {
    legend: { position: 'bottom', labels: { color: '#5b6577' } },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.label}: R$ ${ctx.raw?.toFixed ? ctx.raw.toFixed(2) : ctx.raw}`
      }
    }
  }
};

async function load() {
  const params: Record<string, string> = {};
  const days = Number(period.value);
  const from = new Date();
  from.setDate(from.getDate() - days);
  params.from = from.toISOString();

  const { data } = await api.get('/metrics', { params });

  metrics.value = {
    revenue: data.revenue,
    salesCount: data.salesCount,
    itemsSold: data.itemsSold,
    avgTicket: data.avgTicket
  };
  topProducts.value = data.topProducts || [];
  const labels = (data.daily || []).map((d: any) => new Date(d._id).toLocaleDateString());
  const values = (data.daily || []).map((d: any) => d.total);

  revenueChartData.value = {
    ...revenueChartData.value,
    labels,
    datasets: [{ ...revenueChartData.value.datasets[0], data: values }]
  };

  const paymentLabels = (data.payments || []).map((p: any) => paymentLabel(p._id || 'OTHER'));
  const paymentValues = (data.payments || []).map((p: any) => p.total);
  paymentChartData.value = {
    ...paymentChartData.value,
    labels: paymentLabels,
    datasets: [{ ...paymentChartData.value.datasets[0], data: paymentValues }]
  };
}

onMounted(load);

function paymentLabel(pay: string) {
  const map: Record<string, string> = {
    CASH: 'Dinheiro',
    CREDIT_CARD: 'Cartão crédito',
    DEBIT_CARD: 'Cartão débito',
    PIX: 'Pix',
    OTHER: 'Outros'
  };
  return map[pay] || pay;
}
</script>

<style scoped>
.dashboard {
  display: grid;
  gap: 16px;
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.stat {
  padding: 12px;
  border-radius: 12px;
}
.stat span {
  color: var(--muted);
  font-size: 14px;
}
.stat strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
}
.grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 12px;
}
.panel {
  padding: 12px;
  border-radius: 12px;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.chart {
  min-height: 260px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 10px;
  border-bottom: 1px solid var(--table-border);
}
.eyebrow {
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--primary);
  margin: 0 0 4px 0;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
