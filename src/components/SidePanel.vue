<template>
  <div class="side-panel p-3">
    <h6 class="fw-bold mb-2">ウェイポイント</h6>

    <p v-if="store.waypoints.length === 0" class="text-muted small">
      地図をクリックしてポイントを追加
    </p>

    <ul class="list-group list-group-flush">
      <li
        v-for="wp in store.waypoints"
        :key="wp.id"
        class="list-group-item px-0 d-flex align-items-center gap-2"
      >
        <span
          class="badge rounded-pill"
          :class="wp.type === 'main' ? 'bg-primary' : 'bg-warning text-dark'"
        >
          {{ wp.order }}
        </span>

        <span class="flex-grow-1 small text-truncate">
          {{ wp.lat.toFixed(4) }}, {{ wp.lng.toFixed(4) }}
        </span>

        <button
          v-if="wp.order !== 1"
          class="btn btn-sm"
          :class="wp.type === 'main' ? 'btn-outline-primary' : 'btn-outline-warning'"
          @click="store.toggleType(wp.id)"
        >
          {{ wp.type === 'main' ? 'メイン' : 'サブ' }}
        </button>
        <span v-else class="badge bg-primary">メイン</span>

        <button
          class="btn btn-sm btn-outline-danger"
          @click="store.removeWaypoint(wp.id)"
        >
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useMapStore } from '../stores/mapStore'

const store = useMapStore()
</script>

<style scoped>
.side-panel {
  width: 280px;
  height: 100%;
  overflow-y: auto;
}

.list-group-item {
  background: transparent;
}
</style>
