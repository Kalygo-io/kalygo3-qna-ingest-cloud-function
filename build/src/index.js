"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Pub/Sub-triggered function
const fs = require("fs");
const path = require("path");
// @ts-ignore
exports.processPubSubMessage = (reqOrEvent, contextOrRes) => __awaiter(void 0, void 0, void 0, function* () {
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
        }
        else {
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
        const { batchUuid, rows, customizations, originalname, email } = parsedMessage;
        // Return for Pub/Sub
        return;
    }
    catch (error) {
        console.error("Error processing Pub/Sub message:", error);
        const parsedMessage = JSON.parse(message);
        console.log("Decoded message:", parsedMessage);
        console.log("Message attributes:", attributes);
        // Throw error for Pub/Sub
        throw new Error("Failed to process Pub/Sub message");
    }
});
//# sourceMappingURL=index.js.map