import axios from 'axios';

export interface EmbeddingResponse {
  embedding: number[];
}

/**
 * Fetch embedding from the embedding API service
 * @param jwt - JWT token for authentication
 * @param text - Text to embed
 * @returns Promise<number[]> - The embedding vector
 */
export async function fetchEmbedding(jwt: string, text: string): Promise<number[]> {
  try {
    const response = await axios.post(
      process.env.EMBEDDING_API_URL || 'https://kalygo-embeddings-service-830723611668.us-east1.run.app/huggingface/embedding',
      {
        input: text
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `jwt=${jwt}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('Embedding API response structure:', Object.keys(response.data));
    console.log('Response data type:', typeof response.data);
    
    // Handle different possible response formats
    let embeddingArray: any[] = [];
    
    if (response.data && response.data.embedding) {
      embeddingArray = response.data.embedding;
    } else if (response.data && Array.isArray(response.data)) {
      embeddingArray = response.data;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      embeddingArray = response.data.data;
    } else {
      console.error('Unexpected response format:', response.data);
      throw new Error('Invalid response format from embedding API');
    }
    
    // Ensure all values are numbers and flatten if necessary
    const flattenedEmbedding: number[] = [];
    
    function flattenArray(arr: any[]): void {
      for (const item of arr) {
        if (Array.isArray(item)) {
          flattenArray(item);
        } else {
          const num = Number(item);
          if (isNaN(num)) {
            console.error('Invalid embedding value:', item, 'type:', typeof item);
            throw new Error(`Invalid embedding value: ${item}`);
          }
          flattenedEmbedding.push(num);
        }
      }
    }
    
    flattenArray(embeddingArray);
    
    console.log(`Generated embedding with ${flattenedEmbedding.length} dimensions`);
    console.log('First few values:', flattenedEmbedding.slice(0, 5));
    
    return flattenedEmbedding;
  } catch (error) {
    console.error('Error fetching embedding:', error);
    throw new Error(`Failed to fetch embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
