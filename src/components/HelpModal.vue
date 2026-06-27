<template>
  <!-- ヘルプモーダル -->
  <Transition name="mob-fade">
    <div v-if="modelValue" class="help-backdrop" @click.self="emit('update:modelValue', false)">
      <div class="help-modal">
        <button class="help-close" @click="emit('update:modelValue', false)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M1 1l12 12M13 1L1 13"/>
          </svg>
        </button>

        <div class="help-hero">
          <div class="help-app-name">ルートスナップ</div>
          <div class="help-tagline">旅の移動ルートをビジュアルで共有</div>
        </div>

        <div class="help-steps">
          <div class="help-step">
            <div class="help-step-num">1</div>
            <div class="help-step-body">
              <div class="help-step-title">地図をタップしてポイントを追加</div>
              <div class="help-step-desc">行った場所・行く場所をマークする。ポイント間のルートは自動で引かれる。</div>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">2</div>
            <div class="help-step-body">
              <div class="help-step-title">再生してアニメーションを確認</div>
              <div class="help-step-desc">アイコンがルートに沿って移動する。速度やアイコン画像は自由に変えられる。</div>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">3</div>
            <div class="help-step-body">
              <div class="help-step-title">一時停止 → 保存で画像を出力</div>
              <div class="help-step-desc">ルートとアイコンが収まった縦長画像（9:16）が生成される。インスタのストーリーにそのまま使える。</div>
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">ポイントの種類</div>
          <div class="help-type-row">
            <div class="help-dot help-dot--main">1</div>
            <div>
              <div class="help-type-name">メイン</div>
              <div class="help-type-desc">主要な目的地。ラベルをつけられる。保存画像に表示される。</div>
            </div>
          </div>
          <div class="help-type-row">
            <div class="help-dot help-dot--sub">2</div>
            <div>
              <div class="help-type-name">サブ</div>
              <div class="help-type-desc">経由地。ルートの精度を上げるためのポイント。保存画像には出ない。</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

// suppress unused props lint
void props
</script>

<style scoped>
/* ヘルプモーダル */
.help-backdrop {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.help-modal {
  background: rgba(16,16,16,0.98);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  width: min(380px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: none;
  position: relative;
}

.help-modal::-webkit-scrollbar { display: none; }

.help-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  background: rgba(255,255,255,0.07);
  border: none;
  border-radius: 50%;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  z-index: 1;
}
.help-close:hover { background: rgba(255,255,255,0.14); color: white; }

.help-hero {
  padding: 32px 24px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.help-app-name {
  font-size: 22px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.03em;
  margin-bottom: 6px;
}

.help-tagline {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
}

.help-steps {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.help-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.help-step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.help-step-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.help-step-desc {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  line-height: 1.6;
}

.help-section {
  padding: 20px 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.help-section-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.help-type-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.help-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  border: 2px solid rgba(255,255,255,0.4);
  flex-shrink: 0;
  margin-top: 2px;
}

.help-dot--main { background: #0d6efd; color: white; }
.help-dot--sub { background: #ffc107; color: #212529; }

.help-type-name {
  font-size: 13px;
  font-weight: 600;
  color: white;
  margin-bottom: 3px;
}

.help-type-desc {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  line-height: 1.6;
}

/* Transition */
.mob-fade-enter-active, .mob-fade-leave-active { transition: opacity 0.2s; }
.mob-fade-enter-from, .mob-fade-leave-to { opacity: 0; }
</style>
