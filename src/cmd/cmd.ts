import { Error } from "./error"
import { InfoLog, AlarmLog } from "./info"
import { Delay, GetActualTime, PreviousCall } from "../constant/helpers";
import { CalculateCallPeriod } from "../math"
import TonWeb from "tonweb";
import { mnemonicToKeyPair, KeyPair } from 'tonweb-mnemonic'
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { GetCellForCall } from "../constant";
const Cell = TonWeb.boc.Cell;

async function InitWallet(mnemonic: string, client: TonWeb): Promise<[any, KeyPair]> {
        let seed = String(mnemonic)
        let arr = seed.split(' ');
        const keyPair = await mnemonicToKeyPair(arr);
        const WalletClass = client.wallet.all["v3R2"];
        const wallet = new WalletClass(client.provider, {
                publicKey: keyPair.publicKey,
                wc: 0
        });
        return [wallet, keyPair]
}

async function InitClient(network: string): Promise<TonWeb> {
        let endpoint: string;
        switch (network) {
                case 'testnet':
                        endpoint = await getHttpEndpoint({
                                network: 'testnet',
                        });
                        break;
                case 'mainnet':
                        endpoint = await getHttpEndpoint({});
                        break;
        
                default:
                        endpoint = await getHttpEndpoint({
                                network: 'testnet',
                        });
                        break;
        }
        const client = new TonWeb(new TonWeb.HttpProvider(endpoint))
        return client
}

export async function CmdStart(mnemonic: string, network: string, oracle: string) {
        let previousCallPeriod = 0;
        let previousCall = <PreviousCall>{};
        let lastBlock: number = 0;
        let alarm: boolean = false;

        try {
                let client = await InitClient(network)
                let [wallet, keyPair] = await InitWallet(mnemonic, client)
                const walletAddress = await wallet.getAddress();
                const address = walletAddress.toString(true, true, true);
                InfoLog(`using wallet=${address}`)
                InfoLog(`using net=${network}`)

                while(1){
                        let [need_vote, diff] = await CalculateCallPeriod(oracle, client)
                        if (!need_vote && Object.keys(previousCall).length !== 0) {
                                previousCall = <PreviousCall>{};
                                alarm = false;
                        }
                        if(need_vote && diff > 95 && !alarm) {
                                InfoLog(`broadcasting alarm warden=${address}`)
                                previousCall = <PreviousCall>{};
                                alarm = true;
                        }
                        if(need_vote && diff > 150) {
                                AlarmLog(`broadcasting alarm warden=${address}`)
                                previousCall = <PreviousCall>{};
                                alarm = true;
                        }
                        InfoLog(`got new chain height: need_call=${need_vote}: diff=${diff}`)

                        if (need_vote && Object.keys(previousCall).length === 0) {
                                let msg = new Cell();
                                msg.bits.writeUint(220, 32)
                                msg.bits.writeUint(0, 64)
                                const seqno = (await wallet.methods.seqno().call()) || 0;
                                const result = await wallet.methods.transfer({
                                        secretKey: keyPair.secretKey,
                                        toAddress: oracle,
                                        amount: TonWeb.utils.toNano("0.012"),
                                        seqno: seqno,
                                        payload: msg,
                                        sendMode: 3
                                }).send()

                                InfoLog(`broadcasting call warden=${address}`)

                                previousCall = <PreviousCall>{
                                        Time: GetActualTime()
                                };
                                previousCallPeriod = GetActualTime()
                        }
                }
        } catch (error) {
                Error("get error", String(error))
                CmdStart(mnemonic, network, oracle)
        }
}