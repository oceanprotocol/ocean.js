import { assert } from 'chai'

const Web3 = require('web3');
const web3 = new Web3("http://127.0.0.1:8545");

const factoryABI = require('../../src/datatokens/FactoryABI.json')
const datatokensABI = require('../../src/datatokens/DatatokensABI.json')
const feemanagerABI = require('../../src/datatokens/FeeManagerABI.json')

describe('Datatokens', () => {
 
    beforeEach(async () => {
	   const accounts = await web3.eth.getAccounts()
	   const Factory = new web3.eth.Contract(factoryABI)
	   const Template = new web3.eth.Contract(factoryABI)
	   const FeeManager = new web3.eth.Contract(feemanagerABI)

       let blob = 'https://example.com/dataset-1'
       let minter = accounts[0]
       let zeroAddress = '0x0000000000000000000000000000000000000000'
       let cap = 1400000000
       let feeManager = await FeeManager.new()
       let template = await Template.new('Template Contract', 'TEMPLATE', minter, cap, blob, feeManager.address)
       let factory = await Factory.new(template.address, feeManager.address)

    })

    describe('#test()', () => {
        it('should test', async () => {
            const test = true
            assert(test === true)
        })
    })
})