import { BigInt } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  PoolCreated
} from "../generated/LlamaLendFactory/LlamaLendFactory"
import {
  LoanCreated,
  Transfer,
  LlamaLend as LlamaLendToCall,
  LiquidatorAdded,
  LiquidatorRemoved
} from "../generated/templates/LlamaLend/LlamaLend"
import { LlamaLendContract, LlamaLendFactory, Loan, User, Liquidator } from "../generated/schema"
import {LlamaLend} from "../generated/templates"
import { store } from '@graphprotocol/graph-ts'

export function handlePoolCreated(event: PoolCreated): void {
  const factoryAddress = event.address;
  const nftContract = event.params.nftContract;
  const poolAddress = event.params.pool;
  const block = event.block.number;
  const timestamp = event.block.timestamp;

  // Load Factory
  let factory = LlamaLendFactory.load(factoryAddress.toHexString());

  // Create new Factory entity with info if null
  if (factory === null) {
    factory = new LlamaLendFactory(factoryAddress.toHexString());
    factory.address = factoryAddress;
    factory.createdTimestamp = timestamp;
    factory.createdBlock = block;
  }

  // Create new contract entity and fill with info
  let contract = new LlamaLendContract(poolAddress.toHexString());
  contract.address = poolAddress;
  contract.factory = factory.id;
  contract.nftContract = nftContract;
  contract.owner = event.params.owner;
  contract.createdTimestamp = timestamp;
  contract.createdBlock = block;

  let contractToCall = LlamaLendToCall.bind(poolAddress)
  let callResult = contractToCall.maxLoanLength()
  contract.maxLoanLength = callResult;

  // Start tracking the llamapay contract
  LlamaLend.create(poolAddress);

  //Savooooor
  factory.save();
  contract.save();
}
export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let pool = LlamaLendContract.load(event.address.toHexString());
  if(pool !== null){
    pool.owner = event.params.newOwner;
    pool.save();
  }
}

export function handleTransfer(event: Transfer): void {
  let loanId = event.params.tokenId;
  const block = event.block.number;
  const timestamp = event.block.timestamp;
  const newOwner = event.params.to;

  const loan = Loan.load(loanId.toHexString());

  let user = User.load(newOwner.toHexString());
  // If User doesn't exist, then create a new User entity
  if (user === null) {
      user = new User(newOwner.toHexString());
      user.address = newOwner;
      user.createdTimestamp = timestamp;
      user.createdBlock = block;
  }
  if(loan!.owner === null){
    loan!.originalOwner = user.address;
  }
  loan!.owner = user.id;
  // Save and return
  user.save();
  loan!.save();
}

export function handleLoanCreated(event: LoanCreated): void {
  const poolAddress = event.address;
  const loanId = event.params.loanId;
  const nft = event.params.nft;
  const interest = event.params.interest;
  const startTime = event.params.startTime;
  const borrowed = event.params.borrowed;
  const block = event.block.number;
  let pool = LlamaLendContract.load(poolAddress.toHexString());

  let loan = new Loan(loanId.toHexString());
  loan.loanId = loanId;
  loan.nftId = nft;
  loan.interest = interest;
  loan.borrowed = borrowed;
  loan.startTime = startTime;
  loan.createdBlock = block;
  loan.deadline = startTime.plus(pool!.maxLoanLength);
  loan.tokenUri = `https://nft.llamalend.com/nft/5/${pool!.address.toHexString().toLowerCase()}/${pool!.nftContract.toHexString().toLowerCase()}/${loanId.toString()}`;
  loan.pool = pool!.id;

  loan.save();
}

export function handleLiquidatorAdded(event: LiquidatorAdded): void {
  let pool = event.address
  let liqAddress = event.params.liquidator
  let id = `${pool}-${liqAddress}`
  let liquidator = Liquidator.load(id)
  if(liquidator !== null){
    liquidator.address = liqAddress
    liquidator.pool = LlamaLendContract.load(pool.toHexString())!.id;
    liquidator.save();
  }
}

export function handleLiquidatorRemoved(event: LiquidatorRemoved): void {
  let pool = event.address
  let id = `${pool}-${event.params.liquidator}`
  let liquidator = Liquidator.load(id)
  if(liquidator !== null){
    store.remove('Liquidator', id)
  }
}