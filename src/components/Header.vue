<template>
  <v-app-bar app v-bind:color="getColor()" class="white--text" dense>
    <v-spacer></v-spacer>
    <v-toolbar-title style="cursor: pointer" @click="$router.push('/')">
      GeoGuess <span v-if="rendezvous_enabled">(Rendezvous enabled!!!!)</span>
    </v-toolbar-title>
    <v-spacer></v-spacer>
  </v-app-bar>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex';

export default {
  name: 'Header',
  computed: {
    rendezvous_enabled: function() {
      return this.getRendezvousEnabled();
    }
  },
  methods: {
    getColor() {
      if (this.rendezvous_enabled) {
        return "red";
      }
      return "primary";
    },
    ...mapGetters('experiment', ['getRendezvousEnabled']),
    ...mapMutations('experiment', ['setRendezvousEnabled']),
  }
};
</script>
