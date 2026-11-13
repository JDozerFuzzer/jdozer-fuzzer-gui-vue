<template>
  <div class="fuzz-execution">
    <!-- Loading State -->
    <div v-if="loading" class="fuzz-loading">
      <RefreshCw class="spinning icon-md text-accent" />
      <span>Consultando datos crudos de ejecución (Fase 2 — Execution)...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="!execution" class="fuzz-empty">
      <AlertCircle class="icon-md text-muted" />
      <span>No se encontraron datos de ejecución para este caso de prueba.</span>
    </div>

    <!-- Content: HTTP Split View -->
    <div v-else class="execution-content">
      <div class="http-grid">

        <!-- ==================== REQUEST BOX ==================== -->
        <div class="http-card req-card">
          <div class="http-card-header">
            <div class="title-with-badge">
              <Send class="icon-xs text-secondary" />
              <span class="http-title">Petición HTTP Enviada (Request)</span>
            </div>
            <span :class="['method-pill', (resolvedRequest.method || 'POST').toLowerCase()]">
              {{ resolvedRequest.method || 'POST' }}
            </span>
          </div>

          <div class="http-card-body">
            <!-- URL & Path -->
            <div class="url-info-box">
              <div class="url-line">
                <span class="url-label">URL:</span>
                <span class="url-val font-mono" :title="resolvedRequest.url">{{ resolvedRequest.url || 'N/A' }}</span>
              </div>
              <div class="url-line" v-if="resolvedRequest.defaultName || resolvedRequest.path">
                <span class="url-label">Endpoint:</span>
                <span class="url-val font-mono text-muted">{{ resolvedRequest.defaultName || resolvedRequest.path }}</span>
              </div>
            </div>

            <!-- Transport & Execution Flags -->
            <div class="config-flags-grid">
              <div class="flag-item">
                <span class="flag-k">Timeout:</span>
                <span class="flag-v">{{ resolvedRequest.timeout ? resolvedRequest.timeout + 's' : '10s' }}</span>
              </div>
              <div class="flag-item">
                <span class="flag-k">Redirects:</span>
                <span class="flag-v">{{ resolvedRequest.followRedirect ? 'Seguir (true)' : 'No (false)' }}</span>
              </div>
              <div class="flag-item">
                <span class="flag-k">Decompress:</span>
                <span class="flag-v">{{ resolvedRequest.decompress ? 'Sí (true)' : 'No' }}</span>
              </div>
              <div class="flag-item">
                <span class="flag-k">Reintentos:</span>
                <span class="flag-v">{{ resolvedRequest.retry?.limit ?? 0 }}</span>
              </div>
            </div>

            <!-- Lifecycle Hooks -->
            <div v-if="hasHooks" class="hooks-row">
              <span class="hooks-title">Hooks:</span>
              <span v-if="resolvedRequest.beforeRequest" class="hook-tag">beforeRequest</span>
              <span v-if="resolvedRequest.afterResponse" class="hook-tag">afterResponse</span>
              <span v-if="resolvedRequest.catchErrors" class="hook-tag">catchErrors</span>
            </div>

            <!-- Test Dataset References (Seed Corpus composition) -->
            <div v-if="resolvedRequest.dataRefs" class="data-refs-box">
              <span class="data-refs-title">Referencias a Datos de Prueba (Seed Corpus):</span>
              <div class="refs-list">
                <span v-if="resolvedRequest.dataRefs.payloadId" class="ref-pill" :title="resolvedRequest.dataRefs.payloadId">
                  payloadId: {{ resolvedRequest.dataRefs.payloadId.slice(0, 8) }}...
                </span>
                <span v-if="resolvedRequest.dataRefs.queryId" class="ref-pill">
                  queryId: {{ resolvedRequest.dataRefs.queryId.slice(0, 8) }}...
                </span>
                <span v-if="resolvedRequest.dataRefs.headersId" class="ref-pill">
                  headersId: {{ resolvedRequest.dataRefs.headersId.slice(0, 8) }}...
                </span>
              </div>
            </div>

            <!-- Request Headers -->
            <div class="section-container">
              <div class="section-header-row">
                <span class="section-label">Headers de Petición ({{ reqHeadersCount }}):</span>
                <button class="btn-copy-small" @click="copyText(JSON.stringify(resolvedRequest.headers || {}, null, 2), 'req-headers')">
                  <Copy class="icon-xs" />
                  <span>{{ copiedField === 'req-headers' ? '¡Copiado!' : 'Copiar' }}</span>
                </button>
              </div>
              <pre class="json-code headers-code"><code>{{ JSON.stringify(resolvedRequest.headers || {}, null, 2) }}</code></pre>
            </div>

            <!-- Request Payload Body -->
            <div class="section-container">
              <div class="section-header-row">
                <span class="section-label">Cuerpo de Petición (Payload):</span>
                <div class="payload-actions">
                  <button class="btn-toggle-raw" @click="showRawReq = !showRawReq" v-if="resolvedRequest.payload">
                    {{ showRawReq ? 'Ver Decodificado' : 'Ver Base64' }}
                  </button>
                  <button class="btn-copy-small" @click="copyText(decodedReqBody, 'req-body')">
                    <Copy class="icon-xs" />
                    <span>{{ copiedField === 'req-body' ? '¡Copiado!' : 'Copiar' }}</span>
                  </button>
                </div>
              </div>

              <!-- Base64 view -->
              <pre v-if="showRawReq" class="json-code payload-code base64-view"><code>{{ resolvedRequest.payload }}</code></pre>
              <!-- Decoded view -->
              <pre v-else class="json-code payload-code"><code>{{ decodedReqBody || '(Cuerpo vacío o sin payload)' }}</code></pre>
            </div>
          </div>
        </div>

        <!-- ==================== RESPONSE BOX ==================== -->
        <div class="http-card res-card">
          <div class="http-card-header">
            <div class="title-with-badge">
              <Download class="icon-xs text-accent" />
              <span class="http-title">Respuesta Recibida (Response)</span>
            </div>
            <span :class="['status-pill', getStatusClass(resolvedResponse.statusCode)]">
              {{ resolvedResponse.statusCode || '---' }} {{ resolvedResponse.statusMessage || '' }}
            </span>
          </div>

          <div class="http-card-body">
            <!-- Timing breakdown & Metrics -->
            <div class="timings-dashboard-box" v-if="resolvedResponse.timings">
              <div class="timing-top-row">
                <span class="timing-main-label">Desglose de Fases de Tiempo (Timings):</span>
                <span class="timing-total font-mono font-bold">
                  ⚡ Total: {{ totalLatency }} ms
                </span>
              </div>

              <!-- Visual timing bar -->
              <div class="timing-visual-bar" v-if="phases">
                <div class="timing-bar-segment phase-dns" :style="{ width: getPhasePercent(phases.dns) + '%' }" :title="'DNS: ' + (phases.dns || 0) + 'ms'"></div>
                <div class="timing-bar-segment phase-tcp" :style="{ width: getPhasePercent(phases.tcp) + '%' }" :title="'TCP: ' + (phases.tcp || 0) + 'ms'"></div>
                <div class="timing-bar-segment phase-req" :style="{ width: getPhasePercent(phases.request) + '%' }" :title="'Request: ' + (phases.request || 0) + 'ms'"></div>
                <div class="timing-bar-segment phase-ttfb" :style="{ width: getPhasePercent(phases.firstByte) + '%' }" :title="'TTFB: ' + (phases.firstByte || 0) + 'ms'"></div>
                <div class="timing-bar-segment phase-down" :style="{ width: getPhasePercent(phases.download) + '%' }" :title="'Download: ' + (phases.download || 0) + 'ms'"></div>
              </div>

              <!-- Phases Grid -->
              <div class="phases-grid" v-if="phases">
                <div class="phase-chip">
                  <span class="ph-k">DNS</span>
                  <span class="ph-v">{{ phases.dns ?? 0 }}ms</span>
                </div>
                <div class="phase-chip">
                  <span class="ph-k">TCP</span>
                  <span class="ph-v">{{ phases.tcp ?? 0 }}ms</span>
                </div>
                <div class="phase-chip">
                  <span class="ph-k">Envío</span>
                  <span class="ph-v">{{ phases.request ?? 0 }}ms</span>
                </div>
                <div class="phase-chip highlight">
                  <span class="ph-k">TTFB (1er Byte)</span>
                  <span class="ph-v">{{ phases.firstByte ?? 0 }}ms</span>
                </div>
                <div class="phase-chip">
                  <span class="ph-k">Descarga</span>
                  <span class="ph-v">{{ phases.download ?? 0 }}ms</span>
                </div>
                <div class="phase-chip" v-if="phases.wait">
                  <span class="ph-k">Espera Pool</span>
                  <span class="ph-v">{{ phases.wait }}ms</span>
                </div>
              </div>

              <!-- Anomaly alert pill -->
              <div v-if="resolvedResponse.timings.anomaly" class="timing-anomaly-alert">
                <AlertTriangle class="icon-xs" />
                <span>Anomalía de tiempo detectada: la latencia superó el umbral configurado.</span>
              </div>
            </div>

            <!-- Target Metadata (IP, Complete, Time) -->
            <div class="target-meta-row">
              <div class="meta-item" v-if="resolvedResponse.ip">
                <span class="meta-k">IP Destino:</span>
                <span class="meta-v font-mono">{{ resolvedResponse.ip }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-k">Estado:</span>
                <span class="meta-v" :class="resolvedResponse.complete ? 'text-accent' : 'text-danger'">
                  {{ resolvedResponse.complete ? 'Completado' : 'Incompleto' }}
                </span>
              </div>
              <div class="meta-item" v-if="resolvedResponse.aborted">
                <span class="meta-k">Abortado:</span>
                <span class="meta-v text-danger font-bold">Sí</span>
              </div>
              <div class="meta-item" v-if="resolvedResponse.time">
                <span class="meta-k">Hora:</span>
                <span class="meta-v">{{ formatTimestamp(resolvedResponse.time) }}</span>
              </div>
            </div>

            <!-- Response Headers -->
            <div class="section-container">
              <div class="section-header-row">
                <span class="section-label">Headers de Respuesta ({{ resHeadersCount }}):</span>
                <button class="btn-copy-small" @click="copyText(JSON.stringify(resolvedResponse.headers || {}, null, 2), 'res-headers')">
                  <Copy class="icon-xs" />
                  <span>{{ copiedField === 'res-headers' ? '¡Copiado!' : 'Copiar' }}</span>
                </button>
              </div>
              <pre class="json-code headers-code"><code>{{ JSON.stringify(resolvedResponse.headers || {}, null, 2) }}</code></pre>
            </div>

            <!-- Response Payload Body -->
            <div class="section-container">
              <div class="section-header-row">
                <span class="section-label">Cuerpo de Respuesta (Response Payload):</span>
                <div class="payload-actions">
                  <button class="btn-toggle-raw" @click="showRawRes = !showRawRes" v-if="resolvedResponse.payload">
                    {{ showRawRes ? 'Ver Decodificado' : 'Ver Base64' }}
                  </button>
                  <button class="btn-copy-small" @click="copyText(decodedResBody, 'res-body')">
                    <Copy class="icon-xs" />
                    <span>{{ copiedField === 'res-body' ? '¡Copiado!' : 'Copiar' }}</span>
                  </button>
                </div>
              </div>

              <!-- Base64 view -->
              <pre v-if="showRawRes" class="json-code payload-code base64-view"><code>{{ resolvedResponse.payload }}</code></pre>
              <!-- Decoded view -->
              <pre v-else class="json-code payload-code"><code>{{ decodedResBody || '(Cuerpo de respuesta vacío)' }}</code></pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  Send,
  Download,
  Copy,
  AlertTriangle,
  RefreshCw,
  AlertCircle
} from 'lucide-vue-next'
import {
  getStatusClass,
  decodePayload,
  formatTimestamp,
  copyToClipboard
} from './fuzzUtils'

const props = defineProps({
  executionData: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const showRawReq = ref(false)
const showRawRes = ref(false)
const copiedField = ref(null)

const execution = computed(() => props.executionData)

const resolvedRequest = computed(() => {
  if (!execution.value) return {}
  // execution conforms to TestCaseExecution or has REQ property
  if (execution.value.REQ) return execution.value.REQ
  return execution.value
})

const resolvedResponse = computed(() => {
  if (!execution.value) return {}
  if (execution.value.response) return execution.value.response
  if (execution.value.RES) return execution.value.RES
  return {}
})

const decodedReqBody = computed(() => {
  return decodePayload(resolvedRequest.value.body || resolvedRequest.value.payload)
})

const decodedResBody = computed(() => {
  return decodePayload(resolvedResponse.value.body || resolvedResponse.value.payload)
})

const reqHeadersCount = computed(() => {
  return Object.keys(resolvedRequest.value.headers || {}).length
})

const resHeadersCount = computed(() => {
  return Object.keys(resolvedResponse.value.headers || {}).length
})

const phases = computed(() => {
  return resolvedResponse.value.timings?.phases || null
})

const totalLatency = computed(() => {
  return phases.value?.total ?? resolvedResponse.value.totalTime ?? 0
})

const hasHooks = computed(() => {
  return !!(resolvedRequest.value.beforeRequest || resolvedRequest.value.afterResponse || resolvedRequest.value.catchErrors)
})

const getPhasePercent = (val) => {
  const total = totalLatency.value
  if (!total || !val) return 2
  return Math.max(3, Math.min(100, Math.round((val / total) * 100)))
}

const copyText = async (text, fieldName) => {
  if (!text) return
  const ok = await copyToClipboard(text)
  if (ok) {
    copiedField.value = fieldName
    setTimeout(() => { copiedField.value = null }, 2000)
  }
}
</script>

<style scoped>
.fuzz-execution {
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

.http-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 900px) {
  .http-grid {
    grid-template-columns: 1fr;
  }
}

.http-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.http-card-header {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.http-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.http-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.url-info-box {
  background: rgba(0, 0, 0, 0.3);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.url-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 11px;
}

.url-label {
  color: var(--text-muted);
  font-weight: 600;
  width: 60px;
  flex-shrink: 0;
}

.url-val {
  color: var(--text-primary);
  word-break: break-all;
}

.config-flags-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

@media (max-width: 640px) {
  .config-flags-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.flag-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 6px 8px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.flag-k {
  font-size: 9px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.flag-v {
  font-size: 11px;
  color: var(--text-secondary);
}

.hooks-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.hooks-title {
  color: var(--text-muted);
}

.hook-tag {
  background: rgba(96, 165, 250, 0.15);
  color: var(--accent-secondary);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 10px;
}

.data-refs-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 10px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.data-refs-title {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
}

.refs-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ref-pill {
  font-size: 10px;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.timings-dashboard-box {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timing-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timing-main-label {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--text-muted);
}

.timing-total {
  font-size: 12px;
  color: var(--accent-primary);
}

.timing-visual-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  gap: 1px;
}

.timing-bar-segment {
  height: 100%;
  transition: width 0.3s ease;
}

.phase-dns { background: #60a5fa; }
.phase-tcp { background: #c084fc; }
.phase-req { background: #fbbf24; }
.phase-ttfb { background: #4ade80; }
.phase-down { background: #38bdf8; }

.phases-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.phase-chip {
  background: rgba(0, 0, 0, 0.25);
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.phase-chip.highlight {
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.ph-k {
  font-size: 9px;
  color: var(--text-muted);
}

.ph-v {
  font-size: 11px;
  font-family: monospace;
  color: var(--text-primary);
}

.timing-anomaly-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
}

.target-meta-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 11px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-k {
  color: var(--text-muted);
}

.meta-v {
  color: var(--text-secondary);
}

.section-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
}

.payload-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-toggle-raw,
.btn-copy-small {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-toggle-raw:hover,
.btn-copy-small:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.json-code {
  background: #09090f;
  padding: 10px 12px;
  border-radius: 6px;
  color: #a6accd;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.headers-code {
  max-height: 120px;
  overflow-y: auto;
}

.payload-code {
  max-height: 200px;
  overflow-y: auto;
}

.base64-view {
  color: #fbbf24;
}

/* Badges */
.method-pill {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
}

.method-pill.post { background: rgba(96, 165, 250, 0.25); color: #60a5fa; }
.method-pill.get { background: rgba(74, 222, 128, 0.25); color: #4ade80; }
.method-pill.put { background: rgba(251, 191, 36, 0.25); color: #fbbf24; }
.method-pill.delete { background: rgba(248, 113, 113, 0.25); color: #f87171; }
.method-pill.patch { background: rgba(192, 132, 252, 0.25); color: #c084fc; }

.status-pill {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
}

.status-2xx { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
.status-3xx { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
.status-4xx { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-5xx { background: rgba(248, 113, 113, 0.2); color: #f87171; }
.status-other { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
</style>

