import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  output: {
    assetPrefix: '/cpm-intensity-threshold',
  },
  html: {
    template: './public/index.html',
    title: 'ThresholdCalc'
  },
});
