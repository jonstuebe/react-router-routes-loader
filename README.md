# react-router-routes-loader

A loader for generating route config array for use with [React Router](https://github.com/ReactTraining/react-router) and [Webpack](https://github.com/webpack/webpack)

## Purpose

The purpose of this loader is to give you a similar experience to [Next.js](https://nextjs.org/) of file-based routing. However, instead of having to use a completely different router like Next.js, you can use [React Router](https://github.com/ReactTraining/react-router).

## Usage

This assumes you have a Webpack project with React Router set up.

1. Install:

   `yarn add --dev react-router-routes-loader`

2. In your main `App.<js|tsx>` file (or something similar) add the require call to `react-router-routes-loader` in order to retrieve the routing information that you will want to pass to `react-router-dom`:

   ```js
   // will generate a route config from your current working directory
   const routes = require("react-router-routes-loader!.");

   // will generate a route config from the pages directory in your working directory (similar to Next.js)
   const routes = require("react-router-routes-loader!./pages");
   ```

3. Use the `routes` in combination with [React Router](https://github.com/ReactTraining/react-router) to render your routes:

```javascript
<Router>
  <Switch>
    {routes.map((route, idx) => {
      return (
        <Route
          key={idx}
          component={route.component}
          path={route.path}
          exact={Boolean(route.exact)}
        />
      );
    })}
    {/* other routes can go here (404, etc) */}
  </Switch>
</Router>
```

```typescript
// in typescript
<Router>
  <Switch>
    {routes.map(
      (route: { component: any; path: string; exact: string }, idx: number) => {
        return (
          <Route
            key={idx}
            component={route.component}
            path={route.path}
            exact={Boolean(route.exact)}
          />
        );
      }
    )}
    {/* other routes can go here (404, etc) */}
  </Switch>
</Router>
```

## Folder Structure

Here is a basic React project. All of the project code lives in `src` with a top level `index.tsx` and `App.tsx`. For this example, `App.tsx` is the file that will contain our reference to `react-router-routes-loader`. Let's say also we passed `react-router-routes-loader!./pages`:

```
└── src
    ├── App.tsx
    ├── components
    │   ├── Header.tsx
    │   └── Layout.tsx
    ├── index.tsx
    └── pages
        ├── _404.tsx
        ├── components
        │   └── index.tsx
        ├── about.tsx
        └── index.tsx
```

- `http://app.dev/` -> `./src/pages/index.tsx`
- `http://app.dev/about` -> `./src/pages/about.tsx`
- `http://app.dev/components` -> `./src/pages/components/index.tsx`

## Dynamic Segments

Dynamic segments such as `/blog/:slug` are not yet supported but coming soon!

## Licence

MIT
