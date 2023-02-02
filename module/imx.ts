
import { ImmutableX, Config, CreateProjectRequest,CreateCollectionRequest, UnsignedMintRequest } from '@imtbl/core-sdk';
import ImxConfig from '../assets/backup.json'
import fs from 'fs';
import CONFIG from '../config';

const ImxModule = {

    getClient: (ethNetwork) => {
        const network = ethNetwork === 'live' ? Config.PRODUCTION : Config.SANDBOX;
        return new ImmutableX( network );
    },

    async createProject(signer, ethNetwork) {

        const projectParams: CreateProjectRequest = {
            company_name: CONFIG.APP_NAME,
            contact_email: ImxConfig.email,
            name: ImxConfig.project_name
        };

        const client = ImxModule.getClient(ethNetwork);

        try {
            const createProjectResponse = await client.createProject(
                signer,
                projectParams,
            );

            fs.writeFileSync(
                './assets/backup.json',
                JSON.stringify({
                    ...ImxConfig,
                    projectId: createProjectResponse.id
                }),
            );

        } catch (error) {
            console.error(error);
        }
    },

    async createCollection(signer, ethNetwork, {
        name,
        address,
        url
    }) {
        const client = ImxModule.getClient(ethNetwork);

        const createCollectionParams: CreateCollectionRequest = {
            contract_address: address,
            name,
            owner_public_key: signer.publicKey,
            project_id: ImxConfig.projectId,
            collection_image_url: ImxConfig.collection_image_url,
            description: ImxConfig.description,
            icon_url: ImxConfig.icon_url,
            metadata_api_url: url,
        };

        try {
            const createCollectionResponse = await client.createCollection(
                signer,
                createCollectionParams,
            );

            console.log('createCollectionResponse', JSON.stringify(createCollectionResponse));

        } catch (error: any) {
            if( error.code === 'contract_already_exists' ) {
                await ImxModule.updateCollection(signer, ethNetwork, {
                    address,
                    url
                });
            }
            else {
                console.log(error)
                process.exit(1);
            }
        }
    },

    async updateCollection(signer, ethNetwork, {
        address,
        url,
    }) {
        const client = ImxModule.getClient(ethNetwork);

        try {
            await client.updateCollection(signer, address, {
                metadata_api_url: url,
                collection_image_url: ImxConfig.collection_image_url,
                description: ImxConfig.description,
                icon_url: ImxConfig.icon_url,
            });

            await client.addMetadataSchemaToCollection(signer, address, {
                metadata: [{
                    name: 'passId',
                    type: 'text'
                }]
            })
        }

        catch (error) {
            console.log(error);
            // process.exit(1);
        }
    },

    async mintOnImx(signer, ethNetwork, {
        address,
        user,
        tokenId,
    }) {
        const mintParams: UnsignedMintRequest = {
            contract_address: address,
            royalties: [
                {
                    recipient: CONFIG.MULTI_SIG_WALLET,
                    percentage: 2.5,
                },
            ],
            users: [
                {
                    tokens: [{ id: tokenId, blueprint: 'battle-pass' }],
                    user: user.toLowerCase(),
                },
            ],
        };

        const client = ImxModule.getClient(ethNetwork);

        try {
            const mintResponse = await client.mint(
                signer,
                mintParams,
            );

            console.log('mintResponse', JSON.stringify(mintResponse));
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    }
};

export default ImxModule;
