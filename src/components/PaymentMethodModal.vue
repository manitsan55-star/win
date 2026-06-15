<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="payment-modal-card">
      <div class="payment-header">
        <h2>วิธีชำระเงิน</h2>
        <button type="button" class="close-button" @click="$emit('close')">&times;</button>
      </div>

      <p class="payment-message">{{ settings.paymentMessage }}</p>

      <div class="price-row">
        <span class="price-tag">เดือน 200฿</span>
        <span class="price-tag">ปี 2,000฿</span>
      </div>

      <div class="qr-section">
        <h3>QR Code โอนเงิน</h3>
        <img v-if="settings.transferQrImage" :src="settings.transferQrImage" alt="QR Code" class="qr-image" />
        <div v-else class="qr-placeholder">ยังไม่มี QR Code</div>
      </div>

      <p class="payment-note">โอนแล้วอัปโหลดสลิปด้านล่าง</p>

      <div class="slip-section">
        <h3>อัปโหลดสลิป</h3>
        <label class="file-label">
          <input type="file" accept="image/*" :disabled="isSubmitting" @change="handleSlipChange" />
          <span>{{ isSubmitting ? 'กำลังอัปโหลด...' : 'เลือกไฟล์สลิป' }}</span>
        </label>
        <img v-if="slipPreview" :src="slipPreview" alt="Slip preview" class="slip-thumb" />
        <div v-if="errorMessage" class="msg error">{{ errorMessage }}</div>
        <div v-if="successMessage" class="msg success">{{ successMessage }}</div>
        <button type="button" class="upload-btn" :disabled="isSubmitting || !slipPreview" @click="submitSlip">
          ส่งสลิปให้แอดมิน
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { restoreSession } from '@/utils/auth';
import { readFileAsDataUrl, uploadPaymentSlip } from '@/utils/payment';

export default {
  name: 'PaymentMethodModal',
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    settings: {
      type: Object,
      default: () => ({
        transferQrImage: '',
        paymentMessage: 'กรุณาโอนเงินตาม QR Code และอัปโหลดสลิปการโอนเงินด้านล่าง',
      }),
    },
  },
  emits: ['close'],
  data() {
    return {
      slipPreview: '',
      isSubmitting: false,
      errorMessage: '',
      successMessage: '',
    };
  },
  watch: {
    open(value) {
      if (value) {
        this.errorMessage = '';
        this.successMessage = '';
      }
    },
  },
  methods: {
    async handleSlipChange(event) {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      this.errorMessage = '';
      this.successMessage = '';

      try {
        this.slipPreview = await readFileAsDataUrl(file);
      } catch (error) {
        this.errorMessage = error.message || 'ไม่สามารถอ่านไฟล์สลิปได้';
      } finally {
        event.target.value = '';
      }
    },
    async submitSlip() {
      if (!this.slipPreview) {
        this.errorMessage = 'กรุณาเลือกไฟล์สลิปก่อน';
        return;
      }

      this.isSubmitting = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        await restoreSession();
        await uploadPaymentSlip(this.slipPreview);
        this.successMessage = 'ส่งสลิปให้แอดมินแล้ว';
        this.slipPreview = '';
      } catch (error) {
        this.errorMessage = error.message || 'ไม่สามารถส่งสลิปได้';
      } finally {
        this.isSubmitting = false;
      }
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1100;
}

.payment-modal-card {
  width: min(480px, 100%);
  max-height: 85vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.payment-header h2 {
  margin: 0;
  font-size: 1.15rem;
}

.close-button {
  background: transparent;
  border: none;
  font-size: 1.6rem;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.payment-message {
  margin: 0 0 0.75rem;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.5;
}

.price-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.price-tag {
  flex: 1;
  text-align: center;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #111827;
}

.qr-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}

.qr-image {
  width: 100%;
  max-width: 220px;
  display: block;
  margin: 0 auto;
  border-radius: 8px;
  object-fit: contain;
}

.qr-placeholder {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
  font-size: 0.85rem;
}

.payment-note {
  margin: 0.75rem 0;
  color: #4b5563;
  font-size: 0.85rem;
  text-align: center;
}

.slip-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}

.file-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.55rem;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  color: #374151;
  font-size: 0.85rem;
  cursor: pointer;
  background: #f9fafb;
  box-sizing: border-box;
}

.file-label input {
  display: none;
}

.slip-thumb {
  width: 100%;
  max-height: 160px;
  object-fit: contain;
  border-radius: 6px;
  margin-top: 0.5rem;
  background: #f9fafb;
}

.msg {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.msg.error {
  background: #fee2e2;
  color: #991b1b;
}

.msg.success {
  background: #dcfce7;
  color: #166534;
}

.upload-btn {
  width: 100%;
  margin-top: 0.75rem;
  border: none;
  background: #059669;
  color: white;
  padding: 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.upload-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
