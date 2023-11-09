const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

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
        ethUsdPriceFeedAddress = EthUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
    }
}
