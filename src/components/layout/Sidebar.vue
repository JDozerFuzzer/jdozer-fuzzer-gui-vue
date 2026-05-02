<template>
  <aside class="sidebar glass-panel">
    <div class="sidebar-header">
      <img src="/JDozerFuzzer2.png" alt="JDozerFuzzer" class="logo-img" />
    </div>
    
    <nav class="sidebar-nav">
      <router-link to="/" class="nav-item">
        <LayoutDashboard class="icon" />
        <span>Dashboard</span>
      </router-link>
      <router-link to="/fuzzers/create" class="nav-item">
        <ShieldAlert class="icon" />
        <span>Nuevo Fuzzer</span>
      </router-link>
      <router-link to="/fuzzers/monitor" class="nav-item">
        <Activity class="icon" />
        <span>Monitor</span>
      </router-link>
      <a href="#" class="nav-item disabled">
        <Database class="icon" />
        <span>Vectores</span>
      </a>
      <a href="#" class="nav-item disabled mt-auto">
        <Settings class="icon" />
        <span>Configuración</span>
      </a>
    </nav>
  </aside>
</template>

<script setup>
import { LayoutDashboard, ShieldAlert, Activity, Database, Settings } from 'lucide-vue-next'
</script>

<style scoped>
.sidebar {
  width: 260px;
  height: calc(100vh - 32px);
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
}

.sidebar-header {
  margin-bottom: 40px;
  padding: 0 12px;
  display: flex;
  justify-content: center;
}

.logo-img {
  max-width: 180px;
  height: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.nav-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.nav-item.router-link-active {
  background: var(--accent-primary-glow);
  color: var(--accent-primary);
  border-left: 3px solid var(--accent-primary);
}

.icon {
  width: 20px;
  height: 20px;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mt-auto {
  margin-top: auto;
}
</style>
