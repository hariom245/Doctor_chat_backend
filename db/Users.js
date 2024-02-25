const mongoose =require('mongoose');
const Schema=mongoose.Schema;

const UserSchema=new Schema({
  fullname:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true,
    unique:true
  },
  password:{
    type:String,
    required:true
  },
  token:{
    type:String
  }
})
module.exports=mongoose.model('user',UserSchema)
