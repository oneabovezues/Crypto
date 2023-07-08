import sha256 from 'crypto-js/sha256';
import * as EC from 'elliptic'

const ec = EC.ec
const Ec = new ec('secp256k1')

function hex2bin(hex: string) {
    hex = hex.replace("0x", "").toLowerCase();
    var out = "";
    for (var c of hex) {
        switch (c) {
            case '0': out += "0000"; break;
            case '1': out += "0001"; break;
            case '2': out += "0010"; break;
            case '3': out += "0011"; break;
            case '4': out += "0100"; break;
            case '5': out += "0101"; break;
            case '6': out += "0110"; break;
            case '7': out += "0111"; break;
            case '8': out += "1000"; break;
            case '9': out += "1001"; break;
            case 'a': out += "1010"; break;
            case 'b': out += "1011"; break;
            case 'c': out += "1100"; break;
            case 'd': out += "1101"; break;
            case 'e': out += "1110"; break;
            case 'f': out += "1111"; break;
            default: return "";
        }
    }

    return out;
}
export class transaction {
    public fromAddress: string
    public ToAdress: string
    public amount: number
    public signature: any = ''
    constructor(fromaddress: string, Toaddress: string, amount: number) {
        this.fromAddress = fromaddress
        this.ToAdress = Toaddress
        this.amount = amount
        this.signature = ''
    }

    calculateHash() {
        return sha256(this.fromAddress + this.ToAdress + this.amount).toString()

    }
    signHash(signingkey: EC.ec.KeyPair) {
        if (signingkey.getPublic('hex') !== this.fromAddress) {
            console.log('signing key invalid')
        }
        const sig = signingkey.sign(this.calculateHash(), 'base64')
        const x = sig.toDER('hex')
        this.signature = x
    }
    Validate() {
        if (this.fromAddress === 'null') return true
        if (!this.signature) return console.log('sign transaction')

        const publickey = Ec.keyFromPublic(this.fromAddress, 'hex')
        return publickey.verify(this.calculateHash(), this.signature)
    }


}

export class Block {
    public index: number
    public hash: string
    public previousHash: string
    public timestamp: number
    public transactions: transaction[]
    public nonce: number

    constructor(index: number, transactions: transaction[], previousHash: string, nonce: number) {
        this.index = index
        this.previousHash = previousHash

        this.transactions = transactions
        this.timestamp = new Date().getTime()
        this.nonce = nonce
        this.hash = this.calculateHash(this)
    }
    calculateHash(block: Block): string {
        const hash = sha256(block.index + block.transactions.toString() + block.previousHash + block.timestamp + this.nonce)
        return hash.toString()
    }



}


export class BlockChain {
    public chain: Block[]
    public pendingTransactions: transaction[] = []
    public dificulty: number = 2
    public reward: number = 200
    constructor() {
        this.chain = [this.createGenesis()]
    }
    createGenesis() {
        const Genesis = new Block(0, [], '0', 0)
        return Genesis
    }
    debug() {
        return this.chain
    }
    getLatestBlock() {
        return this.chain[this.chain.length - 1]
    }
    addNewBlock(RewardAdress: string) {

        const newblock = this.mineblock(this.pendingTransactions)
        this.chain.push(newblock)
        this.pendingTransactions = [new transaction('null', RewardAdress, this.reward)]
    }
    mineblock(BlockData: transaction[]) {
        let nonce = 0
        let hash = ''


        while (!this.matchDifficulty(this.dificulty, hash)) {
            nonce++
            hash = new Block(this.chain.length, BlockData, this.getLatestBlock().hash, nonce).hash
        }
        const newblock = new Block(this.chain.length, BlockData, this.getLatestBlock().hash, nonce)
        return newblock
    }
    addTransaction(transaction: transaction) {
        const sender = transaction.fromAddress
        if (sender === 'null') {
            return this.pendingTransactions.push(transaction)

        }
        if (this.getAddressAmount(sender) < transaction.amount) {
            return console.log('not enough balance')
        }
        this.pendingTransactions.push(transaction)
    }
    isvalid() {
        for (let i = 1; i < this.chain.length; i++) {
            const thisblock = this.chain[i]
            const prevblock = this.chain[i - 1]
            if (thisblock.index < prevblock.index) {
                console.log('index invalid')
                return false
            }
            if (thisblock.previousHash != prevblock.hash) {
                console.log('hash mismatch')
                return false
            }

            return true
        }

    }
    isTransactionsValid() {
        for (let i = 1; i < this.chain.length; i++) {
            for (let j = 0; i < this.chain[i].transactions.length; j++) {
                const trans = this.chain[i].transactions[j]
                if (!trans.Validate()) return false
            }
        }
        return true
    }
    matchDifficulty(difficulty: number, hash: string) {
        const binary = hex2bin(hash)
        const reqPrefix = '0'.repeat(difficulty)
        const matching = binary.startsWith(reqPrefix)

        return matching
    }
    getAddressAmount(Address: string) {
        let balance = 0
        for (let i = 1; i < this.chain.length; i++) {

            for (let j = 0; j < this.chain[i].transactions.length; j++) {
                const newtransaction = this.chain[i].transactions[j]

                if (newtransaction.ToAdress === Address) {
                    balance += newtransaction.amount
                }
                if (newtransaction.fromAddress === Address) {
                    balance -= newtransaction.amount
                }

            }

        }
        return balance
    }

}


export class Wallet {
    static wallets:Wallet[] = []
    public publickey: string = ''
    private privatekey: string = ''
    public name: string
    private password: string
    constructor(password: string, name: string) {
        this.password = sha256(password).toString()
        this.name = name
        this.SetKeys()
        Wallet.wallets.push(this)

    }
    SetKeys() {
        const key = Ec.genKeyPair()
        this.publickey = key.getPublic('hex')
        this.privatekey = key.getPrivate('hex')
    }
    GetPrivate(password: string) {
        if(!this.isPassValid(password)){
            console.log('invalidPass')
        }
       
        return this.privatekey
    }
    SendTransaction(chain:BlockChain,SendWallet:Wallet,password:string,amount:number){
        if(!this.isPassValid(password)){
            return console.log('invalid pass')
        }
        const SendAddress =  SendWallet.publickey
        const newtransaction = new transaction(this.publickey,SendAddress,amount)
        newtransaction.signHash(Ec.keyFromPrivate(this.privatekey))
        chain.addTransaction(newtransaction)
    }
    GetBalance(chain:BlockChain,password:string){
        if(!this.isPassValid){
            return console.log('invalid pass')
        }
        return chain.getAddressAmount(this.publickey)
    }
    isPassValid(password:string){
        const pass = sha256(password).toString()
        if (pass !== this.password) {
            return false
        }
        return true
    }
    static findWallet(name:String){
        for(let i =0;i<this.wallets.length;i++){
            if(this.wallets[i].name === name){
                return this.wallets[i]
            }
        }

    }

}



















