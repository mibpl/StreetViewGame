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
      radius: 200 * 1000,  // meters
      source: google.maps.StreetViewSource.OUTDOOR,
    },
    verify_cb,
  );
}