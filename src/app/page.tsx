"use client";
import { generatePremintParams } from "@/components/premintUtils";
import { contractInstance } from "@/contracts/instance";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";

export default function Home() {

  const handleClick = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        console.log("Metamask is not installed, please install!");
        return;
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const con = await contractInstance();

      // Generate premint parameters dynamically
      const privateKey = process.env.NEXT_PUBLIC_CREATOR_PRIVATE_KEY as string;
      const { contractConfig, encodedConfig, signature } = await generatePremintParams(provider, privateKey);

      // Prepare arguments for premint
      const args = [
        {
          additionalAdmins: contractConfig.additionalAdmins,
          contractAdmin: contractConfig.contractAdmin,
          contractName: contractConfig.contractName,
          contractURI: contractConfig.contractURI,
        },
        "0x0000000000000000000000000000000000000000",
        {
          deleted: encodedConfig.deleted,
          uid: encodedConfig.uid,
          version: encodedConfig.version,
          premintConfigVersion: encodedConfig.premintConfigVersion,
          tokenConfig: encodedConfig.tokenConfig,
        },
        signature,
        BigInt(1),
        {
          mintComment: "blah",
          mintRecipient: "0xB351a70dD6E5282A8c84edCbCd5A955469b9b032",
          mintRewardsRecipients: [],
        },
        "0xB351a70dD6E5282A8c84edCbCd5A955469b9b032",
        "0x0000000000000000000000000000000000000000",
      ];

      console.log("Premint arguments:", args);

      // Call premint
      const tx = await con?.premint(...args, {
        value: ethers.parseUnits("0.000777", "ether"),
      });

      await tx.wait();
      console.log("Transaction successful:", tx);
    } catch (e) {
      console.error("Error in creating user account:", e);
    }
  };

  return (
    <>
      <div><ConnectButton /></div>
      <div className="h-screen flex flex-col justify-center items-center">
        <button className="cursor-pointer border rounded-full px-3 py-2 bg-gray-700" onClick={handleClick}>Click Me</button>
      </div>
    </>
  );
}
