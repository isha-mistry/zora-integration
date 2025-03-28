import { ethers } from "ethers";

// Constants
const CONTRACT_ADDRESS = "0x111111F652df81846C84330E9B8E1F1d9151EE55"; // PremintExecutor address
const FACTORY_ADDRESS = "0x1111111D7f785BE18b7549bA73198779dbcD10a4"; // ZoraCreator1155FactoryImpl
const CREATOR_ADDRESS = "0xB351a70dD6E5282A8c84edCbCd5A955469b9b032";
const CHAIN_ID = 421614; // "arbitrum sepolia"

interface TokenCreationConfigV2 {
    tokenURI: string;
    maxSupply: bigint;
    maxTokensPerAddress: number;
    pricePerToken: number;
    mintStart: number;
    mintDuration: number;
    royaltyBPS: number;
    payoutRecipient: string;
    fixedPriceMinter: string;
    createReferral: string;
}

interface PremintConfigV2 {
    tokenConfig: TokenCreationConfigV2;
    uid: number;
    version: number;
    deleted: boolean;
}

interface ContractWithAdditionalAdminsCreationConfig {
    contractAdmin: string;
    contractURI: string;
    contractName: string;
    additionalAdmins: string[];
}

interface PremintConfigEncoded {
    uid: number;
    version: number;
    deleted: boolean;
    tokenConfig: string; // ABI-encoded bytes
    premintConfigVersion: string;
}

// Fetch the fixed price minter from the factory contract
async function getFixedPriceMinter(provider: ethers.BrowserProvider): Promise<string> {
    const factoryAbi = ["function defaultMinters() view returns (address[])"];
    const factoryContract = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);
    const minters = await factoryContract.defaultMinters();
    return minters[0]; // First minter is used in your script
}

// Create the default TokenCreationConfigV2
function makeDefaultTokenCreationConfigV2(fixedPriceMinter: string, creator: string): TokenCreationConfigV2 {
    return {
        tokenURI: "blah.token",
        maxSupply: ethers.toBigInt("18446744073709551615"), // Max uint256
        maxTokensPerAddress: 0,
        pricePerToken: 0, // Free mint in your script
        mintStart: 0,
        mintDuration: 0,
        royaltyBPS: 0,
        payoutRecipient: creator,
        fixedPriceMinter,
        createReferral: ethers.ZeroAddress,
    };
}

// Create the default PremintConfigV2
async function makeDefaultPremintConfigV2(provider: ethers.BrowserProvider, creator: string): Promise<PremintConfigV2> {
    const fixedPriceMinter = await getFixedPriceMinter(provider);
    return {
        tokenConfig: makeDefaultTokenCreationConfigV2(fixedPriceMinter, creator),
        uid: 1, // Same as script
        version: 0,
        deleted: false,
    };
}

// Hash the TokenCreationConfigV2
function hashToken(tokenConfig: TokenCreationConfigV2): string {
    const TOKEN_DOMAIN_V2 = ethers.keccak256(
        ethers.toUtf8Bytes(
            "TokenCreationConfig(string tokenURI,uint256 maxSupply,uint64 maxTokensPerAddress,uint96 pricePerToken,uint64 mintStart,uint64 mintDuration,uint32 royaltyBPS,address payoutRecipient,address fixedPriceMinter,address createReferral)"
        )
    );

    return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "bytes32", "uint256", "uint64", "uint96", "uint64", "uint64", "uint32", "address", "address", "address"],
            [
                TOKEN_DOMAIN_V2,
                ethers.keccak256(ethers.toUtf8Bytes(tokenConfig.tokenURI)),
                tokenConfig.maxSupply,
                tokenConfig.maxTokensPerAddress,
                tokenConfig.pricePerToken,
                tokenConfig.mintStart,
                tokenConfig.mintDuration,
                tokenConfig.royaltyBPS,
                tokenConfig.payoutRecipient,
                tokenConfig.fixedPriceMinter,
                tokenConfig.createReferral
            ]
        )
    );
}

// Hash the PremintConfigV2
function hashPremint(premintConfig: PremintConfigV2): string {
    const ATTRIBUTION_DOMAIN_V2 = ethers.keccak256(
        ethers.toUtf8Bytes(
            "CreatorAttribution(TokenCreationConfig tokenConfig,uint32 uid,uint32 version,bool deleted)TokenCreationConfig(string tokenURI,uint256 maxSupply,uint64 maxTokensPerAddress,uint96 pricePerToken,uint64 mintStart,uint64 mintDuration,uint32 royaltyBPS,address payoutRecipient,address fixedPriceMinter,address createReferral)"
        )
    );

    return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "bytes32", "uint32", "uint32", "bool"],
            [
                ATTRIBUTION_DOMAIN_V2,
                hashToken(premintConfig.tokenConfig),
                premintConfig.uid,
                premintConfig.version,
                premintConfig.deleted,
            ]
        )
    );
}

// Generate the EIP-712 typed data hash
function premintHashedTypeDataV4(structHash: string, contractAddress: string, chainId: number): string {
    const HASHED_NAME = ethers.keccak256(ethers.toUtf8Bytes("Preminter"));
    const HASHED_VERSION_2 = ethers.keccak256(ethers.toUtf8Bytes("2"));

    const domainSeparator = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "bytes32", "bytes32", "uint256", "address"],
            [
                ethers.keccak256(
                    ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
                ),
                HASHED_NAME,
                HASHED_VERSION_2,
                chainId,
                contractAddress,
            ]
        )
    );

    return ethers.keccak256(
        ethers.concat([ethers.toUtf8Bytes("\x19\x01"), domainSeparator, structHash])
    );
}

// Sign the premint digest
async function signPremint(
    contractAddress: string,
    premintConfig: PremintConfigV2,
    privateKey: string,
    chainId: number
): Promise<string> {
    let structHash = hashPremint(premintConfig);

    let digest = premintHashedTypeDataV4(structHash, contractAddress, chainId);

    const wallet = new ethers.Wallet(privateKey);
    const signingKey = wallet.signingKey;
    const signature = signingKey.sign(ethers.getBytes(digest));

    // Split the signature into r, s, v
    const sig = ethers.Signature.from(signature);
    console.log("sig", sig);

    // Ensure v is 27 or 28 (Solidity's vm.sign format)
    const v = sig.v < 27 ? sig.v + 27 : sig.v;
    console.log("v", v);

    // Reconstruct the signature
    return ethers.concat([sig.r, sig.s, ethers.toBeHex(v, 1)]);
}

// Encode the PremintConfigV2
function encodePremint(premintConfig: PremintConfigV2): PremintConfigEncoded {
    const HASHED_VERSION_2 = ethers.keccak256(ethers.toUtf8Bytes("2"));
    const tokenConfigEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
        [
            "tuple(string tokenURI, uint256 maxSupply, uint64 maxTokensPerAddress, uint96 pricePerToken, uint64 mintStart, uint64 mintDuration, uint32 royaltyBPS, address payoutRecipient, address fixedPriceMinter, address createReferral)",
        ],
        [[
            premintConfig.tokenConfig.tokenURI,
            premintConfig.tokenConfig.maxSupply,
            premintConfig.tokenConfig.maxTokensPerAddress,
            premintConfig.tokenConfig.pricePerToken,
            premintConfig.tokenConfig.mintStart,
            premintConfig.tokenConfig.mintDuration,
            premintConfig.tokenConfig.royaltyBPS,
            premintConfig.tokenConfig.payoutRecipient,
            premintConfig.tokenConfig.fixedPriceMinter,
            premintConfig.tokenConfig.createReferral,
        ]]
    );

    return {
        uid: premintConfig.uid,
        version: premintConfig.version,
        deleted: premintConfig.deleted,
        tokenConfig: tokenConfigEncoded,
        premintConfigVersion: HASHED_VERSION_2,
    };
}

// Main function to generate premint parameters
export async function generatePremintParams(provider: ethers.BrowserProvider, privateKey: string) {
    // Contract config
    const contractConfig: ContractWithAdditionalAdminsCreationConfig = {
        contractAdmin: CREATOR_ADDRESS,
        contractURI: "ipfs://bafkreidl7wgtpqwfg6klcfqytwok4e4ns7mct7aducduvkwza3c7jcqxgu",
        contractName: "testing zora 4",
        additionalAdmins: [],
    };

    // Premint config
    const premintConfig = await makeDefaultPremintConfigV2(provider, CREATOR_ADDRESS);
    console.log("premintConfig", premintConfig);

    // Get contract address
    const premintExecutorAbi = [
        "function getContractWithAdditionalAdminsAddress(tuple(address contractAdmin, string contractURI, string contractName, address[] additionalAdmins)) view returns (address)",
    ];
    const premintExecutorContract = new ethers.Contract(CONTRACT_ADDRESS, premintExecutorAbi, provider);
    const contractAddress = await premintExecutorContract.getContractWithAdditionalAdminsAddress([
        contractConfig.contractAdmin,
        contractConfig.contractURI,
        contractConfig.contractName,
        contractConfig.additionalAdmins,
    ]);

    // Generate signature
    const signature = await signPremint(contractAddress, premintConfig, privateKey, CHAIN_ID);

    // Encode premint config
    const encodedConfig = encodePremint(premintConfig);

    return { contractConfig, encodedConfig, signature };
}
