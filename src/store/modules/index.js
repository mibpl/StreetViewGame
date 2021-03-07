/*
 * Export all modules.
 * New modules need to be added manually.
 */
import auth from './auth.store';
import dialog from './dialog.store';
import experiment from './experiment.store';
import gameGen from './game_gen.store';
import persistentDialog from './persistent_dialog.store';

const modules = {
  auth,
  dialog,
  experiment,
  gameGen,
  persistentDialog,
};

export default modules;
