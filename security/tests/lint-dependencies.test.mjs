import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ESLint } from 'eslint';

const require = createRequire(import.meta.url);
const parser = require('@typescript-eslint/parser');
const estreeRequire = createRequire(require.resolve('@typescript-eslint/typescript-estree'));

function withProject(run) {
  const root = mkdtempSync(join(tmpdir(), 'jobmatch-lint-project-'));
  try {
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src/main.ts'), 'export const n: number = 1;');
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { allowJs: true }, include: ['src/**/*.ts'],
    }));
    run((name, allowDefaultProject) => {
      // A fresh real project service is essential: its default-project list is cached.
      parser.clearCaches();
      const filePath = join(root, name);
      mkdirSync(dirname(filePath), { recursive: true });
      const code = name.endsWith('.ts') ? 'export const n: number = 1;' : 'export const n = 1;';
      writeFileSync(filePath, code);
      return parser.parseForESLint(code, {
        filePath, tsconfigRootDir: root, sourceType: 'module',
        projectService: { allowDefaultProject },
      });
    });
  } finally {
    parser.clearCaches();
    rmSync(root, { recursive: true, force: true });
  }
}

test('the reviewed TypeScript consumer gets v11 while legacy callable consumers stay separate', () => {
  assert.equal(estreeRequire('minimatch/package.json').version, '11.0.3');
  assert.equal(typeof estreeRequire('minimatch').minimatch, 'function');
  // v11 deliberately removed makeRe. Never silently substitute it into v3 APIs.
  assert.equal(estreeRequire('minimatch').makeRe, undefined);
  const legacyRequire = createRequire(require.resolve('eslint'));
  assert.equal(legacyRequire('minimatch/package.json').version, '3.1.5');
  assert.equal(typeof legacyRequire('minimatch'), 'function');
  assert.equal(typeof legacyRequire('minimatch').makeRe, 'function');
});

test('real project service permits root and dotfiles without broadening an allowlist', () => {
  withProject(parse => {
    for (const file of ['config.js', '.config.js']) {
      const result = parse(file, ['*.js']);
      assert.equal(result.ast.type, 'Program');
      assert.ok(result.services.program.getTypeChecker());
    }
    for (const file of ['nested/config.js', 'unlisted.cjs']) {
      assert.throws(() => parse(file, ['*.js']), /was not found by the project service/);
    }
  });
});

test('real project service preserves explicit nested braces and extension boundaries', () => {
  withProject(parse => {
    for (const file of ['tools/task.js', 'tools/task.cjs']) {
      assert.ok(parse(file, ['tools/*.{js,cjs}']).services.program);
    }
    for (const file of ['other/task.js', 'tools/nested/task.js', 'tools/task.mjs']) {
      assert.throws(() => parse(file, ['tools/*.{js,cjs}']), /was not found by the project service/);
    }
  });
});

test('parser keeps configured-project and overly broad default-project guards', () => {
  withProject(parse => {
    assert.ok(parse('src/main.ts', ['*.js']).services.program);
    assert.throws(() => parse('src/main.ts', ['src/*.ts']), /included by allowDefaultProject but also was found in the project service/);
    assert.throws(() => parse('config.js', ['**/*.js']), /disallowed.*\*\*/s);
  });
});

test('patched preprocessing bounds globpart amplification in an owned limited child', () => {
  // Exercise the advisory branch directly, not through projectService (which uses default level 1).
  const script = `const {createRequire}=require('node:module');
    const r=createRequire(require.resolve('@typescript-eslint/typescript-estree'));
    const {Minimatch}=r('minimatch');
    const m=new Minimatch(Array(30).fill('**/../a/b').join('/'),
      {optimizationLevel:2,braceExpandMax:64});
    process.stdout.write(JSON.stringify({rows:m.set.length}));`;
  const child = spawnSync(process.execPath, ['--max-old-space-size=128', '-e', script], {
    encoding: 'utf8', timeout: 10000, maxBuffer: 4096,
  });
  assert.equal(child.error, undefined);
  assert.equal(child.signal, null);
  assert.equal(child.status, 0);
  assert.deepEqual(JSON.parse(child.stdout), { rows: 64 });
});

test('actual Next/React/accessibility/TypeScript lint rules still report violations', async () => {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(
    'export default function Example(p: any) { return <img src={p.src} />; }',
    { filePath: 'app/lint-regression.tsx' },
  );
  assert.equal(result.fatalErrorCount, 0);
  const ids = new Set(result.messages.map(message => message.ruleId));
  for (const id of ['@typescript-eslint/no-explicit-any', 'jsx-a11y/alt-text', '@next/next/no-img-element']) {
    assert.ok(ids.has(id), id);
  }
});

test('actual flat config covers source files and ignores only generated output directories', async () => {
  const eslint = new ESLint();
  for (const file of ['app/page.tsx', 'lib/documents.ts', 'worker/supervisor.ts', 'evaluation/run.ts', 'scripts/dependency_audit.mjs', 'security/tests/lint-dependencies.test.mjs']) {
    assert.equal(await eslint.isPathIgnored(file), false, file);
    assert.ok(await eslint.calculateConfigForFile(file), file);
  }
  for (const directory of ['.next', 'playwright-report', 'test-results', 'worker/dist', 'evaluation/dist']) {
    assert.equal(await eslint.isPathIgnored(`${directory}/generated.js`), true, directory);
  }
});
