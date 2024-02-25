const mongoose=require('mongoose');
const url="mongodb+srv://kb00664422:c7ftZoq7nTSPgw4f@cluster0.pgimxcr.mongodb.net/";
const connectMongo=async()=>{
    try {
     await mongoose.connect(url)
     console.log("connected to mongo");
     
    } catch (error) {
     console.log(error)
    }
 }
 module.exports=connectMongo;