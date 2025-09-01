import { Storage } from "@google-cloud/storage";

import { EnvironmentVariables } from "../singletons/environmentVariables";

export function cloudStorageClientFactory(): Storage {

  const keyJson = Buffer.from(
    EnvironmentVariables.KB_INGEST_SA,
    "base64"
  ).toString();

  console.log('---> Key JSON <---', keyJson);

  return new Storage({
    credentials: JSON.parse(keyJson),
  });

}