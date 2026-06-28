<template>
  <!-- キャプチャ待機オーバーレイ -->
  <Transition name="mob-fade">
    <div v-if="isCapturing" class="capture-overlay">
      <div class="capture-spinner"></div>
      <span class="capture-text">準備中...</span>
    </div>
  </Transition>

  <!-- 画像プレビュー: PC モーダル -->
  <div v-if="showImageModal"
    class="modal-backdrop image-modal-backdrop pc-only"
    :class="props.theme === 'light' ? 'image-modal-backdrop--light' : ''"
    @click.self="emit('update:showImageModal', false)">
    <div class="image-modal-box">
      <button class="image-modal-close"
        :class="props.theme === 'light' ? 'image-modal-close--light' : ''"
        @click="emit('update:showImageModal', false)"><X :size="13" /></button>
      <img :src="capturedImageUrl" class="image-modal-preview" />
      <div class="image-modal-footer">
        <p class="image-modal-hint" :class="props.theme === 'light' ? 'image-modal-hint--light' : ''">右クリック → 画像を保存</p>
        <a :href="capturedImageUrl" download="routesnap.png"
          class="image-modal-download"
          :class="props.theme === 'light' ? 'image-modal-download--light' : ''">ダウンロード</a>
      </div>
    </div>
  </div>

  <!-- 画像プレビュー: モバイル全画面 -->
  <div v-if="showImageModal" class="mob-image-fullscreen sp-only">
    <img :src="capturedImageUrl" class="mob-image-img" />
    <div class="mob-image-actions">
      <button class="mob-btn mob-btn--back" @click="emit('update:showImageModal', false)">戻る</button>
      <button class="mob-btn mob-btn--save" @click="saveImage">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from '@lucide/vue'

const props = defineProps<{
  isCapturing: boolean
  showImageModal: boolean
  capturedImageUrl: string
  theme?: 'dark' | 'light'
}>()

const emit = defineEmits<{
  (e: 'update:showImageModal', val: boolean): void
}>()

async function saveImage() {
  const dataUrl = props.capturedImageUrl
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], 'routesnap.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return
    }
  } catch { /* share失敗時はdownloadにフォールバック */ }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = 'routesnap.png'
  a.click()
}

void props
</script>

<style scoped>
/* PC/SP 出し分け */
.sp-only { display: none; }

@media (max-width: 640px) {
  .pc-only { display: none !important; }
  .sp-only { display: flex; }
}

/* ── PC モーダル ───────────────────────────── */
.modal-backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  backdrop-filter: blur(4px);
}

.image-modal-backdrop { background: rgba(0, 0, 0, 0.85); }
.image-modal-backdrop--light { background: rgba(240, 240, 245, 0.96); }

.image-modal-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  position: relative;
}

.image-modal-close {
  position: absolute;
  top: -10px;
  right: -10px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.image-modal-close--light { background: rgba(0,0,0,0.08); color: #333; }
.image-modal-close--light:hover { background: rgba(0,0,0,0.14); }

.image-modal-preview {
  max-height: 82vh;
  width: auto;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  display: block;
}

.image-modal-footer {
  display: flex;
  align-items: center;
  gap: 16px;
}

.image-modal-hint {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  margin: 0;
}
.image-modal-hint--light { color: #aaa; }

.image-modal-download {
  color: white;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 7px 22px;
  border-radius: 20px;
  text-decoration: none;
  transition: background 0.15s;
}
.image-modal-download:hover { background: rgba(255, 255, 255, 0.25); }

.image-modal-download--light {
  background: linear-gradient(135deg, #667eea, #764ba2 50%, #ed64a6);
  border: none;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 28px;
  border-radius: 24px;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}
.image-modal-download--light:hover { opacity: 0.9; }

/* ── キャプチャ待機 ────────────────────────── */
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

@keyframes spin { to { transform: rotate(360deg); } }

.capture-text {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  font-weight: 500;
}

/* ── モバイル全画面プレビュー ──────────────── */
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
  width: 100vw;
  height: auto;
  max-height: 100dvh;
  object-fit: contain;
  display: block;
}

.mob-image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 20px max(28px, env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%);
  display: flex;
  gap: 12px;
}

.mob-btn {
  flex: 1;
  padding: 15px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
}
.mob-btn:active { opacity: 0.8; }

.mob-btn--back {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
}

.mob-btn--save {
  background: linear-gradient(135deg, #667eea, #764ba2 50%, #ed64a6);
  border: none;
  color: white;
  box-shadow: 0 4px 16px rgba(102,126,234,0.4);
}

/* Transition */
.mob-fade-enter-active, .mob-fade-leave-active { transition: opacity 0.2s; }
.mob-fade-enter-from, .mob-fade-leave-to { opacity: 0; }
</style>
