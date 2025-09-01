const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

export function secretManagerClientFactory(): typeof SecretManagerServiceClient.prototype {
  // For Cloud Functions, use default service account credentials
  // The function will automatically use the service account it's deployed with
  return new SecretManagerServiceClient();
}