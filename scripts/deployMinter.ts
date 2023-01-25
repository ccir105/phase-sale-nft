import {ethers, network} from 'hardhat';
import fs from 'fs';

async function main() {

  const networkName = network.name;
  const signers = await ethers.getSigners();


  let imxWallet;
  let multiSigWallet;

  if( networkName === 'testnet') {
    imxWallet = '0x7917eDb51ecD6CdB3F9854c3cc593F33de10c623';
    multiSigWallet = signers[0].address;
  }

  const BubbleBots = await ethers.getContractFactory('BBots');
  const robots = await BubbleBots.deploy(multiSigWallet);

  await robots.deployed();

  const BattlePass = await ethers.getContractFactory('BattlePass');

  const battlePass = await BattlePass.deploy(imxWallet, multiSigWallet);

  await battlePass.deployed();

  fs.writeFileSync(
    './tasks/address.json',
    JSON.stringify({
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
