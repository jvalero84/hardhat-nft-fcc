const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

const imagesLocation = "./images/randomNft"

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [{ trait_type: "Cuteness", value: 100 }],
}

let tokenUris = [
    // If it is the first time and the metadatada has not been uploaded yet, switch the flat UPLOAD_TO_PINATA to true on .env file.
    "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo",
    "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d",
    "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm",
]

const FUND_AMOUNT = "10000000000000000" // 10 Link

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // get the IPFS hashes of our images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
    }

    // To host our nft images we can use:
    // 1. Our own IPFS node. (Too centralised)
    // 2. Use Pinata (https://www.pinata.cloud)
    // 3. nft.storage (https://nft.storage) --> This is the most decentralised option.

    let vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2MockInfo = await deployments.get("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2MockInfo.address
        const signer = await ethers.getSigner(deployer)
        const vrfCoordinatorV2Mock = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            vrfCoordinatorV2Address,
            signer,
        )
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        // subscriptionId = transactionReceipt.events[0].args.subId
        // The mock contract response was not emitting the event of subscription created.
        subscriptionId = 1
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("---------------------------------------")

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ]

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log("---------------------------------------")

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfsNft.address, args)
    }
}

async function handleTokenUris() {
    tokenUris = []
    // We need to do two things here:
    // Store the Images in IPFS
    // Store tbe metadata in IPFS

    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    for (imageUploadResponseIndex in imageUploadResponses) {
        // Create metadata
        // Upload metadata
        let tokenUriMetada = { ...metadataTemplate }
        tokenUriMetada.name = files[imageUploadResponseIndex].replace(".png", "")
        tokenUriMetada.description = `An adorable ${tokenUriMetada.name} pup!`
        tokenUriMetada.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetada.name}...`)
        // store the JSON to Pinata...
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetada)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs Uploaded! They are:")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
