<template>
  <div class="fuzz-response-payload-check">
    <!-- Loading State -->
    <div v-if="loading" class="fuzz-loading">
      <RefreshCw class="spinning icon-md text-accent" />
      <span>Consultando oráculo de Validación de Respuesta (Payload Check API)...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="!payloadCheckData || (!payloadCheckData.finding && payloadCheckData.isValid === undefined)" class="fuzz-empty">
      <AlertCircle class="icon-md text-muted" />
      <span>No se encontraron registros de verificación de payload de respuesta para este caso.</span>
    </div>

    <!-- Content -->
    <div v-else class="check-content">

      <!-- ==================== HERO STATUS BANNER ==================== -->
      <div class="check-hero-card" :class="heroClass">
        <div class="hero-header">
          <div class="hero-status-title">
            <CheckCircle2 v-if="resolvedIsValid" class="icon-md text-accent" />
            <AlertTriangle v-else-if="isDataLeak" class="icon-md text-danger" />
            <AlertTriangle v-else class="icon-md text-warning" />
            <div>
              <span class="hero-title">
                {{ resolvedIsValid ? 'Cuerpo de Respuesta Conforme al Contrato' : 'Discrepancia en Cuerpo de Respuesta Detectada' }}
              </span>
              <span class="hero-sub">
                {{ resolvedIsValid
                  ? 'El payload recibido cumple plenamente con las definiciones del JSON Schema en el contrato OpenAPI.'
                  : 'El oráculo de validación de respuesta (response-body validation) identificó inconsistencias contra el contrato.' }}
              </span>
            </div>
          </div>

          <div class="hero-badges">
            <span :class="['validation-pill', resolvedIsValid ? 'valid' : 'invalid']">
              {{ resolvedIsValid ? '✓ Conforme' : '✗ Discrepancia' }}
            </span>
            <span v-if="resolvedFinding?.severity" :class="['severity-pill', parseSeverity(resolvedFinding.severity).cssClass]">
              Severidad {{ parseSeverity(resolvedFinding.severity).label }}
            </span>
          </div>
        </div>

        <!-- Finding Type Banner -->
        <div class="finding-type-banner" v-if="resolvedFinding?.type">
          <div class="type-badge-group">
            <span class="type-caption">Tipificación del Hallazgo:</span>
            <span :class="['type-tag', isDataLeak ? 'tag-leak' : 'tag-schema']">
              {{ formatResponseFindingType(resolvedFinding.type) }}
            </span>
            <code class="type-enum-code font-mono">{{ resolvedFinding.type }}</code>
          </div>
        </div>

        <!-- Finding Description -->
        <p class="hero-description" v-if="resolvedFinding?.description">
          {{ resolvedFinding.description }}
        </p>

        <!-- Faceted Tags Row -->
        <div class="tags-row" v-if="resolvedFinding?.tags && resolvedFinding.tags.length > 0">
          <span class="tags-label">Etiquetas Facetadas:</span>
          <div class="tags-list">
            <span v-for="tag in resolvedFinding.tags" :key="tag" class="tag-pill">
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- ==================== SPECIAL DATA LEAK ADVISORY ==================== -->
      <div v-if="isDataLeak" class="data-leak-alert-card">
        <div class="leak-header">
          <ShieldAlert class="icon-sm text-danger" />
          <span class="leak-title">Alerta de Seguridad: Fuga de Datos (Information Disclosure)</span>
        </div>
        <p class="leak-desc">
          La API retornó datos adicionales no contemplados en el contrato. Esto sugiere que el backend podría estar exponiendo información interna, campos de depuración o atributos sensibles en producción que no deberían compartirse con el cliente.
        </p>
      </div>

      <!-- ==================== REMEDIATION & RECOMMENDATIONS ==================== -->
      <div v-if="hasRecommendations" class="rec-section-card">
        <div class="rec-header">
          <Lightbulb class="icon-sm text-warning" />
          <span class="rec-title">Acciones de Remediación Sugeridas:</span>
        </div>

        <div class="rec-body">
          <ul v-if="Array.isArray(resolvedFinding.recommendation)" class="rec-list">
            <li v-for="(rec, idx) in resolvedFinding.recommendation" :key="idx" class="rec-item">
              <ChevronRight class="icon-xs text-accent" />
              <span>{{ rec }}</span>
            </li>
          </ul>
          <p v-else class="rec-single">
            {{ resolvedFinding.recommendation }}
          </p>
        </div>
      </div>

      <!-- ==================== SCHEMA VALIDATION ERRORS BREAKDOWN ==================== -->
      <div v-if="errorsList.length > 0" class="errors-section">
        <div class="section-header-bar">
          <div class="section-title-group">
            <Code2 class="icon-sm text-secondary" />
            <span class="section-title">Evidencia Atómica de Errores (JSON Schema)</span>
            <span class="errors-count-badge">{{ errorsList.length }} {{ errorsList.length === 1 ? 'error' : 'errores' }}</span>
          </div>

          <!-- Search / Filter input -->
          <div class="search-box">
            <Search class="icon-xs text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Filtrar por path, keyword o mensaje..."
              class="search-input"
            />
          </div>
        </div>

        <!-- Errors List -->
        <div v-if="filteredErrors.length > 0" class="errors-list">
          <div
            v-for="(err, idx) in filteredErrors"
            :key="err.instancePath + '-' + err.keyword + '-' + idx"
            class="error-card"
          >
            <!-- Error Card Header -->
            <div class="error-card-header">
              <div class="error-header-main">
                <span class="error-index">#{{ idx + 1 }}</span>
                <span class="error-keyword font-mono">{{ err.keyword }}</span>
                <span class="error-msg">{{ err.message }}</span>
              </div>
            </div>

            <!-- Error Card Body -->
            <div class="error-card-body">
              <!-- Location Mapping Grid -->
              <div class="loc-grid">
                <div class="loc-col">
                  <span class="loc-label">Ubicación en Respuesta (instancePath):</span>
                  <div class="code-copy-row">
                    <code class="loc-code font-mono">{{ err.instancePath === '' ? '/ (raíz)' : err.instancePath }}</code>
                    <button class="btn-copy-mini" @click="handleCopy(err.instancePath, 'inst-' + idx)" title="Copiar path">
                      <Copy class="icon-xs" />
                      <span v-if="copiedField === 'inst-' + idx">¡Copiado!</span>
                    </button>
                  </div>
                </div>

                <div class="loc-col">
                  <span class="loc-label">Regla de Contrato (schemaPath):</span>
                  <div class="code-copy-row">
                    <code class="loc-code font-mono text-muted">{{ err.schemaPath }}</code>
                    <button class="btn-copy-mini" @click="handleCopy(err.schemaPath, 'sch-' + idx)" title="Copiar schemaPath">
                      <Copy class="icon-xs" />
                      <span v-if="copiedField === 'sch-' + idx">¡Copiado!</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Rule Parameters -->
              <div v-if="err.params && Object.keys(err.params).length > 0" class="params-detail-box">
                <span class="params-label">Parámetros de la Regla:</span>
                <div class="params-chips">
                  <span v-for="(v, k) in err.params" :key="k" class="param-chip font-mono">
                    <strong>{{ k }}:</strong> {{ v }}
                  </span>
                </div>
              </div>

              <!-- Infringing Data & Expected Schema Preview -->
              <div class="data-comparison-grid" v-if="err.data !== undefined || err.schema !== undefined">
                <div class="data-col" v-if="err.data !== undefined">
                  <span class="data-k">Dato Recibido (data):</span>
                  <pre class="json-code compact"><code>{{ JSON.stringify(err.data, null, 2) }}</code></pre>
                </div>
                <div class="data-col" v-if="err.schema !== undefined">
                  <span class="data-k">Schema Esperado (schema):</span>
                  <pre class="json-code compact"><code>{{ JSON.stringify(err.schema, null, 2) }}</code></pre>
                </div>
              </div>

              <!-- Expandable Parent Context -->
              <div v-if="err.parentSchema !== undefined" class="context-toggle-row">
                <button class="btn-toggle-context" @click="toggleExpandContext(idx)">
                  <Code2 class="icon-xs" />
                  <span>{{ isExpanded(idx) ? 'Ocultar Sub-Schema Padre' : 'Ver Sub-Schema Padre (parentSchema)' }}</span>
                  <ChevronDown :class="['icon-xs', { rotate: isExpanded(idx) }]" />
                </button>

                <div v-if="isExpanded(idx)" class="expanded-parent-box">
                  <pre class="json-code"><code>{{ JSON.stringify(err.parentSchema, null, 2) }}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No filter matches -->
        <div v-else class="no-filter-match">
          <span>No se encontraron errores que coincidan con el término de búsqueda.</span>
          <button class="btn-reset-filter" @click="searchQuery = ''">Limpiar Búsqueda</button>
        </div>
      </div>

      <!-- ==================== CLEAN CONFORMANCE STATE ==================== -->
      <div v-else-if="resolvedIsValid" class="clean-conformance-card">
        <CheckCircle2 class="icon-lg text-accent" />
        <span class="clean-title">El payload de respuesta cumple plenamente con el contrato OpenAPI</span>
        <span class="clean-sub">No se registraron errores de validación de esquema, propiedades no documentadas ni discrepancias de formato.</span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Search,
  Code2,
  ChevronDown,
  Copy,
  Lightbulb,
  ChevronRight,
  RefreshCw,
  AlertCircle
} from 'lucide-vue-next'
import {
  parseSeverity,
  formatResponseFindingType,
  copyToClipboard
} from './fuzzUtils'

const props = defineProps({
  payloadCheckData: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const searchQuery = ref('')
const expandedIndices = ref(new Set())
const copiedField = ref(null)

const resolvedIsValid = computed(() => {
  if (props.payloadCheckData?.isValid !== undefined) {
    return !!props.payloadCheckData.isValid
  }
  if (props.payloadCheckData?.finding?.type === 'SCHEMA_VALIDATION_SUCCESS' || props.payloadCheckData?.finding?.type === 'EMPTY_RESPONSE_VALID') {
    return true
  }
  return false
})

const resolvedFinding = computed(() => {
  if (props.payloadCheckData?.finding) {
    return props.payloadCheckData.finding
  }
  // Backward compatibility with validation object or flat responsePayloadCheck
  if (props.payloadCheckData?.validation) {
    return {
      type: props.payloadCheckData.validation.findingType || 'SCHEMA_VALIDATION_ERROR',
      description: props.payloadCheckData.validation.DESCRIPTION || props.payloadCheckData.description,
      severity: { name: (props.payloadCheckData.validation.SEVERITY_LEVEL || 'medium').toLowerCase(), value: 2 },
      tags: props.payloadCheckData.validation.TAGS || [],
      recommendation: props.payloadCheckData.validation.RECOMMENDATION || []
    }
  }
  return props.payloadCheckData || {}
})

const isDataLeak = computed(() => {
  return resolvedFinding.value?.type === 'UNDOCUMENTED_DATA_LEAK'
})

const heroClass = computed(() => {
  if (resolvedIsValid.value) return 'hero-valid'
  if (isDataLeak.value) return 'hero-leak'
  return 'hero-invalid'
})

const errorsList = computed(() => {
  return props.payloadCheckData?.errors || []
})

const filteredErrors = computed(() => {
  let list = errorsList.value
  if (!searchQuery.value.trim()) return list
  const q = searchQuery.value.toLowerCase().trim()
  return list.filter(err => {
    return (
      err.instancePath?.toLowerCase().includes(q) ||
      err.schemaPath?.toLowerCase().includes(q) ||
      err.keyword?.toLowerCase().includes(q) ||
      err.message?.toLowerCase().includes(q) ||
      JSON.stringify(err.params || {}).toLowerCase().includes(q)
    )
  })
})

const hasRecommendations = computed(() => {
  const rec = resolvedFinding.value?.recommendation
  if (!rec) return false
  if (Array.isArray(rec)) return rec.length > 0
  return typeof rec === 'string' && rec.trim().length > 0
})

const toggleExpandContext = (idx) => {
  const set = new Set(expandedIndices.value)
  if (set.has(idx)) {
    set.delete(idx)
  } else {
    set.add(idx)
  }
  expandedIndices.value = set
}

const isExpanded = (idx) => {
  return expandedIndices.value.has(idx)
}

const handleCopy = async (text, fieldName) => {
  if (!text) return
  const ok = await copyToClipboard(text)
  if (ok) {
    copiedField.value = fieldName
    setTimeout(() => { copiedField.value = null }, 2000)
  }
}
</script>

<style scoped>
.fuzz-response-payload-check {
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

.check-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Hero card */
.check-hero-card {
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.25);
}

.check-hero-card.hero-valid {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(0, 0, 0, 0.35));
  border-color: rgba(74, 222, 128, 0.35);
}

.check-hero-card.hero-invalid {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(0, 0, 0, 0.35));
  border-color: rgba(251, 191, 36, 0.35);
}

.check-hero-card.hero-leak {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.12), rgba(0, 0, 0, 0.35));
  border-color: rgba(248, 113, 113, 0.4);
}

.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-status-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  display: block;
}

.hero-sub {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
}

.hero-badges {
  display: flex;
  align-items: center;
  gap: 10px;
}

.validation-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
}

.validation-pill.valid {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.35);
}

.validation-pill.invalid {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.finding-type-banner {
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}

.type-badge-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.type-caption {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
}

.type-tag {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.tag-leak {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.tag-schema {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.type-enum-code {
  font-size: 11px;
  color: var(--text-muted);
}

.hero-description {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

.tags-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tags-label {
  font-size: 11px;
  color: var(--text-muted);
}

.tags-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-pill {
  font-size: 10px;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.35);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

/* Special data leak card */
.data-leak-alert-card {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leak-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.leak-title {
  font-size: 13px;
  font-weight: 700;
  color: #f87171;
}

.leak-desc {
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

/* Recommendations section */
.rec-section-card {
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  gap: 6px;
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

/* Errors Breakdown Section */
.errors-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.errors-count-badge {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 240px;
}

.search-box svg {
  position: absolute;
  left: 10px;
}

.search-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 6px 12px 6px 30px;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.search-input:focus {
  border-color: var(--accent-secondary);
}

.errors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.error-card-header {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.error-index {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.error-keyword {
  background: rgba(96, 165, 250, 0.2);
  color: var(--accent-secondary);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.error-msg {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.error-card-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 680px) {
  .loc-grid {
    grid-template-columns: 1fr;
  }
}

.loc-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.loc-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.code-copy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 8px;
  border-radius: 4px;
  gap: 6px;
}

.loc-code {
  font-size: 11px;
  color: var(--accent-secondary);
  word-break: break-all;
}

.btn-copy-mini {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.btn-copy-mini:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.params-detail-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 6px 10px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.params-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.params-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.param-chip {
  font-size: 11px;
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  padding: 2px 6px;
  border-radius: 4px;
}

.data-comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 680px) {
  .data-comparison-grid {
    grid-template-columns: 1fr;
  }
}

.data-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.data-k {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.context-toggle-row {
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
  margin-top: 4px;
}

.btn-toggle-context {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: color var(--transition-fast);
  padding: 2px 0;
}

.btn-toggle-context:hover {
  color: var(--text-primary);
}

.btn-toggle-context svg.rotate {
  transform: rotate(180deg);
}

.expanded-parent-box {
  margin-top: 8px;
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

.json-code.compact {
  max-height: 140px;
  overflow-y: auto;
}

.no-filter-match {
  padding: 32px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.btn-reset-filter {
  background: rgba(96, 165, 250, 0.15);
  border: 1px solid var(--accent-secondary);
  color: var(--accent-secondary);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
}

.clean-conformance-card {
  padding: 40px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.clean-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.clean-sub {
  font-size: 12px;
  color: var(--text-muted);
}

/* Severity Pill */
.severity-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
}

.sev-critical { background: rgba(248, 113, 113, 0.25); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); }
.sev-high { background: rgba(251, 146, 60, 0.25); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.4); }
.sev-medium { background: rgba(251, 191, 36, 0.25); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); }
.sev-low { background: rgba(96, 165, 250, 0.25); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.4); }
.sev-info { background: rgba(148, 163, 184, 0.2); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }
</style>

