# TLDR

Cloud Function for ingesting knowledge into a Pinecone Vector DB

## How to run this project

- npm run watch
- npm run compile
- npm run start

## How to deploy to GCF

gcloud functions deploy processPubSubMessage
--runtime=nodejs22
--trigger-topic=csv-processing-topic
--region=us-east1
--memory=1GB
--timeout=540s
--source ./build
--entry-point=processPubSubMessage
--gen2