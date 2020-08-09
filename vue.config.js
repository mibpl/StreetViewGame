module.exports = {
  lintOnSave: false,
  transpileDependencies: ['vuetify'],
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = 'GeoGuess';
      return args;
    });
  },
};
