import test from 'tape-promise/tape';
import {load, fetchFile, isBrowser} from '@loaders.gl/core';
import {GeoPackageLoader} from '@loaders.gl/geopackage';
import {Tables, ObjectRowTable, Feature} from '@loaders.gl/schema';

const GPKG_RIVERS = '@loaders.gl/geopackage/test/data/rivers_small.gpkg';
const GPKG_RIVERS_GEOJSON = '@loaders.gl/geopackage/test/data/rivers_small.geojson';

const sqlJsCDN = isBrowser ? 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.5.0/' : null;

test('GeoPackageLoader#load file as table', async (t) => {
  const result: Tables<ObjectRowTable> = await load(GPKG_RIVERS, GeoPackageLoader, {
    geopackage: {sqlJsCDN}
  });

  const response = await fetchFile(GPKG_RIVERS_GEOJSON);
  const json = await response.json();

  const tableName = result.tables[0].name;
  const table = result.tables[0].table;

  t.equal(tableName, 'FEATURESriversds', 'loaded correct table name');
  t.equal(table.data.length, 1, 'Correct number of rows received');
  t.deepEqual(table.data[0], json.features[0], 'GeoPackage matches GeoJSON from OGR');

  t.ok(table.schema);
  t.equal(table.schema?.fields.length, 5);

  t.end();
});

test('GeoPackageLoader#load file as geojson', async (t) => {
  const result: Record<string, Feature[]> = await load(GPKG_RIVERS, GeoPackageLoader, {
    geopackage: {sqlJsCDN},
    gis: {format: 'geojson'}
  });

  const response = await fetchFile(GPKG_RIVERS_GEOJSON);
  const json = await response.json();

  const tableName = Object.keys(result)[0];
  const features = result[tableName];

  t.equal(tableName, 'FEATURESriversds', 'loaded correct table name');
  t.equal(features.length, 1, 'Correct number of rows received');
  t.deepEqual(features[0], json.features[0], 'GeoPackage matches GeoJSON from OGR');

  t.end();
});

test('GeoPackageLoader#load file and reproject to WGS84', async (t) => {
  const result: Tables<ObjectRowTable> = await load(GPKG_RIVERS, GeoPackageLoader, {
    geopackage: {sqlJsCDN},
    gis: {reproject: true, _targetCrs: 'WGS84'}
  });

  const tableName = result.tables[0].name;
  const table = result.tables[0].table;

  t.equal(tableName, 'FEATURESriversds', 'loaded correct table name');
  t.ok(
    table.data[0].geometry.coordinates.every((coord) => insideBbox(coord, [-180, -90, 180, 90])),
    'All coordinates in WGS84 lon-lat bounding box'
  );

  t.ok(table.schema);
  t.equal(table.schema?.fields.length, 5);

  t.end();
});

function insideBbox(coord: [number, number], bbox: number[]): boolean {
  const [minx, miny, maxx, maxy] = bbox;
  return coord[0] >= minx && coord[0] <= maxx && coord[1] >= miny && coord[1] <= maxy;
}
