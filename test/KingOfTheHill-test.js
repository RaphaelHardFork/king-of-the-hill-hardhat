const { expect } = require('chai')

describe('King of the Hill', function () {
  let KingOfTheHill, kingOfTheHill, dev, owner, playerA, playerB
  const ONE_ETHER = ethers.utils.parseEther('1')
  const ZERO_ADDRESS = ethers.constants.AddressZero

  before(async function () {
    ;[dev, owner, playerA, playerB] = await ethers.getSigners()
    KingOfTheHill = await ethers.getContractFactory('KingOfTheHill')
    kingOfTheHill = await KingOfTheHill.connect(dev).deploy(
      owner.address,
      100,
      { value: ONE_ETHER }
    )
    await kingOfTheHill.deployed()
  })

  describe('Deployment', function () {
    it('should set the owner', async function () {
      expect(await kingOfTheHill.owner()).to.equal(owner.address)
    })

    it('should set the jackpot ready to play', async function () {
      expect(await kingOfTheHill.jackpotToFollow()).to.equal(ONE_ETHER)
    })

    it('should set the right number of blocks', async function () {
      expect(await kingOfTheHill.numberOfBlocks()).to.equal(100)
    })

    it('should revert if it deployed with less than one finney', async function () {
      await expect(
        KingOfTheHill.connect(dev).deploy(owner.address, 100, {
          value: ONE_ETHER.div(1000000),
        })
      ).to.be.revertedWith(
        'KingOfTheHill: This contract must be deployed with at least 1 finney.'
      )
    })
  })

  describe('Following the jackpot', function () {
    let followJackpotCall
    before(async function () {
      followJackpotCall = await kingOfTheHill
        .connect(playerA)
        .followJackpot({ value: ONE_ETHER.mul(2) })
    })

    it('should save the actual block number', async function () {
      expect(await kingOfTheHill.gameBlock()).to.equal(
        await ethers.provider.getBlockNumber()
      )
    })

    it('should set the new owner of the jackpot', async function () {
      expect(await kingOfTheHill.currentWinner()).to.equal(playerA.address)
    })

    it('should increase the jackpot', async function () {
      expect(await kingOfTheHill.jackpotToFollow()).to.equal(ONE_ETHER.mul(3))
    })

    it('should emit a JackpotCalled event', async function () {
      expect(followJackpotCall)
        .to.emit(kingOfTheHill, 'JackpotCalled')
        .withArgs(playerA.address, ONE_ETHER.mul(3))
    })
  })

  describe('Following the jackpot [Edge cases & misuse]', function () {
    it('should revert if the function is called with less than 2 times the jackpot', async function () {
      await expect(
        kingOfTheHill.connect(playerB).followJackpot({ value: ONE_ETHER })
      ).to.be.revertedWith(
        'KingOfTheHill: You have to pay the double of the jackpot, the rest is refund.'
      )
    })

    it('should revert if the currentWinner attempt to follow the jackpot', async function () {
      await expect(
        kingOfTheHill
          .connect(playerA)
          .followJackpot({ value: ONE_ETHER.mul(10) })
      ).to.be.revertedWith(
        'KingOfTheHill: You cannot increase the jackpot while you are the winner.'
      )
    })

    it('should revert the owner attempt to follow the jackpot at the beginning', async function () {
      fakeDeployment = await KingOfTheHill.connect(dev).deploy(
        owner.address,
        100,
        { value: ONE_ETHER }
      )
      await fakeDeployment.deployed()
      await expect(
        fakeDeployment.connect(owner).followJackpot({ value: ONE_ETHER.mul(4) })
      ).to.be.revertedWith(
        'KingOfTheHill: You cannot increase the jackpot while you are the winner.'
      )
    })

    it('should refund the player if he send more than 2 times the jackpot', async function () {
      expect(
        await kingOfTheHill
          .connect(playerB)
          .followJackpot({ value: ONE_ETHER.mul(10) })
      ).to.changeEtherBalance(playerB, ONE_ETHER.sub(ONE_ETHER.mul(7))) // 4 ether to follow => change = -6 ether
    })
  })

  describe('Win the jackpot', async function () {
    let withdrawJackpotCall
    before(async function () {
      for (let i = 0; i <= 100; i++) {
        await ethers.provider.send('evm_mine')
      }
    })

    it('should indicate that the game is over', async function () {
      expect(await kingOfTheHill.blocksBeforeWin()).to.equal(0)
    })

    it('should indicate the estimated new jackpot to follow (seed = 10%)', async function () {
      expect(await kingOfTheHill.jackpotToFollow()).to.equal(
        ONE_ETHER.mul(9).div(10)
      )
    })

    it('should earn 90% of the jackpot when calling the withdraw function', async function () {
      withdrawJackpotCall = await kingOfTheHill
        .connect(playerB)
        .withdrawJackpot()
      expect(withdrawJackpotCall).to.changeEtherBalance(
        playerB,
        ONE_ETHER.mul(9).sub(ONE_ETHER.mul(9).div(10))
      )
    })

    it('should decrease the player balance', async function () {
      expect(await kingOfTheHill.balanceOf(playerB.address)).to.equal(0)
    })

    it('should emit a JackpotWithdrew event', async function () {
      expect(withdrawJackpotCall)
        .to.emit(kingOfTheHill, 'JackpotWithdrew')
        .withArgs(
          playerB.address,
          ONE_ETHER.mul(9).sub(ONE_ETHER.mul(9).div(10))
        )
    })
  })
})
