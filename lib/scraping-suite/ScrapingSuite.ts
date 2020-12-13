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
  content: {[key: string]: string[]};
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
      const actualResource = actualResources.find(actualResource => actualResource.url === expectedResource.url);
      if (!actualResource) throw new Error(`url ${expectedResource.url} not scraped`);

      const checkScalarProps = ["contentType" ];
      const checkObjProps = ["content", "parent"];

      checkScalarProps.forEach(scalarProp => {
        assert.strictEqual(actualResource[scalarProp], expectedResource[scalarProp], `${scalarProp} doesn't match`);
      });

      checkObjProps.forEach(objProp => {
        if (expectedResource[objProp]) {
          assert.deepEqual(actualResource[objProp], expectedResource[objProp], `${objProp} doesn't match`);
        }
      })
    });
  }

}