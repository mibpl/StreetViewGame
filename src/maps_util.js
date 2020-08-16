const google = window.google;

class GoogleMapsWrapper {
  init() {
    this.service = new google.maps.StreetViewService();
  }

  chooseRandomPointOnSphere() {
    const u = Math.random();
    const v = Math.random();
    const theta = 2.0 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    return new google.maps.LatLng(
      phi * (180 / Math.PI) - 90,
      theta * (180 / Math.PI),
    );
  }

  chooseRandomStreetView(callback) {
    const verify_cb = (data, status) => {
      if (status == 'OK') {
        callback(data.location.latLng);
      } else {
        this.chooseRandomStreetView(callback);
      }
    };

    const latLng = this.chooseRandomPointOnSphere();

    this.service.getPanorama(
      // google.maps.StreetViewLocationRequest
      {
        location: latLng,
        preference: google.maps.StreetViewPreference.NEAREST,
        radius: 200 * 1000, // meters
        source: google.maps.StreetViewSource.OUTDOOR,
      },
      verify_cb,
    );
  }

  async aChooseRandomStreetView() {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, _) => {
      this.chooseRandomStreetView(resolve);
    });
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
    const max_score = 10000;
    for (const player in unscored_summary) {
      const d = unscored_summary[player].distance;
      let r = 0;
      if (d < 100) {
        scores[player] = max_score;
      } else {
        r = max_score - 10.0 - d;
      }

      if (r < 0) r = 0;
      scores[player] = r;
    }
    return scores;
  }
}

// Exporting a concrete object makes it effectively a singleton.
export default new GoogleMapsWrapper();
