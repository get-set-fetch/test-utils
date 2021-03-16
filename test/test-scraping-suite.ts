import assert from 'assert';
import { ScrapingSuite } from '../lib';
import { IScrapingDefinition } from '../lib/scraping-suite/ScrapingSuite';

describe('ScrapingSuite', () => {
  it('getTests - count', () => {
    const tests = ScrapingSuite.getTests();
    assert.strictEqual(tests.length >= 28, true);
  });

  it('getTests - definition', () => {
    const redirectTest = ScrapingSuite.getTests().find(test => test.title === 'Static - Status - 301 Redirect - Html');

    const expectedDefinition:IScrapingDefinition = {
      url: "http://sitea.com/redirect-pageA.html",
      pipelines: ["browser-static-content", "dom-static-content"],
      pluginOpts: [
        {
          name: "ExtractHtmlContentPlugin",
          selectorPairs: [
            {
              contentSelector: "h1"
            }
          ]
        }
      ]
    };

    assert.deepStrictEqual(redirectTest.definition, expectedDefinition);
  });

});
