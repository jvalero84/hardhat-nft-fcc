const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT Unit Tests", function () {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfs"])
              const randomIpfsNftInfo = await deployments.get("RandomIpfsNft")
              const vrfCoordinatorV2MockInfo = await deployments.get("VRFCoordinatorV2Mock")
              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  "VRFCoordinatorV2Mock",
                  vrfCoordinatorV2MockInfo.address,
                  deployer,
              )
              randomIpfsNft = await ethers.getContractAt(
                  "RandomIpfsNft",
                  randomIpfsNftInfo.address,
                  deployer,
              )
          })

          describe("Constructor", () => {
              it("Sets starting values correctly", async () => {
                  const name = await randomIpfsNft.name()
                  const symbol = await randomIpfsNft.symbol()
                  const tokenCounter = await randomIpfsNft.getTokenCounter()
                  const dogTokenUriZero = await randomIpfsNft.getDogTokenUris(0)
                  const isInitialized = await randomIpfsNft.getInitialized()
                  assert.equal(name, "Random IPFS NFT")
                  assert.equal(symbol, "RIN")
                  assert.equal(tokenCounter.toString(), "0")
                  assert(dogTokenUriZero.includes("ipfs://"))
                  assert.equal(isInitialized, true)
              })
          })

          describe("requestNft", () => {
              it("fails if no payment is sent with the request", async () => {
                  expect(randomIpfsNft.requestNft()).to.be.revertedWithCustomError(
                      randomIpfsNft,
                      "RandomIpfsNft__NeedMoreETHSent",
                  )
              })
          })
      })
