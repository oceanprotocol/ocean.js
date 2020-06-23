import { assert } from 'chai'
import sinon from 'sinon'

import { Ocean } from '../../../src/ocean/Ocean'
import config from '../config'
import { Account } from '../../../src/squid'
import { OceanCompute, ComputeJobStatus } from '../../../src/ocean/OceanCompute'
import TestIdGenerator from '../TestIdGenerator'

describe('OceanCompute', () => {
    let ocean: Ocean
    let account: Account
    let compute: OceanCompute
    let agreementId: string

    before(async () => {
        ocean = await Ocean.getInstance(config)
        ;[account] = await ocean.accounts.list()
        compute = ocean.compute // eslint-disable-line prefer-destructuring
        agreementId = TestIdGenerator.generatePrefixedId()
    })

    afterEach(() => {
        sinon.reset()
        sinon.restore()
    })

    describe('#start()', () => {
        it('should start a new job', async () => {
            sinon.stub(ocean.brizo, 'compute').returns([{ jobId: 'my-job-id' }] as any)
            const response = await compute.start(account, agreementId, 'did:op:0xxx')
            assert(response.jobId === 'my-job-id')
        })
    })

    describe('#stop()', () => {
        it('should stop a job', async () => {
            sinon
                .stub(ocean.brizo, 'compute')
                .returns([{ status: ComputeJobStatus.Completed }] as any)

            const response = await compute.stop(account, agreementId, 'xxx')
            assert(response.status === ComputeJobStatus.Completed)
        })
    })

    describe('#restart()', () => {
        it('should restart a job', async () => {
            sinon
                .stub(ocean.brizo, 'compute')
                .returns([
                    { status: ComputeJobStatus.Started, jobId: 'my-job-id' }
                ] as any)

            const response = await compute.restart(account, agreementId, 'xxx')
            assert(response.jobId === 'my-job-id')
        })
    })

    describe('#delete()', () => {
        it('should delete a job', async () => {
            sinon
                .stub(ocean.brizo, 'compute')
                .returns([{ status: ComputeJobStatus.Deleted }] as any)

            const response = await compute.delete(account, agreementId, 'xxx')
            assert(response.status === ComputeJobStatus.Deleted)
        })
    })

    describe('#status()', () => {
        it('should get the status of one job', async () => {
            sinon
                .stub(ocean.brizo, 'compute')
                .returns([{ status: ComputeJobStatus.Started }] as any)

            const response = await compute.status(account, agreementId, 'xxx')
            assert(response.length === 1)
            assert(response[0].status === ComputeJobStatus.Started)
        })

        it('should get the status of multiple jobs', async () => {
            sinon
                .stub(ocean.brizo, 'compute')
                .returns([
                    { status: ComputeJobStatus.Started },
                    { status: ComputeJobStatus.Started }
                ] as any)

            const response = await compute.status(account, agreementId)
            assert(response.length === 2)
            assert(response[0].status === ComputeJobStatus.Started)
        })

        it('should get all jobs for one owner', async () => {
            sinon
                .stub(ocean.brizo, 'compute')
                .returns([
                    { status: ComputeJobStatus.Started },
                    { status: ComputeJobStatus.Started }
                ] as any)

            const response = await compute.status(account)
            assert(response.length === 2)
            assert(response[0].status === ComputeJobStatus.Started)
        })
    })

    describe('#checkOutput()', () => {
        it('should return default values', async () => {
            const defaultOutput = { publishAlgorithmLog: false, publishOutput: false }
            const output = compute.checkOutput(account, undefined)
            assert.deepEqual(output, defaultOutput)
        })

        it('should return output values', async () => {
            const newOutput = {
                publishAlgorithmLog: true,
                publishOutput: true,
                brizoAddress: 'hello',
                brizoUri: 'hello',
                metadataUri: 'hello',
                nodeUri: 'hello',
                owner: '0xhello',
                secretStoreUri: 'hello'
            }
            const output = compute.checkOutput(account, newOutput)
            assert.deepEqual(output, newOutput)
        })
    })
})
