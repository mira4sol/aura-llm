import type { DiscoveredModel } from '@/lib/types';
import { getDatabase } from './database';

interface CatalogRow {
  id: string;
  data_json: string;
}

export const catalogRepo = {
  async listAll(limit = 150): Promise<DiscoveredModel[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CatalogRow>(
      'SELECT id, data_json FROM catalog_models ORDER BY downloads DESC LIMIT ?',
      [limit]
    );
    const models: DiscoveredModel[] = [];
    for (const r of rows) {
      try {
        models.push(JSON.parse(r.data_json) as DiscoveredModel);
      } catch {
        // skip corrupt cache entry
      }
    }
    return models;
  },

  async upsertMany(models: DiscoveredModel[]): Promise<void> {
    if (models.length === 0) return;
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const m of models) {
        await db.runAsync(
          `INSERT INTO catalog_models (id, runtime, capabilities_json, downloads, data_json, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             runtime = excluded.runtime,
             capabilities_json = excluded.capabilities_json,
             downloads = excluded.downloads,
             data_json = excluded.data_json,
             fetched_at = excluded.fetched_at`,
          [
            m.id,
            m.runtime,
            JSON.stringify(m.capabilities),
            m.downloads,
            JSON.stringify(m),
            m.fetchedAt,
          ]
        );
      }
    });
  },

  async getById(id: string): Promise<DiscoveredModel | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CatalogRow>(
      'SELECT id, data_json FROM catalog_models WHERE id = ?',
      [id]
    );
    if (!row) return null;
    try {
      return JSON.parse(row.data_json) as DiscoveredModel;
    } catch {
      return null;
    }
  },
};
