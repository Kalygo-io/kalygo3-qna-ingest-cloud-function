# TLDR

Useful cURLs for testing

## cURL 1

```sh
## cURL 2 - Full Message Body
curl -X POST http://localhost:8080/ \
-H "Content-Type: application/json" \
-d '{ "data": "'$(echo -n '{"file_id":"68148e3f-ab0d-4ff8-9da4-9c72605f3602","filename":"jeopardy_qa_100.csv","gcs_bucket":"kalygo-kb-ingest-storage","gcs_file_path":"similarity_search/similarity_search/104dd556-13f2-43f5-a385-8c19b2c1eb32/jeopardy_qa_100.csv","file_size":8053,"content_type":"text/csv","user_id":"1","namespace":"similarity_search","upload_timestamp":"2025-09-01T01:34:13.901871","processing_status":"pending"}' | base64)'", "attributes": { "exampleAttribute": "exampleValue" } }'
```