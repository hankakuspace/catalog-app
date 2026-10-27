const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { AppProvider } = require('@shopify/polaris');

// Compile the actual sources without starting Next, loading .env, or contacting any service.
function load(file, mocks = {}) {
  const syntheticProcess = { env: { SHOPIFY_SCOPES: 'read_products', SHOPIFY_APP_URL: 'https://example.invalid' } };
  const filename = path.join(__dirname, '..', file);
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
  const module = { exports: {} };
  const allowed = new Set(['sanitize-html', 'node:crypto', 'node:net', 'react',
    'react/jsx-runtime', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities',
    '@shopify/polaris', '@shopify/polaris-icons']);
  const safeRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (allowed.has(name)) return require(name);
    throw new Error(`Unmocked dependency blocked: ${name}`);
  };
  vm.runInThisContext(`(function(require,module,exports,process){${code}\n})`, { filename })(safeRequire, module, module.exports, syntheticProcess);
  return module.exports;
}
const rich = load('src/lib/richText.ts');
const clean = rich.sanitizeRichText;
const attacks = [
  '<script>alert(1)</script><p>本文</p>',
  '<p onclick="alert(1)">本文</p><img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)">本文</a>',
  '<a href="jav&#x61;script:alert(1)">本文</a>',
  '<a href="java&#10;script:alert(1)">本文</a>',
  '<a href="data:text/html;base64,PHNjcmlwdD4=">本文</a>',
  '<svg><a xlink:href="javascript:alert(1)">X</a><script>alert(1)</script></svg>',
  '<math><mtext><img src=x onerror=alert(1)></mtext></math>',
  '<svg><textarea><img src=x onerror=alert(1)></textarea></svg>',
  '<svg><xmp><img src=x onerror=alert(1)></xmp></svg>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<object data="javascript:alert(1)"></object><embed src="data:text/html,x">',
  '<p style="color: red; background-image:url(javascript:alert(1)); position:fixed" onclick=x>本文</p>',
  '<p style="color:expression(alert(1));background-color:var(--evil);text-align:center">本文</p>',
  '<form action="javascript:alert(1)"><input autofocus onfocus=alert(1)></form>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">本文</p>',
];
for (const [index, input] of attacks.entries()) test(`malicious HTML ${index + 1}`, () => {
  const output = clean(input);
  assert.doesNotMatch(output, /<(?:script|img|svg|math|iframe|object|embed|form|input|noscript)\b|\son\w+\s*=|(?:href|src)=["'][^"']*(?:javascript:|data:)|expression\(|url\(|position:|var\(/i);
  assert.equal(clean(output), output, 'sanitization remains safe when repeated');
});
const formatted = '<p class="ql-align-center"><span class="ql-font-noto-sans-jp ql-size-large" style="color: rgb(230, 0, 0); background-color: #ffff00">説明 &amp; 日本語</span><br /><strong>太字</strong><em>斜体</em><u>下線</u><s>取消</s></p><ul><li>項目</li></ul><ol><li>番号</li></ol><a href="https://example.invalid/catalog" target="_blank">リンク</a>';
test('Quill formatting, lists, line breaks and safe links survive', () => {
  const output = clean(formatted);
  for (const value of ['ql-align-center', 'ql-font-noto-sans-jp', 'ql-size-large', 'color: rgb(230, 0, 0)', 'background-color: #ffff00', '<br />', '<strong>太字</strong>', '<em>斜体</em>', '<u>下線</u>', '<s>取消</s>', '<ul><li>項目</li></ul>', '<ol><li>番号</li></ol>', 'https://example.invalid/catalog', 'rel="noopener noreferrer"']) assert.ok(output.includes(value), value);
});
test('relative/mail/tel links survive; unknown CSS/classes/DOM identifiers do not', () => {
  assert.match(clean('<a href="/works?q=1">相対</a><a href="mailto:test@example.invalid">mail</a><a href="tel:0000">tel</a>'), /href="\/works\?q=1"/);
  const output = clean('<p id="app" name="location" class="arbitrary ql-size-large" style="display:none;color:blue">x</p>');
  assert.equal(output, '<p class="ql-size-large" style="color: blue">x</p>');
});
test('non-string values and escaped text are safe', () => {
  for (const value of [null, undefined, {}, [], 123]) assert.equal(clean(value), '');
  assert.equal(clean('<p>&lt;script&gt;文字&lt;/script&gt;</p>'), '<p>&lt;script&gt;文字&lt;/script&gt;</p>');
});

const shopify = load('src/lib/shopify.ts', {
  './richText': rich,
  '@shopify/shopify-api/adapters/node': {},
  '@shopify/shopify-api': { shopifyApi: () => ({}), ApiVersion: {} },
  '@google-cloud/firestore': { Firestore: class {} },
});
test('management/public legacy reads are sanitized without modifying saved data', () => {
  const data = { title: '作品集', leadText: attacks[1], shop: 'test.myshopify.com', products: [], username: 'synthetic', password: 'synthetic' };
  const before = JSON.stringify(data);
  for (const output of [shopify.managementCatalog(data), shopify.publicCatalog('synthetic', data)]) {
    assert.equal(output.leadText, '<p>本文</p>');
    assert.equal(output.title, data.title);
    assert.ok(!Object.hasOwn(output, 'password'));
  }
  assert.equal(JSON.stringify(data), before);
});

test('actual create/update/list/detail/public routes use sanitized HTML and retain shop guards', async () => {
  let saved = { shop: 'test.myshopify.com', title: '作品集', leadText: attacks[1], products: [] };
  let writes = 0;
  const snap = () => ({ id: 'synthetic', exists: true, data: () => saved });
  const ref = { id: 'synthetic', get: async () => snap(), set: async (value) => { saved = value; writes++; } };
  const db = { collection: () => ({ doc: () => ref, where: () => ({ get: async () => ({ docs: [snap()] }) }) }),
    runTransaction: async (callback) => callback({ get: async () => snap(), update: (_, value) => { saved = { ...saved, ...value }; writes++; } }) };
  const handler = load('src/pages/api/catalogs.ts', {
    '@/lib/richText': rich,
    '@/lib/firebaseAdmin': { dbAdmin: db, FieldValue: { serverTimestamp: () => null } },
    '@/lib/shopify': { ...shopify, requireAdminShop: async (req, res) => {
      if (req.headers.authorization !== 'synthetic') { res.status(401).json({ error: 'Unauthorized' }); return null; }
      return 'test.myshopify.com';
    }, sessionStorage: { loadSession: async () => { throw new Error('No external session access allowed'); } } },
    'graphql-request': { GraphQLClient: class { constructor() { throw new Error('No Shopify calls allowed'); } } },
  }).default;
  const call = async (method, query = {}, body = {}, authenticated = true) => {
    const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method, query, body, headers: authenticated ? { authorization: 'synthetic' } : {} }, res);
    return res;
  };
    for (const query of [{}, { id: 'synthetic' }, { preview: '1', id: 'synthetic' }]) {
      const res = await call('GET', query);
      assert.equal(res.code, 200);
      assert.equal((res.data.catalog || res.data.catalogs[0]).leadText, '<p>本文</p>');
    }
    assert.equal(writes, 0, 'legacy GET never rewrites data');
    for (const method of ['POST', 'PUT']) {
      const res = await call(method, {}, { id: 'synthetic', title: '作品集', products: [], leadText: formatted + attacks[0] });
      assert.equal(res.code, 200);
      assert.equal(saved.leadText, clean(formatted + attacks[0]));
      assert.equal(saved.shop, 'test.myshopify.com');
    }
    const count = writes;
    saved = { ...saved, shop: 'other.myshopify.com' };
    assert.equal((await call('PUT', {}, { id: 'synthetic', leadText: attacks[0] })).code, 403);
    assert.equal((await call('GET', { id: 'synthetic' })).code, 403);
    assert.equal((await call('POST', {}, {}, false)).code, 401);
    assert.equal(writes, count);
});

test('actual preview component renders safely in public and editable modes', () => {
  const Preview = load('src/components/PreviewCatalog.tsx', {
    '@/lib/richText': rich, '@/pages/admin/catalogs/new.module.css': {},
  }).default;
  for (const editable of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(AppProvider, { i18n: {} },
      React.createElement(Preview, { title: '合成カタログ', products: [{ id: 'synthetic-product', title: '合成作品', price: '1000', imageUrl: '/synthetic.png' }], editable, leadText: formatted + attacks[1] })));
    assert.match(html, /合成作品/);
    assert.match(html, /<strong>太字<\/strong>/);
    assert.match(html, /ql-size-large/);
    assert.doesNotMatch(html, /onerror=|onclick=|<script/);
  }
});
