import {assert} from 'chai';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';
import {IVirtualHost} from '../server/GsfServer';

export interface IScrapingDefinition {
  url: string;
  scenarios: string[];
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
  status: number;
}

export interface IScrapingTest {
  title: string;
  vhosts: IVirtualHost[];
  definition: IScrapingDefinition;
  resources: IScrapingResource[];
  archiveEntries: string[];
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

      const checkScalarProps = ["contentType", "status" ];
      const checkArrayProps = ["content"]
      const checkObjProps = ["parent"];

      checkScalarProps.forEach(scalarProp => {
        if (expectedResource.hasOwnProperty(scalarProp)) {
          assert.strictEqual(actualResource[scalarProp], expectedResource[scalarProp], `${expectedResource.url} - ${scalarProp} scalar doesn't match`);
        }
      });

      checkObjProps.forEach(objProp => {
        if (expectedResource.hasOwnProperty(objProp)) {
          assert.deepEqual(actualResource[objProp], expectedResource[objProp], `${expectedResource.url} - ${objProp} obj doesn't match`);
        }
      });

      checkArrayProps.forEach(arrayProp => {
        if (expectedResource.hasOwnProperty(arrayProp)) {
          if (!expectedResource[arrayProp]) {
            assert.strictEqual(actualResource[arrayProp], expectedResource[arrayProp], `${expectedResource.url} - ${arrayProp} array doesn't match`);
          }
          else {
            assert.sameDeepMembers(actualResource[arrayProp], expectedResource[arrayProp], `${expectedResource.url} - ${arrayProp} array doesn't match`);
          }
        }
      });
    });
  }

  static async checkArchiveEntries(archivePath: string, archiveEntries: string[]) {
    const archiveContent = readFileSync(archivePath, 'binary');
    const archive = await JSZip.loadAsync(archiveContent);

    // check archive entries
    // collect a png sample if possible
    let pngSample:Uint8Array;
    const actualEntries = await Promise.all(
      Object.keys(archive.files).map(async name => {
        const filename = archive.files[name].name;
        if (/\.png$/.test(filename) && !pngSample) {
          pngSample = await archive.files[name].async('uint8array');
        }
        return filename;
      }),
    );
    assert.sameMembers(actualEntries, archiveEntries);

    // if present, check the png sample
    const pngHeader = [ 137, 80, 78, 71, 13, 10, 26, 10 ];
    if (pngSample) {
      assert.sameMembers(Array.from(pngSample.slice(0, 8).values()), pngHeader);
    }
  }

}