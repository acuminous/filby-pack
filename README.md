# filby-pack

filby-pack turns a [Filby](https://github.com/acuminous/filby) projection into an npm package, so that an application can read the projection without a database or a network call. The package contains the projection's change log and the documents at every change set, including change sets that have not yet taken effect. An application deployed in November with a change set that takes effect on 1 January starts using the new data on 1 January without being redeployed.

Packages suit reference data that is small enough to ship with an application. Read larger projections through Filby's HTTP API.

## Building a package

A package is built in two steps, usually in the CI pipeline of the repository that holds your Filby migrations. First, `filby export` applies the migrations to an empty database and writes one projection to a bundle file. Then filby-pack turns the bundle into a package directory, which you publish with `npm publish`.

```bash
TZ=UTC npx filby export --config filby.json --projection 'Parks@1' --out parks-v1.json
npx filby-pack --bundle parks-v1.json --name @example/parks --out dist/parks
npm publish dist/parks
```

Change set ids are assigned as the migrations are applied, so a package built from the same migrations as your production database uses the same ids. The [Filby README](https://github.com/acuminous/filby#export-a-projection) describes `filby export` and its configuration file.

## Reading a package

An application installs the package and asks it for the documents in force:

```js
const parks = require('@example/parks');

const now = new Date();
const changeSet = parks.asOf(now);
const documents = parks.getDocuments(changeSet.id);
```

`asOf` finds the change set in force at a given time, and `getDocuments` returns the documents at that change set. The package always returns every document, so the application filters, sorts and pages them itself. Packages are CommonJS, have no dependencies and include TypeScript declarations generated from the projection's fields.

| Export | Description |
| ------ | ----------- |
| `name`, `version`, `description` | The projection's name, version and description. |
| `changeSets` | The change log, with `effective` and `lastModified` as `Date` objects. |
| `asOf(instant)` | The change set in force at the given time, or `undefined` if there is none. |
| `getDocuments(changeSetId)` | Every document at the change set. |
| `getCurrentDocuments(instant)` | Every document at the change set in force at the given time, which defaults to now. |

`asOf` follows the same rule as Filby's current change set. It picks the change set with the latest effective date that is not after the given time, and if several share that date, the one with the highest id.

Dates and timestamps in the documents are `Date` objects at every level, except in projections declared with `dependencies`, whose fields Filby cannot describe. Each call returns new objects, so changing a document does not affect later calls. `getDocuments` throws if the change set is not in the package, and `getCurrentDocuments` throws if no change set is in force at the given time.

## Versions

The package version is `<projection version>.<latest change set id>.0`. A new projection version can change the shape of the documents, so it starts a new major version. A new change set only adds data, so it raises the minor version. Applications that depend on `^1` therefore receive new data automatically and never move onto a new document shape by accident, and each application's lockfile records exactly which data it was built with.

To use two projection versions at once, for example while moving from one to the other, install the package twice under npm aliases:

```bash
npm install parks-v1@npm:@example/parks@^1 parks-v2@npm:@example/parks@^2
```

The package version describes the data, not the code that filby-pack generates. A filby-pack release that changes the generated module reaches applications with the next data update, so filby-pack marks such changes with a new major version of its own. Check the release notes before upgrading filby-pack.

## Command line

```bash
npx filby-pack --bundle <file> --name <package> --out <directory>
```

| Option | Value |
| ------ | ----- |
| `--bundle` | The bundle file written by `filby export`. |
| `--name` | The package name. |
| `--out` | The directory to write the package to. Missing directories are created. |

All three options are required. The command reads only the bundle, so it does not need a database. It writes `package.json`, a copy of the bundle, the runtime and the TypeScript declarations to the output directory, then writes `<name>@<version>` to stdout so that a CI job can check whether that version has already been published before running `npm publish`.

If an option is missing, the bundle cannot be read, its format is not supported or it does not match that format's schema, the command reports the problem to stderr and exits with code 1.

filby-pack reads bundle format 1. The format is described in the [Filby README](https://github.com/acuminous/filby#projection-bundle) and its JSON Schema is published at https://acuminous.github.io/filby/lib/bundle-schema.json. Bundles have their own format version, independent of Filby's version, so a Filby upgrade does not require a filby-pack upgrade unless the format changes.

## Requirements

filby-pack requires Node.js 22.12 or later.
