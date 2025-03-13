"use client";
import { contractInstance } from "@/contracts/instance";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import Image from "next/image";

export default function Home() {

  const handleClick = async () => {
    try {

      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.BrowserProvider(ethereum);
        if (!provider) {
          console.log("Metamask is not installed, please install!");
        }
        const con = await contractInstance();
        console.log("Hello");
        const contractConfig = {
          additionalAdmins: [],
          contractAdmin: "0xB351a70dD6E5282A8c84edCbCd5A955469b9b032",
          contractName: "Testing meeting 4",
          contractURI: "ipfs://bafkreifvk2zol6q5mvgysfwdcuvvm7aupaddqxxodrnvsuc3xh3kflk77m"
        }

        const premintConfig = {
          deleted: false,
          premintConfigVersion: "0xad7c5bef027816a800da1736444fb58a807ef4c9603b7848673f7e3a68eb14a5",
          tokenConfig: "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000b351a70dd6e5282a8c84edcbcd5a955469b9b032000000000000000000000000227d5294b13ebc893e31494194532727a130ed4b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042697066733a2f2f6261666b726569686a787574787136347672643679616e6b6f6467376e61353377736c71786834686c727865756b766f6275723770733365366465000000000000000000000000000000000000000000000000000000000000",
          uid: 1,
          version: 2
        }
        const signature = ""

        const mintData = {
          mintComment: "Comment",
          mintRecipient: "0xB351a70dD6E5282A8c84edCbCd5A955469b9b032",
          mintRewardsRecipients: [],
        }

        const tx = await con?.premint(contractConfig, "0x0000000000000000000000000000000000000000", premintConfig, signature, BigInt(1), mintData, "0xB351a70dD6E5282A8c84edCbCd5A955469b9b032", "0xB351a70dD6E5282A8c84edCbCd5A955469b9b032");

        console.log(tx);
        await tx.wait();
      }
    } catch (e) {
      console.log("Error in creating user account: ", e);
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
