import Utils from '../module/utils';

const getConfigObject = (sourceConfig) => ({
    PROJECT_NAME: Utils.configParser(sourceConfig, 'string', 'PROJECT_NAME', 'Bubble Bot'),
    IMX_PROJECT_NAME: Utils.configParser(sourceConfig, 'string', 'IMX_PROJECT_NAME', 'Battle Pass'),
    APP_NAME: Utils.configParser(sourceConfig, 'string', 'PROJECT_NAME', 'bubble-bot'),
    PROJECT_DESCRIPTION: Utils.configParser(sourceConfig, 'string', 'PROJECT_DESCRIPTION', 'The new world is threatened with greed, power, and false hopes. As the world collides, the decision falls on you. Become the ultimate robot fighter standing against all odds in this fast-paced puzzle mayhem!\n' +
        '\n' +
        'Dive into the BUBBLE BOTS’ story! Compete against players in a colorful puzzle royale of simple good and evil chaos. Choose from a diverse cast of powerful robots and engage in exhilarating battles to claim victory. Crush your foes with perfectly timed skills, unique abilities, and superior tactics. Are you ready to fight for what you believe in?'),
    AWS_ID: Utils.configParser(sourceConfig, 'string', 'AWS_ID', ''),
    AWS_SECRET: Utils.configParser(sourceConfig, 'string', 'AWS_SECRET', ''),
    AWS_BUCKET: Utils.configParser(sourceConfig, 'string', 'AWS_BUCKET', 'bubbebot'),
    FTB_SNAPSHOT_URL: Utils.configParser(sourceConfig, 'string', 'FTB_SNAPSHOT_URL', 'https://bubbebot.s3.amazonaws.com/snapshot/ftb-owners.json'),
    PREMINT_URL: Utils.configParser(sourceConfig, 'string', 'PREMINT_URL', ''),
    IMX_SANDBOX: Utils.configParser(sourceConfig, 'string', 'IMX_SANDBOX','0x7917eDb51ecD6CdB3F9854c3cc593F33de10c623'),
    MULTI_SIG_WALLET: Utils.configParser(sourceConfig, 'string', 'MULTI_SIG_WALLET', '0x70F78c5c7FD95Bfd248121b60eDFeE844292d45B'),
    IPFS_KEY: Utils.configParser(sourceConfig, 'string', 'IPFS_KEY', ''),
    IPFS_SECRET: Utils.configParser(sourceConfig, 'string', 'IPFS_SECRET', ''),
    IMX_PROD: Utils.configParser(sourceConfig, 'string', 'IMX_PROD', ''),
    ETHERSCAN: Utils.configParser(sourceConfig, 'string', 'ETHERSCAN', '1E46ZC7H9TYX6QM4FUHPES85TQCKRR28AU'),
    INFURA_KEY: Utils.configParser(sourceConfig, 'string', 'INFURA_KEY', '2aa521366afc4458be10d8745e3753e9'),
    PRIVATE_KEY: Utils.configParser(sourceConfig, 'string', 'PRIVATE_KEY', ''),
    BUILD_PATH: Utils.configParser(sourceConfig, 'string', 'BUILD_PATH', './assets/nft-assets'),
    MAX_SUPPLY: Utils.configParser(sourceConfig, 'number', 'MAX_SUPPLY', 100)
});

export default getConfigObject;
