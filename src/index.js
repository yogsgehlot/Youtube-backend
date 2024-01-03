// require('dotenv').config({path: './env'}) //or can be use below line instead of this
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
}) 

connectDB()