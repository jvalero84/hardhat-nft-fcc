const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId
    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const mockV3AggregatorInfo = await deployments.get("MockV3Aggregator")
        const signer = await ethers.getSigner(deployer)
        const EthUsdAggregator = await ethers.getContractAt(
            "MockV3Aggregator",
            mockV3AggregatorInfo.address,
            signer,
        )
        ethUsdPriceFeedAddress = EthUsdAggregator.target
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
    }

    log("---------------------------------------")

    const lowSVG = fs.readFileSync("./images/dynamicNft/frown.svg", { encoding: "utf-8" })
    const highSVG = fs.readFileSync("./images/dynamicNft/happy.svg", { encoding: "utf-8" })

    args = [ethUsdPriceFeedAddress, lowSVG, highSVG]
    const dynamicSvgNft = await deploy("DynamicSvgNft", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(dynamicSvgNft.address, args)
    }
}

module.exports.tags = ["all", "dynamicsvg", "main"]
