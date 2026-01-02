import crypto from 'crypto'

export interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
  tagLength: number
}

export const HIPAAEncryptionConfig: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,
  tagLength: 16
}

export class HIPAAEncryptionService {
  private masterKey: Buffer
  
  constructor(masterKeyHex: string) {
    if (!masterKeyHex || masterKeyHex.length !== 64) {
      throw new Error('Master key must be 256-bit hex string')
    }
    this.masterKey = Buffer.from(masterKeyHex, 'hex')
  }
  
  // Encrypt PHI data
  encryptPHI(plaintext: string, context?: string): any {
    try {
      const iv = crypto.randomBytes(HIPAAEncryptionConfig.ivLength)
      const cipher = crypto.createCipheriv(HIPAAEncryptionConfig.algorithm as any, this.masterKey, iv)
      
      let ciphertext = cipher.update(plaintext, 'utf8')
      ciphertext = Buffer.concat([ciphertext, cipher.final()])
      
      const tag = (cipher as any).getAuthTag()
      const combined = Buffer.concat([iv, ciphertext, tag])
      
      return {
        encrypted: combined.toString('base64'),
        algorithm: HIPAAEncryptionConfig.algorithm,
        context: context || 'medicase-phi'
      }
    } catch (error: any) {
      throw new Error(`PHI encryption failed: ${error.message}`)
    }
  }
}
