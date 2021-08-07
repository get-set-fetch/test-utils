import connect from 'connect';
import serveStatic from 'serve-static';
import vhost from 'vhost';
import path from 'path';
import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import zlib from 'zlib';

export interface IVirtualHost {
  hostname: string;
  root: string;
  staticOpts?: serveStatic.ServeStaticOptions;
}

export interface IServerOpts {
  rootDir: string;
  host: string;
  httpPort: number;
  httpsPort: number;
  serveStaticOpts?: Map<string, serveStatic.ServeStaticOptions>;
  tlsDir: string;
}

export default class GsfServer {
  host: string;
  httpPort: number;
  httpsPort: number;

  connApp: connect.Server;
  http: http.Server;

  constructor({
    // avoid listening on unspecified ip address 0.0.0.0
    host = '127.0.0.1',
    httpPort = 8080,
    httpsPort = 8443,
  }: Partial<IServerOpts> = {}) {
    this.host = host;
    this.httpPort = httpPort;
    this.httpsPort = httpsPort;
  }

  start() {
    this.http = http.createServer(
      (req, res) => {
        if (!this.connApp) throw new Error('no virtualhosts definition found!')
        return this.connApp(req, res);
      }
    ).listen({
      host: this.host,
      port: this.httpPort
    });
    console.log(`http server started on port ${this.httpPort}`);
  }

  update(virtualHosts: IVirtualHost[]) {
    this.connApp = connect();

    virtualHosts.forEach(virtualHost => {
      const vhostApp = connect();

      vhostApp.use(this.redirect);
      vhostApp.use(this.serveStaticCompressed(virtualHost.root));
      vhostApp.use(serveStatic(virtualHost.root, virtualHost.staticOpts));

      this.connApp.use(<any>vhost(virtualHost.hostname, vhostApp));
    });
  }


  /*
  redirect all /dir/redirect-page.html req to /dir/page.html
  some integration tests make use of this functionality to test the scraper redirect handling capabilities
  */
  redirect(req: IncomingMessage, res: ServerResponse, next: connect.NextFunction) {
    if (/redirect-/.test(req.url)) {
      const targetUrl = req.url.replace(/redirect-/, '');
      res.statusCode = 301;
      res.setHeader('Location', targetUrl);
      res.end();
    }
    else {
      next();
    }
  }

  serveStaticCompressed(rootDir: string) {
    return (req: IncomingMessage, res: ServerResponse, next: connect.NextFunction) => {
      // handle only gzip compression for existing files with extension
      if (
        /gzip/.test(req.headers["accept-encoding"].toString())
        && fs.existsSync(path.join(rootDir, req.url))
        && path.basename(path.join(rootDir, req.url)).split(".").length === 2
      ) {
        const ext = path.basename(path.join(rootDir, req.url)).split(".")[1];
        let contentType;
        switch (ext) {
          case "html":
            contentType = 'text/html';
            break;
          case "png":
            contentType = 'image/png';
            break;
          case "pdf":
            contentType = 'application/pdf';
            break;
        }

        res.writeHead(200, {
          'Content-Encoding': 'gzip',
          'Content-Type': contentType
        });
        fs.createReadStream(path.join(rootDir, req.url)).pipe(zlib.createGzip()).pipe(res);
      }
      else {
        next();
      }
    }
  }

  stop() {
    this.http.close();
  }
}