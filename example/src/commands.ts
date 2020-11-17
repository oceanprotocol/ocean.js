import { Ocean, Account, DataTokens, Logger, Metadata } from "@oceanprotocol/lib"
import {
    Service,
    ServiceComputePrivacy,
    ServiceType
} from '@oceanprotocol/lib/dist/node/ddo/interfaces/Service'
import { SearchQuery } from "@oceanprotocol/lib/dist/node/metadatacache/MetadataCache"

export class Commands {
    public ocean: Ocean
    public account: Account
    constructor(
        ocean: Ocean,
        account: Account
    ) {
        this.ocean = ocean
        this.account = account

    }
    //utils
    public async sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms)
        })
    }

    //commands
    public async publish(
        args: string[]
    ) {

        console.log('start publishing')


        let tokenAddress = await this.ocean.datatokens.create(
            '',
            this.account.getId(),
            '10000000000',
            'BBDT',
            'BBDT'
        )
        await this.ocean.datatokens.mint(tokenAddress, this.account.getId(), '1000000000')
        let asset: Metadata = {
            main: {
                type: 'dataset',
                name: 'Standup Demo1',
                dateCreated: new Date(Date.now()).toISOString().split('.')[0] + 'Z', // remove milliseconds
                author: 'All',
                license: 'CC-BY',
                files: [
                    {
                        url:
                            'https://raw.githubusercontent.com/tbertinmahieux/MSongsDB/master/Tasks_Demos/CoverSongs/shs_dataset_test.txt',
                        checksum: 'efb2c764274b745f5fc37f97c6b0e764',
                        contentLength: '4535431',
                        contentType: 'text/csv',
                        encoding: 'UTF-8',
                        compression: 'zip'
                    }
                ]
            }
        }

        const downloadService = await this.ocean.assets.createAccessServiceAttributes(
            this.account,
            '1', // set the price in datatoken
            new Date(Date.now()).toISOString().split('.')[0] + 'Z', // publishedDate
            0 // timeout
        )
        //create compute service
        let timeout = 3600
        const cluster = this.ocean.compute.createClusterAttributes(
            'Kubernetes',
            'http://10.0.0.17/xxx'
        )
        const servers = [
            this.ocean.compute.createServerAttributes(
                '1',
                'xlsize',
                '50',
                '16',
                '0',
                '128gb',
                '160gb',
                timeout
            )
        ]
        const containers = [
            this.ocean.compute.createContainerAttributes(
                'tensorflow/tensorflow',
                'latest',
                'sha256:cb57ecfa6ebbefd8ffc7f75c0f00e57a7fa739578a429b6f72a0df19315deadc'
            )
        ]
        const provider = this.ocean.compute.createProviderAttributes(
            'Azure',
            'Compute service with 16gb ram for each node.',
            cluster,
            containers,
            servers
        )
        const origComputePrivacy: ServiceComputePrivacy = {
            allowRawAlgorithm: false,
            allowNetworkAccess: false,
            trustedAlgorithms: []
        }
        const computeService = this.ocean.compute.createComputeService(
            this.account,
            "1",
            new Date(Date.now()).toISOString().split('.')[0] + 'Z', // publishedDate,
            provider,
            origComputePrivacy,
            timeout,
        )


        const ddo = await this.ocean.assets.create(
            asset,
            this.account,
            [
                downloadService, computeService
            ],
            tokenAddress
        )
        console.log("Asset published. ID:  " + ddo.id)
    }
    public async publishAlgo(
        args: string[]
    ) {
        const tokenAddress = await this.ocean.datatokens.create(
            '',
            this.account.getId(),
            '10000000000',
            'BBALG',
            'BBALG'
        )
        await this.ocean.datatokens.mint(tokenAddress, this.account.getId(), '1000000000')
        const algoAsset: Metadata = {
            main: {
                type: 'algorithm',
                name: 'Test Algo',
                dateCreated: new Date(Date.now()).toISOString().split('.')[0] + 'Z', // publishedDate,,
                author: 'DevOps',
                license: 'CC-BY',
                files: [
                    {
                        url:
                            'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
                        contentType: 'text/js',
                        encoding: 'UTF-8'
                    }
                ],
                algorithm: {
                    language: 'js',
                    format: 'docker-image',
                    version: '0.1',
                    container: {
                        entrypoint: 'node $ALGO',
                        image: 'node',
                        tag: '10'
                    }
                }
            }
        }
        const service1 = await this.ocean.assets.createAccessServiceAttributes(
            this.account,
            '1',
            new Date(Date.now()).toISOString().split('.')[0] + 'Z', // publishedDate,,
            0
        )
        const algorithmAsset = await this.ocean.assets.create(
            algoAsset,
            this.account,
            [service1],
            tokenAddress
        )
        console.log("Algorithm published. ID:  " + algorithmAsset.id)
    }

    public async getDDO(args: string[]) {
        console.log("Getting DDO for :" + args[0])
        const ddo = await this.ocean.assets.resolve(args[0])
        if (!ddo) { console.error("Error fetching DDO " + args[0] + ".  Does this asset exists?") }
        else console.log(ddo)
    }

    public async download(args: string[]) {
        let dataDdo = await this.ocean.assets.resolve(args[0])
        if (!dataDdo) {
            console.error("Error fetching DDO " + args[0] + ".  Does this asset exists?")
            return
        }
        let accessService = await this.ocean.assets.getServiceByType(args[0], 'access')
        if (!accessService) {
            console.error("Error getting accessService from " + args[0] + ".  Does this asset has an accessService?")
            return
        }
        const txid = await this.ocean.assets.order(args[0], 'access', this.account.getId(), accessService.index)
        if (!txid) {
            console.error("Error ordering access for " + args[0] + ".  Do you have enought tokens?")
            return
        }
        await this.ocean.assets.download(args[0], txid, dataDdo.dataToken, this.account, 'downloads/' + args[1])
    }

    public async compute(args: string[]) {
        let dataDdo = await this.ocean.assets.resolve(args[0])
        if (!dataDdo) {
            console.error("Error resolving " + args[0] + ".  Does this asset exists?")
            return
        }
        let algoDdo = await this.ocean.assets.resolve(args[1])
        if (!algoDdo) {
            console.error("Error resolving " + args[0] + ".  Does this asset exists?")
            return
        }
        let computeService = await this.ocean.assets.getServiceByType(args[0], 'compute')
        if (!computeService) {
            console.error("Error getting computeService for " + args[0] + ".  Does this asset has an computeService?")
            return
        }
        let algoService = await this.ocean.assets.getServiceByType(args[1], 'access')
        if (!algoService) {
            console.error("Error getting accessService for algo " + args[0] + ".  Does this asset has an accessService?")
            return
        }
        const computeOrderId = await this.ocean.compute.order(
            this.account.getId(),
            args[0],
            computeService.index,
            args[1]
        )
        if (!computeOrderId) {
            console.error("Error ordering compute for " + args[0] + ".  Do you have enought tokens?")
            return
        }
        console.log("computeOrderId: " + computeOrderId)
        const algoOrderId = await this.ocean.assets.order(
            args[1],
            'access',
            this.account.getId(),
            algoService.index
        )
        if (!algoOrderId) {
            console.error("Error ordering algo " + args[0] + ".  Do you have enought tokens?")
            return
        }
        console.log("algoOrderId: " + algoOrderId)
        let response
        try {
            response = await this.ocean.compute.start(
                args[0],
                computeOrderId,
                dataDdo.dataToken,
                this.account,
                args[1],
                null,
                null,
                String(computeService.index),
                'compute',
                algoOrderId,
                algoDdo.dataToken
            )
        }
        catch (e) {
            console.error("Compute job starting error:")
            console.error(e)
            return
        }
        //console.log(response)
        const jobId = response.jobId
        console.log("Compute started.  JobID: " + jobId)

    }
    public async getCompute(args: string[]) {
        const response = await this.ocean.compute.status(
            this.account,
            undefined,
            args[0],
            null,
            true
        )
        console.log(response)
    }
    public async allowAlgo(args: string[]) {
        let ddo = await this.ocean.assets.resolve(args[0])
        if (!ddo) {
            console.error("Error resolving " + args[0] + ".  Does this asset exists?")
            return
        }
        if(ddo.publicKey[0].owner!=this.account.getId()){
            console.error("You are not the owner of this asset, and there for you cannot update it.")
            return
        }
        let computeService = await this.ocean.assets.getServiceByType(args[0], 'compute')
        if (!computeService) {
            console.error("Error getting computeService for " + args[0] + ".  Does this asset has an computeService?")
            return
        }
        let computePrivacy = computeService.attributes.main.privacy
        if (!computePrivacy.trustedAlgorithms.includes(args[1]))
            computePrivacy.trustedAlgorithms.push(args[1])

        const newDdo = await this.ocean.assets.updateComputePrivacy(
            ddo.id,
            computeService.index,
            computePrivacy,
            this.account
        )
        console.log("Asset updated, new settings:")
        console.log(computePrivacy)

    }
    public async disallowAlgo(args: string[]) {
        let ddo = await this.ocean.assets.resolve(args[0])
        if (!ddo) {
            console.error("Error resolving " + args[0] + ".  Does this asset exists?")
            return
        }
        if(ddo.publicKey[0].owner!=this.account.getId()){
            console.error("You are not the owner of this asset, and there for you cannot update it.")
            return
        }
        let computeService = await this.ocean.assets.getServiceByType(args[0], 'compute')
        if (!computeService) {
            console.error("Error getting computeService for " + args[0] + ".  Does this asset has an computeService?")
            return
        }
        let computePrivacy = computeService.attributes.main.privacy
        if (computePrivacy.trustedAlgorithms.includes(args[1]))
            computePrivacy.trustedAlgorithms = computePrivacy.trustedAlgorithms.filter(item => item !== args[1])
        const newDdo = await this.ocean.assets.updateComputePrivacy(
            ddo.id,
            computeService.index,
            computePrivacy,
            this.account
        )
        console.log("Asset updated, new settings:")
        console.log(computePrivacy)
    }

    public async query(args: string[]) {
        //WIP
    }
}