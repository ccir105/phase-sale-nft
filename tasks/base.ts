import axios from "axios";

const awsSdk = require('aws-sdk');

export function initTask(task: any) {

    task('balance', 'Get Balance').setAction(async (arg: any, hre: any) => {
        const accounts = await hre.ethers.getSigners();
        for (let i = 0; i < accounts.length; i++) {
            let balance = await hre.web3.eth.getBalance(accounts[i].address);
            console.log(accounts[i].address, balance / 1e18);
        }
    });
}

export async function showTxStatus(tx: any, hre: any) {
  console.log('[Transaction]', tx.hash);
  let receipt = await tx.wait();
  console.log(`[Cost] ${hre.ethers.utils.formatEther(tx.gasPrice * receipt.gasUsed)} ETH`);
}


export async function uploadToAws(params) {
    params = Object.assign(params, {
        Bucket: process.env.AWS_BUCKET,
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
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SECRET,
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
    let [ftbList, premintList] = await Promise.all([axios.get(process.env.FTB_SNAPSHOT_URL), axios.get(process.env.PREMINT_URL)]);
    ftbList = ftbList.data;
    let whitelistAddress = [...premintList.data.data.map(list => list.wallet)];

    return {
        ftbList,
        premintList: whitelistAddress
    }
}
