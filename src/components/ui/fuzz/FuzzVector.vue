<template>
  <div class="fuzz-vector">
    <!-- Loading State -->
    <div v-if="loading" class="fuzz-loading">
      <RefreshCw class="spinning icon-md text-accent" />
      <span>Consultando oráculo de Inyección de Vectores (Dictionary Vector Oracle)...</span>
    </div>

    <!-- Empty State (No vector applied in this case) -->
    <div v-else-if="!hasVector" class="fuzz-empty clean-no-vector">
      <ShieldCheck class="icon-lg text-secondary" />
      <span class="no-vec-title">Sin Vector de Inyección Aplicado</span>
      <p class="no-vec-desc">
        Este caso de prueba no aplicó un vector de ataque de diccionario. Se ejecutó únicamente para validación de esquema y análisis de status code.
      </p>
    </div>

    <!-- Content: Vector Detail & Evaluation -->
    <div v-else class="vector-content">
      <!-- Hero: Attack Class & Verdict -->
      <div class="vector-hero-card" :class="verdictInfo.badgeClass">
        <div class="hero-top-row">
          <div class="attack-identity">
            <span class="attack-type-pill">{{ resolvedVector.type || 'VECTOR' }}</span>
            <div class="attack-titles">
              <span class="attack-main-title">{{ resolvedVector.description || 'Vector de Inyección' }}</span>
              <span class="attack-owasp" v-if="resolvedVector.owasp_category || resolvedVector.owasp">
                {{ resolvedVector.owasp_category || resolvedVector.owasp }}
              </span>
            </div>
          </div>

          <div class="hero-verdict-group">
            <span :class="['verdict-badge', verdictInfo.badgeClass]">
              {{ verdictInfo.label }}
            </span>
            <span v-if="resolvedFinding.severity" :class="['severity-pill', parseSeverity(resolvedFinding.severity).cssClass]">
              Severidad {{ parseSeverity(resolvedFinding.severity).label }}
            </span>
          </div>
        </div>

        <p class="verdict-desc">
          {{ verdictInfo.description }}
        </p>

        <!-- Confidence Gauge & Limitation Disclaimer -->
        <div class="confidence-container">
          <div class="confidence-header">
            <span class="conf-label">Nivel de Confianza del Oráculo (Confidence):</span>
            <span class="conf-value font-mono font-bold">{{ confidenceDisplay }} / 0.70 máx</span>
          </div>
          <div class="confidence-track">
            <div class="confidence-fill" :style="{ width: confidencePercent + '%' }"></div>
          </div>
          <span class="confidence-disclaimer">
            ℹ️ Confianza acotada a máx 0.70: el fuzzer no ejecuta un motor de navegador en cliente para confirmar explotación en DOM.
          </span>
        </div>
      </div>

      <!-- Oracle Evaluation Grid (Outcome, Reflection, Insertion) -->
      <div class="eval-grid">
        <!-- Target Outcome -->
        <div class="eval-card">
          <span class="eval-card-k">Respuesta del Target (Outcome)</span>
          <span :class="['outcome-pill', outcomeInfo.badgeClass]">
            {{ outcomeInfo.label }}
          </span>
          <span class="eval-sub font-mono">Status HTTP: {{ resolvedStatusCode }}</span>
        </div>

        <!-- Reflection Context -->
        <div class="eval-card">
          <span class="eval-card-k">Contexto de Reflejo (Reflection)</span>
          <div class="reflection-row">
            <span class="reflection-badge" :class="{ reflected: isReflected }">
              {{ formattedReflection }}
            </span>
            <span class="refl-flag" :class="isReflected ? 'text-danger' : 'text-accent'">
              {{ isReflected ? '⚠️ Reflejado en respuesta' : '✓ No reflejado' }}
            </span>
          </div>
          <span class="eval-sub" v-if="resolvedFinding.isReflected !== undefined">
            Reflejo en cliente: {{ resolvedFinding.isReflected ? 'Detectado' : 'Ausente' }}
          </span>
        </div>

        <!-- Insertion Location -->
        <div class="eval-card">
          <span class="eval-card-k">Ruta de Inserción (Payload Path)</span>
          <code class="insertion-path-badge font-mono">
            {{ resolvedInsertionPath || 'N/A' }}
          </code>
          <span class="eval-sub">
            Inyectado en payload: {{ resolvedFinding.insertion ? 'Sí (Activo)' : 'No' }}
          </span>
        </div>
      </div>

      <!-- Vector Catalog Metadata Specification -->
      <div class="spec-metadata-card">
        <div class="meta-section-title">
          <Crosshair class="icon-sm text-secondary" />
          <span>Ficha Técnica del Vector de Ataque</span>
        </div>

        <div class="meta-properties-grid">
          <div class="meta-prop">
            <span class="p-k">ID en Catálogo:</span>
            <span class="p-v font-mono">{{ resolvedVector.id ?? '---' }}</span>
          </div>
          <div class="meta-prop">
            <span class="p-k">Subcategoría:</span>
            <span class="p-v">{{ resolvedVector.subcategory || resolvedVector.category || 'N/A' }}</span>
          </div>
          <div class="meta-prop">
            <span class="p-k">Contexto Objetivo:</span>
            <span class="p-v">{{ resolvedVector.context || 'N/A' }}</span>
          </div>
          <div class="meta-prop">
            <span class="p-k">Técnica Específica:</span>
            <span class="p-v">{{ resolvedVector.technique || 'N/A' }}</span>
          </div>
          <div class="meta-prop full-width" v-if="resolvedVector.browser_specific && resolvedVector.browser_specific.length > 0">
            <span class="p-k">Navegadores Específicos:</span>
            <div class="browser-tags">
              <span v-for="b in resolvedVector.browser_specific" :key="b" class="browser-pill">
                {{ b }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Finding Explanation & Tags -->
      <div v-if="resolvedFinding.description" class="spec-metadata-card">
        <div class="meta-section-title">
          <Info class="icon-sm text-accent" />
          <span>Diagnóstico y Hallazgo del Oráculo</span>
        </div>
        <p class="finding-desc-text">{{ resolvedFinding.description }}</p>

        <div class="finding-tags-list" v-if="allTags.length > 0">
          <span v-for="tag in allTags" :key="tag" class="tag-pill">
            #{{ tag }}
          </span>
        </div>
      </div>

      <!-- Actionable Recommendations -->
      <div v-if="hasRecommendations" class="rec-card">
        <div class="rec-header">
          <Lightbulb class="icon-sm text-warning" />
          <span class="rec-title">Recomendaciones de Mitigación y Remediación:</span>
        </div>

        <div class="rec-body">
          <ul v-if="Array.isArray(recommendations)" class="rec-list">
            <li v-for="(rec, idx) in recommendations" :key="idx" class="rec-item">
              <ChevronRight class="icon-xs text-accent" />
              <span>{{ rec }}</span>
            </li>
          </ul>
          <p v-else class="rec-single">
            {{ recommendations }}
          </p>
        </div>
      </div>

      <!-- Injected Script Box -->
      <div class="script-card" v-if="resolvedScript">
        <div class="script-header">
          <div class="script-title-group">
            <Terminal class="icon-xs text-secondary" />
            <span class="script-title">Payload / Script Inyectado:</span>
          </div>
          <div class="script-actions">
            <button class="btn-toggle-raw" @click="showRawScript = !showRawScript" v-if="resolvedVector.script">
              {{ showRawScript ? 'Ver Decodificado' : 'Ver Base64' }}
            </button>
            <button class="btn-copy-small" @click="handleCopyScript">
              <Copy class="icon-xs" />
              <span>{{ copied ? '¡Copiado!' : 'Copiar Script' }}</span>
            </button>
          </div>
        </div>

        <pre v-if="showRawScript" class="json-code script-code base64-view"><code>{{ resolvedVector.script }}</code></pre>
        <pre v-else class="json-code script-code"><code>{{ decodedScript }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  ShieldCheck,
  Crosshair,
  Info,
  Lightbulb,
  Terminal,
  Copy,
  ChevronRight,
  RefreshCw
} from 'lucide-vue-next'
import {
  parseSeverity,
  outcomeDefinitions,
  reflectionDefinitions,
  getVerdictInfo,
  decodePayload,
  copyToClipboard
} from './fuzzUtils'

const props = defineProps({
  vectorData: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const showRawScript = ref(false)
const copied = ref(false)

const hasVector = computed(() => {
  if (!props.vectorData) return false
  // Check if injectionVector or vectorApplied or VEC is present and not empty
  if (props.vectorData.vectorApplied) return true
  if (props.vectorData.finding && props.vectorData.finding.verdict) return true
  if (props.vectorData.VEC && (props.vectorData.VEC.type || props.vectorData.VEC.vectorApplied)) return true
  return false
})

const resolvedVector = computed(() => {
  const d = props.vectorData || {}
  return d.vectorApplied || d.VEC?.vectorApplied || d.VEC || d.vector || {}
})

const resolvedFinding = computed(() => {
  const d = props.vectorData || {}
  if (d.finding) return d.finding
  // Backward compatibility with VEC
  if (d.VEC) {
    return {
      reflection: d.VEC.reflection || 'NONE',
      outcome: d.VEC.outcome || (d.statusCode ? (d.statusCode < 300 ? 'ACCEPTED' : 'REJECTED') : 'UNKNOWN'),
      verdict: d.VEC.verdict || (d.VEC.insertion ? 'POTENTIAL_INJECTION' : 'BLOCKED'),
      confidence: d.VEC.confidence ?? 0.1,
      severity: d.VEC.severity || { name: 'low', value: 1 },
      insertion: d.VEC.insertion ?? true,
      description: d.VEC.description,
      tags: d.VEC.tags || []
    }
  }
  return {}
})

const resolvedStatusCode = computed(() => {
  return props.vectorData?.statusCode || '---'
})

const resolvedInsertionPath = computed(() => {
  return props.vectorData?.insertionPath || props.vectorData?.VEC?.insertionPath || null
})

const verdictInfo = computed(() => {
  const v = resolvedFinding.value.verdict || 'INCONCLUSIVE'
  return getVerdictInfo(v)
})

const outcomeInfo = computed(() => {
  const o = resolvedFinding.value.outcome || 'UNKNOWN'
  return outcomeDefinitions[o] || outcomeDefinitions.UNKNOWN
})

const isReflected = computed(() => {
  const r = resolvedFinding.value.reflection
  return r && r !== 'NONE'
})

const formattedReflection = computed(() => {
  const r = resolvedFinding.value.reflection
  return reflectionDefinitions[r] || r || 'No Reflejado'
})

const confidenceVal = computed(() => {
  const c = resolvedFinding.value.confidence
  if (typeof c === 'number') return Math.max(0, Math.min(0.7, c))
  return 0.1
})

const confidenceDisplay = computed(() => {
  return confidenceVal.value.toFixed(2)
})

const confidencePercent = computed(() => {
  // percentage out of 0.70 max
  return Math.min(100, Math.round((confidenceVal.value / 0.7) * 100))
})

const allTags = computed(() => {
  const tSet = new Set()
  if (Array.isArray(resolvedFinding.value.tags)) {
    resolvedFinding.value.tags.forEach(t => tSet.add(t))
  }
  if (Array.isArray(resolvedVector.value.tags)) {
    resolvedVector.value.tags.forEach(t => tSet.add(t))
  }
  return Array.from(tSet)
})

const recommendations = computed(() => {
  return props.vectorData?.recommendation || resolvedFinding.value.recommendation || null
})

const hasRecommendations = computed(() => {
  const r = recommendations.value
  if (!r) return false
  if (Array.isArray(r)) return r.length > 0
  return typeof r === 'string' && r.trim().length > 0
})

const resolvedScript = computed(() => {
  return resolvedVector.value.script || resolvedVector.value.scriptDecoded || null
})

const decodedScript = computed(() => {
  if (resolvedVector.value.scriptDecoded) return resolvedVector.value.scriptDecoded
  return decodePayload(resolvedVector.value.script)
})

const handleCopyScript = async () => {
  const text = showRawScript.value ? resolvedVector.value.script : decodedScript.value
  if (!text) return
  const ok = await copyToClipboard(text)
  if (ok) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<style scoped>
.fuzz-vector {
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

.clean-no-vector {
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.no-vec-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.no-vec-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vector-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Vector Hero */
.vector-hero-card {
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.25);
}

.vector-hero-card.verdict-potential {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.12), rgba(0, 0, 0, 0.35));
  border-color: rgba(248, 113, 113, 0.4);
}

.vector-hero-card.verdict-reflected {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(0, 0, 0, 0.35));
  border-color: rgba(251, 146, 60, 0.4);
}

.vector-hero-card.verdict-blocked {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.12), rgba(0, 0, 0, 0.35));
  border-color: rgba(74, 222, 128, 0.4);
}

.vector-hero-card.verdict-no-reflection {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.12), rgba(0, 0, 0, 0.35));
  border-color: rgba(96, 165, 250, 0.4);
}

.hero-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.attack-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.attack-type-pill {
  font-size: 13px;
  font-weight: 800;
  font-family: monospace;
  background: rgba(248, 113, 113, 0.25);
  color: #f87171;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.attack-titles {
  display: flex;
  flex-direction: column;
}

.attack-main-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.attack-owasp {
  font-size: 11px;
  color: var(--text-secondary);
}

.hero-verdict-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.verdict-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  text-transform: uppercase;
}

.verdict-potential { background: rgba(248, 113, 113, 0.25); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); }
.verdict-reflected { background: rgba(251, 146, 60, 0.25); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.4); }
.verdict-blocked { background: rgba(74, 222, 128, 0.25); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.4); }
.verdict-no-reflection { background: rgba(96, 165, 250, 0.25); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.4); }
.verdict-error { background: rgba(248, 113, 113, 0.25); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); }
.verdict-inconclusive { background: rgba(148, 163, 184, 0.25); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }

.verdict-desc {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

/* Confidence Gauge */
.confidence-container {
  background: rgba(0, 0, 0, 0.3);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.confidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.conf-label {
  color: var(--text-secondary);
}

.conf-value {
  color: var(--accent-secondary);
}

.confidence-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #60a5fa, #4ade80);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.confidence-disclaimer {
  font-size: 10px;
  color: var(--text-muted);
}

/* Evaluation Grid */
.eval-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (max-width: 768px) {
  .eval-grid {
    grid-template-columns: 1fr;
  }
}

.eval-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eval-card-k {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
}

.eval-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.outcome-pill {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  width: fit-content;
}

.outcome-accepted { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
.outcome-rejected { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.outcome-error { background: rgba(248, 113, 113, 0.2); color: #f87171; }
.outcome-unknown { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }

.reflection-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reflection-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.reflection-badge.reflected {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.refl-flag {
  font-size: 11px;
  font-weight: 600;
}

.insertion-path-badge {
  font-size: 12px;
  color: var(--accent-secondary);
  background: rgba(0, 0, 0, 0.3);
  padding: 3px 8px;
  border-radius: 4px;
  width: fit-content;
  word-break: break-all;
}

/* Spec Metadata */
.spec-metadata-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.meta-properties-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.meta-properties-grid .full-width {
  grid-column: 1 / -1;
}

.meta-prop {
  background: rgba(0, 0, 0, 0.3);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.p-k {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.p-v {
  font-size: 13px;
  color: var(--text-primary);
}

.browser-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.browser-pill {
  font-size: 11px;
  font-family: monospace;
  background: rgba(96, 165, 250, 0.15);
  color: var(--accent-secondary);
  padding: 2px 8px;
  border-radius: 4px;
}

.finding-desc-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

.finding-tags-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-pill {
  font-size: 10px;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.4);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

/* Recommendations */
.rec-card {
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

/* Injected Script Card */
.script-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.script-header {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.script-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.script-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.script-actions {
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

.script-code {
  background: #09090f;
  padding: 12px 16px;
  color: #a6accd;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
}

.base64-view {
  color: #fbbf24;
}

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

