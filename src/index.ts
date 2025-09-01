// Pub/Sub-triggered function
const fs = require("fs");
const path = require("path");

// @ts-ignore
exports.processPubSubMessage = async (reqOrEvent, contextOrRes) => {
  let message = "{}";
  let attributes = {};
  
  try {

    // Detect if triggered via HTTP or Pub/Sub
    if (reqOrEvent.body) { // HTTP-triggered (local testing with curl)
      console.log("Detected HTTP trigger for local testing.");
      const pubSubMessage = typeof reqOrEvent.body === "string" ? JSON.parse(reqOrEvent.body) : reqOrEvent.body; // Handle req.body format
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
    const parsedMessage = JSON.parse(message);
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
      namespace,
      upload_timestamp,
      processing_status
    } = parsedMessage;

    

    // Return for Pub/Sub
    return;
  } catch (error) {
    console.error("Error processing Pub/Sub message:", error);

    const parsedMessage = JSON.parse(message);
    console.log("Decoded message:", parsedMessage);
    console.log("Message attributes:", attributes);
    
    // Throw error for Pub/Sub
    throw new Error("Failed to process Pub/Sub message");
  }
};