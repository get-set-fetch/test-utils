import assert from 'assert';
import { ScrapingSuite } from '../lib';

describe('ScrapingSuite', () => {
  it('getTests', () => {
    const tests = ScrapingSuite.getTests();
    assert.strictEqual(tests.length >= 18, true);
  });

  it('getTests', () => {
    const redirectTest = ScrapingSuite.getTests().find(test => test.title === 'Static - Redirect');

    const expectedDefinition = {
      url: "http://sitea.com/redirect-pageA.html",
      scenario: "static-content",
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
