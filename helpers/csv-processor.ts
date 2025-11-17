import { createReadStream } from "fs";
import csv from "csv-parser";
import { createHash } from "crypto";
import { fetchEmbedding } from "./embedding";
import { VectorData } from "./pinecone";

export interface CSVRow {
  q: string;
  a: string;
}

export interface ProcessedRow {
  question: string;
  answer: string;
  content: string;
  rowNumber: number;
  createdAt: string;
  lastEditedAt: string;
  uploadedAt: string;
}

/**
 * Process CSV content and return processed rows
 */
export function parseCSVContent(csvContent: string): Promise<ProcessedRow[]> {
  return new Promise((resolve, reject) => {
    const rows: ProcessedRow[] = [];
    let rowNumber = 0;

    // Create a readable stream from the CSV content
    const stream = require("stream");
    const readable = new stream.Readable();
    readable.push(csvContent);
    readable.push(null);

    readable
      .pipe(csv())
      .on("data", (row: any) => {
        rowNumber++;
        const question = row.q?.trim() || "";
        const answer = row.a?.trim() || "";
        const createdAt = row.created_at?.trim() || "";
        const lastEditedAt = row.last_edited_at?.trim() || "";

        if (question && answer) {
          rows.push({
            question,
            answer,
            content: `Q: ${question}\nA: ${answer}`,
            rowNumber,
            createdAt,
            lastEditedAt,
            uploadedAt: Date.now().toString(),
          });
        } else {
          console.log(`Skipping row ${rowNumber}: empty question or answer`);
        }
      })
      .on("end", () => {
        resolve(rows);
      })
      .on("error", (error: Error) => {
        reject(error);
      });
  });
}

/**
 * Generate embedding for a single row and prepare vector data
 */
export async function generateEmbeddingForRow(
  row: ProcessedRow,
  filename: string,
  user_id: string,
  user_email: string,
  jwt: string
): Promise<VectorData | null> {
  try {
    // Generate embedding for the content
    const embedding = await fetchEmbedding(jwt, row.content);

    if (!embedding || embedding.length === 0) {
      console.log(`Failed to generate embedding for row ${row.rowNumber}`);
      return null;
    }

    // Validate embedding values are all numbers
    const validatedEmbedding = embedding.map((val, index) => {
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error(`Invalid embedding value at index ${index}: ${val}`);
      }
      return num;
    });

    console.log(
      `Row ${row.rowNumber}: Generated embedding with ${validatedEmbedding.length} dimensions`
    );

    // Create unique ID for the vector
    const idContent = `${filename}_${row.rowNumber}_${row.question.substring(
      0,
      50
    )}`;
    const chunkId = createHash("sha256").update(idContent).digest("hex");

    // Prepare metadata
    const metadata = {
      row_number: row.rowNumber,
      q: row.question,
      a: row.answer,
      content: row.content,
      filename: filename,
      user_id: user_id,
      user_email: user_email,
      upload_timestamp: row.uploadedAt,
      created_at: row.createdAt,
      last_edited_at: row.lastEditedAt,
    };

    // Prepare vector data
    const vectorData: VectorData = {
      id: chunkId,
      values: validatedEmbedding,
      metadata: metadata,
    };

    return vectorData;
  } catch (error) {
    console.error(`Error processing row ${row.rowNumber}:`, error);
    return null;
  }
}

/**
 * Process CSV file and generate embeddings for all rows
 */
export async function processCSVFile(
  csvContent: string,
  filename: string,
  userId: string,
  userEmail: string,
  jwt: string
): Promise<{
  vectors: VectorData[];
  successfulRows: number;
  failedRows: number;
}> {
  try {
    // Parse CSV content
    const rows = await parseCSVContent(csvContent);

    if (rows.length === 0) {
      throw new Error("No valid rows found in CSV file");
    }

    console.log(`Processing ${rows.length} rows from CSV file: ${filename}`);

    // Process each row and generate embeddings
    const vectors: VectorData[] = [];
    let successfulRows = 0;
    let failedRows = 0;

    for (const row of rows) {
      console.log(
        `Processing row ${row.rowNumber}: ${row.question.substring(0, 10)}`
      );

      const vectorData = await generateEmbeddingForRow(
        row,
        filename,
        userId,
        userEmail,
        jwt
      );

      if (vectorData) {
        vectors.push(vectorData);
        successfulRows++;
      } else {
        failedRows++;
      }
    }

    console.log(
      `Successfully processed ${successfulRows} rows, failed ${failedRows} rows`
    );

    return {
      vectors,
      successfulRows,
      failedRows,
    };
  } catch (error) {
    console.error("Error processing CSV file:", error);
    throw error;
  }
}
