<template>
  <GlassCard>
    <template #header>
      <div class="attack-surface-header">
        <div class="header-left-group">
          <Crosshair class="header-icon" />
          <span class="kpi-label">Superficie de Ataque</span>
        </div>
        <span v-if="normalizedSurfaces.length > 0" class="surfaces-count-badge">
          {{ normalizedSurfaces.length }} {{ normalizedSurfaces.length === 1 ? 'Punto' : 'Puntos' }}
        </span>
      </div>
    </template>

    <div class="card-body-content">
      <div v-if="normalizedSurfaces.length === 0" class="empty-state">
        <span>Esperando datos de la superficie de ataque...</span>
      </div>

      <div v-else class="surfaces-list">
        <div v-for="(item, idx) in normalizedSurfaces" :key="idx" class="surface-item-card">
          <div class="surface-endpoint">
            <span class="method-badge" :class="`method-${(item.method || 'GET').toLowerCase()}`">
              {{ (item.method || 'GET').toUpperCase() }}
            </span>
            <span class="endpoint-path font-mono" :title="item.path">{{ item.path }}</span>
          </div>

          <div v-if="item.surface && item.surface.length > 0" class="surface-tags">
            <span v-for="(sTag, sIdx) in item.surface" :key="sIdx"
              :class="['surface-pill', getSurfacePillClass(sTag)]">
              {{ sTag }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </GlassCard>
</template>

<script setup>
import { computed } from 'vue'
import GlassCard from './GlassCard.vue'
import { Crosshair } from 'lucide-vue-next'

const props = defineProps({
  data: {
    type: Object,
    default: null
  },
  attackSurface: {
    type: Object,
    default: null
  },
  surfaces: {
    type: Array,
    default: null
  }
})

const normalizedSurfaces = computed(() => {
  if (Array.isArray(props.surfaces)) return props.surfaces

  const raw = props.data || props.attackSurface
  if (!raw) return []

  const payload = raw.payload || raw
  if (Array.isArray(payload.surfaces)) return payload.surfaces
  if (Array.isArray(payload)) return payload

  return []
})

const getSurfacePillClass = (surfaceName) => {
  const name = (surfaceName || '').toLowerCase()
  if (name.includes('payload') || name.includes('body')) return 'surface-pill-payload'
  if (name.includes('query')) return 'surface-pill-query'
  if (name.includes('header')) return 'surface-pill-headers'
  if (name.includes('path')) return 'surface-pill-path'
  return 'surface-pill-default'
}
</script>

<style scoped>
.attack-surface-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-left-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  width: 16px;
  height: 16px;
  color: var(--accent-secondary);
}

.kpi-label {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.surfaces-count-badge {
  font-size: 11px;
  color: #c084fc;
  background: rgba(192, 132, 252, 0.12);
  border: 1px solid rgba(192, 132, 252, 0.25);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.card-body-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.empty-state {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}

.surfaces-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 220px;
  padding-right: 4px;
}

.surfaces-list::-webkit-scrollbar {
  width: 4px;
}

.surfaces-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.surfaces-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.surface-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 6px 10px;
  border-radius: 6px;
  gap: 10px;
  transition: background var(--transition-fast);
}

.surface-item-card:hover {
  background: rgba(255, 255, 255, 0.06);
}

.surface-endpoint {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.method-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 48px;
  text-align: center;
  border: 1px solid currentColor;
}

.method-get {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.3);
}

.method-post {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
  border-color: rgba(96, 165, 250, 0.3);
}

.method-put {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}

.method-delete {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}

.method-patch {
  background: rgba(192, 132, 252, 0.15);
  color: #c084fc;
  border-color: rgba(192, 132, 252, 0.3);
}

.method-other {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border-color: rgba(148, 163, 184, 0.3);
}

.endpoint-path {
  font-size: 12px;
  font-family: monospace;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.surface-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.surface-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
  text-transform: lowercase;
}

.surface-pill-payload {
  background: rgba(236, 72, 153, 0.15);
  color: #f472b6;
  border: 1px solid rgba(236, 72, 153, 0.25);
}

.surface-pill-query {
  background: rgba(20, 184, 166, 0.15);
  color: #2dd4bf;
  border: 1px solid rgba(20, 184, 166, 0.25);
}

.surface-pill-headers {
  background: rgba(234, 179, 8, 0.15);
  color: #fde047;
  border: 1px solid rgba(234, 179, 8, 0.25);
}

.surface-pill-path {
  background: rgba(249, 115, 22, 0.15);
  color: #fdba74;
  border: 1px solid rgba(249, 115, 22, 0.25);
}

.surface-pill-default {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.font-mono {
  font-family: monospace;
}
</style>
