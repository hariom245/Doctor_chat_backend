const mongoose =require('mongoose');
const Schema=mongoose.Schema;

const MessageSchema=new Schema({
  conversationId:{
    type:String
  },
  message:{
    type:String
  },
  senderId:{
    type:String
  },
})
module.exports=mongoose.model('message',MessageSchema)
