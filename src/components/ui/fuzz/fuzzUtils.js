/**
 * Utility functions and terminology mappings for Fuzzing oracles and components.
 * Conforms to OpenAPI schemas:
 * - testCaseSummary-api.yaml
 * - statuCodeDrift-api.yaml
 * - mutationPayload-api.yaml
 * - execution-api.yaml
 * - vector-api.yaml
 */

/**
 * Safely decodes base64 payload strings and formats JSON.
 * @param {string|object} payload
 * @returns {string}
 */
export const decodePayload = (payload) => {
  if (payload === null || payload === undefined) return ''
  if (typeof payload === 'object') return JSON.stringify(payload, null, 2)
  if (typeof payload !== 'string') return String(payload)

  const trimmed = payload.trim()
  if (!trimmed) return ''

  // If already JSON string
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return trimmed
    }
  }

  // Try decoding Base64
  try {
    const decoded = atob(trimmed)
    try {
      return JSON.stringify(JSON.parse(decoded), null, 2)
    } catch {
      return decoded
    }
  } catch {
    return trimmed
  }
}

/**
 * Returns CSS class for HTTP status code.
 * @param {number|string} code
 * @returns {string}
 */
export const getStatusClass = (code) => {
  if (!code) return 'status-other'
  const c = Number(code)
  if (c >= 200 && c < 300) return 'status-2xx'
  if (c >= 300 && c < 400) return 'status-3xx'
  if (c >= 400 && c < 500) return 'status-4xx'
  if (c >= 500) return 'status-5xx'
  return 'status-other'
}

/**
 * Returns severity level name and canonical value (0..4).
 * @param {object|string|number} severity
 * @returns {{ name: string, value: number, label: string, cssClass: string }}
 */
export const parseSeverity = (severity) => {
  if (!severity) {
    return { name: 'info', value: 0, label: 'Informativa', cssClass: 'sev-info' }
  }

  let name = ''
  let value = 0

  if (typeof severity === 'object') {
    name = String(severity.name || '').toLowerCase()
    value = Number(severity.value ?? 0)
  } else if (typeof severity === 'number') {
    value = severity
    const names = ['info', 'low', 'medium', 'high', 'critical']
    name = names[value] || 'info'
  } else if (typeof severity === 'string') {
    name = severity.toLowerCase()
    const map = { info: 0, low: 1, medium: 2, high: 3, critical: 4 }
    value = map[name] ?? 0
  }

  const labelMap = {
    info: 'Informativa',
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica'
  }

  return {
    name: name || 'info',
    value,
    label: labelMap[name] || 'Informativa',
    cssClass: `sev-${name || 'info'}`
  }
}

/**
 * Human-readable translations for MatchType in StatusCodeDrift contract.
 */
export const matchTypeDefinitions = {
  exact: {
    label: 'Match Exacto',
    subLabel: 'Sin Drift',
    description: 'El código de estado observado coincide explícitamente con el definido en el contrato OpenAPI.',
    badgeClass: 'badge-exact'
  },
  '2xx': {
    label: 'Match Wildcard 2xx',
    subLabel: 'Wildcard',
    description: 'El código de estado recibido coincide con una definición comodín 2xx en el contrato.',
    badgeClass: 'badge-wildcard'
  },
  default: {
    label: 'Match por Default',
    subLabel: 'Soft Drift',
    description: 'El código observado no tiene definición explícita, pero coincide con la respuesta default del contrato.',
    badgeClass: 'badge-default'
  },
  none: {
    label: 'Sin Coincidencia',
    subLabel: 'Hard Drift',
    description: 'El código de estado recibido no está definido en el contrato OpenAPI (drift crítico detectado).',
    badgeClass: 'badge-none'
  }
}

export const getMatchTypeInfo = (matchType) => {
  return matchTypeDefinitions[matchType] || {
    label: matchType || 'Desconocido',
    subLabel: 'N/A',
    description: 'Tipo de coincidencia no reconocido.',
    badgeClass: 'badge-none'
  }
}

/**
 * Human-readable translations for ResponseFindingType in TestCaseSummary & PayloadCheck.
 */
export const responseFindingTypeDefinitions = {
  SCHEMA_VALIDATION_ERROR: {
    label: 'Error de Validación de Esquema',
    description: 'El cuerpo de la respuesta viola las restricciones estructurales o de tipo del JSON Schema.'
  },
  UNDOCUMENTED_DATA_LEAK: {
    label: 'Fuga de Datos No Documentada',
    description: 'La respuesta contenía propiedades o datos adicionales no permitidos ni declarados en el contrato (posible exposición de información).'
  },
  MISSING_REQUIRED_FIELD: {
    label: 'Campo Requerido Faltante',
    description: 'Falta un campo declarado como obligatorio en el esquema de respuesta del contrato.'
  },
  TYPE_MISMATCH: {
    label: 'Discrepancia de Tipo',
    description: 'El tipo de dato de una propiedad en la respuesta no coincide con el tipo esperado en el esquema.'
  },
  ENUM_VIOLATION: {
    label: 'Violación de Enumeración',
    description: 'El valor recibido en la respuesta no pertenece al conjunto de valores permitidos en el enum.'
  },
  FORMAT_VIOLATION: {
    label: 'Violación de Formato',
    description: 'El valor viola el formato especificado en el contrato (date-time, email, uri, uuid, etc.).'
  },
  STATUS_CODE_MISMATCH: {
    label: 'Código de Estado No Coincidente',
    description: 'El código HTTP de la respuesta no coincide con los contemplados para este payload.'
  },
  CONTENT_TYPE_MISMATCH: {
    label: 'Content-Type No Coincidente',
    description: 'La cabecera Content-Type de la respuesta no coincide con el tipo MIME especificado en el contrato.'
  },
  UNEXPECTED_EMPTY_BODY: {
    label: 'Cuerpo Vacío Inesperado',
    description: 'Se esperaba un cuerpo de respuesta según el contrato, pero se recibió una respuesta vacía.'
  },
  MISSING_RESPONSE_BODY: {
    label: 'Cuerpo de Respuesta Ausente',
    description: 'La respuesta HTTP recibida no contenía cuerpo (body vacío no documentado).'
  },
  EMPTY_RESPONSE_VALID: {
    label: 'Cuerpo Vacío Válido',
    description: 'El cuerpo de respuesta vacío está explícitamente permitido según el contrato OpenAPI.'
  },
  SCHEMA_VALIDATION_SUCCESS: {
    label: 'Validación de Esquema Exitosa',
    description: 'El cuerpo de la respuesta cumple plenamente con el contrato OpenAPI.'
  },
  UNREADABLE_RESPONSE_PAYLOAD: {
    label: 'Payload de Respuesta Ilegible',
    description: 'El cuerpo de la respuesta no se pudo interpretar ni decodificar como JSON válido.'
  }
}

export const formatResponseFindingType = (type) => {
  return responseFindingTypeDefinitions[type]?.label || type || 'Desconocido'
}

/**
 * Human-readable translations for findingType in MutationPayload contract.
 */
export const mutationFindingTypeDefinitions = {
  type_mismatch: {
    label: 'Discrepancia de Tipo',
    description: 'El tipo de dato no coincide con el esquema (ej. string en vez de integer).'
  },
  missing_required_property: {
    label: 'Propiedad Requerida Faltante',
    description: 'Falta una propiedad declarada como obligatoria (required) en el esquema.'
  },
  unexpected_property: {
    label: 'Propiedad No Documentada / Inesperada',
    description: 'Se envió una propiedad adicional no permitida por additionalProperties: false.'
  },
  constraint_violation: {
    label: 'Violación de Restricción',
    description: 'Se violó una restricción numérica, longitud de string o límites de array.'
  },
  enum_violation: {
    label: 'Violación de Enumeración',
    description: 'El valor no pertenece a la lista de valores permitidos en el enum.'
  },
  format_violation: {
    label: 'Violación de Formato',
    description: 'El valor viola el formato especificado (date-time, email, uri, uuid, etc.).'
  },
  structural_violation: {
    label: 'Violación Estructural',
    description: 'Se violó un esquema compuesto (oneOf, anyOf, allOf).'
  },
  unknown: {
    label: 'Violación No Clasificada',
    description: 'Violación de esquema sin clasificación específica.'
  }
}

export const formatMutationFindingType = (type) => {
  return mutationFindingTypeDefinitions[type]?.label || type || 'Violación'
}

/**
 * Human-readable translations for mutationType in MutationPayload contract.
 */
export const mutationTypeDefinitions = {
  ADD_PROPERTY: 'Adición de Propiedad',
  DELETE_FIELD: 'Eliminación de Campo',
  TYPE_CHANGE: 'Cambio de Tipo',
  VALUE_CHANGE: 'Cambio de Valor',
  OTHER: 'Otra Mutación'
}

export const formatMutationType = (type) => {
  return mutationTypeDefinitions[type] || type || 'Mutación'
}

/**
 * Human-readable translations for Injection Vector Oracle:
 * Outcome, Reflection, Verdict.
 */
export const outcomeDefinitions = {
  ACCEPTED: {
    label: 'Aceptado por Target (2xx)',
    badgeClass: 'outcome-accepted'
  },
  REJECTED: {
    label: 'Rechazado por Target (4xx)',
    badgeClass: 'outcome-rejected'
  },
  SERVER_ERROR: {
    label: 'Error de Servidor (5xx)',
    badgeClass: 'outcome-error'
  },
  UNKNOWN: {
    label: 'Estado Desconocido',
    badgeClass: 'outcome-unknown'
  }
}

export const reflectionDefinitions = {
  CSS_INLINE: 'Estilo CSS Inline',
  HTML_BODY: 'Cuerpo HTML',
  HTML_ATTRIBUTE: 'Atributo HTML',
  JS_STRING: 'String JavaScript',
  JSON_VALUE: 'Valor en JSON',
  NONE: 'No Reflejado'
}

export const verdictDefinitions = {
  POTENTIAL_INJECTION: {
    label: 'Inyección Potencial',
    description: 'Petición aceptada (2xx) y el vector se reflejó en la respuesta sin saneamiento.',
    badgeClass: 'verdict-potential'
  },
  REFLECTED_ONLY: {
    label: 'Solo Reflejado',
    description: 'Petición rechazada (4xx) pero el vector apareció reflejado en la respuesta.',
    badgeClass: 'verdict-reflected'
  },
  BLOCKED: {
    label: 'Bloqueado con Éxito',
    description: 'Petición rechazada y el vector no fue reflejado (defensa de entrada efectiva).',
    badgeClass: 'verdict-blocked'
  },
  NO_REFLECTION: {
    label: 'Sin Reflejo',
    description: 'Petición aceptada pero el vector no apareció en el cuerpo de la respuesta.',
    badgeClass: 'verdict-no-reflection'
  },
  SERVER_ERROR: {
    label: 'Fallo Interno (5xx)',
    description: 'El vector provocó un error interno en el servidor destino.',
    badgeClass: 'verdict-error'
  },
  INCONCLUSIVE: {
    label: 'No Concluyente',
    description: 'La evidencia disponible no permite determinar el resultado con certeza.',
    badgeClass: 'verdict-inconclusive'
  }
}

export const getVerdictInfo = (verdict) => {
  return verdictDefinitions[verdict] || {
    label: verdict || 'Desconocido',
    description: 'Veredicto no especificado.',
    badgeClass: 'verdict-inconclusive'
  }
}

/**
 * Formats unix timestamps into local date & time string.
 * @param {number} timestamp
 * @returns {string}
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A'
  try {
    const d = new Date(Number(timestamp))
    if (isNaN(d.getTime())) return String(timestamp)
    return d.toLocaleString()
  } catch {
    return String(timestamp)
  }
}

/**
 * Copies text to clipboard with a Promise resolution.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export const copyToClipboard = async (text) => {
  if (!text) return false
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    textArea.remove()
    return successful
  } catch (err) {
    console.error('Failed to copy text:', err)
    return false
  }
}

