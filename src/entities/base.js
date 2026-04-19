function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createEntity(name) {
  const key = `glow_${name}`;

  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  function writeAll(records) {
    localStorage.setItem(key, JSON.stringify(records));
  }

  return {
    async list(filtersOrSort, limit) {
      let records = readAll();
      // If first arg is a plain object, treat as field filters
      if (filtersOrSort && typeof filtersOrSort === 'object' && !Array.isArray(filtersOrSort)) {
        const filters = filtersOrSort;
        records = records.filter(r =>
          Object.entries(filters).every(([k, v]) => r[k] === v)
        );
      }
      // If first arg is a string like '-created_date', sort descending
      if (typeof filtersOrSort === 'string') {
        const desc = filtersOrSort.startsWith('-');
        const field = filtersOrSort.replace(/^-/, '');
        records = [...records].sort((a, b) => {
          if (a[field] < b[field]) return desc ? 1 : -1;
          if (a[field] > b[field]) return desc ? -1 : 1;
          return 0;
        });
      }
      if (typeof limit === 'number') {
        records = records.slice(0, limit);
      }
      return records;
    },

    async filter(filters) {
      const records = readAll();
      return records.filter(r =>
        Object.entries(filters).every(([k, v]) => r[k] === v)
      );
    },

    async get(id) {
      return readAll().find(r => r.id === id) || null;
    },

    async create(record) {
      const records = readAll();
      const newRecord = {
        ...record,
        id: genId(),
        created_date: new Date().toISOString(),
      };
      records.push(newRecord);
      writeAll(records);
      return newRecord;
    },

    async update(id, updates) {
      const records = readAll();
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) throw new Error(`${name} with id ${id} not found`);
      records[idx] = { ...records[idx], ...updates };
      writeAll(records);
      return records[idx];
    },

    async delete(id) {
      const records = readAll().filter(r => r.id !== id);
      writeAll(records);
    },
  };
}