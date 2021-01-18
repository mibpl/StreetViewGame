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

  // @async
  // @param {Array.<float>} point - Array of length two containing latitude and
  // longitude, in geojson format (lng, lat).
  // @returns {?google.maps.LatLng} The closest panorama or null/undefined if
  //   not found.
  async getClosestPanorama(point, radius) {
    if (radius == undefined) radius = 40 * 1000;
    const requestedPoint = new google.maps.LatLng(point[1], point[0]);
    const foundPanorama = await this.asyncGetPanorama({
      location: requestedPoint,
      preference: google.maps.StreetViewPreference.NEAREST,
      radius: radius, // meters
      source: google.maps.StreetViewSource.OUTDOOR,
    });
    return foundPanorama?.location?.latLng;
  }

  haversine_distance(p1, p2) {
    var R = 6371.071;
    var rlat1 = p1.lat * (Math.PI / 180); // Convert degrees to radians
    var rlat2 = p2.lat * (Math.PI / 180); // Convert degrees to radians
    var difflat = rlat2 - rlat1; // Radian difference (latitudes)
    var difflon = (p2.lng - p1.lng) * (Math.PI / 180); // Radian difference (longitudes)

    var d =
      2 *
      R *
      Math.asin(
        Math.sqrt(
          Math.sin(difflat / 2) * Math.sin(difflat / 2) +
            Math.cos(rlat1) *
              Math.cos(rlat2) *
              Math.sin(difflon / 2) *
              Math.sin(difflon / 2),
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
}

// Exporting a concrete object makes it effectively a singleton.
export default new GoogleMapsWrapper();
