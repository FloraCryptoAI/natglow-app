// Base para entidades com localStorage
// Replica a interface da Base44: list(), get(), create(), update(), delete()

function generateId() {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function createEntity(name) {
  const KEY = `glow_${name}`;

  return {
    async list(filters = {}) {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Object.keys(filters).length) return data;
      return data.filter(item =>
        Object.entries(filters).every(([key, val]) => item[key] === val)
      );
    },

    async get(id) {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      return data.find(item => item.id === id) || null;
    },

    async create(record) {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      const newRecord = {
        ...record,
        id: generateId(),
        created_date: new Date().toISOString(),
      };
      data.push(newRecord);
      localStorage.setItem(KEY, JSON.stringify(data));
      return newRecord;
    },

    async update(id, updates) {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      const index = data.findIndex(item => item.id === id);
      if (index === -1) throw new Error(`[${name}] registro não encontrado: ${id}`);
      data[index] = { ...data[index], ...updates };
      localStorage.setItem(KEY, JSON.stringify(data));
      return data[index];
    },

    async delete(id) {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      const filtered = data.filter(item => item.id !== id);
      localStorage.setItem(KEY, JSON.stringify(filtered));
    },
  };
}