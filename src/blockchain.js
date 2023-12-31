/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);

        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        let self= this;
        return new Promise((resolve, reject) => {
            //console.log(self.height);
            resolve(self.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't forget 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    async _addBlock(block) {  
    
        try {
            let currentChainHeight = this.height;
            
            let newChainHeight = currentChainHeight + 1;
     
            
            block.height = newChainHeight;
            this.height = newChainHeight;
            block.time = new Date().getTime().toString().slice(0,-3);
         

            
            if(newChainHeight > 0){   // If it is not the Genesis block
                let previousBlock = await this.getBlockByHeight(currentChainHeight);
                block.previousBlockHash = previousBlock.hash;
        
            }
            else{
                block.previousBlockHash = null;
            }
            block.hash = SHA256(JSON.stringify(block)).toString();
            this.chain.push(block);
            let errorLog = await this.validateChain();
       
            if(errorLog.length > 0){
                this.chain.pop();
                this.height = this.height - 1 ;
            }
            //console.log(block);
            return(block);
        } 
        catch  {
            return("Invalid block");
        }
        
     
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            resolve(`${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Verify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message    // message = "WALLET_ADDRESS:timeStamp:starRegistry"
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            //walletAddress = 
            let timeStamp = parseInt(message.split(':')[1]);
            let currentTime =  new Date().getTime().toString().slice(0,-3);
            if (currentTime - timeStamp <= 5 * 60){
                try{
                    let verification = bitcoinMessage.verify(message, address, signature);
                }
                catch{
                    reject(Error("Validation Error"));
                }
                let newBlock = new BlockClass.Block({ walletAddress: address, message: message, signature: signature, star: star })
                resolve(self._addBlock(newBlock))
            
            }
            else{
                reject(Error("Time expired (5 min)"));
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
           let block = self.chain.filter(p => p.hash === hash);
           if(block){
            resolve(block);
           }
           else{
            resolve(null);
           }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            let chain = self.chain;
            chain.forEach(async block =>{
                let body = await block.getBData();
                if(body.walletAddress == address){
                    stars.push(body.star);
                }   
            })
            resolve(stars);
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise((resolve, reject) => {
            self.chain.forEach(async block => {
                if(await block.validate()){
                    //console.log(block.previousBlockHash, await self.getBlockByHeight(block.height - 1))
                    if(block.height > 0 && block.previousBlockHash != await self.getBlockByHeight(block.height - 1).hash){
                        errorLog.push({Error: `For Block ${block.height}, the PreviousBlock hash is invalid`});
                    }
                }
                else{
                    errorLog.push({Error: `Block ${block.height} is invalid`});
                }

            })
            resolve(errorLog);

        });
    }

}

module.exports.Blockchain = Blockchain;   

// message: tb1q6g4f8nhvsxskyz0ug8dcz7ger6c4chep5tvcmr:${new Date().getTime().toString().slice(0,-3)}:starRegistry
/* async function test(){
    let x = new Blockchain();
    await x.submitStar("miABqhtwMc8krfKT22zwKoq9WGorXzSWPW","miABqhtwMc8krfKT22zwKoq9WGorXzSWPW:1691239150:starRegistry","IE7IR7aFJ14zXN5UDh14sevRWCNJYrms3g61nLo4T6lATXeS1IlF7CtzZQ+B+E6yfCI4T8Z6RPE9mhZhgVbOL/Y="
    ,{
        "dec": "68° 52' 56.9",
        "ra": "16h 29m 1.0s",
        "story": "Testing the story 4"
	})
    console.log(x)
    //console.log(`tb1q6g4f8nhvsxskyz0ug8dcz7ger6c4chep5tvcmr:${new Date().getTime().toString().slice(0,-3)}:starRegistry`)
}
test(); 
 */

// private key : cTeFSbaHJ4DccndqbiX7BJqiYKRd1kSG7Xhf4F96Fqnd52XAYRAt //NOT USED

// wallet address : miABqhtwMc8krfKT22zwKoq9WGorXzSWPW
// message: miABqhtwMc8krfKT22zwKoq9WGorXzSWPW:1691239150:starRegistry
// signature : IE7IR7aFJ14zXN5UDh14sevRWCNJYrms3g61nLo4T6lATXeS1IlF7CtzZQ+B+E6yfCI4T8Z6RPE9mhZhgVbOL/Y=
//bitcoinMessage.verify("miABqhtwMc8krfKT22zwKoq9WGorXzSWPW:1691239150:starRegistry","miABqhtwMc8krfKT22zwKoq9WGorXzSWPW","IE7IR7aFJ14zXN5UDh14sevRWCNJYrms3g61nLo4T6lATXeS1IlF7CtzZQ+B+E6yfCI4T8Z6RPE9mhZhgVbOL/Y=")
