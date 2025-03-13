declare global {
  interface Window {
    ethereum?: any;
  }
}

import { ethers } from "ethers";
import contractABI from "../contracts/artifacts/contractABI.json";

export const CONTRACT_ADDRESS =
  "0x111111F652df81846C84330E9B8E1F1d9151EE55";

export const contractInstance = async () => {
  const { ethereum } = window;
  if (ethereum) {
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    if (!provider) {
      console.log("Metamask is not installed, please install!");
    }
    const con = new ethers.Contract(
      CONTRACT_ADDRESS,
      contractABI,
      signer
    );
    // console.log(con);
    return con;
  } else {
    console.log("error");
  }
};
