<template>
  <AppLayout>
    <div class="dashboard">
      <!-- Top Stats Row -->
      <div class="stats-grid">
        <GlassCard>
          <div class="stat-content">
            <div class="stat-info">
              <span class="stat-label">Fuzzers Activos</span>
              <span class="stat-value">{{ fuzzerStore.fuzzers.length }}</span>
            </div>
            <div class="stat-icon-wrapper success">
              <ShieldCheck class="stat-icon" />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div class="stat-content">
            <div class="stat-info">
              <span class="stat-label">Operaciones Probadas</span>
              <span class="stat-value">{{ fuzzerStore.stats.totalOperations }}</span>
            </div>
            <div class="stat-icon-wrapper info">
              <Activity class="stat-icon" />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div class="stat-content">
            <div class="stat-info">
              <span class="stat-label">Vulnerabilidades Detectadas</span>
              <span class="stat-value danger-text">{{ fuzzerStore.stats.totalVulnerabilities }}</span>
            </div>
            <div class="stat-icon-wrapper danger">
              <AlertTriangle class="stat-icon" />
            </div>
          </div>
        </GlassCard>
      </div>

      <!-- Main Chart Area -->
      <div class="main-chart-row">
        <GlassCard title="Actividad de Fuzzing (Tiempo Real)">
          <div class="chart-container">
            <v-chart class="chart" :option="chartOption" autoresize />
          </div>
        </GlassCard>
      </div>

      <!-- Fuzzers List -->
      <div class="fuzzers-list-row">
        <GlassCard title="Instancias de Fuzzers (Redis)">
          <div v-if="fuzzerStore.loading" class="loading-state">
            Cargando instancias...
          </div>
          <div v-else-if="fuzzerStore.fuzzers.length === 0" class="empty-state">
            No se encontraron fuzzers en la base de datos Redis.
          </div>
          <div v-else class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fuzzer ID</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="fuzzer in fuzzerStore.fuzzers" :key="fuzzer.id">
                  <td class="font-mono">{{ fuzzer.id }}</td>
                  <td>
                    <span class="badge success">Activo</span>
                  </td>
                  <td>
                    <button class="btn-action">Ver Detalles</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ShieldCheck, Activity, AlertTriangle } from 'lucide-vue-next'
import AppLayout from '../components/layout/AppLayout.vue'
import GlassCard from '../components/ui/GlassCard.vue'
import { useFuzzerStore } from '../store/fuzzerStore'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

const fuzzerStore = useFuzzerStore()

onMounted(() => {
  fuzzerStore.fetchFuzzers()
})

// ECharts configuration
const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(28, 28, 40, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textStyle: { color: '#f0f0f5' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30'],
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
    axisLabel: { color: '#a0a0b0' }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
    axisLabel: { color: '#a0a0b0' }
  },
  series: [
    {
      name: 'Peticiones/seg',
      type: 'line',
      smooth: true,
      lineStyle: {
        width: 3,
        color: '#60a5fa'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(96, 165, 250, 0.5)' },
            { offset: 1, color: 'rgba(96, 165, 250, 0.01)' }
          ]
        }
      },
      data: [120, 132, 101, 134, 90, 230, 210]
    },
    {
      name: 'Vulnerabilidades',
      type: 'line',
      smooth: true,
      lineStyle: {
        width: 3,
        color: '#f87171'
      },
      data: [0, 2, 1, 0, 5, 1, 0]
    }
  ]
}))
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  font-family: var(--font-heading);
  color: var(--text-primary);
  line-height: 1;
}

.danger-text {
  color: var(--accent-danger);
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper.success {
  background: var(--accent-primary-glow);
  color: var(--accent-primary);
}

.stat-icon-wrapper.info {
  background: rgba(96, 165, 250, 0.2);
  color: var(--accent-secondary);
}

.stat-icon-wrapper.danger {
  background: rgba(248, 113, 113, 0.2);
  color: var(--accent-danger);
}

.main-chart-row {
  height: 400px;
}

.chart-container {
  flex: 1;
  min-height: 300px;
}

.chart {
  height: 100%;
  width: 100%;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.data-table th {
  text-align: left;
  padding: 16px;
  color: var(--text-secondary);
  font-weight: 500;
  border-bottom: 1px solid var(--border-color);
}

.data-table td {
  padding: 16px;
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-primary);
}

.font-mono {
  font-family: monospace;
  font-size: 13px;
  color: var(--accent-secondary);
}

.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge.success {
  background: var(--accent-primary-glow);
  color: var(--accent-primary);
}

.btn-action {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-action:hover {
  background: rgba(255, 255, 255, 0.1);
}

.loading-state, .empty-state {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}
</style>
