import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the TrustlessSwap address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const deployed = await deployments.get("TrustlessSwap");

  console.log("TrustlessSwap address is " + deployed.address);
});

task("task:balance", "Decrypt the encrypted USDT balance")
  .addOptionalParam("user", "User address to inspect")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployed = await deployments.get("TrustlessSwap");
    const signers = await ethers.getSigners();
    const user = (taskArguments.user as string) || signers[0].address;

    const swap = await ethers.getContractAt("TrustlessSwap", deployed.address);
    const encrypted = await swap.getEncryptedBalance(user);

    if (encrypted === ethers.ZeroHash) {
      console.log(`Encrypted balance for ${user}: ${encrypted}`);
      console.log("Clear balance           : 0");
      return;
    }

    const clearBalance = await fhevm.userDecryptEuint(FhevmType.euint64, encrypted, deployed.address, signers[0]);
    console.log(`Encrypted balance for ${user}: ${encrypted}`);
    console.log(`Clear balance           : ${clearBalance} (6 decimals)`);
  });

task("task:swap-eth", "Swap ETH for encrypted USDT")
  .addParam("eth", "ETH amount to swap (in ETH units)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers } = hre;
    const deployed = await deployments.get("TrustlessSwap");
    const swap = await ethers.getContractAt("TrustlessSwap", deployed.address);
    const [signer] = await ethers.getSigners();

    const weiValue = ethers.parseEther(taskArguments.eth);
    const tx = await swap.connect(signer).swapEthForUsdt({ value: weiValue });
    console.log(`Sent swapEthForUsdt with ${taskArguments.eth} ETH -> tx ${tx.hash}`);
    await tx.wait();
    console.log("Swap confirmed");
  });

task("task:swap-usdt", "Swap USDT back to ETH")
  .addParam("usdt", "USDT amount to burn (6 decimals precision)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers } = hre;
    const deployed = await deployments.get("TrustlessSwap");
    const swap = await ethers.getContractAt("TrustlessSwap", deployed.address);
    const [signer] = await ethers.getSigners();

    const usdtAmount = ethers.parseUnits(taskArguments.usdt, 6);
    if (usdtAmount > BigInt("18446744073709551615")) {
      throw new Error("USDT amount exceeds uint64");
    }

    const tx = await swap.connect(signer).swapUsdtForEth(usdtAmount);
    console.log(`Sent swapUsdtForEth with ${taskArguments.usdt} USDT -> tx ${tx.hash}`);
    await tx.wait();
    console.log("Redeem confirmed");
  });
