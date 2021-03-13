/*
 * Export all modules.
 * New modules need to be added manually.
 */
import auth from './auth.store';
import dialog from './dialog.store';
import gameGen from './game_gen.store';
import persistentDialog from './persistent_dialog.store';
import toast from './toast.store';

const modules = {
  auth,
  dialog,
  gameGen,
  persistentDialog,
  toast,
};

export default modules;
