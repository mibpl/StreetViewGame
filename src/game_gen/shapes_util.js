import axios from 'axios';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { randomPoint } from '@turf/random';

const INDEX_FILE_NAME = 'index.json';
const AXIOS_INSTANCE = axios.create({
  baseURL: baseShapesUrl(),
});

export function baseShapesUrl() {
  const baseUrl = process.env.VUE_APP_LOCATIONS_DIR || null;
  if (baseUrl === null) {
    return null;
  }

  // Remove all trailing slashes
  let trailing_slashes_count = 0;
  for (let i = baseUrl.length - 1; i >= 0; i--) {
    if (baseUrl.charAt(i) === '/') {
      trailing_slashes_count++;
    } else {
      break;
    }
  }
  if (trailing_slashes_count > 0) {
    return baseUrl.slice(0, -trailing_slashes_count);
  } else {
    return baseUrl;
  }
}

export async function fetchShapesIndex() {
  const response = await AXIOS_INSTANCE.get(INDEX_FILE_NAME);
  return response.data;
}

export async function fetchShape(relativePath) {
  const response = await AXIOS_INSTANCE.get(relativePath);
  return new Shape(response.data);
}

export class Shape {
  constructor(feature_geojson) {
    this.feature = feature_geojson;
  }

  name() {
    return this.feature.properties.name;
  }

  area() {
    return this.feature.properties.area;
  }

  randomPointWithin() {
    for (let i = 0; i < 1000000000; i++) {
      const point = randomPoint(1, { bbox: this.feature.bbox }).features[0];
      if (booleanPointInPolygon(point.geometry, this.feature)) {
        return point;
      }
    }
    console.error('You are really unlucky or the bbox sucks.');
  }
}
