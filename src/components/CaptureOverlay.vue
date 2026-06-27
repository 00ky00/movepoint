<template>
  <!-- キャプチャ待機オーバーレイ -->
  <Transition name="mob-fade">
    <div v-if="isCapturing" class="capture-overlay">
      <div class="capture-spinner"></div>
      <span class="capture-text">準備中...</span>
    </div>
  </Transition>

  <!-- 画像プレビュー: PC モーダル -->
  <div v-if="showImageModal" class="modal-backdrop image-modal-backdrop pc-only" @click.self="emit('update:showImageModal', false)">
    <div class="image-modal-box">
      <button class="image-modal-close" @click="emit('update:showImageModal', false)">✕</button>
      <img :src="capturedImageUrl" class="image-modal-preview" />
      <p class="image-modal-hint">右クリック → 画像を保存</p>
      <a :href="capturedImageUrl" download="movepoint.png" class="image-modal-download">ダウンロード</a>
    </div>
  </div>

  <!-- 画像プレビュー: モバイル全画面 -->
  <div v-if="showImageModal" class="mob-image-fullscreen sp-only">
    <button class="mob-image-close" @click="emit('update:showImageModal', false)">✕</button>
    <img :src="capturedImageUrl" class="mob-image-img" />
    <p class="mob-image-hint">長押しで保存</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isCapturing: boolean
  showImageModal: boolean
  capturedImageUrl: string
}>()

const emit = defineEmits<{
  (e: 'update:showImageModal', val: boolean): void
}>()

// suppress unused props lint
void props
</script>

<style scoped>
/* PC/SP 出し分け */
.sp-only { display: none; }

@media (max-width: 640px) {
  .pc-only { display: none !important; }
  .sp-only { display: flex; }
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  backdrop-filter: blur(4px);
}

.image-modal-backdrop {
  background: rgba(0, 0, 0, 0.85);
}

.image-modal-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-height: 92vh;
  position: relative;
}

.image-modal-close {
  position: absolute;
  top: -8px;
  right: -8px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.image-modal-preview {
  max-height: 75vh;
  max-width: 90vw;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.image-modal-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin: 0;
  text-align: center;
}

.image-modal-download {
  color: white;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 20px;
  border-radius: 20px;
  text-decoration: none;
  transition: background 0.15s;
}

.image-modal-download:hover { background: rgba(255, 255, 255, 0.25); }

/* キャプチャ待機オーバーレイ */
.capture-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.capture-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.capture-text {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  font-weight: 500;
}

/* モバイル全画面プレビュー */
.mob-image-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: black;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.mob-image-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mob-image-close {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  right: 16px;
  z-index: 51;
  width: 36px;
  height: 36px;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  font-size: 16px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mob-image-hint {
  position: absolute;
  bottom: max(24px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}

/* Transition */
.mob-fade-enter-active, .mob-fade-leave-active { transition: opacity 0.2s; }
.mob-fade-enter-from, .mob-fade-leave-to { opacity: 0; }
</style>
