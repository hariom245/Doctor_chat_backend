const express = require('express');
const router = express.Router();
const User = require("../db/Users");
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken')
const JWT_SECRET = "hellobrother";
const fetchuser = require("../Middleware/fetchuser");
const Conversations=require("../db/Conversation");
const Messages=require("../db/Message");
const io=require('socket.io')(8000,{
    cors:{
        origin:'http://localhost:3000'
    }
})

// soclet io
let users=[];
io.on('connection',socket=>{
    console.log('user connectes',socket.id)
    socket.on('addUser',userId=>{
        const isUseExist=users.find((user)=>user.userId===userId);
        if(!isUseExist){
            const user={userId,socketId:socket.id}
            users.push(user)
            io.emit('getUser',users);
        }
    })

    socket.on('sendMessage',async({conversationId,senderId,message,recieverId})=>{
      const reciever=users.find(user=>user.userId===recieverId)
      const sender=users.find(user=>user.userId===senderId)
      const user=await User.findById(senderId)
      if(reciever){
        io.to(reciever.socketId).to(sender.socketId).emit('getMessage',{
            conversationId,
            senderId,
            message,
            recieverId,
            user:{
                id:user.id,email:user.email,fullname:user.fullname
            }
          })
    }
     else{
        io.to(sender.socketId).emit('getMessage',{
            conversationId,
            senderId,
            message,
            recieverId,
            user:{
                id:user.id,email:user.email,fullname:user.fullname
            }
          })

     }
    })

    socket.on('disconnect',()=>{
        users=users.filter(user=>user.socketId!==socket.id)
        io.emit('getUser',users)
    })
})

// create user
router.post('/createuser', [
    body('fullname', "Min length of name is 3 character").isLength({ min: 3 }),
    body('password', "enter a valid password of length 6 character").isLength({ min: 6 })
], async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    // create user
    try {
        let user = await User.findOne({ email: req.body.email })
        if (user) {
            success = false
            return res.status(500).json({ success, error: "Sorry a username already exists" })
        }
        const salt = await bcrypt.genSalt(10);
        const pass = await bcrypt.hashSync(req.body.password, salt);
        user = await User.create({
            fullname: req.body.fullname,
            email:req.body.email,
            password: pass,
        })
        const data = {
            user: {
                id: user.id
            }
        }
        const authtoken = jwt.sign(data, JWT_SECRET);
        success = true;
        res.json({ success:{success}, token:{authtoken} ,user:{email:user.email,fullname:user.fullname}})
    } catch (error) {
        console.error(error.message);
        res.status(500).send("some error ");
    }


})
// login
router.post('/login', [
    body('password', "enter password").exists()
], async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(500).json({ error: "Login with correct Credentials" })
        }
        const comparepassword = await bcrypt.compare(password, user.password);
        if (!comparepassword) {
            return res.status(500).json({ error: "Login with correct Credentials" })
        }
        const data = {
            user: {
                id: user._id
            }
        }
        success = true
        const authtoken = jwt.sign(data, JWT_SECRET);
        res.json({ success:success,  token:authtoken,user:{id:user._id,email:user.email,fullname:user.fullname}})


    } catch (error) {
        console.error(error.message);
        res.status(500).send("some error ");

    }

})
// fetchuser
router.get('/getuser', fetchuser, async (req, res) => {

    try {
         userId = req.user.id;
        const user = await User.findById(userId);
        res.status(200).json({ user })
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Internal Server")
    }

})


// chat conversations
router.post('/conversation',async(req,res)=>{
    try {
        const {senderId,recieverId}=req.body;
        const conversation =new Conversations({members:[senderId,recieverId]});
        await conversation.save();
        res.status(200).send("conversatons saved successfukky");
    } catch (error) {
        console.log("error",error);
    }
})

router.get('/conversation/:userId',async(req,res)=>{
    try {
        const userId=req.params.userId;
        const conversations=await Conversations.find({members:{$in:[userId]}});
        const ConversationUserData= Promise.all( conversations.map(async (conversation)=>{
            const recieverId= await conversation.members.find((member)=> member!==userId)
            const user=await User.findById(recieverId);
            return {user: {recieverId:user.id,email:user.email,fullname:user.fullname},conversationId:conversation._id}
        }))
        res.status(200).json(await ConversationUserData);
    } catch (error) {
        console.log("error",error)
        
    }
})


// messages
router.post('/message',async(req,res)=>{
    try {
        const {conversationId,senderId,message,recieverId=''}=req.body;
        if(!senderId,!message) return res.status(200).send("fill the required fields");
        if(conversationId==='new' && recieverId){
            const {senderId,recieverId}=req.body;
            const newConversation =new Conversations({members:[senderId,recieverId]});
            await newConversation.save();
            const newMessage =new Messages({conversationId:newConversation._id,senderId,message});
            await newMessage.save();
            return res.status(200).send("message sent ");
        }else if(!conversationId && !recieverId) {return res.status(200).send("fill all th required filelds");}
        const newMessage =new Messages({conversationId,senderId,message});
        await newMessage.save();
        res.status(200).send("message snt");
    } catch (error) {
        console.log(error);
    }
   })

router.get('/messages/:conversationId',async(req,res)=>{
    try {
        const checkmessage=async(conversationId)=>{
            const messages= await Messages.find({conversationId});
            const messageUserData=Promise.all(messages.map(async(message)=>{
                const user=await User.findById(message.senderId);
                return {user:{id:user._id,email:user.email,fullname:user.fullname},message:message.message,conversationId:conversationId}
            }))
            res.status(200).json(await messageUserData);

        }
        const conversationId=req.params.conversationId;
        if(conversationId==='new') {
            const check=await Conversations.find({members:{ $all:[req.query.senderId,req.query.recieverId] }})
            if(check.length>0 ) {checkmessage(check[0]._id)};
            return res.status(200).json([]);
        }else{
            checkmessage(conversationId);
        }
        
    } catch (error) {
        console.log("error",error)
    }
 })
 router.get('/users/:userId',async(req,res)=>{
    try {
        const userId=req.params.userId;
        const users=await User.find({_id:{$ne:userId}});
    const usersData= Promise.all(users.map(async(user)=>{
        return {user:{email:user.email,fullname:user.fullname,recieverId:user._id}}
    }))
    res.status(200).json(await usersData)
    } catch (error) {
        console.log("error",error);
    }
})






module.exports = router;