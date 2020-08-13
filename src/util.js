/*global google*/

const service = new google.maps.StreetViewService();

export function chooseRandomPointOnSphere() {
  const u = Math.random();
  const v = Math.random();
  const theta = 2.0 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);

  return new google.maps.LatLng(
    phi * (180 / Math.PI) - 90,
    theta * (180 / Math.PI),
  );
}

export function chooseRandomStreetView(callback) {
  function verify_cb(data, status) {
    if (status == 'OK') {
      callback(data.location.latLng);
    } else {
      console.log(status);
      chooseRandomStreetView(callback);
    }
  }

  const latLng = chooseRandomPointOnSphere();

  service.getPanorama(
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

export async function aChooseRandomStreetView() {
  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, _) => {
    chooseRandomStreetView(resolve);
  });
}

export function haversine_distance(p1, p2) {
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
