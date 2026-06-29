import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sodium from 'libsodium-wrappers';
import {
  buildSecretPlan,
  buildVariablePlan,
  loadGitHubToken,
  loadSyncConfig,
  parseRepositoryRef,
  parseSyncConfig,
  parseTokenFileContent,
  resolveConfigPath,
  syncRepositoryConfig
} from '../github-repo-sync-lib';

test('parseSyncConfig parses valid yaml config', () => {
  const config = parseSyncConfig(`
repository: octo-org/octo-repo
variables:
  ENABLE_FEATURE: true
  RETRY_COUNT: 3
secrets:
  API_KEY: super-secret
`);

  assert.deepEqual(config, {
    repository: 'octo-org/octo-repo',
    variables: {
      ENABLE_FEATURE: 'true',
      RETRY_COUNT: '3'
    },
    secrets: {
      API_KEY: 'super-secret'
    }
  });
});

test('parseSyncConfig rejects missing repository', () => {
  assert.throws(() => parseSyncConfig('variables:\n  FOO: bar'), /"repository" is required/);
});

test('parseSyncConfig rejects invalid repository format', () => {
  assert.throws(() => parseSyncConfig('repository: octo-org'), /"repository" must use the format/);
});

test('parseSyncConfig rejects non-scalar variable values', () => {
  assert.throws(
    () =>
      parseSyncConfig(`
repository: octo-org/octo-repo
variables:
  INVALID:
    nested: value
`),
    /Variable "INVALID" must use a YAML scalar value/
  );
});

test('parseSyncConfig rejects non-string secret values', () => {
  assert.throws(
    () =>
      parseSyncConfig(`
repository: octo-org/octo-repo
secrets:
  API_KEY: 123
`),
    /Secret "API_KEY" must use a string value/
  );
});

test('buildVariablePlan returns create update and skip actions', () => {
  const plan = buildVariablePlan(
    {
      CREATE_ME: 'created',
      UPDATE_ME: 'new',
      SKIP_ME: 'same'
    },
    new Map([
      ['UPDATE_ME', 'old'],
      ['SKIP_ME', 'same']
    ])
  );

  assert.deepEqual(
    plan.map(item => ({ action: item.action, name: item.name })),
    [
      { action: 'create', name: 'CREATE_ME' },
      { action: 'update', name: 'UPDATE_ME' },
      { action: 'skip', name: 'SKIP_ME' }
    ]
  );
});

test('buildSecretPlan returns create and update actions', () => {
  const plan = buildSecretPlan(
    {
      CREATE_ME: 'first',
      UPDATE_ME: 'second'
    },
    new Set(['UPDATE_ME'])
  );

  assert.deepEqual(
    plan.map(item => ({ action: item.action, name: item.name })),
    [
      { action: 'create', name: 'CREATE_ME' },
      { action: 'update', name: 'UPDATE_ME' }
    ]
  );
});

test('parseRepositoryRef trims whitespace and returns owner/repo parts', () => {
  assert.deepEqual(parseRepositoryRef(' octo-org/octo-repo '), {
    owner: 'octo-org',
    repo: 'octo-repo',
    fullName: 'octo-org/octo-repo'
  });
});

test('resolveConfigPath uses cwd for custom config and repo root for default config', () => {
  const cwd = 'D:/workspace/frontend';

  assert.equal(resolveConfigPath('configs/repo.yaml', cwd), 'D:\\workspace\\frontend\\configs\\repo.yaml');
  assert.match(resolveConfigPath(), /github-repo-config[\\/]default\.local\.yaml$/);
});

test('loadSyncConfig points missing config errors to the directory example file', async () => {
  await assert.rejects(
    () => loadSyncConfig('D:\\workspace\\missing\\repo.yaml'),
    /github-repo-config[\\/]example\.yaml/
  );
});

test('parseTokenFileContent supports raw token values', () => {
  assert.equal(parseTokenFileContent('ghp_exampleToken123'), 'ghp_exampleToken123');
});

test('parseTokenFileContent supports dotenv style values', () => {
  assert.equal(parseTokenFileContent('GITHUB_TOKEN="ghp_exampleToken123"\n'), 'ghp_exampleToken123');
});

test('loadGitHubToken returns undefined when token file is missing', async () => {
  const token = await loadGitHubToken('D:\\workspace\\missing\\token.local');

  assert.equal(token, undefined);
});

test('loadGitHubToken reads token.local from an explicit path', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'github-token-file-'));
  const tokenPath = path.join(tempDir, 'token.local');

  await writeFile(tokenPath, '# comment\nGITHUB_TOKEN=ghp_exampleToken123\n');

  try {
    const token = await loadGitHubToken(tokenPath);

    assert.equal(token, 'ghp_exampleToken123');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('syncRepositoryConfig dry-run does not send write requests', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'github-sync-dry-run-'));
  const configPath = path.join(tempDir, 'repo.yaml');
  const requests: Array<{ method: string; url: string }> = [];

  await writeFile(
    configPath,
    `
repository: octo-org/octo-repo
variables:
  CREATE_ME: created
  KEEP_ME: same
secrets:
  UPDATE_ME: top-secret
`
  );

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    requests.push({ method, url });

    if (url.includes('/actions/variables?')) {
      return new Response(
        JSON.stringify({
          total_count: 1,
          variables: [{ name: 'KEEP_ME', value: 'same' }]
        }),
        { status: 200 }
      );
    }

    if (url.includes('/actions/secrets?')) {
      return new Response(
        JSON.stringify({
          total_count: 1,
          secrets: [{ name: 'UPDATE_ME' }]
        }),
        { status: 200 }
      );
    }

    throw new Error(`Unexpected request in dry-run test: ${method} ${url}`);
  };

  const logs: string[] = [];

  try {
    const summary = await syncRepositoryConfig({
      configPath,
      dryRun: true,
      token: 'test-token',
      fetchImpl,
      logger: {
        log(message: string) {
          logs.push(message);
        },
        warn(message: string) {
          logs.push(message);
        },
        error(message: string) {
          logs.push(message);
        }
      }
    });

    assert.deepEqual(summary.variables, {
      create: 1,
      update: 0,
      skip: 1
    });
    assert.deepEqual(summary.secrets, {
      create: 0,
      update: 1
    });
    assert.equal(requests.filter(request => request.method !== 'GET').length, 0);
    assert.equal(
      requests.some(request => request.url.includes('/public-key')),
      false
    );
    assert.equal(logs.includes('Dry run complete. No changes were sent to GitHub.'), true);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('syncRepositoryConfig applies variable and secret updates through GitHub REST', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'github-sync-apply-'));
  const configPath = path.join(tempDir, 'repo.yaml');
  const requests: Array<{ method: string; url: string; body?: unknown }> = [];

  await sodium.ready;
  const keyPair = sodium.crypto_box_keypair();
  const publicKey = sodium.to_base64(keyPair.publicKey, sodium.base64_variants.ORIGINAL);

  await writeFile(
    configPath,
    `
repository: octo-org/octo-repo
variables:
  CREATE_ME: created
  UPDATE_ME: next-value
  KEEP_ME: same
secrets:
  CREATE_SECRET: shhh
`
  );

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;

    requests.push({ method, url, body });

    if (method === 'GET' && url.includes('/actions/variables?')) {
      return new Response(
        JSON.stringify({
          total_count: 2,
          variables: [
            { name: 'UPDATE_ME', value: 'current-value' },
            { name: 'KEEP_ME', value: 'same' }
          ]
        }),
        { status: 200 }
      );
    }

    if (method === 'GET' && url.includes('/actions/secrets?')) {
      return new Response(
        JSON.stringify({
          total_count: 0,
          secrets: []
        }),
        { status: 200 }
      );
    }

    if (method === 'POST' && url.endsWith('/actions/variables')) {
      return new Response('', { status: 201 });
    }

    if (method === 'PATCH' && url.includes('/actions/variables/UPDATE_ME')) {
      return new Response(null, { status: 204 });
    }

    if (method === 'GET' && url.endsWith('/actions/secrets/public-key')) {
      return new Response(
        JSON.stringify({
          key: publicKey,
          key_id: 'key-id-1'
        }),
        { status: 200 }
      );
    }

    if (method === 'PUT' && url.includes('/actions/secrets/CREATE_SECRET')) {
      return new Response('', { status: 201 });
    }

    throw new Error(`Unexpected request in apply test: ${method} ${url}`);
  };

  try {
    const summary = await syncRepositoryConfig({
      configPath,
      token: 'test-token',
      fetchImpl,
      logger: {
        log() {},
        warn() {},
        error() {}
      }
    });

    assert.deepEqual(summary.variables, {
      create: 1,
      update: 1,
      skip: 1
    });
    assert.deepEqual(summary.secrets, {
      create: 1,
      update: 0
    });

    const createVariableRequest = requests.find(request => request.method === 'POST');
    const updateVariableRequest = requests.find(request => request.method === 'PATCH');
    const createSecretRequest = requests.find(request => request.method === 'PUT');

    assert.deepEqual(createVariableRequest?.body, {
      name: 'CREATE_ME',
      value: 'created'
    });
    assert.deepEqual(updateVariableRequest?.body, {
      name: 'UPDATE_ME',
      value: 'next-value'
    });
    assert.equal(typeof createSecretRequest?.body, 'object');
    assert.notEqual((createSecretRequest?.body as Record<string, string>).encrypted_value, 'shhh');
    assert.equal((createSecretRequest?.body as Record<string, string>).key_id, 'key-id-1');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('syncRepositoryConfig rejects empty variable changes before writing', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'github-sync-empty-variable-'));
  const configPath = path.join(tempDir, 'repo.yaml');
  const requests: Array<{ method: string; url: string }> = [];

  await writeFile(
    configPath,
    `
repository: octo-org/octo-repo
variables:
  EMPTY_VALUE: ""
`
  );

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    requests.push({ method, url });

    if (url.includes('/actions/variables?')) {
      return new Response(
        JSON.stringify({
          total_count: 0,
          variables: []
        }),
        { status: 200 }
      );
    }

    throw new Error(`Unexpected request in empty variable test: ${method} ${url}`);
  };

  try {
    await assert.rejects(
      () =>
        syncRepositoryConfig({
          configPath,
          token: 'test-token',
          fetchImpl,
          logger: {
            log() {},
            warn() {},
            error() {}
          }
        }),
      /GitHub repository variables cannot be empty strings.*EMPTY_VALUE/
    );
    assert.equal(
      requests.some(request => request.method !== 'GET'),
      false
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('syncRepositoryConfig surfaces the failing secret name and GitHub response message', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'github-sync-secret-error-'));
  const configPath = path.join(tempDir, 'repo.yaml');

  await writeFile(
    configPath,
    `
repository: octo-org/octo-repo
secrets:
  BROKEN_SECRET: top-secret
`
  );

  await sodium.ready;
  const keyPair = sodium.crypto_box_keypair();
  const publicKey = sodium.to_base64(keyPair.publicKey, sodium.base64_variants.ORIGINAL);

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (method === 'GET' && url.includes('/actions/secrets?')) {
      return new Response(
        JSON.stringify({
          total_count: 0,
          secrets: []
        }),
        { status: 200 }
      );
    }

    if (method === 'GET' && url.endsWith('/actions/secrets/public-key')) {
      return new Response(
        JSON.stringify({
          key: publicKey,
          key_id: 'key-id-1'
        }),
        { status: 200 }
      );
    }

    if (method === 'PUT' && url.includes('/actions/secrets/BROKEN_SECRET')) {
      return new Response(JSON.stringify({ message: 'Invalid value' }), { status: 422 });
    }

    throw new Error(`Unexpected request in secret error test: ${method} ${url}`);
  };

  try {
    await assert.rejects(
      () =>
        syncRepositoryConfig({
          configPath,
          token: 'test-token',
          fetchImpl,
          logger: {
            log() {},
            warn() {},
            error() {}
          }
        }),
      /Failed to create secret "BROKEN_SECRET".*GitHub response: Invalid value/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
