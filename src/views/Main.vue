<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="5">
        <v-card outlined>
          <v-card-text>
            <v-form>
              <v-text-field
                label="Username"
                name="username"
                prepend-icon="mdi-account"
                type="text"
              ></v-text-field>
            </v-form>
          </v-card-text>
        </v-card>
        <v-row v-if="$route.params.roomId" align="center">
          <v-col class="text-center">
            <v-btn id="play_btn" color="primary">Play!</v-btn>
          </v-col>
        </v-row>
        <v-row align="center">
          <v-col class="text-center">
            <v-btn id="create_room_btn" color="primary">
              Create a new room
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
// Main view is used as a landing page, for both when:
//  * root page is opened
//  * join link is clicked
// In the latter situation, also the Play button becomes active.

export default {
  name: 'Main',
  components: {},
};
</script>
