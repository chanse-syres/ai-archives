import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

class S3StorageClient {
  private static instance: S3StorageClient;
  private client: S3Client | null = null;
  private bucketName: string = '';

  private constructor() {}

  public static getInstance(): S3StorageClient {
    if (!S3StorageClient.instance) {
      S3StorageClient.instance = new S3StorageClient();
    }
    return S3StorageClient.instance;
  }

  public initialize(config: S3Config): void {
    if (this.client) {
      // Already initialized, just return
      return;
    }

    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.bucketName = config.bucketName;
  }

  /**
   * Store HTML conversation content in S3 // Comment out and chage?: Store transcript conversation content in S3
   * @param conversationId Unique identifier for the conversation
   * @param content HTML content to store // Comment out and change?: Transcript text content to store
   * @returns The S3 key where the content was stored
   */
  public async storeConversation(conversationId: string, content: string): Promise<string> {
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    //const key = `conversations/${conversationId}.html`; // COMMENTED OUT on 03/21 to fix the encoding errors - we can change to .txt if we are storing transcript text only
    const key = `conversations/${conversationId}.txt`; // ADDED on 03/21 to fix the encoding errors. we can change to .txt if we are storing transcript text only END

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        // ContentType: 'text/html', // Commented out on 03/21 to fix the encoding errors.
        ContentType: 'text/plain; charset=utf-8', // Added on 03/21 to fix the encoding errors. (For storing transcript text only)
        // ContentType: 'text/html; charset=utf-8' // Added on 03/21 to fix the encoding errors. (If we have to keep html)
        
        // Below is reccommended order. 03/21/2026.
        // const key = `conversations/${conversationId}.txt`;
        // ContentType: 'text/plain; charset=utf-8'
      })
    );

    return key;
  }

  /**
   * Get a signed URL for reading conversation content
   * @param key S3 key of the conversation content
   * @param expiresIn URL expiration time in seconds (default: 1 hour)
   * @returns Signed URL for accessing the content
   */
  public async getSignedReadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Retrieve conversation content from S3
   * @param key S3 key of the conversation content
   * @returns The conversation content as a string
   */
  public async getConversationContent(key: string): Promise<string> {
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error('No content found in S3 object');
    }

    // Convert the readable stream to string
    const content = await response.Body.transformToString();
    return content;
  }
}

export const s3Client = S3StorageClient.getInstance();
