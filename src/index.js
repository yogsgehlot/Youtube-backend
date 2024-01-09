// require('dotenv').config({path: './env'}) //or can be use below line instead of this
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
}) 

connectDB()
.then(()=>{

    app.on("error",(error)=>{
        console.log("ERR : ", error);
        throw error
    })

    app.listen(process.env.PORT || 8000, ()=>{
        console.log(` server is running at port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO db connection failed !!! ",err);
})