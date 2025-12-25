import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedTrustlessSwap = await deploy("TrustlessSwap", {
    from: deployer,
    log: true,
  });

  console.log(`TrustlessSwap contract: `, deployedTrustlessSwap.address);
};
export default func;
func.id = "deploy_trustless_swap"; // id required to prevent reexecution
func.tags = ["TrustlessSwap"];
