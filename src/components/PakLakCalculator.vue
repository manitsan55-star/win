<template>
  <div class="paklak-container">
    <div class="paklak-header">
      <h3>ปักหลัก</h3>
    </div>
    
    <div class="paklak-input-section">
      <label for="paklak-input">ใส่ตัวเลข (0-9):</label>
      <input 
        id="paklak-input" 
        v-model="inputNumber" 
        type="number" 
        min="0" 
        max="9" 
        class="paklak-input"
        @input="calculatePakLak"
      />
    </div>

    <div v-if="results.ten.length > 0 || results.hundred.length > 0 || results.unit.length > 0" class="paklak-results">
      <div v-if="results.ten.length > 0" class="paklak-section">
        <h4>ปักหลักสิบ (หลักกลาง = {{ inputNumber }})</h4>
        <div class="paklak-grid">
          <span v-for="num in results.ten" :key="num" class="paklak-number">{{ num }}</span>
        </div>
      </div>

      <div v-if="results.hundred.length > 0" class="paklak-section">
        <h4>ปักหลักร้อย (หลักซ้าย = {{ inputNumber }})</h4>
        <div class="paklak-grid">
          <span v-for="num in results.hundred" :key="num" class="paklak-number">{{ num }}</span>
        </div>
      </div>

      <div v-if="results.unit.length > 0" class="paklak-section">
        <h4>ปักหลักหน่วย (หลักขวา = {{ inputNumber }})</h4>
        <div class="paklak-grid">
          <span v-for="num in results.unit" :key="num" class="paklak-number">{{ num }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PakLakCalculator',
  data() {
    return {
      inputNumber: '',
      results: {
        ten: [],
        hundred: [],
        unit: []
      }
    };
  },
  methods: {
    calculatePakLak() {
      const num = this.inputNumber;
      
      if (num === '' || num < 0 || num > 9) {
        this.results = { ten: [], hundred: [], unit: [] };
        return;
      }

      // ปักหลักสิบ (หลักกลาง = inputNumber)
      // รูปแบบ: X0Y โดย X ≠ 0, Y ≠ 0, และ X ≠ Y
      this.results.ten = [];
      for (let x = 1; x <= 9; x++) {
        for (let y = 1; y <= 9; y++) {
          if (x !== y) {
            this.results.ten.push(`${x}${num}${y}`);
          }
        }
      }

      // ปักหลักร้อย (หลักซ้าย = inputNumber)
      // รูปแบบ: 0XY โดย X ≠ 0, Y ≠ 0, และ X ≠ Y
      this.results.hundred = [];
      for (let x = 1; x <= 9; x++) {
        for (let y = 1; y <= 9; y++) {
          if (x !== y) {
            this.results.hundred.push(`${num}${x}${y}`);
          }
        }
      }

      // ปักหลักหน่วย (หลักขวา = inputNumber)
      // รูปแบบ: XY0 โดย X ≠ 0, Y ≠ 0, และ X ≠ Y
      this.results.unit = [];
      for (let x = 1; x <= 9; x++) {
        for (let y = 1; y <= 9; y++) {
          if (x !== y) {
            this.results.unit.push(`${x}${y}${num}`);
          }
        }
      }
    }
  }
};
</script>

<style scoped>
.paklak-container {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.paklak-header h3 {
  margin: 0 0 20px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.paklak-input-section {
  margin-bottom: 24px;
}

.paklak-input-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.paklak-input {
  width: 100%;
  max-width: 200px;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.paklak-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.paklak-results {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.paklak-section h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 500;
  color: #4b5563;
}

.paklak-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.paklak-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  text-align: center;
  transition: background-color 0.2s, border-color 0.2s;
}

.paklak-number:hover {
  background-color: #e5e7eb;
  border-color: #d1d5db;
}
</style>
