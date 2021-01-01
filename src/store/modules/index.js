/*
 * Export all modules.
 * New modules need to be added manually.
 */
import auth from './auth.store';
import dialog from './dialog.store';
import persistentDialog from './persistent_dialog.store';

const modules = {
  auth,
  dialog,
  persistentDialog,
};

export default modules;
