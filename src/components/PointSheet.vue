<template>
  <!-- ポイント追加シート backdrop -->
  <Transition name="mob-fade">
    <div v-if="modelValue" class="point-sheet-backdrop" @click="emit('confirm')"></div>
  </Transition>

  <!-- ポイント追加シート -->
  <Transition name="mob-slide">
    <div v-if="modelValue" class="point-sheet">
      <div class="sheet-handle-bar"></div>
      <div class="point-sheet-body">
        <div class="point-sheet-row">
          <div class="point-dot" :class="modelValue.isMain ? 'point-dot--main' : 'point-dot--sub'">
            {{ modelValue.order }}
          </div>
          <div v-if="modelValue.order > 1" class="type-toggle-pill">
            <button class="type-btn" :class="{ active: modelValue.isMain }"
              @click="emit('update:modelValue', { ...modelValue, isMain: true })">メイン</button>
            <button class="type-btn" :class="{ active: !modelValue.isMain }"
              @click="emit('update:modelValue', { ...modelValue, isMain: false })">サブ</button>
          </div>
          <span v-else class="point-type-fixed">メイン（固定）</span>
        </div>
        <input v-if="modelValue.isMain" ref="inputRef" type="text" :value="modelValue.label"
          placeholder="ラベルを入力（任意）" class="point-sheet-input"
          @input="emit('update:modelValue', { ...modelValue, label: ($event.target as HTMLInputElement).value })"
          @keydown.enter="emit('confirm')" />
        <button class="point-sheet-confirm" @click="emit('confirm')">完了</button>
        <button class="point-sheet-delete" @click="emit('delete')">このポイントを削除</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

export interface PointSheetData {
  id: string
  label: string
  isMain: boolean
  order: number
}

const props = defineProps<{
  modelValue: PointSheetData | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: PointSheetData | null): void
  (e: 'confirm'): void
  (e: 'delete'): void
}>()

// suppress unused props lint
void props

const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      nextTick(() => inputRef.value?.focus())
    }
  },
)
</script>

<style scoped>
/* ポイント追加シート */
.point-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 28;
  background: rgba(0,0,0,0.4);
}

.point-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  background: rgba(18, 18, 18, 0.97);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border-top: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(24px);
  flex-direction: column;
  padding-bottom: max(24px, env(safe-area-inset-bottom));
  display: flex;
}

.sheet-handle-bar {
  width: 36px;
  height: 4px;
  background: rgba(255,255,255,0.25);
  border-radius: 2px;
  margin: 12px auto 6px;
  flex-shrink: 0;
}

.point-sheet-body {
  padding: 12px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.point-sheet-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.point-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: white;
  border: 2px solid rgba(255,255,255,0.8);
  flex-shrink: 0;
}

.point-dot--main { background: #0d6efd; }
.point-dot--sub { background: #ffc107; color: #212529; }

.type-toggle-pill {
  display: flex;
  background: rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 3px;
}

.type-btn {
  padding: 6px 18px;
  border-radius: 16px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.type-btn.active {
  background: rgba(255,255,255,0.15);
  color: white;
}

.point-type-fixed {
  color: rgba(255,255,255,0.3);
  font-size: 12px;
}

.point-sheet-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  color: white;
  font-size: 16px;
  padding: 14px 16px;
  outline: none;
  transition: border-color 0.15s;
}

.point-sheet-input::placeholder { color: rgba(255,255,255,0.2); }
.point-sheet-input:focus { border-color: rgba(255,255,255,0.3); }

.point-sheet-confirm {
  width: 100%;
  height: 52px;
  background: white;
  color: #111;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.point-sheet-confirm:active { opacity: 0.8; }

.point-sheet-delete {
  width: 100%;
  height: 44px;
  background: transparent;
  color: rgba(255, 80, 80, 0.8);
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.point-sheet-delete:active {
  background: rgba(255, 80, 80, 0.1);
  color: rgba(255, 80, 80, 1);
}

/* Transition */
.mob-fade-enter-active, .mob-fade-leave-active { transition: opacity 0.2s; }
.mob-fade-enter-from, .mob-fade-leave-to { opacity: 0; }

.mob-slide-enter-active, .mob-slide-leave-active { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
.mob-slide-enter-from, .mob-slide-leave-to { transform: translateY(100%); }
</style>
