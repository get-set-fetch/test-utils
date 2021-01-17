import GsfServer from './server/GsfServer';
import ScrapingSuite from './scraping-suite/ScrapingSuite';

const extra = 'just a named export required for testing partial package import when bundling scraper plugins';

export {
  GsfServer,
  ScrapingSuite,
  extra,
}