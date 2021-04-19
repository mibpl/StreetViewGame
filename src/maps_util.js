import destination from '@turf/destination';

const google = window.google;

class GoogleMapsWrapper {
  init() {
    this.service = new google.maps.StreetViewService();
  }

  // Wraps call getPanorama call to be async.
  //
  // The original documentation:
  // https://developers.google.com/maps/documentation/javascript/reference/street-view-service#StreetViewService
  //
  // @param {google.maps.StreetViewLocationRequest} request
  //
  // @returns {Promise<?google.maps.StreetViewPanoramaData>} The found
  //  panorama - null if zero results were returned.
  async asyncGetPanorama(request) {
    return new Promise((resolve, reject) => {
      this.service.getPanorama(request, (panoramaData, status) => {
        if (status === 'OK') {
          resolve(panoramaData);
        } else if (status === 'ZERO_RESULTS') {
          resolve(null);
        } else {
          reject(status);
        }
      });
    });
  }

  // Attempts to find a panorama within `radius_km` of point.
  //
  // @async
  // @param {Object} point - Object with (lat, lng) elements.
  // @param {Object} radius_m - The search radius in meters, defaults to 40 km.
  // @returns {Object} The closest panorama (object with {lat, lng} elements)
  // or null/undefined if not found.
  async getClosestPanorama(point, radius_m) {
    if (radius_m == undefined) radius_m = 40 * 1000;
    const requestedPoint = new google.maps.LatLng(point.lat, point.lng);
    const foundPanorama = await this.asyncGetPanorama({
      location: requestedPoint,
      preference: google.maps.StreetViewPreference.NEAREST,
      radius: radius_m, // meters
      source: google.maps.StreetViewSource.OUTDOOR,
    });
    if (foundPanorama?.location?.latLng != null) {
      return foundPanorama?.location?.latLng.toJSON();
    }
    return null;
  }

  // Attempts to jump to a panorama at most `distance_km` away from `point`
  // in the direction `bearing_deg`. We try to find a point exactly
  // `distance_km` away, but if that fails, we make a total of 10 attempts
  // to jump to any point in the direction using a linear distance backoff.
  //
  // @async
  // @param {Object} point - Object with {lat, lng} elements - the starting point.
  // @param {float} distance_km - Distance of the jump in kilometers.
  // @param {float} bearing_deg - Compass bearing (0 meaning north, 90 east, -90 west).
  // @returns {Object} An object containing two fields:
  // `destination`: the closest panorama (as an object with {lat, lng} elements),
  // `distance_km`: the distance of the found point wrt. the starting point.
  // If no panorama was found, will return null instead.
  async jumpByDistanceAndBearing(point, distance_km, bearing_deg) {
    // We try to search for points in a triangle with heigth distance_km
    // and base 0.1 * height. However, we must approximate this by covering
    // the triangle with circles. The current_distance_km backoff computation
    // below is a heuristic attempt to tradeoff the area coverage of the
    // triangle, the distance from the player at which we stop trying
    // (currently around 49km for a jump of 500km), and number of attempts.
    // To try to optimize this yourself, see src/tool/JumpSimulator.ipynb.
    const num_attempts = 15;
    const cone_atan = 0.1;
    let panorama = null;
    let current_distance_km = distance_km;
    let last_attempt_distance_km = distance_km;
    for (let attempt = 0; attempt < num_attempts; attempt++) {
      const jump_point_turf = destination(
        [point.lng, point.lat],
        current_distance_km,
        bearing_deg,
      ).geometry.coordinates;
      const radius_m = current_distance_km * cone_atan * 1000;
      panorama = await this.getClosestPanorama(
        { lat: jump_point_turf[1], lng: jump_point_turf[0] },
        radius_m,
      );
      last_attempt_distance_km = current_distance_km;
      current_distance_km -= (radius_m / 1000) * 1.4 * Math.pow(1.013, attempt);
      if (panorama != null) {
        break;
      }
    }
    if (panorama != null) {
      return {
        destination: { lat: panorama.lat, lng: panorama.lng },
        distance_km: this.haversine_distance(point, panorama),
      };
    }
    return {
      stopped_at_distance_km: last_attempt_distance_km,
    };
  }

  // Returns an average of the given points, which can be used as an approximate center
  // point.
  //
  // @async
  // @param {Array<Object>} point - Array of objects with {lat, lng} elements.
  // @returns {Object} The mean of the given points, as an object with {lat, lng}
  // elements.
  centerPoint(input_points) {
    let result = { lat: 0, lng: 0 };
    for (const point of input_points) {
      result.lat += point.lat;
      result.lng += point.lng;
    }
    result.lat /= input_points.length;
    result.lng /= input_points.length;
    return result;
  }

  haversine_distance(p1, p2) {
    var R = 6371.071;
    var rlat1 = p1.lat * (Math.PI / 180); // Convert degrees to radians
    var rlat2 = p2.lat * (Math.PI / 180); // Convert degrees to radians
    var difflat = rlat2 - rlat1; // Radian difference (latitudes)
    var difflon = (p2.lng - p1.lng) * (Math.PI / 180); // Radian difference (longitudes)
    const sin_difflat_2 = Math.sin(difflat / 2);
    const sin_difflon_2 = Math.sin(difflon / 2);
    var d =
      2 *
      R *
      Math.asin(
        Math.sqrt(
          sin_difflat_2 * sin_difflat_2 +
            Math.cos(rlat1) * Math.cos(rlat2) * sin_difflon_2 * sin_difflon_2,
        ),
      );
    return d;
  }

  score(unscored_summary) {
    const scores = {};
    const max_score = 100;
    for (const player in unscored_summary) {
      const d = unscored_summary[player].distance;
      let r = 0;
      if (d < 0.5) {
        r = max_score;
      } else {
        r = max_score - Math.sqrt(d);
      }

      if (r < 0) r = 0;
      scores[player] = r;
    }
    return scores;
  }

  colorForUuid(user_uuid, uuid_universe) {
    const colorArr = [
      '#e6194B',
      '#911eb4',
      '#3cb44b',
      '#4363d8',
      '#f58231',
      '#42d4f4',
      '#f032e6',
      '#bfef45',
      '#fabed4',
      '#dcbeff',
      '#9A6324',
      '#800000',
      '#aaffc3',
      '#808000',
      '#ffd8b1',
      '#000075',
      '#a9a9a9',
    ];

    let universe = uuid_universe.slice();
    universe.sort();
    const color_count = colorArr.length;
    const colorInd = (universe.indexOf(user_uuid) + color_count) % color_count;

    return colorArr[colorInd];
  }
}

// Exporting a concrete object makes it effectively a singleton.
export default new GoogleMapsWrapper();
