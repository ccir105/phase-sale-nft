// @ts-nocheck
import { urlSource } from "ipfs-http-client";
import fs from 'fs';
import {uploadToAws, buildIpfs} from "./base";
import ReadExcel from 'read-excel-file/node';

import Config from '../config'

const FOLDER_PATH = Config.BUILD_PATH

export default function initTask(task: any) {

    task('parse-attribute', 'Parse Attribute')
        .addParam('file', 'Excel File')
        .setAction(async (taskArgs, hre) => {

            if( !fs.existsSync(taskArgs.file) ) return;

            let benExcel = await ReadExcel(taskArgs.file);

            benExcel = benExcel.slice(3);

            const Headings = benExcel.splice(0, 1)[0].slice(2)

            benExcel.map((current, key) => {

                current = current.slice(2);

                const traits = Headings.reduce((_prev, _current, _index) => {


                    if( current[_index] ){

                        _prev.push({
                            trait_type: _current,
                            value: current[_index]
                        })

                    }

                    return _prev

                }, []);

                if( traits.length ) {
                    const metadata = {
                        edition: key,
                        name: Config.PROJECT_NAME + '#' + key,
                        attributes: traits,
                        description: Config.PROJECT_DESCRIPTION
                    };

                    console.log('[Edition] ', key);

                    fs.writeFileSync(`./assets/nft-assets/json/${key}.json`, JSON.stringify(metadata))
                }
            })
        });

    task('upload-metadata', 'Upload Metadata for nft')
        .setAction(async () => {
            const ipfs = buildIpfs();

            const imgPath = `${FOLDER_PATH}/images`;

            const images: any = [];

            fs.readdirSync(imgPath).forEach(file => {
                const filePath = `${imgPath}/${file}`;
                const content = fs.readFileSync(filePath);
                images.push({ path: file, content });
            });

            let imgRoodCid, metadataRootCid;
            const metadataPath = `${FOLDER_PATH}/json`;

            console.log('[-] Image Ready', images.length);

            for await (const result of  ipfs.addAll(images, { wrapWithDirectory: true, pin: true })) {
                if (result.path === "") {
                    imgRoodCid = (`https://cloudflare-ipfs.com/ipfs/${result.cid.toString()}/`);
                }
                else {
                    console.log(`[-] Uploading`, result.path);
                }
            }

            console.log('[-] Image ', imgRoodCid)

            const metadata: any = [];

            fs.readdirSync(metadataPath).forEach(file => {
                const filePath = `${metadataPath}/${file}`;
                const nftId = file.split('.')[0];
                let metadataJson = JSON.parse(fs.readFileSync(filePath).toString());
                metadataJson.image = `${imgRoodCid}${nftId}.png`;
                fs.writeFileSync(filePath, JSON.stringify(metadataJson));
                metadata.push({path: nftId, content: fs.readFileSync(filePath)});
            });

            for await (const result of ipfs.addAll(metadata, {
                wrapWithDirectory: true,
                pin: true
            })) {
                if (result.path === "") {
                    metadataRootCid = (`https://cloudflare-ipfs.com/ipfs/${result.cid.toString()}/`);
                }
                else {
                    console.log(`[-] Uploading`,result.path)
                }
            }

            console.log('[-] Metadata', metadataRootCid);
        });

    task('dummy-image', 'Upload Dummy image for metadata').
        addParam('url', 'Image Url')
        .setAction(async (taskArgs) => {

        const ipfs = buildIpfs();
        const file = await ipfs.add(urlSource(taskArgs.url))
        console.log('[-] Image', `https://cloudflare-ipfs.com/ipfs/${file.cid.toString()}`)
    });

    task('dummy-metadata', 'Upload Dummy Metadata before reveal')
        .addParam('image', 'Image Url')
        .setAction(async (taskArgs, hre) => {

            const ipfs = buildIpfs();
            const imageFile = await ipfs.add(urlSource(taskArgs.image))
            const imgUrl = `https://cloudflare-ipfs.com/ipfs/${imageFile.cid.toString()}`;

            const maxSupply = Config.MAX_SUPPLY;

            for(let i = 0; i < maxSupply; i++ ) {

                const metadataForRobot = {
                    image_url: imgUrl,
                    name: Config.PROJECT_NAME + ` #${i}`,
                    description: Config.PROJECT_DESCRIPTION,
                    attributes: [{
                        "trait_type": "Token Id",
                        "value": `${i}`
                    }],
                };

                let jsonBuffer = Buffer.from(JSON.stringify(metadataForRobot));

                const params = {
                    Key: `metadata/${Config.APP_NAME}/${i}`, // File name you want to save as in S3
                    Body: jsonBuffer,
                    ContentType: 'application/json',
                    ACL: 'public-read',
                };

                await uploadToAws(params);
            }

        })
};
