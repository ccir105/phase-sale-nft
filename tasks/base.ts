import axios from "axios";
import awsSdk from 'aws-sdk';
import Config from '../config'
import Utils from '../module/utils'
import {create} from "ipfs-http-client";

export function initTask(task: any) {

    task('balance', 'Get Balance').setAction(async (arg: any, hre: any) => {
        const accounts = await hre.ethers.getSigners();
        for (let i = 0; i < accounts.length; i++) {
            let balance = await hre.web3.eth.getBalance(accounts[i].address);
            console.log(accounts[i].address, balance / 1e18);
        }
    });

    task('get-config', 'Text')
        .setAction(async (arg: any, hre: any) => {
           console.log(Config)
        });
}

export async function showTxStatus(tx: any, hre: any) {
  console.log('[Transaction]', tx.hash);
  let receipt = await tx.wait();
  console.log(`[Cost] ${hre.ethers.utils.formatEther(tx.gasPrice * receipt.gasUsed)} ETH`);
}


export async function uploadToAws(params): Promise<string> {

    params = Object.assign(params, {
        Bucket: Config.AWS_BUCKET,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ['*'],
                    AllowedMethods: ['GET'],
                    AllowedOrigins: ['*'],
                },
                {
                    AllowedMethods: ['GET'],
                    AllowedOrigins: ['*'],
                },
            ],
        },
    });

    const aws = new awsSdk.S3({
        accessKeyId: Config.AWS_ID,
        secretAccessKey: Config.AWS_SECRET,
    })

    return new Promise((resolve, reject) => {
        aws.upload(params, (error, data) => {
            if (error) {
                console.log('Error upload aws', ({ error, data }));
                reject(error);
            }

            if (data) {
                console.log('Upload aws', ({ data }));
                resolve(data.Location);
            }
        });
    });
}

export async function fetchWhitelistAddress() {
    // @ts-ignore
    let [ftbList, premintList] = await Promise.all([axios.get(Config.FTB_SNAPSHOT_URL), axios.get(Config.PREMINT_URL)]);
    ftbList = ftbList.data;
    let whitelistAddress = [...premintList.data.data.map(list => list.wallet)];

    return {
        ftbList,
        premintList: whitelistAddress
    }
}

export function buildIpfs() {
    const key = Config.IPFS_KEY
    const secret = Config.IPFS_SECRET

    const authorization =
        'Basic ' + Buffer.from(key + ':' + secret).toString('base64');

    return create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
            authorization,
        },
    });
}
