import express from "express";


const app:express.Application = express()

import {Block,BlockChain,Wallet,transaction} from './main'

const port = process.env.port || 3000
const chain = new BlockChain()

app.get('/chain',(req,res)=>{
    
    res.send(req)
})

app.get('chain/block/:id',(req,res)=>{
    
    res.send(chain.chain[parseInt(req.params.id)])
    
})
app.get('chain/block/:id/transaction/:id')

app.post('/Getbalance',express.json(),(req,res)=>{
    type body = {
        name:string
        password:string
    }
    const {name,password}:body = req.body
    const wall = Wallet.findWallet(name)
    const balance = wall?.GetBalance(chain,password)
    console.log(balance)
    res.send(balance?.toString())
    
    
})
app.post('/newTransaction',express.json(),(req,res)=>{

})
app.listen(port,()=>{
    console.log('port up')
})



