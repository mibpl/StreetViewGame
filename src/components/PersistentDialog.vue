<template>
  <v-overlay :value="visible" max-width="60vw">
    <v-card>
      <v-card-text>
        {{ text }}
      </v-card-text>
    </v-card>
  </v-overlay>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'PersistentDialog',
  computed: {
    ...mapState({
      text: state => state.persistentDialog.text,
      visible: state => state.persistentDialog.visible,
    }),
  },
};
</script>
