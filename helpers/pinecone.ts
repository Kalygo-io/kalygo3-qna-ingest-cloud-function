import { EnvironmentVariables } from '../singletons/environmentVariables';
import { Pinecone } from '@pinecone-database/pinecone';

export interface VectorData {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}

export interface ProcessingResult {
  success: boolean;
  filename: string;
  totalChunksCreated?: number;
  successfulUploads?: number;
  failedUploads?: number;
  fileSizeBytes?: number;
  error?: string;
}

/**
 * Initialize Pinecone client
 */
export function initializePinecone(): Pinecone {
  const apiKey = EnvironmentVariables.PINECONE_API_KEY;
  
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }
  
  console.log('Initializing Pinecone client with:');
  console.log('- API Key:', apiKey.substring(0, 8) + '...');
  
  try {
    const pinecone = new Pinecone({
      apiKey: apiKey
    });
    
    console.log('Pinecone client initialized successfully');
    return pinecone;
  } catch (error) {
    console.error('Error initializing Pinecone client:', error);
    throw error;
  }
}

/**
 * Get Pinecone index
 */
export function getPineconeIndex(): any {
  const pinecone = initializePinecone();
  const indexName = EnvironmentVariables.PINECONE_ALL_MINILM_L6_V2_INDEX;
  
  if (!indexName) {
    throw new Error('PINECONE_ALL_MINILM_L6_V2_INDEX environment variable is required');
  }
  
  console.log('Getting Pinecone index:', indexName);
  
  try {
    const index = pinecone.index(indexName);
    console.log('Pinecone index retrieved successfully');
    return index;
  } catch (error) {
    console.error('Error getting Pinecone index:', error);
    throw error;
  }
}

/**
 * Test Pinecone connection
 */
export async function testPineconeConnection(): Promise<boolean> {
  try {
    console.log('Testing Pinecone connection...');
    const pinecone = initializePinecone();
    
    // Try to list indexes to test connection
    const indexes = await pinecone.listIndexes();
    console.log('Available indexes:', indexes);
    
    return true;
  } catch (error) {
    console.error('Pinecone connection test failed:', error);
    return false;
  }
}

/**
 * Upsert vectors to Pinecone in batches
 */
export async function upsertVectors(
  vectors: VectorData[], 
  namespace: string = 'similarity_search'
): Promise<void> {
  console.log(`Starting upsert of ${vectors.length} vectors to namespace: ${namespace}`);
  
  // Test connection first
  const connectionOk = await testPineconeConnection();
  if (!connectionOk) {
    throw new Error('Pinecone connection test failed');
  }
  
  const index = getPineconeIndex();
  
  try {
    console.log('📊 Vectors to be inserted:');
    console.log('   Count:', vectors.length);
    console.log('   First vector ID:', vectors[0]?.id?.substring(0, 12) + '...');
    console.log('   First vector dimensions:', vectors[0]?.values?.length);
    console.log('   Sample values from first vector:', vectors[0]?.values?.slice(0, 3));
    console.log('   Namespace:', namespace);
    
  } catch (diagnosticError) {
    console.log('⚠️  Diagnostic check failed:', diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError));
  }
  
  // Pinecone recommends batch sizes of 100 or less
  const batchSize = 100;
  
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    
    try {
      console.log(`Upserting batch ${Math.floor(i / batchSize) + 1} with ${batch.length} vectors`);
      await index.namespace(namespace).upsert(batch);
      console.log(`Successfully upserted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(vectors.length / batchSize)}`);
    } catch (error) {
      console.error(`Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }
  }
}
