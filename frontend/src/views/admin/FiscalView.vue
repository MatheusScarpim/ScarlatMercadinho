<template>
  <div class="fiscal-view">
    <header class="header">
      <div>
        <p class="eyebrow">Fiscal</p>
        <h3>Cenários fiscais</h3>
        <p class="muted">Preencha rapidamente para ver carga estimada de vendas e compras.</p>
      </div>
      <div class="horizon-toggle">
        <button :class="['pill', horizon === 'monthly' ? 'active' : '']" @click="horizon = 'monthly'">Mês</button>
        <button :class="['pill', horizon === 'yearly' ? 'active' : '']" @click="horizon = 'yearly'">Ano</button>
      </div>
    </header>

    <section class="card inputs">
      <div class="input-grid">
        <label>
          Faturamento ({{ horizonLabel }})
          <div class="input-prefix">
            <span>R$</span>
            <input type="number" min="0" step="0.01" v-model.number="form.sales" />
          </div>
        </label>
        <label>
          Compras ({{ horizonLabel }})
          <div class="input-prefix">
            <span>R$</span>
            <input type="number" min="0" step="0.01" v-model.number="form.purchases" />
          </div>
        </label>
        <label>
          Margem bruta (%)
          <input type="number" min="0" max="100" step="0.1" v-model.number="form.margin" />
        </label>
      </div>
      <p class="muted tiny">Use valores reais ou simulados. Cenários abaixo calculam ICMS/PIS/COFINS típicos.</p>
    </section>

    <section class="card grid">
      <div class="scenario-card" v-for="s in scenarios" :key="s.key">
        <div class="scenario-header">
          <div>
            <p class="muted tiny">{{ s.subtitle }}</p>
            <h4>{{ s.title }}</h4>
          </div>
          <span class="chip">{{ s.rateLabel }}</span>
        </div>
        <div class="metrics">
          <div class="metric">
            <span class="label">Base vendas</span>
            <strong>R$ {{ format(s.salesBase) }}</strong>
          </div>
          <div class="metric">
            <span class="label">ICMS débito</span>
            <strong>R$ {{ format(s.icmsDebit) }}</strong>
          </div>
          <div class="metric">
            <span class="label">PIS/COFINS débito</span>
            <strong>R$ {{ format(s.pisDebit + s.cofinsDebit) }}</strong>
          </div>
          <div class="metric">
            <span class="label">Compras</span>
            <strong>R$ {{ format(s.purchases) }}</strong>
          </div>
          <div class="metric">
            <span class="label">ICMS crédito (est.)</span>
            <strong>R$ {{ format(s.icmsCredit) }}</strong>
          </div>
          <div class="metric">
            <span class="label">PIS/COFINS crédito</span>
            <strong>R$ {{ format(s.pisCredit + s.cofinsCredit) }}</strong>
          </div>
          <div class="metric total">
            <span class="label">Tributos líquidos</span>
            <strong>R$ {{ format(s.netTax) }}</strong>
          </div>
          <div class="metric">
            <span class="label">Carga efetiva</span>
            <strong>{{ s.effectiveLoad.toFixed(2) }}%</strong>
          </div>
        </div>
        <div class="bar">
          <div class="bar-fill" :style="{ width: `${Math.min(s.effectiveLoad, 100)}%` }"></div>
        </div>
      </div>
    </section>

    <section class="card notes">
      <h4>Notas</h4>
      <ul>
        <li>Alíquotas padrão usadas: Simples (ICMS 3.2%, PIS 0.65%, COFINS 3%), Presumido/Real (ICMS 18%, PIS 1.65%, COFINS 7.6%).</li>
        <li>Crédito de PIS/COFINS em presumido/real assume cumulatividade básica: 0.65%/3.0% sobre compras.</li>
        <li>Crédito de ICMS calculado só se houver compras; ajuste as alíquotas conforme seu estado e segmentação.</li>
        <li>Este painel é estimativo; não substitui a escrituração fiscal nem a apuração oficial.</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

const horizon = ref<'monthly' | 'yearly'>('monthly');
const form = reactive({ sales: 0, purchases: 0, margin: 35 });

const horizonLabel = computed(() => (horizon.value === 'yearly' ? 'ano' : 'mês'));

const scenarioDefs = [
  { key: 'simples', title: 'Simples Nacional (Comércio)', subtitle: 'Faixa inicial', icms: 0.032, pis: 0.0065, cofins: 0.03 },
  { key: 'presumido', title: 'Lucro Presumido', subtitle: 'ICMS + PIS/COFINS cumulativo', icms: 0.18, pis: 0.0165, cofins: 0.076 },
  { key: 'real', title: 'Lucro Real (aprox.)', subtitle: 'Margens apertadas', icms: 0.18, pis: 0.0165, cofins: 0.076 }
];

const scenarios = computed(() => {
  const sales = Number(form.sales) || 0;
  const purchases = Number(form.purchases) || 0;
  return scenarioDefs.map((s) => {
    const salesBase = sales;
    const icmsDebit = salesBase * s.icms;
    const pisDebit = salesBase * s.pis;
    const cofinsDebit = salesBase * s.cofins;

    // Créditos: Simples não gera; presumido/real: crédito básico sobre compras
    const icmsCredit = s.key === 'simples' ? 0 : purchases * 0.12; // ajuste se necessário
    const pisCredit = s.key === 'simples' ? 0 : purchases * 0.0065;
    const cofinsCredit = s.key === 'simples' ? 0 : purchases * 0.03;

    const netTax = icmsDebit + pisDebit + cofinsDebit - (icmsCredit + pisCredit + cofinsCredit);
    const effectiveLoad = salesBase > 0 ? (netTax / salesBase) * 100 : 0;
    const rateLabel = `${(s.icms * 100).toFixed(1)}% ICMS · ${((s.pis + s.cofins) * 100).toFixed(1)}% PIS/COFINS`;

    return {
      ...s,
      salesBase,
      purchases,
      icmsDebit,
      pisDebit,
      cofinsDebit,
      icmsCredit,
      pisCredit,
      cofinsCredit,
      netTax,
      effectiveLoad,
      rateLabel
    };
  });
});

function format(value: number) {
  return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<style scoped>
.fiscal-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 11px;
  color: var(--primary);
  margin: 0 0 4px;
}
.muted {
  color: var(--muted);
}
.muted.tiny {
  font-size: 12px;
}
.card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow);
}
.inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 600;
  color: var(--text);
}
.input-prefix {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #f7f9fc;
}
.input-prefix input {
  border: none;
  flex: 1;
  background: transparent;
  outline: none;
}
.horizon-toggle {
  display: inline-flex;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px;
}
.pill {
  border: none;
  background: transparent;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
}
.pill.active {
  background: rgba(91, 231, 196, 0.15);
  color: var(--primary);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.scenario-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.01);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.chip {
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(91, 231, 196, 0.15);
  color: var(--primary);
  font-weight: 700;
  font-size: 12px;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}
.metric.total {
  grid-column: span 2;
  background: rgba(91, 231, 196, 0.1);
  border-color: rgba(91, 231, 196, 0.3);
}
.label {
  color: var(--muted);
  font-size: 12px;
}
.bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(120deg, var(--primary), var(--primary-strong));
}
.notes ul {
  margin: 0;
  padding-left: 16px;
  display: grid;
  gap: 6px;
}

@media (max-width: 900px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
  .metrics {
    grid-template-columns: 1fr;
  }
}
</style>
