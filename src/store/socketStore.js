import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

export const useSocketStore = defineStore('socket', {
  state: () => ({
    socket: null,
    isConnected: false,
    eventsLog: [],
    metrics: {
      totalCasesCreated: 0,
      casesByOperation: {}, // format: { 'addPet': 25, 'updatePet': 10 }
      engineConfig: null, // Guardará la config del ataque (phases, scenarios)
      totalResponses: 0,
      statusCodesByOperation: {}, // format: { 'addPet': { 200: 5, 400: 2, 500: 1 } }
      schemaResponsesByOperation: {}, // format: { 'createUser': { total: 10, byMatchType: {...}, bySeverityName: {...}, byStatusCode: {...} } }
      validityMatrix: {
        validSuccess: 0,    // isValid=true  + 2xx → Esperado
        validError: 0,      // isValid=true  + 4xx/5xx → Bug potencial
        invalidRejected: 0, // isValid=false + 4xx/5xx → Esperado
        invalidAccepted: 0  // isValid=false + 2xx → Vulnerabilidad
      },
      falsePositives: {
        byLevel: { 1: 0, 2: 0, 3: 0, 4: 0 }, // 1:LOW, 2:MEDIUM, 3:HIGH, 4:CRITICAL, 5:INFO
        byOperation: {},  // { 'addPet': { 1:2, 2:1, 3:5 } }
        recent: []         // Últimos 20 eventos con detalle
      }
    }
  }),

  actions: {
    connect() {
      if (this.socket && this.socket.connected) return

      this.socket = io('http://localhost:3002', {
        transports: ['websocket', 'polling']
      })

      this.socket.on('connect', () => {
        this.isConnected = true
        console.log('Socket conectado:', this.socket.id)
      })

      this.socket.on('disconnect', () => {
        this.isConnected = false
        console.log('Socket desconectado')
      })

      this.socket.on('jdozer:fuzzer', (rawData) => {
        try {
          const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          const entityType = data?.headers?.entityType;
          const eventType = data?.headers?.eventType;

          if (!eventType || !entityType) return;

          const routeKey = `${entityType}:${eventType}`;

          this.eventsLog.unshift({
            time: new Date().toLocaleTimeString(),
            type: routeKey,
            payload: data.payload
          });
          if (this.eventsLog.length > 50) this.eventsLog.pop();

          // Procesar métricas específicas
          switch (routeKey) {
            case 'counts:total-cases':
              this.handleTotalCases(data.payload);
              break;
            case 'fuzzer-engine:engine-started':
            case 'fuzzer-engine:config':
              this.handleEngineStarted(data.payload);
              break;
            case 'schema-response:status-code':
              this.handleStatusCode(data.payload);
              break;
            case 'fuzzing-case:validation':
              this.handleReqResMerged(data.payload);
              break;
            case 'schema-request:payload':
              this.handleFalsePositive(data.payload);
              break;
          }
        } catch (e) {
          console.error("Error procesando evento socket:", e);
        }
      })
    },

    disconnect() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
      }
    },

    handleTotalCases(payload) {
      if (payload && payload.total !== undefined) {
        this.metrics.totalCasesCreated = payload.total;

        const perOps = payload.perOperations || payload;
        const casesByOp = {};

        for (const [op, props] of Object.entries(perOps)) {
          if (op === 'total') continue;
          if (typeof props === 'object' && props !== null) {
            let opTotal = 0;
            for (const val of Object.values(props)) {
              opTotal += Number(val) || 0;
            }
            casesByOp[op] = opTotal;
          } else if (typeof props === 'number') {
            casesByOp[op] = props;
          }
        }
        this.metrics.casesByOperation = casesByOp;
      }
    },

    handleEngineStarted(payload) {
      if (payload) {
        this.metrics.engineConfig = {
          phases: payload.phases || [],
          scenarios: payload.scenarios || {}
        };
      }
    },

    handleStatusCode(payload) {
      const operationId = payload?.operationId;
      const statusCode = payload?.statusCode;

      if (!operationId || statusCode === undefined) return;
      this.metrics.totalResponses++;
      const updated = JSON.parse(JSON.stringify(this.metrics.statusCodesByOperation));

      if (!updated[operationId]) {
        updated[operationId] = {};
      }

      if (!updated[operationId][statusCode]) {
        updated[operationId][statusCode] = 0;
      }

      updated[operationId][statusCode]++;
      this.metrics.statusCodesByOperation = updated;

      // Actualizar contadores de OpenAPI Schema Response por Operación
      const matchType = payload.matchType || 'none';
      const matched = payload.matched !== undefined ? String(payload.matched) : '-';
      const severity = payload.severity !== undefined ? payload.severity : 1;
      const severityName = payload.severityName || (
        severity <= 2 ? 'info' : severity === 3 ? 'low' : severity === 4 ? 'medium' : 'high'
      );

      const updatedSchema = JSON.parse(JSON.stringify(this.metrics.schemaResponsesByOperation || {}));
      
      if (!updatedSchema[operationId]) {
        updatedSchema[operationId] = {
          total: 0,
          byMatchType: { exact: 0, wildcard: 0, default: 0, '5xx': 0, none: 0 },
          bySeverityName: { info: 0, low: 0, medium: 0, high: 0 },
          byStatusCode: {}
        };
      }

      const opData = updatedSchema[operationId];
      opData.total++;

      if (opData.byMatchType[matchType] !== undefined) {
        opData.byMatchType[matchType]++;
      } else {
        opData.byMatchType[matchType] = 1;
      }

      if (opData.bySeverityName[severityName] !== undefined) {
        opData.bySeverityName[severityName]++;
      } else {
        opData.bySeverityName[severityName] = 1;
      }

      if (!opData.byStatusCode[statusCode]) {
        opData.byStatusCode[statusCode] = {
          count: 0,
          matched,
          matchType,
          severity,
          severityName
        };
      }
      opData.byStatusCode[statusCode].count++;

      this.metrics.schemaResponsesByOperation = updatedSchema;
    },

    handleReqResMerged(payload) {
      if (!payload || payload.isValidRequest === undefined || payload.statusCode === undefined) return;

      const isValid = payload.isValidRequest;
      const code = Number(payload.statusCode);
      const isSuccess = code >= 200 && code < 300;

      const updated = { ...this.metrics.validityMatrix };

      if (isValid && isSuccess) {
        updated.validSuccess++;
      } else if (isValid && !isSuccess) {
        updated.validError++;
      } else if (!isValid && !isSuccess) {
        updated.invalidRejected++;
      } else if (!isValid && isSuccess) {
        updated.invalidAccepted++;
      }

      this.metrics.validityMatrix = updated;
    },

    handleFalsePositive(payload) {
      if (!payload || payload.severity === undefined) return;

      const level = payload.severity;
      const operationId = payload.operationId || 'unknown';

      const byLevel = { ...this.metrics.falsePositives.byLevel };
      byLevel[level] = (byLevel[level] || 0) + 1;

      const byOperation = JSON.parse(JSON.stringify(this.metrics.falsePositives.byOperation));
      if (!byOperation[operationId]) {
        byOperation[operationId] = { 1: 0, 2: 0, 3: 0, 4: 0 };
      }
      byOperation[operationId][level] = (byOperation[operationId][level] || 0) + 1;

      const recent = [{
        time: new Date().toLocaleTimeString(),
        operationId,
        riskLevel: level,
        context: payload.type,
        details: `${payload.operationId}`,
        statusCode: payload.statusCode
      }, ...this.metrics.falsePositives.recent].slice(0, 20);

      this.metrics.falsePositives = { byLevel, byOperation, recent };
    },

    clearMetrics() {
      this.eventsLog = [];
      this.metrics = {
        totalCasesCreated: 0,
        casesByOperation: {},
        engineConfig: null,
        totalResponses: 0,
        statusCodesByOperation: {},
        schemaResponsesByOperation: {},
        validityMatrix: {
          validSuccess: 0,
          validError: 0,
          invalidRejected: 0,
          invalidAccepted: 0
        },
        falsePositives: {
          byLevel: { 1: 0, 2: 0, 3: 0, 4: 0 },
          byOperation: {},
          recent: []
        }
      };
    }
  }
})
