module.exports = {
  packagerConfig: {
    icon: './icon/icon',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        iconUrl: 'https://lh3.googleusercontent.com/jSy98HVZY6AxXWUpKMwZjiaTfE1C0x7GbUxd-lToQ0CvhP5StwAFAm1Dx2ddxFxvT1eKPe2rAVTQ3J-NFsqsQxkt22ZCQ4MBgD7OGIrK',
        setupIcon: './icon/icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: './icon/icon.png'       
        }
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        icon: './icon/icon.png'
      },
    },
  ],
};
