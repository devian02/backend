// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
module.exports = {
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, '/build'),
  compilers: {
    solc: {
      version: '0.8.19',
    },
  },
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*', //Match any network id
    },
  },
};
