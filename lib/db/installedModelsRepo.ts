import type { InstalledModel, ModelBenchmark } from '@/lib/types';
import { getDatabase } from './database';

interface InstalledRow {
  id: string;
  data_json: string;
}

export const installedModelsRepo = {
  async listAll(): Promise<InstalledModel[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<InstalledRow>(
      'SELECT id, data_json FROM installed_models ORDER BY COALESCE(last_used_at, installed_at) DESC'
    );
    const list: InstalledModel[] = [];
    for (const r of rows) {
      try {
        list.push(JSON.parse(r.data_json) as InstalledModel);
      } catch {
        // skip
      }
    }
    return list;
  },

  async getById(id: string): Promise<InstalledModel | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<InstalledRow>(
      'SELECT id, data_json FROM installed_models WHERE id = ?',
      [id]
    );
    if (!row) return null;
    try {
      return JSON.parse(row.data_json) as InstalledModel;
    } catch {
      return null;
    }
  },

  async upsert(model: InstalledModel): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO installed_models (id, repo_id, runtime, capabilities_json, data_json, installed_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         data_json = excluded.data_json,
         capabilities_json = excluded.capabilities_json,
         last_used_at = excluded.last_used_at`,
      [
        model.id,
        model.repoId,
        model.runtime,
        JSON.stringify(model.capabilities),
        JSON.stringify(model),
        model.installedAt,
        model.lastUsedAt ?? null,
      ]
    );
  },

  async recordBenchmark(id: string, benchmark: ModelBenchmark): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;
    await this.upsert({
      ...existing,
      lastUsedAt: Date.now(),
      benchmark,
    });
  },

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM installed_models WHERE id = ?', [id]);
  },
};
