const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts, deployments }) {
    //const { deployer } = await getNamedAccounts()
    accounts = await ethers.getSigners()
    const deployer = accounts[0]

    // Basic NFT
    const basicNftInfo = await deployments.get("BasicNft")
    const basicNft = await ethers.getContractAt("BasicNft", basicNftInfo.address, deployer)
    const basicMintTx = await basicNft.mintNft()
    await basicMintTx.wait(1)
    console.log(`Basic NFT index 0 has tokenURI: ${await basicNft.tokenURI(0)}`)

    // Random IPFS NFT
    const randomIpfsNftInfo = await deployments.get("RandomIpfsNft")
    const randomIpfsNft = await ethers.getContractAt(
        "RandomIpfsNft",
        randomIpfsNftInfo.address,
        deployer,
    )
    const mintFee = await randomIpfsNft.getMintFee()
    if (!developmentChains.includes(network.name)) {
        const randomIpfsNftMintTx = await randomIpfsNft.requestNft({ value: mintFee.toString() })
        const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1)
    }

    await new Promise(async (resolve, reject) => {
        setTimeout(() => reject("Timeout: 'NFTMinted' event did not fire"), 300000) // 10 minute timeout time
        randomIpfsNft.once("NftMinted", async function () {
            console.log(`Random IPFS NFT index 0 tokenURI: ${await randomIpfsNft.tokenURI(0)}`)
            resolve()
        })

        if (developmentChains.includes(network.name)) {
            const vrfCoordinatorV2MockInfo = await deployments.get("VRFCoordinatorV2Mock")
            const vrfCoordinatorV2Mock = await ethers.getContractAt(
                "VRFCoordinatorV2Mock",
                vrfCoordinatorV2MockInfo.address,
                deployer,
            )

            // The fact that we need to add the consumer to the VrfMock complicates a bit the code as we need to do it before calling requestNft,
            // Meaning we cannot have a single call to requestNft regardless of the network.
            const subscriptionId = await randomIpfsNft.getSubscriptionId()
            await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNft.target)

            const randomIpfsNftMintTx = await randomIpfsNft.requestNft({
                value: mintFee.toString(),
            })
            const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1)
            const requestId = randomIpfsNftMintTxReceipt.logs[1].args.requestId

            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNft.target)
        }
    })

    // Dynamic SVG NFT

    const highValue = ethers.parseEther("4000")
    const dynamicSvgNftInfo = await deployments.get("DynamicSvgNft")
    const dynamicSvgNft = await ethers.getContractAt(
        "DynamicSvgNft",
        dynamicSvgNftInfo.address,
        deployer,
    )
    const dynamicSvgNftTx = await dynamicSvgNft.mintNft(highValue.toString())
    await dynamicSvgNftTx.wait(1)
    console.log(`Dynamic SVG NFT index 1 tokenURI: ${await dynamicSvgNft.tokenURI(1)}`)
}

module.exports.tags = ["all", "mint"]
