import Head from "next/head";
import styles from "@/styles/Home.module.css";
import { useState } from "react";
import {
  ParticleAuthModule,
  ParticleProvider,
} from "@biconomy-devx/particle-auth";
import { IBundler, Bundler } from "@biconomy-devx/bundler";
import {
  BiconomySmartAccountV2,
  DEFAULT_ENTRYPOINT_ADDRESS,
} from "@biconomy-devx/account";
import {
  ECDSAOwnershipValidationModule,
  DEFAULT_ECDSA_OWNERSHIP_MODULE,
} from "@biconomy-devx/modules";
import { ethers } from "ethers";
import { ChainId } from "@biconomy-devx/core-types";
import { IPaymaster, BiconomyPaymaster } from "@biconomy-devx/paymaster";
import CreateSession from "@/components/CreateSession";

require("dotenv").config();

export default function Home() {
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [smartAccount, setSmartAccount] =
    useState<BiconomySmartAccountV2 | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Provider | null>(
    null
  );

  const bundler: IBundler = new Bundler({
    //https://dashboard.biconomy.io/
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL || "",
    chainId: ChainId.POLYGON_MUMBAI,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
  });

  const paymaster: IPaymaster = new BiconomyPaymaster({
    //https://dashboard.biconomy.io/
    paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_URL || "",
  });

  const particle = new ParticleAuthModule.ParticleNetwork({
    //Use your own project ID
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
    //Use your own clientKey
    clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY || "",
    //Use your own appId
    appId: process.env.NEXT_PUBLIC_APP_ID || "",
    wallet: {
      displayWalletEntry: true,
      defaultWalletEntryPosition: ParticleAuthModule.WalletEntryPosition.BR,
    },
  });

  const connect = async () => {
    // @ts-ignore
    try {
      const userInfo = await particle.auth.login();
      console.log("Logged in user:", userInfo);
      setLoading(true);
      const particleProvider = new ParticleProvider(particle.auth);
      const web3Provider = new ethers.providers.Web3Provider(
        particleProvider,
        "any"
      );
      const signer = web3Provider.getSigner();
      const ownerShipModule = await ECDSAOwnershipValidationModule.create({
        signer: signer as any,
        moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE,
      });
      setProvider(web3Provider);
      let biconomySmartAccount = await BiconomySmartAccountV2.create({
        chainId: ChainId.POLYGON_MUMBAI,
        bundler: bundler,
        paymaster: paymaster,
        entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
        defaultValidationModule: ownerShipModule,
        activeValidationModule: ownerShipModule,
      });
      setAddress(await biconomySmartAccount.getAccountAddress());
      setSmartAccount(biconomySmartAccount);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  console.log(provider);

  return (
    <>
      <Head>
        <title>Session Keys</title>
        <meta
          name="description"
          content="Build a dApp powered by session keys"
        />
      </Head>
      <main className={styles.main}>
        <h1>Session Keys Demo</h1>
        <h2>
          Connect and transfer ERC20 tokens without signing on each transfer
        </h2>
        {!loading && !address && (
          <button onClick={connect} className={styles.connect}>
            Connect to Web3
          </button>
        )}
        {loading && <p>Loading Smart Account...</p>}
        {address && <h2>Smart Account: {address}</h2>}
        {smartAccount && provider && (
          <CreateSession
            smartAccount={smartAccount}
            address={address}
            provider={provider}
          />
        )}
      </main>
    </>
  );
}
