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
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWithCustomError(
                      randomIpfsNft,
                      "RandomIpfsNft__NeedMoreETHSent",
                  )
              })
              it("fails if the value sent is less than the established fee", async () => {
                  const fee = await randomIpfsNft.getMintFee()
                  await expect(
                      randomIpfsNft.requestNft({ value: fee - ethers.parseEther("0.001") }),
                  ).to.be.revertedWithCustomError(randomIpfsNft, "RandomIpfsNft__NeedMoreETHSent")
              })
              it("emits an event and kicks off a random word request", async () => {
                  const fee = await randomIpfsNft.getMintFee()
                  const subscriptionId = await randomIpfsNft.getSubscriptionId()
                  await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNft.target)
                  await expect(randomIpfsNft.requestNft({ value: fee.toString() })).to.emit(
                      randomIpfsNft,
                      "NftRequested",
                  )
              })
          })

          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async () => {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              console.log("NftMinted event emited!")
                              const tokenUriZero = await randomIpfsNft.tokenURI("0")
                              const tokenCounter = await randomIpfsNft.getTokenCounter()
                              assert.equal(tokenUriZero.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      console.log("NftMinted event listener setup..")
                      try {
                          const fee = await randomIpfsNft.getMintFee()
                          const subscriptionId = await randomIpfsNft.getSubscriptionId()
                          await vrfCoordinatorV2Mock.addConsumer(
                              subscriptionId,
                              randomIpfsNft.target,
                          )
                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.logs[1].args.requestId,
                              randomIpfsNft.target,
                          )
                      } catch (error) {
                          console.log(error)
                          reject(error)
                      }
                  })
              })
          })

          describe("getBreedFromModdedRng", () => {
              it("should return pug if moddedRng < 10", async () => {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(5)
                  assert.equal(expectedValue.toString(), "0")
              })
              it("should return shiba-inu if moddedRng between 10 - 39", async () => {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(22)
                  assert.equal(expectedValue.toString(), "1")
              })
              it("should return St.Bernard if moddedRng between 40 - 99", async () => {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(63)
                  assert.equal(expectedValue.toString(), "2")
              })
              it("should revert if moddedRng greater than 99", async () => {
                  await expect(
                      randomIpfsNft.getBreedFromModdedRng(100),
                  ).to.be.revertedWithCustomError(randomIpfsNft, "RandomIpfsNft__RangeOutOfBounds")
              })
          })
      })
