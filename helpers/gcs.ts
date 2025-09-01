import { EnvironmentVariables } from '../singletons/environmentVariables';
import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get Storage instance with proper credentials
 */
function getStorageInstance(): Storage {
  try {
    // Check if KB_INGEST_SA is a file path
    if (EnvironmentVariables.KB_INGEST_SA && EnvironmentVariables.KB_INGEST_SA.endsWith('.json')) {
      const keyFilePath = path.resolve(EnvironmentVariables.KB_INGEST_SA);
      
      if (fs.existsSync(keyFilePath)) {
        // Read the service account key file
        const keyFileContent = fs.readFileSync(keyFilePath, 'utf-8');
        const credentials = JSON.parse(keyFileContent);
        
        return new Storage({
          credentials: credentials
        });
      } else {
        console.warn(`Service account key file not found: ${keyFilePath}`);
      }
    }
    
    // Fallback to default authentication (Application Default Credentials)
    return new Storage();
  } catch (error) {
    console.warn('Error loading service account credentials, falling back to default auth:', error);
    return new Storage();
  }
}

/**
 * Download file from Google Cloud Storage
 */
export async function downloadFileFromGCS(
  bucketName: string,
  filePath: string
): Promise<string> {
  try {
    const storage = getStorageInstance();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    
    console.log(`Downloading file from GCS: gs://${bucketName}/${filePath}`);
    
    // Download the file content
    const [content] = await file.download();
    
    // Convert buffer to string (assuming UTF-8 encoding)
    const fileContent = content.toString('utf-8');
    
    console.log(`Successfully downloaded file: ${filePath}, size: ${content.length} bytes`);
    
    return fileContent;
  } catch (error) {
    console.error(`Error downloading file from GCS: gs://${bucketName}/${filePath}`, error);
    throw new Error(`Failed to download file from GCS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate that a file exists in GCS
 */
export async function fileExistsInGCS(
  bucketName: string,
  filePath: string
): Promise<boolean> {
  try {
    const storage = getStorageInstance();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error(`Error checking if file exists in GCS: gs://${bucketName}/${filePath}`, error);
    return false;
  }
}
