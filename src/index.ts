import { Dirent, promises as fs } from "fs";
import path from "path";
import * as webpack from "webpack";
import { stringifyRequest } from "loader-utils";

interface Route {
  component: string;
  exact: true;
  path: string;
}

function filterFiles(file: string) {
  if (file.indexOf("_404") !== -1) {
    return false;
  }

  return ![".DS_Store", ".git", "node_modules"].includes(file);
}

function isIndex(file: string) {
  return file.indexOf("index") !== -1;
}

async function buildRoute(
  basePath: string,
  directory: string,
  filePath: string
): Promise<Route> {
  if (isIndex(filePath)) {
    return {
      path:
        directory.replace(basePath, "") === ""
          ? "/"
          : directory.replace(basePath, ""),
      exact: true,
      component: path.join(directory, filePath),
    };
  } else {
    return {
      path: path.join(directory, filePath.split(".")[0]).replace(basePath, ""),
      exact: true,
      component: path.join(directory, filePath),
    };
  }
}

async function buildRouteForDirectory(
  basePath: string,
  directory: string
): Promise<Route[]> {
  const files = await fs.readdir(directory, { withFileTypes: true });

  const routes = await Promise.all(
    files
      .filter((file: Dirent) => {
        return filterFiles(file.name);
      })
      .map(async (file: Dirent) => {
        if (file.isDirectory()) {
          return buildRouteForDirectory(
            basePath,
            path.join(directory, file.name)
          );
        } else if (file.isFile()) {
          return buildRoute(basePath, directory, file.name);
        } else {
          throw new Error("not a valid file or directory");
        }
      })
  );

  return flatten(routes) as Route[];
}

function flatten(items: unknown[]): unknown[] {
  const flat: unknown[] = [];

  items.forEach((item) => {
    if (Array.isArray(item)) {
      flat.push(...flatten(item));
    } else {
      flat.push(item);
    }
  });

  return flat;
}

function getAsModule(
  context: webpack.loader.LoaderContext,
  routes: Route[]
): string {
  return `module.exports = [${routes
    .map((route) => {
      return `{
        path: "${route.path}",
        exact: "${route.exact}",
        component: require(${stringifyRequest(
          context,
          route.component
        )}).default
      }`;
    })
    .join(",")}]`;
}

export default function loader(this: webpack.loader.LoaderContext) {
  const callback = this.async() as webpack.loader.loaderCallback;
  const finalCallback = callback || this.callback;
  const basePath = this.context;

  buildRouteForDirectory(basePath, basePath)
    .then((routes) => {
      for (const route of routes) {
        this.addDependency(route.component);
      }

      finalCallback(null, getAsModule(this, routes));
    })
    .catch((e) => {
      return callback(e);
    });
}
