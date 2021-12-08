import { Dirent, promises as fs } from "fs";
import path from "path";
import * as webpack from "webpack";
import { stringifyRequest } from "loader-utils";

interface Route {
  component: string;
  exact: true;
  path: string;
}

function filterFiles(fileName: string): boolean {
  if (fileName.indexOf("_404") !== -1) {
    return false;
  }

  return ![".DS_Store", ".git", "node_modules"].includes(fileName);
}

function getFileSlug(fileName: string): string {
  return fileName.split(".")[0];
}

function isIndexFile(fileSlug: string): boolean {
  return fileSlug === "index";
}

function isParamFile(fileSlug: string): boolean {
  return fileSlug.startsWith("[") && fileSlug.endsWith("]");
}

function isRootFile(fileSlug: string): boolean {
  return !isIndexFile(fileSlug) && !isParamFile(fileSlug);
}

function buildPath(
  basePath: string,
  directory: string,
  fileSlug?: string
): string {
  if (fileSlug) {
    return directory.replace(basePath, "") === ""
      ? `/${fileSlug}`
      : directory.replace(basePath, "") + `/${fileSlug}`;
  } else {
    return directory.replace(basePath, "") === ""
      ? "/"
      : directory.replace(basePath, "");
  }
}

async function buildRoute(
  basePath: string,
  directory: string,
  fileName: string
): Promise<Route> {
  const fileSlug = getFileSlug(fileName);

  const route = {
    exact: true as true,
    component: path.join(directory, fileName),
  };

  if (isIndexFile(fileSlug)) {
    return {
      ...route,
      path: buildPath(basePath, directory),
    };
  }

  if (isRootFile(fileSlug)) {
    return {
      ...route,
      path: buildPath(basePath, directory, fileSlug),
    };
  }

  if (isParamFile(fileSlug)) {
    const paramsSlug = `:${fileSlug.slice(1, -1)}`;
    return {
      ...route,
      path: buildPath(basePath, directory, paramsSlug),
    };
  }

  return {
    ...route,
    path: path.join(directory, fileSlug).replace(basePath, ""),
  };
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
        component: require(${stringifyRequest(context, route.component)})
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
