export function roomObjectPath(roomId) {
  return process.env.VUE_APP_DB_PREFIX + roomId;
}
