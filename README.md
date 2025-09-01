# TLDR

Cloud Function for ingesting knowledge into a Pinecone Vector DB

## How to run this project

- npm run watch
- npm run compile
- npm run start

## Set up a topic

## How to deploy to GCF

```sh
# Of course make sure the Cloud Functions API is enabled in your project
# gcloud services enable cloudfunctions.googleapis.com

# Then deploy the function
gcloud functions deploy process-qna-ingest-topic-message \
--runtime=nodejs22 \
--trigger-topic=qna-ingest-topic \
--region=us-east1 \
--memory=1GB \
--timeout=540s \
--source ./build \
--entry-point=processQnaIngestTopicMessage \
--gen2
```

## cURL for testing the Cloud Function locally (that will eventually act as the subscriber of a Pub/Sub topic)

```sh
curl -X POST http://localhost:8080/ \
-H "Content-Type: application/json" \
-d '{ "data": "'$(echo -n '{"action":"process","key":"value"}' | base64)'", "attributes": { "exampleAttribute": "exampleValue" } }'
```

## Publishing a test message onto the Pub/Sub topic to confirm the Cloud Function gets triggered

```sh
gcloud pubsub topics publish kb-ingest-topic \
--message='{"action":"process","key":"value"}' \
--attribute=test=true
```

```sh - Watch logs in real-time
gcloud functions logs tail processPubSubMessage --region=us-east1
```

```sh - Or view recent logs
gcloud functions logs read processPubSubMessage --region=us-east1 --limit=50
```
