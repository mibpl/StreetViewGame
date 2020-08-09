<template>
  <v-app-bar app color="primary" dark dense>
    <v-spacer></v-spacer>
    <v-toolbar-title style="cursor: pointer" @click="$router.push('/')">
      GeoGuess
    </v-toolbar-title>
    <v-spacer></v-spacer>
  </v-app-bar>
</template>

<script>
export default {
  name: 'Header',
};
</script>
