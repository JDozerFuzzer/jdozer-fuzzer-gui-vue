<template>
  <div class="fuzz-test-case-summary">
    <!-- Loading state -->
    <div v-if="loading" class="fuzz-loading">
      <RefreshCw class="spinning icon-md text-accent" />
      <span>Cargando resumen del caso de prueba (TestCaseSummary v9)...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="!summary" class="fuzz-empty">
      <AlertCircle class="icon-md text-muted" />
      <span>No hay datos de resumen disponibles para este caso de prueba.</span>
    </div>

    <!-- Content -->
    <div v-else class="summary-layout">
      <!-- Top Row: Attack Surface & Interaction Result -->
      <div class="summary-top-grid">
        <!-- Attack Surface Card -->
        <div class="info-card surface-card">
          <div class="card-title-row">
            <div class="title-with-icon">
              <Globe class="icon-sm text-secondary" />
              <span class="card-title">Superficie de Ataque (Attack Surface)</span>
            </div>
            <span :class="['method-badge', (summary.attackSurface?.method || 'GET').toLowerCase()]">
              {{ summary.attackSurface?.method || 'N/A' }}
            </span>
          </div>

          <div class="surface-details">
            <div class="detail-row">
              <span class="detail-label">Operación:</span>
              <code class="op-badge">{{ summary.operationId || summary.attackSurface?.operationId || 'N/A' }}</code>
            </div>
            <div class="detail-row">
              <span class="detail-label">Ruta (Path):</span>
              <span class="font-mono text-primary">{{ summary.attackSurface?.path || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">URL Completa:</span>
              <span class="font-mono text-muted text-break" :title="summary.attackSurface?.url">
                {{ summary.attackSurface?.url || 'N/A' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Result Card -->
        <div class="info-card result-card">
          <div class="card-title-row">
            <div class="title-with-icon">
              <Activity class="icon-sm text-accent" />
              <span class="card-title">Resultado de Interacción HTTP</span>
            </div>
            <span :class="['status-pill', getStatusClass(summary.result?.statusCode)]">
              {{ summary.result?.statusCode || '---' }} {{ summary.result?.statusMessage || '' }}
            </span>
          </div>

          <div class="result-details">
            <div class="stat-metric-row">
              <div class="metric-item">
                <span class="metric-label">Latencia Total</span>
                <span class="metric-value">
                  <Clock class="icon-xs text-accent" />
                  {{ summary.result?.totalTime ?? 0 }} ms
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Timestamp</span>
                <span class="metric-value-sm" :title="formatTimestamp(summary.result?.time)">
                  {{ formatTimestamp(summary.result?.time) }}
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Caso ID</span>
                <span class="metric-value-mono" :title="summary.id">
                  {{ summary.id ? summary.id.slice(0, 8) + '...' : 'N/A' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Severity Metric Dashboard (Triage Source of Truth) -->
      <div v-if="summary.severity" class="severity-dashboard-card">
        <div class="dashboard-header">
          <div class="title-with-icon">
            <ShieldAlert class="icon-sm text-danger" />
            <div>
              <span class="dashboard-title">Métrica Agregada de Severidad (Triage Metric)</span>
              <span class="dashboard-sub">Fuente de verdad para priorización y análisis de impacto</span>
            </div>
          </div>

          <div class="header-badges">
            <div class="triage-badge max">
              <span class="triage-caption">Severidad Máxima:</span>
              <span :class="['severity-pill', parseSeverity(summary.severity.maxLevel).cssClass]">
                {{ parseSeverity(summary.severity.maxLevel).label.toUpperCase() }}
              </span>
            </div>
            <div v-if="summary.severity.averageLevel" class="triage-badge avg">
              <span class="triage-caption">Nivel Promedio:</span>
              <span :class="['severity-pill', parseSeverity(summary.severity.averageLevel).cssClass]">
                {{ parseSeverity(summary.severity.averageLevel).label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="severity-stats-grid">
          <div class="sev-stat-box">
            <span class="sev-stat-num">{{ summary.severity.count ?? 0 }}</span>
            <span class="sev-stat-desc">Observaciones</span>
          </div>
          <div class="sev-stat-box">
            <span class="sev-stat-num">{{ (summary.severity.average ?? 0).toFixed(1) }}</span>
            <span class="sev-stat-desc">Promedio (0-4)</span>
          </div>
          <div class="sev-stat-box">
            <span class="sev-stat-num">{{ summary.severity.median ?? 0 }}</span>
            <span class="sev-stat-desc">Mediana</span>
          </div>
          <div class="sev-stat-box">
            <span class="sev-stat-num">{{ summary.severity.total ?? 0 }}</span>
            <span class="sev-stat-desc">Puntos Totales</span>
          </div>
        </div>

        <!-- Distribution bar -->
        <div v-if="summary.severity.distribution" class="distribution-section">
          <span class="dist-label">Distribución de Hallazgos por Nivel:</span>
          <div class="dist-chips">
            <div class="dist-chip sev-critical" :class="{ empty: !summary.severity.distribution.critical }">
              <span class="dist-dot"></span>
              <span>Crítica: <strong>{{ summary.severity.distribution.critical ?? 0 }}</strong></span>
            </div>
            <div class="dist-chip sev-high" :class="{ empty: !summary.severity.distribution.high }">
              <span class="dist-dot"></span>
              <span>Alta: <strong>{{ summary.severity.distribution.high ?? 0 }}</strong></span>
            </div>
            <div class="dist-chip sev-medium" :class="{ empty: !summary.severity.distribution.medium }">
              <span class="dist-dot"></span>
              <span>Media: <strong>{{ summary.severity.distribution.medium ?? 0 }}</strong></span>
            </div>
            <div class="dist-chip sev-low" :class="{ empty: !summary.severity.distribution.low }">
              <span class="dist-dot"></span>
              <span>Baja: <strong>{{ summary.severity.distribution.low ?? 0 }}</strong></span>
            </div>
            <div class="dist-chip sev-info" :class="{ empty: !summary.severity.distribution.info }">
              <span class="dist-dot"></span>
              <span>Informativa: <strong>{{ summary.severity.distribution.info ?? 0 }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section Title -->
      <div class="section-divider">
        <Layers class="icon-xs text-secondary" />
        <span>Evaluación de los Cuatro Oráculos (Fase 3 — Análisis)</span>
      </div>

      <!-- 4 Oracles Grid -->
      <div class="oracles-grid">
        <!-- 1. Mutations Payload Oracle -->
        <div class="oracle-card">
          <div class="oracle-header">
            <div class="oracle-identity">
              <span class="oracle-icon">🧬</span>
              <div>
                <span class="oracle-name">Mutaciones de Petición</span>
                <span class="oracle-desc">Validación de Request Payload vs OpenAPI</span>
              </div>
            </div>
            <span v-if="summary.mutationsPayload?.severity"
              :class="['severity-pill', parseSeverity(summary.mutationsPayload.severity).cssClass]">
              {{ parseSeverity(summary.mutationsPayload.severity).label }}
            </span>
          </div>

          <div class="oracle-body">
            <div class="oracle-status-row">
              <span class="status-indicator" :class="summary.mutationsPayload?.isValid ? 'valid' : 'invalid'">
                <CheckCircle v-if="summary.mutationsPayload?.isValid" class="icon-xs" />
                <XCircle v-else class="icon-xs" />
                {{ summary.mutationsPayload?.isValid ? 'Conforme al Contrato' : 'Mutaciones Detectadas' }}
              </span>
              <span class="oracle-count-badge" v-if="summary.mutationsPayload?.mutationsCant !== undefined">
                {{ summary.mutationsPayload.mutationsCant }} violaciones ({{ summary.mutationsPayload.totalPoints ?? 0 }} pts)
              </span>
            </div>

            <p class="oracle-summary-text">
              {{ summary.mutationsPayload?.isValid
                ? 'El payload generado cumplió con todas las restricciones del JSON Schema de la petición.'
                : 'Se detectaron divergencias respecto a las propiedades y tipos definidos en el contrato.' }}
            </p>
          </div>

          <div class="oracle-footer">
            <button class="btn-drilldown" @click="$emit('select-tab', 'mutations')">
              <span>Examinar Mutaciones</span>
              <ArrowRight class="icon-xs" />
            </button>
          </div>
        </div>

        <!-- 2. Response Payload Check Oracle -->
        <div class="oracle-card">
          <div class="oracle-header">
            <div class="oracle-identity">
              <span class="oracle-icon">📥</span>
              <div>
                <span class="oracle-name">Validación de Respuesta</span>
                <span class="oracle-desc">Verificación de Response Payload vs Contrato</span>
              </div>
            </div>
            <span v-if="summary.responsePayloadCheck?.severity"
              :class="['severity-pill', parseSeverity(summary.responsePayloadCheck.severity).cssClass]">
              {{ parseSeverity(summary.responsePayloadCheck.severity).label }}
            </span>
          </div>

          <div class="oracle-body">
            <div class="oracle-status-row">
              <span class="status-indicator" :class="summary.responsePayloadCheck?.isValid ? 'valid' : 'invalid'">
                <CheckCircle v-if="summary.responsePayloadCheck?.isValid" class="icon-xs" />
                <XCircle v-else class="icon-xs" />
                {{ summary.responsePayloadCheck?.isValid ? 'Esquema Válido' : 'Discrepancia en Respuesta' }}
              </span>
            </div>

            <div class="finding-type-box" v-if="summary.responsePayloadCheck?.findingType">
              <span class="type-title">Clasificación:</span>
              <span class="type-name">{{ formatResponseFindingType(summary.responsePayloadCheck.findingType) }}</span>
            </div>
          </div>

          <div class="oracle-footer">
            <button class="btn-drilldown" @click="$emit('select-tab', 'execution')">
              <span>Ver Respuesta HTTP</span>
              <ArrowRight class="icon-xs" />
            </button>
          </div>
        </div>

        <!-- 3. Status Code Drift Oracle -->
        <div class="oracle-card">
          <div class="oracle-header">
            <div class="oracle-identity">
              <span class="oracle-icon">🎯</span>
              <div>
                <span class="oracle-name">Desviación de Status Code</span>
                <span class="oracle-desc">Comparación contra códigos OpenAPI</span>
              </div>
            </div>
            <span v-if="summary.statusCodeDrift?.severity"
              :class="['severity-pill', parseSeverity(summary.statusCodeDrift.severity).cssClass]">
              {{ parseSeverity(summary.statusCodeDrift.severity).label }}
            </span>
          </div>

          <div class="oracle-body">
            <div class="oracle-status-row">
              <span class="font-mono font-bold text-primary">
                HTTP {{ summary.statusCodeDrift?.statusCode || summary.result?.statusCode || 'N/A' }}
              </span>
              <span :class="['match-pill', getMatchTypeInfo(summary.statusCodeDrift?.matchType).badgeClass]">
                {{ getMatchTypeInfo(summary.statusCodeDrift?.matchType).label }}
              </span>
            </div>

            <p class="oracle-summary-text">
              {{ getMatchTypeInfo(summary.statusCodeDrift?.matchType).description }}
            </p>
          </div>

          <div class="oracle-footer">
            <button class="btn-drilldown" @click="$emit('select-tab', 'drift')">
              <span>Análisis de Drift</span>
              <ArrowRight class="icon-xs" />
            </button>
          </div>
        </div>

        <!-- 4. Injection Vector Oracle -->
        <div class="oracle-card" :class="{ 'disabled-oracle': !summary.injectionVector }">
          <div class="oracle-header">
            <div class="oracle-identity">
              <span class="oracle-icon">⚡</span>
              <div>
                <span class="oracle-name">Vector de Inyección</span>
                <span class="oracle-desc">Oráculo de Dictionary Attacks</span>
              </div>
            </div>
            <span v-if="summary.injectionVector?.severity"
              :class="['severity-pill', parseSeverity(summary.injectionVector.severity).cssClass]">
              {{ parseSeverity(summary.injectionVector.severity).label }}
            </span>
            <span v-else class="status-tag-neutral">No aplicado</span>
          </div>

          <div class="oracle-body" v-if="summary.injectionVector">
            <div class="oracle-status-row">
              <span class="vec-type-badge">{{ summary.injectionVector.type || 'Vector' }}</span>
              <span class="vec-owasp-pill" v-if="summary.injectionVector.owasp">
                {{ summary.injectionVector.owasp }}
              </span>
            </div>

            <div class="vec-quick-meta">
              <div class="meta-kv">
                <span class="k">Resultado Target:</span>
                <span class="v font-bold">{{ summary.injectionVector.outcome || 'N/A' }}</span>
              </div>
              <div class="meta-kv">
                <span class="k">Reflejo:</span>
                <span class="v">{{ summary.injectionVector.reflection || 'NONE' }}</span>
              </div>
            </div>
          </div>

          <div class="oracle-body" v-else>
            <p class="oracle-summary-text text-muted">
              Este caso de prueba no aplicó un vector de inyección de diccionario.
            </p>
          </div>

          <div class="oracle-footer">
            <button class="btn-drilldown" :disabled="!summary.injectionVector" @click="$emit('select-tab', 'vector')">
              <span>Detalles del Vector</span>
              <ArrowRight class="icon-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  Globe,
  Activity,
  ShieldAlert,
  Layers,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-vue-next'
import {
  getStatusClass,
  parseSeverity,
  getMatchTypeInfo,
  formatResponseFindingType,
  formatTimestamp
} from './fuzzUtils'

defineProps({
  summary: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select-tab'])
</script>

<style scoped>
.fuzz-test-case-summary {
  display: flex;
  flex-direction: column;
  gap: 18px;
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

.summary-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-top-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .summary-top-grid {
    grid-template-columns: 1fr;
  }
}

.info-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.surface-details,
.result-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.detail-label {
  color: var(--text-muted);
  width: 90px;
  flex-shrink: 0;
}

.op-badge {
  background: rgba(96, 165, 250, 0.15);
  color: var(--accent-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.text-break {
  word-break: break-all;
}

.stat-metric-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  padding: 10px;
  border-radius: var(--radius-sm);
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
}

.metric-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-value-sm {
  font-size: 11px;
  color: var(--text-secondary);
}

.metric-value-mono {
  font-family: monospace;
  font-size: 11px;
  color: var(--accent-secondary);
}

/* Severity Dashboard */
.severity-dashboard-card {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.08), rgba(0, 0, 0, 0.3));
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.dashboard-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  display: block;
}

.dashboard-sub {
  font-size: 11px;
  color: var(--text-muted);
  display: block;
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 12px;
}

.triage-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.35);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.triage-caption {
  font-size: 11px;
  color: var(--text-secondary);
}

.severity-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 640px) {
  .severity-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.sev-stat-box {
  background: rgba(0, 0, 0, 0.3);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
}

.sev-stat-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.sev-stat-desc {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.distribution-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dist-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.dist-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dist-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dist-chip.empty {
  opacity: 0.45;
}

.dist-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dist-chip.sev-critical .dist-dot { background: #f87171; }
.dist-chip.sev-high .dist-dot { background: #fb923c; }
.dist-chip.sev-medium .dist-dot { background: #fbbf24; }
.dist-chip.sev-low .dist-dot { background: #60a5fa; }
.dist-chip.sev-info .dist-dot { background: #94a3b8; }

/* Section divider */
.section-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  padding-top: 4px;
}

/* Oracles Grid */
.oracles-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 840px) {
  .oracles-grid {
    grid-template-columns: 1fr;
  }
}

.oracle-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all var(--transition-fast);
}

.oracle-card:hover {
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
}

.oracle-card.disabled-oracle {
  opacity: 0.65;
}

.oracle-header {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color);
}

.oracle-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.oracle-icon {
  font-size: 18px;
}

.oracle-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  display: block;
}

.oracle-desc {
  font-size: 10px;
  color: var(--text-muted);
  display: block;
}

.oracle-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.oracle-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.status-indicator.valid {
  color: #4ade80;
}

.status-indicator.invalid {
  color: #f87171;
}

.oracle-count-badge {
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
}

.oracle-summary-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
  margin: 0;
}

.finding-type-box {
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-title {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.type-name {
  color: var(--text-primary);
  font-weight: 600;
}

.vec-type-badge {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}

.vec-owasp-pill {
  font-size: 11px;
  color: var(--text-secondary);
}

.vec-quick-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: rgba(0, 0, 0, 0.25);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 11px;
}

.meta-kv {
  display: flex;
  flex-direction: column;
}

.meta-kv .k {
  color: var(--text-muted);
  font-size: 10px;
}

.meta-kv .v {
  color: var(--text-primary);
}

.oracle-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  justify-content: flex-end;
}

.btn-drilldown {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--accent-secondary);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-drilldown:hover:not(:disabled) {
  background: rgba(96, 165, 250, 0.15);
  border-color: var(--accent-secondary);
}

.btn-drilldown:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  color: var(--text-muted);
}

/* Badges & Pills */
.severity-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sev-critical {
  background: rgba(248, 113, 113, 0.25);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.sev-high {
  background: rgba(251, 146, 60, 0.25);
  color: #fb923c;
  border: 1px solid rgba(251, 146, 60, 0.4);
}

.sev-medium {
  background: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.sev-low {
  background: rgba(96, 165, 250, 0.25);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.4);
}

.sev-info {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.method-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
}

.method-badge.post { background: rgba(96, 165, 250, 0.25); color: #60a5fa; }
.method-badge.get { background: rgba(74, 222, 128, 0.25); color: #4ade80; }
.method-badge.put { background: rgba(251, 191, 36, 0.25); color: #fbbf24; }
.method-badge.delete { background: rgba(248, 113, 113, 0.25); color: #f87171; }
.method-badge.patch { background: rgba(192, 132, 252, 0.25); color: #c084fc; }

.status-pill {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
}

.status-2xx { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
.status-3xx { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
.status-4xx { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-5xx { background: rgba(248, 113, 113, 0.2); color: #f87171; }
.status-other { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }

.match-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.badge-exact { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
.badge-wildcard { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
.badge-default { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.badge-none { background: rgba(248, 113, 113, 0.2); color: #f87171; }

.status-tag-neutral {
  font-size: 10px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>

