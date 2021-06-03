require('@nomiclabs/hardhat-waffle')
require('hardhat-docgen')

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.8.4',
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
  },
}
