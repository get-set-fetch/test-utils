import { assert } from 'chai';
import http from 'http';
import path from 'path';
import zlib from 'zlib';
import { pipeline, Writable } from 'stream';
import GsfServer from '../lib/server/GsfServer';
import ScrapingSuite, { IScrapingDefinition } from '../lib/scraping-suite/ScrapingSuite';

describe('ScrapingSuite', () => {
  it('getTests - count', () => {
    const tests = ScrapingSuite.getTests();
    assert.strictEqual(tests.length >= 28, true);
  });

  it('getTests - definition', () => {
    const redirectTest = ScrapingSuite.getTests().find(test => test.title === 'Static - Status - 301 Redirect - Html');

    const expectedDefinition: IScrapingDefinition = {
      name: "sitea.com",
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
      ],
      resources: [
        {
          url: "http://sitea.com/redirect-pageA.html"
        }
      ]
    };

    assert.deepStrictEqual(redirectTest.definition, expectedDefinition);
  });

  it('serve static compressed', async () => {
    const srv = new GsfServer();
    srv.start();

    srv.update([{ root: path.join(__dirname, 'resources'), hostname: "sitea.com" }]);

    let resHeaders: http.IncomingHttpHeaders;

    const result: Buffer = await new Promise((resolve, reject) => {
      const req = http.request({
        method: "GET",
        host: '127.0.0.1',
        port: 8080,
        path: '/pageA.html',
        headers: {
          Host: 'sitea.com',
          'Accept-Encoding': 'gzip'
        }
      });

      let chunks: Buffer[] = [];

      req.on('response', (response) => {
        resHeaders = response.headers;
        const output = new Writable({
          write(chunk, encoding, done) {
            chunks.push(Buffer.from(chunk));
            done();
          },
        });

        const onComplete = (err) => {
          if (err) {
            reject(err);
          }
          else {
            resolve(Buffer.concat(chunks))
          }
        };

        pipeline(response, zlib.createGunzip(), output, onComplete);
      });

      req.end();
    });

    assert.include(resHeaders, {
      'content-encoding': 'gzip',
      'content-type': 'text/html',
    });
    assert.strictEqual(result.toString("utf8"), '<body><p>a</p></body>');

    srv.stop();
  })

});
