import { readFile } from 'node:fs/promises';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sodium from 'libsodium-wrappers';
import { parse } from 'yaml';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DEFAULT_CONFIG_DIRNAME = 'github-repo-config';
const DEFAULT_CONFIG_FILENAME = 'default.local.yaml';
const EXAMPLE_CONFIG_FILENAME = 'example.yaml';
const TOKEN_FILENAME = 'token.local';
const GITHUB_API_VERSION = '2026-03-10';
const REPOSITORY_VARIABLES_PER_PAGE = 30;
const REPOSITORY_SECRETS_PER_PAGE = 100;

type ScalarValue = string | number | boolean | null;

interface RepositoryPublicKey {
  key: string;
  key_id: string;
}

interface RepositoryVariable {
  name: string;
  value: string;
}

interface RepositorySecret {
  name: string;
}

interface VariablesResponse {
  total_count: number;
  variables: RepositoryVariable[];
}

interface SecretsResponse {
  total_count: number;
  secrets: RepositorySecret[];
}

export interface SyncConfig {
  repository: string;
  variables: Record<string, string>;
  secrets: Record<string, string>;
}

export interface RepositoryRef {
  owner: string;
  repo: string;
  fullName: string;
}

export interface VariablePlanItem {
  type: 'variable';
  name: string;
  value: string;
  action: 'create' | 'update' | 'skip';
}

export interface SecretPlanItem {
  type: 'secret';
  name: string;
  value: string;
  action: 'create' | 'update';
}

export interface SyncPlan {
  variables: VariablePlanItem[];
  secrets: SecretPlanItem[];
}

export interface SyncSummary {
  configPath: string;
  dryRun: boolean;
  repository: string;
  variables: {
    create: number;
    update: number;
    skip: number;
  };
  secrets: {
    create: number;
    update: number;
  };
}

export interface SyncRunOptions {
  configPath?: string;
  dryRun?: boolean;
  cwd?: string;
  fetchImpl?: typeof fetch;
  logger?: Logger;
  token?: string;
}

interface GitHubApiErrorPayload {
  status: number;
  method: string;
  requestPath: string;
  responseMessage?: string;
}

type JsonBody = Record<string, unknown>;
type Logger = Pick<Console, 'log' | 'warn' | 'error'>;

type GitHubRequestInit = Omit<RequestInit, 'body'> & {
  method?: string;
  body?: BodyInit | JsonBody;
};

interface GitHubContext {
  token: string;
  repository: RepositoryRef;
  fetchImpl: typeof fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isScalarValue(value: unknown): value is ScalarValue {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function ensureObjectMap(value: unknown, field: 'variables' | 'secrets'): Record<string, unknown> {
  if (value === undefined) return {};

  if (!isRecord(value)) {
    throw new Error(`"${field}" must be a YAML object with key/value pairs.`);
  }

  return value;
}

function normalizeVariableValues(value: unknown): Record<string, string> {
  const raw = ensureObjectMap(value, 'variables');
  const normalized: Record<string, string> = {};

  for (const [name, rawValue] of Object.entries(raw)) {
    if (!name.trim()) {
      throw new Error('"variables" contains an empty key.');
    }

    if (!isScalarValue(rawValue)) {
      throw new Error(`Variable "${name}" must use a YAML scalar value.`);
    }

    normalized[name] = String(rawValue);
  }

  return normalized;
}

function normalizeSecretValues(value: unknown): Record<string, string> {
  const raw = ensureObjectMap(value, 'secrets');
  const normalized: Record<string, string> = {};

  for (const [name, rawValue] of Object.entries(raw)) {
    if (!name.trim()) {
      throw new Error('"secrets" contains an empty key.');
    }

    if (typeof rawValue !== 'string') {
      throw new TypeError(`Secret "${name}" must use a string value.`);
    }

    normalized[name] = rawValue;
  }

  return normalized;
}

export function getDefaultConfigPath() {
  return path.join(REPO_ROOT, DEFAULT_CONFIG_DIRNAME, DEFAULT_CONFIG_FILENAME);
}

export function getExampleConfigPath() {
  return path.join(REPO_ROOT, DEFAULT_CONFIG_DIRNAME, EXAMPLE_CONFIG_FILENAME);
}

export function getTokenFilePath() {
  return path.join(REPO_ROOT, DEFAULT_CONFIG_DIRNAME, TOKEN_FILENAME);
}

export function resolveConfigPath(inputPath?: string, cwd = process.cwd()) {
  return inputPath ? path.resolve(cwd, inputPath) : getDefaultConfigPath();
}

export function parseRepositoryRef(repository: string): RepositoryRef {
  const normalized = repository.trim();

  if (!/^[^/\s]+\/[^/\s]+$/.test(normalized)) {
    throw new Error('"repository" must use the format "owner/repo".');
  }

  const [owner, repo] = normalized.split('/');

  return {
    owner,
    repo,
    fullName: normalized
  };
}

export function parseSyncConfig(source: string, sourceName = 'config'): SyncConfig {
  const parsed = parse(source);

  if (!isRecord(parsed)) {
    throw new Error(`"${sourceName}" must contain a YAML object at the top level.`);
  }

  if (typeof parsed.repository !== 'string' || !parsed.repository.trim()) {
    throw new Error('"repository" is required and must be a non-empty string.');
  }

  const repository = parseRepositoryRef(parsed.repository).fullName;

  return {
    repository,
    variables: normalizeVariableValues(parsed.variables),
    secrets: normalizeSecretValues(parsed.secrets)
  };
}

export async function loadSyncConfig(configPath: string) {
  try {
    const content = await readFile(configPath, 'utf8');
    return parseSyncConfig(content, configPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Config file not found: ${configPath}. Create it from "${getExampleConfigPath()}" or pass --config <path>.`
      );
    }

    throw error;
  }
}

export function parseTokenFileContent(source: string) {
  const tokenLine = source
    .split(/\r?\n/u)
    .map(line => line.trim())
    .find(line => line && !line.startsWith('#'));

  if (!tokenLine) {
    throw new TypeError('Token file is empty.');
  }

  const normalizedLine = tokenLine.startsWith('export ') ? tokenLine.slice(7).trim() : tokenLine;
  const rawToken = normalizedLine.startsWith('GITHUB_TOKEN=')
    ? normalizedLine.slice('GITHUB_TOKEN='.length).trim()
    : normalizedLine;
  const token = rawToken.replace(/^(['"])(.*)\1$/u, '$2').trim();

  if (!token) {
    throw new TypeError('Token file does not contain a valid token value.');
  }

  return token;
}

export async function loadGitHubToken(tokenPath = getTokenFilePath()) {
  try {
    const content = await readFile(tokenPath, 'utf8');
    return parseTokenFileContent(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    if (error instanceof Error) {
      throw new RepositorySyncError(`Token file is invalid: ${tokenPath}. ${error.message}`, { cause: error });
    }

    throw error;
  }
}

export function buildVariablePlan(
  variables: Record<string, string>,
  currentVariables: Map<string, string>
): VariablePlanItem[] {
  return Object.entries(variables).map(([name, value]) => {
    let action: VariablePlanItem['action'] = 'create';

    if (currentVariables.get(name) === value) {
      action = 'skip';
    } else if (currentVariables.has(name)) {
      action = 'update';
    }

    return {
      type: 'variable',
      name,
      value,
      action
    };
  });
}

export function buildSecretPlan(
  secrets: Record<string, string>,
  currentSecrets: ReadonlySet<string>
): SecretPlanItem[] {
  return Object.entries(secrets).map(([name, value]) => ({
    type: 'secret',
    name,
    value,
    action: currentSecrets.has(name) ? 'update' : 'create'
  }));
}

function createSummary(
  metadata: Pick<SyncSummary, 'configPath' | 'repository' | 'dryRun'>,
  plan: SyncPlan
): SyncSummary {
  return {
    configPath: metadata.configPath,
    repository: metadata.repository,
    dryRun: metadata.dryRun,
    variables: {
      create: plan.variables.filter(item => item.action === 'create').length,
      update: plan.variables.filter(item => item.action === 'update').length,
      skip: plan.variables.filter(item => item.action === 'skip').length
    },
    secrets: {
      create: plan.secrets.filter(item => item.action === 'create').length,
      update: plan.secrets.filter(item => item.action === 'update').length
    }
  };
}

class GitHubApiError extends Error {
  readonly status: number;
  readonly method: string;
  readonly requestPath: string;
  readonly responseMessage?: string;

  constructor(payload: GitHubApiErrorPayload) {
    const details = payload.responseMessage ? ` GitHub response: ${payload.responseMessage}` : '';
    super(`${payload.method} ${payload.requestPath} failed with status ${payload.status}.${details}`);
    this.name = 'GitHubApiError';
    this.status = payload.status;
    this.method = payload.method;
    this.requestPath = payload.requestPath;
    this.responseMessage = payload.responseMessage;
  }
}

class RepositorySyncError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RepositorySyncError';
  }
}

function createGitHubContext(token: string, repository: RepositoryRef, fetchImpl: typeof fetch): GitHubContext {
  return {
    token,
    repository,
    fetchImpl
  };
}

function getRepositoryApiBasePath(repository: RepositoryRef) {
  return `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
}

function extractResponseMessage(json: Record<string, unknown> | undefined, text: string) {
  if (typeof json?.message === 'string') {
    return json.message;
  }

  return text || undefined;
}

async function githubRequest<T>(context: GitHubContext, requestPath: string, init: GitHubRequestInit = {}) {
  const method = init.method ?? 'GET';
  let expectedStatus = 200;

  if (method === 'DELETE') {
    expectedStatus = 204;
  } else if (method === 'POST' || method === 'PUT') {
    expectedStatus = 201;
  }

  const headers = new Headers(init.headers);

  headers.set('Accept', 'application/vnd.github+json');
  headers.set('Authorization', `Bearer ${context.token}`);
  headers.set('X-GitHub-Api-Version', GITHUB_API_VERSION);

  let body = init.body;

  if (isRecord(body)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await context.fetchImpl(`https://api.github.com${requestPath}`, {
    ...init,
    method,
    headers,
    body
  });

  const text = await response.text();
  const json = text ? safeJsonParse(text) : undefined;

  if (!response.ok && response.status !== expectedStatus) {
    throw new GitHubApiError({
      status: response.status,
      method,
      requestPath,
      responseMessage: extractResponseMessage(json, text)
    });
  }

  return (json ?? undefined) as T;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

async function listRepositoryVariables(context: GitHubContext, page = 1, variables = new Map<string, string>()) {
  const response = await githubRequest<VariablesResponse>(
    context,
    `${getRepositoryApiBasePath(context.repository)}/actions/variables?per_page=${REPOSITORY_VARIABLES_PER_PAGE}&page=${page}`
  );

  for (const item of response.variables) {
    variables.set(item.name, item.value);
  }

  if (response.variables.length < REPOSITORY_VARIABLES_PER_PAGE) {
    return variables;
  }

  return listRepositoryVariables(context, page + 1, variables);
}

async function listRepositorySecrets(context: GitHubContext, page = 1, secrets = new Set<string>()) {
  const response = await githubRequest<SecretsResponse>(
    context,
    `${getRepositoryApiBasePath(context.repository)}/actions/secrets?per_page=${REPOSITORY_SECRETS_PER_PAGE}&page=${page}`
  );

  for (const item of response.secrets) {
    secrets.add(item.name);
  }

  if (response.secrets.length < REPOSITORY_SECRETS_PER_PAGE) {
    return secrets;
  }

  return listRepositorySecrets(context, page + 1, secrets);
}

async function getRepositoryPublicKey(context: GitHubContext) {
  return githubRequest<RepositoryPublicKey>(
    context,
    `${getRepositoryApiBasePath(context.repository)}/actions/secrets/public-key`
  );
}

async function createRepositoryVariable(context: GitHubContext, variable: VariablePlanItem) {
  await githubRequest(context, `${getRepositoryApiBasePath(context.repository)}/actions/variables`, {
    method: 'POST',
    body: {
      name: variable.name,
      value: variable.value
    }
  });
}

async function updateRepositoryVariable(context: GitHubContext, variable: VariablePlanItem) {
  await githubRequest(
    context,
    `${getRepositoryApiBasePath(context.repository)}/actions/variables/${encodeURIComponent(variable.name)}`,
    {
      method: 'PATCH',
      body: {
        name: variable.name,
        value: variable.value
      }
    }
  );
}

export async function encryptSecretValue(value: string, publicKey: string) {
  await sodium.ready;

  const publicKeyBytes = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
  const secretBytes = sodium.from_string(value);
  const encryptedBytes = sodium.crypto_box_seal(secretBytes, publicKeyBytes);

  return sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);
}

async function upsertRepositorySecret(context: GitHubContext, secret: SecretPlanItem, publicKey: RepositoryPublicKey) {
  const encrypted_value = await encryptSecretValue(secret.value, publicKey.key);

  await githubRequest(
    context,
    `${getRepositoryApiBasePath(context.repository)}/actions/secrets/${encodeURIComponent(secret.name)}`,
    {
      method: 'PUT',
      body: {
        encrypted_value,
        key_id: publicKey.key_id
      }
    }
  );
}

function logPlan(logger: Logger, summary: SyncSummary, plan: SyncPlan) {
  logger.log(`Repository: ${summary.repository}`);
  logger.log(`Config: ${summary.configPath}`);
  logger.log(`Mode: ${summary.dryRun ? 'dry-run' : 'apply'}`);

  if (plan.variables.length === 0) {
    logger.log('Variables: none declared in config');
  } else {
    for (const item of plan.variables) {
      logger.log(`variable ${item.action}: ${item.name}`);
    }
  }

  if (plan.secrets.length === 0) {
    logger.log('Secrets: none declared in config');
  } else {
    for (const item of plan.secrets) {
      logger.log(`secret ${item.action}: ${item.name}`);
    }
  }
}

function formatGitHubError(error: GitHubApiError, repository: string) {
  const prefix = `GitHub API request failed while syncing ${repository}.`;

  if (error.status === 401) {
    return `${prefix} Authentication failed. Verify that GITHUB_TOKEN is present and valid.`;
  }

  if (error.status === 403) {
    return `${prefix} Access was denied. Ensure GITHUB_TOKEN has classic "repo" scope, or fine-grained repository "Secrets" and "Variables" permissions with write access.`;
  }

  if (error.status === 404) {
    return `${prefix} Repository or API endpoint was not found. Verify the "repository" value and token access to that repository.`;
  }

  if (error.status === 422) {
    return `${prefix} GitHub rejected the payload. Check repository variable or secret names for GitHub validation rules.`;
  }

  return `${prefix} ${error.message}`;
}

export async function syncRepositoryConfig(options: SyncRunOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolveConfigPath(options.configPath, cwd);
  const logger = options.logger ?? console;
  const dryRun = options.dryRun ?? false;
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = options.token ?? (await loadGitHubToken()) ?? process.env.GITHUB_TOKEN;

  if (!token) {
    throw new RepositorySyncError(
      `GitHub token is required. Put it in "${getTokenFilePath()}" or set GITHUB_TOKEN. Use a classic token with "repo" scope, or a fine-grained token with repository "Secrets" and "Variables" permissions.`
    );
  }

  const config = await loadSyncConfig(configPath);
  const repository = parseRepositoryRef(config.repository);
  const context = createGitHubContext(token, repository, fetchImpl);

  try {
    const currentVariables =
      Object.keys(config.variables).length > 0 ? await listRepositoryVariables(context) : new Map<string, string>();
    const currentSecrets =
      Object.keys(config.secrets).length > 0 ? await listRepositorySecrets(context) : new Set<string>();

    const plan: SyncPlan = {
      variables: buildVariablePlan(config.variables, currentVariables),
      secrets: buildSecretPlan(config.secrets, currentSecrets)
    };

    const summary = createSummary(
      {
        configPath,
        repository: repository.fullName,
        dryRun
      },
      plan
    );

    logPlan(logger, summary, plan);

    if (dryRun) {
      logger.log('Dry run complete. No changes were sent to GitHub.');
      return summary;
    }

    const variableChanges = plan.variables.filter(variable => variable.action !== 'skip');

    await Promise.all(
      variableChanges.map(variable =>
        variable.action === 'create'
          ? createRepositoryVariable(context, variable)
          : updateRepositoryVariable(context, variable)
      )
    );

    if (plan.secrets.length > 0) {
      const publicKey = await getRepositoryPublicKey(context);

      await Promise.all(plan.secrets.map(secret => upsertRepositorySecret(context, secret, publicKey)));
    }

    logger.log(
      `Sync complete. Variables created: ${summary.variables.create}, updated: ${summary.variables.update}, skipped: ${summary.variables.skip}; secrets created: ${summary.secrets.create}, updated: ${summary.secrets.update}.`
    );

    return summary;
  } catch (error) {
    if (error instanceof GitHubApiError) {
      throw new RepositorySyncError(formatGitHubError(error, repository.fullName), { cause: error });
    }

    throw error;
  }
}
