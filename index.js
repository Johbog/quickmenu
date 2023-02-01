'use strict';

const icons = {
  magnifier: '<path d="M273.117 76.563c-52.488 0-101.824 20.43-138.933 57.539a198.531 198.531 0 0 0-22.067 26.234c-4.062 5.773-2.68 13.75 3.098 17.8a12.71 12.71 0 0 0 7.336 2.329c4.015 0 7.98-1.89 10.465-5.422a173.942 173.942 0 0 1 19.238-22.863c32.281-32.285 75.203-50.059 120.855-50.059 7.063 0 12.782-5.71 12.782-12.781 0-7.063-5.711-12.778-12.774-12.778ZM104.5 198.758c-6.652-2.375-13.96 1.066-16.355 7.699a196.223 196.223 0 0 0-5.832 19.336c-3.774 15.352-5.692 31.242-5.7 47.25 0 7.059 5.715 12.785 12.782 12.785 7.054 0 12.78-5.71 12.78-12.781 0-13.953 1.673-27.8 4.962-41.149a168.757 168.757 0 0 1 5.062-16.793c2.395-6.636-1.054-13.964-7.699-16.347Zm0 0"/><path d="M491.469 437.27c-.035-.036-.078-.055-.114-.094 35.543-47.078 54.817-104.121 54.817-164.149 0-72.957-28.414-141.554-80.008-193.152-106.5-106.496-279.789-106.504-386.285 0-106.504 106.496-106.504 279.79 0 386.285 51.59 51.59 120.187 80.008 193.152 80.008 60.028 0 117.067-19.266 164.149-54.816.035.039.058.078.09.113l263.91 263.91c7.468 7.48 17.277 11.234 27.09 11.234 9.812 0 19.62-3.746 27.113-11.226 14.969-14.977 14.969-39.254 0-54.219Zm-55.418-1.211c-43.555 43.546-101.446 67.535-163.035 67.535-61.579 0-119.48-23.989-163.036-67.535-89.886-89.887-89.886-236.153 0-326.067 44.961-44.949 103.989-67.418 163.036-67.418 59.039 0 118.09 22.477 163.035 67.418 43.543 43.555 67.531 101.445 67.531 163.035-.008 61.578-23.992 119.48-67.531 163.028Zm0 0"/>',
};

module.exports = {
  name: 'QuickMenu',
  purpose: 'A quick menu',
  version: '1.2.0',
  author: 'Johan Bogaers',
  vendor: 'Johbog',
  requires: [],
  features: {},
  icon: icons.magnifier,
  gui: {
    submodules: [
      'quickmenu.svelte',
    ],
  },
  hooks: ({ server }) => [
    { id: 'registerQuickMenu',
      order: 50,
      event: 'boot',
      mandatory: true,
      purpose: 'Adds Quick Menu to the GUI',
      handler: async function () {
        const extension = {
          id: 'quickmenu',
          code: 'submodules/johbog/quickmenu',
          zones: {
            userinfo: true,
          },
        };
        server.try('registerGuiExtension', extension, 'webdesq/gui');
      },
    },
  ],
};
