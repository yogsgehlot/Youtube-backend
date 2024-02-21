import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefereshTokens = async (userId) =>{
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})

    return {accessToken, refreshToken}
    
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating referesh and access token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
    
  // get user details from frontend/postman
  const { fullName, email, username, password } = req.body;
  // console.log("email: ", email);

  //validation - not empty
  // can be used simple if else type code but we will use here some advanced code
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //check if user already exists {username, email}
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // check for images and avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path; //also cheked coverImage array got or not
  // console.log(avatarLocalPath)
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
  }

  // upload them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  // console.log(avatar);
  if(!avatar){
    throw new ApiError(400, "Avatar file is required")
  }

  // create user object, create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  // remove password and refresh token fields from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500, "Something went wrong while regitering the user")
  }

  // return response
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  )
});

const loginUser = asyncHandler(async (req, res)=>{

  // request to budy and get data(username or email and password)
  const {email, username, password} = req.body

  // check validation for username or email 
  if(!username || !email){
    throw new ApiError(400, "username or email is required")
  }

  // find that user
  const user = await User.findOne({
    $or: [{username},{email}]
  })

  // check username or password is exist 
  if(!user){
    throw new ApiError(404, "User does not exist")
  }

  // validation of password Imp: use "user" don't use "User"
  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // generate access and refresh tokens
  const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  // send data in the form of cookies
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken, refreshToken
      },
      "User logged In Successfully"
    )
  )
})


const logoutUser = asyncHandler(async(req, res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res.status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "user logged Out"))
})
export { 
  registerUser,
  loginUser,
  logoutUser,
 };
