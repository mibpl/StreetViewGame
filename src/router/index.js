import Vue from 'vue';
import VueRouter from 'vue-router';
import Main from '@/views/Main.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'main',
    component: Main,
  },
  {
    path: '/join/:roomId',
    name: 'join',
    component: Main,
  },
  {
    path: '/lobby/:roomId',
    name: 'lobby',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(/* webpackChunkName: "lobby" */ '@/views/Lobby.vue'),
  },
  {
    path: '/classic/:roomId',
    name: 'classic',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(/* webpackChunkName: "game" */ '@/views/ClassicGame.vue'),
  },
  {
    path: '/rendezvous/:roomId',
    name: 'rendezvous',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(/* webpackChunkName: "rendezvous" */ '@/views/RendezvousGame.vue'),
  },
  {
    path: '*',
    redirect: { name: 'main' },
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
