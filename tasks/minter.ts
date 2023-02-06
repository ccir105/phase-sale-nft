import {fetchWhitelistAddress, showTxStatus, uploadToAws} from './base';
// @ts-ignore
import addresses from '../assets/address.json';
import MultiCall from 'ethers-multicall';
import ftbAbi from '../assets/ftb.abi.json';
import {MerkleTree} from "merkletreejs";
import fetch from 'node-fetch';

export async function getRobotNft(hre) {
  return await hre.ethers.getContractAt('BBots', addresses[hre.network.name].robots);
}

export async function getBattlePassNft(hre) {
    return await hre.ethers.getContractAt('BattlePass', addresses[hre.network.name].battlePass);
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

    task('update-price', 'Update cost price')
        .addParam('price', 'THe price of nft')
        .setAction(async (taskArgs: any, hre: any) => {
            let price = hre.ethers.utils.parseEther(taskArgs.price)
            let minter = await getRobotNft(hre);
            let tx = await minter.updateCostPrice(price);
            await showTxStatus(tx, hre);
    })

    task('migrate-ipfs', 'Update the base uri')
    .addParam('url', 'New Base Url eg. ipfs ')
    .setAction(async (arg: any, hre: any) => {
      let minter = await getRobotNft(hre);
      let tx = await minter.updateBaseUri(arg.url);
      await showTxStatus(tx, hre);
    });

    task('force-opensea', 'Force refresh on opensea')
        .setAction(async (arg: any, hre: any) => {
            let minter = await getRobotNft(hre);
            for (let tokenId = 0; tokenId <= await minter.totalSupply(); tokenId++) {
                const url = `https://api.opensea.io/api/v1/asset/${minter.address}/${tokenId}/?force_update=true`;
                await fetch(url);
            }
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

                current = current.toLowerCase();

                if( prev.hasOwnProperty(current) ) {
                    prev[current] += 1;
                }
                else {
                    prev[current] = 1;
                }
                return prev
            }, {})


            balanceSnapshot[ "0x1e18f6f61dfb7426252a73a2f6226fec8fb256de" ] = 5;

            const jsonBuffer = Buffer.from(JSON.stringify(balanceSnapshot));

            const params = {
                Key: `snapshot/ftb-owners.json`, // File name you want to save as in S3
                Body: jsonBuffer,
                ContentType: 'application/json',
                ACL: 'public-read',
            };

            await uploadToAws(params);
        });

    task('test-mint', 'Test Mint')
        .setAction(async (arg: any, hre: any) => {
            const collection = await getRobotNft(hre);
            const [,minterUser] = await hre.ethers.getSigners();

            let tx = await collection.connect(minterUser).mintBBots(10, [], 0, {
                value: BigInt(0.08 * 10 * 1e18)
            });
            await showTxStatus(tx, hre);
        });

    task('verify-normal', 'Verify Normal Whitelist')
        .addParam('address', 'Verify Normal Address')
        .setAction(async (arg: any, hre: any) => {
            const {ftbList , premintList} = await fetchWhitelistAddress();

            const premintLeafs = premintList.map((address) =>
                hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['address'], [address]))
            );

            const ftbTree = new MerkleTree(premintLeafs, hre.ethers.utils.keccak256, {sort: true})

            const leaf = hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['address'], [arg.address]));

            const collectionCtr = await getRobotNft(hre);

            const proofs = ftbTree.getHexProof(leaf);

            console.log(await collectionCtr.verifyNormalWhiteList(proofs));
        });

    task('verify-wl', 'Verify Whitelist')
        .addParam('amount', 'User Approved Balance Amount')
        .addParam('address', 'User Address')
        .setAction(async (arg: any, hre: any) => {

            const {ftbList,} = await fetchWhitelistAddress();

            const ftbUserLeafs = Object.keys(ftbList).map((address) =>
                hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [address, ftbList[address]]))
            );

            const ftbTree = new MerkleTree(ftbUserLeafs, hre.ethers.utils.keccak256, {sort: true})

            const leaf = hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [arg.address, arg.amount]));

            const collectionCtr = await getRobotNft(hre);

            const proofs = ftbTree.getHexProof(leaf);

            console.log(await collectionCtr.verifyFtbWhiteList(proofs, arg.amount));
        });

    task('whitelist-root', 'Update Whitelist root with pre-mint url and ftb snapshot')

        .setAction(async (arg: any, hre: any) => {

            const {ftbList,premintList} = await fetchWhitelistAddress();

            const ftbUserLeafs = Object.keys(ftbList).map((address) =>
                hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [address, ftbList[address]]))
            );

            const premintUserLeafs = premintList.map(address =>
                hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['address'], [address]))
            )

            const ftbTree = new MerkleTree(ftbUserLeafs, hre.ethers.utils.keccak256, {sort: true})

            const whitelistTree = new MerkleTree(premintUserLeafs, hre.ethers.utils.keccak256, {sort: true})

            const bubbleBotContract = await getRobotNft(hre);

            const tx = await bubbleBotContract.setWhitelistRoots(whitelistTree.getHexRoot(), ftbTree.getHexRoot());

            await showTxStatus(tx, hre);
        })
}
