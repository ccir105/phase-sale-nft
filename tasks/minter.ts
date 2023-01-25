import {fetchWhitelistAddress, showTxStatus, uploadToAws} from './base';
// @ts-ignore
import addresses from './address.json';
import MultiCall from 'ethers-multicall';
import ftbAbi from './ftb.abi.json';
import {MerkleTree} from "merkletreejs";


async function getRobotNft(hre) {
  return await hre.ethers.getContractAt('BBots', addresses[hre.network.name].robots);
}

export default function initTask(task: any) {
  task('start-sale', 'Start The Sale ').setAction(async (taskArgs: any, hre: any) => {
    let minter = await getRobotNft(hre);
    let tx = await minter.startSale();
    await showTxStatus(tx, hre);
  });

  task('stop-sale', 'Stop The Sale').setAction(async (taskArgs: any, hre: any) => {
      let minter = await getRobotNft(hre);
      let tx = await minter.stopSale();
      await showTxStatus(tx, hre);
  });

  task('force-ftb', 'Force Start Ftb Sale').setAction(async (taskArgs: any, hre: any) => {
      let minter = await getRobotNft(hre);
      let tx = await minter.switchSalePhase(60 * 60, 60 * 60 * 24);
      await showTxStatus(tx, hre);
  });

    task('force-wl', 'Force Start whitelist Sale').setAction(async (taskArgs: any, hre: any) => {
        let minter = await getRobotNft(hre);
        let tx = await minter.switchSalePhase(0, 60 * 60 * 24);
        await showTxStatus(tx, hre);
    });

    task('force-public', 'Force Start public Sale').setAction(async (taskArgs: any, hre: any) => {
        let minter = await getRobotNft(hre);
        let tx = await minter.switchSalePhase(0, 0);
        await showTxStatus(tx, hre);
    });

    task('migrate-ipfs', 'Update the base uri')
    .addParam('url', 'New Base Url eg. ipfs ')
    .setAction(async (arg: any, hre: any) => {
      let minter = await getRobotNft(hre);
      let tx = await minter.updateBaseUri(arg.url);
      await showTxStatus(tx, hre);
    });

    task('ftb-snapshot', 'Take FTB holder snapshot')
        .setAction(async (arg: any, hre: any) => {
            const ftbAddress = '0xde57e569C89194aaF25A36A61C8F1cF3be0F0262';

            const ethCallProvider = new MultiCall.Provider(hre.ethers.provider);
            await ethCallProvider.init();
            const ftbContract = new hre.ethers.Contract(ftbAddress, ftbAbi, hre.ethers.provider);
            const multiCallContract = new MultiCall.Contract(ftbAddress ,ftbAbi);
            const supply = await ftbContract.totalSupply();
            const totalSupply = hre.ethers.utils.formatUnits(supply, 0);
            const ownerRequests: any = [];

            for (let i = 0; i < totalSupply; i++) {
                const getOwnerOf = multiCallContract.ownerOf(i);
                ownerRequests.push(getOwnerOf);
            }

            let results = await ethCallProvider.all(ownerRequests);

            let balanceSnapshot = results.reduce((prev, current) => {
                if( prev.hasOwnProperty(current) ) {
                    prev[current] += 1;
                }
                else {
                    prev[current] = 1;
                }
                return prev
            }, {})

            const jsonBuffer = Buffer.from(JSON.stringify(balanceSnapshot));

            const params = {
                Key: `snapshot/ftb-owners.json`, // File name you want to save as in S3
                Body: jsonBuffer,
                ContentType: 'application/json',
                ACL: 'public-read',
            };

            await uploadToAws(params);
        });


    task('whitelist-root', 'Update Whitelist root with pre-mint url and ftb snapshot')
        .setAction(async (arg: any, hre: any) => {

            const {ftbList, premintList} = await fetchWhitelistAddress();

            const ftbUserLeafs = Object.keys(ftbList).map((address) =>
                hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [address, ftbList[address]]))
            );

            const premintUserLeafs = premintList.map(address =>
                hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['address'], [address]))
            )

            const ftbTree = new MerkleTree(ftbUserLeafs, hre.web3.utils.sha3, {sort: true})

            const whitelistTree = new MerkleTree(premintUserLeafs, hre.web3.utils.sha3, {sort: true})

            const bubbleBotContract = await getRobotNft(hre);

            const tx = await bubbleBotContract.setWhitelistRoots(ftbTree.getHexRoot(), whitelistTree.getHexRoot());

            await showTxStatus(tx, hre);
        })
}
