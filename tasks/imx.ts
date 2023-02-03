import ImxModule from "../module/imx";
import Address from '../assets/address.json'
import {buildIpfs, uploadToAws} from "./base";
import {urlSource} from "ipfs-http-client";
import Config from "../config";
import ImxConfig from '../assets/backup.json'

export default function initTask(task: any) {

    function getDeployer (hre) {
        const [pk] = hre.network.config.accounts

        return new hre.ethers.Wallet(pk, hre.ethers.provider);
    }

    task('create-project', 'Create Project On Imx')
        .setAction(async (taskArgs: any, hre: any) => {

            const signer = getDeployer(hre);

            await ImxModule.createProject(signer, hre.network.name);
    });

    task('mint-imx', 'Mint On Imx')
        .addParam('user', 'Address to minter')
        .addParam('token', 'Token Id')
        .setAction(async (taskArgs: any, hre: any) => {

            const signer = getDeployer(hre);

            await ImxModule.mintOnImx(signer, hre.network.name, {
                address: Address[hre.network.name].battlePass,
                user: taskArgs.user,
                tokenId: taskArgs.token
            })

        });

    task('upload-imx-metadata', 'Upload Imx Metadata')
        .addOptionalParam('url', 'Image Url to use as base')
        .setAction(async (taskArgs: any) => {
            let imageUrl;

            if( taskArgs.url ) {
                const ipfs = buildIpfs();

                const imageHandle = await ipfs.add(urlSource(taskArgs.url))
                imageUrl = `https://cloudflare-ipfs.com/ipfs/${imageHandle.cid.toString()}`;
            }
            else {
                imageUrl = ImxConfig.imx_image_url
            }

            for(let i = 0; i < Config.MAX_SUPPLY; i++ ) {
                const metadataForNft = {
                    image_url: imageUrl,
                    image: imageUrl,
                    name: Config.IMX_PROJECT_NAME + ` #${i}`,
                    description: Config.PROJECT_DESCRIPTION,
                    attributes: [{
                        trait_type: 'passId',
                        value: `${i}`,
                    }],
                    passId: `${i}`
                };

                let jsonBuffer = Buffer.from(JSON.stringify(metadataForNft));

                const params = {
                    Key: `metadata-imx/${Config.APP_NAME}/${i}`, // File name you want to save as in S3
                    Body: jsonBuffer,
                    ContentType: 'application/json',
                    ACL: 'public-read',
                };

                await uploadToAws(params);
            }
        })


    task('create-imx-collection', 'Create and Upload Metadata on aws for imx')
        .setAction(async (taskArgs: any, hre: any) => {

           const signer = getDeployer(hre);

            await ImxModule.createCollection(signer, hre.network.name, {
                name: Config.IMX_PROJECT_NAME,
                address: Address[hre.network.name].battlePass,
                url: `https://${Config.AWS_BUCKET}.s3.amazonaws.com/metadata-imx/${Config.APP_NAME}`
            });
        });
}
