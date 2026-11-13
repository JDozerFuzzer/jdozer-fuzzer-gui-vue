<template>
  <div class="fuzz-status-code-drift">
    <!-- Loading State -->
    <div v-if="loading" class="fuzz-loading">
      <RefreshCw class="spinning icon-md text-accent" />
      <span>Consultando oráculo de Desviación de Código de Estado (Status Code Drift)...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="!driftData || (!driftData.finding && !driftData.matchType)" class="fuzz-empty">
      <AlertCircle class="icon-md text-muted" />
      <span>No se encontraron registros de Status Code Drift para este caso.</span>
    </div>

    <!-- Detail Content -->
    <div v-else class="drift-content">
      <!-- Top Banner / Hero -->
      <div class="drift-hero-card" :class="heroClass">
        <div class="hero-header">
          <div class="hero-status-group">
            <span class="hero-label">Código HTTP Recibido:</span>
            <span :class="['status-badge-lg', getStatusClass(resolvedStatusCode)]">
              {{ resolvedStatusCode }}
            </span>
          </div>

          <div class="hero-match-group">
            <span :class="['match-pill-lg', matchInfo.badgeClass]">
              {{ matchInfo.label }}
            </span>
            <span v-if="resolvedFinding?.severity"
              :class="['severity-pill', parseSeverity(resolvedFinding.severity).cssClass]">
              Severidad {{ parseSeverity(resolvedFinding.severity).label }}
            </span>
          </div>
        </div>

        <p class="hero-description">
          {{ matchInfo.description }}
        </p>

        <!-- Drift Diagnostics Badges -->
        <div class="hero-tags-row" v-if="resolvedFinding?.tags && resolvedFinding.tags.length > 0">
          <span class="tags-prefix">Etiquetas:</span>
          <div class="tags-list">
            <span v-for="tag in resolvedFinding.tags" :key="tag" class="tag-pill">
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Contract Validation Mapping -->
      <div class="drift-section-card">
        <div class="section-card-title">
          <FileCode2 class="icon-sm text-secondary" />
          <span>Contrato OpenAPI vs Respuesta Observada</span>
        </div>

        <div class="mapping-grid">
          <div class="map-item">
            <span class="map-label">Tipo de Coincidencia (Match Type)</span>
            <span class="map-value font-mono font-bold">{{ resolvedFinding?.matchType || 'N/A' }}</span>
            <span class="map-sub">{{ matchInfo.subLabel }}</span>
          </div>

          <div class="map-item">
            <span class="map-label">Código Matched en Contrato</span>
            <span class="map-value font-mono">
              {{ resolvedFinding?.matchedStatusCode !== undefined ? (resolvedFinding.matchedStatusCode === 0 ? 'default' : resolvedFinding.matchedStatusCode) : 'Ninguno' }}
            </span>
            <span class="map-sub">
              {{ resolvedFinding?.matchedStatusCode ? 'Declarado en especificación' : 'No contemplado en respuestas' }}
            </span>
          </div>

          <div class="map-item full-width" v-if="resolvedFinding?.matchedSchemaPath">
            <span class="map-label">Ruta en Contrato (JSON Pointer)</span>
            <div class="schema-path-box">
              <code class="schema-path">{{ resolvedFinding.matchedSchemaPath }}</code>
              <button class="btn-copy-mini" @click="handleCopy(resolvedFinding.matchedSchemaPath)" title="Copiar JSON Pointer">
                <Copy class="icon-xs" />
                <span v-if="copied">¡Copiado!</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Oracle Explanation -->
      <div v-if="resolvedFinding?.description" class="drift-section-card">
        <div class="section-card-title">
          <Info class="icon-sm text-accent" />
          <span>Explicación del Hallazgo del Oráculo</span>
        </div>
        <div class="desc-box">
          <p class="desc-text">{{ resolvedFinding.description }}</p>
        </div>
      </div>

      <!-- Recommendation Box -->
      <div v-if="hasRecommendations" class="drift-recommendation-card">
        <div class="rec-header">
          <Lightbulb class="icon-sm text-warning" />
          <span class="rec-title">Acciones Correctivas y Recomendaciones:</span>
        </div>

        <div class="rec-body">
          <template v-if="Array.isArray(resolvedFinding.recommendation)">
            <ul class="rec-list">
              <li v-for="(rec, idx) in resolvedFinding.recommendation" :key="idx" class="rec-item">
                <ChevronRight class="icon-xs text-accent" />
                <span>{{ rec }}</span>
              </li>
            </ul>
          </template>
          <p v-else class="rec-single">
            {{ resolvedFinding.recommendation }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  FileCode2,
  Info,
  Lightbulb,
  Copy,
  ChevronRight,
  RefreshCw,
  AlertCircle
} from 'lucide-vue-next'
import {
  getStatusClass,
  parseSeverity,
  getMatchTypeInfo,
  copyToClipboard
} from './fuzzUtils'

const props = defineProps({
  driftData: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const copied = ref(false)

const resolvedStatusCode = computed(() => {
  return props.driftData?.statusCode || props.driftData?.finding?.statusCode || '---'
})

const resolvedFinding = computed(() => {
  if (props.driftData?.finding) return props.driftData.finding
  // Backward compatibility: flat driftData
  if (props.driftData?.matchType) return props.driftData
  return null
})

const matchInfo = computed(() => {
  const matchType = resolvedFinding.value?.matchType || 'none'
  return getMatchTypeInfo(matchType)
})

const heroClass = computed(() => {
  const mt = resolvedFinding.value?.matchType
  if (mt === 'exact') return 'hero-exact'
  if (mt === '2xx') return 'hero-wildcard'
  if (mt === 'default') return 'hero-default'
  return 'hero-none'
})

const hasRecommendations = computed(() => {
  const rec = resolvedFinding.value?.recommendation
  if (!rec) return false
  if (Array.isArray(rec)) return rec.length > 0
  return typeof rec === 'string' && rec.trim().length > 0
})

const handleCopy = async (text) => {
  if (!text) return
  const ok = await copyToClipboard(text)
  if (ok) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<style scoped>
.fuzz-status-code-drift {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fuzz-loading,
.fuzz-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 14px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.drift-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Hero card */
.drift-hero-card {
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.3);
}

.drift-hero-card.hero-none {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.12), rgba(0, 0, 0, 0.35));
  border-color: rgba(248, 113, 113, 0.35);
}

.drift-hero-card.hero-default {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(0, 0, 0, 0.35));
  border-color: rgba(251, 191, 36, 0.35);
}

.drift-hero-card.hero-wildcard {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(0, 0, 0, 0.35));
  border-color: rgba(96, 165, 250, 0.35);
}

.drift-hero-card.hero-exact {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(0, 0, 0, 0.35));
  border-color: rgba(74, 222, 128, 0.35);
}

.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-status-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.status-badge-lg {
  font-size: 18px;
  font-weight: 800;
  font-family: monospace;
  padding: 4px 12px;
  border-radius: 8px;
}

.status-2xx { background: rgba(74, 222, 128, 0.25); color: #4ade80; }
.status-3xx { background: rgba(96, 165, 250, 0.25); color: #60a5fa; }
.status-4xx { background: rgba(251, 191, 36, 0.25); color: #fbbf24; }
.status-5xx { background: rgba(248, 113, 113, 0.25); color: #f87171; }
.status-other { background: rgba(148, 163, 184, 0.25); color: #94a3b8; }

.hero-match-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.match-pill-lg {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  text-transform: uppercase;
}

.hero-description {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

.hero-tags-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tags-prefix {
  font-size: 11px;
  color: var(--text-muted);
}

.tags-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-pill {
  font-size: 11px;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.4);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Drift section card */
.drift-section-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.mapping-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.mapping-grid .full-width {
  grid-column: 1 / -1;
}

.map-item {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.map-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
}

.map-value {
  font-size: 14px;
  color: var(--text-primary);
}

.map-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

.schema-path-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 12px;
  border-radius: 4px;
  margin-top: 4px;
  gap: 8px;
}

.schema-path {
  font-size: 12px;
  color: var(--accent-secondary);
  word-break: break-all;
}

.btn-copy-mini {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.btn-copy-mini:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
}

.desc-box {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
}

.desc-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

/* Recommendation card */
.drift-recommendation-card {
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rec-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rec-title {
  font-size: 13px;
  font-weight: 700;
  color: #fbbf24;
}

.rec-body {
  font-size: 13px;
  color: var(--text-primary);
}

.rec-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rec-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.45;
}

.rec-single {
  margin: 0;
  line-height: 1.5;
}

/* Pills */
.severity-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 12px;
  text-transform: uppercase;
}

.sev-critical { background: rgba(248, 113, 113, 0.25); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); }
.sev-high { background: rgba(251, 146, 60, 0.25); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.4); }
.sev-medium { background: rgba(251, 191, 36, 0.25); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); }
.sev-low { background: rgba(96, 165, 250, 0.25); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.4); }
.sev-info { background: rgba(148, 163, 184, 0.2); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }

.badge-exact { background: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.4); }
.badge-wildcard { background: rgba(96, 165, 250, 0.2); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.4); }
.badge-default { background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); }
.badge-none { background: rgba(248, 113, 113, 0.2); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); }
</style>

