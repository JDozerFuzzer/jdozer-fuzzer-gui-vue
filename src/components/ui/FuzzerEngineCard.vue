<template>
  <GlassCard>
    <template #header>
      <div class="engine-card-header">
        <div class="header-title-row">
          <span class="kpi-label">Configuración del Ataque</span>
          <span v-if="normalizedConfig" class="phases-summary-badge">
            {{ phasesList.length }} {{ phasesList.length === 1 ? 'Fase' : 'Fases' }}
          </span>
        </div>

        <!-- Fases como cabecera -->
        <div v-if="normalizedConfig && phasesList.length > 0" class="header-phases-row">
          <div v-for="(phase, idx) in phasesList" :key="'phase-' + idx" class="phase-pill"
            :title="getPhaseTooltip(phase)">
            <span class="phase-name">{{ phase.name || `Fase ${idx + 1}` }}</span>
            <span class="phase-duration">{{ phase.duration }}s</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Card Body: Escenarios Activos -->
    <div class="kpi-content cases-card">
      <div v-if="!normalizedConfig" class="kpi-value highlight" style="font-size: 18px; padding: 20px 0;">
        Esperando motor...
      </div>
      <div v-else class="engine-scenarios-container">
        <div class="scenarios-header">
          <span class="config-title">Escenarios Activos ({{ scenariosList.length }})</span>
        </div>

        <div v-if="scenariosList.length === 0" class="no-scenarios">
          No hay escenarios activos en este momento.
        </div>
        <div v-else class="scenarios-list">
          <div v-for="(scen, idx) in scenariosList" :key="'scen-' + idx" class="config-item">
            <span class="config-name" :title="scen.name">{{ scen.name }}</span>
            <span class="config-badge">{{ formatWeight(scen.weight) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </GlassCard>
</template>

<script setup>
import { computed } from 'vue'
import GlassCard from './GlassCard.vue'

const props = defineProps({
  config: {
    type: Object,
    default: null
  },
  engineConfig: {
    type: Object,
    default: null
  }
})

const normalizedConfig = computed(() => {
  const raw = props.config || props.engineConfig
  if (!raw) return null
  if (raw.payload) return raw.payload
  return raw
})

const phasesList = computed(() => {
  const phases = normalizedConfig.value?.phases
  if (!phases) return []
  if (Array.isArray(phases)) return phases
  return Object.entries(phases).map(([name, data]) => ({
    name,
    duration: data?.duration ?? 0,
    ...data
  }))
})

// Filtrar únicamente los escenarios con peso (weight) mayor a 0
const scenariosList = computed(() => {
  const scenarios = normalizedConfig.value?.scenarios
  if (!scenarios) return []
  const list = Array.isArray(scenarios)
    ? scenarios
    : Object.entries(scenarios).map(([name, data]) => ({
        name,
        weight: typeof data === 'object' ? data?.weight : data
      }))

  return list
    .map(s => ({
      name: s.name || s.scenario,
      weight: Number(s.weight) || 0
    }))
    .filter(s => s.weight > 0)
})

const formatWeight = (weight) => {
  if (weight === undefined || weight === null) return '0'
  const num = Number(weight)
  if (isNaN(num)) return weight
  return Number(num.toFixed(1))
}

const getPhaseTooltip = (phase) => {
  const parts = [`Duración: ${phase.duration}s`]
  if (phase.arrivalRate !== undefined) parts.push(`Arrival Rate: ${phase.arrivalRate}/s`)
  if (phase.maxUsers !== undefined) parts.push(`Max Users: ${phase.maxUsers}`)
  return parts.join(' | ')
}
</script>

<style scoped>
.engine-card-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-label {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.phases-summary-badge {
  font-size: 11px;
  color: var(--accent-secondary);
  background: rgba(96, 165, 250, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.25);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.header-phases-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.phase-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.phase-name {
  color: var(--text-primary);
  font-weight: 500;
}

.phase-duration {
  color: #60a5fa;
  font-weight: 700;
  font-size: 11px;
  background: rgba(96, 165, 250, 0.15);
  padding: 1px 5px;
  border-radius: 4px;
}

.kpi-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cases-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.kpi-value {
  color: var(--text-primary);
  font-size: 36px;
  font-weight: 700;
  font-family: var(--font-heading);
  text-align: center;
}

.kpi-value.highlight {
  color: var(--accent-secondary);
}

.engine-scenarios-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.scenarios-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
}

.scenarios-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  max-height: 220px;
  padding-right: 4px;
}

.scenarios-list::-webkit-scrollbar {
  width: 4px;
}

.scenarios-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.scenarios-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 6px 10px;
  border-radius: 6px;
  transition: background var(--transition-fast);
}

.config-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.config-name {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.config-badge {
  font-size: 11px;
  background: rgba(74, 222, 128, 0.12);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.25);
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 700;
  font-family: monospace;
}

.no-scenarios {
  padding: 16px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  border: 1px dashed var(--border-color);
}
</style>
