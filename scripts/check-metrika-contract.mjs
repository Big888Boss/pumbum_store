import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const metrika = read('src/components/analytics/YandexMetrika.tsx');
const routeTracker = read('src/components/analytics/MetrikaRouteTracker.tsx');
const events = read('src/components/analytics/MetrikaEvents.tsx');
const goals = read('src/lib/analytics/metrika.ts');
const layout = read('src/app/layout.tsx');
const siteHeader = read('src/components/layout/SiteHeader.tsx');
const home = read('src/app/page.tsx');
const search = read('src/app/search/page.tsx');
const catalog = read('src/app/catalog/page.tsx');
const contacts = read('src/app/contacts/page.tsx');
const product = read('src/app/catalog/[category]/[sku]/page.tsx');
const activeSource = [metrika, routeTracker, events, goals, layout, siteHeader, home, search, catalog, contacts, product].join('\n');

assert(metrika.includes('defer: true'), 'Metrika must disable the automatic SPA pageview');
assert(metrika.includes('<MetrikaRouteTracker />'), 'Metrika route tracker is not mounted');
assert(routeTracker.includes('trackMetrikaPageview'), 'SPA route tracker does not send hit');
assert(routeTracker.includes('lastTrackedUrl.current === absoluteUrl'), 'SPA route tracker lacks duplicate protection');
assert(events.includes('query_length: query.length'), 'search goal must send only the query length');
assert(!events.includes('query,'), 'raw search query must not be sent to Metrika');

for (const goal of ['search_submit', 'click_phone', 'click_email', 'view_product', 'click_order']) {
  assert(goals.includes(`'${goal}'`), `missing Metrika goal ${goal}`);
}

for (const removedGoal of ['add_to_cart', 'clear_cart', 'begin_checkout']) {
  assert(!activeSource.includes(removedGoal), `inactive cart goal ${removedGoal} must not be emitted`);
}

assert(search.includes('MetrikaSearchForm') && catalog.includes('MetrikaSearchForm'), 'search forms are not tracked');
assert(layout.includes('<SiteHeader') && siteHeader.includes('METRIKA_GOALS.phoneClick') && home.includes('METRIKA_GOALS.phoneClick'), 'global phone actions are not tracked');
assert(contacts.includes('METRIKA_GOALS.phoneClick') && contacts.includes('METRIKA_GOALS.emailClick'), 'contact actions are not tracked');
assert(product.includes('MetrikaProductView') && product.includes('METRIKA_GOALS.orderClick'), 'product funnel actions are not tracked');

console.log(JSON.stringify({
  spaPageviews: 'manual-hit-with-deduplication',
  goals: ['search_submit', 'click_phone', 'click_email', 'view_product', 'click_order'],
  rawSearchQuerySent: false,
  inactiveCartGoals: [],
}, null, 2));
