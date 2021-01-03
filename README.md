# StreetViewGame

A multiplayer game about guessing the location based on interactive StreetView
data.

By default the game runs for 5 rounds, in each all the players try to guess the
location in the world based on StreetView images. Each player can move
independently through the StreetView world and registers their own guess.

All guesses are assigned a score based on the distance from the actual location.

During game creation, users can choose from a pre-defined list of locations (eg.
continents) and have all rounds generated only within those locations.

## How it works

All the code in this repository is a client-side JavaScript application. The
shared game state is stored in Google's Firebase database which is accessed
using an API key. An API key is also used for accessing Maps API to display
StreetView. The application code can be served as a static site (all the
logic is in JavaScript, there is no server code).

To access Firebase database and the Maps API the application uses API keys. That
means that anyone who has access to the statically served application also can
use up your Maps quota and write/read/delete basically anything on the Firebase
database.

The intended usage for this code is within a small group of friends (so that the
usage of Maps API doesn't cost much) with the code hosted behind a proxy
limiting the access to just that group of friends. See below for how to achieve
that using AppEngine and Google IAP.

## How to host it

To work properly this application needs
[Google Maps API](https://developers.google.com/maps/documentation/javascript/overview)
and a [Firebase Realtime database](https://firebase.google.com/docs/database).
You can host it anywhere (even locally, if all you want is to play it with your
housemates) but this section will describe hosing on Google's AppEngine. The
repository already contains config files for that purpose.

### Set up the projects

1. First
[create a GCP project](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
for your application.

2. Then [create a Firebase project](https://firebase.google.com/docs/web/setup) -
to keep all the resource usage in one place, the easiest would be to connect it
to the previously created GCP projects.

### Enable Maps API and get an API key

To use the Maps API you first need to enable it for your GCP project. You can
do it here:
https://console.cloud.google.com/apis/library/maps-backend.googleapis.com (make
sure to choose the right project).

Then create an API key, as described
[here](https://developers.google.com/maps/documentation/javascript/get-api-key).
Remember to restrict it to "Maps JavaScript API" only and potentially to the
domain from where the game will be served.

### Configure Firebase

On the Firebase side you need the following:

1. [Enable anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth#before-you-begin)
1. Add the domain from where your application will be served to authorized
   domains in Firebase's authentication settings.
1. [Create a Realtime Database](https://firebase.google.com/docs/database/web/start#create_a_database)
1. Modify the security rules of the new database to allow writes and reads to
  anyone with the API key:
    ```
    {
      "rules": {
        ".read": true,
        ".write": true
      }
    }
    ```
1. [Register a new Web app](https://firebase.google.com/docs/web/setup#register-app)

The last step should produce all the information you need to connect to the
Firebase database.

### Create config file

In the main folder of this repo, create a file named `.env.production.local`
with the following content (replace `<replace>` with the data from Firebase and
your Maps API key):
```
NODE_ENV=production
VUE_APP_DB_ENV=production
# The following is the prefix for all the game databases that will be created on
# the Firebase database. Can be empty.
VUE_APP_DB_PREFIX=games/

VUE_APP_API_KEY=<replace_with_maps_api_key>
VUE_APP_FIREBASE_API_KEY=<replace>
VUE_APP_FIREBASE_AUTH_DOMAIN=<replace>
VUE_APP_FIREBASE_DATABASE_URL=<replace>
VUE_APP_FIREBASE_PROJECT_ID=<replace>
VUE_APP_FIREBASE_STORAGE_BUCKET=<replace>
VUE_APP_FIREBASE_MESSAGING_SENDER_ID=<replace>
VUE_APP_FIREBASE_APP_ID=<replace>
# Only needed if you enabled analytics.
VUE_APP_FIREBASE_MEASUREMENT_ID=<replace>
```

#### Locations feature

To use the locations feature, you need to have a dataset of disjoint
geographical shapes in geojson format. This repo currently hosts such a dataset
of continents, in `locations/data` folder.
To create your own, you need `index.json` file that points to files hosting all
available locations/shapes. Currently only relativePaths from index.json are
supported but adding absolute paths should be easy.

Once you have the dataset hosted, just add the link to where `index.json` is
hosted to the config file as `VUE_APP_LOCATIONS_DIR`. Eg. to use dataset from
this repo, add:
```
VUE_APP_LOCATIONS_DIR=https://raw.githubusercontent.com/mibpl/StreetViewGame/master/locations/data
```
(note that `index.json` itself is omitted from the url)

### Build the project locally

To build the project locally you need [npm](https://www.npmjs.com/get-npm).

Then you need to install the dependencies:

```
npm install
```

You can run unit tests with:

```
npm run test:unit
```

And build it with:

```
npm run build
```

Afterwards, all the static files to serve will be in `dist/` directory.

### Deploy the project to AppEngine

After the build step, the `dist/` project will include `app.yaml` file which
contains all the configuration needed to serve the static files on the free
AppEngine tier.

To do so, you will need to
[install and initialize Cloud SDK](https://cloud.google.com/sdk/docs) and then
run following from `dist/` folder:

```
gcloud app deploy
```

### Protect access to the app with Identity-Aware Proxy

To protect the AppEngine application from being accessed by anyone but the
listed people, go to
[Identity-Aware Proxy](https://console.cloud.google.com/security/iap) page in
the Cloud Console and turn on the "IAP" checkbox.

Afterwards, only the people (and groups) explicitly listed as
"IAP-secured Web App User" (a panel on the right should appear once you click on
"App Engine App") will be able to access the AppEngine application. The
propagation typically takes at least a few minutes.

### Build and deploy remotely with Cloud Build

The repository already contains a config for Cloud Build in `cloudbuild.yaml`.

For this to work, you will need to:
* [enable Cloud Build API](https://console.cloud.google.com/marketplace/product/google/cloudbuild.googleapis.com)
for your project
* locate the service account responsible for Cloud Build (it should have
  `cloudbuild.gserviceaccount.com` in the name) in
  [IAM & Admin](https://console.cloud.google.com/iam-admin/iam) console
* give it the following roles (see also
  [Google's documentation](https://cloud.google.com/appengine/docs/flexible/nodejs/roles#recommended_role_for_application_deployment)):
  - App Engine Admin
  - Cloud Build Service Account
  - Cloud Build Editor
  - Service Account User
  - Storage Admin

Afterwards, you should be able to run:
```
gcloud builds submit --config cloudbuild.yaml --async
```
from the root of this repository (assuming it contains the
`.env.production.local` file) and it will build and deploy itself from
Cloud Build servers.
