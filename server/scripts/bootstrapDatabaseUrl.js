const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const normalize = (value) => (typeof value === 'string' ? value.trim() : '');

const hasDatabaseUrl = () => Boolean(normalize(process.env.DATABASE_URL));

const buildDatabaseUrlFromSecret = (secret) => {
  const host = normalize(secret.host);
  const port = normalize(secret.port ? String(secret.port) : '');
  const username = normalize(secret.username);
  const password = normalize(secret.password);
  const dbname =
    normalize(secret.dbname) ||
    normalize(secret.dbName) ||
    normalize(secret.database) ||
    normalize(process.env.DATABASE_NAME);

  if (!host || !port || !username || !password || !dbname) {
    throw new Error('Segredo RDS inválido: esperado host, port, username, password e dbname.');
  }

  const encodedUser = encodeURIComponent(username);
  const encodedPass = encodeURIComponent(password);
  const encodedDb = encodeURIComponent(dbname);
  return `postgresql://${encodedUser}:${encodedPass}@${host}:${port}/${encodedDb}`;
};

const parseSecretValue = (response) => {
  if (response.SecretString) {
    return JSON.parse(response.SecretString);
  }
  if (response.SecretBinary) {
    const raw = Buffer.from(response.SecretBinary, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  throw new Error('Segredo AWS sem SecretString/SecretBinary.');
};

async function bootstrapDatabaseUrl() {
  if (hasDatabaseUrl()) return process.env.DATABASE_URL;

  const secretId =
    normalize(process.env.DATABASE_SECRET_ARN) ||
    normalize(process.env.DATABASE_SECRET_NAME) ||
    normalize(process.env.AWS_SECRET_ARN) ||
    normalize(process.env.AWS_SECRET_NAME) ||
    normalize(process.env.SECRET_NAME);
  if (!secretId) {
    throw new Error(
      'DATABASE_URL não definido e nenhum identificador de segredo foi informado (DATABASE_SECRET_ARN, DATABASE_SECRET_NAME, AWS_SECRET_ARN, AWS_SECRET_NAME, SECRET_NAME).'
    );
  }

  const region = normalize(process.env.AWS_REGION) || normalize(process.env.AWS_DEFAULT_REGION) || 'us-east-1';
  const client = new SecretsManagerClient({ region });
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await client.send(command);
  const secret = parseSecretValue(response);
  const databaseUrl = buildDatabaseUrlFromSecret(secret);

  process.env.DATABASE_URL = databaseUrl;
  if (!process.env.DATABASE_SSL) {
    process.env.DATABASE_SSL = 'false';
  }
  return databaseUrl;
}

module.exports = {
  bootstrapDatabaseUrl
};
