import {ethers, network} from 'hardhat';
import fs from 'fs';
import Config from '../config'
import address from '../assets/address.json'
import ImxModule from '../module/imx';

async function main() {

  const networkName = network.name;
  const signers = await ethers.getSigners();

  let imxWallet;
  let multiSigWallet;

  if( networkName === 'live') {
    imxWallet = Config.IMX_PROD
    multiSigWallet = Config.MULTI_SIG_WALLET;
  }
  else {
    imxWallet = Config.IMX_SANDBOX;
    multiSigWallet = signers[0].address;
  }

  const BubbleBots = await ethers.getContractFactory('BBots');
  const robots = await BubbleBots.deploy(multiSigWallet);

  await robots.deployed();

  const BattlePass = await ethers.getContractFactory('BattlePass');

  const battlePass = await BattlePass.deploy(imxWallet, multiSigWallet);

  await battlePass.deployed();

  if( networkName !== 'localhost' ) {
    const pk = network.config.accounts[0];

    const signer = new ethers.Wallet(pk);

    await ImxModule.createCollection(signer, network.name, {
      name: 'BattlePass Test',
      address: battlePass.address,
      url: ''
    });
  }

  fs.writeFileSync(
    './assets/address.json',
    JSON.stringify({
      ...address,
      [networkName]: {
        battlePass: battlePass.address,
        robots: robots.address
      }
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
