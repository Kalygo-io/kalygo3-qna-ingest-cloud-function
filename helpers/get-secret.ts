const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const secretManager = new SecretManagerServiceClient();


let secretsCache: Record<string, string> = {};

export const getSecret = async (secretName: string) => {
  if (secretsCache[secretName]) {
    return secretsCache[secretName];
  }

  const [version] = await secretManager.accessSecretVersion({
    name: `projects/830723611668/secrets/${secretName}/versions/latest`,
  });

  const secret = version.payload.data.toString("utf8");
  secretsCache[secretName] = secret; // Cache the secret for subsequent calls
  return secret;
};