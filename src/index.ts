import { downloadFileFromGCS, fileExistsInGCS } from '../helpers/gcs';
import { processCSVFile } from '../helpers/csv-processor';
import { upsertVectors, ProcessingResult } from '../helpers/pinecone';
import { getSecret } from '../helpers/get-secret';
import { EnvironmentVariables } from '../singletons/environmentVariables';

interface PubSubMessage {
  file_id: string;
  filename: string;
  gcs_bucket: string;
  gcs_file_path: string;
  file_size: number;
  content_type: string;
  user_id: string;
  namespace?: string;
  upload_timestamp: string;
  processing_status: string;
  jwt?: string; // JWT token for embedding API
}

// Pub/Sub-triggered function
export const processPubSubMessage = async (reqOrEvent: any, contextOrRes: any) => {
  let message = "{}";
  let attributes: Record<string, string> = {};
  
  try {

    EnvironmentVariables.EMBEDDINGS_API_URL = await getSecret("EMBEDDINGS_API_URL");
    EnvironmentVariables.PINECONE_API_KEY = await getSecret("PINECONE_API_KEY");
    EnvironmentVariables.PINECONE_ALL_MINILM_L6_V2_INDEX = await getSecret("PINECONE_ALL_MINILM_L6_V2_INDEX");
    EnvironmentVariables.KB_INGEST_SA = await getSecret("KB_INGEST_SA");
    
    // Detect if triggered via HTTP or Pub/Sub
    if (reqOrEvent.body) { // HTTP-triggered (local testing with curl)
      console.log("Detected HTTP trigger for local testing.");
      const pubSubMessage = typeof reqOrEvent.body === "string" ? JSON.parse(reqOrEvent.body) : reqOrEvent.body;
      console.log("pubSubMessage", pubSubMessage);
      message = pubSubMessage.data
        ? Buffer.from(pubSubMessage.data, "base64").toString()
        : "{}";
      attributes = pubSubMessage.attributes || {};

      // Send HTTP response
      contextOrRes.status(200).send("Message processed successfully.");
    } else {
      // Pub/Sub-triggered
      const event = reqOrEvent;
      message = event.data
        ? Buffer.from(event.data, "base64").toString()
        : "{}";
      attributes = event.attributes || {};
    }

    // Decode and process the message
    const parsedMessage: PubSubMessage = JSON.parse(message);
    console.log("Decoded message:", parsedMessage);
    console.log("Message attributes:", attributes);
    
    const {
      file_id,
      filename,
      gcs_bucket,
      gcs_file_path,
      file_size,
      content_type,
      user_id,
      namespace = 'similarity_search',
      upload_timestamp,
      processing_status,
      jwt
    } = parsedMessage;

    // Validate required fields
    if (!filename || !gcs_bucket || !gcs_file_path) {
      throw new Error("Missing required fields: filename, gcs_bucket, or gcs_file_path");
    }

    // Validate file type (only CSV files are supported)
    if (!filename.toLowerCase().endsWith('.csv')) {
      throw new Error("Only CSV files are supported");
    }

    // Check if JWT is provided
    if (!jwt) {
      throw new Error("JWT token is required for embedding API calls");
    }

    // Step 1: Download file from GCS
    console.log(`Step 1: Downloading file from GCS: gs://${gcs_bucket}/${gcs_file_path}`);
    
    // Check if file exists first
    const fileExists = await fileExistsInGCS(gcs_bucket, gcs_file_path);
    if (!fileExists) {
      throw new Error(`File does not exist in GCS: gs://${gcs_bucket}/${gcs_file_path}`);
    }
    
    const csvContent = await downloadFileFromGCS(gcs_bucket, gcs_file_path);
    
    if (!csvContent.trim()) {
      throw new Error("CSV file is empty");
    }

    // Step 2: Parse CSV and generate embeddings
    console.log(`Step 2: Processing CSV file: ${filename}`);
    const { vectors, successfulRows, failedRows } = await processCSVFile(
      csvContent,
      filename,
      jwt
    );

    // Step 3: Insert embeddings into Pinecone
    console.log(`Step 3: Inserting ${vectors.length} vectors into Pinecone`);
    if (vectors.length > 0) {
      await upsertVectors(vectors, namespace);
    }

    // Prepare result
    const result: ProcessingResult = {
      success: true,
      filename: filename,
      totalChunksCreated: successfulRows + failedRows,
      successfulUploads: successfulRows,
      failedUploads: failedRows,
      fileSizeBytes: file_size
    };

    console.log("Processing completed successfully:", result);

    // Return for Pub/Sub
    return result;
  } catch (error) {
    console.error("Error processing Pub/Sub message:", error);
    
    // Log the message that caused the error for debugging
    try {
      const parsedMessage = JSON.parse(message);
      console.log("Decoded message:", parsedMessage);
      console.log("Message attributes:", attributes);
    } catch (parseError) {
      console.log("Failed to parse message:", message);
    }
    
    // Throw error for Pub/Sub
    throw new Error(`Failed to process Pub/Sub message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};