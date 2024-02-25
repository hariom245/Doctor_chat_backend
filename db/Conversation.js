const mongoose =require('mongoose');
const Schema=mongoose.Schema;

const ConversationSchema=new Schema({
 members:{
    type:Array,
    required:true
 }
})
module.exports=mongoose.model('conversation',ConversationSchema)
