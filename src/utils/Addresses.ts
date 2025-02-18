import { ethers, Signer } from 'ethers'
import { NftFactory } from '../contracts/NFTFactory'
import fs from 'fs'
// eslint-disable-next-line import/no-named-default
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IERC20Template.sol/IERC20Template.json'
// eslint-disable-next-line import/no-named-default
import { default as Addresses } from '@oceanprotocol/contracts/addresses/address.json'
/**
 * Get the artifacts address from the address.json file
 * either from the env or from the ocean-contracts dir
 * @returns data or null
 */
export function getOceanArtifactsAddresses(): any {
  try {
    if (process.env.ADDRESS_FILE) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const data = fs.readFileSync(process.env.ADDRESS_FILE, 'utf8')
      return JSON.parse(data)
    }
    return Addresses
  } catch (error) {
    return Addresses
  }
}

/**
 * Get the artifacts address from the address.json file, for the given chain
 * either from the env or from the ocean-contracts dir, safer than above, because sometimes the network name
 * is mispeled, best example "optimism_sepolia" vs "optimism-sepolia"
 * @returns data or null
 */
export function getOceanArtifactsAddressesByChainId(chain: number): any {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const data = getOceanArtifactsAddresses()
    if (data) {
      const networks = Object.keys(data)
      for (const network of networks) {
        if (data[network].chainId === chain) {
          return data[network]
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
  return null
}
/**
 * Use this function to accurately calculate the template index, and also checking if the template is active
 * @param owner the signer account
 * @param nftContractAddress the nft contract address, usually artifactsAddresses.ERC721Factory
 * @param template the template ID or template address (from smart contract getId() function)
 * @returns index of the template on the list
 */
export async function calculateActiveTemplateIndex(
  owner: Signer,
  nftContractAddress: string, // addresses.ERC721Factory,
  template: string | number
): Promise<number> {
  // is an ID number?
  const isTemplateID = typeof template === 'number'

  const factoryERC721 = new NftFactory(nftContractAddress, owner)
  const currentTokenCount = await factoryERC721.getCurrentTokenTemplateCount()
  for (let i = 1; i <= currentTokenCount; i++) {
    const tokenTemplate = await factoryERC721.getTokenTemplate(i)

    const erc20Template = new ethers.Contract(
      tokenTemplate.templateAddress,
      ERC20Template.abi,
      owner
    )

    // check for ID
    if (isTemplateID) {
      const id = await erc20Template.connect(owner).getId()
      if (tokenTemplate.isActive && id.toString() === template.toString()) {
        return i
      }
    } else if (
      tokenTemplate.isActive &&
      tokenTemplate.templateAddress === template.toString()
    ) {
      return i
    }
  }
  // if nothing is found it returns -1
  return -1
}
