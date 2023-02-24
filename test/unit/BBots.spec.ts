import {expect} from 'chai';
import {ethers} from 'hardhat';
import {MerkleTree} from "merkletreejs";

describe('BBots', function () {
  let bubbleBot;
  let signers;
  let deployer;
  let userFtb;
  let userWL;
  let userPublic;
  let whitelistUsers;
  let ftbUserList;
  let ftbMaxApprovedQty = 2;

  function getMerkleTree(elements) {

    return new MerkleTree(elements, ethers.utils.keccak256, {sort: true});
  }

  function getLeaf(address, amt = 0) {
    const types = ['address'];
    const values = [address];
    if (amt) {
      types.push('uint256');
      values.push(amt);
    }

    return ethers.utils.keccak256(ethers.utils.solidityPack(types, values));
  }

  beforeEach(async () => {
    signers = await ethers.getSigners();
    deployer = signers[0];
    userWL = signers[1];
    userFtb = signers[3];
    userPublic = signers[5];

    const BubbleBot = await ethers.getContractFactory('BBots', deployer);

    bubbleBot = await BubbleBot.deploy(deployer.address);

    await bubbleBot.deployed();

    whitelistUsers = getMerkleTree(
      signers.map(signer => getLeaf(signer.address))
    )

    ftbUserList = getMerkleTree(
      signers.map(signer => getLeaf(signer.address, ftbMaxApprovedQty))
    )
  });

  it('should get the total supply', async () => {
    const supply = await bubbleBot.totalSupply();
    expect(supply).to.be.eq(0);
  });

  it('Should get the current sale status', async () => {
    let currentStat = await bubbleBot.getSaleStatus();
    expect(currentStat).to.be.eq(0);
  });

  it('should updateMaxMintWL', async () => {

    const defaultLimit = 2;

    expect(await bubbleBot.maxMintWL()).to.be.eq(defaultLimit);

    const newLimit = 3;
    await bubbleBot.updateMaxMintWL(newLimit);

    expect(await bubbleBot.maxMintWL()).to.be.eq(newLimit);
  });

  it('should updateMintPrice', async () => {

    const defaultPrice = '0.0769';
    const mintPrice = await bubbleBot.mintPrice();

    expect(ethers.utils.formatUnits(mintPrice)).to.be.eq(defaultPrice);

    const newPrice = '0.12';
    await bubbleBot.updateMintPrice(ethers.utils.parseEther(newPrice));

    const newMintPrice = await bubbleBot.mintPrice();
    expect(ethers.utils.formatUnits(newMintPrice)).to.be.eq(newPrice.toString());
  });

  describe('Sale', function () {

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

      await bubbleBot.switchSalePhase(60, 60);

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

  });

  describe('FTB Mint', function () {
    let hexProofsFtb = null;
    let hexProofsWL = null;

    beforeEach( async () => {
      await bubbleBot.setWhitelistRoots(whitelistUsers.getHexRoot(), ftbUserList.getHexRoot());
      const leafNodeFtb = getLeaf(userFtb.address, ftbMaxApprovedQty);
      hexProofsFtb = ftbUserList.getHexProof(leafNodeFtb);

      const leafNodeWL = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [userWL.address]));
      hexProofsWL = whitelistUsers.getHexProof(leafNodeWL);
    });

    it('should mint', async () => {

      await bubbleBot.switchSalePhase(60, 60);
      const currentStat = await bubbleBot.getSaleStatus();
      expect(currentStat).to.be.eq(1);

      const isWhitelisted = await bubbleBot.verifyFtbWhiteList(userFtb.address, hexProofsFtb, ftbMaxApprovedQty);
      expect(isWhitelisted).to.be.true;

      const mintQty = 2;

      await expect(bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.emit(bubbleBot, 'NewMinter')
        .withArgs(userFtb.address, mintQty);

      let userBalance = await bubbleBot.balanceOf(userFtb.address);

      expect(userBalance.toNumber()).to.be.eq(2);

      await expect(bubbleBot.connect(userFtb).mintBBots(1, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * 1e18)
      })).to.be.revertedWith('EXCEEDS_MAX');

    });

    it('should fail if amount is lower', async () => {
      await bubbleBot.switchSalePhase(60, 60);

      const mintQty = 3;

      await expect(bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0001 * mintQty * 1e18)
      })).to.be.revertedWith('INSUFFICIENT_AMOUNT');

    });

    it('should fail if exceeds max', async () => {
      await bubbleBot.switchSalePhase(60, 60);

      const mintQty = 3;

      await expect(bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('EXCEEDS_MAX');

    });

    it('should fail if not whitelisted with same approval', async () => {
      await bubbleBot.switchSalePhase(60, 60);

      const leafNode = getLeaf(userFtb.address, 1);
      hexProofsFtb = ftbUserList.getHexProof(leafNode);

      const mintQty = 1;

      await expect(bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('NOT_WHITELISTED');
    });

    it('should fail if whitelisted in WL', async () => {
      await bubbleBot.switchSalePhase(60, 60);

      const mintQty = 1;

      await expect(bubbleBot.connect(userWL).mintBBots(mintQty, hexProofsWL, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('NOT_WHITELISTED');
    });

    it('should fail if public user', async () => {
      await bubbleBot.switchSalePhase(60, 60);

      const mintQty = 1;

      await expect(bubbleBot.connect(userPublic).mintBBots(mintQty, [], 1, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('NOT_WHITELISTED');
    });

    it('should fail mint if sale not started', async () => {

      const currentStat = await bubbleBot.getSaleStatus();
      expect(currentStat).to.be.eq(0);

      const isWhitelisted = await bubbleBot.verifyFtbWhiteList(userFtb.address, hexProofsFtb, ftbMaxApprovedQty);
      expect(isWhitelisted).to.be.true;

      const mintQty = 2;
      await expect(bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('SALE_NOT_STARTED');

    });
  });

  describe('WL Mint', function () {
    let hexProofsFtb = null;
    let hexProofsWL = null;

    beforeEach( async () => {
      await bubbleBot.setWhitelistRoots(whitelistUsers.getHexRoot(), ftbUserList.getHexRoot());
      const leafNodeFtb = getLeaf(userFtb.address, ftbMaxApprovedQty);
      hexProofsFtb = ftbUserList.getHexProof(leafNodeFtb);

      const leafNodeWL = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [userWL.address]));
      hexProofsWL = whitelistUsers.getHexProof(leafNodeWL);
    });

    it('should mint', async () => {

      await bubbleBot.switchSalePhase(0, 60);
      const currentStat = await bubbleBot.getSaleStatus();
      expect(currentStat).to.be.eq(2);

      const isWhitelisted = await bubbleBot.verifyNormalWhiteList(userWL.address, hexProofsWL);
      expect(isWhitelisted).to.be.true;

      const mintQty = 2;

      await expect(bubbleBot.connect(userWL).mintBBots(mintQty, hexProofsWL, 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.emit(bubbleBot, 'NewMinter')
        .withArgs(userWL.address, mintQty);

      let userBalance = await bubbleBot.balanceOf(userWL.address);

      expect(userBalance.toNumber()).to.be.eq(2);

      await expect(bubbleBot.connect(userWL).mintBBots(1, hexProofsWL, 0, {
        value: BigInt(0.0769 * 1e18)
      })).to.be.revertedWith('EXCEEDS_MAX');

    });

    it('should mint when user is in both FBT and WL', async () => {

      await bubbleBot.switchSalePhase(60, 60);
      let currentStat = await bubbleBot.getSaleStatus();
      expect(currentStat).to.be.eq(1);

      const mintQty = 2;

      await bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

      let userBalance = await bubbleBot.balanceOf(userFtb.address);

      expect(userBalance.toNumber()).to.be.eq(2);

      ////
      await bubbleBot.switchSalePhase(0, 60);
      currentStat = await bubbleBot.getSaleStatus();
      expect(currentStat).to.be.eq(2);

      const leafNodeWL = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [userFtb.address]));
      hexProofsWL = whitelistUsers.getHexProof(leafNodeWL);

      await bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsWL, 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

      userBalance = await bubbleBot.balanceOf(userFtb.address);

      expect(userBalance.toNumber()).to.be.eq(4);

    });

    it('should fail if amount is lower', async () => {
      await bubbleBot.switchSalePhase(0, 60);

      const mintQty = 3;

      await expect(bubbleBot.connect(userWL).mintBBots(mintQty, hexProofsWL, 0, {
        value: BigInt(0.0001 * mintQty * 1e18)
      })).to.be.revertedWith('INSUFFICIENT_AMOUNT');

    });

    it('should fail if exceeds max', async () => {
      await bubbleBot.switchSalePhase(0, 60);

      const mintQty = 3;

      await expect(bubbleBot.connect(userWL).mintBBots(mintQty, hexProofsWL, 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('EXCEEDS_MAX');

    });

    it('should fail if not whitelisted with same approval', async () => {
      await bubbleBot.switchSalePhase(0, 60);

      const leafNode = getLeaf(userWL.address, 1);
      hexProofsFtb = ftbUserList.getHexProof(leafNode);

      const mintQty = 1;

      await expect(bubbleBot.connect(userWL).mintBBots(mintQty, hexProofsFtb, 3, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('NOT_WHITELISTED');
    });

    it('should fail if whitelisted in FTB', async () => {
      await bubbleBot.switchSalePhase(0, 60);

      const mintQty = 1;

      await expect(bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('NOT_WHITELISTED');
    });

    it('should fail if public user', async () => {
      await bubbleBot.switchSalePhase(0, 60);

      const mintQty = 1;

      await expect(bubbleBot.connect(userPublic).mintBBots(mintQty, [], 1, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('NOT_WHITELISTED');
    });

    it('should fail mint if sale not started', async () => {

      const currentStat = await bubbleBot.getSaleStatus();
      expect(currentStat).to.be.eq(0);

      const isWhitelisted = await bubbleBot.verifyNormalWhiteList(userWL.address, hexProofsWL);
      expect(isWhitelisted).to.be.true;

      const mintQty = 2;

      await expect(bubbleBot.connect(userWL).mintBBots(mintQty, hexProofsWL, 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('SALE_NOT_STARTED');
    });
  });

  describe('Public Mint', function () {
    let hexProofsFtb = null;
    let hexProofsWL = null;

    beforeEach( async () => {
      await bubbleBot.setWhitelistRoots(whitelistUsers.getHexRoot(), ftbUserList.getHexRoot());
      const leafNodeFtb = getLeaf(userFtb.address, ftbMaxApprovedQty);
      hexProofsFtb = ftbUserList.getHexProof(leafNodeFtb);

      const leafNodeWL = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [userWL.address]));
      hexProofsWL = whitelistUsers.getHexProof(leafNodeWL);
    });

    it('should mint', async () => {

      await bubbleBot.switchSalePhase(0, 0);
      const currentStat = await bubbleBot.getSaleStatus();
      expect(currentStat).to.be.eq(3);

      let mintQty = 2;

      await expect(bubbleBot.connect(userPublic).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.emit(bubbleBot, 'NewMinter')
        .withArgs(userPublic.address, mintQty);

      let userBalance = await bubbleBot.balanceOf(userPublic.address);

      expect(userBalance.toNumber()).to.be.eq(2);

      mintQty = 4;
      await bubbleBot.connect(userPublic).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

      userBalance = await bubbleBot.balanceOf(userPublic.address);

      expect(userBalance.toNumber()).to.be.eq(6);

    });

    it('should mint - flow', async () => {

      // FBT Sale
      await bubbleBot.switchSalePhase(60, 60);
      const currentStat = await bubbleBot.getSaleStatus();
      expect(currentStat).to.be.eq(1);

      const isWhitelisted = await bubbleBot.verifyFtbWhiteList(userFtb.address, hexProofsFtb, ftbMaxApprovedQty);
      expect(isWhitelisted).to.be.true;

      const mintQty = 2;

      await expect(bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.emit(bubbleBot, 'NewMinter')
        .withArgs(userFtb.address, mintQty);

      let userBalance = await bubbleBot.balanceOf(userFtb.address);

      expect(userBalance.toNumber()).to.be.eq(2);

      await expect(bubbleBot.connect(userFtb).mintBBots(1, hexProofsFtb, ftbMaxApprovedQty, {
        value: BigInt(0.0769 * 1e18)
      })).to.be.revertedWith('EXCEEDS_MAX');

      // WL Sale
      await bubbleBot.switchSalePhase(0, 60);
      const leafNodeWL = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [userFtb.address]));
      hexProofsWL = whitelistUsers.getHexProof(leafNodeWL);

      await bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsWL, 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

      await expect(bubbleBot.connect(userFtb).mintBBots(mintQty, hexProofsWL, 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('EXCEEDS_MAX');

      // Public Sale
      await bubbleBot.switchSalePhase(0, 0);

      await bubbleBot.connect(userFtb).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

      await bubbleBot.connect(userFtb).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

    });

    it('should mint all the nft', async () => {

      await bubbleBot.switchSalePhase(0, 0);
      const totalSupply = await bubbleBot.totalSupply();

      const remainingSupply = 999 - totalSupply.toNumber() - 1;

      await bubbleBot.connect(userPublic).mintBBots(remainingSupply, [], 0, {
        value: BigInt(0.0769 * remainingSupply * 1e18)
      })

      const userBalance = await bubbleBot.balanceOf(userPublic.address);

      expect(userBalance.toNumber()).to.be.eq(remainingSupply);

      await expect(bubbleBot.connect(userPublic).mintBBots(2, [], 0, {
        value: BigInt(0.0769 * 2 * 1e18)
      })).to.be.revertedWith('EXCEEDS_SUPPLY');
    });

    it('should fail if amount is lower', async () => {
      await bubbleBot.switchSalePhase(0, 0);

      const mintQty = 3;

      await expect(bubbleBot.connect(userPublic).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0001 * mintQty * 1e18)
      })).to.be.revertedWith('INSUFFICIENT_AMOUNT');

    });

    it('should fail mint if sale not started', async () => {

      const currentStat = await bubbleBot.getSaleStatus();
      expect(currentStat).to.be.eq(0);

      const mintQty = 2;

      await expect(bubbleBot.connect(userPublic).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      })).to.be.revertedWith('SALE_NOT_STARTED');
    });
  });

  describe('transfer and approve', function () {

    it('Should transfer nft', async () => {

      await bubbleBot.switchSalePhase(0, 0);

      const mintQty = 4;
      await bubbleBot.connect(userPublic).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

      const [tokenId] = await bubbleBot.tokensOfOwner(userPublic.address);

      await bubbleBot.connect(userPublic).transferFrom(userPublic.address, deployer.address, tokenId.toNumber());

      let isOwner = await bubbleBot.ownerOf(tokenId.toNumber());

      expect(isOwner).to.be.eql(deployer.address);

    });

    it('should approve and transfer nft from deployer', async () => {
      await bubbleBot.switchSalePhase(0, 0);

      const mintQty = 4;
      await bubbleBot.connect(userPublic).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

      const [tokenId] = await bubbleBot.tokensOfOwner(userPublic.address);

      await bubbleBot.connect(userPublic).approve(deployer.address, tokenId.toNumber());

      await bubbleBot.transferFrom(userPublic.address, deployer.address, tokenId.toNumber());

      let isOwner = await bubbleBot.ownerOf(tokenId.toNumber());

      expect(isOwner).to.be.eql(deployer.address);
    });

    it('Should approve and transfer all nft from deployer', async () => {
      await bubbleBot.switchSalePhase(0, 0);

      const mintQty = 4;
      await bubbleBot.connect(userPublic).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

      await bubbleBot.connect(userPublic).setApprovalForAll(deployer.address, true);

      const [, tokenId] = await bubbleBot.tokensOfOwner(userPublic.address);

      await bubbleBot.transferFrom(userPublic.address, deployer.address, tokenId.toNumber());

      let isOwner = await bubbleBot.ownerOf(tokenId.toNumber());

      expect(isOwner).to.be.eql(deployer.address);

    });

    it('Should return the proper base uri', async () => {
      await bubbleBot.switchSalePhase(0, 0);

      const mintQty = 1;
      await bubbleBot.connect(userPublic).mintBBots(mintQty, [], 0, {
        value: BigInt(0.0769 * mintQty * 1e18)
      });

      await bubbleBot.updateBaseUri('https://dev.peanuthub.com/nft/');
      const tokenUri = await bubbleBot.tokenURI(1);
      expect(tokenUri).to.be.eq('https://dev.peanuthub.com/nft/1');
    });
  });

});
