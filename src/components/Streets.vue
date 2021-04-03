<template>
  <div id="street-view-container">
    <v-btn
      v-if="backToStartEnabled"
      id="back-to-position-button"
      class="custom-control-button"
      fab
      elevation="0"
      color="secondary"
      @click="goBackToStart"
    >
      <v-icon large>mdi-anchor</v-icon>
    </v-btn>
    <div v-if="jumpButtonsEnabled">
      <v-btn
        id="jump-button-500"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="jump(500)"
        >500km</v-btn
      >
      <v-btn
        id="jump-button-50"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="jump(50)"
        >50km</v-btn
      >
      <v-btn
        id="jump-button-10"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="jump(10)"
        >10km</v-btn
      >
      <v-btn
        id="jump-button-1"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="jump(1)"
        >1km</v-btn
      >
      <v-btn
        id="jump-button-50m"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="jump(0.05)"
        >50m</v-btn
      >
      <v-btn
        id="undo-button"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="undo()"
      >
        <v-icon large>mdi-undo-variant</v-icon>
      </v-btn>
    </div>
    <div id="street-view-anchor" />
  </div>
</template>

<style scoped>
.custom-control-button {
  position: absolute;
  z-index: 2;
  right: 10px;
  bottom: 210px;
}

.jump-button {
  position: absolute;
  z-index: 2;
  right: 10px;
  width: 50px;
  height: 50px;
}

#street-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
}

#back-to-position-button {
  width: 50px;
  height: 50px;
}

#undo-button {
  bottom: 210px;
}

#jump-button-50m {
  bottom: 280px;
}

#jump-button-1 {
  bottom: 350px;
}

#jump-button-10 {
  bottom: 420px;
}

#jump-button-50 {
  bottom: 490px;
}

#jump-button-500 {
  bottom: 560px;
}

#street-view-anchor {
  flex-grow: 1;
}
</style>

<script>
import maps from '@/maps_util.js';
import sanitizeHtml from 'sanitize-html';
import colors from 'vuetify/lib/util/colors';
import { mapActions } from 'vuex';

/*global google*/

const DEFAULT_POV = { heading: -110, pitch: 0 };

export default {
  props: {
    initialMapPosition: {
      type: Object,
      required: true,
    },
    backToStartEnabled: {
      type: Boolean,
      required: true,
    },
    jumpButtonsEnabled: {
      type: Boolean,
      required: true,
    },
    playerMarkers: {
      type: Object,
      required: false,
    },
    beaconMarkers: {
      type: Object,
      required: false,
    },
  },
  data: function() {
    return {
      mapPosition: null,
      undoPanoramaId: null,
      currentPanoramaId: null,
      mapPlayerMarkers: {},
      mapBeaconMarkers: {},
    };
  },
  name: 'Streets',
  methods: {
    goBackToStart: function() {
      this.panorama.setPosition(this.initialMapPosition);
      this.panorama.setPov(DEFAULT_POV);
    },
    jump: async function(distance_km) {
      const position = this.panorama.getPosition();
      let bearing_deg = this.panorama.getPov().heading;
      if (bearing_deg > 180) {
        bearing_deg = bearing_deg - 360;
      }
      const new_position = await maps.jumpByDistanceAndBearing(
        { lat: position.lat(), lng: position.lng() },
        distance_km,
        bearing_deg,
      );
      if (new_position.destination != null) {
        this.panorama.setPosition(new_position.destination);
        if (
          distance_km * 0.9 < new_position.distance_km &&
          new_position.distance_km < distance_km * 1.1
        ) {
          this.showToast({
            text: `Jumped ${new_position.distance_km.toFixed(2)} km`,
          });
        } else {
          this.showToast({
            text: `Jump was imprecise: ${new_position.distance_km.toFixed(
              2,
            )} km`,
            color: 'orange',
          });
        }
      } else {
        this.showToast({
          text:
            'Stopped searching for panorama at distance: ' +
            `${new_position.stopped_at_distance_km.toFixed(2)} km`,
          color: 'red',
        });
      }
    },
    wipeCurrentMarkers: function() {
      for (const marker of this.currentMarkers) {
        marker.setMap(null);
      }
      this.currentMarkers = [];
    },
    undo: function() {
      if (this.undoPanoramaId == null) {
        this.showToast({
          text: 'Undo position not yet set.',
          color: 'red',
        });
        return;
      }
      this.panorama.setPano(this.undoPanoramaId);
    },
    ensureStreetviewLoaded: function(startingPosition) {
      if (this?.panorama != null) {
        return;
      }
      this.panorama = new google.maps.StreetViewPanorama(
        document.getElementById('street-view-anchor'),
        {
          // Unfortunately providing a nice initial position (e.g. Hon Sushi)
          // doesn't work well with history and undo functionalities needed for
          // rendezvous.
          // When the initial position was Hon Sushi, it was impossible to tell
          // if an update event for position or panorama changes was associated
          // with loading of the initial location, or with loading of the true
          // start location (especially since Hon Sushi may well be the true
          // start location if using KML).
          // Two consequences of this were:
          // 1. It was possible for Hon Sushi to end up in the player's history
          // under a race condition.
          // 2. It was possible to undo after refreshing the page to teleport to
          // Hon Sushi.
          position: startingPosition,
          pov: DEFAULT_POV,
          zoom: 1,
          addressControl: false,
          clickToGo: true,
          fullscreenControl: false,
          imageDateControl: false,
          linksControl: false,
          showRoadLabels: false,
          panControl: true,
        },
      );
      this.panorama.addListener('pano_changed', () => {
        // We track panoramas for use in undo. The reason is that panoramas
        // are more unique than positions (you can get many position change
        // events after a movement, but you'll get only a single panorama
        // change event). A side effect of undo being based on panoramas
        // is that it's almost instant (presumably because of caching)
        // and also hopefully won't teleport you on top of a bridge
        // if you were underneath it.
        // This can happen e.g. if you go to this location:
        // {"lat":-1.60719831050869,"lng":-45.08128731721289}.
        let panoramaId = this.panorama.getPano();
        if (panoramaId == null || panoramaId == this.currentPanoramaId) {
          return;
        }
        this.undoPanoramaId = this.currentPanoramaId;
        this.currentPanoramaId = panoramaId;
      });
      this.panorama.addListener('position_changed', () => {
        this.mapPosition = this.panorama.getPosition().toJSON();
      });
    },
    refreshMarkers: function() {
      //if (Object.values(this.currentMarkers).length != 0) {
      //  console.error(this.currentMarkers.length);
      //  return;
      //}
      //this.wipeCurrentMarkers();
      // TODO: use streetview APIs to reposition pins, rather than regenerating them.
      for (const [player_uuid, marker_info] of Object.entries(
        this.playerMarkers,
      )) {
        const sanitizedName = sanitizeHtml(marker_info.name, {
          allowedTags: [],
          allowedAttributes: {},
          disallowedTagsMode: 'recursiveEscape',
        });
        const icon =
          'http://chart.apis.google.com/chart?chst=d_map_spin&' +
          `chld=2.1|0|${marker_info.color}|13|b|${sanitizedName}|` +
          `${marker_info.distanceKm.toFixed(3)}km`;
        if (player_uuid in this.mapPlayerMarkers) {
          this.mapPlayerMarkers[player_uuid].setPosition(marker_info.position);
          this.mapPlayerMarkers[player_uuid].setOptions({
            icon: icon,
          });
        } else {
          const marker_obj = new google.maps.Marker({
            position: marker_info.position,
            map: this.panorama,
            icon: icon,
            title: sanitizedName,
          });
          this.mapPlayerMarkers[player_uuid] = marker_obj;
        }
      }
      for (const [beacon_uuid, beacon] of Object.entries(this.beaconMarkers)) {
        const marker_icon = beacon.connected ? 'glyphish_redo' : 'glyphish_zap';
        const marker_color = beacon.connected
          ? colors.blue.base.substr(1)
          : colors.grey.base.substr(1);
        const icon =
          'https://chart.apis.google.com/chart?chst=d_map_pin_icon' +
          `&chld=${marker_icon}|${marker_color}`;
        if (beacon_uuid in this.mapBeaconMarkers) {
          this.mapBeaconMarkers[beacon_uuid].marker.setOptions({
            icon: icon,
          });
          for (const [followup_uuid, followup] of Object.entries(
            beacon?.followups ?? {},
          )) {
            if (followup_uuid in this.mapBeaconMarkers[beacon_uuid].followups) {
              if (followup.used) {
                this.mapBeaconMarkers[beacon_uuid].followups[
                  followup_uuid
                ].setMap(null);
              }
            } else {
              if (followup.used) {
                continue;
              }
              const followup_obj = new google.maps.Marker({
                position: followup.position,
                map: this.panorama,
              });
              this.mapBeaconMarkers[beacon_uuid].followups[
                followup_uuid
              ] = followup_obj;
            }
          }
        } else {
          this.mapBeaconMarkers[beacon_uuid] = {
            marker: new google.maps.Marker({
              position: beacon.position,
              map: this.panorama,
              icon: icon,
            }),
            followups: {},
          };
        }
      }
    },
    ...mapActions('toast', ['showToast']),
  },
  watch: {
    initialMapPosition: function(newValue) {
      if (newValue?.lat == null || newValue?.lng == null) {
        return;
      }
      this.ensureStreetviewLoaded(newValue);
      console.log(
        'initialMapPosition changed, forcing streetview position to: ',
        newValue,
      );
      this.panorama.setPosition(newValue);
    },
    mapPosition: function(newValue, oldValue) {
      if (newValue?.lat == null || newValue?.lng == null) {
        return;
      }
      if (newValue.lat == oldValue?.lat && newValue.lng == oldValue?.lng) {
        return;
      }
      console.log(
        'mapPosition changed to',
        newValue,
        'emitting position_changed',
      );
      this.$emit('position_changed', newValue);
    },
    playerMarkers: function() {
      this.refreshMarkers();
    },
    beaconMarkers: function() {
      this.refreshMarkers();
    },
  },
};
</script>
