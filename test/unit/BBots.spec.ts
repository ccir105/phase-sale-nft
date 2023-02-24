import {expect} from 'chai';
import {ethers} from 'hardhat';
import {MerkleTree} from "merkletreejs";

describe('BBots', function () {
    let bubbleBot;
    let signers;

    before(async () => {
        signers = await ethers.getSigners();

        const BubbleBot = await ethers.getContractFactory('BBots', signers[0]);

        bubbleBot = await BubbleBot.deploy(signers[0].address);

        await bubbleBot.deployed();
    });

    function getMerkleTree(elements) {

        return new MerkleTree(elements, ethers.utils.keccak256, {sort: true});
    }

    it('should get the total supply', async () => {
        const supply = await bubbleBot.totalSupply();
        expect(supply).to.be.eq(0);
    });

    it('Should get the current sale status', async () => {
        let currentStat = await bubbleBot.getSaleStatus();
        expect(currentStat).to.be.eq(0);
    });

    it('Should start and stop all kind of sale', async () => {

        await bubbleBot.startSale();

        let currentStat = await bubbleBot.getSaleStatus();

        expect(currentStat).to.be.eq(1);

        await ethers.provider.send('evm_increaseTime', [(60 * 60 + 1)]);
        await ethers.provider.send('evm_mine', []);

        currentStat = await bubbleBot.getSaleStatus();
        expect(currentStat).to.be.eq(2);

        await ethers.provider.send('evm_increaseTime', [(60 * 60 * 24)]);
        await ethers.provider.send('evm_mine', []);

        currentStat = await bubbleBot.getSaleStatus();
        expect(currentStat).to.be.eq(3);

    });

    it('should force switch to the ftb sale phase', async () => {

        await bubbleBot.switchSalePhase(60 , 60);

        let currentStat = await bubbleBot.getSaleStatus();

        expect(currentStat).to.be.eq(1);

    });

    it('should force switch to the whitelist sale phase', async () => {

        await bubbleBot.switchSalePhase(0, 60);
        let currentStat = await bubbleBot.getSaleStatus();
        expect(currentStat).to.be.eq(2);

    });


    it('should force switch to the public sale phase', async () => {

        await bubbleBot.switchSalePhase(0, 0);
        let currentStat = await bubbleBot.getSaleStatus();
        expect(currentStat).to.be.eq(3);

    });

    describe('mint and erc721', async () => {

        let whitelistUsers, ftbUserList;

        function getLeaf( address, amt = 0 ) {
            const types = ['address'];
            const values = [address];
            if( amt ){
                types.push('uint256');
                values.push(amt);
            }

            return ethers.utils.keccak256(ethers.utils.solidityPack(types, values));
        }

        before(() => {

            whitelistUsers = getMerkleTree(
                signers.map(signer => getLeaf(signer.address))
            )

            ftbUserList = getMerkleTree(
                signers.map(signer => getLeaf(signer.address, 5))
            )
        });

        it('Should prepare whitelist roots and mint for ftb', async () => {

            await bubbleBot.switchSalePhase(60, 60);
            let currentStat = await bubbleBot.getSaleStatus();
            expect(currentStat).to.be.eq(1);

            await bubbleBot.setWhitelistRoots(whitelistUsers.getHexRoot(), ftbUserList.getHexRoot());

            const leafNode = getLeaf(signers[3].address, 5);

            const hexProofsFtb = ftbUserList.getHexProof(
                leafNode
            );

            const isWhitelisted = await bubbleBot.verifyFtbWhiteList(signers[3].address, hexProofsFtb, 5);

            expect(isWhitelisted).to.be.true;

            await expect(bubbleBot.connect(signers[3]).mintBBots(3, hexProofsFtb , 5, {
                value: BigInt(0.08 * 3 * 1e18)
            })).to.emit(bubbleBot, 'NewMinter')
                .withArgs(signers[3].address, 3);

            let userBalance = await bubbleBot.balanceOf(signers[3].address);
            const ids = await bubbleBot.tokensOfOwner(signers[3].address);

            expect(ids[0].toNumber()).to.be.eq(1);
            expect(userBalance.toNumber()).to.be.eq(3)

            await expect(bubbleBot.connect(signers[3]).mintBBots(1, hexProofsFtb , 2, {
                value: BigInt(0.08 * 3 * 1e18)
            })).to.be.revertedWith('NOT_WHITELISTED');


            await expect(bubbleBot.connect(signers[3]).mintBBots(3, hexProofsFtb , 5, {
                value: BigInt(0.08 * 3 * 1e18)
            })).to.be.revertedWith('EXCEEDS_MAX');

            userBalance = await bubbleBot.balanceOf(signers[3].address);

            expect(userBalance.toNumber()).to.be.eq(3);
        });

        it('should mint the user for normal wl users', async () => {

            await bubbleBot.switchSalePhase(0, 60);

            let currentStat = await bubbleBot.getSaleStatus();

            expect(currentStat).to.be.eq(2);

            const userProof = whitelistUsers.getHexProof(
                getLeaf(signers[3].address)
            );

            await bubbleBot.connect(signers[3]).mintBBots(2, userProof , 0, {
                value: BigInt(0.08 * 2 * 1e18)
            });

            let userBalance = await bubbleBot.balanceOf(signers[3].address);

            expect(userBalance.toNumber()).to.be.eq(5);

            const leafNode = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [signers[1].address]));

            const hexProofsWl = whitelistUsers.getHexProof(
                leafNode
            );

            await bubbleBot.connect(signers[1]).mintBBots(3, hexProofsWl , 0, {
                value: BigInt(0.08 * 3 * 1e18)
            })

            userBalance = await bubbleBot.balanceOf(signers[1].address);

            expect(userBalance.toNumber()).to.be.eq(3)

            await expect(bubbleBot.connect(signers[1]).mintBBots(3, hexProofsWl , 5, {
                value: BigInt(0.08 * 3 * 1e18)
            })).to.be.revertedWith('EXCEEDS_MAX');

            userBalance = await bubbleBot.balanceOf(signers[1].address);

            expect(userBalance.toNumber()).to.be.eq(3)

        });


        it('should mint for the user who in public max mint is not restricted', async () => {

            await bubbleBot.switchSalePhase(0, 0);

            let currentStat = await bubbleBot.getSaleStatus();

            expect(currentStat).to.be.eq(3);

            await bubbleBot.connect(signers[5]).mintBBots(10, [] , 0, {
                value: BigInt(0.08 * 10 * 1e18)
            })

            const userBalance = await bubbleBot.balanceOf(signers[5].address);
            expect(userBalance.toNumber()).to.be.eq(10);
        })

        it('should mint all the nft', async () => {

            const totalSupply = await bubbleBot.totalSupply();

            const remainingSupply = 999 - totalSupply.toNumber() - 1;

            await bubbleBot.connect(signers[8]).mintBBots(remainingSupply, [] , 0, {
                value: BigInt(0.08 * remainingSupply * 1e18)
            })

            const userBalance = await bubbleBot.balanceOf(signers[8].address);

            expect(userBalance.toNumber()).to.be.eq(remainingSupply);

            await expect(bubbleBot.connect(signers[8]).mintBBots(2, [] , 0, {
                value: BigInt(0.08 * 2 * 1e18)
            })).to.be.revertedWith('EXCEEDS_SUPPLY');
        });

        it('Should transfer nft', async () => {

            const [tokenId] = await bubbleBot.tokensOfOwner(signers[3].address);

            await bubbleBot.connect(signers[3]).transferFrom(signers[3].address, signers[0].address, tokenId.toNumber());

            let isOwner = await bubbleBot.ownerOf(tokenId.toNumber());

            expect(isOwner).to.be.eql(signers[0].address);

        });

        it('should approve the nft', async () => {
            const [tokenId] = await bubbleBot.tokensOfOwner(signers[3].address);

            await bubbleBot.connect(signers[3]).approve(signers[0].address, tokenId.toNumber());

            await bubbleBot.transferFrom(signers[3].address, signers[0].address, tokenId.toNumber());

            let isOwner = await bubbleBot.ownerOf(tokenId.toNumber());

            expect(isOwner).to.be.eql(signers[0].address);
        });

        it('Should approve all', async () => {
          await bubbleBot.connect(signers[5]).setApprovalForAll(signers[0].address, true);

          const [,tokenId] = await bubbleBot.tokensOfOwner(signers[5].address);

          await bubbleBot.transferFrom(signers[5].address, signers[0].address, tokenId.toNumber());

          let isOwner = await bubbleBot.ownerOf(tokenId.toNumber());

          expect(isOwner).to.be.eql(signers[0].address);

        });

        it('Should return the proper base uri', async () => {
          await bubbleBot.updateBaseUri('https://dev.peanuthub.com/nft/');
          const tokenUri = await bubbleBot.tokenURI(1);
          expect(tokenUri).to.be.eq('https://dev.peanuthub.com/nft/1');
        });

    });
});
