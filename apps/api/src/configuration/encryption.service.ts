import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('ENCRYPTION_KEY') ?? 'default-dev-key-32-bytes-padding!!';
    // Derive a 32-byte key using SHA-256 of the env value
    this.key = crypto.createHash('sha256').update(raw).digest();
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv(hex):tag(hex):ciphertext(hex)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    try {
      const [ivHex, tagHex, dataHex] = ciphertext.split(':');
      if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid ciphertext format');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const data = Buffer.from(dataHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(data) + decipher.final('utf8');
    } catch (err) {
      this.logger.error({ err }, 'Decryption failed');
      throw new Error('Decryption error');
    }
  }

  isEncrypted(value: string): boolean {
    return value.split(':').length === 3;
  }
}
