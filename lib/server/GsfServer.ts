import connect from 'connect';
import serveStatic from 'serve-static';
import vhost from 'vhost';
import http from 'http';

export interface IVirtualHost {
  hostname: string;
  root: string;
  staticOpts?: serveStatic.ServeStaticOptions;
}

export interface IServerOpts {
  rootDir: string;
  httpPort?: number;
  httpsPort?: number;
  serveStaticOpts?: Map<string, serveStatic.ServeStaticOptions>;
  tlsDir: string;
}

export default class GsfServer {
  httpPort: number;
  httpsPort: number;

  connApp: connect.Server;
  http: http.Server;

  constructor({
    httpPort = 8080,
    httpsPort = 8443,
  }:Partial<IServerOpts> = {}) {
    this.httpPort = httpPort;
    this.httpsPort = httpsPort;
  }

  start() {
    this.http=http.createServer(
      (req, res) => {
        if (!this.connApp) throw new Error('no virtualhosts definition found!')
        return this.connApp(req, res);
      }
    ).listen(this.httpPort);
    console.log(`http server started on port ${this.httpPort}`);
  }

  update(virtualHosts: IVirtualHost[]) {
    this.connApp = connect();

    virtualHosts.forEach(virtualHost => {
      const vhostApp = connect();

      vhostApp.use(serveStatic(virtualHost.root, virtualHost.staticOpts));

      this.connApp.use(<any>vhost(virtualHost.hostname, vhostApp));
      //this.connApp.use(serveStatic(virtualHost.root, virtualHost.staticOpts));
      console.log(`serving ${virtualHost.hostname} from ${virtualHost.root}`);
    })
  }

  stop() {
    this.http.close();
  }

}