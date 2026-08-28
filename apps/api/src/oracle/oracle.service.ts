import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as oracledb from 'oracledb';

@Injectable()
export class OracleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OracleService.name);
  private pool: oracledb.Pool | null = null;

  async onModuleInit() {
    const host     = process.env['ORACLE_HOST'];
    const port     = process.env['ORACLE_PORT'] ?? '1521';
    const user     = process.env['ORACLE_USER'];
    const password = process.env['ORACLE_PASSWORD'];
    const service  = process.env['ORACLE_SERVICE'];

    if (!host || !user || !password || !service) {
      this.logger.warn('Oracle env vars not fully configured — Oracle connection skipped');
      return;
    }

    try {
      // oracledb v6 uses thin mode by default — no Oracle Instant Client needed
      this.pool = await oracledb.createPool({
        user,
        password,
        connectString: `${host}:${port}/${service}`,
        poolMin:       1,
        poolMax:       3,
        poolIncrement: 1,
      });
      this.logger.log(`Oracle connection pool created (${host}:${port}/${service})`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error({ message }, 'Failed to create Oracle connection pool');
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close(0);
      this.logger.log('Oracle connection pool closed');
    }
  }

  get isConnected(): boolean {
    return this.pool !== null;
  }

  async query<T = Record<string, unknown>>(sql: string, binds: Record<string, unknown> = {}): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Oracle pool is not initialised — check ORACLE_* env vars');
    }
    const conn = await this.pool.getConnection();
    try {
      const result = await conn.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return (result.rows ?? []) as T[];
    } finally {
      await conn.close();
    }
  }

  async getStores(subsidiarySid: string): Promise<{ store_no: string; store_name: string }[]> {
    const rows = await this.query<{ STORE_NO: string; STORE_NAME: string }>(
      `SELECT store_no, store_name FROM rps.store WHERE SBS_SID = :sbs_sid ORDER BY store_no`,
      { sbs_sid: subsidiarySid },
    );
    return rows.map((r) => ({
      store_no:   r.STORE_NO   ?? '',
      store_name: r.STORE_NAME ?? '',
    }));
  }
}
