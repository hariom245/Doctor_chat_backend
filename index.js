const express= require('express');
const app=express();
const cors= require('cors');
const port=5000;
const Users=require('./db/Users');
const connectMongo=require('./db/db')
connectMongo();

app.use(express.json());
app.use(cors());

app.get('/',(req,res)=>{
    res.send('welcome');    
})
app.use('/api',require("./routes/user"));
app.listen(port,(req,res)=>{
    console.log(`you are connected to ${port}`);
})