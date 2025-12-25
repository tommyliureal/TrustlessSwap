import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { TrustlessSwap, TrustlessSwap__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  user: HardhatEthersSigner;
};

const RATE = 3000n;
const USDT_DECIMALS = 1_000_000n;
const WEI_PER_ETH = 1_000_000_000_000_000_000n;

async function deployFixture() {
  const factory = (await ethers.getContractFactory("TrustlessSwap")) as TrustlessSwap__factory;
  const contract = (await factory.deploy()) as TrustlessSwap;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

function convertWeiToUsdt(weiAmount: bigint): bigint {
  return (weiAmount * RATE * USDT_DECIMALS) / WEI_PER_ETH;
}

function convertUsdtToWei(usdtAmount: bigint): bigint {
  return (usdtAmount * WEI_PER_ETH) / (RATE * USDT_DECIMALS);
}

describe("TrustlessSwap", function () {
  let signers: Signers;
  let contract: TrustlessSwap;
  let contractAddress: string;

  before(async function () {
    const availableSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: availableSigners[0], user: availableSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This test suite only runs against the local FHEVM mock");
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("starts with an empty encrypted balance", async function () {
    const encrypted = await contract.getEncryptedBalance(signers.user.address);
    expect(encrypted).to.eq(ethers.ZeroHash);
  });

  it("mints encrypted USDT when swapping ETH in", async function () {
    const ethToSwap = ethers.parseEther("1");
    const expectedUsdt = convertWeiToUsdt(ethToSwap);

    const tx = await contract.connect(signers.user).swapEthForUsdt({ value: ethToSwap });
    await tx.wait();

    const encrypted = await contract.getEncryptedBalance(signers.user.address);
    const clear = BigInt(
      await fhevm.userDecryptEuint(FhevmType.euint64, encrypted, contractAddress, signers.user),
    );

    expect(clear).to.eq(expectedUsdt);
  });

  it("redeems USDT for ETH and updates the encrypted balance", async function () {
    const ethToSwap = ethers.parseEther("1");
    const usdtMinted = convertWeiToUsdt(ethToSwap);

    const depositTx = await contract.connect(signers.user).swapEthForUsdt({ value: ethToSwap });
    await depositTx.wait();

    const usdtToBurn = 1_500n * USDT_DECIMALS; // 1500 USDT
    const expectedWeiOut = convertUsdtToWei(usdtToBurn);

    const balanceBefore = BigInt(await ethers.provider.getBalance(signers.user.address));
    const tx = await contract.connect(signers.user).swapUsdtForEth(usdtToBurn);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Missing receipt");
    }

    const gasPrice = receipt.effectiveGasPrice ?? tx.gasPrice ?? 0n;
    const gasCost = BigInt(receipt.gasUsed) * BigInt(gasPrice);
    const balanceAfter = BigInt(await ethers.provider.getBalance(signers.user.address));

    expect(balanceAfter + gasCost - balanceBefore).to.eq(expectedWeiOut);

    const encrypted = await contract.getEncryptedBalance(signers.user.address);
    const clear = BigInt(
      await fhevm.userDecryptEuint(FhevmType.euint64, encrypted, contractAddress, signers.user),
    );

    expect(clear).to.eq(usdtMinted - usdtToBurn);
  });
});
