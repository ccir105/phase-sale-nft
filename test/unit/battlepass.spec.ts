import {expect} from 'chai';
import {ethers} from 'hardhat';

describe.only('BattlePass', function () {
    let bubbleBot;
    let signers;

    before(async () => {
        signers = await ethers.getSigners();
        const BubbleBot = await ethers.getContractFactory('BattlePass', signers[0]);

        bubbleBot = await BubbleBot.deploy( signers[0].address, signers[1].address);

        await bubbleBot.deployed();
    });

    it('should get the total supply', async () => {
        const supply = await bubbleBot.totalSupply();
        expect(supply).to.be.eq(0);
    });

    it('Should mint some nfts', async () => {
        for (let i = 0; i < 100; i++) {
            await bubbleBot
                .connect(signers[0])
                .mintFor(signers[1].address, 1, ethers.utils.toUtf8Bytes(`{${i}}:{IPFSHASH${i},12.23.34.45}`));
        }

        const balance = await bubbleBot.balanceOf(signers[1].address);
        expect(balance).to.be.eq(100);
    });

    it('should transfer the nft', async () => {
        await bubbleBot.connect(signers[1]).transferFrom(signers[1].address, signers[0].address, 1);
        let isOwner = await bubbleBot.ownerOf(1);
        expect(isOwner).to.be.eql(signers[0].address);
    });

    it('should approve', async () => {
        await bubbleBot.connect(signers[1]).approve(signers[3].address, 2);
    });

    it('Should approve all', async () => {
        await bubbleBot.setApprovalForAll(signers[1].address, true);
    });

    it('Should return the proper base uri', async () => {
        await bubbleBot.updateBaseUri('https://dev.peanuthub.com/nft/');
        const tokenUri = await bubbleBot.tokenURI(1);
        expect(tokenUri).to.be.eq('https://dev.peanuthub.com/nft/1');
    });
});
