<template>
  <router-view></router-view>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSocketStore } from './store/socketStore'

const socketStore = useSocketStore()

onMounted(() => {
  socketStore.connect()
})
</script>

<style>
/* Reset basic from Vite removed */
</style>
