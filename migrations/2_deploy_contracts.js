var IPManager=artifacts.require ("./IPManager.sol");
var Groth16Verifier=artifacts.require ("./Groth16Verifier.sol");

module.exports = function(deployer) {
      deployer.deploy(IPManager);
      //deployer.deploy(Groth16Verifier);
}