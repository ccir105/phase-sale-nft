import {HardhatUserConfig, task} from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import '@nomiclabs/hardhat-web3';
import accounts from './test/mock/accounts.json';
import {initTask} from './tasks/base';
import minterTask from './tasks/minter';
import imxTask from './tasks/imx'
import NftTask from './tasks/nft';
import '@openzeppelin/hardhat-upgrades';
import Config from './config'

initTask(task);
minterTask(task);
imxTask(task);
NftTask(task);

//
// // You need to export an object to set up your config
// // Go to https://hardhat.org/config/ to learn more
//
const config: HardhatUserConfig | any = {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
      gasMultiplier: 1,
    },
    hardhat: {
      gas: 25e6,
    },
    live: {
      url: `https://mainnet.infura.io/v3/${Config.INFURA_KEY}`,
      chainId: 1,
      accounts: [Config.PRIVATE_KEY],
    },
    mumbai: {
      url: `https://rpc-mumbai.maticvigil.com`,
      chainId: 80001,
      accounts: accounts.privateKey,
    },
    testnet: {
      url: `https://goerli.infura.io/v3/${Config.INFURA_KEY}`,
      chainId: 5,
      accounts: accounts.privateKey,
      gasMultiplier: 2,
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
  // etherscan: {
  //   apiKey: Config.ETHERSCAN,
  // },
  abiExporter: {
    path: './data/abi',
    clear: true,
    spacing: 2,
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 20000,
    enableTimeouts: true,
  },
};

export default config;
