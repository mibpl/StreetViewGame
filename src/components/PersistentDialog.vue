<template>
  <v-dialog persistent max-width="290" v-model="visible">
    <v-card>
      <v-card-title></v-card-title>
      <v-card-text>
        {{ text }}
      </v-card-text>
    </v-card>
  </v-dialog>
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
