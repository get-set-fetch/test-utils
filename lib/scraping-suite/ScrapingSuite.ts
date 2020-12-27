import {assert} from 'chai';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {IVirtualHost} from '../server/GsfServer';

export interface IScrapingDefinition {
  url: string;
  scenario: string;
  pluginOpts: {
    name: string;
    [key: string]: any;
  }[];
}

export interface IScrapingResource {
  url: string;
  contentType: string;
  content: string[][];
  actions: string[];
}

export interface IScrapingTest {
  title: string;
  vhosts: IVirtualHost[];
  definition: IScrapingDefinition;
  resources: IScrapingResource[];
}

export default class ScrapingSuite {

  static getTests():IScrapingTest[] {
    const testFiles = readdirSync(__dirname).filter(file => /\.json$/.test(file));

    const tests: IScrapingTest[] = testFiles.map(testFile => {
      const test:IScrapingTest = JSON.parse(readFileSync(join(__dirname, testFile), 'utf8'));
      test.vhosts.forEach(vhost => {
        vhost.root = join(__dirname, vhost.root);
      })
      return test;
    });

    return tests;
  }

  static checkResources(actualResources: IScrapingResource[], expectedResources: IScrapingResource[]) {
    assert.strictEqual(actualResources.length, expectedResources.length);
    expectedResources.forEach(expectedResource => {
      const actualResource = actualResources.find(actualResource => {
        if (expectedResource.url !== actualResource.url) return false;
        if (expectedResource.actions) {
          if (!actualResource.actions) return false;
          return expectedResource.actions.join(":") === actualResource.actions.join(":")
        }

        return true;
      });
      if (!actualResource) throw new Error(`url ${expectedResource.url}, actions ${expectedResource.actions} not scraped`);

      const checkScalarProps = ["contentType" ];
      const checkArrayProps = ["content"]
      const checkObjProps = ["parent"];

      checkScalarProps.forEach(scalarProp => {
        assert.strictEqual(actualResource[scalarProp], expectedResource[scalarProp], `${scalarProp} scalar doesn't match`);
      });

      checkObjProps.forEach(objProp => {
        if (expectedResource[objProp]) {
          assert.deepEqual(actualResource[objProp], expectedResource[objProp], `${objProp} obj doesn't match`);
        }
      });

      checkArrayProps.forEach(arrayProp => {
        if (expectedResource[arrayProp]) {
          assert.sameDeepMembers(actualResource[arrayProp], expectedResource[arrayProp], `${arrayProp} array doesn't match`);
        }
      });
    });
  }

}