import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as oracledb from 'oracledb';

@Injectable()
export class OracleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OracleService.name);
  private pool: oracledb.Pool | null = null;
  private lastError: string | null = null;

  async onModuleInit() {
    const host     = process.env['ORACLE_HOST'];
    const port     = parseInt(process.env['ORACLE_PORT'] ?? '1521', 10);
    const user     = process.env['ORACLE_USER'];
    const password = process.env['ORACLE_PASSWORD'];
    const service  = process.env['ORACLE_SERVICE'];

    if (!host || !user || !password || !service) {
      this.lastError = 'Oracle env vars not configured — skipping startup connection (configure via UI)';
      this.logger.warn(this.lastError);
      return;
    }

    await this.reinitialize(host, port, user, password, service);
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close(0);
      this.logger.log('Oracle connection pool closed');
    }
  }

  async reinitialize(host: string, port: number, user: string, password: string, service: string): Promise<void> {
    // Close existing pool if any
    if (this.pool) {
      try { await this.pool.close(0); } catch { /* ignore close errors */ }
      this.pool = null;
    }

    try {
      this.pool = await oracledb.createPool({
        user,
        password,
        connectString: `${host}:${port}/${service}`,
        poolMin:       0,
        poolMax:       3,
        poolIncrement: 1,
      });
      this.logger.log(`Oracle pool created (${host}:${port}/${service})`);

      // Verify real TCP connectivity
      try {
        const testConn = await this.pool.getConnection();
        await testConn.close();
        this.lastError = null;
        this.logger.log('Oracle connection test: SUCCESS — database is reachable');
      } catch (testErr: unknown) {
        const testMsg = testErr instanceof Error ? testErr.message : String(testErr);
        this.lastError = testMsg;
        this.logger.error({ message: testMsg }, 'Oracle connection test: FAILED — database unreachable');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.lastError = message;
      this.logger.error({ message }, 'Failed to create Oracle connection pool');
    }
  }

  get isConnected(): boolean {
    return this.pool !== null;
  }

  getStatus(): { connected: boolean; lastError: string | null } {
    return { connected: this.pool !== null, lastError: this.lastError };
  }

  async query<T = Record<string, unknown>>(sql: string, binds: oracledb.BindParameters = {}): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Oracle pool not initialised — configure Oracle DB in Configuration → Oracle DB');
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
    try {
      const rows = await this.query<{ STORE_NO: string; STORE_NAME: string }>(
        `SELECT store_no, store_name FROM rps.store WHERE SBS_SID = :sbs_sid ORDER BY store_no`,
        { sbs_sid: subsidiarySid },
      );
      return rows.map((r) => ({
        store_no:   r.STORE_NO   ?? '',
        store_name: r.STORE_NAME ?? '',
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.lastError = message;
      throw err;
    }
  }
}
